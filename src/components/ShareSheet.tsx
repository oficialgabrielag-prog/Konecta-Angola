import React, { useState, useEffect } from 'react';
import { useT } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabaseClient';
import { d1Client } from '../lib/d1Client';
import { Copy, Share2, MessageSquare, Users, X, Download, Send, Check, Loader2 } from 'lucide-react';
import { cldReelDownload, cldAvatar } from '../lib/cloudinary';

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
  const [followedUsers, setFollowedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

  // Community Picker State
  const [communities, setCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [postingCommunityId, setPostingCommunityId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShareMode('main');
      setSendingUserId(null);
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
    showToast('A preparar o vídeo com marca de água...', 'info');

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
      showToast('O processamento demorou muito. Tenta novamente em instantes.', 'error');
    }
    
    setDownloading(false);
    onClose();
  };

  // 1. Open Chat Picker & Load Followed Users
  const handleOpenChatPicker = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Precisas de iniciar sessão para partilhar no chat.', 'error');
      return;
    }
    setShareMode('chat');
    setLoadingUsers(true);
    try {
      const res = await d1Client.profiles.getFollowing(user.id);
      const list = res.data?.data || res.data || [];
      setFollowedUsers(list);
    } catch (err) {
      console.warn('Erro ao carregar pessoas que sigo:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Send message to selected user
  const handleSendToUser = async (recipientId: string) => {
    setSendingUserId(recipientId);
    try {
      const convRes = await d1Client.messages.startConversation(recipientId);
      if (convRes.error || !convRes.data) {
        showToast('Não foi possível abrir a conversa.', 'error');
        return;
      }

      const conv = convRes.data?.data || convRes.data;
      const shareMsg = `Partilhado da KONECTA: ${title}\n${getDirectUrl()}`;

      await d1Client.messages.send(conv.id, shareMsg);

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

      showToast('Conteúdo enviado com sucesso no chat!', 'success');
      onClose();
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
      showToast('Precisas de iniciar sessão para partilhar numa comunidade.', 'error');
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
          text: `${title} - Partilhado via KONECTA`,
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-gray-100 max-h-[85vh] flex flex-col" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-2">
              {shareMode !== 'main' && (
                <button 
                  onClick={() => setShareMode('main')}
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors mr-1"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
              )}
              <h2 className="text-base font-bold text-konecta-navy uppercase tracking-wider">
                {shareMode === 'chat' ? 'Enviar em mensagem direta' : shareMode === 'community' ? 'Partilhar numa comunidade' : t('share.title')}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          
          {/* Preview banner */}
          <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
            {thumbnail ? (
              <img src={thumbnail} className="w-14 h-14 rounded-xl object-cover shadow-xs shrink-0" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-konecta-navy/5 flex items-center justify-center shrink-0">
                <Share2 size={24} className="text-konecta-navy/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-konecta-navy truncate">{title}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{authorName}</div>
            </div>
          </div>

          {/* MAIN MODE */}
          {shareMode === 'main' && (
            <div className="grid grid-cols-1 gap-2.5 overflow-y-auto">
              <button 
                onClick={handleCopyLink}
                className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
              >
                <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                  <Copy size={16} />
                </div>
                <span className="flex-1">{t('share.copy')}</span>
                <span className="text-[10px] text-gray-400 font-mono tracking-tighter truncate max-w-[120px]">
                  {getDirectUrl().replace(/^https?:\/\//, '')}
                </span>
              </button>

              {targetType === 'reel' && videoUrl && allowShares && (
                <button 
                  onClick={handleDownloadVideo}
                  disabled={downloading}
                  className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-xl bg-konecta-gold/10 flex items-center justify-center group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors text-konecta-gold">
                    <Download size={16} className={downloading ? 'animate-bounce' : ''} />
                  </div>
                  <span className="flex-1">{downloading ? 'A preparar vídeo...' : 'Guardar vídeo'}</span>
                </button>
              )}

              <button 
                onClick={handleOpenChatPicker}
                className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
              >
                <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                  <MessageSquare size={16} />
                </div>
                <span className="flex-1">{t('share.chat')}</span>
                <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
              </button>

              <button 
                onClick={handleOpenCommunityPicker}
                className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
              >
                <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                  <Users size={16} />
                </div>
                <span className="flex-1">{t('share.community')}</span>
                <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
              </button>

              <button 
                onClick={handleNativeShare}
                className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
              >
                <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                  <Share2 size={16} />
                </div>
                <span>{t('share.more')}</span>
              </button>
            </div>
          )}

          {/* CHAT PICKER MODE */}
          {shareMode === 'chat' && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingUsers ? (
                <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-konecta-navy" />
                  <span>A carregar contactos...</span>
                </div>
              ) : followedUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                  Ainda não segues ninguém. Segue membros para lhes enviar mensagens diretas.
                </div>
              ) : (
                followedUsers.map((u) => (
                  <div key={u.id} className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-200 shrink-0">
                        {u.avatar_url ? (
                          <img src={cldAvatar(u.avatar_url, 40)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-konecta-navy">
                            {(u.full_name || u.display_name || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-konecta-navy">{u.full_name || u.display_name}</div>
                        <div className="text-[10px] text-gray-400">@{u.username || 'membro'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendToUser(u.id || u.user_id)}
                      disabled={sendingUserId === (u.id || u.user_id)}
                      className="py-1.5 px-4 bg-konecta-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {sendingUserId === (u.id || u.user_id) ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>Enviar</span>
                    </button>
                  </div>
                ))
              )}
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
                  <div key={comm.id} className="p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-konecta-navy/10 flex items-center justify-center shrink-0 text-konecta-navy font-bold text-xs">
                        {comm.avatar_url ? (
                          <img src={comm.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <Users size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-konecta-navy">{comm.name}</div>
                        <div className="text-[10px] text-gray-400">{comm.member_count || 0} membros</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePostToCommunity(comm.id)}
                      disabled={postingCommunityId === comm.id}
                      className="py-1.5 px-4 bg-konecta-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {postingCommunityId === comm.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>Partilhar</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
