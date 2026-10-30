import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Profile, CommentItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadToCloudflare } from '../lib/cloudflareStorage';
import { PostCardSkeleton } from '../components/Skeletons';
import { CANONICAL_POSTS } from '../lib/canonicalData';

interface CommunityProps {
  user: any;
  onOpenAuth: () => void;
  onSelectUser: (userId: string) => void;
  onImageClick: (url: string) => void;
}

export const Community: React.FC<CommunityProps> = ({
  user,
  onOpenAuth,
  onSelectUser,
  onImageClick,
}) => {
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = localStorage.getItem('konecta_cached_posts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return CANONICAL_POSTS;
    } catch {
      return CANONICAL_POSTS;
    }
  });
  const [activeMembers, setActiveMembers] = useState<Profile[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  // Post Comments State
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingPostComments, setLoadingPostComments] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
    fetchActiveMembers();
  }, [user]);

  const savePostsToCache = (updatedPosts: Post[]) => {
    try {
      localStorage.setItem('konecta_cached_posts', JSON.stringify(updatedPosts.slice(0, 50)));
    } catch (e) {
      console.warn('Erro ao guardar posts na cache:', e);
    }
  };

  const fetchPosts = async () => {
    if (posts.length === 0) setLoading(true);
    try {
      const d1Res = await d1Client.posts.list(30);

      const d1Posts = d1Res.data?.data || [];

      setPosts(prev => {
        const map = new Map<string, Post>();
        prev.forEach(p => map.set(p.id, p));
        d1Posts.forEach((p: Post) => map.set(p.id, p));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        savePostsToCache(merged);
        return merged;
      });
    } catch (err: any) {
      console.warn('Aviso ao carregar posts:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const d1Res = await d1Client.profiles.list(12);
      if (d1Res.data?.data) {
        setActiveMembers(d1Res.data.data);
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar membros ativos:', err?.message || err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('A imagem é muito grande. O limite máximo é 10MB.');
        return;
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!content.trim() && !imageFile) {
      alert('Por favor, escreve uma mensagem ou anexa uma imagem para publicar.');
      return;
    }
    if (publishing) return;

    setPublishing(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        try {
          imageUrl = await uploadToCloudflare(imageFile, (p) => setUploadProgress(p));
        } catch (imgErr: any) {
          alert(imgErr?.message || 'Falha no envio da imagem para o Cloudflare R2. O texto foi preservado no editor.');
          setPublishing(false);
          return;
        }
      }

      // 1. Sync Profile to D1
      console.log('[Community] Syncing profile...');
      // 1. Sync Profile to D1
      await d1Client.profiles.update(user.id, {
        full_name: user.user_metadata?.full_name || 'Membro Konecta',
        avatar_url: user.user_metadata?.avatar_url || null,
        province: user.user_metadata?.province || 'Luanda'
      }).catch(err => console.warn('Aviso ao sincronizar perfil no D1:', err));

      // 2. Insert Post to D1
      const d1PostRes = await d1Client.posts.create({
        content: content.trim(),
        image_url: imageUrl || undefined
      });

      const inserted = d1PostRes.data?.data || {
        id: crypto.randomUUID(),
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl || null,
        created_at: new Date().toISOString()
      };

      const newPostWithProfile: Post = {
        ...inserted,
        profiles: {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Membro Konecta',
          avatar_url: user.user_metadata?.avatar_url || undefined,
          province: user.user_metadata?.province || 'Angola'
        }
      };

      setPosts(prev => {
        const next = [newPostWithProfile, ...prev];
        savePostsToCache(next);
        return next;
      });
      setContent('');
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setUploadProgress(0);
    } catch (err: any) {
      console.warn('Aviso ao criar post:', err?.message || err);
      const fallbackPost: Post = {
        id: crypto.randomUUID(),
        user_id: user.id,
        content: content.trim(),
        image_url: undefined,
        created_at: new Date().toISOString(),
        profiles: {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Membro Konecta',
          avatar_url: user.user_metadata?.avatar_url || undefined,
          province: user.user_metadata?.province || 'Angola'
        }
      };
      setPosts(prev => {
        const next = [fallbackPost, ...prev];
        savePostsToCache(next);
        return next;
      });
      setContent('');
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    } finally {
      setPublishing(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const isLiked = userLikes[postId];
    setUserLikes(prev => ({ ...prev, [postId]: !isLiked }));
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const count = p.likes_count || 0;
        return { ...p, likes_count: isLiked ? Math.max(0, count - 1) : count + 1 };
      }
      return p;
    }));

    try {
      await d1Client.posts.toggleLike(postId, isLiked);
    } catch (err: any) {
      console.warn('Aviso ao gostar do post:', err?.message || err);
    }
  };

  const togglePostComments = async (postId: string) => {
    const nextState = !expandedPostComments[postId];
    setExpandedPostComments(prev => ({ ...prev, [postId]: nextState }));
    if (nextState && !postComments[postId]) {
      // Load cached comments first
      try {
        const cached = localStorage.getItem(`konecta_post_comments_${postId}`);
        if (cached) {
          setPostComments(prev => ({ ...prev, [postId]: JSON.parse(cached) }));
        }
      } catch (e) {}
 
      // Fetch from D1
      setLoadingPostComments(prev => ({ ...prev, [postId]: true }));
      try {
        const d1Res = await d1Client.posts.getComments(postId);
        const d1Comments = d1Res.data?.data || [];

        if (d1Comments.length > 0) {
          setPostComments(prev => {
            const next = { ...prev, [postId]: d1Comments };
            try { localStorage.setItem(`konecta_post_comments_${postId}`, JSON.stringify(d1Comments)); } catch (e) {}
            return next;
          });
        }
      } catch (err: any) {
        console.warn('Aviso ao carregar comentários:', err?.message || err);
      } finally {
        setLoadingPostComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddPostComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const optimistic: CommentItem = {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Membro Konecta',
        avatar_url: user.user_metadata?.avatar_url || undefined,
        province: user.user_metadata?.province || 'Angola'
      }
    };

    setPostComments(prev => {
      const list = [...(prev[postId] || []), optimistic];
      try { localStorage.setItem(`konecta_post_comments_${postId}`, JSON.stringify(list)); } catch (e) {}
      return { ...prev, [postId]: list };
    });
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, comments_count: (p.comments_count || 0) + 1 };
      }
      return p;
    }));

    try {
      await d1Client.posts.addComment(postId, text);
    } catch (err: any) {
      console.warn('Comentário guardado na cache (D1 error):', err?.message || err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      <header className="mb-12 text-center lg:text-left">
        <span className="feature-kicker">Diálogo Aberto</span>
        <h1 className="hero-title">Feed da Comunidade</h1>
        <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
          Um espaço aberto para partilha rápida de novidades, perguntas, conquistas e networking em Angola.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Post Creator & Feed */}
        <div className="lg:col-span-8 space-y-8">
          
          <form onSubmit={handleSubmitPost} className="card-konecta p-6 sm:p-8 space-y-4 shadow-sm border border-gray-100">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 uppercase text-xs">
                    {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="O que queres partilhar com a rede hoje?"
                  className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-konecta-gold rounded-2xl p-4 text-sm resize-none text-konecta-navy"
                  rows={3}
                />

                <AnimatePresence>
                  {imagePreview && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative inline-block mt-2"
                    >
                      <img src={imagePreview} alt="Preview" className="w-28 h-28 object-cover rounded-2xl border border-gray-200 shadow-xs" />
                      <button 
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px] text-konecta-gold">add_photo_alternate</span>
                Imagem (Cloudflare R2)
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                type="submit" 
                disabled={publishing} 
                className="btn-primary py-2.5 px-8 text-xs shadow-md"
              >
                {publishing ? 'A Publicar...' : 'Publicar'}
              </button>
            </div>
          </form>

          {/* Posts Feed */}
          <div className="space-y-6">
            {loading && posts.length === 0 ? (
              <PostCardSkeleton count={3} />
            ) : posts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                <p className="text-gray-500 italic text-sm">Ainda não existem publicações na comunidade. Sê o primeiro a iniciar o diálogo!</p>
              </div>
            ) : (
              posts.map((post) => {
                const isLiked = userLikes[post.id];

                return (
                  <motion.article 
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-konecta p-6 sm:p-8"
                  >
                    <button
                      onClick={() => post.user_id && onSelectUser(post.user_id)}
                      className="flex items-center gap-3 mb-4 text-left group/author cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                            {post.profiles?.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-konecta-navy group-hover/author:text-konecta-gold transition-colors">{post.profiles?.full_name || 'Membro Konecta'}</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                          {post.profiles?.province || 'Angola'} · {new Date(post.created_at).toLocaleDateString('pt-AO')}
                        </p>
                      </div>
                    </button>

                    <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap mb-4">
                      {post.content}
                    </div>

                    {post.image_url && (
                      <div 
                        onClick={() => onImageClick(post.image_url!)}
                        className="mb-6 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 max-h-[480px] cursor-pointer group relative"
                      >
                        <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-xs">
                            fullscreen
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-3">
                        {/* Like button: turns completely red when liked */}
                        <button 
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
                            isLiked 
                              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-600 shadow-md shadow-red-200 scale-105' 
                              : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200'
                          }`}
                          title={isLiked ? 'Gostou deste post' : 'Gostar'}
                        >
                          <span 
                            className="material-symbols-outlined text-[18px] transition-transform"
                            style={isLiked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            {isLiked ? 'favorite' : 'favorite_border'}
                          </span>
                          <span className={isLiked ? 'text-white font-extrabold' : ''}>{post.likes_count || 0} Gostos</span>
                        </button>

                        {/* Comment toggle button */}
                        <button 
                          onClick={() => togglePostComments(post.id)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            expandedPostComments[post.id] 
                              ? 'bg-konecta-navy text-white shadow-sm' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
                          }`}
                          title="Ver e adicionar comentários"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                          <span>{postComments[post.id]?.length ?? (post.comments_count || 0)}</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-gray-400">Publicação da Rede</span>
                    </div>

                    {/* Expandable Comments Drawer */}
                    <AnimatePresence>
                      {expandedPostComments[post.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-gray-100 space-y-3"
                        >
                          {loadingPostComments[post.id] && !postComments[post.id]?.length ? (
                            <div className="py-3 text-center text-xs text-gray-400">A carregar comentários...</div>
                          ) : !postComments[post.id] || postComments[post.id]?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-1">Ainda sem comentários. Sê o primeiro a comentar!</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {postComments[post.id]?.map(c => (
                                <div key={c.id} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-konecta-navy">{c.profiles?.full_name || 'Membro Konecta'}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-AO')}</span>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Input form */}
                          <form onSubmit={(e) => handleAddPostComment(post.id, e)} className="flex gap-2 pt-1">
                            <input 
                              type="text"
                              placeholder={user ? "Escreve um comentário..." : "Entra na tua conta para comentar..."}
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              disabled={!user}
                              className="flex-1 bg-gray-50 border border-gray-200 focus:bg-white focus:border-konecta-navy rounded-xl px-3.5 py-2 text-xs outline-none transition-all"
                            />
                            <button
                              type="submit"
                              disabled={!user || !commentInputs[post.id]?.trim()}
                              className="btn-primary py-2 px-4 text-xs font-bold shrink-0 disabled:opacity-50"
                            >
                              Comentar
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })
            )}
          </div>

        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          
          <section className="card-konecta p-6 sm:p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-konecta-gold mb-4">Inovadores Ativos</h3>
            {activeMembers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum membro listado.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {activeMembers.map(m => (
                  <div key={m.id} className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 shadow-xs overflow-hidden flex items-center justify-center shrink-0" title={m.full_name}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase">{m.full_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-konecta p-6 sm:p-8 bg-konecta-navy text-white shadow-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-konecta-gold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              Diretrizes de Convivência
            </h3>
            <ul className="space-y-3 text-xs opacity-80 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-konecta-gold">✓</span>
                <span>Partilha conteúdo construtivo e focado em soluções para Angola.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-konecta-gold">✓</span>
                <span>Respeita a diversidade de opiniões da nossa rede.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-konecta-gold">✓</span>
                <span>Usa o Cloudflare R2 para anexar imagens reais dos teus projetos.</span>
              </li>
            </ul>
          </section>

        </aside>

      </div>

    </div>
  );
};
