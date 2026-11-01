import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Reel, Post, Community, Profile } from '../types';
import { d1Client } from '../lib/d1Client';
import { Reels } from './Reels';

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
  user,
  onOpenAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('for_you');

  // Dynamic Data Stores from Supabase
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [ideasData, setIdeasData] = useState<Idea[]>(initialIdeas || []);
  const [communitiesData, setCommunitiesData] = useState<Community[]>(initialCommunities || []);
  const [projectsData, setProjectsData] = useState<any[]>(initialProjects || []);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [reelsList, setReelsList] = useState<Reel[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllExploreData();
  }, [searchTerm, activeTab]);

  const fetchAllExploreData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'for_you' || activeTab === 'ideas') {
        const res = await d1Client.ideas.list(30);
        setIdeasData(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'people' || activeTab === 'writers') {
        const res = await d1Client.profiles.list(30);
        setProfilesList(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'communities') {
        const res = await d1Client.communities.list();
        setCommunitiesData(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'projects') {
        const res = await d1Client.projects.list();
        setProjectsData(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'events') {
        const res = await d1Client.events.list();
        setEventsList(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'organizations' || activeTab === 'churches' || activeTab === 'political') {
        const res = await d1Client.organizations.list();
        setOrgsList(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'books') {
        const res = await d1Client.digitalLibrary.listBooks();
        setBooksList(res.data?.data || res.data || []);
      }
      if (activeTab === 'for_you' || activeTab === 'reels') {
        const res = await d1Client.reels.list(20);
        setReelsList(res.data?.data || res.data || []);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados do Explorar:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'for_you', label: 'Para Ti', icon: 'auto_awesome' },
    { id: 'people', label: 'Pessoas', icon: 'group' },
    { id: 'ideas', label: 'Publicações & Ideias', icon: 'article' },
    { id: 'reels', label: 'Vídeos & Reels', icon: 'movie' },
    { id: 'communities', label: 'Comunidades', icon: 'forum' },
    { id: 'events', label: 'Eventos & Workshops', icon: 'event' },
    { id: 'organizations', label: 'Organizações', icon: 'domain' },
    { id: 'churches', label: 'Igrejas', icon: 'church' },
    { id: 'political', label: 'Partidos & Movimentos', icon: 'gavel' },
    { id: 'writers', label: 'Escritores & Autores', icon: 'edit_note' },
    { id: 'books', label: 'Livros & Biblioteca', icon: 'menu_book' },
    { id: 'projects', label: 'Projetos', icon: 'rocket_launch' }
  ];

  const searchClean = searchTerm.trim().toLowerCase();

  const filteredProfiles = profilesList.filter(p =>
    !searchClean || (p.full_name || p.display_name || '').toLowerCase().includes(searchClean) || (p.username || '').toLowerCase().includes(searchClean)
  );

  const filteredIdeas = ideasData.filter(i =>
    !searchClean || i.title?.toLowerCase().includes(searchClean) || i.description?.toLowerCase().includes(searchClean)
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-8">
        <span className="text-xs font-black tracking-widest text-konecta-gold uppercase">Descoberta Global</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight mt-1">Explorar KONECTA Angola</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-2xl">
          Descobre pessoas, inovações, igrejas, partidos, escritores, comunidades e eventos reais de Angola.
        </p>

        {/* Global Search Bar */}
        <div className="mt-6 relative max-w-xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar pessoas, ideias, eventos, igrejas, livros..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs shadow-xs focus:outline-none focus:border-konecta-gold"
          />
        </div>
      </header>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
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

      {/* Reels Full Tab */}
      {activeTab === 'reels' ? (
        <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-black">
          <Reels
            user={user}
            onOpenAuth={onOpenAuth}
            onSelectUser={onSelectUser || (() => {})}
          />
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* People Section */}
          {(activeTab === 'for_you' || activeTab === 'people' || activeTab === 'writers') && filteredProfiles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold">group</span>
                  Pessoas & Talentos
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProfiles.slice(0, activeTab === 'for_you' ? 4 : 20).map((p) => (
                  <div
                    key={p.user_id || p.id}
                    onClick={() => onSelectUser && onSelectUser(p.user_id || p.id)}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-sm">
                          {(p.full_name || p.display_name || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs text-konecta-navy truncate">{p.full_name || p.display_name || 'Membro'}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{p.province || 'Angola'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ideas / Posts Section */}
          {(activeTab === 'for_you' || activeTab === 'ideas') && filteredIdeas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold">article</span>
                  Publicações & Ideias
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredIdeas.slice(0, activeTab === 'for_you' ? 4 : 20).map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => onSelectPost(idea)}
                    className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-konecta-gold bg-konecta-gold/10 px-2.5 py-1 rounded-full">
                      {idea.category || 'Geral'}
                    </span>
                    <h4 className="text-base font-bold text-konecta-navy leading-snug">{idea.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{idea.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Organizations / Churches / Political Section */}
          {(activeTab === 'for_you' || activeTab === 'organizations' || activeTab === 'churches' || activeTab === 'political') && filteredOrgs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold">domain</span>
                  Organizações, Igrejas e Partidos
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredOrgs.slice(0, activeTab === 'for_you' ? 3 : 20).map((org) => (
                  <div
                    key={org.id}
                    onClick={() => onSelectOrg && onSelectOrg(org.slug)}
                    className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2"
                  >
                    <p className="text-[10px] font-bold text-konecta-navy uppercase tracking-wider bg-gray-100 px-2.5 py-1 rounded-full inline-block">
                      {org.category}
                    </p>
                    <h4 className="text-sm font-bold text-konecta-navy">{org.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{org.description || 'Instituição no KONECTA'}</p>
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
