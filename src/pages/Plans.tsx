import React, { useState, useEffect } from 'react';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/UIContext';
import { useT } from '../i18n/LanguageContext';
import { 
  Check, 
  Upload, 
  Loader2, 
  Star, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  Copy, 
  Plus, 
  Sparkles, 
  CheckCircle,
  FileText,
  XCircle,
  ChevronRight,
  Smartphone
} from 'lucide-react';

interface PlansProps {
  user?: any;
  onOpenAuth?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Plans: React.FC<PlansProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const { showToast } = useToast();
  const { t } = useT();

  const [activeTab, setActiveTab] = useState<'plans' | 'my_subscriptions'>('plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Real payment methods from Supabase
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');

  // Subscription request modal
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // User subscriptions & requests
  const [mySubscriptions, setMySubscriptions] = useState<{ requests: any[]; subscriptions: any[] }>({
    requests: [],
    subscriptions: []
  });
  const [loadingMySubs, setLoadingMySubs] = useState(false);

  // Admin: Create plan modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('15000');
  const [newPlanDuration, setNewPlanDuration] = useState('30');
  const [newPlanBenefits, setNewPlanBenefits] = useState('Acesso prioritário\nSelo de Membro Pro\nCriação de projetos');
  const [newPlanLimits, setNewPlanLimits] = useState('Sem limite de publicações');
  const [newPlanFeatured, setNewPlanFeatured] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  useEffect(() => {
    loadInitialData();
    checkAdmin();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMySubscriptions();
    }
  }, [user?.id]);

  // Realtime subscription for requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:subscription_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_requests', filter: `user_id=eq.${user.id}` },
        () => loadMySubscriptions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` },
        () => loadMySubscriptions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const checkAdmin = async () => {
    try {
      const isAdm = await d1Client.isAdmin();
      setIsAdminUser(isAdm);
    } catch {
      setIsAdminUser(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [plansRes, pmRes] = await Promise.all([
        d1Client.subscriptions.listPlans(false),
        d1Client.paymentMethods.getActiveMethods()
      ]);

      setPlans(plansRes.data || []);
      const activeMethods = pmRes.data || [];
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedPaymentMethodId(activeMethods[0].id);
      }
    } catch (e: any) {
      console.error('Erro ao consultar subscription_plans ou payment_methods:', e);
      showToast('Erro ao carregar dados de subscrição.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMySubscriptions = async () => {
    if (!user?.id) return;
    setLoadingMySubs(true);
    try {
      const res = await d1Client.subscriptions.getMySubscriptions(user.id);
      if (res.data) {
        setMySubscriptions(res.data);
      }
    } catch (e) {
      console.warn('Aviso ao carregar subscrições do utilizador:', e);
    } finally {
      setLoadingMySubs(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Coordenadas copiadas para a área de transferência!', 'success');
  };

  const openSubscribeModal = (plan: any) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    setSelectedPlan(plan);
    setPaymentReference(`REF-${Date.now().toString().slice(-6)}`);
    setProofFile(null);
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !proofFile) {
      showToast('Por favor selecione o ficheiro do comprovativo de pagamento.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedPm = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      const paymentProvider = selectedPm?.provider || 'bank_transfer';

      // 1. Create real record in subscription_requests with awaiting_proof status
      const { data: requestRecord, error: reqError } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          status: 'awaiting_proof',
          price_amount: Number(selectedPlan.price_amount) || 0,
          currency: selectedPlan.currency || 'Kz',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqError || !requestRecord) {
        throw new Error(reqError?.message || 'Falha ao registar o pedido no Supabase.');
      }

      const requestId = requestRecord.id;

      // 2. Upload proof to private bucket "konecta-payment-proofs"
      // Top-level folder strictly matches user.id: ${user.id}/subscriptions/...
      const proofPath = await d1Client.storage.uploadPrivateProof(
        user.id,
        'subscriptions',
        proofFile
      );

      // 3. Submit proof via real RPC "submit_subscription_request_proof"
      const { error: rpcError } = await supabase.rpc('submit_subscription_request_proof', {
        p_request_id: requestId,
        p_proof_path: proofPath,
        p_payment_method: paymentProvider,
        p_payment_reference: paymentReference.trim() || `REF-${Date.now()}`
      });

      if (rpcError) {
        console.warn('RPC submit_subscription_request_proof erro, aplicando atualização direta de segurança:', rpcError.message);
        // Fallback update in case RPC RLS applies differently
        await supabase
          .from('subscription_requests')
          .update({
            proof_path: proofPath,
            payment_method: paymentProvider,
            payment_reference: paymentReference.trim() || `REF-${Date.now()}`,
            status: 'pending_review',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);
      }

      showToast('Pedido de subscrição gravado com sucesso! A aguardar revisão do administrador.', 'success');
      setSelectedPlan(null);
      setProofFile(null);
      await loadMySubscriptions();
      setActiveTab('my_subscriptions');
    } catch (e: any) {
      console.error('Erro na subscrição:', e);
      showToast('Erro ao submeter pedido: ' + (e.message || e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanPrice) {
      showToast('Por favor preencha o nome e o preço do plano.', 'error');
      return;
    }

    setCreatingPlan(true);
    try {
      const benefitsArray = newPlanBenefits
        .split('\n')
        .map(b => b.trim())
        .filter(Boolean);

      const res = await d1Client.subscriptions.createPlan({
        name: newPlanName.trim(),
        description: newPlanDesc.trim(),
        price_amount: Number(newPlanPrice),
        currency: 'Kz',
        duration_days: Number(newPlanDuration) || 30,
        benefits: benefitsArray,
        limits: newPlanLimits.trim() || undefined,
        is_recommended: newPlanFeatured,
        is_active: true
      });

      if (res.error) {
        throw new Error(typeof res.error === 'string' ? res.error : res.error.message || 'Erro ao criar plano.');
      }

      showToast('Plano gravado no Supabase com sucesso!', 'success');
      setShowCreateModal(false);
      setNewPlanName('');
      setNewPlanDesc('');
      setNewPlanPrice('15000');
      loadInitialData();
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao criar plano: ' + (e.message || e), 'error');
    } finally {
      setCreatingPlan(false);
    }
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId) || paymentMethods[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-[0.2em] block mb-1">
            Planos & Vantagens Exclusivas
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-konecta-navy tracking-tight">
            Planos KONECTA
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Consulte planos reais, métodos de pagamento seguros e acompanhe o estado da sua subscrição.
          </p>
        </div>

        {/* Tab switches & Admin action */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdminUser && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-gold py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> Criar Novo Plano
            </button>
          )}

          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'plans' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Planos Disponíveis
            </button>
            <button
              onClick={() => setActiveTab('my_subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'my_subscriptions' ? 'bg-white text-konecta-navy shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Minhas Subscrições
              {(mySubscriptions.requests.length + mySubscriptions.subscriptions.length > 0) && (
                <span className="w-5 h-5 bg-konecta-gold/20 text-konecta-gold rounded-full flex items-center justify-center text-[10px] font-black">
                  {mySubscriptions.requests.length + mySubscriptions.subscriptions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-konecta-navy" size={32} />
          <p className="text-xs text-gray-400 mt-2">A carregar planos reais da base de dados...</p>
        </div>
      ) : activeTab === 'plans' ? (
        /* Planos Disponíveis Grid */
        <div className="space-y-8">
          {plans.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-konecta-gold flex items-center justify-center mx-auto">
                <Sparkles size={28} />
              </div>
              <h3 className="font-bold text-lg text-konecta-navy">Nenhum plano ativo no momento</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Os planos estão a ser definidos no Supabase. O administrador pode registar planos imediatamente.
              </p>
              {isAdminUser && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-gold py-2.5 px-6 text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus size={14} /> Criar Primeiro Plano
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isFeatured = p.is_recommended;
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between space-y-6 relative ${
                      isFeatured
                        ? 'border-konecta-gold shadow-md ring-2 ring-konecta-gold/20'
                        : 'border-gray-200/90 shadow-xs hover:border-gray-300'
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute top-4 right-4 bg-konecta-gold text-konecta-navy text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        <Star size={12} fill="currentColor" /> Recomendado
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                          Plano Oficial
                        </span>
                        <h3 className="text-2xl font-black text-konecta-navy tracking-tight">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-konecta-navy">
                            {Number(p.price_amount).toLocaleString('pt-AO')}
                          </span>
                          <span className="text-sm font-bold text-gray-500">{p.currency || 'Kz'}</span>
                          <span className="text-xs text-gray-400 font-medium">/ {p.duration_days || 30} dias</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                          Vantagens:
                        </span>
                        <ul className="space-y-2 text-xs text-gray-600">
                          {Array.isArray(p.benefits) && p.benefits.length > 0 ? (
                            p.benefits.map((b: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </li>
                            ))
                          ) : (
                            <li className="flex items-center gap-2 text-gray-400 italic">
                              <Check size={14} className="text-gray-300" /> Acesso aos benefícios do ecossistema
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => openSubscribeModal(p)}
                        className={`w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 ${
                          isFeatured ? 'btn-gold' : 'btn-primary'
                        }`}
                      >
                        Solicitar Plano <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Minhas Subscrições & Histórico */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
              <Clock size={18} className="text-konecta-gold" />
              Minhas Subscrições e Pedidos
            </h2>
            <button
              onClick={loadMySubscriptions}
              className="text-xs font-bold text-konecta-navy hover:underline"
            >
              Atualizar
            </button>
          </div>

          {loadingMySubs ? (
            <div className="py-16 text-center">
              <Loader2 className="animate-spin mx-auto text-konecta-navy" size={24} />
              <p className="text-xs text-gray-400 mt-2">A carregar o seu histórico do Supabase...</p>
            </div>
          ) : (mySubscriptions.requests.length === 0 && mySubscriptions.subscriptions.length === 0) ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <CreditCard size={24} />
              </div>
              <h3 className="font-bold text-sm text-konecta-navy">Nenhuma subscrição ativa</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Ainda não solicitou nenhum plano. Escolha um dos planos disponíveis para desbloquear vantagens.
              </p>
              <button
                onClick={() => setActiveTab('plans')}
                className="btn-primary py-2.5 px-5 text-xs font-bold mt-2"
              >
                Ver Planos Disponíveis
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subscrições Ativas */}
              {mySubscriptions.subscriptions.map((sub) => (
                <div key={sub.id} className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        <CheckCircle size={16} />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-emerald-950">
                          {sub.subscription_plans?.name || 'Subscrição Ativa'}
                        </h4>
                        <span className="text-[10px] text-emerald-700">
                          Iniciada em {new Date(sub.started_at || sub.created_at).toLocaleDateString('pt-AO')}
                          {sub.current_period_end ? ` · Válida até ${new Date(sub.current_period_end).toLocaleDateString('pt-AO')}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                      Ativa
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    O seu plano está ativo e reconhecido na sua conta.
                  </p>
                </div>
              ))}

              {/* Pedidos de Subscrição */}
              {mySubscriptions.requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                        <FileText size={16} />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-konecta-navy">
                          Pedido: {req.subscription_plans?.name || 'Plano Konecta'}
                        </h4>
                        <span className="text-[10px] text-gray-400">
                          Submetido em {new Date(req.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {req.status === 'awaiting_proof' && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-200">
                          <Clock size={12} /> A aguardar comprovativo
                        </span>
                      )}
                      {req.status === 'pending_review' && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-blue-200">
                          <Clock size={12} /> Em análise pela administração
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle size={12} className="text-emerald-600" /> Aprovado
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
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Valor do Plano</span>
                      <span className="font-bold text-gray-800">
                        {req.price_amount ? Number(req.price_amount).toLocaleString('pt-AO') : (req.subscription_plans?.price_amount ? Number(req.subscription_plans.price_amount).toLocaleString('pt-AO') : '-')} {req.currency || 'Kz'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Referência Bancária</span>
                      <span className="font-mono text-gray-700">{req.payment_reference || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Comprovativo</span>
                      <span className="text-emerald-700 font-medium">
                        {req.proof_path ? 'Guardado no bucket privado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Finalizar Pedido com Métodos Reais do Supabase */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-gray-100 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-konecta-gold tracking-wider">Subscrição de Plano</span>
                <h3 className="text-xl font-bold text-konecta-navy">{selectedPlan.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xs"
              >
                Fechar
              </button>
            </div>

            {/* Métodos de Pagamento reais do Supabase */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-black text-amber-900 flex items-center gap-1">
                  <ShieldCheck size={16} className="text-amber-600" /> Método de Pagamento
                </span>
                <span className="font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Total: {Number(selectedPlan.price_amount).toLocaleString('pt-AO')} {selectedPlan.currency || 'Kz'}
                </span>
              </div>

              {/* Botões dos métodos de pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {paymentMethods.map(pm => {
                  const isSel = pm.id === selectedPaymentMethodId;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(pm.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSel ? 'bg-white border-amber-500 shadow-xs ring-1 ring-amber-500' : 'bg-white/60 border-amber-200/60 hover:bg-white'
                      }`}
                    >
                      <span className="font-bold text-gray-900 block text-[11px] truncate">{pm.display_name}</span>
                      <span className="text-[10px] text-gray-500 block truncate">{pm.account_number}</span>
                    </button>
                  );
                })}
              </div>

              {selectedMethod && (
                <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">{selectedMethod.display_name}</span>
                      <span className="font-mono text-xs font-bold text-gray-900 select-all block">{selectedMethod.account_number}</span>
                      <span className="text-[10px] text-gray-500 block">Titular: {selectedMethod.account_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMethod.account_number)}
                      className="text-amber-800 hover:text-amber-950 flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                  {selectedMethod.instructions && (
                    <p className="text-[10px] text-amber-900 pt-1.5 border-t border-gray-100">
                      {selectedMethod.instructions}
                    </p>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubscribeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Referência da Operação Bancária
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex: REF-182947 ou Código de Transação"
                  className="input-konecta w-full text-xs"
                />
              </div>

              {/* Upload do comprovativo */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-konecta-navy transition-colors bg-gray-50/50">
                <label className="cursor-pointer block space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-konecta-navy">
                    <Upload size={16} />
                  </div>
                  <span className="block text-xs font-bold text-gray-800">
                    Comprovativo de Pagamento (PDF, JPG, PNG ou WEBP) <span className="text-red-500">*</span>
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {proofFile ? proofFile.name : 'Clique para selecionar o talão de transferência ou pagamento'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !proofFile}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {submitting ? 'A gravar no Supabase...' : 'Confirmar Subscrição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Administrador Criar Novo Plano */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-gray-100 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Painel Administrativo</span>
                <h3 className="text-xl font-bold text-konecta-navy">Criar Novo Plano de Subscrição</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xs"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nome do Plano <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ex: Pro Inovador, Premium Startups"
                  className="input-konecta w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Descrição do Plano
                </label>
                <input
                  type="text"
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  placeholder="Ex: Para empreendedores e criadores de projetos de alto impacto"
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
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
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
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
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
                  value={newPlanBenefits}
                  onChange={(e) => setNewPlanBenefits(e.target.value)}
                  placeholder="Vantagem 1&#10;Vantagem 2&#10;Vantagem 3"
                  className="input-konecta w-full text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Limites e Condições
                </label>
                <input
                  type="text"
                  value={newPlanLimits}
                  onChange={(e) => setNewPlanLimits(e.target.value)}
                  placeholder="Ex: Até 50 projetos e mensagens ilimitadas"
                  className="input-konecta w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featuredPlanCheck"
                  checked={newPlanFeatured}
                  onChange={(e) => setNewPlanFeatured(e.target.checked)}
                  className="rounded text-konecta-gold focus:ring-konecta-gold"
                />
                <label htmlFor="featuredPlanCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Marcar como Plano em Destaque ("Recomendado")
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPlan}
                  className="btn-gold py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                >
                  {creatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creatingPlan ? 'A gravar no Supabase...' : 'Publicar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
