import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Reel, Post, Community, Profile } from '../types';
import { d1Client } from '../lib/d1Client';
import { useT } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { ContentMenu } from '../components/ContentMenu';
import { ReelPreviewCard } from '../components/ReelPreviewCard';
import { cldAvatar, cldCover, cldImage, cldSrcSet, cldBlurPlaceholder } from '../lib/cloudinary';
import { Play } from 'lucide-react';

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
  onSelectOrg?: (slug: string) => void;
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
  onSelectOrg,
  onOpenAuth,
  user,
}) => {
  const { t } = useT();
  const { openShareSheet } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('for_you');

  // Dynamic Data Stores from Supabase
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [ideasData, setIdeasData] = useState<Idea[]>(initialIdeas || []);
  const [postsData, setPostsData] = useState<Post[]>([]);
  const [communitiesData, setCommunitiesData] = useState<Community[]>(initialCommunities || []);
  const [projectsData, setProjectsData] = useState<any[]>(initialProjects || []);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [reelsList, setReelsList] = useState<Reel[]>([]);

  // Pagination limit per category
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [loading, setLoading] = useState(false);

  // Tab session cache
  const tabCache = useRef<Record<string, any>>({});

  useEffect(() => {
    setVisibleCount(20);
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTabData();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm, activeTab]);

  const fetchTabData = async () => {
    const isSearching = searchTerm.trim().length >= 2;

    if (!isSearching && tabCache.current[activeTab]) {
      const cached = tabCache.current[activeTab];
      if (cached.ideas) setIdeasData(cached.ideas);
      if (cached.posts) setPostsData(cached.posts);
      if (cached.profiles) setProfilesList(cached.profiles);
      if (cached.communities) setCommunitiesData(cached.communities);
      if (cached.projects) setProjectsData(cached.projects);
      if (cached.events) setEventsList(cached.events);
      if (cached.orgs) setOrgsList(cached.orgs);
      if (cached.books) setBooksList(cached.books);
      if (cached.reels) setReelsList(cached.reels);
      return;
    }

    setLoading(true);
    try {
      if (isSearching) {
        // Server-side search across tables
        const res = await d1Client.search.global(searchTerm.trim());
        if (res.data?.data) {
          const results = res.data.data;
          setIdeasData(results.ideas || []);
          setPostsData(results.posts || []);
          setProfilesList(results.profiles || []);
          setCommunitiesData(results.communities || []);
          setEventsList(results.events || []);
          setReelsList(results.reels || []);
        }
      } else {
        if (activeTab === 'for_you') {
          const [ideasRes, postsRes, profsRes, commsRes, reelsRes] = await Promise.all([
            d1Client.ideas.list(20),
            d1Client.posts.list(20),
            d1Client.profiles.list(15),
            d1Client.communities.list(),
            d1Client.reels.list(15)
          ]);
          const ideas = ideasRes.data?.data || ideasRes.data || [];
          const posts = postsRes.data?.data || postsRes.data || [];
          const profs = profsRes.data?.data || profsRes.data || [];
          const comms = commsRes.data?.data || commsRes.data || [];
          const reels = reelsRes.data?.data || reelsRes.data || [];
          setIdeasData(ideas);
          setPostsData(posts);
          setProfilesList(profs);
          setCommunitiesData(comms);
          setReelsList(reels);
          tabCache.current['for_you'] = { ideas, posts, profiles: profs, communities: comms, reels };
        } else if (activeTab === 'ideas') {
          const [ideasRes, postsRes] = await Promise.all([
            d1Client.ideas.list(40),
            d1Client.posts.list(40)
          ]);
          const ideas = ideasRes.data?.data || ideasRes.data || [];
          const posts = postsRes.data?.data || postsRes.data || [];
          setIdeasData(ideas);
          setPostsData(posts);
          tabCache.current['ideas'] = { ideas, posts };
        } else if (activeTab === 'reels') {
          const res = await d1Client.reels.list(40);
          const reels = res.data?.data || res.data || [];
          setReelsList(reels);
          tabCache.current['reels'] = { reels };
        } else if (activeTab === 'people' || activeTab === 'writers') {
          const res = await d1Client.profiles.list(40);
          const profs = res.data?.data || res.data || [];
          setProfilesList(profs);
          tabCache.current[activeTab] = { profiles: profs };
        } else if (activeTab === 'communities') {
          const res = await d1Client.communities.list();
          const comms = res.data?.data || res.data || [];
          setCommunitiesData(comms);
          tabCache.current['communities'] = { communities: comms };
        } else if (activeTab === 'projects') {
          const res = await d1Client.projects.list();
          const projs = res.data?.data || res.data || [];
          setProjectsData(projs);
          tabCache.current['projects'] = { projects: projs };
        } else if (activeTab === 'events') {
          const res = await d1Client.events.list();
          const evts = res.data?.data || res.data || [];
          setEventsList(evts);
          tabCache.current['events'] = { events: evts };
        } else if (activeTab === 'organizations' || activeTab === 'churches' || activeTab === 'political') {
          const res = await d1Client.organizations.list();
          const orgs = res.data?.data || res.data || [];
          setOrgsList(orgs);
          tabCache.current[activeTab] = { orgs };
        } else if (activeTab === 'books') {
          const res = await d1Client.digitalLibrary.listBooks();
          const books = res.data?.data || res.data || [];
          setBooksList(books);
          tabCache.current['books'] = { books };
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados do Explorar:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'for_you', label: t('explore.tab_for_you'), icon: 'auto_awesome' },
    { id: 'reels', label: t('explore.tab_reels'), icon: 'movie' },
    { id: 'ideas', label: t('explore.tab_ideas'), icon: 'article' },
    { id: 'people', label: t('explore.tab_people'), icon: 'group' },
    { id: 'communities', label: t('explore.tab_communities'), icon: 'forum' },
    { id: 'events', label: t('explore.tab_events'), icon: 'event' },
    { id: 'organizations', label: t('explore.tab_organizations'), icon: 'domain' },
    { id: 'churches', label: t('explore.tab_churches'), icon: 'church' },
    { id: 'political', label: t('explore.tab_political'), icon: 'gavel' },
    { id: 'writers', label: t('explore.tab_writers'), icon: 'edit_note' },
    { id: 'books', label: t('explore.tab_books'), icon: 'menu_book' },
    { id: 'projects', label: t('explore.tab_projects'), icon: 'rocket_launch' }
  ];

  const searchClean = searchTerm.trim().toLowerCase();

  const filteredProfiles = profilesList.filter(p =>
    !searchClean || (p.full_name || p.display_name || '').toLowerCase().includes(searchClean) || (p.username || '').toLowerCase().includes(searchClean)
  );

  const filteredIdeas = ideasData.filter(i =>
    !searchClean || i.title?.toLowerCase().includes(searchClean) || i.description?.toLowerCase().includes(searchClean)
  );

  const filteredPosts = postsData.filter(p =>
    !searchClean || (p.content || p.body || '').toLowerCase().includes(searchClean)
  );

  const filteredCommunities = communitiesData.filter(c =>
    !searchClean || c.name?.toLowerCase().includes(searchClean) || c.description?.toLowerCase().includes(searchClean)
  );

  const filteredOrgs = orgsList.filter(o => {
    const matchQuery = !searchClean || o.name?.toLowerCase().includes(searchClean) || o.description?.toLowerCase().includes(searchClean);
    if (activeTab === 'churches') return matchQuery && o.category === 'church';
    if (activeTab === 'political') return matchQuery && (o.category === 'political_party' || o.category === 'civic_movement');
    return matchQuery;
  });

  const filteredEvents = eventsList.filter(e =>
    !searchClean || e.title?.toLowerCase().includes(searchClean) || e.description?.toLowerCase().includes(searchClean)
  );

  const filteredBooks = booksList.filter(b =>
    !searchClean || b.title?.toLowerCase().includes(searchClean) || b.synopsis?.toLowerCase().includes(searchClean)
  );

  const filteredReels = reelsList.filter(r =>
    !searchClean || (r.caption || '').toLowerCase().includes(searchClean)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      
      {/* Header */}
      <header className="mb-6">
        <span className="text-xs font-bold text-konecta-gold uppercase tracking-wider">{t('explore.global_discovery')}</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-konecta-navy tracking-tight mt-1">{t('explore.title')}</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1.5 max-w-2xl">
          {t('explore.desc')}
        </p>

        {/* Global Search Bar */}
        <div className="mt-5 relative max-w-xl">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('explore.search_placeholder')}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm shadow-xs focus:outline-none focus:border-konecta-navy focus:ring-1 focus:ring-konecta-navy"
          />
        </div>
      </header>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-konecta-navy text-white border-konecta-navy shadow-xs font-bold'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-konecta-gold'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-konecta-gold' : 'text-gray-400'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Para Ti: Reels Carousel */}
          {activeTab === 'for_you' && filteredReels.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">movie</span>
                  {t('explore.featured_reels')}
                </h3>
                <button
                  onClick={() => setActiveTab('reels')}
                  className="text-xs font-semibold text-konecta-navy hover:text-konecta-gold transition-colors"
                >
                  {t('explore.view_all')}
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {filteredReels.map(reel => (
                  <div key={reel.id} className="shrink-0 w-32 sm:w-40 snap-start">
                    <ReelPreviewCard 
                      reel={reel} 
                      onClick={() => onSelectReel?.(reel.id)} 
                      shouldPreview={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vídeos & Reels Tab: 3-Column Grid of 9:16 Cards */}
          {activeTab === 'reels' && (
            <section className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">movie</span>
                  {t('explore.tab_reels')}
                </h3>
              </div>
              {filteredReels.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs">
                  {t('explore.reel_empty')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredReels.slice(0, visibleCount).map((reel) => (
                    <ReelPreviewCard 
                      key={reel.id}
                      reel={reel} 
                      onClick={() => onSelectReel?.(reel.id)} 
                      shouldPreview={false}
                    />
                  ))}
                </div>
              )}
              {filteredReels.length > visibleCount && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="btn-primary py-2 px-6 text-xs rounded-full"
                  >
                    {t('explore.more_videos')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* People Section */}
          {(activeTab === 'for_you' || activeTab === 'people' || activeTab === 'writers') && filteredProfiles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">group</span>
                  {t('explore.people_talents')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProfiles.slice(0, activeTab === 'for_you' ? 4 : visibleCount).map((p) => (
                  <div
                    key={p.user_id || p.id}
                    onClick={() => onSelectUser && onSelectUser(p.user_id || p.id)}
                    className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                      {p.avatar_url ? (
                        <img 
                          src={cldAvatar(p.avatar_url)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        (p.full_name || p.display_name || 'U').charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs text-konecta-navy truncate">{p.full_name || p.display_name || 'Membro'}</p>
                      <p className="text-[10px] text-gray-400">@{p.username || 'membro'}</p>
                      {p.province && <p className="text-[10px] text-konecta-gold font-medium">{p.province}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {activeTab !== 'for_you' && filteredProfiles.length > visibleCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="btn-primary py-2 px-6 text-xs rounded-full"
                  >
                    {t('explore.more_people')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Ideas & Posts Section */}
          {(activeTab === 'for_you' || activeTab === 'ideas') && (filteredIdeas.length > 0 || filteredPosts.length > 0) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">article</span>
                  {t('explore.publications_ideas')}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Community Posts */}
                {filteredPosts.slice(0, activeTab === 'for_you' ? 3 : Math.floor(visibleCount / 2)).map((post) => (
                  <div
                    key={`post-${post.id}`}
                    className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200 transition-all space-y-2.5"
                  >
                    {post.communities && (
                        <button
                          onClick={() => onSelectCommunity?.(post.communities!.id, post.communities!.slug)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-konecta-gold hover:text-konecta-navy transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">groups</span>
                          <span>{t('home.in')} {post.communities.name}</span>
                        </button>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center text-xs font-bold text-konecta-navy shrink-0">
                          {post.profiles?.avatar_url ? (
                            <img 
                              src={cldAvatar(post.profiles.avatar_url)} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            (post.profiles?.full_name || 'U').charAt(0)
                          )}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs text-konecta-navy truncate">{post.profiles?.full_name || 'Membro'}</p>
                          <p className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString('pt-AO')}</p>
                        </div>
                      </div>
                      <ContentMenu
                        targetType="post"
                        targetId={post.id}
                        isOwner={user?.id === post.user_id}
                        onDelete={() => setPostsData((prev: Post[]) => prev.filter(p => p.id !== post.id))}
                        onReport={() => {}}
                        onShare={() => openShareSheet({ targetId: post.id, targetType: 'post', title: post.body || post.content || 'Publicação', authorName: post.profiles?.full_name || 'Membro Konecta', thumbnail: post.image_url })}
                      />
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{post.body || post.content}</p>
                    {post.image_url && (
                      <img 
                        src={cldImage(post.image_url, { w: 800 })} 
                        alt="" 
                        className="w-full max-h-64 object-cover rounded-xl mt-2" 
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                ))}

                {/* Ideas */}
                {filteredIdeas.slice(0, activeTab === 'for_you' ? 3 : Math.floor(visibleCount / 2)).map((idea) => (
                  <div
                    key={`idea-${idea.id}`}
                    onClick={() => onSelectPost(idea)}
                    className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-wider">
                        {idea.category || 'Geral'}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ContentMenu
                          targetType="idea"
                          targetId={idea.id}
                          isOwner={user?.id === idea.user_id}
                          onDelete={() => setIdeasData((prev: Idea[]) => prev.filter(i => i.id !== idea.id))}
                          onReport={() => {}}
                          onShare={() => openShareSheet({ targetId: idea.id, targetType: 'idea', title: idea.title, authorName: idea.profiles?.full_name || 'Inovador Konecta', thumbnail: idea.image_url })}
                        />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-konecta-navy leading-snug group-hover:text-konecta-gold transition-colors">{idea.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{idea.description}</p>
                    {idea.image_url && (
                      <div className="mt-2.5 rounded-xl overflow-hidden aspect-video bg-gray-50 border border-gray-100">
                        <img 
                          src={cldImage(idea.image_url, { w: 800 })} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeTab === 'ideas' && (filteredIdeas.length + filteredPosts.length) > visibleCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="btn-primary py-2 px-6 text-xs rounded-full"
                  >
                    {t('explore.more_publications')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Communities Section */}
          {(activeTab === 'for_you' || activeTab === 'communities') && filteredCommunities.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">groups</span>
                  {t('explore.tab_communities')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCommunities.slice(0, activeTab === 'for_you' ? 3 : visibleCount).map((comm) => (
                  <div
                    key={comm.id}
                    onClick={() => onSelectCommunity?.(comm.id, comm.slug)}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2"
                  >
                    <h4 className="text-sm font-bold text-konecta-navy">{comm.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{comm.description || 'Comunidade Konecta'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Organizations / Churches / Political */}
          {(activeTab === 'for_you' || activeTab === 'organizations' || activeTab === 'churches' || activeTab === 'political') && filteredOrgs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">domain</span>
                  {t('explore.orgs_movements')}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredOrgs.slice(0, activeTab === 'for_you' ? 3 : visibleCount).map((org) => (
                  <div
                    key={org.id}
                    onClick={() => onSelectOrg && onSelectOrg(org.slug)}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-1.5"
                  >
                    <p className="text-[10px] font-extrabold text-konecta-navy uppercase tracking-wider">
                      {org.category}
                    </p>
                    <h4 className="text-sm font-bold text-konecta-navy">{org.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{org.description || 'Instituição'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {(activeTab === 'for_you' || activeTab === 'events') && filteredEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">event</span>
                  {t('explore.events_workshops')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredEvents.slice(0, activeTab === 'for_you' ? 3 : visibleCount).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-1.5"
                  >
                    <h4 className="text-sm font-bold text-konecta-navy">{evt.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{evt.description}</p>
                    {evt.event_date && (
                      <p className="text-[11px] text-konecta-gold font-medium">
                        {new Date(evt.event_date).toLocaleDateString('pt-AO')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Books */}
          {(activeTab === 'for_you' || activeTab === 'books') && filteredBooks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">menu_book</span>
                  {t('explore.books_library')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredBooks.slice(0, activeTab === 'for_you' ? 3 : visibleCount).map((book) => (
                  <div
                    key={book.id}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-1.5"
                  >
                    <h4 className="text-sm font-bold text-konecta-navy">{book.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{book.synopsis || book.author}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

    </div>
  );
};
