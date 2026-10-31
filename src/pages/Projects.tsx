import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectTask, Milestone, ProjectMember } from '../types';
import { d1Client } from '../lib/d1Client';

interface ProjectsProps {
  projects: Project[];
  user: any;
  onOpenAuth: () => void;
  onRefreshProjects?: () => void;
  onSelectProject?: (projectId: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({
  projects,
  user,
  onOpenAuth,
  onRefreshProjects,
  onSelectProject,
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] || null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'members'>('tasks');
  
  // Data states
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  // New Project Modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectCategory, setProjectCategory] = useState('Educação');
  const [projectProvince, setProjectProvince] = useState('Luanda');
  const [creatingProject, setCreatingProject] = useState(false);

  // Membership action state
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      loadProjectDetails(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects]);

  const loadProjectDetails = async (projectId: string) => {
    setLoadingDetails(true);
    try {
      const [d1Tasks, d1Milestones, d1Members] = await Promise.all([
        d1Client.projects.getTasks(projectId),
        d1Client.projects.getMilestones(projectId),
        d1Client.projects.getMembers(projectId)
      ]);

      setTasks(d1Tasks.data?.data || []);
      setMilestones(d1Milestones.data?.data || []);
      setMembers(d1Members.data?.data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar detalhes do projeto:', err?.message || err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const isUserMember = members.some(m => m.user_id === user?.id) || selectedProject?.leader_id === user?.id;
  const isLeader = selectedProject?.leader_id === user?.id;

  const handleJoinProject = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!selectedProject || joining) return;

    setJoining(true);
    try {
      if (isUserMember && !isLeader) {
        await d1Client.projects.leave(selectedProject.id);
        setMembers(prev => prev.filter(m => m.user_id !== user.id));
      } else if (!isUserMember) {
        await d1Client.projects.join(selectedProject.id);
        setMembers(prev => [...prev, { 
          id: crypto.randomUUID(), 
          project_id: selectedProject.id, 
          user_id: user.id, 
          role: 'Colaborador',
          profiles: { 
            id: user.id, 
            full_name: user.user_metadata?.full_name || 'Membro Konecta', 
            avatar_url: user.user_metadata?.avatar_url, 
            province: user.user_metadata?.province 
          }
        } as any]);
      }
    } catch (err: any) {
      console.warn('Aviso ao aderir/sair do projeto:', err?.message || err);
      alert('Erro ao atualizar participação no projeto.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!newTaskTitle.trim() || !selectedProject) return;

    try {
      const res = await d1Client.projects.createTask(selectedProject.id, newTaskTitle.trim());

      if (res.data?.data) {
        setTasks(prev => [...prev, res.data!.data]);
        setNewTaskTitle('');
      } else {
        throw new Error('Falha ao criar tarefa.');
      }
    } catch (err: any) {
      console.warn('Aviso ao criar tarefa:', err?.message || err);
    }
  };

  const handleToggleTask = async (task: ProjectTask) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await d1Client.projects.updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      console.warn('Aviso ao alternar tarefa:', err?.message || err);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProject || !newMilestoneTitle.trim()) return;

    try {
      const res = await d1Client.projects.createMilestone(selectedProject.id, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        due_date: newMilestoneDate || undefined
      });

      if (res.data?.data) {
        setMilestones(prev => [...prev, res.data!.data]);
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setNewMilestoneDate('');
      }
    } catch (err: any) {
      console.warn('Aviso ao criar marco:', err?.message || err);
    }
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    try {
      await d1Client.projects.updateMilestone(milestone.id, { status: newStatus });
      setMilestones(prev => prev.map(m => m.id === milestone.id ? { ...m, status: newStatus } : m));
    } catch (err: any) {
      console.warn('Aviso ao atualizar marco:', err?.message || err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!projectTitle.trim() || !projectDesc.trim() || creatingProject) return;

    setCreatingProject(true);
    try {
      const payload = {
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        category: projectCategory,
        province: projectProvince,
        leader_id: user.id,
      };

      const res = await d1Client.projects.create(payload);
      if (res.error) {
        throw new Error(res.error.message || 'Erro ao criar projeto.');
      }

      setShowNewProjectModal(false);
      setProjectTitle('');
      setProjectDesc('');
      if (onRefreshProjects) onRefreshProjects();
    } catch (err: any) {
      console.warn('Aviso ao criar projeto:', err?.message || err);
      alert(err?.message || 'Erro ao criar projeto.');
    } finally {
      setCreatingProject(false);
    }
  };

  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Page Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="feature-kicker">Execução Colaborativa</span>
          <h1 className="hero-title">Acompanhamento de Projetos</h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Visualiza tarefas, etapas e equipas reais das iniciativas em implementação em Angola.
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowNewProjectModal(true);
          }}
          className="btn-gold whitespace-nowrap shadow-md text-xs py-3 px-6 self-start md:self-auto"
        >
          + Criar Novo Projeto
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Project List Sidebar */}
        <aside className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Iniciativas ({projects.length})
            </h3>
          </div>

          {projects.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400 italic">Nenhum projeto registado ainda.</p>
              <button 
                onClick={() => user ? setShowNewProjectModal(true) : onOpenAuth()}
                className="mt-3 text-xs font-bold text-konecta-navy hover:underline"
              >
                Começar o primeiro →
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl transition-all border ${
                  selectedProject?.id === project.id 
                    ? 'bg-konecta-navy text-white border-konecta-navy shadow-lg' 
                    : 'bg-white text-konecta-navy border-gray-100 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-konecta-gold">
                    {project.category}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {project.province || 'Angola'}
                  </span>
                </div>
                <span className="font-bold text-sm line-clamp-1 block">{project.title}</span>
                <span className="text-[11px] opacity-70 line-clamp-1 mt-1 block">
                  {project.description}
                </span>
              </button>
            ))
          )}
        </aside>

        {/* Project Detail Area */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div 
                key={selectedProject.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="card-konecta flex flex-col p-6 sm:p-10 shadow-sm border border-gray-100"
              >
                {/* Project Header Info */}
                <div className="mb-8 border-b border-gray-100 pb-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest px-3 py-1 bg-konecta-navy/5 rounded-full border border-konecta-navy/10">
                        {selectedProject.status === 'active' ? 'Em Execução' : selectedProject.status}
                      </span>
                      <span className="metadata-text">
                        <span className="material-symbols-outlined text-[16px] text-konecta-gold">location_on</span>
                        {selectedProject.province || 'Angola'}
                      </span>
                      <span className="metadata-text">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(selectedProject.created_at || '').toLocaleDateString('pt-AO')}
                      </span>
                    </div>

                    {/* Join / Leave Team Button & Full Page */}
                    <div className="flex items-center gap-2">
                      {onSelectProject && (
                        <button
                          onClick={() => onSelectProject(selectedProject.id)}
                          className="btn-gold py-2 px-4 text-xs font-bold shadow-xs flex items-center gap-1.5"
                          title="Abrir página individual do projeto com todas as abas"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          Página Completa
                        </button>
                      )}

                      {isLeader ? (
                        <span className="text-xs font-bold text-konecta-gold bg-konecta-navy px-3 py-1.5 rounded-full">
                          És o Líder
                        </span>
                      ) : (
                        <button
                          onClick={handleJoinProject}
                          disabled={joining}
                          className={`btn-primary py-2 px-5 text-xs ${isUserMember ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : ''}`}
                        >
                          {joining ? 'A processar...' : isUserMember ? 'Sair da Equipa' : 'Aderir à Equipa'}
                        </button>
                      )}
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-konecta-navy mb-4 leading-tight">
                    {selectedProject.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedProject.description}
                  </p>

                  {/* Progress Tracker */}
                  <div className="mt-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-konecta-navy uppercase tracking-wider">Progresso Geral</span>
                      <span className="text-konecta-gold">{progressPercent}% Concluído ({completedTasksCount}/{tasks.length} tarefas)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-konecta-navy to-konecta-gold h-full transition-all duration-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: Tasks / Milestones / Members */}
                <div className="flex gap-3 border-b border-gray-100 pb-4 mb-6">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'tasks' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Tarefas ({tasks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('milestones')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'milestones' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Etapas e Marcos ({milestones.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'members' ? 'bg-konecta-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Equipa ({members.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 space-y-6">
                  {loadingDetails ? (
                    <div className="py-12 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-navy"></div>
                    </div>
                  ) : activeTab === 'tasks' ? (
                    /* TASKS TAB */
                    <div className="space-y-6">
                      {tasks.length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl">
                          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">task_alt</span>
                          <p className="text-gray-500 text-sm italic">Nenhuma tarefa registada para este projeto.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => handleToggleTask(task)}
                              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer group transition-colors border border-gray-100"
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 group-hover:border-konecta-gold'}`}>
                                {task.status === 'done' && <span className="material-symbols-outlined text-[16px]">check</span>}
                              </div>
                              <span className={`text-sm font-medium flex-1 transition-all ${task.status === 'done' ? 'line-through text-gray-400' : 'text-konecta-navy'}`}>
                                {task.title}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {task.status === 'done' ? 'Concluída' : 'Pendente'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Task Form (Allowed for leader and members) */}
                      {isUserMember && (
                        <form onSubmit={handleCreateTask} className="pt-4 border-t border-gray-100 flex gap-3">
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Adicionar nova tarefa operacional..."
                            className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-konecta-navy rounded-xl px-4 py-3 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="btn-primary py-2.5 px-6 text-xs whitespace-nowrap"
                          >
                            Adicionar Tarefa
                          </button>
                        </form>
                      )}
                    </div>
                  ) : activeTab === 'milestones' ? (
                    /* MILESTONES TAB */
                    <div className="space-y-6">
                      {milestones.length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl">
                          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">flag</span>
                          <p className="text-gray-500 text-sm italic">Nenhum marco ou etapa definido ainda.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {milestones.map((m) => (
                            <div 
                              key={m.id}
                              className={`p-5 rounded-2xl border transition-all ${m.status === 'completed' ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${m.status === 'completed' ? 'bg-green-500' : 'bg-konecta-gold'}`}></span>
                                    <h4 className="font-bold text-konecta-navy text-base">{m.title}</h4>
                                  </div>
                                  {m.description && (
                                    <p className="text-xs text-gray-500 leading-relaxed pl-5">{m.description}</p>
                                  )}
                                  {m.due_date && (
                                    <p className="text-[11px] text-gray-400 pl-5 pt-1">
                                      Prazo: {new Date(m.due_date).toLocaleDateString('pt-AO')}
                                    </p>
                                  )}
                                </div>

                                {isLeader && (
                                  <button
                                    onClick={() => handleToggleMilestone(m)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${m.status === 'completed' ? 'border-green-300 text-green-700 bg-white hover:bg-green-100' : 'border-gray-300 text-gray-600 hover:border-konecta-gold'}`}
                                  >
                                    {m.status === 'completed' ? '✓ Concluído' : 'Marcar Concluído'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Milestone Form for Leader */}
                      {isLeader && (
                        <form onSubmit={handleCreateMilestone} className="p-5 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Definir Novo Marco</h4>
                          <input
                            type="text"
                            placeholder="Título do marco (ex: Conclusão do protótipo)"
                            value={newMilestoneTitle}
                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Breve descrição dos entregáveis"
                              value={newMilestoneDesc}
                              onChange={(e) => setNewMilestoneDesc(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs"
                            />
                            <input
                              type="date"
                              value={newMilestoneDate}
                              onChange={(e) => setNewMilestoneDate(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!newMilestoneTitle.trim()}
                            className="btn-gold py-2 px-5 text-xs font-bold"
                          >
                            Gravar Marco
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    /* MEMBERS TAB */
                    <div className="space-y-4">
                      {members.length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl">
                          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">group</span>
                          <p className="text-gray-500 text-sm italic">Ainda não existem membros associados a este projeto.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {members.map((member) => (
                            <div key={member.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                {member.profiles?.avatar_url ? (
                                  <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-sm">
                                    {member.profiles?.full_name?.charAt(0) || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 truncate">
                                <h4 className="font-bold text-sm text-konecta-navy truncate">
                                  {member.profiles?.full_name || 'Membro Konecta'}
                                </h4>
                                <span className="text-[10px] text-konecta-gold font-bold uppercase tracking-wider block">
                                  {member.role || 'Colaborador'}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                  {member.profiles?.province || 'Angola'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">folder_open</span>
                <p className="text-gray-500 max-w-sm mx-auto text-sm">
                  Seleciona um projeto na barra lateral para visualizar o progresso, as tarefas e a equipa.
                </p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Criar Novo Projeto Real</h3>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="text-gray-400 hover:text-konecta-navy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Nome do Projeto
                  </label>
                  <input
                    type="text"
                    required
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Ex: Reflorestamento Urbano no Cazenga"
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
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Explica os objetivos, público beneficiado e resultados esperados..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={projectCategory}
                      onChange={(e) => setProjectCategory(e.target.value)}
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
                      value={projectProvince}
                      onChange={(e) => setProjectProvince(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="Luanda">Luanda</option>
                      <option value="Benguela">Benguela</option>
                      <option value="Huambo">Huambo</option>
                      <option value="Huíla">Huíla</option>
                      <option value="Cabinda">Cabinda</option>
                      <option value="Uíge">Uíge</option>
                      <option value="Malanje">Malanje</option>
                      <option value="Namibe">Namibe</option>
                      <option value="Zaire">Zaire</option>
                      <option value="Cuanza Sul">Cuanza Sul</option>
                      <option value="Cuanza Norte">Cuanza Norte</option>
                      <option value="Bié">Bié</option>
                      <option value="Moxico">Moxico</option>
                      <option value="Cunene">Cunene</option>
                      <option value="Cuando Cubango">Cuando Cubango</option>
                      <option value="Lunda Norte">Lunda Norte</option>
                      <option value="Lunda Sul">Lunda Sul</option>
                      <option value="Bengo">Bengo</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowNewProjectModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProject || !projectTitle.trim() || !projectDesc.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {creatingProject ? 'A criar...' : 'Publicar Projeto'}
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
