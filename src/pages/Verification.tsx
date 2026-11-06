import React, { useState, useEffect } from 'react';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/UIContext';
import { useT } from '../i18n/LanguageContext';
import { UserBadge, OrgBadge } from '../components/UserBadges';
import { 
  CheckCircle, 
  Building, 
  User, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Check, 
  XCircle,
  ExternalLink,
  CreditCard,
  Smartphone,
  Sparkles,
  RefreshCw,
  Ban,
  ArrowRight,
  Shield,
  FileCheck,
  Building2
} from 'lucide-react';
import { GoogleDrivePickerModal, SelectedDocumentResult } from '../components/GoogleDrivePickerModal';

interface VerificationProps {
  user?: any;
  onOpenAuth?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Verification: React.FC<VerificationProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const { showToast } = useToast();
  const { t } = useT();

  const [activeTab, setActiveTab] = useState<'benefits' | 'plans' | 'my_verifications'>('plans');
  const [selectedTarget, setSelectedTarget] = useState<'profile' | 'organization'>('profile');
  
  // Real user data & verification requests
  const [profile, setProfile] = useState<any>(null);
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [myRequests, setMyRequests] = useState<{ profiles: any[]; organizations: any[] }>({ profiles: [], organizations: [] });
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [nifOrBi, setNifOrBi] = useState('');
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveProofDoc, setDriveProofDoc] = useState<SelectedDocumentResult | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mc_express' | 'referencia'>('mc_express');
  const [paymentPhone, setPaymentPhone] = useState('976848444');
  const [currentSessionData, setCurrentSessionData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const diditConfig = d1Client.verification.getDiditConfig();

  useEffect(() => {
    loadUserData();

    // Check for Didit verification return query parameters
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id') || params.get('sessionId');
    const isReturn = params.get('verification') === 'return' || window.location.pathname.includes('verification-return');

    if (isReturn || sessionId) {
      showToast('De volta ao KONECTA! A verificar o estado da tua sessão Didit...', 'info');
      if (sessionId) {
        fetch(`/api/verification/session/${sessionId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.status === 'approved') {
              showToast('Verificação concluída com sucesso! O teu selo está ativo.', 'success');
            } else if (data?.status === 'rejected') {
              showToast('A verificação não foi aprovada pela Didit.', 'error');
            } else if (data?.status === 'verification_pending') {
              showToast('Documentos em processamento na Didit.', 'info');
            }
            loadUserData();
          })
          .catch(() => loadUserData());
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:didit_verifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_verification_requests', filter: `user_id=eq.${user.id}` },
        () => loadUserData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization_verification_requests', filter: `requested_by=eq.${user.id}` },
        () => loadUserData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        () => loadUserData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profRes, orgsRes, reqsRes] = await Promise.all([
        d1Client.profiles.get(user.id),
        d1Client.organizations.list({ owner_id: user.id }),
        d1Client.verification.getMyRequests(user.id)
      ]);

      if (profRes.data) {
        const p = profRes.data?.data || profRes.data;
        setProfile(p);
        setFullName(p.display_name || p.full_name || '');
      }

      const orgs = orgsRes.data?.data || orgsRes.data || [];
      setUserOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }

      if (reqsRes.data) {
        setMyRequests(reqsRes.data);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de verificação:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine current status for Individual User or Selected Organization
  const getCurrentStatus = () => {
    if (selectedTarget === 'profile') {
      const isVerified = Boolean(profile?.is_verified);
      const isExpired = profile?.verified_until && new Date(profile.verified_until).getTime() <= Date.now();
      
      const latestReq = myRequests.profiles?.[0];
      if (latestReq) {
        if (latestReq.status === 'badge_suspended') return 'badge_suspended';
        if (latestReq.status === 'rejected') return 'rejected';
        if (latestReq.status === 'in_review') return 'in_review';
        if (latestReq.status === 'verification_pending') return 'verification_pending';
        if (latestReq.status === 'payment_pending') return 'payment_pending';
      }

      if (isVerified && isExpired) return 'subscription_expired';
      if (isVerified) return 'approved';
      return 'not_verified';
    } else {
      const selectedOrg = userOrganizations.find(o => o.id === selectedOrgId);
      const isVerified = selectedOrg?.verification_status === 'verified';
      const isExpired = selectedOrg?.verified_until && new Date(selectedOrg.verified_until).getTime() <= Date.now();

      const latestReq = myRequests.organizations?.find(r => r.organization_id === selectedOrgId) || myRequests.organizations?.[0];
      if (latestReq) {
        if (latestReq.status === 'badge_suspended') return 'badge_suspended';
        if (latestReq.status === 'rejected') return 'rejected';
        if (latestReq.status === 'in_review') return 'in_review';
        if (latestReq.status === 'verification_pending') return 'verification_pending';
        if (latestReq.status === 'payment_pending') return 'payment_pending';
      }

      if (isVerified && isExpired) return 'subscription_expired';
      if (isVerified) return 'approved';
      return 'not_verified';
    }
  };

  const currentStatus = getCurrentStatus();

  // Initiate Didit Verification & Open Payment Modal
  const handleInitiateVerification = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (!nifOrBi.trim()) {
      showToast(selectedTarget === 'profile' ? 'Por favor insere o número do teu BI.' : 'Por favor insere o NIF da empresa.', 'info');
      return;
    }

    setCreatingSession(true);
    try {
      const targetId = selectedTarget === 'profile' ? user.id : selectedOrgId;
      if (selectedTarget === 'organization' && !targetId) {
        showToast('Tens de selecionar uma empresa ou criar uma primeiro.', 'error');
        setCreatingSession(false);
        return;
      }

      const res = await d1Client.verification.createDiditSession({
        targetType: selectedTarget,
        targetId,
        fullName: fullName.trim(),
        nifOrBi: nifOrBi.trim()
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Erro ao iniciar o processo de verificação');
      }

      setCurrentSessionData(res.data);
      setIsPaymentModalOpen(true);
      showToast('Processo de verificação iniciado! Procede ao pagamento da subscrição.', 'success');
    } catch (err: any) {
      console.error('Erro ao iniciar verificação:', err);
      showToast(err?.message || 'Falha ao iniciar o processo de verificação.', 'error');
    } finally {
      setCreatingSession(false);
    }
  };

  // Complete Payment Step
  const handleConfirmPayment = async () => {
    if (!currentSessionData) return;
    setProcessingPayment(true);
    try {
      const res = await d1Client.verification.confirmPayment({
        requestId: currentSessionData.requestId,
        targetType: selectedTarget,
        paymentMethod,
        phoneNumber: paymentPhone
      });

      if (res.error) throw new Error(res.error.message || 'Erro no pagamento');

      setIsPaymentModalOpen(false);
      await loadUserData();
      showToast('Pagamento confirmado com sucesso! Procede agora com a validação dos documentos.', 'success');
    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      showToast(err?.message || 'Falha ao confirmar pagamento.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Renew Monthly Subscription
  const handleRenewSubscription = async () => {
    if (!user) return;
    try {
      const targetId = selectedTarget === 'profile' ? user.id : (selectedOrgId || userOrganizations[0]?.id || user.id);
      const res = await d1Client.verification.createDiditSession({
        targetType: selectedTarget,
        targetId,
        fullName: fullName.trim() || profile?.full_name || '',
        nifOrBi: nifOrBi.trim() || profile?.bi_number || ''
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Erro ao iniciar renovação');
      }

      setCurrentSessionData(res.data);
      setIsPaymentModalOpen(true);
      showToast('Por favor, confirma o pagamento para renovar a tua subscrição mensal.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao iniciar renovação.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      not_verified: { label: 'Não Verificado', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
      payment_pending: { label: 'Pagamento Pendente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
      verification_pending: { label: 'Aguardando Validação', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Loader2 },
      in_review: { label: 'Em Análise', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Clock },
      approved: { label: 'Aprovado & Ativo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      rejected: { label: 'Rejeitado', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
      subscription_expired: { label: 'Subscrição Expirada', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: RefreshCw },
      badge_suspended: { label: 'Selo Suspenso', color: 'bg-red-100 text-red-900 border-red-200', icon: Ban },
    };

    const current = config[status] || config.not_verified;
    const Icon = current.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${current.color}`}>
        <Icon size={14} />
        <span>{current.label}</span>
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-konecta-navy via-[#0d2342] to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-white/10">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-konecta-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-konecta-gold font-bold">
            <ShieldCheck size={16} />
            <span>Verificação Oficial de Identidade & Empresas</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Obtém o Selo de Autenticidade <span className="text-konecta-gold">KONECTA</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Aumenta a tua credibilidade profissional e institucional na maior rede de inovação em Angola. Verificação biométrica de BI e NIF empresarial com validação automatizada.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'plans' ? 'bg-konecta-gold text-konecta-navy shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <CreditCard size={15} />
              <span>Planos e Verificação</span>
            </button>
            <button
              onClick={() => setActiveTab('benefits')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'benefits' ? 'bg-konecta-gold text-konecta-navy shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Sparkles size={15} />
              <span>Benefícios do Selo</span>
            </button>
            <button
              onClick={() => setActiveTab('my_verifications')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'my_verifications' ? 'bg-konecta-gold text-konecta-navy shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FileCheck size={15} />
              <span>Histórico de Pedidos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Selector: User BI vs Company NIF */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-konecta-navy">Seleciona o Tipo de Verificação</h2>
            <p className="text-xs text-gray-500">Escolhe entre selo pessoal individual (BI) ou selo institucional para empresa (NIF).</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setSelectedTarget('profile')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedTarget === 'profile' ? 'bg-konecta-navy text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User size={15} />
              <span>Pessoa Física (BI)</span>
            </button>

            <button
              onClick={() => setSelectedTarget('organization')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedTarget === 'organization' ? 'bg-konecta-navy text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 size={15} />
              <span>Empresa (NIF)</span>
            </button>
          </div>
        </div>

        {/* Current State Indicator Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-konecta-navy">
              {selectedTarget === 'profile' ? <User size={22} /> : <Building size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-konecta-navy">
                  {selectedTarget === 'profile' ? (profile?.display_name || user?.email || 'A tua conta') : 'A tua organização'}
                </h3>
                {selectedTarget === 'profile' ? <UserBadge profile={profile} /> : <OrgBadge organization={userOrganizations.find(o => o.id === selectedOrgId)} />}
              </div>
              <p className="text-xs text-gray-500">
                {selectedTarget === 'profile' ? 'Verificação de Bilhete de Identidade Angolano' : 'Verificação Empresarial de NIF & Documentação'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-gray-400 font-semibold">Estado Atual:</span>
            {getStatusBadge(currentStatus)}
          </div>
        </div>
      </div>

      {/* TAB 1: PLANS AND VERIFICATION FLOW */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan Pricing Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`card-konecta p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${
              selectedTarget === 'profile' ? 'border-konecta-gold bg-gradient-to-b from-white to-amber-50/30' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                  Individual
                </span>
                <span className="text-xs font-bold text-gray-400">Subscrição Mensal</span>
              </div>
              <h3 className="text-lg font-black text-konecta-navy mb-1">Selo Azul de Utilizador</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Destinado a inovadores, profissionais e criadores com Bilhete de Identidade validado.</p>
              
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-3xl font-extrabold text-konecta-navy">5.000</span>
                <span className="text-xs font-bold text-gray-500">Kz / mês</span>
              </div>

              <ul className="space-y-2 text-xs text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Selo Azul Verificado no Feed e Perfil</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Validação biométrica de Bilhete de Identidade</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Maior alcance e visibilidade na rede</span>
                </li>
              </ul>
            </div>

            <div className={`card-konecta p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${
              selectedTarget === 'organization' ? 'border-konecta-gold bg-gradient-to-b from-white to-amber-50/30' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                  Empresarial
                </span>
                <span className="text-xs font-bold text-gray-400">Subscrição Mensal</span>
              </div>
              <h3 className="text-lg font-black text-konecta-navy mb-1">Selo Institucional NIF</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Destinado a empresas, startups e instituições com registo oficial em Angola.</p>
              
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-3xl font-extrabold text-konecta-navy">10.000</span>
                <span className="text-xs font-bold text-gray-500">Kz / mês</span>
              </div>

              <ul className="space-y-2 text-xs text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Selo Institucional Oficial com NIF</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Validação de NIF e Registo Comercial</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Publicação privilegiada de ofertas e eventos</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Form & Verification Controls */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-base font-bold text-konecta-navy">
                {selectedTarget === 'profile' ? 'Formulário de Verificação de BI' : 'Formulário de Verificação Empresarial (NIF)'}
              </h3>
              <p className="text-xs text-gray-500">Preenche os teus dados oficiais para iniciar o processo de validação de identidade.</p>
            </div>

            {selectedTarget === 'organization' && userOrganizations.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Selecionar Empresa</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-konecta-navy"
                >
                  {userOrganizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  {selectedTarget === 'profile' ? 'Nome Completo (como no BI)' : 'Denominação Social Oficial'}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={selectedTarget === 'profile' ? 'Ex: Manuel António da Silva' : 'Ex: Konecta Angola Lda'}
                  className="w-full p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-konecta-navy"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  {selectedTarget === 'profile' ? 'Número do Bilhete de Identidade (BI)' : 'Número de Identificação Fiscal (NIF)'}
                </label>
                <input
                  type="text"
                  value={nifOrBi}
                  onChange={(e) => setNifOrBi(e.target.value)}
                  placeholder={selectedTarget === 'profile' ? 'Ex: 004892014LA042' : 'Ex: 5417089201'}
                  className="w-full p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-konecta-navy font-mono"
                />
              </div>
            </div>

            {/* Google Drive Document Option for Identity Proof */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-konecta-navy flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                    <span>{selectedTarget === 'profile' ? 'Cópia de BI / Passaporte via Google Drive' : 'Certidão / Alvará via Google Drive'}</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Podes importar o teu documento oficial diretamente do Google Drive com encriptação segura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDriveModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-base">cloud_download</span>
                  <span>{driveProofDoc ? 'Substituir Ficheiro' : 'Selecionar do Drive'}</span>
                </button>
              </div>

              {driveProofDoc && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-blue-600 text-lg">description</span>
                    <div className="truncate">
                      <p className="font-bold text-blue-900 truncate">{driveProofDoc.name}</p>
                      <p className="text-[10px] text-blue-700">{driveProofDoc.sizeFormatted || 'Documento Google Drive Conectado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {driveProofDoc.cloudinaryUrl && (
                      <a
                        href={driveProofDoc.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline font-bold"
                      >
                        Visualizar
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setDriveProofDoc(null)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Trust & Security Info Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 text-xs text-blue-950 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-konecta-navy">
                <Shield size={16} className="text-blue-600" />
                <span>Verificação de Identidade Segura & Encriptada</span>
              </div>
              <p className="text-[11px] text-blue-900/80 leading-relaxed">
                Os teus documentos são validados com segurança máxima, confidencialidade e certificação oficial de identidade para atribuição do selo verificado na KONECTA.
              </p>
            </div>

            {/* Actions based on current status */}
            {currentStatus === 'approved' ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle size={32} className="text-emerald-600 mx-auto" />
                <h4 className="text-sm font-extrabold text-emerald-900">Parabéns! A tua verificação está ativa.</h4>
                <p className="text-xs text-emerald-700">
                  O selo já se encontra visível em toda a plataforma. Subscrição renovada automaticamente ou com validade de 30 dias.
                </p>
                <button
                  onClick={handleRenewSubscription}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  Renovar Subscrição Mensal
                </button>
              </div>
            ) : currentStatus === 'subscription_expired' ? (
              <div className="p-6 rounded-2xl bg-orange-50 border border-orange-200 text-center space-y-3">
                <RefreshCw size={32} className="text-orange-600 mx-auto" />
                <h4 className="text-sm font-extrabold text-orange-900">A tua subscrição expirou.</h4>
                <p className="text-xs text-orange-700">
                  Para reativar o selo azul no teu perfil, renova a subscrição mensal de {selectedTarget === 'profile' ? '5.000 Kz' : '10.000 Kz'}.
                </p>
                <button
                  onClick={handleRenewSubscription}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors"
                >
                  Renovar Agora
                </button>
              </div>
            ) : currentStatus === 'badge_suspended' ? (
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                <Ban size={32} className="text-red-600 mx-auto" />
                <h4 className="text-sm font-extrabold text-red-900">Selo Suspenso Temporariamente.</h4>
                <p className="text-xs text-red-700">
                  O teu selo foi suspenso pela administração por revisão de dados. Contacta o suporte se considerares um erro.
                </p>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  Subscrição: <strong className="text-konecta-navy">{selectedTarget === 'profile' ? '5.000 Kz/mês' : '10.000 Kz/mês'}</strong>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleInitiateVerification}
                    disabled={creatingSession || !nifOrBi.trim()}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-konecta-navy text-white text-xs font-bold uppercase tracking-wider hover:bg-konecta-gold hover:text-konecta-navy transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    {creatingSession ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>A preparar verificação...</span>
                      </>
                    ) : (
                      <>
                        <span>Obter Selo de Verificação</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {/* Direct Link to Verification Portal */}
                  <a
                    href={selectedTarget === 'profile' ? diditConfig.individual.link : diditConfig.organization.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                    title="Abrir portal de verificação"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BENEFITS */}
      {activeTab === 'benefits' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold text-konecta-navy">Vantagens da Verificação no KONECTA</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-bold text-konecta-navy">Selo Azul & Institucional</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Mostra um selo de autenticidade ao lado do teu nome ou empresa em todo o ecossistema KONECTA (feed, mensagens e comunidades).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-sm font-bold text-konecta-navy">Prioridade Algorítmica</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Publicações e propostas de perfis verificados ganham destaque superior no feed principal e nos resultados de pesquisa.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-konecta-navy">Confiança Anti-Fraude</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Validação oficial em tempo real com tecnologia avançada de leitura biométrica de BI e verificação de NIF empresarial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REQUESTS HISTORY */}
      {activeTab === 'my_verifications' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold text-konecta-navy">Histórico dos Meus Pedidos</h2>
          
          {myRequests.profiles.length === 0 && myRequests.organizations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl">
              <AlertCircle size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Ainda não submeteste nenhum pedido de verificação.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.profiles.map((req) => (
                <div key={req.id} className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between gap-4 bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-konecta-navy">Verificação Pessoal (BI)</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Data: {new Date(req.created_at).toLocaleDateString('pt-AO')}</p>
                  </div>
                  <span className="text-xs font-extrabold text-konecta-navy">5.000 Kz/mês</span>
                </div>
              ))}

              {myRequests.organizations.map((req) => (
                <div key={req.id} className="p-4 rounded-2xl border border-gray-200 flex items-center justify-between gap-4 bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-konecta-navy">Verificação Empresarial (NIF)</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Data: {new Date(req.created_at).toLocaleDateString('pt-AO')}</p>
                  </div>
                  <span className="text-xs font-extrabold text-konecta-navy">10.000 Kz/mês</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && currentSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-konecta-navy flex items-center gap-2">
                <CreditCard size={18} className="text-konecta-gold" />
                <span>Pagamento da Subscrição</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-bold text-konecta-navy">{selectedTarget === 'profile' ? 'Selo Azul (BI)' : 'Selo Empresa (NIF)'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Valor Mensal:</span>
                <span className="font-extrabold text-emerald-600 text-sm">{currentSessionData.priceKz?.toLocaleString()} Kz</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Método de Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mc_express')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'mc_express' ? 'border-konecta-navy bg-blue-50/50 text-konecta-navy' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Smartphone size={20} className="text-blue-600" />
                  <span>Multicaixa Express</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('referencia')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'referencia' ? 'border-konecta-navy bg-blue-50/50 text-konecta-navy' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <CreditCard size={20} className="text-emerald-600" />
                  <span>Pagamento por Referência</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'mc_express' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 block">Número do Telemóvel Express</label>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Multicaixa Express Angola
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    +244
                  </span>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="976 848 444"
                    className="w-full pl-14 pr-3 py-3 rounded-xl border border-gray-200 text-xs font-mono font-bold text-konecta-navy focus:ring-2 focus:ring-konecta-navy outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Introduz o número associado à tua conta Multicaixa Express (ex: <strong>976 848 444</strong>) para receber a notificação de confirmação no teu telemóvel.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 font-mono">
                <p>Entidade: <strong>00842</strong></p>
                <p>Referência: <strong>923 481 029</strong></p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {processingPayment ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>A confirmar pagamento...</span>
                  </>
                ) : (
                  <span>Confirmar Pagamento e Prosseguir</span>
                )}
              </button>

              <a
                href={currentSessionData.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abrir Portal de Validação de Documentos
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Document Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        title={selectedTarget === 'profile' ? 'Selecionar BI do Google Drive' : 'Selecionar Documento Empresarial do Drive'}
        allowedMimeTypes="identity_only"
        onSelectDocument={(doc) => {
          setDriveProofDoc(doc);
        }}
      />
    </div>
  );
};
