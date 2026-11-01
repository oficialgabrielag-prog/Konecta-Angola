import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { Conversation, Message, Profile } from '../types';
import { KonectaRealtimeService } from '../lib/realtime';
import { uploadMediaToCloudinary } from '../lib/cloudinary';

interface MessagesProps {
  user: any;
  onOpenAuth: () => void;
  onConversationOpenChange?: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const Messages: React.FC<MessagesProps> = ({ 
  user, 
  onOpenAuth,
  onConversationOpenChange,
  onUnreadCountChange
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Presence map for participants
  const [presenceMap, setPresenceMap] = useState<Record<string, { last_seen_at?: string; updated_at?: string }>>({});

  // Media Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Disappearing Messages State
  const [disappearingHours, setDisappearingHours] = useState<number>(0);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);

  // New Conversation Modal State
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [membersList, setMembersList] = useState<Profile[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [startingConv, setStartingConv] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Handle mobile conversation open change callback
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      onConversationOpenChange?.(Boolean(selectedConv));
    }
  }, [selectedConv]);

  // Handle window resize to auto-select on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && !selectedConv && conversations.length > 0) {
        setSelectedConv(conversations[0]);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [conversations, selectedConv]);

  // Realtime subscription & mark read
  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.id);
    markConversationAsRead(selectedConv.id);

    const unsubscribe = KonectaRealtimeService.subscribe('messages', (payload: any) => {
      if (payload.new && payload.new.conversation_id === selectedConv.id) {
        fetchMessages(selectedConv.id, true);
        markConversationAsRead(selectedConv.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markConversationAsRead = async (convId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .match({ conversation_id: convId, user_id: user.id });

      // Update local state
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
    } catch (e) {
      console.error('Erro ao marcar conversa como lida:', e);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const d1Res = await d1Client.messages.listConversations();
      const list: Conversation[] = d1Res.data?.data || [];
      setConversations(list);

      // Total unread messages count across all conversations
      const totalUnread = list.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      onUnreadCountChange?.(totalUnread);

      // Auto-select on desktop
      if (window.innerWidth >= 1024 && !selectedConv && list.length > 0) {
        setSelectedConv(list[0]);
      }

      // Collect user_ids for presence check
      const participantIds: string[] = [];
      list.forEach(c => {
        c.participants?.forEach(p => {
          if (p.id && p.id !== user.id) participantIds.push(p.id);
        });
      });

      if (participantIds.length > 0) {
        fetchPresenceForUsers(participantIds);
      }
    } catch (err: any) {
      console.error('Erro ao carregar conversas:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresenceForUsers = async (userIds: string[]) => {
    try {
      const res = await d1Client.messages.getPresenceForUsers(userIds);
      if (res.data?.data) {
        setPresenceMap(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.error('Aviso ao ler presença de utilizadores:', err);
    }
  };

  const fetchMessages = async (convId: string, background = false) => {
    try {
      const d1Res = await d1Client.messages.getMessages(convId);
      let list: Message[] = d1Res.data?.data || [];

      if (disappearingHours > 0) {
        const cutoff = new Date(Date.now() - disappearingHours * 3600 * 1000);
        list = list.filter(m => new Date(m.created_at) > cutoff);
      }

      setMessages(list);
    } catch (err: any) {
      if (!background) console.error('Erro ao carregar mensagens:', err?.message || err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || !selectedConv || sending) return;

    const contentText = newMessage.trim();
    const currentFile = attachedFile;

    setSending(true);

    try {
      let mediaUrl: string | undefined = undefined;

      if (currentFile) {
        const uploadRes = await uploadMediaToCloudinary(currentFile);
        mediaUrl = uploadRes.secure_url;
      }

      const bodyText = contentText || (currentFile ? 'Mídia enviada' : 'Mensagem');

      const res = await d1Client.messages.sendMessage(selectedConv.id, bodyText, mediaUrl);
      const msg = res.data?.data;

      if (msg) {
        setMessages(prev => [...prev, msg]);
      }

      setNewMessage('');
      setAttachedFile(null);
      if (attachedPreview) URL.revokeObjectURL(attachedPreview);
      setAttachedPreview(null);

      fetchConversations();
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err?.message || err);
      alert(err?.message || 'Não foi possível enviar a mensagem. Tenta novamente.');
    } finally {
      setSending(false);
    }
  };

  // Voice Note Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível aceder ao microfone. Permite o acesso ao áudio no teu navegador.');
    }
  };

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current || !selectedConv) return;

    clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `nota_voz_${Date.now()}.webm`, { type: 'audio/webm' });

      recorder.stream.getTracks().forEach(track => track.stop());

      setIsRecording(false);
      setSending(true);

      try {
        const uploadRes = await uploadMediaToCloudinary(audioFile);
        const res = await d1Client.messages.sendMessage(selectedConv.id, 'Nota de voz', uploadRes.secure_url);
        if (res.data?.data) {
          setMessages(prev => [...prev, res.data.data]);
        }
        fetchConversations();
      } catch (err: any) {
        console.error('Erro ao enviar nota de voz:', err);
        alert('Não foi possível enviar a nota de voz.');
      } finally {
        setSending(false);
      }
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleSearchMembers = async (queryText: string) => {
    setSearchMember(queryText);
    if (queryText.trim().length < 1) {
      setMembersList([]);
      return;
    }

    setSearchingMembers(true);
    try {
      const d1Res = await d1Client.messages.searchProfiles(queryText.trim());
      setMembersList(d1Res.data?.data || d1Res.data || []);
    } catch (err: any) {
      console.error('Erro ao pesquisar membros:', err?.message || err);
      setMembersList([]);
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
        throw new Error(res.error?.message || 'Falha ao iniciar conversa.');
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
      console.error('Erro ao iniciar conversa:', err?.message || err);
      alert(err?.message || 'Erro ao criar conversa.');
    } finally {
      setStartingConv(false);
    }
  };

  const handleBackToList = () => {
    setSelectedConv(null);
    onConversationOpenChange?.(false);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-konecta-navy/5 flex items-center justify-center mx-auto mb-4 text-konecta-navy">
          <span className="material-symbols-outlined text-3xl">forum</span>
        </div>
        <h2 className="text-xl font-bold mb-2 text-konecta-navy">Mensagens privadas</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Inicia sessão na KONECTA para conversar em tempo real com parceiros e inovadores da rede.
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3 rounded-full">
          Entrar na conta
        </button>
      </div>
    );
  }

  const otherParticipant = selectedConv?.participants?.find(p => p.id !== user.id);
  const otherMemberObj = selectedConv?.conversation_members?.find((m: any) => m.user_id === otherParticipant?.id);
  const otherLastReadAt = otherMemberObj?.last_read_at;

  const presenceObj = otherParticipant?.id ? presenceMap[otherParticipant.id] : undefined;
  const presenceInfo = formatPresenceStatus(presenceObj);

  return (
    <div className="w-full h-[calc(100dvh-5rem)] lg:h-[calc(100vh-6rem)] max-w-7xl mx-auto lg:px-6 lg:py-6">
      
      <div className="flex w-full h-full bg-white lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden">
        
        {/* Sidebar: Conversation List (Hidden on mobile when conversation is selected) */}
        <div className={`w-full lg:w-80 lg:shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50 ${
          selectedConv ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h1 className="text-lg font-bold text-konecta-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-konecta-navy text-xl">chat</span>
              Conversas
            </h1>
            <button
              onClick={() => {
                setShowNewConvModal(true);
                setSearchMember('');
                setMembersList([]);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="w-11 h-11 rounded-full bg-konecta-navy text-white flex items-center justify-center hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-konecta-navy transition-colors"
              aria-label="Iniciar nova conversa"
              title="Nova conversa"
            >
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <span className="material-symbols-outlined text-4xl text-gray-300">forum</span>
                <p className="text-gray-600 text-sm font-normal">Nenhuma conversa encontrada.</p>
                <button
                  onClick={() => setShowNewConvModal(true)}
                  className="btn-primary py-2 px-4 text-xs rounded-full font-medium"
                >
                  Procurar membro para falar
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = conv.participants?.find(p => p.id !== user.id);
                const isSelected = selectedConv?.id === conv.id;
                const hasUnread = (conv.unread_count || 0) > 0;
                const nameStr = partner?.full_name || partner?.display_name || 'Membro Konecta';
                const initial = nameStr.charAt(0).toUpperCase() || 'K';
                const avatarBg = getAvatarBgColor(partner?.id || 'default');

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConv(conv);
                      onConversationOpenChange?.(true);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left focus-visible:ring-2 focus-visible:ring-konecta-navy ${
                      isSelected 
                        ? 'bg-konecta-navy text-white shadow-none' 
                        : 'hover:bg-white text-konecta-navy'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-white ${avatarBg}`}>
                      {partner?.avatar_url ? (
                        <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-sm truncate ${
                          hasUnread && !isSelected ? 'font-extrabold text-konecta-navy' : isSelected ? 'font-bold text-white' : 'font-semibold text-gray-900'
                        }`}>
                          {nameStr}
                        </span>
                        <span className={`text-xs shrink-0 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatConvDate(conv.last_message_at)}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${
                        hasUnread && !isSelected ? 'font-bold text-konecta-navy' : isSelected ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {cleanMessageSnippet(conv.last_message)}
                      </p>
                    </div>

                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-konecta-gold text-konecta-navy font-bold text-xs flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content: Message Feed & Chat Window */}
        <div className={`flex-1 flex-col bg-white ${
          selectedConv ? 'flex' : 'hidden lg:flex'
        }`}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToList}
                    className="lg:hidden w-11 h-11 rounded-full flex items-center justify-center text-konecta-navy hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-konecta-navy shrink-0"
                    aria-label="Voltar às conversas"
                    title="Voltar às conversas"
                  >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                  </button>

                  <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-white bg-konecta-navy">
                    {otherParticipant?.avatar_url ? (
                      <img src={otherParticipant.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(otherParticipant?.full_name || 'K').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  <div className="truncate">
                    <h2 className="font-bold text-sm sm:text-base text-konecta-navy truncate">
                      {otherParticipant?.full_name || 'Membro Konecta'}
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium truncate">
                      <span className={`w-2 h-2 rounded-full motion-reduce:animate-none ${
                        presenceInfo.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                      }`} />
                      {presenceInfo.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Disappearing Messages Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
                      className={`w-11 h-11 lg:w-auto lg:px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-konecta-navy ${
                        disappearingHours > 0 
                          ? 'bg-amber-50 text-konecta-gold border border-amber-200 font-bold' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      aria-label="Mensagens temporárias"
                      title="Mensagens temporárias"
                    >
                      <span className={`material-symbols-outlined text-xl ${disappearingHours > 0 ? 'text-konecta-gold' : 'text-gray-500'}`}>timer</span>
                      <span className="hidden lg:inline">
                        {disappearingHours === 0 ? 'Normal' : `${disappearingHours === 24 ? '24 h' : disappearingHours === 168 ? '7 dias' : '30 dias'}`}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showDisappearingMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-30 space-y-1 text-xs"
                        >
                          <p className="text-xs font-bold text-gray-500 px-3 py-1">Mensagens temporárias</p>
                          {[
                            { label: 'Desativado', value: 0 },
                            { label: '24 horas', value: 24 },
                            { label: '7 dias', value: 168 },
                            { label: '30 dias', value: 720 },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setDisappearingHours(opt.value);
                                setShowDisappearingMenu(false);
                                if (selectedConv) fetchMessages(selectedConv.id);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors text-xs font-medium ${
                                disappearingHours === opt.value ? 'bg-konecta-navy text-white font-bold' : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Message Feed List */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
                role="log"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 text-xs space-y-2">
                    <p>Nenhuma mensagem nesta conversa ainda. Envia uma saudação!</p>
                  </div>
                ) : (
                  renderGroupedMessages(messages, user.id, otherLastReadAt)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Media File Preview Banner */}
              {attachedPreview && (
                <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {attachedFile?.type.startsWith('video/') ? (
                      <video src={attachedPreview} className="w-12 h-12 object-cover rounded-xl" />
                    ) : (
                      <img src={attachedPreview} alt="" className="w-12 h-12 object-cover rounded-xl" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-konecta-navy truncate max-w-[180px]">{attachedFile?.name}</p>
                      <p className="text-xs text-gray-500">{attachedFile ? (attachedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedFile(null);
                      if (attachedPreview) URL.revokeObjectURL(attachedPreview);
                      setAttachedPreview(null);
                    }}
                    className="w-11 h-11 rounded-full text-gray-500 hover:text-red-600 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-konecta-navy"
                    aria-label="Remover anexo"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              )}

              {/* Message Input Bar */}
              <div className="p-3 border-t border-gray-200 bg-white pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {isRecording ? (
                  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-2 text-red-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping motion-reduce:animate-none"></span>
                      <span className="text-xs font-medium">A gravar voz... {recordingSeconds}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelRecording}
                        className="text-xs text-gray-600 hover:text-red-600 font-medium px-2 py-1 rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={stopAndSendRecording}
                        className="w-11 h-11 rounded-full bg-konecta-navy text-white hover:bg-slate-800 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-konecta-navy"
                        aria-label="Enviar nota de voz"
                        title="Enviar nota de voz"
                      >
                        <span className="material-symbols-outlined text-xl">send</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Media Attach Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-konecta-navy"
                      title="Anexar foto ou vídeo"
                      aria-label="Anexar foto ou vídeo"
                    >
                      <span className="material-symbols-outlined text-xl">attach_file</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachedFile(file);
                          setAttachedPreview(URL.createObjectURL(file));
                        }
                      }}
                    />

                    {/* Microphone Voice Note Button */}
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-konecta-navy"
                      title="Gravar nota de voz"
                      aria-label="Gravar nota de voz"
                    >
                      <span className="material-symbols-outlined text-xl">mic</span>
                    </button>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escrever mensagem..."
                      aria-label="Escrever mensagem"
                      enterKeyHint="send"
                      className="flex-1 bg-gray-100 border-none focus:ring-2 focus:ring-konecta-navy rounded-full px-4 py-2.5 text-base text-konecta-navy outline-none"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !attachedFile) || sending}
                      className="w-11 h-11 rounded-full bg-konecta-navy text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-konecta-navy"
                      title="Enviar mensagem"
                      aria-label="Enviar mensagem"
                    >
                      <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">chat</span>
              <p className="text-gray-600 text-sm font-medium">Seleciona uma conversa ou inicia um novo diálogo em tempo real.</p>
              <button 
                onClick={() => setShowNewConvModal(true)}
                className="mt-4 btn-primary py-2.5 px-6 text-xs rounded-full font-medium"
              >
                Procurar membro
              </button>
            </div>
          )}
        </div>

      </div>

      {/* New Conversation Modal / Bottom Sheet */}
      <AnimatePresence>
        {showNewConvModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-konecta-navy/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-2xl md:rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-konecta-navy">Procurar membro</h3>
                <button
                  onClick={() => setShowNewConvModal(false)}
                  className="w-11 h-11 rounded-full text-gray-400 hover:text-konecta-navy flex items-center justify-center focus-visible:ring-2 focus-visible:ring-konecta-navy"
                  aria-label="Fechar"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-konecta-navy mb-1.5">
                  Procurar por nome ou utilizador
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    autoFocus
                    value={searchMember}
                    onChange={(e) => handleSearchMembers(e.target.value)}
                    placeholder="Escribe pelo menos 2 letras..."
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-base text-konecta-navy outline-none focus:ring-2 focus:ring-konecta-navy"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[160px]">
                {searchingMembers ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-konecta-navy"></div>
                  </div>
                ) : membersList.length === 0 ? (
                  searchMember.trim().length >= 2 ? (
                    <p className="text-xs text-gray-500 text-center py-8">Nenhum membro encontrado.</p>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-8">Digita para pesquisar pessoas na rede.</p>
                  )
                ) : (
                  membersList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleStartConversationWith(m)}
                      disabled={startingConv}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors text-left focus-visible:ring-2 focus-visible:ring-konecta-navy"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-gray-600">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(m.full_name || m.display_name || 'M').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-konecta-navy">{m.full_name || m.display_name || 'Utilizador'}</p>
                          <p className="text-xs text-gray-500">@{m.username || 'membro'}</p>
                        </div>
                      </div>
                      <span className="text-xs text-konecta-navy font-bold">Conversar</span>
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

// Helper: Presence status formatting
function formatPresenceStatus(presenceRecord?: { last_seen_at?: string; updated_at?: string }): { isOnline: boolean; text: string } {
  if (!presenceRecord) return { isOnline: false, text: 'Offline' };
  const rawDate = presenceRecord.last_seen_at || presenceRecord.updated_at;
  if (!rawDate) return { isOnline: false, text: 'Offline' };

  const lastSeen = new Date(rawDate);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();

  if (diffMs < 300000) { // 5 minutes
    return { isOnline: true, text: 'Online agora' };
  }

  const isToday = lastSeen.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = lastSeen.toDateString() === yesterday.toDateString();

  const timeStr = lastSeen.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return { isOnline: false, text: `Visto por último hoje às ${timeStr}` };
  }
  if (isYesterday) {
    return { isOnline: false, text: `Visto por último ontem` };
  }

  const day = String(lastSeen.getDate()).padStart(2, '0');
  const month = String(lastSeen.getMonth() + 1).padStart(2, '0');
  return { isOnline: false, text: `Visto por último a ${day}/${month}` };
}

// Helper: Conversation List date formatting
function formatConvDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// Helper: Clean message snippet text
function cleanMessageSnippet(text?: string): string {
  if (!text) return 'Conversa iniciada';
  if (text.toLowerCase().includes('nota de voz')) return '🎤 Nota de voz';
  if (text === 'Midia enviada') return '📷 Mídia enviada';
  return text;
}

// Helper: Deterministic bg color for avatars
function getAvatarBgColor(id: string): string {
  const colors = ['bg-slate-700', 'bg-blue-800', 'bg-indigo-800', 'bg-sky-800', 'bg-slate-800'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Helper: Render grouped messages by day and sender
function renderGroupedMessages(messages: Message[], currentUserId: string, otherLastReadAt?: string) {
  const groups: { dayLabel: string; msgs: Message[] }[] = [];

  messages.forEach(m => {
    const mDate = new Date(m.created_at);
    const now = new Date();
    let dayLabel = mDate.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long' });

    if (mDate.toDateString() === now.toDateString()) {
      dayLabel = 'Hoje';
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (mDate.toDateString() === yesterday.toDateString()) {
        dayLabel = 'Ontem';
      }
    }

    let lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.dayLabel !== dayLabel) {
      lastGroup = { dayLabel, msgs: [] };
      groups.push(lastGroup);
    }
    lastGroup.msgs.push(m);
  });

  return groups.map((group, groupIdx) => (
    <div key={groupIdx} className="space-y-3">
      {/* Day Divider */}
      <div className="flex items-center justify-center my-3">
        <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">
          {group.dayLabel}
        </span>
      </div>

      {group.msgs.map((m, idx) => {
        const isMe = m.sender_id === currentUserId;
        const nextMsg = group.msgs[idx + 1];
        const isLastInGroup = !nextMsg || nextMsg.sender_id !== m.sender_id || (new Date(nextMsg.created_at).getTime() - new Date(m.created_at).getTime() > 300000);

        // Honest read receipt
        const isReadByOther = isMe && otherLastReadAt && new Date(otherLastReadAt) >= new Date(m.created_at);

        // Voice note detection
        const isVoiceNote = m.content.toLowerCase().includes('nota de voz');
        const mediaUrl = (m as any).media_url;

        return (
          <div 
            key={m.id}
            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isMe 
                ? 'bg-konecta-navy text-white rounded-br-xs' 
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-xs'
            }`}>
              {/* Media Render */}
              {mediaUrl && (
                <div className="mb-2 rounded-xl overflow-hidden bg-black/10">
                  {isVoiceNote || mediaUrl.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <div className="p-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">mic</span>
                      <audio src={mediaUrl} controls className="w-full h-8" />
                    </div>
                  ) : mediaUrl.match(/\.(mp4|mov)$/i) || (mediaUrl.includes('.webm') && !isVoiceNote) ? (
                    <video src={mediaUrl} controls className="w-full max-h-60 object-cover rounded-xl" />
                  ) : (
                    <img src={mediaUrl} alt="" className="w-full max-h-60 object-cover rounded-xl" />
                  )}
                </div>
              )}

              {/* Message Content */}
              {isVoiceNote ? (
                <div className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-lg">mic</span>
                  <span>Nota de voz</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{m.content === 'Midia enviada' ? 'Mídia enviada' : m.content}</p>
              )}
            </div>

            {/* Time & Read Receipts Metadata (Shown on last message of group) */}
            {isLastInGroup && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 px-1">
                <span>{new Date(m.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                {isMe && (
                  isReadByOther ? (
                    <span className="material-symbols-outlined text-xs text-blue-500 font-bold" aria-label="Lida">done_all</span>
                  ) : (
                    <span className="material-symbols-outlined text-xs text-gray-400 font-bold" aria-label="Enviada">done</span>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  ));
}
