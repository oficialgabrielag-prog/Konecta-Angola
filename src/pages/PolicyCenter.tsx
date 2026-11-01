import React, { useState } from 'react';
import { motion } from 'motion/react';

interface PolicyCenterProps {
  onNavigateTab: (tab: string) => void;
}

export const PolicyCenter: React.FC<PolicyCenterProps> = ({ onNavigateTab }) => {
  const [activeDoc, setActiveDoc] = useState<string>('terms');
  const [searchDoc, setSearchDoc] = useState('');

  const documents = [
    { id: 'terms', title: '1. Termos de Utilização', icon: 'gavel', category: 'Geral' },
    { id: 'privacy', title: '2. Política de Privacidade', icon: 'lock', category: 'Dados' },
    { id: 'cookies', title: '3. Política de Cookies e Tecnologias', icon: 'cookie', category: 'Dados' },
    { id: 'guidelines', title: '4. Diretrizes da Comunidade', icon: 'groups', category: 'Conduta' },
    { id: 'messaging', title: '5. Política de Mensagens e Chats', icon: 'chat', category: 'Conduta' },
    { id: 'communities', title: '6. Política de Grupos e Comunidades', icon: 'forum', category: 'Conduta' },
    { id: 'content', title: '7. Política de Publicações e Conteúdos', icon: 'article', category: 'Conteúdo' },
    { id: 'minors', title: '8. Política de Segurança de Menores', icon: 'child_care', category: 'Segurança' },
    { id: 'moderation', title: '9. Política de Denúncias e Moderação', icon: 'verified_user', category: 'Segurança' },
    { id: 'blocks', title: '10. Política de Bloqueios e Restrições', icon: 'block', category: 'Segurança' },
    { id: 'copyright', title: '11. Direitos de Autor e Propriedade Intelectual', icon: 'copyright', category: 'Legal' },
    { id: 'events', title: '12. Política de Eventos e Workshops', icon: 'event', category: 'Serviços' },
    { id: 'organizations', title: '13. Organizações e Páginas Institucionais', icon: 'domain', category: 'Serviços' },
    { id: 'library', title: '14. Escritores, Livros e Biblioteca Digital', icon: 'menu_book', category: 'Serviços' },
    { id: 'accounts', title: '15. Contas, Segurança e Autenticação', icon: 'badge', category: 'Segurança' },
    { id: 'data_retention', title: '16. Retenção, Eliminação e Portabilidade', icon: 'delete_sweep', category: 'Dados' },
    { id: 'advertising', title: '17. Publicidade e Conteúdo Patrocinado', icon: 'campaign', category: 'Comercial' },
    { id: 'suspension', title: '18. Suspensão, Recursos e Encerramento', icon: 'report_problem', category: 'Legal' },
    { id: 'ai_policy', title: '19. Política de Inteligência Artificial', icon: 'smart_toy', category: 'Tecnologia' },
    { id: 'transparency', title: '20. Transparência e Responsabilidade', icon: 'policy', category: 'Geral' },
    { id: 'ecosystem', title: '21. Ecossistema KONECTA (CuneneVagas & VDN)', icon: 'hub', category: 'Ecossistema' }
  ];

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchDoc.toLowerCase()) ||
    d.category.toLowerCase().includes(searchDoc.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-10 text-center max-w-3xl mx-auto">
        <span className="text-xs font-black tracking-widest text-konecta-gold uppercase bg-konecta-gold/10 px-3 py-1.5 rounded-full border border-konecta-gold/20 inline-block mb-3">
          Transparência & Conformidade Legal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight">
          Centro de Políticas, Segurança & Normas
        </h1>
        <p className="text-gray-500 mt-3 text-sm leading-relaxed">
          Consulta os termos jurídicos, diretrizes de segurança, proteção de dados e funcionamento oficial do ecossistema KONECTA Angola.
        </p>

        {/* Search */}
        <div className="mt-6 relative max-w-md mx-auto">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            value={searchDoc}
            onChange={(e) => setSearchDoc(e.target.value)}
            placeholder="Pesquisar documento, termo ou política..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-xs shadow-xs focus:outline-none focus:border-konecta-gold"
          />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-3xl p-4 border border-gray-100 shadow-sm sticky top-24 shrink-0">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">Índice de Documentos</h3>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
            {filteredDocs.map((doc) => {
              const isActive = activeDoc === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setActiveDoc(doc.id);
                    window.scrollTo({ top: 200, behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all text-xs font-semibold ${
                    isActive
                      ? 'bg-konecta-navy text-white shadow-sm font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-konecta-gold' : 'text-gray-400'}`}>
                    {doc.icon}
                  </span>
                  <span className="truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document Content View */}
        <div className="flex-1 bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8 leading-relaxed text-gray-700 text-sm">
          
          {activeDoc === 'terms' && (
            <article className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold text-konecta-gold uppercase">Documento Oficial N.º 01</span>
                <h2 className="text-2xl font-extrabold text-konecta-navy mt-1">Termos de Utilização do KONECTA Angola</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>Data de Entrada em Vigor: 01 de Novembro de 2026</span>
                  <span>•</span>
                  <span>Última Atualização: 01 de Novembro de 2026</span>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">Artigo 1.º — Âmbito e Objeto</h3>
                <p>
                  O presente regulamento estabelece as condições jurídicas e operacionais para o acesso e utilização da rede social multifuncional KONECTA Angola, desenvolvida para promover a inovação, colaboração comunitária, projetos cívicos, comunicação interpessoal, partilha de conhecimento e interação digital em Angola.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">Artigo 2.º — Elegibilidade e Capacidade Jurídica</h3>
                <p>
                  1. O registo na plataforma é permitido a indivíduos com idade igual ou superior a 13 anos. Utilizadores entre os 13 e os 17 anos estão sujeitos às restrições acrescidas de proteção de menores estabelecidas no artigo 8.º das presentes políticas.
                </p>
                <p>
                  2. Ao criar uma conta, o utilizador garante prestar informações verdadeiras, exatas e atualizadas referentes à sua identidade e localização em Angola.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">Artigo 3.º — Responsabilidade do Utilizador</h3>
                <p>
                  O utilizador é o único e exclusivo responsável por todas as atividades realizadas através da sua conta, assim como pela veracidade, legalidade e adequação de todas as publicações, imagens, anexos, mensagens ou documentos partilhados na rede.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">Artigo 4.º — Condutas Proibidas</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Discurso de ódio, discriminação étnica, racial, religiosa ou de género.</li>
                  <li>Incitamento à violência, difamação ou assédio sistemático contra qualquer cidadão.</li>
                  <li>Partilha de conteúdos pornograficos, explicitamente sexuais ou de exploração infantil.</li>
                  <li>Publicação deliberada de desinformação ("fake news") com intuito de criar alarme social.</li>
                  <li>Tentativas de contornar mecanismos de autenticação ou exploração não autorizada de dados.</li>
                </ul>
              </section>
            </article>
          )}

          {activeDoc === 'privacy' && (
            <article className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold text-konecta-gold uppercase">Documento Oficial N.º 02</span>
                <h2 className="text-2xl font-extrabold text-konecta-navy mt-1">Política de Privacidade e Proteção de Dados Pessoais</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>Vigor: 01/11/2026</span>
                  <span>•</span>
                  <span>Última Atualização: 01/11/2026</span>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">1. Recolha de Dados Legítima</h3>
                <p>
                  O KONECTA recolhe exclusivamente os dados necessários ao fornecimento dos serviços: nome de exibição, endereço de correio eletrónico, nome de utilizador, província, município e conteúdos submetidos voluntariamente.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">2. Níveis Granulares de Visibilidade</h3>
                <p>
                  Cada utilizador dispõe de controlos reais para definir quem pode aceder às suas publicações (Todos, Seguidores, Família, Comunidades específicas, Pessoas específicas ou Apenas Eu) e ao seu perfil público.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">3. Não Partilha Sem Consentimento</h3>
                <p>
                  O KONECTA não vende nem cede dados pessoais a terceiros para fins comerciais. O armazenamento e transmissão são efetuados mediante protocolos encriptados no Supabase.
                </p>
              </section>
            </article>
          )}

          {activeDoc === 'minors' && (
            <article className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold text-konecta-gold uppercase">Documento Oficial N.º 08</span>
                <h2 className="text-2xl font-extrabold text-konecta-navy mt-1">Política de Segurança e Proteção de Menores</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>Vigor: 01/11/2026</span>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">1. Proteções Automáticas Acrescidas</h3>
                <p>
                  Contas pertencentes a menores de idade possuem por padrão restrições de visibilidade mais estritas, impedindo a aproximação e contacto direto por utilizadores adultos não ligados à rede de amigos aprovados.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">2. Proibição de Partilha de Localização Precisa</h3>
                <p>
                  Não é permitida a exposição pública de dados de localização geográfica em tempo real ou endereços residenciais de menores de idade.
                </p>
              </section>
            </article>
          )}

          {activeDoc === 'ecosystem' && (
            <article className="space-y-8">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold text-konecta-gold uppercase">Apresentação Estruturada</span>
                <h2 className="text-2xl font-extrabold text-konecta-navy mt-1">O Ecossistema Digital KONECTA Angola</h2>
                <p className="text-gray-500 text-xs mt-1">
                  Visão geral das plataformas interligadas que compõem o ecossistema digital.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Konecta */}
                <div className="p-6 rounded-2xl bg-konecta-navy text-white space-y-3 shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-konecta-gold text-konecta-navy font-black flex items-center justify-center text-lg">
                    K
                  </div>
                  <h3 className="font-extrabold text-base text-konecta-gold">KONECTA ANGOLA</h3>
                  <p className="text-xs text-gray-200 leading-relaxed">
                    Grande rede social multifuncional para projetos, ideias, comunidades, eventos, organizações, biblioteca digital e mensagens em tempo real.
                  </p>
                </div>

                {/* CuneneVagas */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center text-lg">
                    C
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900">CuneneVagas</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Plataforma especializada do ecossistema focada em ofertas de emprego, lojas, produtos, marketplace e oportunidades económicas.
                  </p>
                  <a
                    href="https://cunenevagas.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline pt-2"
                  >
                    Visitar cunenevagas.online
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>

                {/* VDN */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-black flex items-center justify-center text-lg">
                    V
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900">VDN — Vai Dar Namoro</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Plataforma do ecossistema voltada para interação social, encontros, relacionamentos interpessoais e descoberta de novas conexões.
                  </p>
                  <a
                    href="https://freevdn.netlify.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline pt-2"
                  >
                    Visitar freevdn.netlify.app
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>

              </div>
            </article>
          )}

          {/* Generic fallback content for any other selected document */}
          {!['terms', 'privacy', 'minors', 'ecosystem'].includes(activeDoc) && (
            <article className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-xs font-bold text-konecta-gold uppercase">Regulamento KONECTA</span>
                <h2 className="text-2xl font-extrabold text-konecta-navy mt-1">
                  {documents.find(d => d.id === activeDoc)?.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Entrada em vigor: 01 de Novembro de 2026 | Aplicável em todo o território de Angola
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">1. Disposições Gerais</h3>
                <p>
                  O presente regulamento define os padrões legais, de conduta e de segurança aplicáveis a esta vertente da rede social KONECTA Angola, alinhado às diretrizes de privacidade e proteção de dados em vigor no país.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">2. Responsabilidades dos Membros</h3>
                <p>
                  Todos os membros concordam em agir com transparência, urbanidade e respeito mútuo, abstendo-se de condutas abusivas, uso não autorizado de propriedade intelectual ou violação de privacidade de terceiros.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-konecta-navy">3. Denúncias e Moderação</h3>
                <p>
                  Qualquer violação identificada pode ser reportada através dos botões de denúncia existentes em cada publicação, perfil ou mensagem. A equipa de moderação procederá à análise rigorosa das evidências.
                </p>
              </section>
            </article>
          )}

        </div>

      </div>

    </div>
  );
};
