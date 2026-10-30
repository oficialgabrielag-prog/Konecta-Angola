import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, CommentItem } from '../types';
import { supabase, safeQuery, isSchemaCacheError, getFriendlyErrorMessage } from '../lib/supabase';
import { shareContent } from '../lib/share';
import { CommentCard } from '../components/CommentCard';

interface PostDetailProps {
  idea: Idea;
  user: any;
  onBack: () => void;
  onVote: (id: string) => void;
  onRequireAuth: () => void;
  onImageClick?: (url: string) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ 
  idea, 
  user,
  onBack, 
  onVote,
  onRequireAuth,
  onImageClick
}) => {
  const [comments, setComments] = useState<CommentItem[]>(() => {
    try {
      const cached = localStorage.getItem(`konecta_comments_${idea.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Bookmark / Favorite State
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchComments();
    if (user && idea.user_id) {
      checkFollowStatus();
    }
  }, [idea.id, user]);

  const fetchComments = async () => {
    if (comments.length === 0) setLoading(true);
    try {
      // Try querying comments by idea_id first
      let res = await safeQuery<any>(() => supabase
        .from('comments')
        .select('*, profiles(id, full_name, avatar_url, province)')
        .eq('idea_id', idea.id)
        .order('created_at', { ascending: true }));

      // If no data or error, also check by post_id
      if (!res?.data || res.data.length === 0) {
        const altRes = await safeQuery<any>(() => supabase
          .from('comments')
          .select('*, profiles(id, full_name, avatar_url, province)')
          .eq('post_id', idea.id)
          .order('created_at', { ascending: true }));
        if (altRes?.data && altRes.data.length > 0) {
          res = altRes;
        }
      }

      if (res?.data && Array.isArray(res.data)) {
        setComments(prev => {
          const map = new Map<string, CommentItem>();
          prev.forEach(c => map.set(c.id, c));
          res.data.forEach((c: CommentItem) => map.set(c.id, c));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          try {
            localStorage.setItem(`konecta_comments_${idea.id}`, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar comentários:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || user.id === idea.user_id) return;
    try {
      const { data } = await safeQuery<any>(() => supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', idea.user_id)
        .maybeSingle());

      setIsFollowing(!!data);
    } catch (err: any) {
      console.warn('Aviso ao verificar status de seguidor:', err?.message || err);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (user.id === idea.user_id || followLoading) return;

    setFollowLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (!nextState) {
        // Unfollow
        await safeQuery<any>(() => supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', idea.user_id));
      } else {
        // Follow
        await safeQuery<any>(() => supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: idea.user_id
          }));
      }
    } catch (err: any) {
      console.warn('Aviso ao atualizar seguidor:', err?.message || err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!newComment.trim() || submittingComment) return;

    const contentText = newComment.trim();
    setSubmittingComment(true);

    const optimisticComment: CommentItem = {
      id: crypto.randomUUID(),
      idea_id: idea.id,
      post_id: idea.id,
      user_id: user.id,
      content: contentText,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Utilizador Konecta',
        avatar_url: user.user_metadata?.avatar_url || undefined,
        province: user.user_metadata?.province || 'Angola'
      }
    };

    // Instant UI update
    setComments(prev => {
      const updated = [...prev, optimisticComment];
      try {
        localStorage.setItem(`konecta_comments_${idea.id}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setNewComment('');

    // Ensure profile exists in Supabase
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Utilizador Konecta',
        avatar_url: user.user_metadata?.avatar_url || null,
        province: user.user_metadata?.province || 'Luanda'
      });
    } catch (profErr) {
      console.warn('Aviso ao sincronizar perfil:', profErr);
    }

    try {
      // Try inserting with idea_id first
      const res = await safeQuery<any>(() => supabase.from('comments').insert({
        idea_id: idea.id,
        user_id: user.id,
        content: contentText
      }).select());

      if (res?.error) {
        // If idea_id failed, try post_id
        await safeQuery<any>(() => supabase.from('comments').insert({
          post_id: idea.id,
          user_id: user.id,
          content: contentText
        }).select());
      }
    } catch (err: any) {
      console.warn('Comentário guardado na cache local:', err?.message || err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!reportReason.trim() || submittingReport) return;

    setSubmittingReport(true);
    try {
      const { error } = await safeQuery<any>(() => supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: 'idea',
        target_id: idea.id,
        reason: reportReason.trim(),
        status: 'pending'
      }));

      if (error) {
        if (isSchemaCacheError(error)) {
          alert('A base de dados do Supabase está a sincronizar. Tenta novamente em instantes.');
          return;
        }
        throw error;
      }

      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason('');
      }, 1500);
    } catch (err: any) {
      console.warn('Aviso ao submeter denúncia:', err?.message || err);
      alert(getFriendlyErrorMessage(err, 'Erro ao submeter denúncia.'));
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="bg-konecta-bg min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-6 py-10 lg:py-16">
        
        {/* Back Link */}
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-konecta-navy transition-colors flex items-center gap-2 mb-8 group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Voltar ao feed
        </button>

        {/* Main Idea Card */}
        <article className="card-konecta p-0 overflow-hidden mb-12 shadow-sm border border-gray-100">
          {idea.image_url && (
            <div 
              onClick={() => onImageClick && onImageClick(idea.image_url!)}
              className="w-full aspect-video bg-gray-100 overflow-hidden max-h-[480px] cursor-pointer group relative"
            >
              <img src={idea.image_url} alt={idea.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2.5 rounded-full backdrop-blur-xs">
                  fullscreen
                </span>
              </div>
            </div>
          )}
          
          <div className="p-8 lg:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest px-3 py-1 bg-konecta-navy/5 rounded-full border border-konecta-navy/10">
                  {idea.category}
                </span>
                <span className="metadata-text">
                  <span className="material-symbols-outlined text-[16px] text-konecta-gold">location_on</span>
                  {idea.province || 'Angola'}
                </span>
              </div>

              {/* Report button */}
              <button
                onClick={() => {
                  if (!user) onRequireAuth();
                  else setShowReportModal(true);
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
                title="Denunciar conteúdo impróprio"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
                Denunciar
              </button>
            </div>

            <h1 className="text-3xl lg:text-5xl font-extrabold text-konecta-navy mb-8 leading-tight">
              {idea.title}
            </h1>

            {/* Author Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10 py-6 border-y border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                  {idea.profiles?.avatar_url ? (
                    <img src={idea.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                      {idea.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-konecta-navy text-sm sm:text-base">{idea.profiles?.full_name || 'Membro Konecta'}</p>
                  <p className="text-xs text-gray-400">Publicado em {new Date(idea.created_at || '').toLocaleDateString('pt-AO')}</p>
                </div>
              </div>

              {user?.id !== idea.user_id && (
                <button 
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`btn-primary py-2 px-6 text-xs transition-all ${isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600' : ''}`}
                >
                  {followLoading ? '...' : isFollowing ? 'A Seguir' : 'Seguir Autor'}
                </button>
              )}
            </div>

            {/* Idea Content */}
            <div className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-wrap mb-10">
              {idea.description}
            </div>

            {/* Reaction Bar */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => {
                    onVote(idea.id);
                    setHasVoted(prev => !prev);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
                    hasVoted 
                      ? 'bg-red-600 hover:bg-red-700 text-white border border-red-600 shadow-md shadow-red-200 scale-105' 
                      : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                  }`}
                  title={hasVoted ? 'Apoiou esta ideia' : 'Apoiar iniciativa'}
                >
                  <span 
                    className="material-symbols-outlined text-[18px] transition-transform"
                    style={hasVoted ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {hasVoted ? 'favorite' : 'favorite_border'}
                  </span>
                  <span className={hasVoted ? 'text-white font-extrabold' : ''}>{idea.votes_count || 0} Apoios</span>
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-full">
                  <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                  <span>{comments.length} Comentários</span>
                </div>
              </div>

              <button 
                onClick={async () => {
                  const shareData = {
                    title: idea.title,
                    text: idea.description,
                    url: window.location.href
                  };
                  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    try {
                      await navigator.share(shareData);
                      return;
                    } catch (err: any) {
                      if (err.name === 'AbortError') return;
                    }
                  }
                  setShowShareModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Partilhar
              </button>
            </div>
          </div>
        </article>

        {/* COMMENTS SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-konecta-navy">
              Discussão da Comunidade ({comments.length})
            </h3>
            <span className="text-xs text-gray-400">Comentários reais armazenados no Supabase</span>
          </div>
          
          {/* Add Comment Box */}
          <form onSubmit={handleAddComment} className="card-konecta p-6 flex flex-col gap-4 shadow-sm border border-gray-100">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Partilha uma contribuição técnica, sugestão ou feedback para esta iniciativa..."
              className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-konecta-navy rounded-2xl p-4 text-sm resize-none text-konecta-navy"
              rows={3}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Mantém um tom colaborativo e construtivo.</span>
              <button 
                type="submit" 
                disabled={!newComment.trim() || submittingComment} 
                className="btn-primary py-2.5 px-7 text-xs"
              >
                {submittingComment ? 'A enviar...' : 'Publicar Comentário'}
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="py-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-navy"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                <p className="text-gray-400 italic text-sm">Ainda não existem comentários para esta iniciativa. Sê o primeiro a contribuir com sugestões.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </section>

      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy">Denunciar Conteúdo</h3>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {reportSuccess ? (
                <div className="py-6 text-center text-green-600 font-bold text-sm">
                  ✓ Denúncia registada com sucesso na moderação. Obrigado pela colaboração!
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Por favor, indica o motivo pelo qual este conteúdo viola os termos de utilização da KONECTA:
                  </p>
                  <textarea
                    required
                    rows={4}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ex: Spam, conteúdo ofensivo, dados falsos ou violação de direitos autorais..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm resize-none"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReport || !reportReason.trim()}
                      className="btn-primary py-2 px-5 text-xs bg-red-600 hover:bg-red-700"
                    >
                      {submittingReport ? 'A enviar...' : 'Confirmar Denúncia'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy">Partilhar Iniciativa</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Copia o link direto ou partilha esta iniciativa nas redes sociais:
                </p>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={window.location.href} 
                    className="w-full bg-transparent text-xs text-gray-700 px-3 outline-none select-all"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      } catch (e) {}
                    }}
                    className="btn-primary py-2 px-4 text-xs font-bold shrink-0"
                  >
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confere esta iniciativa no KONECTA: ${idea.title} - ${window.location.href}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl py-3 text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl py-3 text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">work</span>
                    LinkedIn
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
