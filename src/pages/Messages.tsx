import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { Conversation, Message, Profile } from '../types';

interface MessagesProps {
  user: any;
  onOpenAuth: () => void;
}

export const Messages: React.FC<MessagesProps> = ({ user, onOpenAuth }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // New Conversation Modal
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [membersList, setMembersList] = useState<Profile[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [startingConv, setStartingConv] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Periodic poll for messages in selected conversation
  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.id);

    const pollInterval = setInterval(() => {
      fetchMessages(selectedConv.id, true);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [selectedConv]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const d1Res = await d1Client.messages.listConversations();
      const list = d1Res.data?.data || [];
      setConversations(list);
      if (!selectedConv && list.length > 0) {
        setSelectedConv(list[0]);
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar conversas:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string, background = false) => {
    try {
      const d1Res = await d1Client.messages.getMessages(convId);
      const list = d1Res.data?.data || [];
      setMessages(list);
    } catch (err: any) {
      if (!background) console.warn('Aviso ao carregar mensagens:', err?.message || err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || sending) return;

    const contentText = newMessage.trim();
    setSending(true);

    try {
      const res = await d1Client.messages.sendMessage(selectedConv.id, contentText);
      const msg = res.data?.data;
      if (msg) {
        setMessages(prev => [...prev, msg]);
      }
      setNewMessage('');
      fetchConversations();
    } catch (err: any) {
      console.warn('Aviso ao enviar mensagem:', err?.message || err);
    } finally {
      setSending(false);
    }
  };

  const handleSearchMembers = async (queryText: string) => {
    setSearchMember(queryText);
    if (queryText.trim().length < 2) {
      setMembersList([]);
      return;
    }

    setSearchingMembers(true);
    try {
      const d1Res = await d1Client.search.global(queryText.trim());
      setMembersList(d1Res.data?.data?.profiles || []);
    } catch (err: any) {
      console.warn('Aviso ao pesquisar membros:', err?.message || err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleStartConversationWith = async (targetUser: Profile) => {
    setStartingConv(true);
    try {
      const existing = conversations.find(c => 
        c.participants?.some(p => p.id === targetUser.id)
      );

      if (existing) {
        setSelectedConv(existing);
        setShowNewConvModal(false);
        setStartingConv(false);
        return;
      }

      const res = await d1Client.messages.startConversation(targetUser.id);
      if (!res.data?.data) {
        throw new Error(res.error?.message || 'Falha ao iniciar conversa no Cloudflare D1.');
      }

      const newConv = res.data.data;
      setShowNewConvModal(false);
      setSearchMember('');
      setMembersList([]);
      await fetchConversations();
      setSelectedConv({
        ...newConv,
        participants: [targetUser]
      });
    } catch (err: any) {
      console.warn('Aviso ao iniciar conversa:', err?.message || err);
      alert(err?.message || 'Erro ao criar conversa.');
    } finally {
      setStartingConv(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-konecta-navy/5 flex items-center justify-center mx-auto mb-4 text-konecta-navy">
          <span className="material-symbols-outlined text-3xl">forum</span>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-konecta-navy">Mensagens Privadas</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Inicia sessão na KONECTA para conversar em tempo real com líderes de projetos e inovadores da rede.
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">
          Entrar na Conta →
        </button>
      </div>
    );
  }

  const otherParticipant = selectedConv?.participants?.find(p => p.id !== user.id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      <div className="flex flex-col lg:flex-row h-[75vh] min-h-[580px] card-konecta p-0 overflow-hidden shadow-lg border border-gray-100 bg-white">
        
        {/* Sidebar: Conversation List */}
        <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-konecta-gold text-[22px]">chat</span>
              Conversas
            </h2>
            <button
              onClick={() => {
                setShowNewConvModal(true);
                setSearchMember('');
                setMembersList([]);
              }}
              className="w-8 h-8 rounded-full bg-konecta-navy text-white flex items-center justify-center hover:bg-konecta-gold hover:text-konecta-navy transition-colors shadow-sm"
              title="Nova Mensagem"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                <p className="text-gray-500 text-xs italic">Nenhuma conversa ativa de momento.</p>
                <button
                  onClick={() => setShowNewConvModal(true)}
                  className="mt-4 text-xs font-bold text-konecta-navy hover:text-konecta-gold underline"
                >
                  Procurar membro para falar →
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = conv.participants?.find(p => p.id !== user.id);
                const isSelected = selectedConv?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${
                      isSelected 
                        ? 'bg-konecta-navy text-white shadow-md' 
                        : 'hover:bg-white text-konecta-navy'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-white shadow-xs">
                      {partner?.avatar_url ? (
                        <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                          {partner?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="font-bold text-sm truncate">{partner?.full_name || 'Membro Konecta'}</div>
                      <div className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        {conv.last_message || 'Inicia a conversa...'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content: Message Feed */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                    {otherParticipant?.avatar_url ? (
                      <img src={otherParticipant.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                        {otherParticipant?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-konecta-navy">{otherParticipant?.full_name || 'Membro Konecta'}</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{otherParticipant?.province || 'Angola'}</p>
                  </div>
                </div>

                <span className="text-[10px] text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Tempo Real Ativo
                </span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-xs italic">
                    Nenhuma mensagem nesta conversa ainda. Envia uma saudação!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user.id;

                    return (
                      <div 
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-konecta-navy text-white rounded-br-none shadow-xs' 
                            : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-xs'
                        }`}>
                          {m.content}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1">
                          {new Date(m.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreve uma mensagem..."
                  className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-konecta-navy rounded-2xl px-5 py-3 text-sm text-konecta-navy"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary py-3 px-6 text-xs flex items-center gap-1.5"
                >
                  <span>{sending ? '...' : 'Enviar'}</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/20">
              <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">chat</span>
              <p className="text-gray-500 font-medium text-sm">Seleciona uma conversa ou inicia um novo diálogo em tempo real.</p>
              <button 
                onClick={() => setShowNewConvModal(true)}
                className="mt-4 btn-primary py-2 px-6 text-xs"
              >
                Nova Conversa
              </button>
            </div>
          )}
        </div>

      </div>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy">Iniciar Nova Conversa</h3>
                <button
                  onClick={() => setShowNewConvModal(false)}
                  className="text-gray-400 hover:text-konecta-navy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-2">
                  Procurar Membro por Nome
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => handleSearchMembers(e.target.value)}
                    placeholder="Digite pelo menos 2 letras..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchingMembers ? (
                  <div className="py-6 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-konecta-navy"></div>
                  </div>
                ) : membersList.length === 0 ? (
                  searchMember.trim().length >= 2 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhum membro encontrado.</p>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">Pesquisa pelo nome para conversar.</p>
                  )
                ) : (
                  membersList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleStartConversationWith(m)}
                      disabled={startingConv}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                              {m.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-konecta-navy">{m.full_name || 'Utilizador'}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{m.province || 'Angola'}</p>
                        </div>
                      </div>
                      <span className="text-xs text-konecta-gold font-bold">Conversar →</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
