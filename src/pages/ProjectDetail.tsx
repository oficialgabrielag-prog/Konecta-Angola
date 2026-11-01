import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectTask, Milestone, ProjectMember, ProjectUpdate, CommentItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadToCloudinary } from '../lib/cloudinary';
import { KonectaRealtimeService } from '../lib/realtime';

interface ProjectDetailProps {
  projectId: string;
  user: any;
  onOpenAuth: () => void;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  user,
  onOpenAuth,
  onBack,
  onSelectUser,
}) => {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('visao-geral');

  // Sub-data states
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Apply modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applySkills, setApplySkills] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // Forms inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  const [updateTitle, setUpdateTitle] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [publishingUpdate, setPublishingUpdate] = useState(false);

  const [discussionBody, setDiscussionBody] = useState('');
  const [publishingDiscussion, setPublishingDiscussion] = useState(false);

  // Settings
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editCover, setEditCover] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const isLeader = project?.owner_id === user?.id || project?.leader_id === user?.id;

  useEffect(() => {
    loadAllProjectData();

    // Subscribe to realtime changes on projects and its child tables
    const unsub1 = KonectaRealtimeService.subscribe('project_tasks', () => loadTasks());
    const unsub2 = KonectaRealtimeService.subscribe('project_milestones', () => loadMilestones());
    const unsub3 = KonectaRealtimeService.subscribe('project_updates', () => loadUpdates());
    const unsub4 = KonectaRealtimeService.subscribe('project_members', () => loadMembers());
    const unsub5 = KonectaRealtimeService.subscribe('project_comments', () => loadDiscussions());

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [projectId, user]);

  const loadAllProjectData = async () => {
    setLoading(true);
    try {
      const projRes = await d1Client.projects.getById(projectId);
      const projData = projRes.data?.data || projRes.data;
      if (projData) {
        setProject(projData);
        setEditTitle(projData.title);
        setEditDesc(projData.description || '');
        setEditCategory(projData.category || 'Geral');
        setEditStatus(projData.status || 'active');
        setEditCover(projData.cover_url || '');
      }

      await Promise.all([
        loadTasks(),
        loadMilestones(),
        loadMembers(),
        loadUpdates(),
        loadDiscussions(),
        loadAttachments(),
        checkFollowStatus(),
        loadApplications()
      ]);
    } catch (err) {
      console.warn('Erro ao carregar detalhes do projeto:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await d1Client.projects.getApplications(projectId);
      setApplications(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!applyMessage.trim()) return;

    setSubmittingApply(true);
    try {
      const skillsArray = applySkills.split(',').map(s => s.trim()).filter(Boolean);
      const res = await d1Client.projects.apply(projectId, {
        message: applyMessage.trim(),
        skills: skillsArray
      });
      if (res.error) throw new Error(res.error.message || 'Erro ao enviar candidatura.');
      alert('Candidatura enviada com sucesso! O líder do projeto irá analisá-la.');
      setShowApplyModal(false);
      setApplyMessage('');
      setApplySkills('');
      loadApplications();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar candidatura.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleReviewApplication = async (appId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await d1Client.projects.updateApplicationStatus(appId, status);
      if (res.success) {
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
        loadMembers();
        alert(status === 'accepted' ? 'Candidatura aceite! O colaborador foi adicionado à equipa.' : 'Candidatura rejeitada.');
      }
    } catch (e) {
      alert('Erro ao atualizar estado da candidatura.');
    }
  };

  const loadTasks = async () => {
    try {
      const res = await d1Client.projects.getTasks(projectId);
      setTasks(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadMilestones = async () => {
    try {
      const res = await d1Client.projects.getMilestones(projectId);
      setMilestones(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadMembers = async () => {
    try {
      const res = await d1Client.projects.getMembers(projectId);
      const items = res.data?.data || res.data || [];
      setMembers(items);
      if (user) {
        setIsMember(items.some((m: any) => m.user_id === user.id) || project?.owner_id === user.id);
      }
    } catch (e) {}
  };

  const loadUpdates = async () => {
    try {
      const res = await d1Client.projects.getUpdates(projectId);
      setUpdates(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadDiscussions = async () => {
    try {
      const res = await d1Client.projects.getComments(projectId);
      setDiscussions(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadAttachments = async () => {
    try {
      const res = await d1Client.projects.getAttachments(projectId);
      setAttachments(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    try {
      const following = await d1Client.projects.isFollowing(projectId);
      setIsFollowing(following);
    } catch (e) {}
  };

  const handleToggleFollow = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    await d1Client.projects.toggleFollow(projectId, !nextState);
  };

  const handleToggleMembership = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (actionLoading) return;

    setActionLoading(true);
    try {
      if (isMember && !isLeader) {
        await d1Client.projects.leave(projectId);
        setIsMember(false);
        setMembers(prev => prev.filter(m => m.user_id !== user.id));
      } else if (!isMember) {
        await d1Client.projects.join(projectId);
        setIsMember(true);
        loadMembers();
      }
    } catch (e) {
      console.warn('Erro ao atualizar participação:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;

    try {
      const res = await d1Client.projects.createTask(projectId, newTaskTitle.trim(), newTaskDesc.trim() || undefined);
      if (res.data) {
        setTasks(prev => [...prev, res.data?.data || res.data]);
        setNewTaskTitle('');
        setNewTaskDesc('');
      }
    } catch (e) {
      alert('Erro ao criar tarefa.');
    }
  };

  const handleToggleTask = async (task: ProjectTask) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await d1Client.projects.updateTask(task.id, { status: newStatus });
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await d1Client.projects.deleteTask(taskId);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader || !newMilestoneTitle.trim()) return;

    try {
      const res = await d1Client.projects.createMilestone(projectId, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        due_date: newMilestoneDate || undefined
      });
      if (res.data) {
        setMilestones(prev => [...prev, res.data?.data || res.data]);
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setNewMilestoneDate('');
      }
    } catch (e) {
      alert('Erro ao gravar marco.');
    }
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    setMilestones(prev => prev.map(m => m.id === milestone.id ? { ...m, status: newStatus } : m));
    await d1Client.projects.updateMilestone(milestone.id, { status: newStatus });
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !updateTitle.trim() || !updateBody.trim()) return;

    setPublishingUpdate(true);
    try {
      const res = await d1Client.projects.createUpdate(projectId, {
        title: updateTitle.trim(),
        body: updateBody.trim()
      });
      if (res.data) {
        setUpdates(prev => [res.data?.data || res.data, ...prev]);
        setUpdateTitle('');
        setUpdateBody('');
      }
    } catch (e) {
      alert('Erro ao publicar atualização.');
    } finally {
      setPublishingUpdate(false);
    }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !discussionBody.trim()) return;

    setPublishingDiscussion(true);
    try {
      const res = await d1Client.projects.addComment(projectId, discussionBody.trim());
      if (res.data) {
        setDiscussions(prev => [...prev, res.data?.data || res.data]);
        setDiscussionBody('');
      }
    } catch (e) {
      alert('Erro ao enviar mensagem.');
    } finally {
      setPublishingDiscussion(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader) return;

    setSavingSettings(true);
    try {
      await d1Client.projects.update(projectId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        status: editStatus,
        cover_url: editCover
      });

      setProject((prev: any) => prev ? {
        ...prev,
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        status: editStatus,
        cover_url: editCover
      } : null);

      alert('Configurações do projeto guardadas!');
    } catch (err: any) {
      alert(err.message || 'Erro ao guardar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4">
        <h2 className="text-xl font-bold text-konecta-navy mb-2">Projeto não encontrado</h2>
        <button onClick={onBack} className="btn-primary py-2 px-6 text-xs mt-4">
          Voltar aos Projetos
        </button>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral', icon: 'visibility' },
    { id: 'atualizacoes', label: 'Feed & Atualizações', icon: 'update', badge: updates.length },
    { id: 'tarefas', label: 'Tarefas', icon: 'task_alt', badge: tasks.length },
    { id: 'equipa', label: 'Equipa', icon: 'badge', badge: members.length },
    { id: 'marcos', label: 'Marcos & Metas', icon: 'flag', badge: milestones.length },
    { id: 'discussoes', label: 'Discussões', icon: 'forum', badge: discussions.length },
    ...(isLeader ? [{ id: 'candidaturas', label: 'Candidaturas', icon: 'how_to_reg', badge: applications.filter(a => a.status === 'pending').length }] : []),
    ...(isLeader ? [{ id: 'configuracoes', label: 'Configurações', icon: 'settings' }] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Voltar aos Projetos
      </button>

      {/* Hero Card */}
      <div className="card-konecta p-6 sm:p-10 shadow-sm border border-gray-100 bg-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold bg-konecta-navy/5 px-3 py-1 rounded-full border border-konecta-navy/10">
                {project.category || 'Inovação'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {project.status === 'completed' ? 'Concluído' : 'Em Execução'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-konecta-navy">{project.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  isFollowing ? 'bg-konecta-gold text-konecta-navy border-konecta-gold' : 'border-gray-200 text-gray-600 hover:border-konecta-navy'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{isFollowing ? 'done' : 'add'}</span>
                {isFollowing ? 'A Seguir' : 'Seguir'}
              </button>

              {!isMember && !isLeader && (
                <button
                  onClick={() => {
                    if (!user) onOpenAuth();
                    else setShowApplyModal(true);
                  }}
                  className="btn-gold py-2 px-4 text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">handshake</span>
                  Quero Colaborar
                </button>
              )}

              {isLeader ? (
                <span className="text-xs font-bold text-konecta-gold bg-konecta-navy px-4 py-2 rounded-xl shadow-xs">
                  Líder
                </span>
              ) : (
                <button
                  onClick={handleToggleMembership}
                  disabled={actionLoading}
                  className={`btn-primary py-2 px-4 text-xs font-bold ${
                    isMember ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : ''
                  }`}
                >
                  {actionLoading ? 'Aguarde...' : isMember ? 'Sair' : 'Aderir'}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{project.description}</p>

        {/* Progress Tracker */}
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-konecta-navy uppercase tracking-wider">Taxa de Conclusão de Tarefas</span>
            <span className="text-konecta-gold">{progressPercent}% ({completedTasks}/{tasks.length})</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-konecta-navy to-konecta-gold h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-konecta-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-konecta-gold text-konecta-navy' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'visao-geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Updates */}
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Últimas Atualizações ({updates.length})</h3>
                  <button onClick={() => setActiveTab('atualizacoes')} className="text-xs text-konecta-gold font-bold">Ver feed completo</button>
                </div>
                {updates.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">Nenhuma atualização publicada ainda.</p>
                ) : (
                  updates.slice(0, 3).map(u => (
                    <div key={u.id} className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-konecta-navy">{u.title}</span>
                        <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{u.body}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Next Milestones */}
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Metas e Marcos</h3>
                  <button onClick={() => setActiveTab('marcos')} className="text-xs text-konecta-gold font-bold">Ver todos</button>
                </div>
                {milestones.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">Sem marcos definidos.</p>
                ) : (
                  milestones.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.status === 'completed' ? 'bg-green-500' : 'bg-konecta-gold'}`} />
                        <span className="font-bold text-konecta-navy">{m.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {m.due_date ? new Date(m.due_date).toLocaleDateString('pt-AO') : 'Sem prazo'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Informações do Projeto</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Líder</span>
                    <span className="font-bold text-konecta-navy">{project.profiles?.full_name || 'Líder do Projeto'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Membros na Equipa</span>
                    <span className="font-bold text-konecta-navy">{members.length} colaboradores</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Tarefas em Curso</span>
                    <span className="font-bold text-konecta-navy">{tasks.length - completedTasks} pendentes</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Data de Fundação</span>
                    <span className="font-bold text-konecta-navy">{new Date(project.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATUALIZAÇÕES & FEED DO PROJETO */}
        {activeTab === 'atualizacoes' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {(isLeader || isMember) && (
              <form onSubmit={handleCreateUpdate} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Lançar Nova Atualização do Projeto</h4>
                <input
                  type="text"
                  required
                  placeholder="Título do marco ou avanço alcançado..."
                  value={updateTitle}
                  onChange={e => setUpdateTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Explica o que foi implementado, os próximos passos ou fotos/resultados..."
                  value={updateBody}
                  onChange={e => setUpdateBody(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy resize-none"
                />
                <button
                  type="submit"
                  disabled={publishingUpdate || !updateTitle.trim() || !updateBody.trim()}
                  className="btn-gold py-2 px-6 text-xs font-bold"
                >
                  {publishingUpdate ? 'A publicar...' : 'Publicar Atualização'}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {updates.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">update</span>
                  <p className="text-xs text-gray-400">Nenhuma atualização no feed deste projeto ainda.</p>
                </div>
              ) : (
                updates.map(u => (
                  <div key={u.id} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-konecta-navy">{u.title}</h4>
                      <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{u.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TAREFAS */}
        {activeTab === 'tarefas' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {(isLeader || isMember) && (
              <form onSubmit={handleCreateTask} className="card-konecta p-5 shadow-sm border border-gray-100 flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nova tarefa operacional (ex: Obter autorização da administração)..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="btn-primary py-2.5 px-6 text-xs font-bold shrink-0"
                >
                  Adicionar
                </button>
              </form>
            )}

            <div className="space-y-2.5">
              {tasks.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">task_alt</span>
                  <p className="text-xs text-gray-400">Nenhuma tarefa registada.</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className="card-konecta p-4 flex items-center justify-between gap-3 shadow-xs border border-gray-100"
                  >
                    <div
                      onClick={() => handleToggleTask(task)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-konecta-gold'
                      }`}>
                        {task.status === 'done' && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </div>
                      <span className={`text-xs font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-konecta-navy'}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {task.status === 'done' ? 'Feito' : 'A Fazer'}
                      </span>
                      {isLeader && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-gray-300 hover:text-red-500 p-1"
                          title="Eliminar tarefa"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EQUIPA */}
        {activeTab === 'equipa' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Membros da Equipa ({members.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map(m => (
                <div
                  key={m.id}
                  onClick={() => m.user_id && onSelectUser(m.user_id)}
                  className="card-konecta p-4 flex items-center gap-3 cursor-pointer hover:border-konecta-gold/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-sm">
                        {m.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-konecta-navy truncate">{m.profiles?.full_name || 'Colaborador'}</h4>
                    <span className="text-[10px] text-konecta-gold uppercase font-bold block">{m.user_id === project.owner_id ? 'Líder' : 'Colaborador'}</span>
                    <span className="text-[10px] text-gray-400 block">Aderiu a {new Date(m.joined_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MARCOS */}
        {activeTab === 'marcos' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {isLeader && (
              <form onSubmit={handleCreateMilestone} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Definir Novo Marco do Projeto</h4>
                <input
                  type="text"
                  required
                  placeholder="Título do marco (ex: Conclusão da fase piloto)..."
                  value={newMilestoneTitle}
                  onChange={e => setNewMilestoneTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Descrição do entregável..."
                    value={newMilestoneDesc}
                    onChange={e => setNewMilestoneDesc(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={e => setNewMilestoneDate(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMilestoneTitle.trim()}
                  className="btn-gold py-2 px-6 text-xs font-bold"
                >
                  Gravar Marco
                </button>
              </form>
            )}

            <div className="space-y-3">
              {milestones.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">flag</span>
                  <p className="text-xs text-gray-400">Nenhum marco cadastrado ainda.</p>
                </div>
              ) : (
                milestones.map(m => (
                  <div key={m.id} className="card-konecta p-5 flex items-start justify-between gap-4 border border-gray-100 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.status === 'completed' ? 'bg-green-500' : 'bg-konecta-gold'}`} />
                        <h4 className="font-bold text-xs text-konecta-navy">{m.title}</h4>
                      </div>
                      {m.description && <p className="text-xs text-gray-500 pl-4">{m.description}</p>}
                      {m.due_date && <span className="text-[10px] text-gray-400 pl-4 block">Prazo: {new Date(m.due_date).toLocaleDateString('pt-AO')}</span>}
                    </div>

                    {isLeader && (
                      <button
                        onClick={() => handleToggleMilestone(m)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          m.status === 'completed' ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-gray-600 hover:border-konecta-gold'
                        }`}
                      >
                        {m.status === 'completed' ? '✓ Concluído' : 'Marcar Concluído'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DISCUSSÕES */}
        {activeTab === 'discussoes' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <form onSubmit={handleAddDiscussion} className="card-konecta p-5 shadow-sm border border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder={user ? "Partilha uma ideia ou dúvida sobre o projeto..." : "Inicia sessão para participar da discussão..."}
                disabled={!user}
                value={discussionBody}
                onChange={e => setDiscussionBody(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
              />
              <button
                type="submit"
                disabled={!user || !discussionBody.trim() || publishingDiscussion}
                className="btn-primary py-2 px-5 text-xs font-bold"
              >
                Comentar
              </button>
            </form>

            <div className="space-y-3">
              {discussions.map(d => (
                <div key={d.id} className="card-konecta p-4 space-y-1 border border-gray-100 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-konecta-navy">{d.profiles?.full_name || 'Membro Konecta'}</span>
                    <span className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: CONFIGURAÇÕES (LÍDER) */}
        {activeTab === 'configuracoes' && isLeader && (
          <div className="max-w-2xl mx-auto card-konecta p-8 space-y-6">
            <h3 className="text-lg font-bold text-konecta-navy">Configurações do Projeto</h3>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                  Título do Projeto
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                    Estado
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="active">Em Execução</option>
                    <option value="planning">Planeamento</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary py-2.5 px-8 text-xs font-bold"
                >
                  {savingSettings ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        )}
        {/* TAB: CANDIDATURAS (LÍDER) */}
        {activeTab === 'candidaturas' && isLeader && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-konecta-navy">Candidaturas Recebidas ({applications.length})</h3>
            {applications.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">how_to_reg</span>
                <p className="text-xs text-gray-400">Ainda não há candidaturas para este projeto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => (
                  <div key={app.id} className="card-konecta p-6 space-y-4 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border">
                          {app.profiles?.avatar_url ? (
                            <img src={app.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                              {app.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-konecta-navy">{app.profiles?.full_name || 'Candidato'}</h4>
                          <span className="text-[10px] text-gray-400">Candidatou-se a {new Date(app.created_at).toLocaleDateString('pt-AO')}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {app.status === 'accepted' ? 'Aceite' : app.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                      </span>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-4 rounded-2xl text-xs">
                      <p className="font-bold text-konecta-navy">Mensagem de Apresentação:</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{app.message}</p>
                      {app.skills && app.skills.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="font-bold text-konecta-navy">Competências:</span>
                          {app.skills.map((s: string, idx: number) => (
                            <span key={idx} className="bg-konecta-navy/5 text-konecta-navy px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => handleReviewApplication(app.id, 'rejected')}
                          className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'accepted')}
                          className="btn-gold py-2 px-5 text-xs font-bold"
                        >
                          Aceitar na Equipa
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quero Colaborar Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Candidatar-se a Colaborar</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Mensagem de Apresentação e Motivação
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    placeholder="Porque queres colaborar neste projeto? Qual a tua experiência relevante?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Competências Principais (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={applySkills}
                    onChange={e => setApplySkills(e.target.value)}
                    placeholder="Ex: Gestão de Projetos, React, Comunicação, Logística"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply || !applyMessage.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {submittingApply ? 'A enviar...' : 'Submeter Candidatura'}
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
