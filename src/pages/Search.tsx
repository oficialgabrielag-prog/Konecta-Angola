import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Idea, Profile, Project, Community, Event } from '../types';
import { d1Client } from '../lib/d1Client';

interface SearchProps {
  onSelectIdea: (idea: Idea) => void;
  onSelectUser: (userId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const Search: React.FC<SearchProps> = ({ onSelectIdea, onSelectUser, onNavigateTab }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    ideas: Idea[];
    profiles: Profile[];
    projects: Project[];
    communities: Community[];
    events: Event[];
  }>({
    ideas: [],
    profiles: [],
    projects: [],
    communities: [],
    events: []
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ideas' | 'people' | 'projects' | 'communities' | 'events'>('all');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else {
        setResults({ ideas: [], profiles: [], projects: [], communities: [], events: [] });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const d1Res = await d1Client.search.global(query.trim());
      const data = d1Res.data?.data || { ideas: [], profiles: [], projects: [], communities: [], events: [] };

      setResults({
        ideas: data.ideas || [],
        profiles: data.profiles || [],
        projects: data.projects || [],
        communities: data.communities || [],
        events: data.events || []
      });
    } catch (err: any) {
      console.warn('Aviso de pesquisa global:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = 
    results.ideas.length + 
    results.profiles.length + 
    results.projects.length + 
    results.communities.length + 
    results.events.length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header Search Box */}
      <header className="mb-12">
        <span className="feature-kicker mb-2 block">Exploração do Ecossistema</span>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-konecta-gold text-2xl">
            search
          </span>
          <input
            type="text"
            autoFocus
            placeholder="Procura ideias, inovadores, projetos, comunidades ou eventos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-16 bg-white border border-gray-200 rounded-3xl pl-16 pr-6 text-base sm:text-lg focus:outline-none focus:border-konecta-gold shadow-sm text-konecta-navy placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-konecta-navy"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'ideas', label: `Ideias (${results.ideas.length})` },
            { id: 'people', label: `Pessoas (${results.profiles.length})` },
            { id: 'projects', label: `Projetos (${results.projects.length})` },
            { id: 'communities', label: `Comunidades (${results.communities.length})` },
            { id: 'events', label: `Eventos (${results.events.length})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === item.id 
                  ? 'bg-konecta-navy text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Results Section */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : query.trim().length >= 2 ? (
        <div className="space-y-12">
          {totalResults === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">search_off</span>
              <p className="text-gray-500 text-sm">Nenhum registo encontrado para "{query}".</p>
              <p className="text-xs text-gray-400 mt-1">Experimenta outros termos ou palavras-chave.</p>
            </div>
          ) : (
            <>
              {/* Ideas Results */}
              {(activeFilter === 'all' || activeFilter === 'ideas') && results.ideas.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">lightbulb</span>
                    Ideias Encontradas ({results.ideas.length})
                  </h3>
                  <div className="space-y-3">
                    {results.ideas.map(idea => (
                      <button
                        key={idea.id}
                        onClick={() => onSelectIdea(idea)}
                        className="card-konecta w-full text-left p-5 flex items-center justify-between group hover:border-konecta-gold/50 transition-all shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-konecta-gold uppercase">{idea.category}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">{idea.profiles?.full_name || 'Autor'}</span>
                          </div>
                          <h4 className="font-bold text-base text-konecta-navy group-hover:text-konecta-gold transition-colors">{idea.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{idea.description}</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-konecta-gold transition-colors">arrow_forward</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* People Results */}
              {(activeFilter === 'all' || activeFilter === 'people') && results.profiles.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">person</span>
                    Inovadores e Membros ({results.profiles.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.profiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => onSelectUser(profile.id)}
                        className="card-konecta w-full text-left p-4 flex items-center gap-4 bg-white shadow-xs group hover:border-konecta-gold/50 transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-sm">
                              {profile.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="truncate flex-1">
                          <h4 className="font-bold text-sm text-konecta-navy group-hover:text-konecta-gold transition-colors truncate">{profile.full_name || 'Utilizador'}</h4>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{profile.province || 'Angola'}</p>
                          {profile.bio && <p className="text-xs text-gray-500 truncate mt-0.5">{profile.bio}</p>}
                        </div>
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-konecta-gold text-sm transition-colors">arrow_forward</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects Results */}
              {(activeFilter === 'all' || activeFilter === 'projects') && results.projects.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">folder_special</span>
                    Projetos em Curso ({results.projects.length})
                  </h3>
                  <div className="space-y-3">
                    {results.projects.map(project => (
                      <div 
                        key={project.id} 
                        onClick={() => onNavigateTab && onNavigateTab('projects')}
                        className="card-konecta p-5 flex items-center justify-between cursor-pointer hover:border-konecta-gold/50 transition-all shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-konecta-gold uppercase">{project.category}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">{project.province || 'Angola'}</span>
                          </div>
                          <h4 className="font-bold text-base text-konecta-navy">{project.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{project.description}</p>
                        </div>
                        <span className="text-xs font-bold text-konecta-navy bg-gray-100 px-3 py-1 rounded-full shrink-0">
                          {project.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Communities Results */}
              {(activeFilter === 'all' || activeFilter === 'communities') && results.communities.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">groups</span>
                    Comunidades Temáticas ({results.communities.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.communities.map(comm => (
                      <div 
                        key={comm.id} 
                        onClick={() => onNavigateTab && onNavigateTab('communities')}
                        className="card-konecta p-4 cursor-pointer hover:border-konecta-gold/50 transition-all shadow-xs"
                      >
                        <h4 className="font-bold text-sm text-konecta-navy mb-1">{comm.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{comm.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Events Results */}
              {(activeFilter === 'all' || activeFilter === 'events') && results.events.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">event</span>
                    Eventos e Encontros ({results.events.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.events.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={() => onNavigateTab && onNavigateTab('events')}
                        className="card-konecta p-4 cursor-pointer hover:border-konecta-gold/50 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-2 text-[10px] text-konecta-gold font-bold mb-1">
                          <span>{new Date(ev.date).toLocaleDateString('pt-AO')}</span>
                          <span>·</span>
                          <span className="text-gray-400">{ev.location}</span>
                        </div>
                        <h4 className="font-bold text-sm text-konecta-navy mb-1">{ev.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-24 text-gray-400 space-y-3">
          <span className="material-symbols-outlined text-5xl text-gray-300">manage_search</span>
          <p className="text-sm">Digita pelo menos 2 letras para pesquisar em toda a rede KONECTA.</p>
        </div>
      )}

    </div>
  );
};
