import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, CommentItem, Profile } from '../types';
import { d1Client } from '../lib/d1Client';
import { KonectaRealtimeService } from '../lib/realtime';

interface IdeaDetailProps {
  ideaId: string;
  user: any;
  onOpenAuth: () => void;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}

export const IdeaDetail: React.FC<IdeaDetailProps> = ({
  ideaId,
  user,
  onOpenAuth,
  onBack,
  onSelectUser,
}) => {
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'discussao' | 'colaboradores' | 'votacoes' | 'configuracoes'>('visao-geral');

  // Sub-data
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isVoted, setIsVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  // Inputs
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Settings
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState('open');
  const [savingSettings, setSavingSettings] = useState(false);

  const isAuthor = idea?.author_id === user?.id || idea?.user_id === user?.id;

  useEffect(() => {
    loadIdeaData();

    // Subscribe to realtime changes on ideas
    const unsub1 = KonectaRealtimeService.subscribe('idea_comments', () => loadComments());
    const unsub2 = KonectaRealtimeService.subscribe('idea_votes', () => loadIdeaData());

    return () => {
      unsub1();
      unsub2();
    };
  }, [ideaId, user]);

  const loadIdeaData = async () => {
    setLoading(true);
    try {
      const res = await d1Client.ideas.getById(ideaId);
      const data = res.data?.data || res.data;
      if (data) {
        setIdea(data);
        setVoteCount(data.votes_count || 0);
        setEditTitle(data.title);
        setEditDesc(data.description);
        setEditCategory(data.category || 'Inovação');
        setEditStatus(data.status || 'open');
      }

      await Promise.all([
        loadComments(),
        loadCollaborators()
      ]);
    } catch (err) {
      console.warn('Erro ao carregar ideia:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await d1Client.ideas.getComments(ideaId);
      setComments(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadCollaborators = async () => {
    try {
      const res = await d1Client.ideas.getCollaborators(ideaId);
      setCollaborators(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const handleToggleVote = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const nextVoted = !isVoted;
    setIsVoted(nextVoted);
    setVoteCount(prev => nextVoted ? prev + 1 : Math.max(0, prev - 1));

    try {
      await d1Client.ideas.toggleVote(ideaId, !nextVoted);
    } catch (err) {
      console.warn('Erro ao votar:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await d1Client.ideas.addComment(ideaId, newComment.trim());
      if (res.data) {
        setComments(prev => [...prev, res.data?.data || res.data]);
        setNewComment('');
      }
    } catch (e) {
      alert('Erro ao enviar comentário.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteIdea = async () => {
    if (!isAuthor) return;
    if (!confirm('Tens a certeza que pretendes eliminar esta ideia?')) return;

    try {
      await d1Client.ideas.delete(ideaId);
      alert('Ideia eliminada com sucesso!');
      onBack();
    } catch (e) {
      alert('Erro ao eliminar ideia.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4">
        <h2 className="text-xl font-bold text-konecta-navy mb-2">Ideia não encontrada</h2>
        <button onClick={onBack} className="btn-primary py-2 px-6 text-xs mt-4">
          Voltar às Ideias
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Voltar às Ideias
      </button>

      {/* Hero Header */}
      <div className="card-konecta p-6 sm:p-10 shadow-sm border border-gray-100 bg-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold bg-konecta-navy/5 px-3 py-1 rounded-full border border-konecta-navy/10">
                {idea.category || 'Inovação'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {idea.status === 'open' ? 'Aberta para Colaboração' : idea.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-konecta-navy">{idea.title}</h1>
          </div>

          <button
            onClick={handleToggleVote}
            className={`btn-gold py-2.5 px-6 text-xs font-bold shadow-md flex items-center gap-2 self-start md:self-auto transition-transform active:scale-95 ${
              isVoted ? 'bg-amber-500 text-white' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
            <span>{isVoted ? 'Apoiado' : 'Apoiar esta Ideia'} ({voteCount})</span>
          </button>
        </div>

        {/* Author info */}
        <div
          onClick={() => idea.author_id && onSelectUser(idea.author_id)}
          className="flex items-center gap-3 pt-4 border-t border-gray-100 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
            {idea.profiles?.avatar_url ? (
              <img src={idea.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">
                {idea.profiles?.full_name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-xs text-konecta-navy group-hover:text-konecta-gold transition-colors">
              {idea.profiles?.full_name || 'Inovador Konecta'}
            </h4>
            <span className="text-[10px] text-gray-400">
              Publicado a {new Date(idea.created_at).toLocaleDateString('pt-AO')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('visao-geral')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'visao-geral' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('discussao')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'discussao' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Discussão ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('colaboradores')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'colaboradores' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Colaboradores ({collaborators.length})
        </button>
        {isAuthor && (
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'configuracoes' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Gestão da Ideia
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'visao-geral' && (
          <div className="card-konecta p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Descrição Detalhada</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
          </div>
        )}

        {activeTab === 'discussao' && (
          <div className="space-y-6 max-w-3xl">
            <form onSubmit={handleAddComment} className="card-konecta p-5 shadow-sm border border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder={user ? "Deixa uma sugestão ou feedback para esta ideia..." : "Entra na tua conta para comentar..."}
                disabled={!user}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
              />
              <button
                type="submit"
                disabled={!user || !newComment.trim() || submittingComment}
                className="btn-primary py-2 px-5 text-xs font-bold"
              >
                Comentar
              </button>
            </form>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                  <p className="text-xs text-gray-400">Nenhum comentário nesta ideia ainda. Sê o primeiro!</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="card-konecta p-4 space-y-1 border border-gray-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-konecta-navy">{c.profiles?.full_name || 'Membro Konecta'}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'colaboradores' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">
              Colaboradores Associados ({collaborators.length})
            </h3>
            {collaborators.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">people</span>
                <p className="text-xs text-gray-400">Ainda sem outros colaboradores associados a esta ideia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {collaborators.map(c => (
                  <div key={c.id} className="card-konecta p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-400">
                      {c.profiles?.full_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-konecta-navy">{c.profiles?.full_name || 'Colaborador'}</h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'configuracoes' && isAuthor && (
          <div className="card-konecta p-8 max-w-xl space-y-6">
            <h3 className="text-base font-bold text-konecta-navy">Gestão da Ideia</h3>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">Eliminar permanentemente esta ideia</span>
              <button
                onClick={handleDeleteIdea}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                Eliminar Ideia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
