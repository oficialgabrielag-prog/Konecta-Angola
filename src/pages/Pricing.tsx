import React, { useState } from 'react';
import { motion } from 'motion/react';
import { d1Client } from '../lib/d1Client';

interface PricingProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Comunidade Grátis',
      kicker: 'Acesso Livre',
      description: 'Ideal para cidadãos, estudantes e inovadores a iniciar a sua jornada.',
      priceMonthly: '0 Kz',
      priceAnnual: '0 Kz',
      period: 'Para sempre',
      popular: false,
      buttonText: 'Plano Ativo',
      features: [
        'Criar perfil público e biografia',
        'Publicar ideias e projetos comunitários',
        'Participar em desafios e votações',
        'Aderir a comunidades e eventos locais',
        'Enviar mensagens privadas e comentários',
        'Notificações em tempo real'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Inovador',
      kicker: 'Mais Relevância',
      description: 'Para empreendedores, investigadores e startups que procuram aceleração e parceiros.',
      priceMonthly: '5.000 Kz',
      priceAnnual: '45.000 Kz',
      period: billingCycle === 'annual' ? '/ano (Poupa 25%)' : '/mês',
      popular: true,
      buttonText: 'Solicitar Plano Pro',
      features: [
        'Tudo do Plano Grátis',
        'Selo de Inovador Verificado ✓',
        'Destaque de ideias no Feed Principal',
        'Estatísticas avançadas de visitas e apoios',
        'Criação de comunidades ilimitadas',
        'Acesso prioritário a mentores e fundos'
      ]
    },
    {
      id: 'org',
      name: 'Organização & Empresa',
      kicker: 'Impacto Social',
      description: 'Para empresas, ONGs e instituições públicas que patrocinam e lançam desafios.',
      priceMonthly: '25.000 Kz',
      priceAnnual: '240.000 Kz',
      period: billingCycle === 'annual' ? '/ano (Poupa 20%)' : '/mês',
      popular: false,
      buttonText: 'Contactar Parcerias',
      features: [
        'Tudo do Plano Pro Inovador',
        'Lançamento de Desafios com Prémios',
        'Painel institucional de métricas de impacto',
        'Exportação de relatórios comunitários',
        'Gestão de múltiplos gestores de conta',
        'Suporte técnico e de comunicação dedicado'
      ]
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      if (onNavigateTab) onNavigateTab('explore');
      return;
    }

    if (!user) {
      onOpenAuth();
      return;
    }

    setSelectedPlan(planId);
    setSubmitting(true);
    setMessage(null);

    try {
      await d1Client.profiles.update(user.id, {
        subscription_plan: planId,
        subscription_status: 'pending'
      });

      setMessage(`O teu pedido para o plano ${planId.toUpperCase()} foi registado com o estado "Pendente". A nossa equipa entrará em contacto com as instruções de pagamento seguro.`);
    } catch (err: any) {
      console.warn('Aviso ao solicitar plano:', err?.message || err);
      setMessage(err?.message || 'Erro ao registar intenção de subscrição.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-12 text-center max-w-3xl mx-auto">
        <span className="feature-kicker">Crescimento Sustentável</span>
        <h1 className="hero-title">Planos KONECTA</h1>
        <p className="text-gray-500 mt-3 text-base leading-relaxed">
          O acesso essencial à comunidade KONECTA é e continuará a ser 100% gratuito. Os planos Pro e Organização oferecem ferramentas avançadas para acelerar o teu impacto em Angola.
        </p>

        {/* Toggle Annual/Monthly */}
        <div className="mt-8 inline-flex items-center gap-2 p-1.5 bg-gray-100 rounded-full border border-gray-200">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              billingCycle === 'monthly' ? 'bg-konecta-navy text-white shadow-sm' : 'text-gray-500 hover:text-konecta-navy'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-konecta-navy text-white shadow-sm' : 'text-gray-500 hover:text-konecta-navy'
            }`}
          >
            <span>Anual</span>
            <span className="bg-konecta-gold text-konecta-navy text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
              Desconto
            </span>
          </button>
        </div>
      </header>

      {message && (
        <div className="max-w-2xl mx-auto mb-10 p-5 bg-konecta-navy/5 border border-konecta-gold/40 rounded-2xl text-xs text-konecta-navy flex items-start gap-3 shadow-xs">
          <span className="material-symbols-outlined text-konecta-gold text-xl shrink-0">info</span>
          <div className="leading-relaxed">
            <p className="font-bold mb-1">Estado do Pedido</p>
            <p>{message}</p>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isPopular = plan.popular;
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-konecta flex flex-col justify-between p-8 relative transition-all ${
                isPopular 
                  ? 'border-2 border-konecta-gold shadow-xl bg-white scale-102' 
                  : 'border border-gray-200 shadow-sm bg-white'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-konecta-gold text-konecta-navy text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
                  Mais Recomendado
                </span>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold block mb-1">
                  {plan.kicker}
                </span>
                <h3 className="text-2xl font-black text-konecta-navy mb-2">{plan.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 min-h-[36px]">
                  {plan.description}
                </p>

                <div className="mb-8 pt-4 border-t border-gray-100 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-konecta-navy">{price}</span>
                  <span className="text-xs text-gray-400 font-medium">{plan.period}</span>
                </div>

                <div className="space-y-3 mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                    Benefícios Incluídos:
                  </span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600">
                      <span className="material-symbols-outlined text-konecta-gold text-[16px] shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={submitting && selectedPlan === plan.id}
                className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                  isPopular 
                    ? 'btn-gold' 
                    : plan.id === 'free'
                    ? 'bg-gray-100 text-konecta-navy hover:bg-gray-200'
                    : 'btn-primary'
                }`}
              >
                {submitting && selectedPlan === plan.id ? 'A registar...' : plan.buttonText}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Integration Note */}
      <section className="mt-16 bg-gray-50 rounded-3xl p-8 border border-gray-200 max-w-4xl mx-auto space-y-3">
        <h4 className="text-sm font-bold text-konecta-navy flex items-center gap-2">
          <span className="material-symbols-outlined text-konecta-gold">verified_user</span>
          Informaçao de Pagamento Transparente
        </h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Os pagamentos em Angola serão processados em kwanzas (Kz) através do Multicaixa Express / GPO ou transferência bancária confirmada. Não efetuamos débitos automáticos não autorizados. Os planos institucionais exigem validação prévia de NIF.
        </p>
      </section>

    </div>
  );
};
