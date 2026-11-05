import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { Report } from '../types';
import { MusicManager } from '../components/MusicManager';
import { useT } from '../i18n/LanguageContext';
import { useToast } from '../context/UIContext';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  CreditCard,
  FileText,
  ExternalLink,
  Plus,
  Loader2,
  Eye,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Star,
  Check,
  RefreshCw
} from 'lucide-react';

interface AdminProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const t = useT();
  const { showToast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'metrics' | 'reports' | 'music' | 'verification_plans'>('verification_plans');

  // Sub-tabs for "Verificação e Planos"
  const [verifSubTab, setVerifSubTab] = useState<'personal' | 'org' | 'sub_requests' | 'plans_mgmt' | 'active_subs'>('personal');

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
  const [moderationQueue, setModerationQueue] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  // Verification & Subscriptions state
  const [verificationRequests, setVerificationRequests] = useState<{ profiles: any[]; organizations: any[] }>({
    profiles: [],
    organizations: []
  });
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loadingVerifData, setLoadingVerifData] = useState(false);

  // Inspector modal state
  const [inspectItem, setInspectItem] = useState<{
    type: 'profile' | 'organization' | 'subscription';
    data: any;
  } | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingSignedUrl, setLoadingSignedUrl] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Admin Plan Management Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planFormName, setPlanFormName] = useState('');
  const [planFormDesc, setPlanFormDesc] = useState('');
  const [planFormPrice, setPlanFormPrice] = useState('15000');
  const [planFormDuration, setPlanFormDuration] = useState('30');
  const [planFormBenefits, setPlanFormBenefits] = useState('');
  const [planFormLimits, setPlanFormLimits] = useState('');
  const [planFormFeatured, setPlanFormFeatured] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

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
      const isEmailAdmin = user?.email === 'oficialgabrielag@gmail.com' || user?.email === 'officialgabrielag@gmail.com';
      const isAdminUser = isEmailAdmin || (await d1Client.isAdmin());
      setIsAdmin(isAdminUser);

      if (isAdminUser) {
        fetchAllAdminData();
      }
    } catch (err: any) {
      console.warn('Aviso ao verificar permissão de admin:', err?.message || err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAdminData = async () => {
    setLoadingVerifData(true);
    try {
      const [metricsRes, reportsRes, verifRes, subRes, plansRes, activeSubsRes, modRes] = await Promise.all([
        d1Client.admin.getMetrics(),
        d1Client.reports.list(),
        d1Client.verification.listVerificationRequests(),
        d1Client.subscriptions.listSubscriptionRequests(),
        d1Client.subscriptions.listPlans(true), // include inactive
        d1Client.subscriptions.listUserSubscriptions(),
        d1Client.admin.getModerationQueue()
      ]);

      if (metricsRes.data?.data) setMetrics(metricsRes.data.data);
      if (reportsRes.data?.data) setReports(reportsRes.data.data);
      if (verifRes.data) setVerificationRequests(verifRes.data);
      if (subRes.data) setSubscriptionRequests(subRes.data);
      if (plansRes.data) setAllPlans(plansRes.data);
      if (activeSubsRes.data) setActiveSubscriptions(activeSubsRes.data);
      if (modRes.data) setModerationQueue(modRes.data);
    } catch (err: any) {
      console.warn('Aviso ao carregar dados de administração:', err?.message || err);
    } finally {
      setLoadingVerifData(false);
    }
  };

  const handleModerationAction = async (queueId: string, action: 'approve' | 'block') => {
    try {
      await d1Client.admin.takeModerationAction(queueId, action, 'Ação administrativa rápida');
      setModerationQueue(prev => prev.filter(item => item.id !== queueId));
      showToast('Ação de moderação executada.', 'success');
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error');
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: 'reviewed' | 'actioned') => {
    setUpdatingReportId(reportId);
    try {
      await d1Client.reports.update(reportId, { status: newStatus });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      showToast('Estado da denúncia atualizado com sucesso.', 'success');
    } catch (err: any) {
      console.warn('Aviso ao atualizar denúncia:', err?.message || err);
      alert(err?.message || t('admin.update_err'));
    } finally {
      setUpdatingReportId(null);
    }
  };

  // Resolve signed URL from private bucket
  const getOrFetchSignedUrl = async (path: string): Promise<string> => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (signedUrls[path]) return signedUrls[path];

    setLoadingSignedUrl(path);
    try {
      const signed = await d1Client.storage.getSignedDocumentUrl(path);
      setSignedUrls(prev => ({ ...prev, [path]: signed }));
      return signed;
    } finally {
      setLoadingSignedUrl(null);
    }
  };

  const handleOpenDoc = async (path: string) => {
    const url = await getOrFetchSignedUrl(path);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Documento não encontrado ou indisponível.', 'error');
    }
  };

  const parseEvidenceMeta = (evidenceUrl: string) => {
    if (!evidenceUrl) return {};
    try {
      return JSON.parse(evidenceUrl);
    } catch {
      return { raw: evidenceUrl };
    }
  };

  const handleReviewVerification = async (decision: 'approved' | 'rejected') => {
    if (!inspectItem) return;
    setProcessingReview(true);
    try {
      const targetType = inspectItem.type === 'profile' ? 'profile' : 'organization';
      const requestId = inspectItem.data.id;
      const targetId = inspectItem.data.user_id || inspectItem.data.organization_id;

      const res = await d1Client.verification.reviewVerification(
        requestId,
        targetType,
        decision,
        reviewNote,
        targetId
      );

      if (res.error) {
        throw new Error(typeof res.error === 'string' ? res.error : res.error.message || 'Erro ao processar revisão.');
      }

      showToast(`Pedido ${decision === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`, 'success');
      setInspectItem(null);
      setReviewNote('');
      fetchAllAdminData();
    } catch (e: any) {
      console.error(e);
      showToast('Erro: ' + (e.message || e), 'error');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleReviewSubscription = async (decision: 'approved' | 'rejected') => {
    if (!inspectItem || inspectItem.type !== 'subscription') return;
    setProcessingReview(true);
    try {
      const requestId = inspectItem.data.id;
      const planId = inspectItem.data.plan_id;
      const userId = inspectItem.data.user_id;

      const res = await d1Client.subscriptions.reviewSubscriptionRequest(
        requestId,
        decision,
        reviewNote,
        planId,
        userId,
        inspectItem.data.subscription_plans?.duration_days || 30
      );

      if (res.error) {
        throw new Error(typeof res.error === 'string' ? res.error : res.error.message || 'Erro ao processar subscrição.');
      }

      showToast(`Subscrição ${decision === 'approved' ? 'aprovada e ativada' : 'rejeitada'} com sucesso!`, 'success');
      setInspectItem(null);
      setReviewNote('');
      fetchAllAdminData();
    } catch (e: any) {
      console.error(e);
      showToast('Erro: ' + (e.message || e), 'error');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleTogglePlan = async (planId: string, currentActive: boolean) => {
    try {
      await d1Client.subscriptions.togglePlanActive(planId, !currentActive);
      showToast(`Plano ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showToast('Erro ao alterar estado do plano: ' + err.message, 'error');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormName.trim() || !planFormPrice) {
      showToast('Preencha os campos obrigatórios do plano.', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const benefitsArr = planFormBenefits.split('\n').map(b => b.trim()).filter(Boolean);

      if (editingPlanId) {
        await d1Client.subscriptions.updatePlan(editingPlanId, {
          name: planFormName.trim(),
          description: planFormDesc.trim(),
          price_amount: Number(planFormPrice),
          duration_days: Number(planFormDuration) || 30,
          benefits: benefitsArr,
          is_recommended: planFormFeatured
        });
        showToast('Plano atualizado com sucesso!', 'success');
      } else {
        await d1Client.subscriptions.createPlan({
          name: planFormName.trim(),
          description: planFormDesc.trim(),
          price_amount: Number(planFormPrice),
          currency: 'Kz',
          duration_days: Number(planFormDuration) || 30,
          benefits: benefitsArr,
          limits: planFormLimits.trim() || undefined,
          is_recommended: planFormFeatured,
          is_active: true
        });
        showToast('Novo plano criado com sucesso!', 'success');
      }

      setShowPlanModal(false);
      setEditingPlanId(null);
      setPlanFormName('');
      setPlanFormDesc('');
      setPlanFormPrice('15000');
      fetchAllAdminData();
    } catch (err: any) {
      showToast('Erro ao guardar plano: ' + err.message, 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const openEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanFormName(plan.name || '');
    setPlanFormDesc(plan.description || '');
    setPlanFormPrice(String(plan.price_amount || 0));
    setPlanFormDuration(String(plan.duration_days || 30));
    setPlanFormBenefits(Array.isArray(plan.benefits) ? plan.benefits.join('\n') : '');
    setPlanFormLimits('');
    setPlanFormFeatured(Boolean(plan.is_recommended));
    setShowPlanModal(true);
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
        <h2 className="text-2xl font-black text-konecta-navy mb-2">{t('admin.access_restricted')}</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          {t('admin.access_restricted_desc')}
        </p>
        <button onClick={() => onNavigateTab ? onNavigateTab('home') : onOpenAuth()} className="btn-primary w-full text-xs py-3.5">
          {t('admin.back_home')} →
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-16 space-y-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-[0.2em]">{t('admin.kicker')}</span>
          <h1 className="hero-title">{t('nav.admin')}</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Painel Central de Controlo, Moderação, Verificações e Planos de Subscrição do KONECTA Angola.
          </p>
        </div>

        <div className="flex flex-wrap bg-gray-100 p-1 rounded-2xl self-start md:self-auto gap-1">
          <button
            onClick={() => setActiveTab('verification_plans')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'verification_plans' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={14} className="text-konecta-gold" /> Verificação e Planos
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'metrics' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('admin.tab_metrics')}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'reports' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('admin.tab_reports')} ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'music' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Music Library
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'moderation' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Moderação
          </button>
        </div>
      </header>
      
      {/* SECTION: MODERAÇÃO */}
      {activeTab === 'moderation' && (
        <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs">
          <h3 className="text-lg font-bold text-konecta-navy mb-6">Fila de Moderação ({moderationQueue.length})</h3>
          <div className="space-y-4">
            {moderationQueue.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum conteúdo pendente na fila de moderação.</p>
            ) : (
              moderationQueue.map((item: any) => (
                <div key={item.id} className="p-5 border border-gray-100 rounded-2xl flex justify-between items-center bg-gray-50">
                  <div>
                    <p className="text-xs font-bold text-konecta-navy uppercase">{item.content_type}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {item.content_id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Motivo: {item.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleModerationAction(item.id, 'approve')} className="btn-primary py-1.5 px-4 text-xs font-bold">Aprovar</button>
                    <button onClick={() => handleModerationAction(item.id, 'block')} className="btn-secondary py-1.5 px-4 text-xs font-bold">Bloquear</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* SECTION: VERIFICAÇÃO E PLANOS */}
      {activeTab === 'verification_plans' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setVerifSubTab('personal')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  verifSubTab === 'personal' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User size={13} />
                Verificação Pessoal ({verificationRequests.profiles.length})
              </button>
              <button
                onClick={() => setVerifSubTab('org')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  verifSubTab === 'org' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Building size={13} />
                Verificação Organizações ({verificationRequests.organizations.length})
              </button>
              <button
                onClick={() => setVerifSubTab('sub_requests')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  verifSubTab === 'sub_requests' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText size={13} />
                Pedidos de Subscrição ({subscriptionRequests.length})
              </button>
              <button
                onClick={() => setVerifSubTab('plans_mgmt')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  verifSubTab === 'plans_mgmt' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Star size={13} />
                Gestão de Planos ({allPlans.length})
              </button>
              <button
                onClick={() => setVerifSubTab('active_subs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  verifSubTab === 'active_subs' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CreditCard size={13} />
                Subscrições Ativas ({activeSubscriptions.length})
              </button>
            </div>

            <button
              onClick={fetchAllAdminData}
              disabled={loadingVerifData}
              className="text-xs font-bold text-konecta-navy hover:text-konecta-gold flex items-center gap-1 shrink-0 self-end sm:self-auto"
            >
              <RefreshCw size={13} className={loadingVerifData ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          {loadingVerifData ? (
            <div className="py-16 text-center">
              <Loader2 className="animate-spin mx-auto text-konecta-navy" size={24} />
              <p className="text-xs text-gray-400 mt-2">A carregar dados...</p>
            </div>
          ) : (
            <>
              {/* SUBTAB 1: Verificação Pessoal */}
              {verifSubTab === 'personal' && (
                <div className="space-y-4">
                  {verificationRequests.profiles.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">Nenhum pedido de verificação pessoal submetido.</p>
                    </div>
                  ) : (
                    verificationRequests.profiles.map((req: any) => {
                      const meta = parseEvidenceMeta(req.evidence_url);
                      return (
                        <div key={req.id} className="card-konecta p-5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-konecta-navy">
                                {meta.full_name || req.profiles?.display_name || req.profiles?.full_name || 'Utilizador'}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({meta.account_handle || `@${req.profiles?.username || 'user'}`})
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Documento: {meta.id_type || 'BI'} nº {meta.id_number || '-'} · País: {meta.country || 'Angola'} · Taxa: {req.price_amount} {req.currency}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Submetido em: {new Date(req.created_at).toLocaleString('pt-AO')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setInspectItem({ type: 'profile', data: req });
                                setReviewNote('');
                              }}
                              className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                            >
                              <Eye size={13} /> Inspecionar & Rever
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* SUBTAB 2: Verificação Organizações */}
              {verifSubTab === 'org' && (
                <div className="space-y-4">
                  {verificationRequests.organizations.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">Nenhum pedido de verificação institucional de organização.</p>
                    </div>
                  ) : (
                    verificationRequests.organizations.map((req: any) => {
                      const meta = parseEvidenceMeta(req.evidence_url);
                      return (
                        <div key={req.id} className="card-konecta p-5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-konecta-navy">
                                {meta.organization_name || req.organizations?.name || 'Organização'}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({meta.commercial_name || req.organizations?.name})
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              NIF: {meta.nif || 'N/A'} · Local: {meta.municipality || 'Luanda'} · Taxa: {req.price_amount} {req.currency}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Submetido em: {new Date(req.created_at).toLocaleString('pt-AO')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setInspectItem({ type: 'organization', data: req });
                                setReviewNote('');
                              }}
                              className="btn-gold py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                            >
                              <Eye size={13} /> Inspecionar & Rever
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* SUBTAB 3: Pedidos de Subscrição */}
              {verifSubTab === 'sub_requests' && (
                <div className="space-y-4">
                  {subscriptionRequests.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">Nenhum pedido de subscrição de plano submetido.</p>
                    </div>
                  ) : (
                    subscriptionRequests.map((req: any) => (
                      <div key={req.id} className="card-konecta p-5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-konecta-navy">
                              {req.profiles?.display_name || req.profiles?.full_name || 'Utilizador'}
                            </span>
                            <span className="text-xs font-bold text-konecta-gold">
                              → Plano {req.subscription_plans?.name || 'Konecta'}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'awaiting_proof' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'pending_review' ? 'bg-blue-100 text-blue-800' :
                              req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Método: {req.payment_method || 'Transferência'} · Ref: {req.payment_reference || '-'} · Valor: {req.subscription_plans?.price_amount ? Number(req.subscription_plans.price_amount).toLocaleString('pt-AO') : '-'} Kz
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Submetido em: {new Date(req.created_at).toLocaleString('pt-AO')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setInspectItem({ type: 'subscription', data: req });
                              setReviewNote('');
                            }}
                            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Eye size={13} /> Analisar Comprovativo
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 4: Gestão de Planos */}
              {verifSubTab === 'plans_mgmt' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Crie, edite preços, ative ou desative planos de subscrição que aparecem aos utilizadores.
                    </p>
                    <button
                      onClick={() => {
                        setEditingPlanId(null);
                        setPlanFormName('');
                        setPlanFormDesc('');
                        setPlanFormPrice('15000');
                        setPlanFormDuration('30');
                        setPlanFormBenefits('Acesso total à comunidade\nSelo de Membro Pro\nCriação de projetos');
                        setPlanFormLimits('');
                        setPlanFormFeatured(false);
                        setShowPlanModal(true);
                      }}
                      className="btn-gold py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Criar Novo Plano
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`bg-white rounded-2xl p-5 border shadow-xs space-y-4 flex flex-col justify-between ${
                          plan.is_active ? 'border-gray-200' : 'border-gray-200/50 bg-gray-50/50 opacity-75'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              {plan.is_recommended && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                                  <Star size={10} fill="currentColor" /> Destaque
                                </span>
                              )}
                              <h4 className="font-bold text-base text-konecta-navy">{plan.name}</h4>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              plan.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {plan.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>

                          <div className="text-2xl font-black text-konecta-navy">
                            {Number(plan.price_amount).toLocaleString('pt-AO')} {plan.currency || 'Kz'}
                            <span className="text-xs text-gray-400 font-normal"> / {plan.duration_days || 30} dias</span>
                          </div>

                          {plan.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{plan.description}</p>
                          )}

                          <ul className="text-[11px] text-gray-600 space-y-1">
                            {(plan.benefits || []).slice(0, 3).map((b: string, i: number) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <Check size={12} className="text-emerald-500" />
                                <span className="truncate">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => openEditPlan(plan)}
                            className="btn-secondary py-1.5 px-3 text-xs flex-1 flex items-center justify-center gap-1"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                          <button
                            onClick={() => handleTogglePlan(plan.id, plan.is_active)}
                            className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-colors ${
                              plan.is_active
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {plan.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 5: Subscrições Ativas */}
              {verifSubTab === 'active_subs' && (
                <div className="space-y-4">
                  {activeSubscriptions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">Nenhuma subscrição ativa registada no sistema.</p>
                    </div>
                  ) : (
                    activeSubscriptions.map((sub: any) => (
                      <div key={sub.id} className="card-konecta p-5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-konecta-navy">
                              {sub.profiles?.display_name || sub.profiles?.full_name || sub.user_id}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {sub.subscription_plans?.name || 'Plano Ativo'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Início: {new Date(sub.started_at || sub.created_at).toLocaleDateString('pt-AO')} · Estado: {sub.status}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} /> Ativo
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* METRICS SECTION */}
      {activeTab === 'metrics' && (
        <section className="mb-12">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-4">{t('admin.ecosystem_metrics')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card-konecta p-5 text-center bg-white border border-gray-100">
              <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.users}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('admin.innovators')}</span>
            </div>
            <div className="card-konecta p-5 text-center bg-white border border-gray-100">
              <span className="text-3xl font-black text-konecta-gold block mb-1">{metrics.ideas}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('create.idea')}</span>
            </div>
            <div className="card-konecta p-5 text-center bg-white border border-gray-100">
              <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.projects}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('nav.projects')}</span>
            </div>
            <div className="card-konecta p-5 text-center bg-white border border-gray-100">
              <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.challenges}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('nav.challenges')}</span>
            </div>
            <div className="card-konecta p-5 text-center bg-white border border-gray-100">
              <span className="text-3xl font-black text-konecta-navy block mb-1">{metrics.communities}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('nav.communities')}</span>
            </div>
            <div
              onClick={() => setActiveTab('reports')}
              className="card-konecta p-5 text-center bg-white border border-gray-100 cursor-pointer hover:border-red-200 transition-colors"
            >
              <span className="text-3xl font-black text-red-600 block mb-1">{metrics.reports}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-400">{t('admin.tab_reports')}</span>
            </div>
          </div>
        </section>
      )}

      {/* REPORTS SECTION */}
      {activeTab === 'reports' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">flag</span>
              {t('admin.reports_management')} ({filteredReports.length})
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => setReportFilter('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  reportFilter === 'pending' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t('admin.pending')} ({reports.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setReportFilter('reviewed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  reportFilter === 'reviewed' ? 'bg-konecta-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t('admin.actioned')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">check_circle</span>
                <p className="text-gray-500 italic text-sm">{t('admin.reports_empty')}</p>
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
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-700">
                        {report.target_type}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {report.target_id}</span>
                      <span className="text-xs text-gray-400">· {new Date(report.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                    <p className="text-sm font-semibold text-konecta-navy">
                      {t('admin.reason')}: <span className="font-normal text-gray-700">{report.reason}</span>
                    </p>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      report.status === 'pending' ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {t('admin.status')}: {report.status === 'pending' ? t('admin.pending_action') : report.status === 'reviewed' ? t('admin.reviewed') : t('admin.actioned_status')}
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
                          {t('admin.mark_reviewed')}
                        </button>
                        <button
                          onClick={() => handleUpdateReportStatus(report.id, 'actioned')}
                          disabled={updatingReportId === report.id}
                          className="py-2 px-4 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                        >
                          {t('admin.take_action')}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      )}

      {/* MUSIC SECTION */}
      {activeTab === 'music' && (
        <section>
          <MusicManager user={user} />
        </section>
      )}

      {/* MODAL: INSPECTOR & REVIEW WITH TEMPORARY SIGNED URLS */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-gray-100 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-konecta-gold tracking-wider">
                  Inspeção Oficial de Pedido
                </span>
                <h3 className="text-xl font-bold text-konecta-navy">
                  {inspectItem.type === 'profile'
                    ? 'Verificação de Perfil Pessoal'
                    : inspectItem.type === 'organization'
                    ? 'Verificação de Organização'
                    : 'Subscrição de Plano'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xs"
              >
                Fechar
              </button>
            </div>

            {/* Conteúdo do Pedido */}
            <div className="space-y-4 text-xs">
              {inspectItem.type === 'profile' && (() => {
                const meta = parseEvidenceMeta(inspectItem.data.evidence_url);
                return (
                  <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome Completo</span>
                        <span className="font-bold text-gray-900">{meta.full_name || inspectItem.data.profiles?.full_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome da Conta (Handle)</span>
                        <span className="font-bold text-gray-900">{meta.account_handle || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Documento</span>
                        <span className="text-gray-800">{meta.id_type || 'BI'} nº {meta.id_number || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">País</span>
                        <span className="text-gray-800">{meta.country || 'Angola'}</span>
                      </div>
                    </div>

                    {meta.reason && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Justificação</span>
                        <p className="text-gray-700 leading-relaxed mt-0.5">{meta.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {inspectItem.type === 'organization' && (() => {
                const meta = parseEvidenceMeta(inspectItem.data.evidence_url);
                return (
                  <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome Oficial</span>
                        <span className="font-bold text-gray-900">{meta.organization_name || inspectItem.data.organizations?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome Comercial</span>
                        <span className="font-bold text-gray-900">{meta.commercial_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">NIF</span>
                        <span className="text-gray-800">{meta.nif || 'Não aplicável'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Município / País</span>
                        <span className="text-gray-800">{meta.municipality || '-'} ({meta.country || 'Angola'})</span>
                      </div>
                    </div>

                    {meta.description && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[10px]">Descrição da Atividade</span>
                        <p className="text-gray-700 leading-relaxed mt-0.5">{meta.description}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {inspectItem.type === 'subscription' && (
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-400 font-bold block uppercase text-[10px]">Utilizador</span>
                      <span className="font-bold text-gray-900">
                        {inspectItem.data.profiles?.display_name || inspectItem.data.profiles?.full_name || inspectItem.data.user_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block uppercase text-[10px]">Plano Solicitado</span>
                      <span className="font-bold text-konecta-gold">{inspectItem.data.subscription_plans?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block uppercase text-[10px]">Valor do Plano</span>
                      <span className="text-gray-800">
                        {inspectItem.data.subscription_plans?.price_amount ? Number(inspectItem.data.subscription_plans.price_amount).toLocaleString('pt-AO') : '-'} Kz
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block uppercase text-[10px]">Referência Bancária</span>
                      <span className="font-mono text-gray-800">{inspectItem.data.payment_reference || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documentos & Comprovativos Anexados com URLs temporários assinados */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  Documentos Enviados no Arquivo Privado:
                </span>
                <div className="grid sm:grid-cols-2 gap-2">
                  {/* Comprovativo de pagamento */}
                  {inspectItem.data.proof_path && (
                    <button
                      type="button"
                      onClick={() => handleOpenDoc(inspectItem.data.proof_path)}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-colors flex items-center justify-between text-left text-xs font-bold text-amber-950"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-700" /> Comprovativo de Pagamento
                      </span>
                      <ExternalLink size={13} className="text-amber-700" />
                    </button>
                  )}

                  {/* Documentos do perfil */}
                  {inspectItem.type === 'profile' && (() => {
                    const meta = parseEvidenceMeta(inspectItem.data.evidence_url);
                    return (
                      <>
                        {meta.doc_front_path && (
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(meta.doc_front_path)}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between text-left text-xs font-bold text-konecta-navy"
                          >
                            <span className="flex items-center gap-1.5">
                              <User size={14} className="text-blue-600" /> Frente do Documento
                            </span>
                            <ExternalLink size={13} className="text-gray-400" />
                          </button>
                        )}
                        {meta.doc_back_path && (
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(meta.doc_back_path)}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between text-left text-xs font-bold text-konecta-navy"
                          >
                            <span className="flex items-center gap-1.5">
                              <User size={14} className="text-blue-600" /> Verso do Documento
                            </span>
                            <ExternalLink size={13} className="text-gray-400" />
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Documentos da organização */}
                  {inspectItem.type === 'organization' && (() => {
                    const meta = parseEvidenceMeta(inspectItem.data.evidence_url);
                    return (
                      <>
                        {meta.registration_doc_path ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(meta.registration_doc_path)}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between text-left text-xs font-bold text-konecta-navy"
                          >
                            <span className="flex items-center gap-1.5">
                              <Building size={14} className="text-konecta-gold" /> Alvará / Registo
                            </span>
                            <ExternalLink size={13} className="text-gray-400" />
                          </button>
                        ) : meta.is_registration_exempt ? (
                          <div className="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                            Registo Isento: {meta.registration_exempt_reason || 'Sim'}
                          </div>
                        ) : null}

                        {meta.rep_id_doc_path ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(meta.rep_id_doc_path)}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between text-left text-xs font-bold text-konecta-navy"
                          >
                            <span className="flex items-center gap-1.5">
                              <User size={14} className="text-konecta-navy" /> ID Representante
                            </span>
                            <ExternalLink size={13} className="text-gray-400" />
                          </button>
                        ) : meta.is_rep_id_exempt ? (
                          <div className="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                            Representante Isento: {meta.rep_id_exempt_reason || 'Sim'}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Justificação de Decisão / Nota Administrativa */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nota Administrativa ou Justificação (opcional ou obrigatória em caso de rejeição):
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Ex: Documento em conformidade, selo atribuído. Ou motivo detalhado da rejeição..."
                  className="input-konecta w-full text-xs resize-none"
                />
              </div>
            </div>

            {/* Ações de Decisão */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={processingReview}
                onClick={() => {
                  if (inspectItem.type === 'subscription') handleReviewSubscription('rejected');
                  else handleReviewVerification('rejected');
                }}
                className="py-2.5 px-5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200 flex items-center gap-1.5"
              >
                <XCircle size={14} /> Rejeitar Pedido
              </button>

              <button
                type="button"
                disabled={processingReview}
                onClick={() => {
                  if (inspectItem.type === 'subscription') handleReviewSubscription('approved');
                  else handleReviewVerification('approved');
                }}
                className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-1.5"
              >
                {processingReview ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Aprovar & Ativar Selo/Plano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR PLANO DE SUBSCRIÇÃO */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-gray-100 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Gestão de Planos</span>
                <h3 className="text-xl font-bold text-konecta-navy">
                  {editingPlanId ? 'Editar Plano de Subscrição' : 'Criar Novo Plano de Subscrição'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xs"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nome do Plano <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={planFormName}
                  onChange={(e) => setPlanFormName(e.target.value)}
                  placeholder="Ex: Pro Inovador"
                  className="input-konecta w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  value={planFormDesc}
                  onChange={(e) => setPlanFormDesc(e.target.value)}
                  placeholder="Ex: Para acelerar ideias e obter selo exclusivo"
                  className="input-konecta w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Preço em Kz <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={planFormPrice}
                    onChange={(e) => setPlanFormPrice(e.target.value)}
                    className="input-konecta w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Duração em Dias <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planFormDuration}
                    onChange={(e) => setPlanFormDuration(e.target.value)}
                    className="input-konecta w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Benefícios (um por linha)
                </label>
                <textarea
                  rows={4}
                  value={planFormBenefits}
                  onChange={(e) => setPlanFormBenefits(e.target.value)}
                  placeholder="Vantagem 1&#10;Vantagem 2"
                  className="input-konecta w-full text-xs resize-none"
                />
              </div>

              {!editingPlanId && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Limites
                  </label>
                  <input
                    type="text"
                    value={planFormLimits}
                    onChange={(e) => setPlanFormLimits(e.target.value)}
                    placeholder="Ex: Até 50 projetos e mensagens ilimitadas"
                    className="input-konecta w-full text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featuredPlanCheckAdmin"
                  checked={planFormFeatured}
                  onChange={(e) => setPlanFormFeatured(e.target.checked)}
                  className="rounded text-konecta-gold focus:ring-konecta-gold"
                />
                <label htmlFor="featuredPlanCheckAdmin" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Marcar como Plano em Destaque ("Recomendado")
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="btn-gold py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                >
                  {savingPlan ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {savingPlan ? 'A guardar...' : editingPlanId ? 'Guardar Alterações' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
