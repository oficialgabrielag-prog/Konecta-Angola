import React, { useState, useEffect } from 'react';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/UIContext';
import { useT } from '../i18n/LanguageContext';
import { 
  CheckCircle, 
  Upload, 
  Building, 
  User, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Clock, 
  Check, 
  XCircle,
  Copy,
  ChevronRight,
  CreditCard,
  Smartphone
} from 'lucide-react';

interface VerificationProps {
  user?: any;
  onOpenAuth?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Verification: React.FC<VerificationProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const { showToast } = useToast();
  const { t } = useT();

  const [activeTab, setActiveTab] = useState<'request' | 'my_requests'>('request');
  const [selectedTarget, setSelectedTarget] = useState<'profile' | 'organization' | null>(null);
  
  // Real data from Supabase
  const [pricing, setPricing] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  
  const [loadingData, setLoadingData] = useState(true);
  const [myRequests, setMyRequests] = useState<{ profiles: any[]; organizations: any[] }>({ profiles: [], organizations: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingPersonal, setHasPendingPersonal] = useState(false);
  const [hasPendingOrg, setHasPendingOrg] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);

  // Personal form fields
  const [personalFullName, setPersonalFullName] = useState('');
  const [personalHandle, setPersonalHandle] = useState('');
  const [personalIdType, setPersonalIdType] = useState('Bilhete de Identidade');
  const [personalIdNumber, setPersonalIdNumber] = useState('');
  const [personalCountry, setPersonalCountry] = useState('Angola');
  const [personalReason, setPersonalReason] = useState('');
  const [personalProofFile, setPersonalProofFile] = useState<File | null>(null);

  // Organization form fields
  const [orgSelectedId, setOrgSelectedId] = useState('');
  const [orgOfficialName, setOrgOfficialName] = useState('');
  const [orgCommercialName, setOrgCommercialName] = useState('');
  const [orgNif, setOrgNif] = useState('');
  const [orgCountry, setOrgCountry] = useState('Angola');
  const [orgMunicipality, setOrgMunicipality] = useState('Luanda');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgProofFile, setOrgProofFile] = useState<File | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  // Realtime subscription for requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:verification_requests_changes')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [pricingRes, pmRes] = await Promise.all([
        d1Client.verification.getPricing(),
        d1Client.paymentMethods.getActiveMethods()
      ]);

      setPricing(pricingRes.data || []);
      const activeMethods = pmRes.data || [];
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedPaymentMethodId(activeMethods[0].id);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadUserData = async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const { data: profile } = await d1Client.profiles.get(user.id);
      if (profile) {
        setPersonalFullName(profile.full_name || profile.display_name || '');
        setPersonalHandle(profile.username ? `@${profile.username.replace('@', '')}` : `@${(profile.display_name || 'user').toLowerCase().replace(/\s+/g, '')}`);
        if (profile.province) setOrgMunicipality(profile.municipality || profile.province);
      }

      const { data: orgs } = await d1Client.organizations.list({ owner_id: user.id });
      if (orgs && orgs.length > 0) {
        setUserOrganizations(orgs);
        setOrgSelectedId(orgs[0].id);
        setOrgOfficialName(orgs[0].name || '');
        setOrgCommercialName(orgs[0].name || '');
        if (orgs[0].municipality) setOrgMunicipality(orgs[0].municipality);
        if (orgs[0].description) setOrgDescription(orgs[0].description);
      }

      const reqsRes = await d1Client.verification.getMyRequests(user.id);
      if (reqsRes.data) {
        setMyRequests(reqsRes.data);
        const pendingP = reqsRes.data.profiles.some((r: any) => r.status === 'pending');
        const pendingO = reqsRes.data.organizations.some((r: any) => r.status === 'pending');
        setHasPendingPersonal(pendingP);
        setHasPendingOrg(pendingO);
      }
    } catch (err) {
      console.warn('Aviso ao carregar dados do utilizador:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const getPriceFor = (type: 'profile' | 'organization') => {
    const item = pricing.find(p => p.target_type === type || p.account_type === type);
    return item ? item.price_amount : (type === 'profile' ? 5000 : 10000);
  };

  const getCurrencyFor = (type: 'profile' | 'organization') => {
    const item = pricing.find(p => p.target_type === type || p.account_type === type);
    return item?.currency || 'Kz';
  };

  const getDurationFor = (type: 'profile' | 'organization') => {
    const item = pricing.find(p => p.target_type === type || p.account_type === type);
    return item?.duration_days || 30;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Coordenadas copiadas para a área de transferência!', 'success');
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (hasPendingPersonal) {
      showToast('Já possui um pedido de verificação pessoal pendente sob análise.', 'error');
      return;
    }

    if (!personalFullName.trim() || !personalHandle.trim() || !personalIdNumber.trim()) {
      showToast('Por favor preencha todos os campos obrigatórios de identificação.', 'error');
      return;
    }

    if (!personalProofFile) {
      showToast('Por favor anexe o comprovativo de pagamento (PDF, JPG, PNG ou WEBP).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedPm = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      const priceAmount = getPriceFor('profile');
      const currency = getCurrencyFor('profile');
      const durationDays = getDurationFor('profile');

      // 1. Upload proof file to private bucket "konecta-payment-proofs"
      // Path structure starts strictly with user.id: ${user.id}/verifications/...
      const proofPath = await d1Client.storage.uploadPrivateProof(
        user.id,
        'verifications',
        personalProofFile
      );

      // 2. Prepare evidence metadata
      const evidenceMeta = {
        full_name: personalFullName.trim(),
        account_handle: personalHandle.trim(),
        id_type: personalIdType,
        id_number: personalIdNumber.trim(),
        country: personalCountry.trim(),
        reason: personalReason.trim(),
        payment_method_id: selectedPm?.id,
        payment_provider: selectedPm?.provider,
        payment_display_name: selectedPm?.display_name,
        proof_path: proofPath,
        submitted_at: new Date().toISOString()
      };

      // 3. Insert real record into profile_verification_requests
      const { data, error } = await supabase
        .from('profile_verification_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          proof_path: proofPath,
          price_amount: priceAmount,
          currency: currency,
          duration_days: durationDays,
          explanation: personalReason.trim() || `Verificação solicitada por ${personalFullName.trim()}`,
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      showToast('Pedido de verificação gravado com sucesso no Supabase! Está sob análise.', 'success');
      setSelectedTarget(null);
      setPersonalProofFile(null);
      setPersonalReason('');
      await loadUserData();
      setActiveTab('my_requests');
    } catch (err: any) {
      console.error('Erro ao submeter verificação pessoal:', err);
      showToast(err.message || 'Falha ao gravar pedido de verificação no banco.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (hasPendingOrg) {
      showToast('Já possui um pedido de verificação de organização pendente sob análise.', 'error');
      return;
    }

    if (!orgOfficialName.trim() || !orgCommercialName.trim()) {
      showToast('Por favor preencha o nome oficial e comercial da organização.', 'error');
      return;
    }

    if (!orgProofFile) {
      showToast('Por favor anexe o comprovativo de pagamento (PDF, JPG, PNG ou WEBP).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedPm = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      const priceAmount = getPriceFor('organization');
      const currency = getCurrencyFor('organization');
      const durationDays = getDurationFor('organization');

      // 1. Upload proof file to private bucket "konecta-payment-proofs"
      const proofPath = await d1Client.storage.uploadPrivateProof(
        user.id,
        'verifications_org',
        orgProofFile
      );

      // 2. Prepare evidence metadata
      const evidenceMeta = {
        organization_name: orgOfficialName.trim(),
        commercial_name: orgCommercialName.trim(),
        nif: orgNif.trim() || '',
        country: orgCountry.trim(),
        municipality: orgMunicipality.trim(),
        description: orgDescription.trim(),
        payment_method_id: selectedPm?.id,
        payment_provider: selectedPm?.provider,
        payment_display_name: selectedPm?.display_name,
        proof_path: proofPath,
        submitted_at: new Date().toISOString()
      };

      // 3. Insert real record into organization_verification_requests
      const { data, error } = await supabase
        .from('organization_verification_requests')
        .insert({
          organization_id: orgSelectedId || null,
          requested_by: user.id,
          status: 'pending',
          proof_path: proofPath,
          price_amount: priceAmount,
          currency: currency,
          duration_days: durationDays,
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      showToast('Pedido de verificação institucional gravado com sucesso no Supabase!', 'success');
      setSelectedTarget(null);
      setOrgProofFile(null);
      await loadUserData();
      setActiveTab('my_requests');
    } catch (err: any) {
      console.error('Erro ao submeter verificação institucional:', err);
      showToast(err.message || 'Falha ao gravar pedido de verificação institucional.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Payment Methods block from Supabase
  const renderPaymentMethodsSection = (amount: number, currency: string) => {
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId) || paymentMethods[0];

    return (
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-amber-600" /> Métodos de Pagamento Oficiais
          </span>
          <span className="text-xs font-black text-amber-950 bg-amber-100/90 px-3 py-1 rounded-full self-start sm:self-auto">
            Valor a Pagar: {amount.toLocaleString('pt-AO')} {currency}
          </span>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="bg-white p-4 rounded-xl border border-amber-200 text-xs text-amber-800">
            A carregar métodos de pagamento ativos...
          </div>
        ) : (
          <>
            {/* Method Selection Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {paymentMethods.map((pm) => {
                const isSelected = pm.id === (selectedMethod?.id);
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethodId(pm.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-white/60 border-amber-200/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {pm.provider === 'bank_transfer' && <CreditCard size={15} className="text-amber-700" />}
                      {pm.provider === 'express' && <Smartphone size={15} className="text-amber-700" />}
                      {pm.provider === 'unitel_money' && <Smartphone size={15} className="text-red-600" />}
                      <span className="text-xs font-bold text-gray-900 leading-tight">
                        {pm.display_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">
                      {pm.account_number}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Selected Method Details */}
            {selectedMethod && (
              <div className="bg-white p-4 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      {selectedMethod.display_name}
                    </span>
                    <span className="font-mono text-sm font-bold text-gray-900 select-all block mt-0.5">
                      {selectedMethod.account_number}
                    </span>
                    <span className="text-[11px] text-gray-600 block mt-0.5">
                      Titular / Beneficiário: <strong>{selectedMethod.account_name}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedMethod.account_number)}
                    className="btn-secondary py-1.5 px-3 text-[11px] font-bold flex items-center gap-1 shrink-0"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>

                {selectedMethod.instructions && (
                  <p className="text-[11px] text-amber-900/90 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                    {selectedMethod.instructions}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-[0.2em] block mb-1">
            Autenticidade e Confiança
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-konecta-navy tracking-tight">
            Verificação de Conta
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Obtenha o selo oficial de verificação do KONECTA Angola com consulta aos dados reais do Supabase.
          </p>
        </div>

        {/* Tab switches */}
        <div className="flex bg-gray-100 p-1 rounded-2xl self-start md:self-auto shrink-0">
          <button
            onClick={() => { setActiveTab('request'); setSelectedTarget(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'request' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Solicitar Selo
          </button>
          <button
            onClick={() => setActiveTab('my_requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'my_requests' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Meus Pedidos
            {(myRequests.profiles.length + myRequests.organizations.length > 0) && (
              <span className="w-5 h-5 bg-konecta-gold/20 text-konecta-gold rounded-full flex items-center justify-center text-[10px] font-black">
                {myRequests.profiles.length + myRequests.organizations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loadingData ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-konecta-navy" size={32} />
          <p className="text-xs text-gray-400 mt-2">A carregar dados do Supabase...</p>
        </div>
      ) : activeTab === 'request' ? (
        <>
          {!selectedTarget ? (
            /* Modalidades selection cards */
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
                <h2 className="text-xl font-bold text-konecta-navy">Escolha a sua modalidade de verificação</h2>
                <p className="text-xs text-gray-500">
                  Preços e métodos de pagamento reais carregados do Supabase.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Conta Pessoal Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <User size={24} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-konecta-navy">Conta Pessoal</h3>
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-200">
                          <CheckCircle size={12} className="text-blue-600" /> Selo Azul
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Para inovadores, criadores e figuras públicas com presença ativa na comunidade.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-konecta-navy">
                          {getPriceFor('profile').toLocaleString('pt-AO')}
                        </span>
                        <span className="text-sm font-bold text-gray-500">{getCurrencyFor('profile')}</span>
                        <span className="text-xs text-gray-400 font-medium">/ {getDurationFor('profile')} dias</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-gray-600">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Selo azul de perfil verificado junto ao nome</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Maior destaque em publicações e comentários</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Proteção e validação oficial de identidade</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    {hasPendingPersonal ? (
                      <div className="w-full py-3 px-4 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold text-center border border-amber-200 flex items-center justify-center gap-2">
                        <Clock size={14} /> Pedido pessoal em análise
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!user) onOpenAuth?.();
                          else setSelectedTarget('profile');
                        }}
                        className="btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                      >
                        Solicitar Selo Azul <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Organização Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-konecta-gold flex items-center justify-center border border-amber-200">
                      <Building size={24} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-konecta-navy">Organização</h3>
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">
                          <ShieldCheck size={12} className="text-konecta-gold" /> Selo Institucional
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Para empresas, ONGs e instituições que realizam projetos e desafios em Angola.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-konecta-navy">
                          {getPriceFor('organization').toLocaleString('pt-AO')}
                        </span>
                        <span className="text-sm font-bold text-gray-500">{getCurrencyFor('organization')}</span>
                        <span className="text-xs text-gray-400 font-medium">/ {getDurationFor('organization')} dias</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-gray-600">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Selo dourado institucional verificado</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Abertura e gestão de desafios com prémios</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>Autenticidade perante parceiros e investidores</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    {hasPendingOrg ? (
                      <div className="w-full py-3 px-4 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold text-center border border-amber-200 flex items-center justify-center gap-2">
                        <Clock size={14} /> Pedido institucional em análise
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!user) onOpenAuth?.();
                          else setSelectedTarget('organization');
                        }}
                        className="btn-gold w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                      >
                        Solicitar Selo Institucional <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTarget === 'profile' ? (
            /* Formulário Real: Verificação Pessoal */
            <form onSubmit={handlePersonalSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Verificação de Conta</span>
                  <h2 className="text-2xl font-bold text-konecta-navy">Selo Azul de Conta Pessoal</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Voltar
                </button>
              </div>

              {/* Métodos de pagamento reais carregados do Supabase */}
              {renderPaymentMethodsSection(getPriceFor('profile'), getCurrencyFor('profile'))}

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider text-xs border-b pb-2">
                  1. Dados de Identificação
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalFullName}
                      onChange={(e) => setPersonalFullName(e.target.value)}
                      placeholder="Ex: Manuel António Domingos"
                      className="input-konecta w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nome Público da Conta (Handle) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalHandle}
                      onChange={(e) => setPersonalHandle(e.target.value)}
                      placeholder="Ex: @manuelantonio"
                      className="input-konecta w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Documento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personalIdType}
                      onChange={(e) => setPersonalIdType(e.target.value)}
                      className="input-konecta w-full text-xs"
                    >
                      <option value="Bilhete de Identidade">Bilhete de Identidade (BI)</option>
                      <option value="Passaporte">Passaporte</option>
                      <option value="Carta de Condução">Carta de Condução</option>
                      <option value="Outro Documento Oficial">Outro Documento Oficial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Número do Documento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalIdNumber}
                      onChange={(e) => setPersonalIdNumber(e.target.value)}
                      placeholder="Ex: 004123456LA042"
                      className="input-konecta w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      País de Emissão <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalCountry}
                      onChange={(e) => setPersonalCountry(e.target.value)}
                      className="input-konecta w-full text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Justificação ou Descrição do Pedido
                  </label>
                  <textarea
                    rows={3}
                    value={personalReason}
                    onChange={(e) => setPersonalReason(e.target.value)}
                    placeholder="Explique a relevância do seu perfil ou a motivação da verificação..."
                    className="input-konecta w-full text-xs resize-none"
                  />
                </div>
              </div>

              {/* Upload do comprovativo */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider text-xs border-b pb-2">
                  2. Comprovativo de Pagamento
                </h3>

                <div className="border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center hover:border-amber-500 transition-colors bg-amber-50/30">
                  <label className="cursor-pointer block space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 shadow-xs mx-auto flex items-center justify-center text-amber-800">
                      <FileText size={18} />
                    </div>
                    <span className="block text-xs font-bold text-amber-900">
                      Anexar Comprovativo Bancário (PDF, JPG, PNG ou WEBP) <span className="text-red-500">*</span>
                    </span>
                    <span className="block text-[11px] text-gray-600">
                      {personalProofFile ? personalProofFile.name : 'Clique para selecionar o talão de transferência ou pagamento'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      className="hidden"
                      onChange={(e) => setPersonalProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !personalProofFile}
                  className="btn-primary py-3.5 px-8 text-xs font-bold flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {submitting ? 'A gravar no Supabase...' : 'Enviar Pedido de Verificação'}
                </button>
              </div>
            </form>
          ) : (
            /* Formulário Real: Verificação de Organização */
            <form onSubmit={handleOrgSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Verificação de Entidade</span>
                  <h2 className="text-2xl font-bold text-konecta-navy">Selo Institucional de Organização</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Voltar
                </button>
              </div>

              {/* Métodos de pagamento reais carregados do Supabase */}
              {renderPaymentMethodsSection(getPriceFor('organization'), getCurrencyFor('organization'))}

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider text-xs border-b pb-2">
                  1. Dados da Organização
                </h3>

                {userOrganizations.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Vincular a uma organização existente no KONECTA
                    </label>
                    <select
                      value={orgSelectedId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setOrgSelectedId(id);
                        const found = userOrganizations.find(o => o.id === id);
                        if (found) {
                          setOrgOfficialName(found.name || '');
                          setOrgCommercialName(found.name || '');
                          if (found.municipality) setOrgMunicipality(found.municipality);
                          if (found.description) setOrgDescription(found.description);
                        }
                      }}
                      className="input-konecta w-full text-xs"
                    >
                      <option value="">-- Nova / Não listada ainda --</option>
                      {userOrganizations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nome Oficial da Organização <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={orgOfficialName}
                      onChange={(e) => setOrgOfficialName(e.target.value)}
                      placeholder="Ex: Empresa de Tecnologias de Angola, Lda"
                      className="input-konecta w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nome Comercial / Designação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={orgCommercialName}
                      onChange={(e) => setOrgCommercialName(e.target.value)}
                      placeholder="Ex: KONECTA Labs"
                      className="input-konecta w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      NIF (Número de Identificação Fiscal)
                    </label>
                    <input
                      type="text"
                      value={orgNif}
                      onChange={(e) => setOrgNif(e.target.value)}
                      placeholder="Ex: 5418123456"
                      className="input-konecta w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      País <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={orgCountry}
                      onChange={(e) => setOrgCountry(e.target.value)}
                      className="input-konecta w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Município / Província <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={orgMunicipality}
                      onChange={(e) => setOrgMunicipality(e.target.value)}
                      placeholder="Ex: Luanda, Talatona"
                      className="input-konecta w-full text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Descrição da Atividade
                  </label>
                  <textarea
                    rows={3}
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Descreva a atividade da organização em Angola..."
                    className="input-konecta w-full text-xs resize-none"
                  />
                </div>
              </div>

              {/* Upload do comprovativo */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider text-xs border-b pb-2">
                  2. Comprovativo de Pagamento
                </h3>

                <div className="border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center hover:border-amber-500 transition-colors bg-amber-50/30">
                  <label className="cursor-pointer block space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 shadow-xs mx-auto flex items-center justify-center text-amber-800">
                      <FileText size={18} />
                    </div>
                    <span className="block text-xs font-bold text-amber-900">
                      Comprovativo Bancário (PDF, JPG, PNG ou WEBP) <span className="text-red-500">*</span>
                    </span>
                    <span className="block text-[11px] text-gray-600">
                      {orgProofFile ? orgProofFile.name : 'Clique para selecionar o talão de transferência ou pagamento'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      className="hidden"
                      onChange={(e) => setOrgProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !orgProofFile}
                  className="btn-gold py-3.5 px-8 text-xs font-bold flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {submitting ? 'A gravar no Supabase...' : 'Enviar Pedido Institucional'}
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        /* Aba Meus Pedidos */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
              <Clock size={18} className="text-konecta-gold" />
              Histórico de Pedidos de Verificação
            </h2>
            <button
              onClick={loadUserData}
              className="text-xs font-bold text-konecta-navy hover:underline"
            >
              Atualizar
            </button>
          </div>

          {loadingRequests ? (
            <div className="py-16 text-center">
              <Loader2 className="animate-spin mx-auto text-konecta-navy" size={24} />
              <p className="text-xs text-gray-400 mt-2">A carregar pedidos do Supabase...</p>
            </div>
          ) : (myRequests.profiles.length === 0 && myRequests.organizations.length === 0) ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h3 className="font-bold text-sm text-konecta-navy">Nenhum pedido de verificação registado</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Ainda não submeteu nenhum pedido de selo de verificação para a sua conta ou organização.
              </p>
              <button
                onClick={() => setActiveTab('request')}
                className="btn-primary py-2.5 px-5 text-xs font-bold mt-2"
              >
                Solicitar Verificação Agora
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pedidos Pessoais */}
              {myRequests.profiles.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        <User size={16} />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-konecta-navy">Selo Azul de Conta Pessoal</h4>
                        <span className="text-[10px] text-gray-400">
                          Submetido em {new Date(req.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-200">
                          <Clock size={12} /> Em Análise
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle size={12} className="text-emerald-600" /> Aprovado (Ativo)
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-red-200">
                          <XCircle size={12} className="text-red-600" /> Rejeitado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Taxa Paga</span>
                      <span className="font-bold text-gray-800">{req.price_amount} {req.currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Validade</span>
                      <span className="font-bold text-gray-800">{req.duration_days} dias</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Comprovativo</span>
                      <span className="text-emerald-700 font-medium">Gravado no bucket privado</span>
                    </div>
                  </div>

                  {req.status === 'approved' && (
                    <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <span>Parabéns! O seu perfil pessoal está verificado com o selo azul oficial no KONECTA Angola.</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Pedidos de Organização */}
              {myRequests.organizations.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-amber-50 text-konecta-gold flex items-center justify-center font-bold text-xs">
                        <Building size={16} />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-konecta-navy">
                          Selo Institucional: {req.organizations?.name || 'Organização'}
                        </h4>
                        <span className="text-[10px] text-gray-400">
                          Submetido em {new Date(req.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-200">
                          <Clock size={12} /> Em Análise
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle size={12} className="text-emerald-600" /> Aprovado (Ativo)
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-red-200">
                          <XCircle size={12} className="text-red-600" /> Rejeitado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Taxa Paga</span>
                      <span className="font-bold text-gray-800">{req.price_amount} {req.currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Validade</span>
                      <span className="font-bold text-gray-800">{req.duration_days} dias</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Comprovativo</span>
                      <span className="text-amber-700 font-medium">Gravado no bucket privado</span>
                    </div>
                  </div>

                  {req.status === 'approved' && (
                    <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-konecta-gold shrink-0" />
                      <span>A sua organização está autenticada com o selo institucional oficial.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
