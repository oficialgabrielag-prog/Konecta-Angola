import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useUI } from '../context/UIContext';

interface HelpSupportProps {
  onBack: () => void;
  onNavigateTab: (tab: string) => void;
}

export const HelpSupport: React.FC<HelpSupportProps> = ({ onBack, onNavigateTab }) => {
  const { showToast } = useUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const supportPhone = '976 848 444';
  const whatsappUrl = 'https://wa.me/244976848444';

  const faqs = [
    {
      category: 'Acesso',
      question: 'Como posso recuperar a minha palavra-passe se não consigo entrar?',
      answer: 'Na página de início de sessão, clica em "Esqueci a minha palavra-passe" ou contacta o nosso suporte oficial via WhatsApp para redefinição rápida de credenciais.'
    },
    {
      category: 'Conta',
      question: 'Como posso obter o selo oficial de verificação (Selo Azul ou Institucional)?',
      answer: 'Acede à opção "Verificação" no menu principal. Podes solicitar o selo pessoal ou institucional submetendo os dados necessários e o comprovativo de pagamento.'
    },
    {
      category: 'Mensagens',
      question: 'Por que motivo algumas mensagens não chegam ou aparecem pendentes?',
      answer: 'Verifica a tua ligação à internet. Se o problema persistir, certifica-te de que o destinatário não bloqueou a conversa ou de que as definições de privacidade permitem mensagens.'
    },
    {
      category: 'Segurança',
      question: 'O que devo fazer se notar actividade suspeita na minha conta?',
      answer: 'Recomendamos alterar imediatamente a palavra-passe nas Configurações de Segurança e terminar todas as sessões ativas noutros dispositivos. Se necessário, contacta o suporte.'
    },
    {
      category: 'Conteúdo',
      question: 'Como posso denunciar uma publicação ou utilizador inapropriado?',
      answer: 'Clica no menu de opções (três pontos) presente em qualquer publicação ou perfil e seleciona "Denunciar". A nossa equipa de moderação analisará o caso rapidamente.'
    }
  ];

  const filteredFaqs = faqs.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyPhone = () => {
    navigator.clipboard.writeText(supportPhone);
    showToast('Número de suporte copiado para a área de transferência!', 'success');
  };

  return (
    <div className="min-h-screen bg-konecta-bg py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar
          </button>
          <button
            onClick={() => onNavigateTab('policy-center')}
            className="text-xs font-bold text-konecta-gold bg-konecta-navy px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-xs"
          >
            Centro de Termos & Políticas ↗
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-12 border border-gray-200 shadow-sm space-y-10"
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-konecta-gold bg-konecta-gold/10 px-3 py-1 rounded-full border border-konecta-gold/20 inline-block">
              Atendimento Oficial · Angola
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight">
              Ajuda e Suporte KONECTA
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Estamos aqui para ajudar com qualquer questão sobre a tua conta, acesso, segurança ou publicações.
            </p>

            {/* Search FAQ */}
            <div className="pt-2 relative max-w-md mx-auto">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar dúvida ou problema..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-konecta-gold"
              />
            </div>
          </div>

          {/* Official Support Card */}
          <div className="bg-gradient-to-r from-konecta-navy to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest">Contacto Oficial de Suporte</span>
              <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-wider">{supportPhone}</h3>
              <p className="text-xs text-gray-300">Atendimento rápido via WhatsApp e chamadas em Angola.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={copyPhone}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copiar Número
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold text-xs py-3 px-6 shadow-lg flex items-center gap-2 font-bold"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                Contactar no WhatsApp
              </a>
            </div>
          </div>

          {/* Quick Help Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">lock_reset</span>
              </div>
              <h4 className="font-bold text-xs text-konecta-navy">Problemas de Acesso</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">Recuperação de contas, e-mails de confirmação e credenciais.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">verified_user</span>
              </div>
              <h4 className="font-bold text-xs text-konecta-navy">Verificação & Planos</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">Dúvidas sobre subscrições, selos e comprovativos de pagamento.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">shield</span>
              </div>
              <h4 className="font-bold text-xs text-konecta-navy">Segurança & Moderação</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">Denúncias de conteúdo, bloqueios e diretrizes da comunidade.</p>
            </div>
          </div>

          {/* FAQs Accordion */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-konecta-navy text-base">Perguntas Frequentes (FAQ)</h3>
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition-all">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-konecta-navy hover:bg-gray-50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-konecta-gold bg-konecta-navy px-2.5 py-1 rounded-md shrink-0">
                          {faq.category}
                        </span>
                        <span>{faq.question}</span>
                      </div>
                      <span className="material-symbols-outlined text-gray-400 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Support Call */}
          <div className="pt-6 border-t border-gray-100 text-center space-y-3">
            <p className="text-xs text-gray-500">Ainda precisas de assistência directa?</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-konecta-navy bg-konecta-gold hover:bg-yellow-400 py-3 px-6 rounded-2xl shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              Falar com o Suporte Oficial (976 848 444)
            </a>
          </div>

        </motion.div>
      </div>
    </div>
  );
};
