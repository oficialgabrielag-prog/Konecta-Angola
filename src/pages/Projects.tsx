import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Idea, Profile as UserProfile, ProjectTask, Milestone, ProjectMember } from '../types';
import { d1Client } from '../lib/d1Client';

interface ProjectsProps {
  projects: Project[];
  user: any;
  onOpenAuth: () => void;
  onRefreshProjects?: () => void;
  onSelectProject?: (projectId: string) => void;
  onSelectIdea?: (ideaId: string) => void;
  onSelectUser?: (userId: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({
  projects,
  user,
  onOpenAuth,
  onRefreshProjects,
  onSelectProject,
  onSelectIdea,
  onSelectUser,
}) => {
  const [activeTab, setActiveTab] = useState<'descobrir' | 'ideias' | 'projetos' | 'colaboradores' | 'minhas-iniciativas'>('descobrir');

  // Data states
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [contributors, setContributors] = useState<UserProfile[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Create Initiative Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationType, setCreationType] = useState<'idea' | 'project'>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tecnologia');
  const [province, setProvince] = useState('Luanda');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab: string) => {
    setLoadingData(true);
    try {
      if (tab === 'descobrir' || tab === 'ideias') {
        const res = await d1Client.ideas.list(40);
        setIdeas(res.data?.data || res.data || []);
      }
      if (tab === 'descobrir' || tab === 'colaboradores') {
        const res = await d1Client.profiles.list(40);
        setContributors(res.data?.data || res.data || []);
      }
      if (tab === 'minhas-iniciativas' && user) {
        const res = await d1Client.projects.getMyApplications();
        setMyApplications(res.data?.data || res.data || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados da aba:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!title.trim() || !description.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (creationType === 'idea') {
        await d1Client.ideas.create({
          title: title.trim(),
          description: description.trim(),
          category,
          status: 'open'
        });
        alert('Ideia publicada com sucesso na comunidade Konecta!');
      } else {
        const res = await d1Client.projects.create({
          title: title.trim(),
          description: description.trim(),
          category
        });
        if (res.error) throw new Error(res.error.message || 'Erro ao criar projeto.');
        alert('Projeto criado com sucesso!');
        if (onRefreshProjects) onRefreshProjects();
      }

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      loadTabData(activeTab);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar iniciativa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertIdea = async (ideaId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      const res = await d1Client.projects.convertIdeaToProject(ideaId);
      if (res.error) throw new Error(res.error.message || 'Erro ao converter ideia.');
      alert('Ideia convertida em projeto com sucesso! Já podes geri-la na aba Projetos.');
      if (onRefreshProjects) onRefreshProjects();
      setActiveTab('projetos');
    } catch (err: any) {
      alert(err.message || 'Erro ao converter ideia.');
    }
  };

  // Filter logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesProv = selectedProvince === 'all' || p.province === selectedProvince;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesCat && matchesProv && matchesStatus;
  });

  const filteredIdeas = ideas.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || i.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-8">
      
      {/* Header & Criar Iniciativa Button */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <span className="feature-kicker">Inovação e Empreendedorismo</span>
          <h1 className="hero-title">Projetos & Ideias Konecta</h1>
          <p className="text-gray-500 mt-2 max-w-xl text-sm">
            Descobre iniciativas transformadoras em Angola, apoia ideias inovadoras, junta-te a equipas e colabora na construção do futuro.
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowCreateModal(true);
          }}
          className="btn-gold py-3 px-6 text-xs font-bold shadow-md flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          + Criar Iniciativa
        </button>
      </header>

      {/* 5 Required Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {[
          { id: 'descobrir', label: 'Descobrir', icon: 'explore' },
          { id: 'ideias', label: 'Ideias', icon: 'lightbulb', badge: ideas.length },
          { id: 'projetos', label: 'Projetos', icon: 'folder_open', badge: projects.length },
          { id: 'colaboradores', label: 'Colaboradores', icon: 'group', badge: contributors.length },
          { id: 'minhas-iniciativas', label: 'Minhas Iniciativas', icon: 'person_pin' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-konecta-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-konecta-gold text-konecta-navy font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="card-konecta p-4 sm:p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar projetos, ideias ou competências..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-xs text-konecta-navy outline-none focus:ring-1 focus:ring-konecta-navy"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-konecta-navy outline-none"
          >
            <option value="all">Todas as Categorias</option>
            <option value="Educação">Educação</option>
            <option value="Tecnologia">Tecnologia</option>
            <option value="Sustentabilidade">Sustentabilidade</option>
            <option value="Saúde Comunitária">Saúde Comunitária</option>
            <option value="Empreendedorismo">Empreendedorismo</option>
            <option value="Cultura e Artes">Cultura e Artes</option>
          </select>

          {activeTab === 'projetos' && (
            <>
              <select
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-konecta-navy outline-none"
              >
                <option value="all">Todas as Províncias</option>
                <option value="Luanda">Luanda</option>
                <option value="Benguela">Benguela</option>
                <option value="Huambo">Huambo</option>
                <option value="Huíla">Huíla</option>
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-konecta-navy outline-none"
              >
                <option value="all">Todos os Estados</option>
                <option value="active">Em Execução</option>
                <option value="planning">Planeamento</option>
                <option value="completed">Concluído</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* TAB CONTENTS */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: DESCOBRIR */}
        {activeTab === 'descobrir' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
            {/* Featured Projects Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-konecta-navy uppercase tracking-wider">Projetos em Destaque</h3>
                <button onClick={() => setActiveTab('projetos')} className="text-xs text-konecta-gold font-bold hover:underline">Ver todos →</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 3).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject && onSelectProject(proj.id)}
                    className="card-konecta p-6 shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-konecta-gold transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest bg-konecta-navy/5 px-3 py-1 rounded-full">
                          {proj.category || 'Inovação'}
                        </span>
                        <span className="text-[10px] text-gray-400">{proj.province || 'Angola'}</span>
                      </div>
                      <h4 className="font-extrabold text-base text-konecta-navy group-hover:text-konecta-gold transition-colors">{proj.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{proj.description}</p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-50 flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-400">{(proj as any).members_count || 1} membros</span>
                      <span className="text-konecta-navy flex items-center gap-1">Ver Workspace →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Ideas Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-konecta-navy uppercase tracking-wider">Ideias Populares</h3>
                <button onClick={() => setActiveTab('ideias')} className="text-xs text-konecta-gold font-bold hover:underline">Ver todas →</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.slice(0, 3).map(idea => (
                  <div
                    key={idea.id}
                    className="card-konecta p-6 shadow-sm border border-gray-100 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest bg-konecta-navy/5 px-3 py-1 rounded-full">
                          {idea.category || 'Inovação'}
                        </span>
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          {idea.votes_count || 0} Apoios
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-konecta-navy">{idea.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{idea.description}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <button
                        onClick={() => handleConvertIdea(idea.id)}
                        className="btn-gold py-1.5 px-3 text-[11px] font-bold"
                      >
                        Converter em Projeto
                      </button>
                      <button
                        onClick={() => onSelectIdea && onSelectIdea(idea.id)}
                        className="text-xs font-bold text-konecta-navy hover:underline"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: IDEIAS */}
        {activeTab === 'ideias' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Banco de Ideias ({filteredIdeas.length})</h3>
              <button
                onClick={() => { setCreationType('idea'); setShowCreateModal(true); }}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                + Publicar Ideia
              </button>
            </div>

            {loadingData ? (
              <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-navy"></div></div>
            ) : filteredIdeas.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">lightbulb</span>
                <p className="text-xs text-gray-400">Nenhuma ideia encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIdeas.map(idea => (
                  <div key={idea.id} className="card-konecta p-6 shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest bg-konecta-navy/5 px-3 py-1 rounded-full">
                          {idea.category || 'Inovação'}
                        </span>
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          {idea.votes_count || 0} Apoios
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-konecta-navy">{idea.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{idea.description}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <button
                        onClick={() => handleConvertIdea(idea.id)}
                        className="btn-gold py-1.5 px-3 text-[11px] font-bold"
                      >
                        Converter em Projeto
                      </button>
                      <button
                        onClick={() => onSelectIdea && onSelectIdea(idea.id)}
                        className="text-xs font-bold text-konecta-navy hover:underline"
                      >
                        Ver Ideia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: PROJETOS */}
        {activeTab === 'projetos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Projetos Ativos em Angola ({filteredProjects.length})</h3>
              <button
                onClick={() => { setCreationType('project'); setShowCreateModal(true); }}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                + Criar Projeto
              </button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">folder_open</span>
                <p className="text-xs text-gray-400">Nenhum projeto encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject && onSelectProject(proj.id)}
                    className="card-konecta p-6 shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-konecta-gold transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest bg-konecta-navy/5 px-3 py-1 rounded-full">
                          {proj.category || 'Geral'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          proj.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {proj.status === 'completed' ? 'Concluído' : 'Em Execução'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-konecta-navy group-hover:text-konecta-gold transition-colors">{proj.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{proj.description}</p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-50 flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-400">{proj.province || 'Angola'}</span>
                      <span className="text-konecta-navy">Abrir Workspace →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: COLABORADORES */}
        {activeTab === 'colaboradores' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Inovadores e Especialistas ({contributors.length})</h3>
            {loadingData ? (
              <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-navy"></div></div>
            ) : contributors.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400">Nenhum colaborador encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {contributors.map(profile => (
                  <div
                    key={profile.id || (profile as any).user_id}
                    onClick={() => onSelectUser && onSelectUser(profile.id || (profile as any).user_id)}
                    className="card-konecta p-6 text-center space-y-4 cursor-pointer hover:border-konecta-gold transition-all"
                  >
                    <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden mx-auto border-2 border-konecta-gold">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-gray-400 text-xl">
                          {(profile.full_name || (profile as any).display_name)?.charAt(0) || 'K'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-konecta-navy">{profile.full_name || (profile as any).display_name}</h4>
                      <span className="text-[11px] text-konecta-gold font-bold uppercase tracking-wider block mt-0.5">
                        {profile.province || 'Luanda, Angola'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{profile.bio || 'Membro da comunidade Konecta Angola.'}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: MINHAS INICIATIVAS */}
        {activeTab === 'minhas-iniciativas' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            {!user ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200 space-y-4">
                <p className="text-xs text-gray-500">Inicia sessão para consultar as tuas ideias, projetos e candidaturas.</p>
                <button onClick={onOpenAuth} className="btn-primary py-2 px-6 text-xs font-bold">Iniciar Sessão</button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* My Projects */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Os Meus Projetos Liderados</h3>
                  {projects.filter(p => (p as any).owner_id === user.id || p.leader_id === user.id).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Ainda não criaste nenhum projeto.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.filter(p => (p as any).owner_id === user.id || p.leader_id === user.id).map(proj => (
                        <div
                          key={proj.id}
                          onClick={() => onSelectProject && onSelectProject(proj.id)}
                          className="card-konecta p-5 flex items-center justify-between cursor-pointer hover:border-konecta-gold"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-konecta-navy">{proj.title}</h4>
                            <span className="text-[10px] text-konecta-gold uppercase font-bold">{proj.category}</span>
                          </div>
                          <span className="text-xs font-bold text-konecta-navy">Gerir Workspace →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Applications */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Minhas Candidaturas de Colaboração</h3>
                  {myApplications.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Ainda não submeteste nenhuma candidatura a projetos.</p>
                  ) : (
                    <div className="space-y-3">
                      {myApplications.map(app => (
                        <div key={app.id} className="card-konecta p-5 flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-konecta-navy">{app.projects?.title || 'Projeto Konecta'}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{app.message}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                            app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {app.status === 'accepted' ? 'Aceite' : app.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Create Initiative Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Criar Nova Iniciativa Konecta</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCreationType('idea')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${creationType === 'idea' ? 'bg-konecta-navy text-white shadow-xs' : 'text-gray-600'}`}
                >
                  Ideia Inovadora
                </button>
                <button
                  type="button"
                  onClick={() => setCreationType('project')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${creationType === 'project' ? 'bg-konecta-navy text-white shadow-xs' : 'text-gray-600'}`}
                >
                  Projeto Real
                </button>
              </div>

              <form onSubmit={handleCreateInitiative} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Título da {creationType === 'idea' ? 'Ideia' : 'Projeto'}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={creationType === 'idea' ? 'Ex: Plataforma de Reciclagem Inteligente' : 'Ex: Reflorestamento Urbano em Luanda'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Descrição Detalhada
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descreve o problema, solução e objetivos principais..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="Educação">Educação</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Sustentabilidade">Sustentabilidade</option>
                      <option value="Saúde Comunitária">Saúde Comunitária</option>
                      <option value="Empreendedorismo">Empreendedorismo</option>
                      <option value="Cultura e Artes">Cultura e Artes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Província
                    </label>
                    <select
                      value={province}
                      onChange={e => setProvince(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="Luanda">Luanda</option>
                      <option value="Benguela">Benguela</option>
                      <option value="Huambo">Huambo</option>
                      <option value="Huíla">Huíla</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !description.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {submitting ? 'A publicar...' : `Publicar ${creationType === 'idea' ? 'Ideia' : 'Projeto'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
