import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Challenge, Post, CommentItem, Reel } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadToCloudinary } from '../lib/cloudinary';
import { KonectaRealtimeService } from '../lib/realtime';
import { PostCardSkeleton, IdeaCardSkeleton } from '../components/Skeletons';

interface HomeProps {
  setCurrentTab: (tab: string) => void;
  ideas: Idea[];
  challenges: Challenge[];
  user: any;
  onSelectPost: (idea: Idea) => void;
  onSelectUser: (userId: string) => void;
  onSelectCommunity: (communityId: string, slug?: string) => void;
  onSelectReel?: (reelId: string) => void;
  onVoteIdea: (id: string) => void;
  onRequireAuth: () => void;
  onImageClick: (url: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  setCurrentTab,
  ideas,
  challenges,
  user,
  onSelectPost,
  onSelectUser,
  onSelectCommunity,
  onSelectReel,
  onVoteIdea,
  onRequireAuth,
  onImageClick,
}) => {
  const heroImage = "/src/assets/images/hero_konecta_innovation_1793239577568.jpg";

  const [feedType, setFeedType] = useState<'all' | 'ideas' | 'posts' | 'communities' | 'reels'>('all');
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = localStorage.getItem('konecta_cached_posts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReelModal, setSelectedReelModal] = useState<Reel | null>(null);
  const [isModalMuted, setIsModalMuted] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userBookmarks, setUserBookmarks] = useState<Record<string, boolean>>({});

  const handleToggleReelLike = async (reelId: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setReels(prev => prev.map(r => {
      if (r.id === reelId) {
        const isLiked = r.is_liked;
        return {
          ...r,
          is_liked: !isLiked,
          likes_count: isLiked ? Math.max(0, (r.likes_count || 1) - 1) : (r.likes_count || 0) + 1
        };
      }
      return r;
    }));
    if (selectedReelModal && selectedReelModal.id === reelId) {
      setSelectedReelModal(prev => prev ? {
        ...prev,
        is_liked: !prev.is_liked,
        likes_count: prev.is_liked ? Math.max(0, (prev.likes_count || 1) - 1) : (prev.likes_count || 0) + 1
      } : null);
    }
    try {
      await d1Client.reels.toggleReaction(reelId, false);
    } catch (err) {
      console.warn('Erro ao curtir reel:', err);
    }
  };

  // Post Comments State
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingPostComments, setLoadingPostComments] = useState<Record<string, boolean>>({});

  // Quick Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reelsRowRef = useRef<HTMLDivElement>(null);

  const scrollReels = (direction: 'left' | 'right') => {
    if (reelsRowRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      reelsRowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchCommunityPosts();
    fetchReels();
    if (user) {
      fetchUserReactions();
    }

    let debounceTimer: any = null;

    const debouncedFetchFeed = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchCommunityPosts();
      }, 1500);
    };

    // Subscribe to realtime updates for the unified feed with 1.5s debounce
    const unsubPosts = KonectaRealtimeService.subscribe('posts', (payload) => {
      if (document.visibilityState !== 'visible') return;
      if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      } else {
        debouncedFetchFeed();
      }
    });

    const unsubReactions = KonectaRealtimeService.subscribe('post_reactions', () => {
      debouncedFetchFeed();
    });

    const unsubComments = KonectaRealtimeService.subscribe('post_comments', () => {
      debouncedFetchFeed();
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubPosts();
      unsubReactions();
      unsubComments();
    };
  }, [user]);

  const savePostsToCache = (updatedPosts: Post[]) => {
    try {
      localStorage.setItem('konecta_cached_posts', JSON.stringify(updatedPosts.slice(0, 50)));
    } catch (e) {
      console.warn('Erro ao guardar posts na cache:', e);
    }
  };

  const fetchCommunityPosts = async () => {
    if (posts.length === 0) setLoadingPosts(true);
    try {
      const res = await d1Client.posts.list(30);

      if (res.data?.data && Array.isArray(res.data.data)) {
        setPosts(prev => {
          const map = new Map<string, Post>();
          prev.forEach(p => map.set(p.id, p));
          res.data!.data.forEach((p: Post) => map.set(p.id, p));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          savePostsToCache(merged);
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar publicações:', err?.message || err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchReels = async () => {
    try {
      const res = await d1Client.reels.list(10);
      if (res.data?.data) {
        setReels(res.data.data);
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar Reels:', err?.message || err);
    }
  };

  const fetchUserReactions = async () => {
    try {
      const res = await d1Client.posts.getBookmarks();
      const bookmarksMap: Record<string, boolean> = {};
      res.data?.data?.forEach((item: any) => {
        bookmarksMap[item.id] = true;
      });
      setUserBookmarks(bookmarksMap);
    } catch (err: any) {
      console.warn('Aviso ao carregar reações do utilizador:', err?.message || err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('A imagem é muito grande. O limite máximo é 10MB.');
        return;
      }
      if (newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
      setNewPostImage(file);
      setNewPostImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!newPostContent.trim() && !newPostImage) {
      alert('Por favor, escreve uma mensagem ou escolhe uma imagem para publicar.');
      return;
    }
    if (publishing) return;

    setPublishing(true);
    try {
      let imageUrl = '';
      if (newPostImage) {
        try {
          imageUrl = await uploadToCloudinary(newPostImage, (p) => setUploadProgress(p));
        } catch (imgErr: any) {
          alert(imgErr?.message || 'Falha no envio da imagem para o Cloudinary. O texto foi preservado no editor.');
          setPublishing(false);
          return;
        }
      }

      const postRes = await d1Client.posts.create({
        content: newPostContent.trim(),
        image_url: imageUrl || undefined
      });

      if (postRes.error || !postRes.data) {
        throw new Error(postRes.error?.message || 'Falha ao gravar publicação no Supabase.');
      }

      const inserted = postRes.data;

      const newPostWithProfile: Post = {
        ...inserted,
        profiles: inserted.profiles || {
          id: user.id,
          user_id: user.id,
          full_name: user.user_metadata?.full_name || 'Membro Konecta',
          display_name: user.user_metadata?.full_name || 'Membro Konecta',
          avatar_url: user.user_metadata?.avatar_url || undefined,
          province: user.user_metadata?.province || 'Angola'
        }
      };

      setPosts(prev => {
        const next = [newPostWithProfile, ...prev];
        savePostsToCache(next);
        return next;
      });
      setNewPostContent('');
      setNewPostImage(null);
      if (newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
      setNewPostImagePreview(null);
      setUploadProgress(0);
    } catch (err: any) {
      console.error('Erro ao publicar no feed:', err?.message || err);
      alert(err?.message || 'Erro ao publicar no feed. Por favor, tente novamente.');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      onRequireAuth();
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
      console.warn('Aviso ao registar gosto:', err?.message || err);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    const isBookmarked = userBookmarks[postId];
    setUserBookmarks(prev => ({ ...prev, [postId]: !isBookmarked }));

    try {
      await d1Client.posts.toggleBookmark(postId, isBookmarked);
    } catch (err: any) {
      console.warn('Aviso ao guardar favorito:', err?.message || err);
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

      // Fetch from Supabase
      setLoadingPostComments(prev => ({ ...prev, [postId]: true }));
      try {
        const res = await d1Client.posts.getComments(postId);

        if (res?.data?.data && Array.isArray(res.data.data)) {
          setPostComments(prev => {
            const next = { ...prev, [postId]: res.data!.data };
            try { localStorage.setItem(`konecta_post_comments_${postId}`, JSON.stringify(res.data!.data)); } catch (e) {}
            return next;
          });
        }
      } catch (err: any) {
        console.warn('Aviso ao carregar comentários do post:', err?.message || err);
      } finally {
        setLoadingPostComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddPostComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
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
        full_name: user.user_metadata?.full_name || 'Utilizador Konecta',
        avatar_url: user.user_metadata?.avatar_url || undefined,
        province: user.user_metadata?.province || 'Angola'
      }
    };

    // Update comments and count immediately
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

    // Save to Supabase
    try {
      await d1Client.posts.addComment(postId, text);
    } catch (err: any) {
      console.warn('Comentário guardado na cache local:', err?.message || err);
    }
  };

  const mixedFeed = React.useMemo(() => {
    if (feedType === 'reels') {
      return reels.map(r => ({ type: 'reel', data: r }));
    }
    const filtered = posts.filter(p => {
      if (feedType === 'posts') return !p.community_id;
      if (feedType === 'communities') return !!p.community_id;
      return true;
    });
    const items: any[] = filtered.map(p => ({ type: 'post', data: p }));
    if (feedType === 'all') {
      reels.forEach((reel, index) => {
        const position = (index + 1) * 3;
        if (position <= items.length) {
          items.splice(position, 0, { type: 'reel', data: reel });
        } else if (items.length < 3 && index === 0) {
          items.push({ type: 'reel', data: reel });
        }
      });
    }
    return items;
  }, [posts, reels, feedType]);

  return (
    <div className="bg-konecta-bg min-h-screen">
      
      {/* HERO SECTION - Modern Navy/Gold Hub */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full h-[55vh] lg:h-[70vh] flex items-center overflow-hidden"
      >
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-konecta-navy/95 via-konecta-navy/80 to-konecta-navy/50 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <motion.div 
            initial={{ y: 25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="max-w-3xl"
          >
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-konecta-gold bg-konecta-gold/10 px-3 py-1.5 rounded-full mb-4 border border-konecta-gold/20">
              Rede Nacional de Inovação
            </span>
            <h1 className="text-white text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight uppercase mb-6">
              Ideias que unem.<br/>
              <span className="text-konecta-gold">Pessoas que realizam.</span>
            </h1>
            <p className="text-white/80 text-base sm:text-lg lg:text-xl mb-8 max-w-xl leading-relaxed">
              Conectamos inovadores, empreendedores e cidadãos ativos em Angola para transformar desafios comunitários em soluções reais.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setCurrentTab('create')}
                className="btn-gold px-8 py-3.5 text-xs sm:text-sm shadow-xl"
              >
                Partilhar Nova Ideia
              </button>
              <button 
                onClick={() => setCurrentTab('explore')}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm transition-all backdrop-blur-md"
              >
                Explorar Iniciativas
              </button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* FEED PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* EXPOSED REELS ROW (Fila Única e Grande com Scroll/Deslize Horizontal) */}
            {reels.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-konecta-gold animate-pulse"></span>
                    <h3 className="font-black text-konecta-navy text-base uppercase tracking-wider">
                      Reels em Destaque
                    </h3>
                    <span className="text-xs text-gray-400 font-medium hidden sm:inline">• Deslize para explorar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Navigation buttons for desktop/tablets */}
                    <div className="hidden sm:flex items-center gap-1 mr-2">
                      <button 
                        type="button"
                        onClick={() => scrollReels('left')}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-konecta-navy hover:text-white text-konecta-navy flex items-center justify-center transition-all shadow-xs"
                        title="Reels anteriores"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => scrollReels('right')}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-konecta-navy hover:text-white text-konecta-navy flex items-center justify-center transition-all shadow-xs"
                        title="Mais reels"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => setCurrentTab('reels')}
                      className="text-xs font-black text-konecta-navy bg-konecta-gold/20 hover:bg-konecta-gold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all"
                    >
                      <span>Ver no Reels ↗</span>
                    </button>
                  </div>
                </div>

                {/* Single Large Row (Fila Única) - Deslize para a esquerda para ver mais reels, sem grades, nenhum reel debaixo do outro */}
                <div 
                  ref={reelsRowRef}
                  className="flex flex-row gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2 px-1 touch-pan-x -mx-3 sm:mx-0 px-3 sm:px-0"
                >
                  {reels.map((reel) => (
                    <motion.div
                      key={`exposed-reel-${reel.id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onSelectReel ? onSelectReel(reel.id) : setCurrentTab('reels')}
                      className="shrink-0 w-[200px] sm:w-[240px] md:w-[260px] aspect-[9/16] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer relative group border border-slate-800 shadow-md snap-start select-none transition-transform"
                    >
                      <video
                        src={reel.video_url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        muted
                        loop
                        playsInline
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseOut={(e) => {
                          const v = e.target as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/30 p-3.5 sm:p-4 flex flex-col justify-between pointer-events-none">
                        <div className="flex justify-between items-start">
                          <span className="bg-konecta-gold text-konecta-navy text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                            Reel
                          </span>
                          <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center shadow border border-white/20 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            {reel.profiles?.avatar_url ? (
                              <img src={reel.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/40" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-konecta-gold text-konecta-navy font-black text-[10px] flex items-center justify-center">
                                {reel.profiles?.full_name?.charAt(0) || 'K'}
                              </div>
                            )}
                            <p className="font-bold text-xs sm:text-sm text-white line-clamp-1 drop-shadow-sm">
                              {reel.profiles?.full_name || 'Criador Konecta'}
                            </p>
                          </div>

                          <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed opacity-95 drop-shadow-xs">
                            {reel.caption || 'Sem legenda'}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-xs">
                            <div className="flex items-center gap-1.5 font-extrabold text-konecta-gold">
                              <span>❤️ {reel.likes_count || 0}</span>
                            </div>
                            <span className="text-[11px] text-gray-300 font-medium">Toque para ver</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Post Box for Logged-In Users */}
            {user ? (
              <form onSubmit={handleCreatePost} className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 border border-gray-100 shadow-xs">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-konecta-navy/5 overflow-hidden shrink-0 border border-gray-100">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-konecta-navy font-bold uppercase">
                        {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Partilha uma reflexão, atualização ou novidade com a rede..."
                      className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-konecta-gold rounded-2xl p-4 text-sm resize-none text-konecta-navy"
                      rows={3}
                    />

                    {/* Image Preview with FileReader Instant Feedback */}
                    <AnimatePresence>
                      {newPostImagePreview && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative inline-block"
                        >
                          <img 
                            src={newPostImagePreview} 
                            alt="Pré-visualização" 
                            className="w-28 h-28 object-cover rounded-xl border border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
                              setNewPostImage(null);
                              setNewPostImagePreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {publishing && uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-konecta-gold h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                      >
                        <span className="material-symbols-outlined text-[20px] text-konecta-gold">add_photo_alternate</span>
                        Anexar Imagem
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        onChange={handleImageSelect} 
                        className="hidden" 
                      />

                      <button
                        type="submit"
                        disabled={publishing}
                        className="btn-primary py-2 px-6 text-xs shadow-md"
                      >
                        {publishing ? 'A publicar...' : 'Publicar no Feed'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-gradient-to-r from-konecta-navy to-konecta-navy/90 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
                <div>
                  <h3 className="font-bold text-lg mb-1">Junta-te à conversa da inovação angolana</h3>
                  <p className="text-white/70 text-sm">Entra na tua conta para publicar atualizações, apoiar ideias e colaborar.</p>
                </div>
                <button onClick={onRequireAuth} className="btn-gold whitespace-nowrap text-xs py-3 px-6 shrink-0">
                  Entrar ou Registar
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFeedType('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${feedType === 'all' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Tudo
                </button>
                <button
                  onClick={() => setFeedType('reels')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${feedType === 'reels' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Reels ({reels.length})
                </button>
                <button
                  onClick={() => setFeedType('ideas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${feedType === 'ideas' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Ideias ({ideas.length})
                </button>
                <button
                  onClick={() => setFeedType('posts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${feedType === 'posts' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Publicações ({posts.filter(p => !p.community_id).length})
                </button>
                <button
                  onClick={() => setFeedType('communities')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${feedType === 'communities' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Comunidades ({posts.filter(p => p.community_id).length})
                </button>
              </div>

              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                Dados em tempo real
              </span>
            </div>

            {/* Content Feed */}
            <div className="space-y-8">
              {loadingPosts && posts.length === 0 && (
                <div className="space-y-6">
                  <PostCardSkeleton count={3} />
                </div>
              )}

              {feedType === 'reels' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-konecta-gold">movie</span>
                      Reels em Fila (Deslize para a esquerda)
                    </h3>
                    <button 
                      onClick={() => setCurrentTab('reels')}
                      className="text-xs font-bold text-konecta-navy bg-konecta-gold hover:bg-yellow-400 px-3 py-1.5 rounded-full transition-all shadow"
                    >
                      Tela cheia ↗
                    </button>
                  </div>
                  {reels.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                      Nenhum Reel disponível de momento.
                    </div>
                  ) : (
                    <div className="flex flex-row gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2 px-1 touch-pan-x -mx-3 sm:mx-0 px-3 sm:px-0">
                      {reels.map((reel) => (
                        <motion.div
                          key={`reels-tab-${reel.id}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onSelectReel ? onSelectReel(reel.id) : setCurrentTab('reels')}
                          className="shrink-0 w-[200px] sm:w-[240px] md:w-[260px] aspect-[9/16] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer relative group border border-slate-800 shadow-md snap-start select-none"
                        >
                          <video
                            src={reel.video_url}
                            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500"
                            muted
                            loop
                            playsInline
                            onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                            onMouseOut={(e) => {
                              const v = e.target as HTMLVideoElement;
                              v.pause();
                              v.currentTime = 0;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/30 p-3.5 sm:p-4 flex flex-col justify-between pointer-events-none">
                            <div className="flex justify-between items-start">
                              <span className="bg-konecta-gold text-konecta-navy text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                Reel
                              </span>
                              <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center shadow border border-white/20 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                {reel.profiles?.avatar_url ? (
                                  <img src={reel.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/40" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-konecta-gold text-konecta-navy font-black text-[10px] flex items-center justify-center">
                                    {reel.profiles?.full_name?.charAt(0) || 'K'}
                                  </div>
                                )}
                                <p className="font-bold text-xs sm:text-sm text-white line-clamp-1 drop-shadow-sm">
                                  {reel.profiles?.full_name || 'Criador Konecta'}
                                </p>
                              </div>
                              <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed opacity-95 drop-shadow-xs">
                                {reel.caption || 'Sem descrição'}
                              </p>
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-xs">
                                <div className="flex items-center gap-1.5 font-extrabold text-konecta-gold">
                                  <span>❤️ {reel.likes_count || 0}</span>
                                </div>
                                <span className="text-[11px] text-gray-300 font-medium">Toque para ver</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (feedType === 'all' || feedType === 'posts' || feedType === 'communities') && mixedFeed.length > 0 && (
                <div className="space-y-6">
                  {mixedFeed.map((item) => {
                    if (item.type === 'reel') {
                      const reel = item.data as Reel;
                      return (
                        <motion.article 
                          key={`reel-${reel.id}`} 
                          initial={{ opacity: 0, y: 15 }} 
                          whileInView={{ opacity: 1, y: 0 }} 
                          viewport={{ once: true }} 
                          onClick={() => onSelectReel ? onSelectReel(reel.id) : setCurrentTab('reels')}
                          className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-konecta-navy text-white overflow-hidden relative border border-slate-800 shadow-md cursor-pointer hover:border-konecta-gold transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-konecta-gold text-konecta-navy flex items-center justify-center font-extrabold text-xs shadow-md">
                                {reel.profiles?.full_name?.charAt(0) || 'R'}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-white">{reel.profiles?.full_name || 'Criador Konecta'}</h4>
                                <span className="text-[10px] text-konecta-gold uppercase tracking-wider font-extrabold">Sugestão de Reel</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectReel ? onSelectReel(reel.id) : setCurrentTab('reels');
                              }} 
                              className="text-xs text-konecta-navy bg-konecta-gold hover:bg-yellow-400 font-black flex items-center gap-1 px-3 py-1.5 rounded-full transition-all shadow"
                            >
                              Assistir no Reels ↗
                            </button>
                          </div>

                          <div className="relative aspect-[16/9] sm:aspect-video bg-black rounded-2xl overflow-hidden group border border-white/10">
                            <video 
                              src={reel.video_url} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              muted 
                              loop 
                              playsInline 
                              onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})} 
                              onMouseOut={(e) => {
                                const v = e.target as HTMLVideoElement;
                                v.pause();
                                v.currentTime = 0;
                              }} 
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-konecta-gold text-konecta-navy flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl font-black">play_arrow</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs text-gray-300">
                            <p className="font-medium line-clamp-1 max-w-[80%]">{reel.caption || 'Reel Konecta'}</p>
                            <span className="font-bold text-red-400 flex items-center gap-1">
                              ❤️ {reel.likes_count || 0}
                            </span>
                          </div>
                        </motion.article>
                      );
                    }
                    const post = item.data as Post;
                    const isLiked = userLikes[post.id];
                    const isBookmarked = userBookmarks[post.id];

                    return (
                      <motion.article 
                        key={`post-${post.id}`}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-gray-100/80 mb-4 overflow-hidden transition-all hover:border-gray-200"
                      >
                        {/* Community Context Banner */}
                        {post.communities && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCommunity(post.communities!.id, post.communities!.slug);
                            }}
                            className="mb-6 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 h-24 relative cursor-pointer group/cover"
                          >
                            {post.communities.cover_url ? (
                              <img src={post.communities.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105" alt="" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-konecta-navy to-slate-800" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-3 left-4 sm:left-6 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-konecta-gold/50 shadow-lg shrink-0">
                                {post.communities.avatar_url ? (
                                  <img src={post.communities.avatar_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                ) : (
                                  <div className="w-full h-full bg-konecta-navy rounded-lg flex items-center justify-center text-xs text-konecta-gold font-black">
                                    {post.communities.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-[0.2em] block mb-0.5">Publicado em</span>
                                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{post.communities.name}</h4>
                              </div>
                            </div>
                            <div className="absolute top-4 right-4 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-white text-sm bg-black/20 backdrop-blur-sm p-1.5 rounded-full">arrow_forward</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-4">
                          <div 
                            onClick={() => post.user_id && onSelectUser(post.user_id)}
                            className="flex items-center gap-3 text-left group/author cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                              {post.profiles?.avatar_url ? (
                                <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                                  {post.profiles?.full_name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-konecta-navy group-hover/author:text-konecta-gold transition-colors">{post.profiles?.full_name || 'Membro Konecta'}</h4>
                              </div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{post.profiles?.province || 'Angola'} · {new Date(post.created_at).toLocaleDateString('pt-AO')}</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleToggleBookmark(post.id)}
                            className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-konecta-gold bg-konecta-gold/10' : 'text-gray-300 hover:text-konecta-navy'}`}
                            title={isBookmarked ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isBookmarked ? 'bookmark' : 'bookmark_border'}
                            </span>
                          </button>
                        </div>

                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                          {post.content}
                        </p>

                        {post.image_url && (
                          <div 
                            onClick={() => onImageClick(post.image_url!)}
                            className="rounded-2xl overflow-hidden mb-6 max-h-[450px] bg-gray-50 border border-gray-100 cursor-pointer group relative"
                          >
                            <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-xs">
                                fullscreen
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleLike(post.id)}
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
                              <span className={isLiked ? 'text-white font-extrabold' : ''}>{post.likes_count || 0}</span>
                            </button>

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

                          <span className="text-[11px] text-gray-400">
                            {post.communities ? `Publicado em ${post.communities.name}` : 'Publicação da Rede'}
                          </span>
                        </div>

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
                  })}
                </div>
              )}

              {/* Show Ideas if 'all' or 'ideas' */}
              {(feedType === 'all' || feedType === 'ideas') && (
                <div className="space-y-8">
                  {ideas.length === 0 && posts.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                      <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">lightbulb</span>
                      <p className="text-gray-500 italic">Ainda não existem iniciativas ou publicações no feed. Sê o primeiro a partilhar uma ideia!</p>
                      <button onClick={() => setCurrentTab('create')} className="mt-6 btn-primary">
                        Partilhar Ideia
                      </button>
                    </div>
                  ) : (
                    ideas.map((idea) => (
                      <motion.article 
                        key={idea.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="card-konecta group cursor-pointer"
                        onClick={() => onSelectPost(idea)}
                      >
                        <div className="flex flex-col md:flex-row gap-8">
                          <div className="md:w-1/3 aspect-video md:aspect-square bg-gray-50 rounded-2xl overflow-hidden shrink-0">
                            {idea.image_url ? (
                              <img src={idea.image_url} alt={idea.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-200">
                                <span className="material-symbols-outlined text-5xl">lightbulb</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-2">
                            <div>
                              <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold px-2 py-1 bg-konecta-navy/5 rounded">
                                  {idea.category}
                                </span>
                                <span className="metadata-text">
                                  {new Date(idea.created_at || '').toLocaleDateString('pt-AO')}
                                </span>
                              </div>
                              <h3 className="text-2xl font-bold text-konecta-navy group-hover:text-konecta-gold transition-colors mb-4 leading-tight">
                                {idea.title}
                              </h3>
                              <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed mb-6">
                                {idea.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                                  {idea.profiles?.avatar_url ? (
                                    <img src={idea.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">
                                      {idea.profiles?.full_name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-konecta-navy">{idea.profiles?.full_name || 'Membro Konecta'}</span>
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{idea.profiles?.province || idea.province || 'Angola'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onVoteIdea(idea.id);
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-all duration-200 transform active:scale-125 scale-105 shadow-md shadow-red-200"
                                  title="Apoiar iniciativa"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-white animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                  <span className="font-extrabold">{idea.votes_count || 0}</span>
                                </button>
                                <span className="material-symbols-outlined text-gray-300 group-hover:text-konecta-gold transition-colors">arrow_forward_ios</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 space-y-10">
            
            {/* Stats Summary - Contadores Reais */}
            <section className="bg-konecta-navy rounded-[32px] p-8 text-white shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-konecta-gold mb-8 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-konecta-gold animate-pulse"></span>
                Estado da Rede Konecta
              </h3>
              <div className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Iniciativas</span>
                  <span className="text-3xl font-black text-konecta-gold">{ideas.length}</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Publicações</span>
                  <span className="text-3xl font-black text-white">{posts.length}</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Desafios Ativos</span>
                  <span className="text-3xl font-black text-white">{challenges.length}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Províncias Ativas</span>
                  <span className="text-3xl font-black text-konecta-gold">
                    {new Set([...ideas.map(i => i.province), ...posts.map(p => p.profiles?.province)].filter(Boolean)).size || 1}
                  </span>
                </div>
              </div>
            </section>

            {/* Featured Challenges */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Desafios em Destaque</h3>
                <span className="text-[10px] text-konecta-gold font-bold uppercase tracking-wider">Prioridades</span>
              </div>
              <div className="space-y-4">
                {challenges.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sem desafios de momento.</p>
                ) : (
                  challenges.slice(0, 3).map(chal => (
                    <div 
                      key={chal.id} 
                      className="card-konecta p-5 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100" 
                      onClick={() => setCurrentTab('challenges')}
                    >
                      <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest mb-1.5 block">{chal.category}</span>
                      <h4 className="font-bold text-konecta-navy mb-2 line-clamp-1 text-sm">{chal.title}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{chal.description}</p>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setCurrentTab('challenges')}
                className="w-full py-3.5 text-xs font-bold uppercase tracking-widest text-konecta-navy bg-white border border-gray-200 rounded-2xl hover:bg-konecta-navy hover:text-white transition-all shadow-sm"
              >
                Ver Todos os Desafios →
              </button>
            </section>

            {/* Exploration Shortcuts */}
            <section className="card-konecta bg-gradient-to-br from-konecta-navy/5 to-konecta-gold/5 border-konecta-gold/20 p-6 space-y-4">
              <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                <span className="material-symbols-outlined text-konecta-gold text-[20px]">hub</span>
                Ecossistema KONECTA
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Descobre comunidades temáticas, workshops locais e equipas de projetos para acelerar o teu impacto.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setCurrentTab('communities')}
                  className="p-3 bg-white rounded-xl text-left border border-gray-100 hover:border-konecta-gold transition-colors"
                >
                  <span className="material-symbols-outlined text-konecta-navy text-[20px] block mb-1">groups</span>
                  <span className="text-xs font-bold text-konecta-navy block">Comunidades</span>
                </button>
                <button 
                  onClick={() => setCurrentTab('events')}
                  className="p-3 bg-white rounded-xl text-left border border-gray-100 hover:border-konecta-gold transition-colors"
                >
                  <span className="material-symbols-outlined text-konecta-navy text-[20px] block mb-1">event</span>
                  <span className="text-xs font-bold text-konecta-navy block">Eventos</span>
                </button>
              </div>
            </section>

          </aside>
        </div>
      </main>

      {/* Fullscreen Interactive Reel Player Modal */}
      <AnimatePresence>
        {selectedReelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
            onClick={() => setSelectedReelModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between"
            >
              <video
                src={selectedReelModal.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted={isModalMuted}
                playsInline
              />

              {/* Top Controls */}
              <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-full bg-konecta-navy border border-konecta-gold flex items-center justify-center font-bold text-xs">
                    {selectedReelModal.profiles?.full_name?.charAt(0) || 'K'}
                  </div>
                  <div>
                    <span className="font-bold text-xs block leading-tight">{selectedReelModal.profiles?.full_name || 'Criador Konecta'}</span>
                    <span className="text-[10px] text-konecta-gold font-bold">@criador</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalMuted(!isModalMuted)}
                    className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 backdrop-blur-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isModalMuted ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReelModal(null)}
                    className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 backdrop-blur-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>

              {/* Bottom Overlay & Interactions */}
              <div className="relative z-10 p-5 bg-gradient-to-t from-black/95 via-black/50 to-transparent text-white space-y-3">
                <p className="text-xs line-clamp-3 leading-relaxed drop-shadow">{selectedReelModal.caption}</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleReelLike(selectedReelModal.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-125 ${
                        selectedReelModal.is_liked
                          ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm" style={selectedReelModal.is_liked ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        favorite
                      </span>
                      <span>{selectedReelModal.likes_count || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReelModal(null);
                        setCurrentTab('reels');
                      }}
                      className="flex items-center gap-1 text-xs text-white/80 hover:text-white bg-white/10 px-3 py-1.5 rounded-full"
                    >
                      <span className="material-symbols-outlined text-sm">chat_bubble</span>
                      <span>Comentar</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert('Link do Reel copiado para a área de transferência!');
                    }}
                    className="text-xs font-bold text-konecta-navy bg-konecta-gold px-3.5 py-1.5 rounded-full shadow hover:bg-yellow-400 transition-colors"
                  >
                    Partilhar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
