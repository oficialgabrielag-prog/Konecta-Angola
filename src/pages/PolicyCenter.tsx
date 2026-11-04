import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useUI } from '../context/UIContext';

interface PolicyCenterProps {
  onNavigateTab: (tab: string) => void;
  initialDocId?: string | null;
}

export const PolicyCenter: React.FC<PolicyCenterProps> = ({ onNavigateTab, initialDocId }) => {
  const { showToast } = useUI();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId || null);
  const [searchDoc, setSearchDoc] = useState('');

  const supportPhone = '976 848 444';
  const whatsappUrl = 'https://wa.me/244976848444';

  const documents = [
    {
      id: 'termos-de-utilizacao',
      number: '01',
      title: 'Termos de Utilização',
      icon: 'gavel',
      category: 'Geral',
      summary: 'Condições gerais, direitos e obrigações dos utilizadores da rede social KONECTA Angola.'
    },
    {
      id: 'privacidade',
      number: '02',
      title: 'Política de Privacidade',
      icon: 'lock',
      category: 'Dados',
      summary: 'Como recolhemos, tratamos e protegemos os dados pessoais dos cidadãos angolanos na plataforma.'
    },
    {
      id: 'cookies',
      number: '03',
      title: 'Política de Cookies',
      icon: 'cookie',
      category: 'Dados',
      summary: 'Utilização de cookies e tecnologias de armazenamento local para otimizar a experiência de navegação.'
    },
    {
      id: 'regras-da-comunidade',
      number: '04',
      title: 'Regras da Comunidade',
      icon: 'groups',
      category: 'Conduta',
      summary: 'Padrões de respeito mútuo, urbanidade e civilidade exigidos em todas as interações da comunidade.'
    },
    {
      id: 'mensagens',
      number: '05',
      title: 'Política de Mensagens',
      icon: 'chat',
      category: 'Conduta',
      summary: 'Normas de segurança, privacidade nas conversas privadas e prevenção de spam ou assédio.'
    },
    {
      id: 'seguranca',
      number: '06',
      title: 'Política de Segurança',
      icon: 'security',
      category: 'Segurança',
      summary: 'Mecanismos de encriptação, proteção de credenciais e boas práticas para salvaguardar a conta.'
    },
    {
      id: 'conteudos',
      number: '07',
      title: 'Política de Conteúdos e Publicações',
      icon: 'article',
      category: 'Conteúdo',
      summary: 'Diretrizes sobre o que pode ser partilhado no feed, ideias, projetos e reels na rede.'
    },
    {
      id: 'protecao-de-menores',
      number: '08',
      title: 'Protecção de Menores',
      icon: 'child_care',
      category: 'Segurança',
      summary: 'Proteções acrescidas, restrições e salvaguardas para utilizadores menores de idade.'
    },
    {
      id: 'direitos-de-autor',
      number: '09',
      title: 'Direitos de Autor',
      icon: 'copyright',
      category: 'Legal',
      summary: 'Proteção da propriedade intelectual, obras literárias, imagens, vídeos e criações dos membros.'
    },
    {
      id: 'denuncias',
      number: '10',
      title: 'Denúncias e Recursos',
      icon: 'verified_user',
      category: 'Segurança',
      summary: 'Como reportar conteúdos violadores e submeter recursos ou contestações de moderação.'
    },
    {
      id: 'eliminar-conta',
      number: '11',
      title: 'Eliminação de Conta',
      icon: 'delete_sweep',
      category: 'Dados',
      summary: 'Procedimentos para encerrar permanentemente a conta e remover dados associados.'
    }
  ];

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchDoc.toLowerCase()) ||
    d.summary.toLowerCase().includes(searchDoc.toLowerCase()) ||
    d.category.toLowerCase().includes(searchDoc.toLowerCase())
  );

  const handleShareDoc = (title: string) => {
    if (navigator.share) {
      navigator.share({
        title: `${title} — KONECTA Angola`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link do documento copiado!', 'success');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copiado para a área de transferência!', 'success');
  };

  const activeDocData = documents.find(d => d.id === selectedDocId);

  return (
    <div className="min-h-screen bg-konecta-bg py-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top bar with back/hub actions */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            {selectedDocId ? (
              <button
                onClick={() => setSelectedDocId(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar ao Centro de Políticas
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('home')}
                className="inline-flex items-center gap-2 text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar ao Início
              </button>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('help')}
            className="text-xs font-bold text-konecta-navy bg-konecta-gold hover:bg-yellow-400 px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Ajuda e Suporte (976 848 444)
          </button>
        </div>

        {/* HUB VIEW */}
        {!selectedDocId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-konecta-gold bg-konecta-gold/10 px-3.5 py-1.5 rounded-full border border-konecta-gold/20 inline-block">
                Transparência, Direitos & Normas
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-konecta-navy tracking-tight">
                Centro de Termos e Políticas
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                Consulte todos os regulamentos oficiais, políticas de privacidade, regras de comunidade e direitos aplicáveis na rede KONECTA Angola.
              </p>

              {/* Search */}
              <div className="pt-2 relative max-w-xl mx-auto">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="Pesquisar documento, termo ou política..."
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-xs shadow-xs focus:outline-none focus:border-konecta-gold"
                />
              </div>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs hover:border-konecta-gold hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-konecta-gold bg-konecta-navy px-2.5 py-1 rounded-md">
                        N.º {doc.number}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {doc.category}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-konecta-navy group-hover:text-konecta-gold transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-konecta-navy">
                    <span>Ler documento completo</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Support footer card */}
            <div className="bg-konecta-navy text-white rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl mt-12">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-black text-konecta-gold uppercase tracking-widest">Dúvidas Jurídicas ou de Suporte?</span>
                <h3 className="text-xl font-bold">Contacte a nossa assistência oficial em Angola</h3>
                <p className="text-xs text-gray-300">Atendimento disponível via WhatsApp: <strong className="text-konecta-gold">{supportPhone}</strong></p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold text-xs py-3.5 px-6 whitespace-nowrap shadow-lg font-bold"
              >
                Falar com o Suporte ↗
              </a>
            </div>
          </motion.div>
        )}

        {/* INDIVIDUAL DOCUMENT FULL PAGE VIEW */}
        {selectedDocId && activeDocData && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 sm:p-14 border border-gray-200 shadow-sm space-y-10"
          >
            {/* Header */}
            <div className="border-b border-gray-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black uppercase text-konecta-gold bg-konecta-navy px-3 py-1 rounded-full">
                    Documento Oficial N.º {activeDocData.number}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    · {activeDocData.category}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight">
                  {activeDocData.title}
                </h1>
                <p className="text-xs text-gray-400 mt-2">
                  Data de Entrada em Vigor: 01 de Novembro de 2026 · Última Atualização: 01 de Novembro de 2026
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleShareDoc(activeDocData.title)}
                  className="bg-gray-100 hover:bg-gray-200 text-konecta-navy text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">share</span>
                  Partilhar
                </button>
                <button
                  onClick={copyLink}
                  className="bg-gray-100 hover:bg-gray-200 text-konecta-navy text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copiar Link
                </button>
              </div>
            </div>

            {/* Document Body Content */}
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed max-w-4xl">
              
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-konecta-navy">Capítulo 1.º — Âmbito, Objeto e Enquadramento</h2>
                <p>
                  O presente documento estabelece as diretrizes normativas oficiais referentes a <strong>{activeDocData.title.toLowerCase()}</strong> no ecossistema da rede social KONECTA Angola. A utilização dos serviços da plataforma pressupõe a leitura, compreensão e aceitação integral dos padrões aqui definidos.
                </p>
                <p>
                  Este regulamento fundamenta-se nos princípios constitucionais e legais em vigor na República de Angola, assegurando a proteção dos direitos fundamentais, a liberdade responsável de expressão, a segurança digital e a ética comunitária.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-konecta-navy">Capítulo 2.º — Direitos e Deveres dos Membros</h2>
                <p>
                  1. Todos os utilizadores registados na rede KONECTA gozam de igualdade de tratamento perante as regras de moderação, tendo o direito de usufruir de um ambiente digital seguro, construtivo e livre de assédio.
                </p>
                <p>
                  2. Constitui dever imperativo de cada membro abster-se de publicar conteúdos falsos, difamatórios, ofensivos, de ódio étnico ou regional, bem como respeitar a privacidade e a integridade de terceiros.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-konecta-navy">Capítulo 3.º — Normas Operacionais Específicas</h2>
                <p>
                  Relativamente a <strong>{activeDocData.title.toLowerCase()}</strong>, o KONECTA Angola aplica rigorosamente os seguintes critérios técnicos e procedimentais:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-gray-600">
                  <li>Monitorização contínua de conformidade através de ferramentas automatizadas de moderação e análise de denúncias.</li>
                  <li>Possibilidade de aplicação de medidas cautelares em caso de infração grave, incluindo advertência, suspensão temporária ou encerramento definitivo da conta.</li>
                  <li>Salvaguarda do direito de recurso por parte do utilizador afetado, através do contacto direto com a assistência oficial.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-konecta-navy">Capítulo 4.º — Assistência e Suporte Oficial</h2>
                <p>
                  Em caso de dúvidas na interpretação destas normas ou para relatar qualquer irregularidade, os cidadãos e membros podem contactar o suporte oficial da plataforma pelo número e WhatsApp: <strong>{supportPhone}</strong> ({whatsappUrl}).
                </p>
              </section>

            </div>

            {/* Internal Links to Other Documents */}
            <div className="pt-8 border-t border-gray-100 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-konecta-navy">Outros Documentos do Centro de Políticas:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {documents.filter(d => d.id !== selectedDocId).slice(0, 6).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors border border-gray-100 flex items-center justify-between text-xs font-bold text-konecta-navy"
                  >
                    <span className="truncate">{doc.title}</span>
                    <span className="material-symbols-outlined text-xs text-konecta-gold">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => setSelectedDocId(null)}
                className="btn-secondary text-xs py-3 px-6"
              >
                ← Voltar à Lista de Políticas
              </button>
              <button
                onClick={() => onNavigateTab('home')}
                className="btn-primary text-xs py-3 px-6"
              >
                Ir para o Início
              </button>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
};
