import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Challenge } from '../types';
import { d1Client } from '../lib/d1Client';

interface ChallengesProps {
  challenges: Challenge[];
  user: any;
  onOpenAuth: () => void;
  onParticipateChallenge: () => void;
}

export const Challenges: React.FC<ChallengesProps> = ({
  challenges,
  user,
  onOpenAuth,
  onParticipateChallenge,
}) => {
  const [participatedMap, setParticipatedMap] = useState<Record<string, boolean>>({});
  const [votesMap, setVotesMap] = useState<Record<string, boolean>>({});
  const [votesCountMap, setVotesCountMap] = useState<Record<string, number>>({});
  const [participantsCountMap, setParticipantsCountMap] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Create Challenge Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Educação');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadParticipationAndVotes();
  }, [challenges, user]);

  const loadParticipationAndVotes = async () => {
    if (challenges.length === 0) return;

    try {
      const d1ChallengesRes = await d1Client.challenges.list();

      const pCount: Record<string, number> = {};
      const vCount: Record<string, number> = {};
      const userPMap: Record<string, boolean> = {};

      challenges.forEach(c => {
        const d1Challenge = d1ChallengesRes.data?.data?.find((dc: any) => dc.id === c.id);
        pCount[c.id] = d1Challenge?.participants_count || c.participants_count || 0;
        vCount[c.id] = d1Challenge?.votes_count || 0;
      });

      setParticipantsCountMap(pCount);
      setVotesCountMap(vCount);
      setParticipatedMap(userPMap);
    } catch (err: any) {
      console.warn('Aviso ao carregar participações de desafios (D1):', err?.message || err);
    }
  };

  const handleToggleParticipation = async (challengeId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const isParticipating = participatedMap[challengeId];
    setActionLoading(prev => ({ ...prev, [challengeId]: true }));

    // Optimistic UI update
    setParticipatedMap(prev => ({ ...prev, [challengeId]: !isParticipating }));
    setParticipantsCountMap(prev => ({
      ...prev,
      [challengeId]: isParticipating 
        ? Math.max(0, (prev[challengeId] || 1) - 1) 
        : (prev[challengeId] || 0) + 1
    }));

    try {
      if (isParticipating) {
        await d1Client.challenges.leave(challengeId);
      } else {
        await d1Client.challenges.join(challengeId);
      }
      onParticipateChallenge();
    } catch (err: any) {
      console.warn('Aviso ao participar no desafio:', err?.message || err);
    } finally {
      setActionLoading(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleToggleVote = async (challengeId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const hasVoted = votesMap[challengeId];
    setVotesMap(prev => ({ ...prev, [challengeId]: !hasVoted }));
    setVotesCountMap(prev => ({
      ...prev,
      [challengeId]: hasVoted 
        ? Math.max(0, (prev[challengeId] || 1) - 1) 
        : (prev[challengeId] || 0) + 1
    }));
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!title.trim() || !desc.trim() || creating) return;

    setCreating(true);
    try {
      const payload = {
        title: title.trim(),
        description: desc.trim(),
        category,
        goal: goal.trim() || undefined,
        deadline: deadline || undefined,
        status: 'open',
        user_id: user.id
      };

      const res = await d1Client.challenges.create(payload);
      if (res.error) {
        throw new Error(res.error.message || 'Erro ao criar desafio.');
      }

      setShowModal(false);
      setTitle('');
      setDesc('');
      setGoal('');
      setDeadline('');
      onParticipateChallenge();
    } catch (err: any) {
      console.warn('Aviso ao criar desafio:', err?.message || err);
      alert(err?.message || 'Erro ao criar desafio no Cloudflare D1.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="feature-kicker">Resolução de Problemas Reais</span>
          <h1 className="hero-title">Desafios de Inovação</h1>
          <p className="text-gray-500 mt-3 max-w-2xl leading-relaxed">
            Problemas prioritários identificados pela rede angolana que necessitam de soluções urgentes e colaborativas.
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowModal(true);
          }}
          className="btn-gold whitespace-nowrap text-xs py-3.5 px-7 shadow-md self-start md:self-auto"
        >
          + Propor Novo Desafio
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {challenges.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-5xl text-gray-200 mb-4">emoji_events</span>
            <p className="text-gray-400 italic">De momento não existem desafios ativos no Supabase. Sê o primeiro a lançar um desafio!</p>
            <button
              onClick={() => user ? setShowModal(true) : onOpenAuth()}
              className="btn-primary mt-6 text-xs"
            >
              Criar Desafio Comunitário
            </button>
          </div>
        ) : (
          challenges.map((challenge) => {
            const isParticipating = participatedMap[challenge.id];
            const hasVoted = votesMap[challenge.id];
            const pCount = participantsCountMap[challenge.id] || 0;
            const vCount = votesCountMap[challenge.id] || 0;
            const isLoading = actionLoading[challenge.id];

            return (
              <motion.article 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={challenge.id} 
                className="card-konecta flex flex-col justify-between h-full p-8 shadow-sm border border-gray-100 hover:border-konecta-gold/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest px-2.5 py-1 bg-konecta-navy/5 rounded-md">
                        {challenge.category}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${challenge.status === 'open' ? 'text-green-600' : 'text-gray-400'}`}>
                        {challenge.status === 'open' ? '● Aberto a Soluções' : 'Concluído'}
                      </span>
                    </div>
                    <div className="metadata-text">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {challenge.deadline ? `Até ${new Date(challenge.deadline).toLocaleDateString('pt-AO')}` : 'Sem prazo limite'}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-konecta-navy mb-4 leading-tight">
                    {challenge.title}
                  </h3>

                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    {challenge.description}
                  </p>

                  {challenge.goal && (
                    <div className="p-4 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-navy block mb-1">
                        Meta Principal a Atingir
                      </span>
                      <p className="text-xs text-gray-600 leading-relaxed italic">
                        {challenge.goal}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-konecta-navy">{pCount}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Participantes</span>
                    </div>

                    <button
                      onClick={() => handleToggleVote(challenge.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        hasVoted 
                          ? 'bg-red-50 text-red-600 border border-red-100' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                      title={hasVoted ? 'Remover voto' : 'Votar na relevância deste desafio'}
                    >
                      <span className="material-symbols-outlined text-[16px] text-red-500">
                        {hasVoted ? 'favorite' : 'favorite_border'}
                      </span>
                      <span>{vCount} Votos</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleToggleParticipation(challenge.id)}
                    disabled={isLoading || challenge.status !== 'open'}
                    className={`btn-primary px-6 py-2.5 text-xs transition-all ${
                      isParticipating 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                        : ''
                    }`}
                  >
                    {isLoading ? (
                      'A processar...'
                    ) : isParticipating ? (
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Inscrito
                      </span>
                    ) : (
                      'Aceitar Desafio'
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Propose Challenge Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Propor Novo Desafio Comunitário</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-konecta-navy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Título do Desafio
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Redução de perdas de colheita no Huambo"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Problema e Contexto
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Descreve detalhadamente qual é a dificuldade enfrentada e quem é afetado..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="Agricultura">Agricultura</option>
                      <option value="Educação">Educação</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Energia Limpa">Energia Limpa</option>
                      <option value="Cidadania">Cidadania</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Data Limite
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Meta Principal (Opcional)
                  </label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ex: Impactar 500 pequenos produtores rurais"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !title.trim() || !desc.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {creating ? 'A registar...' : 'Publicar Desafio'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
