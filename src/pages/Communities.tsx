import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Community, CommunityMember, Profile } from '../types';
import { supabase } from '../lib/supabaseClient';

interface CommunitiesProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
  setActiveCommunitySlug: (slug: string) => void;
  setActiveCommunityId: (id: string) => void;
}

export const Communities: React.FC<CommunitiesProps> = ({ user, onOpenAuth, onNavigateTab, setActiveCommunitySlug, setActiveCommunityId }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User membership tracking
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Community Details Modal
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Create Community Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [user]);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*, community_members(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const comList = (data || []).map(c => ({
        ...c,
        member_count: c.community_members?.length || 0
      }));
      setCommunities(comList);

      const counts: Record<string, number> = {};
      comList.forEach((c: any) => {
        counts[c.id] = c.member_count;
      });

      setMemberCounts(counts);
      setError(null);
    } catch (err: any) {
      console.warn('Aviso ao carregar comunidades:', err?.message || err);
      setError('Não foi possível carregar as comunidades de momento.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMembership = async (e: React.MouseEvent, communityId: string) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }

    const isMember = joinedMap[communityId];
    setActionLoading(prev => ({ ...prev, [communityId]: true }));

    setJoinedMap(prev => ({ ...prev, [communityId]: !isMember }));
    setMemberCounts(prev => ({
      ...prev,
      [communityId]: isMember 
        ? Math.max(0, (prev[communityId] || 1) - 1) 
        : (prev[communityId] || 0) + 1
    }));

    try {
      if (isMember) {
        await supabase.from('community_members').delete().match({ community_id: communityId, user_id: user.id });
      } else {
        await supabase.from('community_members').insert({ community_id: communityId, user_id: user.id, joined_at: new Date().toISOString() });
      }
    } catch (err: any) {
      console.warn('Aviso ao aderir/sair da comunidade:', err?.message || err);
    } finally {
      setActionLoading(prev => ({ ...prev, [communityId]: false }));
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!name.trim() || !description.trim() || creating) return;

    setCreating(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim(),
          owner_id: user.id,
          slug,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: user.id,
        joined_at: new Date().toISOString()
      });

      setShowCreateModal(false);
      setName('');
      setDescription('');
      fetchCommunities();
    } catch (err: any) {
      console.warn('Aviso ao criar comunidade:', err?.message || err);
      alert(err?.message || 'Erro ao criar comunidade.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="feature-kicker">Hub de Conexão</span>
          <h1 className="hero-title">Comunidades Temáticas</h1>
          <p className="text-gray-500 mt-3 max-w-2xl leading-relaxed">
            Junta-te a grupos focados em interesses e setores específicos em Angola para trocar conhecimento, debater e criar alianças.
          </p>
        </div>
        <button 
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowCreateModal(true);
          }}
          className="btn-gold whitespace-nowrap text-xs py-3.5 px-6 shadow-md self-start md:self-auto"
        >
          + Criar Nova Comunidade
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center max-w-lg mx-auto border border-red-100">
          <p className="font-bold">Erro ao carregar comunidades</p>
          <p className="text-sm mt-2">{error}</p>
          <button onClick={fetchCommunities} className="mt-4 btn-primary py-2 text-xs">
            Tentar Novamente
          </button>
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[32px] border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">groups</span>
          <p className="text-gray-500 font-medium">Ainda não existem comunidades criadas.</p>
          <p className="text-xs text-gray-400 mt-1">Sê o primeiro a fundar um grupo temático para a sua área.</p>
          <button 
            onClick={() => user ? setShowCreateModal(true) : onOpenAuth()}
            className="mt-6 btn-gold text-xs py-3 px-8"
          >
            Fundar Primeira Comunidade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communities.map((community) => {
            const isMember = joinedMap[community.id];
            const membersTotal = memberCounts[community.id] || 0;
            const isLoading = actionLoading[community.id];

            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setActiveCommunityId(community.id);
                  if (community.slug) setActiveCommunitySlug(community.slug);
                  onNavigateTab('community-detail');
                }}
                className="card-konecta flex flex-col justify-between h-full p-6 sm:p-8 cursor-pointer hover:border-konecta-gold/50 transition-all shadow-sm group"
              >
                <div>
                  <div className="h-40 bg-gradient-to-br from-konecta-navy/10 to-konecta-gold/10 rounded-2xl mb-6 overflow-hidden relative flex items-center justify-center">
                    {community.avatar_url ? (
                      <img src={community.avatar_url} alt={community.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-konecta-navy">
                        <span className="material-symbols-outlined text-3xl text-konecta-gold">groups</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-konecta-navy shadow-sm">
                      {membersTotal} {membersTotal === 1 ? 'Membro' : 'Membros'}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-konecta-navy mb-2 group-hover:text-konecta-gold transition-colors">
                    {community.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                    {community.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  {community.owner_id === user?.id ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommunitySlug(community.slug || '');
                        setActiveCommunityId(community.id);
                        onNavigateTab('community-settings');
                      }}
                      className="text-xs font-bold text-konecta-navy hover:text-konecta-gold"
                    >
                      Configurar
                    </button>
                  ) : <span />}
                  <button 
                    onClick={(e) => handleToggleMembership(e, community.id)}
                    disabled={isLoading}
                    className={`btn-primary py-2 px-6 text-xs transition-all ${
                      isMember 
                        ? 'bg-green-600 hover:bg-red-500 text-white' 
                        : ''
                    }`}
                  >
                    {isLoading ? '...' : isMember ? 'Aderido ✓' : 'Aderir'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Community Details Modal */}
      <AnimatePresence>
        {selectedCommunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold">Comunidade Temática</span>
                  <h3 className="text-2xl font-black text-konecta-navy mt-1">{selectedCommunity.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedCommunity(null)}
                  className="text-gray-400 hover:text-konecta-navy p-1"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy mb-2">Sobre esta Comunidade</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedCommunity.description}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">
                    Membros Ativos ({communityMembers.length})
                  </h4>
                  <button
                    onClick={(e) => handleToggleMembership(e, selectedCommunity.id)}
                    className="btn-primary py-1.5 px-5 text-xs"
                  >
                    {joinedMap[selectedCommunity.id] ? 'Sair da Comunidade' : 'Aderir a esta Comunidade'}
                  </button>
                </div>

                {loadingMembers ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-navy"></div>
                  </div>
                ) : communityMembers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">Ainda sem membros listados.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {communityMembers.map((m) => (
                      <div key={m.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {m.profiles?.avatar_url ? (
                            <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                              {m.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-konecta-navy truncate">
                            {m.profiles?.full_name || 'Membro Konecta'}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase">
                            {m.profiles?.province || 'Angola'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Community Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Fundar Nova Comunidade</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-konecta-navy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateCommunity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Nome da Comunidade
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Agrotech Angola, Mulheres na Ciência..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Missão e Propósito
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explica aos membros qual é o foco do grupo e que tipo de colaborações pretendem construir..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim() || !description.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {creating ? 'A criar...' : 'Criar Comunidade'}
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
