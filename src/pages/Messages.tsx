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
}

export const Messages: React.FC<MessagesProps> = ({ user, onOpenAuth }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Media Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Disappearing Messages State
  const [disappearingHours, setDisappearingHours] = useState<number>(0); // 0 = off, 24, 168 (7d), 720 (30d)
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);

  // New Conversation Modal
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [membersList, setMembersList] = useState<Profile[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [startingConv, setStartingConv] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Realtime subscription for messages & scroll to bottom
  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.id);
    markConversationAsRead(selectedConv.id);

    const unsubscribe = KonectaRealtimeService.subscribe('messages', (payload: any) => {
      if (payload.new && payload.new.conversation_id === selectedConv.id) {
        fetchMessages(selectedConv.id, true);
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
    } catch (e) {}
  };

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
      let list: Message[] = d1Res.data?.data || [];

      // Filter out disappearing messages if active
      if (disappearingHours > 0) {
        const cutoff = new Date(Date.now() - disappearingHours * 3600 * 1000);
        list = list.filter(m => new Date(m.created_at) > cutoff);
      }

      setMessages(list);
    } catch (err: any) {
      if (!background) console.warn('Aviso ao carregar mensagens:', err?.message || err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || !selectedConv || sending) return;

    const contentText = newMessage.trim();
    const currentFile = attachedFile;

    setSending(true);
    setUploadProgress(10);

    try {
      let mediaUrl: string | undefined = undefined;

      if (currentFile) {
        const uploadRes = await uploadMediaToCloudinary(currentFile, (p) => setUploadProgress(p));
        mediaUrl = uploadRes.secure_url;
      }

      const res = await d1Client.messages.sendMessage(selectedConv.id, contentText || 'Midia enviada', mediaUrl);
      const msg = res.data?.data;

      if (msg) {
        setMessages(prev => [...prev, msg]);
      }

      setNewMessage('');
      setAttachedFile(null);
      if (attachedPreview) URL.revokeObjectURL(attachedPreview);
      setAttachedPreview(null);
      setUploadProgress(0);

      fetchConversations();
    } catch (err: any) {
      console.warn('Aviso ao enviar mensagem:', err?.message || err);
      alert(err?.message || 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // Voice Note Recorder Handlers
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
      const audioFile = new File([audioBlob], `vazio_voz_${Date.now()}.webm`, { type: 'audio/webm' });

      // Stop stream tracks
      recorder.stream.getTracks().forEach(track => track.stop());

      setIsRecording(false);
      setSending(true);

      try {
        const uploadRes = await uploadMediaToCloudinary(audioFile);
        const res = await d1Client.messages.sendMessage(selectedConv.id, '🎤 Nota de Voz', uploadRes.secure_url);
        if (res.data?.data) {
          setMessages(prev => [...prev, res.data.data]);
        }
        fetchConversations();
      } catch (err: any) {
        alert('Erro ao enviar nota de voz.');
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
      console.warn('Aviso ao pesquisar membros:', err?.message || err);
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

  // Online status logic: check if updated_at is within last 3 minutes
  const isParticipantOnline = (() => {
    if (!otherParticipant?.updated_at) return false;
    const diff = Date.now() - new Date(otherParticipant.updated_at).getTime();
    return diff < 180000; // 3 minutes
  })();

  const formatLastSeen = () => {
    if (isParticipantOnline) return 'Online agora';
    if (!otherParticipant?.updated_at) return 'Offline';
    const date = new Date(otherParticipant.updated_at);
    return `Visto por último ${date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12">
      
      <div className="flex flex-col lg:flex-row h-[80vh] min-h-[620px] card-konecta p-0 overflow-hidden shadow-2xl border border-gray-100 bg-white rounded-3xl">
        
        {/* Sidebar: Conversation List */}
        <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-konecta-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-konecta-gold text-[22px]">chat</span>
              Conversas
            </h2>
            <button
              onClick={() => {
                setShowNewConvModal(true);
                setSearchMember('');
                setMembersList([]);
              }}
              className="w-9 h-9 rounded-2xl bg-konecta-navy text-white flex items-center justify-center hover:bg-konecta-gold hover:text-konecta-navy transition-all shadow-sm"
              title="Nova Mensagem"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
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
                    <div className="relative w-11 h-11 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-white shadow-xs">
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
        <div className="flex-1 flex flex-col bg-white relative">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
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
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium">
                      <span className={`w-2 h-2 rounded-full ${isParticipantOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                      {formatLastSeen()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Disappearing Messages Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        disappearingHours > 0 ? 'bg-konecta-gold/10 text-konecta-gold border border-konecta-gold/30' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title="Mensagens Temporárias"
                    >
                      <span className="material-symbols-outlined text-[18px]">timer</span>
                      <span className="hidden sm:inline">
                        {disappearingHours === 0 ? 'Normal' : disappearingHours === 24 ? '24h' : disappearingHours === 168 ? '7 dias' : '30 dias'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showDisappearingMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-30 space-y-1 text-xs"
                        >
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1">Mensagens Temporárias</p>
                          {[
                            { label: 'Desativado (Normal)', value: 0 },
                            { label: '24 Horas', value: 24 },
                            { label: '7 Dias', value: 168 },
                            { label: '30 Dias', value: 720 },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setDisappearingHours(opt.value);
                                setShowDisappearingMenu(false);
                                if (selectedConv) fetchMessages(selectedConv.id);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-all font-medium ${
                                disappearingHours === opt.value ? 'bg-konecta-navy text-white font-bold' : 'hover:bg-gray-50 text-gray-700'
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

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-xs italic space-y-2">
                    <span className="material-symbols-outlined text-4xl text-gray-200">send</span>
                    <p>Nenhuma mensagem nesta conversa ainda. Envia uma saudação!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user.id;

                    return (
                      <div 
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-konecta-navy text-white rounded-br-none shadow-xs' 
                            : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-xs'
                        }`}>
                          {/* Media URL Render */}
                          {(m as any).media_url && (
                            <div className="mb-2.5 rounded-xl overflow-hidden bg-black/10">
                              {(m as any).media_url.match(/\.(mp3|wav|webm|ogg|m4a)$/i) || m.content.includes('Nota de Voz') ? (
                                <div className="p-2 flex items-center gap-3">
                                  <audio src={(m as any).media_url} controls className="w-full h-8" />
                                </div>
                              ) : (m as any).media_url.match(/\.(mp4|mov|webm)$/i) ? (
                                <video src={(m as any).media_url} controls className="w-full max-h-60 object-cover rounded-xl" />
                              ) : (
                                <img src={(m as any).media_url} alt="" className="w-full max-h-60 object-cover rounded-xl" />
                              )}
                            </div>
                          )}

                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        </div>

                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-1 px-1">
                          <span>{new Date(m.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            <span className="material-symbols-outlined text-[13px] text-blue-500">
                              done_all
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Media Preview Box */}
              {attachedPreview && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {attachedFile?.type.startsWith('video/') ? (
                      <video src={attachedPreview} className="w-12 h-12 object-cover rounded-xl" />
                    ) : (
                      <img src={attachedPreview} alt="" className="w-12 h-12 object-cover rounded-xl" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-konecta-navy truncate max-w-[180px]">{attachedFile?.name}</p>
                      <p className="text-[10px] text-gray-400">{attachedFile ? (attachedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedFile(null);
                      if (attachedPreview) URL.revokeObjectURL(attachedPreview);
                      setAttachedPreview(null);
                    }}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              )}

              {/* Message Input / Voice Recorder */}
              <div className="p-4 border-t border-gray-100 bg-white">
                {isRecording ? (
                  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                      <span className="text-xs font-bold uppercase tracking-wider">A gravar voz... {recordingSeconds}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={cancelRecording}
                        className="text-xs text-gray-500 hover:text-red-600 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={stopAndSendRecording}
                        className="btn-primary py-2 px-4 text-xs flex items-center gap-1 bg-red-600 hover:bg-red-700 border-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Enviar Voz</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Media Attach Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors shrink-0"
                      title="Anexar Foto ou Vídeo"
                    >
                      <span className="material-symbols-outlined text-[20px]">attach_file</span>
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
                      className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors shrink-0"
                      title="Gravar Nota de Voz"
                    >
                      <span className="material-symbols-outlined text-[20px]">mic</span>
                    </button>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escreve uma mensagem..."
                      className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-konecta-navy rounded-2xl px-5 py-3 text-sm text-konecta-navy"
                    />

                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !attachedFile) || sending}
                      className="btn-primary py-3 px-5 text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <span>{sending ? '...' : 'Enviar'}</span>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                  </form>
                )}
              </div>
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
