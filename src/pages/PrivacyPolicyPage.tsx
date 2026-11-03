import React from 'react';
import { motion } from 'motion/react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-konecta-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar à Plataforma
          </button>
          <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest bg-konecta-navy px-3 py-1.5 rounded-full">
            Documento Oficial N.º 02
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-sm space-y-8"
        >
          <div className="border-b border-gray-100 pb-6">
            <span className="text-xs font-bold text-konecta-gold uppercase">Privacidade & Conformidade</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy mt-1">Política de Privacidade do KONECTA Angola</h1>
            <p className="text-xs text-gray-400 mt-2">Data de entrada em vigor: 01 de Novembro de 2026</p>
          </div>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">1. Introdução e Compromisso</h2>
              <p>
                O KONECTA Angola ("nós", "nosso" ou "Plataforma") respeita profundamente a privacidade dos seus utilizadores ("membros", "inovadores", "organizações") e assume o compromisso intransigente de proteger os dados pessoais disponibilizados na nossa rede social de colaboração e inovação.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">2. Recolha de Dados Pessoais</h2>
              <p>
                Recolhemos apenas as informações essenciais para o funcionamento e personalização da experiência na comunidade angolana:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>Nome completo e nome de exibição público.</li>
                <li>Endereço de correio eletrónico para autenticação e notificações.</li>
                <li>Localização (Província e Município em Angola) para contextualização comunitária.</li>
                <li>Biografia, interesses, fotografia de perfil e imagens de publicações ou reels autorizados.</li>
                <li>Comprovativos de pagamento submetidos de forma segura para verificação de conta ou subscrições de planos (armazenados em diretórios privados).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">3. Finalidade do Tratamento de Dados</h2>
              <p>
                Os dados recolhidos são tratados estritamente para:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>Garantir a segurança e autenticidade das contas de utilizador.</li>
                <li>Facilitar a interação em publicações, ideias, projetos, desafios e mensagens privadas.</li>
                <li>Processar pedidos de selos de verificação e subscrições oficiais.</li>
                <li>Melhorar a estabilidade, desempenho e segurança técnica da aplicação.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">4. Controlo de Visibilidade e Privacidade</h2>
              <p>
                O utilizador tem controlo total sobre a visibilidade dos seus conteúdos e publicações, podendo definir quem visualiza as suas partilhas (público, seguidores, apenas eu ou comunidades restritas).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">5. Segurança e Não Partilha Comercial</h2>
              <p>
                O KONECTA não comercializa, aluga ou cede dados pessoais a entidades terceiras para fins publicitários. Todos os dados são armazenados e protegidos com protocolos modernos de encriptação.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-konecta-navy">6. Contacto</h2>
              <p>
                Para esclarecimentos adicionais sobre a nossa política de privacidade, os utilizadores podem contactar a administração através do painel de suporte ou do e-mail oficial da plataforma.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={onBack}
              className="btn-primary text-xs py-3 px-8"
            >
              Compreendido e Voltar
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
