import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Bookmark, Share2, Maximize2, Minimize2, Edit2, Trash2, Send } from 'lucide-react';
import { Post, Idea, CommentItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { useUI } from '../context/UIContext';
import { cldAvatar, cldImage } from '../lib/cloudinary';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FullscreenPostModalProps {
  post: (Post | Idea | any) | null;
  currentUser: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: any) => void;
  onDelete?: (postId: string) => void;
  onRequireAuth?: () => void;
  onSelectUser?: (userId: string) => void;
}

export const FullscreenPostModal: React.FC<FullscreenPostModalProps> = ({
  post,
  currentUser,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRequireAuth,
  onSelectUser
}) => {
  const { showToast, openShareSheet } = useUI();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  useEffect(() => {
    if (!post) return;
    setIsLiked(!!post.is_liked);
    setLikesCount(post.likes_count || 0);
    loadComments();
    checkBookmark();
  }, [post?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadComments = async () => {
    if (!post) return;
    setLoadingComments(true);
    try {
      let res;
      if (post.title !== undefined) {
        res = await d1Client.ideas.getComments(post.id);
      } else {
        res = await d1Client.posts.getComments(post.id);
      }
      if (res?.data?.data) {
        setComments(res.data.data);
      }
    } catch (e) {
      console.warn('Erro ao carregar comentários do post em tela cheia:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const checkBookmark = async () => {
    if (!currentUser || !post) return;
    try {
      const res = await d1Client.posts.getBookmarks();
      if (res?.data?.data) {
        const bookmarked = res.data.data.some((b: any) => b.id === post.id);
        setIsBookmarked(bookmarked);
      }
    } catch {}
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!post) return;

    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (post.title !== undefined) {
        await d1Client.ideas.toggleVote(post.id, !nextState);
      } else {
        await d1Client.posts.toggleLike(post.id, !nextState);
      }
    } catch (e) {
      console.warn('Erro ao curtir post:', e);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!post) return;

    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      await d1Client.posts.toggleBookmark(post.id, !nextState);
      showToast(nextState ? 'Guardado nos favoritos!' : 'Removido dos favoritos.', 'info');
    } catch (e) {
      console.warn('Erro ao guardar post:', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!post || !newComment.trim() || submittingComment) return;

    const commentText = newComment.trim();
    setSubmittingComment(true);

    const tempComment: CommentItem = {
      id: crypto.randomUUID(),
      post_id: post.id,
      user_id: currentUser.id,
      content: commentText,
      created_at: new Date().toISOString(),
      profiles: {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || 'Utilizador',
        avatar_url: currentUser.user_metadata?.avatar_url,
        province: currentUser.user_metadata?.province || 'Angola'
      }
    };

    setComments(prev => [...prev, tempComment]);
    setNewComment('');

    try {
      if (post.title !== undefined) {
        await d1Client.ideas.addComment(post.id, commentText);
      } else {
        await d1Client.posts.addComment(post.id, commentText);
      }
    } catch (err) {
      console.warn('Erro ao adicionar comentário:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsNativeFullscreen(false);
      }
    }
  };

  if (!isOpen || !post) return null;

  const isOwner = currentUser?.id === post.user_id || currentUser?.id === post.author_id;
  const authorName = post.profiles?.full_name || post.profiles?.display_name || 'Membro Konecta';
  const authorAvatar = post.profiles?.avatar_url;
  const contentText = post.content || post.body || post.description || '';
  const postDate = post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR }) : '';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden"
        onClick={onClose}
      >
        {/* Fullscreen Post View Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full max-w-7xl max-h-screen flex flex-col lg:flex-row bg-slate-950 text-white overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar for Mobile & Desktop Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <button
              onClick={toggleNativeFullscreen}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all backdrop-blur-md"
              title={isNativeFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro do navegador"}
            >
              {isNativeFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all backdrop-blur-md"
              title="Fechar (ESC)"
            >
              <X size={20} />
            </button>
          </div>

          {/* LEFT COLUMN: Media Section (if image exists) or Highlighted Text */}
          <div className={`flex-1 flex items-center justify-center bg-black/80 relative min-h-[300px] lg:min-h-full overflow-hidden ${!post.image_url ? 'p-8 lg:p-16' : ''}`}>
            {post.image_url ? (
              <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
                <img
                  src={cldImage(post.image_url, { w: 1600 })}
                  alt="Post em tela cheia"
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="max-w-xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-konecta-gold/10 border border-konecta-gold/30 mx-auto flex items-center justify-center text-konecta-gold">
                  <span className="material-symbols-outlined text-3xl">article</span>
                </div>
                {post.title && (
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                    {post.title}
                  </h2>
                )}
                <p className="text-gray-300 text-base sm:text-xl leading-relaxed whitespace-pre-wrap font-normal">
                  {contentText}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Author, Details, Actions & Discussion */}
          <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col bg-slate-900 border-l border-white/10 h-full max-h-[50vh] lg:max-h-full">
            {/* Header: Author & Controls */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/95 backdrop-blur-sm">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  if (post.user_id || post.author_id) {
                    onSelectUser?.(post.user_id || post.author_id);
                    onClose();
                  }
                }}
              >
                <div className="w-11 h-11 rounded-full bg-slate-800 overflow-hidden border border-white/20 shrink-0">
                  {authorAvatar ? (
                    <img src={cldAvatar(authorAvatar, 44)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm bg-konecta-navy">
                      {authorName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-konecta-gold transition-colors flex items-center gap-1.5">
                    {authorName}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {post.profiles?.province || 'Angola'} · {postDate}
                  </p>
                </div>
              </div>

              {/* Author Actions (Edit / Delete) */}
              {isOwner && (
                <div className="flex items-center gap-1.5 mr-16 lg:mr-0">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(post)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
                      title="Editar publicação"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm('Tem a certeza que deseja eliminar esta publicação?')) {
                          onDelete(post.id);
                          onClose();
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors"
                      title="Eliminar publicação"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content Text & Details (Scrollable Body) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {post.communities && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-konecta-gold font-bold">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  <span>{post.communities.name}</span>
                </div>
              )}

              {post.title && post.image_url && (
                <h3 className="text-lg font-extrabold text-white">
                  {post.title}
                </h3>
              )}

              {post.image_url && (
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {contentText}
                </p>
              )}

              {/* Comments Stream */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <span>Comentários ({comments.length})</span>
                  {loadingComments && <span className="animate-pulse">A carregar...</span>}
                </div>

                {comments.length === 0 && !loadingComments ? (
                  <p className="text-xs text-gray-500 italic py-4 text-center">
                    Ainda sem comentários. Sê o primeiro a comentar!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2.5 text-xs bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden shrink-0 mt-0.5">
                          {c.profiles?.avatar_url ? (
                            <img src={cldAvatar(c.profiles.avatar_url, 28)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white bg-slate-700">
                              {c.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-white truncate">{c.profiles?.full_name || 'Membro'}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR }) : ''}
                            </span>
                          </div>
                          <p className="text-gray-300 leading-relaxed break-words">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions & Input */}
            <div className="p-4 border-t border-white/10 bg-slate-900/95 shrink-0 space-y-3">
              {/* Interaction Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isLiked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{likesCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      const input = document.getElementById('fullscreen-comment-input');
                      input?.focus();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <MessageCircle size={16} />
                    <span>{comments.length}</span>
                  </button>

                  <button
                    onClick={handleToggleBookmark}
                    className={`p-1.5 rounded-full transition-all ${
                      isBookmarked ? 'text-konecta-gold' : 'text-gray-400 hover:text-white'
                    }`}
                    title={isBookmarked ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
                  >
                    <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    openShareSheet({
                      targetId: post.id,
                      targetType: post.title !== undefined ? 'idea' : 'post',
                      title: (post.title || contentText).substring(0, 50),
                      authorName,
                      thumbnail: post.image_url
                    });
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors p-1.5"
                >
                  <Share2 size={16} />
                  <span>Partilhar</span>
                </button>
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <input
                  id="fullscreen-comment-input"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreve um comentário..."
                  className="flex-1 bg-white/5 border border-white/10 focus:border-konecta-gold focus:outline-none rounded-full px-4 py-2 text-xs text-white placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="p-2 rounded-full bg-konecta-gold text-konecta-navy font-bold hover:bg-yellow-400 disabled:opacity-40 transition-all shrink-0"
                  title="Enviar comentário"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
