import React, { useState, useEffect, useMemo } from 'react';
import { useT } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabaseClient';
import { d1Client } from '../lib/d1Client';
import { Copy, MessageSquare, Users, X, Download, Send, Check, Loader2, Search } from 'lucide-react';
import { cldReelDownload, cldAvatar } from '../lib/cloudinary';

interface ShareContact {
  id: string;
  user_id: string;
  full_name: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  youFollow: boolean;
  followsYou: boolean;
  isMutual: boolean;
}

export const ShareSheet = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  title,
  authorName,
  thumbnail,
  videoUrl,
  allowShares = true
}: {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: string;
  title: string;
  authorName: string;
  thumbnail?: string;
  videoUrl?: string;
  allowShares?: boolean;
}) => {
  const { t } = useT();
  const { showToast } = useUI();
  const [downloading, setDownloading] = useState(false);

  // Sharing Mode: 'main' | 'chat' | 'community'
  const [shareMode, setShareMode] = useState<'main' | 'chat' | 'community'>('main');

  // Chat Picker State
  const [chatContacts, setChatContacts] = useState<ShareContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [sentUserIds, setSentUserIds] = useState<Record<string, boolean>>({});

  // Community Picker State
  const [communities, setCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [postingCommunityId, setPostingCommunityId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShareMode('main');
      setSendingUserId(null);
      setSentUserIds({});
      setContactSearch('');
      setPostingCommunityId(null);
    }
  }, [isOpen]);

  const getDirectUrl = () => {
    switch (targetType) {
      case 'post': return `${window.location.origin}/p/${targetId}`;
      case 'reel': return `${window.location.origin}/r/${targetId}`;
      case 'idea': return `${window.location.origin}/i/${targetId}`;
      case 'community': return `${window.location.origin}/c/${targetId}`;
      case 'user':
      case 'profile': return `${window.location.origin}/u/${targetId}`;
      case 'book': return `${window.location.origin}/l/${targetId}`;
      default: return `${window.location.origin}/p/${targetId}`;
    }
  };

  const handleCopyLink = async () => {
    const url = getDirectUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado para a área de transferência!', 'success');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('content_shares').insert({
            sharer_id: user.id,
            target_type: targetType,
            target_id: targetId,
            destination_type: 'link'
          });
        }
      } catch {}
    } catch {
      showToast('Não foi possível copiar o link.', 'error');
    }
    onClose();
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    showToast('A preparar o vídeo...', 'info');

    const cleanAuthor = authorName.replace(/^@/, '');
    const downloadUrl = cldReelDownload(videoUrl, cleanAuthor, `konecta-reel-${targetId}`);

    let ready = false;
    let attempts = 0;
    const maxAttempts = 6;

    while (!ready && attempts < maxAttempts) {
      try {
        const response = await fetch(downloadUrl, { method: 'HEAD' });
        if (response.ok) {
          ready = true;
        } else {
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (ready) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Transferência iniciada!', 'success');
    } else {
      showToast('Não foi possível concluir agora. Tenta novamente em instantes.', 'error');
    }

    setDownloading(false);
    onClose();
  };

  // 1. Open Chat Picker & Load Following + Followers (prioritizing mutuals)
  const handleOpenChatPicker = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Inicia sessão para partilhar no chat.', 'error');
      return;
    }
    setShareMode('chat');
    setLoadingUsers(true);
    try {
      const [followingRes, followersRes] = await Promise.all([
        d1Client.profiles.getFollowing(user.id),
        d1Client.profiles.getFollowers(user.id)
      ]);

      const followingList = followingRes.data?.data || followingRes.data || [];
      const followersList = followersRes.data?.data || followersRes.data || [];

      const contactsMap = new Map<string, ShareContact>();

      followingList.forEach((u: any) => {
        const uid = u.user_id || u.id;
        if (!uid || uid === user.id) return;
        contactsMap.set(uid, {
          id: uid,
          user_id: uid,
          full_name: u.full_name || u.display_name || u.username || 'Membro Konecta',
          display_name: u.display_name,
          username: u.username,
          avatar_url: u.avatar_url,
          youFollow: true,
          followsYou: false,
          isMutual: false
        });
      });

      followersList.forEach((u: any) => {
        const uid = u.user_id || u.id;
        if (!uid || uid === user.id) return;
        const existing = contactsMap.get(uid);
        if (existing) {
          existing.followsYou = true;
          existing.isMutual = existing.youFollow && existing.followsYou;
        } else {
          contactsMap.set(uid, {
            id: uid,
            user_id: uid,
            full_name: u.full_name || u.display_name || u.username || 'Membro Konecta',
            display_name: u.display_name,
            username: u.username,
            avatar_url: u.avatar_url,
            youFollow: false,
            followsYou: true,
            isMutual: false
          });
        }
      });

      const merged = Array.from(contactsMap.values()).sort((a, b) => {
        if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1;
        if (a.youFollow !== b.youFollow) return a.youFollow ? -1 : 1;
        return a.full_name.localeCompare(b.full_name);
      });

      setChatContacts(merged);
    } catch (err) {
      console.warn('Erro ao carregar contactos para partilha:', err);
      showToast('Não foi possível carregar os contactos.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return chatContacts;
    return chatContacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q)
    );
  }, [chatContacts, contactSearch]);

  // Send message to selected user in chat
  const handleSendToUser = async (recipientId: string) => {
    if (!recipientId || sendingUserId || sentUserIds[recipientId]) return;
    setSendingUserId(recipientId);
    try {
      const convRes = await d1Client.messages.startConversation(recipientId);
      const conv = convRes.data?.data || convRes.data;
      if (convRes.error || !conv?.id) {
        showToast(convRes.error?.message || 'Não foi possível abrir a conversa.', 'error');
        return;
      }

      const shareMsg = `${title}\n${getDirectUrl()}`;
      const isImageThumb = Boolean(thumbnail && !thumbnail.match(/\.(mp4|mov|pdf)$/i));
      const sendRes = await d1Client.messages.sendMessage(
        conv.id,
        shareMsg,
        isImageThumb ? thumbnail : undefined,
        undefined,
        isImageThumb ? 'image' : 'text'
      );

      if (sendRes?.error) {
        showToast(sendRes.error.message || 'Não foi possível enviar no chat.', 'error');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('content_shares').insert({
            sharer_id: user.id,
            target_type: targetType,
            target_id: targetId,
            destination_type: 'chat'
          });
        }
      } catch {}

      setSentUserIds((prev) => ({ ...prev, [recipientId]: true }));
      showToast('Partilhado no chat!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar mensagem.', 'error');
    } finally {
      setSendingUserId(null);
    }
  };

  // 2. Open Community Picker & Load Communities
  const handleOpenCommunityPicker = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Inicia sessão para partilhar numa comunidade.', 'error');
      return;
    }
    setShareMode('community');
    setLoadingCommunities(true);
    try {
      const res = await d1Client.communities.list();
      const list = res.data?.data || res.data || [];
      setCommunities(list);
    } catch (err) {
      console.warn('Erro ao carregar comunidades:', err);
    } finally {
      setLoadingCommunities(false);
    }
  };

  // Share post into selected community
  const handlePostToCommunity = async (communityId: string) => {
    setPostingCommunityId(communityId);
    try {
      const shareText = `Partilhou ${title}\n${getDirectUrl()}`;
      const res = await d1Client.posts.create({
        content: shareText,
        community_id: communityId,
        image_url: thumbnail
      });

      if (res.error) {
        showToast('Erro ao publicar na comunidade: ' + (res.error.message || res.error), 'error');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('content_shares').insert({
            sharer_id: user.id,
            target_type: targetType,
            target_id: targetId,
            destination_type: 'community'
          });
        }
      } catch {}

      showToast('Publicado com sucesso na comunidade!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao publicar na comunidade.', 'error');
    } finally {
      setPostingCommunityId(null);
    }
  };

  const handleNativeShare = async () => {
    const url = getDirectUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - KONECTA`,
          url
        });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('content_shares').insert({
              sharer_id: user.id,
              target_type: targetType,
              target_id: targetId,
              destination_type: 'external'
            });
          }
        } catch {}
      } catch {
        // User dismissed native share
      }
    } else {
      handleCopyLink();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 400 }}
            className="bg-white w-full max-w-lg rounded-t-3xl p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl border-t border-gray-100 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                {shareMode !== 'main' && (
                  <button
                    type="button"
                    onClick={() => setShareMode('main')}
                    className="w-8 h-8 rounded-full bg-gray-100 text-konecta-navy flex items-center justify-center active:scale-90 transition-transform mr-1"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                )}
                <h2 className="text-sm font-extrabold text-konecta-navy uppercase tracking-wider">
                  {shareMode === 'chat'
                    ? 'Enviar no chat'
                    : shareMode === 'community'
                      ? 'Partilhar numa comunidade'
                      : t('share.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview banner */}
            <div className="flex items-center gap-3.5 mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
              {thumbnail ? (
                <img src={thumbnail} className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-konecta-navy/5 flex items-center justify-center shrink-0">
                  <Send size={18} className="text-konecta-navy/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs sm:text-sm text-konecta-navy truncate">{title}</div>
                <div className="text-[11px] text-gray-500 truncate mt-0.5">{authorName}</div>
              </div>
            </div>

            {/* MAIN MODE */}
            {shareMode === 'main' && (
              <div className="grid grid-cols-1 gap-2.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 active:scale-[0.98] border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
                >
                  <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                    <Copy size={16} />
                  </div>
                  <span className="flex-1">{t('share.copy')}</span>
                  <span className="text-[10px] text-gray-400 tracking-tight truncate max-w-[120px]">
                    {getDirectUrl().replace(/^https?:\/\//, '')}
                  </span>
                </button>

                {targetType === 'reel' && videoUrl && allowShares && (
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    disabled={downloading}
                    className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 active:scale-[0.98] border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-xl bg-konecta-gold/10 flex items-center justify-center group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors text-konecta-gold">
                      {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </div>
                    <span className="flex-1">{downloading ? 'A preparar vídeo...' : 'Guardar vídeo'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenChatPicker}
                  className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 active:scale-[0.98] border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
                >
                  <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                    <MessageSquare size={16} />
                  </div>
                  <span className="flex-1">{t('share.chat')}</span>
                  <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCommunityPicker}
                  className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 active:scale-[0.98] border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
                >
                  <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                    <Users size={16} />
                  </div>
                  <span className="flex-1">{t('share.community')}</span>
                  <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 active:scale-[0.98] border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
                >
                  <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                    <Send size={16} />
                  </div>
                  <span>{t('share.more')}</span>
                </button>
              </div>
            )}

            {/* CHAT PICKER MODE */}
            {shareMode === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {chatContacts.length > 0 && (
                  <div className="relative shrink-0">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Pesquisar contacto..."
                      className="w-full pl-9 pr-3.5 py-2.5 bg-gray-100 rounded-xl text-xs text-konecta-navy outline-none focus:ring-2 focus:ring-konecta-navy/20"
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2">
                  {loadingUsers ? (
                    <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-konecta-navy" />
                      <span>A carregar contactos...</span>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl leading-relaxed">
                      {chatContacts.length === 0
                        ? 'Segue outros membros ou aceita seguidores para partilhares diretamente no chat.'
                        : 'Nenhum contacto encontrado com esse nome.'}
                    </div>
                  ) : (
                    filteredContacts.map((u) => {
                      const uid = u.user_id || u.id;
                      const isSent = !!sentUserIds[uid];
                      const isSending = sendingUserId === uid;
                      return (
                        <div
                          key={uid}
                          className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-200 shrink-0">
                              {u.avatar_url ? (
                                <img src={cldAvatar(u.avatar_url, 40)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-konecta-navy">
                                  {u.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-konecta-navy truncate">{u.full_name}</div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1.5 truncate">
                                <span>@{u.username || 'membro'}</span>
                                <span>·</span>
                                <span className={u.isMutual ? 'text-konecta-navy font-semibold' : ''}>
                                  {u.isMutual ? 'Seguem-se' : u.youFollow ? 'A seguir' : 'Segue-te'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendToUser(uid)}
                            disabled={isSending || isSent}
                            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                              isSent
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-konecta-navy text-white hover:bg-slate-800 disabled:opacity-50'
                            }`}
                          >
                            {isSending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isSent ? (
                              <Check size={13} />
                            ) : (
                              <Send size={13} />
                            )}
                            <span>{isSent ? 'Enviado' : 'Enviar'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COMMUNITY PICKER MODE */}
            {shareMode === 'community' && (
              <div className="flex-1 overflow-y-auto space-y-2">
                {loadingCommunities ? (
                  <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-konecta-navy" />
                    <span>A carregar comunidades...</span>
                  </div>
                ) : communities.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                    Nenhuma comunidade disponível para publicar de momento.
                  </div>
                ) : (
                  communities.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-konecta-navy/10 flex items-center justify-center shrink-0 text-konecta-navy font-bold text-xs overflow-hidden">
                          {comm.avatar_url ? (
                            <img src={comm.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-konecta-navy truncate">{comm.name}</div>
                          <div className="text-[10px] text-gray-400">{comm.member_count || 0} membros</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePostToCommunity(comm.id)}
                        disabled={postingCommunityId === comm.id}
                        className="py-2 px-3.5 bg-konecta-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                      >
                        {postingCommunityId === comm.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Enviar</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
