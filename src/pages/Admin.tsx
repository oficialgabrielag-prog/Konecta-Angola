import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase, safeQuery, isSchemaCacheError, getFriendlyErrorMessage } from '../lib/supabase';
import { Report } from '../types';

interface AdminProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // System Metrics
  const [metrics, setMetrics] = useState({
    users: 0,
    ideas: 0,
    projects: 0,
    challenges: 0,
    communities: 0,
    events: 0,
    reports: 0
  });

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const checkAdminRole = async () => {
    setLoading(true);
    try {
      // Server-backed check on profiles.role
      const { data } = await safeQuery<any>(() => supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle());

      // Strict server database check on profiles.role
      const userRole = data?.role;
      const isAdminUser = userRole === 'admin' || (user.email === 'oficialgabrielag@gmail.com' && data?.role === 'admin');
      setIsAdmin(isAdminUser);

      if (isAdminUser) {
        fetchAdminData();
      }
    } catch (err: any) {
      console.warn('Aviso ao verificar permissão de admin:', err?.message || err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [
        usersRes,
        ideasRes,
        projectsRes,
        challengesRes,
        communitiesRes,
        eventsRes,
        reportsRes
      ] = await Promise.all([
        safeQuery<any>(() => supabase.from('profiles').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('ideas').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('projects').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('challenges').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('communities').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('events').select('id', { count: 'exact', head: true })),
        safeQuery<any>(() => supabase.from('reports').select('*').order('created_at', { ascending: false }))
      ]);

      setMetrics({
        users: usersRes?.count || 0,
        ideas: ideasRes?.count || 0,
        projects: projectsRes?.count || 0,
        challenges: challengesRes?.count || 0,
        communities: communitiesRes?.count || 0,
        events: eventsRes?.count || 0,
        reports: reportsRes?.data?.length || 0
      });

      setReports(reportsRes?.data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar dados de administração:', err?.message || err);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: 'reviewed' | 'actioned') => {
    setUpdatingReportId(reportId);
    try {
      const { error } = await safeQuery<any>(() => supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId));

      if (error && !isSchemaCacheError(error)) {
        throw error;
      }

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    } catch (err: any) {
      console.warn('Aviso ao atualizar denúncia:', err?.message || err);
      alert(getFriendlyErrorMessage(err, 'Erro ao atualizar estado da denúncia.'));
    } finally {
      setUpdatingReportId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-konecta-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto py-28 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </div>
        <h2 className="text-2xl font-black text-konecta-navy mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Esta área é reservada exclusivamente a moderadores e administradores autorizados do KONECTA.
        </p>
        <button onClick={() => onNavigateTab ? onNavigateTab('home') : onOpenAuth()} className="btn-primary w-full text-xs py-3.5">
          Voltar à Página Inicial →
        </button>
      </div>
    );
  }

  const filteredReports = reports.filter(r => {
    if (reportFilter === 'pending') return r.status === 'pending';
    if (reportFilter === 'reviewed') return r.status === 'reviewed' || r.status === 'actioned';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <span className="feature-kicker">Moderação e Governança</span>
          <h1 className="hero-title">Painel de Administração</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Estatísticas globais e central de moderação de conteúdos reportados na rede KONECTA.
          </p>
        </div>
        <span className="text-xs font-bold text-konecta-gold bg-konecta-navy px-4 py-2 rounded-full shadow-sm self-start md:self-auto">
          ● Sessão Administrador Ativa
        </span>
      </header>

      {/* Real System Metrics Grid */}
      <section className="mb-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Métricas do Ecossistema</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.users}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Inovadores</span>
          </div>
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-konecta-gold block mb-1">{metrics.ideas}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Ideias</span>
          </div>
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.projects}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Projetos</span>
          </div>
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.challenges}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Desafios</span>
          </div>
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.communities}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Comunidades</span>
          </div>
          <div className="card-konecta p-5 text-center bg-white border border-gray-100">
            <span className="text-3xl font-black text-red-600 block mb-1">{metrics.reports}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">Denúncias</span>
          </div>
        </div>
      </section>

      {/* Moderation Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">flag</span>
            Gestão de Conteúdos Reportados ({filteredReports.length})
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => setReportFilter('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'pending' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Pendentes ({reports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setReportFilter('reviewed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'reviewed' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Tratados
            </button>
            <button
              onClick={() => setReportFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'all' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">check_circle</span>
              <p className="text-gray-500 italic text-sm">Nenhuma denúncia pendente para revisão de momento.</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-konecta p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 shadow-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                      {report.target_type}
                    </span>
                    <span className="text-xs text-gray-400">ID Alvo: {report.target_id}</span>
                    <span className="text-xs text-gray-400">· {new Date(report.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                  <p className="text-sm font-semibold text-konecta-navy">
                    Motivo: <span className="font-normal text-gray-700">{report.reason}</span>
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    report.status === 'pending' ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    Estado: {report.status === 'pending' ? 'Pendente de Ação' : report.status === 'reviewed' ? 'Revisado' : 'Resolvido'}
                  </span>
                </div>

                <div className="flex gap-2 shrink-0">
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateReportStatus(report.id, 'reviewed')}
                        disabled={updatingReportId === report.id}
                        className="btn-primary py-2 px-4 text-xs"
                      >
                        Marcar Revisado
                      </button>
                      <button
                        onClick={() => handleUpdateReportStatus(report.id, 'actioned')}
                        disabled={updatingReportId === report.id}
                        className="py-2 px-4 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                      >
                        Ação Tomada
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

    </div>
  );
};
