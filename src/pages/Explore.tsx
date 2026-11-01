import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Users, Globe, Building, FileText, Heart, MessageCircle, Volume2, VolumeX, X, Share2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Reel, Post, Community, Profile } from '../types';
import { d1Client } from '../lib/d1Client';
import { IdeaCardSkeleton, PostCardSkeleton } from '../components/Skeletons';

interface ExploreProps {
  ideas: Idea[];
  reels?: Reel[];
  communities: Community[];
  projects: any[];
  onVoteIdea: (id: string) => void;
  user: any;
  onOpenAuth: () => void;
  onSelectPost: (idea: Idea) => void;
  onSelectUser?: (userId: string) => void;
  onSelectCommunity?: (id: string, slug?: string) => void;
  onSelectReel?: (reelId: string) => void;
}

export const Explore: React.FC<ExploreProps> = ({
  ideas: initialIdeas,
  communities: initialCommunities,
  projects: initialProjects,
  onVoteIdea,
  onSelectPost,
  onSelectUser,
  onSelectCommunity,
  onSelectReel,
  user,
  onOpenAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [activeTab, setActiveTab] = useState<'descobrir' | 'reels' | 'pessoas' | 'comunidades' | 'publicacoes' | 'empresas'>('descobrir');

  // Local state with fallbacks to guarantee data loads even if parent props are delayed
  const [ideasData, setIdeasData] = useState<Idea[]>(initialIdeas || []);
  const [communitiesData, setCommunitiesData] = useState<Community[]>(initialCommunities || []);
  const [projectsData, setProjectsData] = useState<any[]>(initialProjects || []);
  
  const [exploreReels, setExploreReels] = useState<Reel[]>([]);
  const [exploreProfiles, setExploreProfiles] = useState<Profile[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  
  const [loadingIdeas, setLoadingIdeas] = useState<boolean>(false);
  const [loadingTab, setLoadingTab] = useState<boolean>(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Interactive Reel Modal State
  const [selectedReelModal, setSelectedReelModal] = useState<Reel | null>(null);
  const [isModalMuted, setIsModalMuted] = useState<boolean>(false);

  // Sync props and fetch fallbacks
  useEffect(() => {
    if (initialIdeas && initialIdeas.length > 0) {
      setIdeasData(initialIdeas);
    } else {
      setLoadingIdeas(true);
      d1Client.ideas.list(30)
        .then((res: any) => {
          const items = res.data?.data || res.data || [];
          if (Array.isArray(items) && items.length > 0) {
            setIdeasData(items);
          }
        })
        .catch((err: any) => console.warn('Aviso ao carregar ideias no Explorar:', err))
        .finally(() => setLoadingIdeas(false));
    }
  }, [initialIdeas]);

  useEffect(() => {
    if (initialCommunities && initialCommunities.length > 0) {
      setCommunitiesData(initialCommunities);
    } else {
      d1Client.communities.list()
        .then((res: any) => {
          const items = res.data?.data || res.data || [];
          if (Array.isArray(items) && items.length > 0) {
            setCommunitiesData(items);
          }
        })
        .catch((err: any) => console.warn('Aviso comunidades:', err));
    }
  }, [initialCommunities]);

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjectsData(initialProjects);
    } else {
      d1Client.projects.list()
        .then((res: any) => {
          const items = res.data?.data || res.data || [];
          if (Array.isArray(items) && items.length > 0) {
            setProjectsData(items);
          }
        })
        .catch((err: any) => console.warn('Aviso projetos:', err));
    }
  }, [initialProjects]);

  // Fetch dynamic tab data
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  const fetchTabData = async (tab: string) => {
    setLoadingTab(true);
    try {
      if (tab === 'reels' && exploreReels.length === 0) {
        const res = await d1Client.reels.list(30);
        const items = res.data?.data || res.data || [];
        setExploreReels(items);
      } else if (tab === 'pessoas' && exploreProfiles.length === 0) {
        const res = await d1Client.profiles.list(30);
        const items = res.data?.data || res.data || [];
        setExploreProfiles(items);
      } else if (tab === 'publicacoes' && explorePosts.length === 0) {
        const res = await d1Client.posts.list(30);
        const items = res.data?.data || res.data || [];
        setExplorePosts(items);
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar aba:', tab, err?.message || err);
    } finally {
      setLoadingTab(false);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const current = followingMap[userId];
    setFollowingMap(prev => ({ ...prev, [userId]: !current }));
    try {
      await d1Client.profiles.toggleFollow(userId, !!current);
    } catch (err: any) {
      console.warn('Erro ao seguir utilizador:', err);
    }
  };

  const tabs = [
    { id: 'descobrir', label: 'Descobrir', icon: Globe },
    { id: 'reels', label: 'Reels', icon: Play },
    { id: 'pessoas', label: 'Pessoas', icon: Users },
    { id: 'comunidades', label: 'Comunidades', icon: Building },
    { id: 'publicacoes', label: 'Publicações', icon: FileText },
    { id: 'empresas', label: 'Empresas & Negócios', icon: Building },
  ];

  const categories = ['Todas', 'Tecnologia', 'Inovação', 'Social', 'Energia', 'Agricultura', 'Educação', 'Saúde'];

  const filteredIdeas = ideasData.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || idea.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCommunities = communitiesData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProfiles = exploreProfiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.province || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = explorePosts.filter(p =>
    p.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReels = exploreReels.filter(r =>
    (r.caption || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projectsData.filter(p =>
    (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <span className="feature-kicker">Hub de Descoberta Nacional</span>
        <h1 className="hero-title">Explorar Konecta Angola</h1>
        <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-2xl">
          Descobre criadores talentosos, inovações transformadoras, comunidades ativas e empresas que moldam o futuro de Angola.
        </p>
        
        {/* Search Bar */}
        <div className="relative mt-6 max-w-2xl shadow-sm">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por pessoas, Reels, comunidades, publicações ou negócios..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-14 pr-6 h-14 text-sm focus:outline-none focus:border-konecta-gold transition-all"
          />
        </div>
      </motion.header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-konecta-navy text-white scale-[1.02] shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 text-konecta-gold" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Categories for Descobrir */}
      {activeTab === 'descobrir' && (
        <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-konecta-gold text-konecta-navy font-black shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Dynamic Content Area */}
      <div className="min-h-[450px]">
        
        {/* ABA: DESCOBRIR (IDEIAS & INICIATIVAS) */}
        {activeTab === 'descobrir' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingIdeas && ideasData.length === 0 ? (
              <IdeaCardSkeleton count={6} />
            ) : filteredIdeas.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-8">
                <span className="material-symbols-outlined text-5xl text-konecta-gold mb-3 block">lightbulb</span>
                <h3 className="font-bold text-base text-konecta-navy mb-1">Sem iniciativas nesta categoria</h3>
                <p className="text-gray-500 text-xs max-w-md mx-auto mb-6">Sê o primeiro a partilhar uma ideia ou projeto inovador para inspirar a comunidade angolana.</p>
              </div>
            ) : (
              filteredIdeas.map((idea) => (
                <motion.article 
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={idea.id} 
                  className="card-konecta flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md transition-all border border-gray-100" 
                  onClick={() => onSelectPost(idea)}
                >
                  <div className="p-6">
                    <div className="aspect-video bg-gray-50 rounded-2xl mb-5 overflow-hidden border border-gray-100 relative">
                      {idea.image_url ? (
                        <img src={idea.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200 bg-konecta-navy/5">
                          <span className="material-symbols-outlined text-4xl text-konecta-gold">lightbulb</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-wider bg-konecta-navy/5 px-2 py-0.5 rounded">
                        {idea.category}
                      </span>
                      <span className="text-[10px] text-gray-400">{idea.province || 'Angola'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-konecta-navy group-hover:text-konecta-gold transition-colors mb-2 line-clamp-2 leading-tight">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                      {idea.description}
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-konecta-navy/10 overflow-hidden flex items-center justify-center font-bold text-konecta-navy text-[10px]">
                        {idea.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium truncate max-w-[120px]">{idea.profiles?.full_name || 'Inovador'}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVoteIdea(idea.id);
                      }}
                      className="flex items-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full font-bold transition-all active:scale-110"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{idea.votes_count || 0}</span>
                    </button>
                  </div>
                </motion.article>
              ))
            )}
          </div>
        )}
        
        {/* ABA: COMUNIDADES */}
        {activeTab === 'comunidades' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCommunities.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 italic">Nenhuma comunidade encontrada com os termos de pesquisa.</div>
            ) : (
              filteredCommunities.map(community => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={community.id} 
                  className="card-konecta p-6 cursor-pointer hover:border-konecta-gold transition-all flex flex-col justify-between shadow-sm" 
                  onClick={() => onSelectCommunity?.(community.id, community.slug)}
                >
                  <div>
                    <div className="h-28 -mx-6 -mt-6 mb-4 relative overflow-hidden bg-konecta-navy">
                      {community.cover_url ? (
                        <img src={community.cover_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-konecta-navy to-slate-800" />
                      )}
                      <div className="absolute -bottom-4 left-6 w-12 h-12 rounded-xl bg-white p-1 border border-gray-200 shadow-md">
                        {community.avatar_url ? (
                          <img src={community.avatar_url} className="w-full h-full object-cover rounded-lg" alt="" />
                        ) : (
                          <div className="w-full h-full bg-konecta-navy rounded-lg flex items-center justify-center text-konecta-gold font-bold text-sm">
                            {community.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2">
                      <h4 className="font-bold text-konecta-navy text-base">{community.name}</h4>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{community.description}</p>
                    </div>
                  </div>
                  <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{community.member_count || 1} membros</span>
                    <button className="btn-primary text-xs py-2 px-4">Ver Comunidade</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
        
        {/* ABA: REELS */}
        {activeTab === 'reels' && (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
             {loadingTab && exploreReels.length === 0 ? (
               <div className="col-span-full py-20 text-center text-gray-400">A carregar Reels...</div>
             ) : filteredReels.length === 0 ? (
               <div className="col-span-full py-20 text-center text-gray-400 italic">Nenhum Reel encontrado de momento.</div>
             ) : (
               filteredReels.map(reel => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    key={reel.id} 
                    onClick={() => onSelectReel ? onSelectReel(reel.id) : setSelectedReelModal(reel)}
                    className="aspect-[9/16] bg-black rounded-2xl overflow-hidden cursor-pointer relative group shadow-md border border-white/10"
                  >
                    <video 
                      src={reel.video_url} 
                      className="w-full h-full object-cover" 
                      muted 
                      loop 
                      playsInline 
                      onMouseOver={(e) => (e.target as HTMLVideoElement).play()} 
                      onMouseOut={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-4 text-white">
                      <div className="flex justify-end">
                        <span className="bg-black/50 p-1.5 rounded-full backdrop-blur-xs">
                          <Play className="w-3.5 h-3.5 text-konecta-gold fill-current" />
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-xs line-clamp-1">{reel.profiles?.full_name || 'Criador Konecta'}</p>
                        <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5">{reel.caption}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-konecta-gold font-bold">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current text-red-500" /> {reel.likes_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
               ))
             )}
           </div>
        )}

        {/* ABA: PESSOAS */}
        {activeTab === 'pessoas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingTab && exploreProfiles.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400">A carregar perfis...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 italic">Nenhum utilizador encontrado.</div>
            ) : (
              filteredProfiles.map(profile => {
                const isFollowing = followingMap[profile.id];
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={profile.id} 
                    className="card-konecta p-6 flex items-center justify-between shadow-sm"
                  >
                    <div 
                      onClick={() => onSelectUser?.(profile.id)}
                      className="flex items-center gap-4 cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-konecta-navy text-konecta-gold flex items-center justify-center font-bold">
                            {(profile.full_name || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-konecta-navy group-hover:text-konecta-gold transition-colors">
                          {profile.full_name || 'Membro Konecta'}
                        </h4>
                        <p className="text-xs text-gray-400">{profile.province || 'Luanda, Angola'}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">{profile.bio || 'Inovador na rede Konecta'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(profile.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isFollowing 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                          : 'btn-primary'
                      }`}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ABA: PUBLICAÇÕES */}
        {activeTab === 'publicacoes' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {loadingTab && explorePosts.length === 0 ? (
              <PostCardSkeleton count={3} />
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center text-gray-400 italic">Nenhuma publicação encontrada.</div>
            ) : (
              filteredPosts.map(post => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={post.id} 
                  className="card-konecta p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-konecta-navy/10 overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-konecta-navy text-xs">
                          {post.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-konecta-navy">{post.profiles?.full_name || 'Membro Konecta'}</h4>
                      <p className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString('pt-AO')}</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && (
                    <div className="rounded-xl overflow-hidden max-h-80 bg-gray-50">
                      <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}
                  <div className="flex items-center gap-6 pt-2 border-t border-gray-50 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-red-500 fill-current" /> {post.likes_count || 0} gostos</span>
                    <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-konecta-navy" /> {post.comments_count || 0} comentários</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ABA: EMPRESAS & NEGÓCIOS */}
        {activeTab === 'empresas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 italic">Nenhuma empresa ou negócio registado de momento.</div>
            ) : (
              filteredProjects.map(proj => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={proj.id} 
                  className="card-konecta p-6 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <span className="text-[10px] font-bold text-konecta-gold bg-konecta-navy/5 px-2 py-0.5 rounded uppercase tracking-wider">{proj.category || 'Negócio'}</span>
                    <h3 className="text-lg font-bold text-konecta-navy mt-2 mb-3">{proj.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">{proj.description}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
                    <span className="font-bold text-konecta-navy">{proj.status === 'active' ? 'Em Crescimento' : 'Planeamento'}</span>
                    <button className="btn-primary text-xs py-2 px-4">Ver Detalhes</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Interactive Fullscreen Reel Viewer Modal */}
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

              {/* Top Bar */}
              <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-full bg-konecta-navy border border-konecta-gold flex items-center justify-center font-bold text-xs">
                    {selectedReelModal.profiles?.full_name?.charAt(0) || 'K'}
                  </div>
                  <span className="font-bold text-xs">{selectedReelModal.profiles?.full_name || 'Criador Konecta'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsModalMuted(!isModalMuted)}
                    className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    {isModalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedReelModal(null)}
                    className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Overlay */}
              <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white space-y-2">
                <p className="text-xs line-clamp-3 leading-relaxed">{selectedReelModal.caption}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
                    ❤️ {selectedReelModal.likes_count || 0}
                  </span>
                  <div className="flex items-center gap-2">
                    {onSelectReel && (
                      <button
                        onClick={() => {
                          const rid = selectedReelModal.id;
                          setSelectedReelModal(null);
                          onSelectReel(rid);
                        }}
                        className="text-xs font-bold text-konecta-navy bg-konecta-gold hover:bg-yellow-400 px-3 py-1.5 rounded-full shadow"
                      >
                        Abrir no Reels ↗
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        alert('Link do Reel copiado!');
                      }}
                      className="text-xs text-konecta-gold font-bold bg-black/50 px-3 py-1.5 rounded-full border border-konecta-gold/30"
                    >
                      Partilhar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
