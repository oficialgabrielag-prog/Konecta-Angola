import React, { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabaseClient';
import { Copy, Share2, MessageSquare, Users, X, Download } from 'lucide-react';
import { cldReelDownload } from '../lib/cloudinary';

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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('content_shares').insert({
          sharer_id: user.id,
          target_type: targetType,
          target_id: targetId,
          destination_type: 'link'
        });
      }
    } catch {
      showToast('Não foi possível copiar o link.', 'error');
    }
    onClose();
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    showToast('A preparar o vídeo com marca de água...', 'info');

    // Remove @ from authorName if it's there
    const cleanAuthor = authorName.replace(/^@/, '');
    const downloadUrl = cldReelDownload(videoUrl, cleanAuthor, `konecta-reel-${targetId}`);

    // Wait logic: Cloudinary might take a few seconds to generate the watermarked version on first request
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

  const handleShareToChat = async () => {
    showToast('A redirecionar para as mensagens...', 'info');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('content_shares').insert({
        sharer_id: user.id,
        target_type: targetType,
        target_id: targetId,
        destination_type: 'chat'
      });
    }
    onClose();
  };

  const handleShareToCommunity = async () => {
    showToast('A preparar publicação na comunidade...', 'info');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('content_shares').insert({
        sharer_id: user.id,
        target_type: targetType,
        target_id: targetId,
        destination_type: 'community'
      });
    }
    onClose();
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('content_shares').insert({
            sharer_id: user.id,
            target_type: targetType,
            target_id: targetId,
            destination_type: 'external'
          });
        }
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
          className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-gray-100" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-konecta-navy uppercase tracking-wider">
              {t('share.title')}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-100">
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

          <div className="grid grid-cols-1 gap-2.5">
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
              onClick={handleShareToChat}
              className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
            >
              <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                <MessageSquare size={16} />
              </div>
              <span>{t('share.chat')}</span>
            </button>

            <button 
              onClick={handleShareToCommunity}
              className="flex items-center gap-3.5 w-full text-left p-3.5 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all font-semibold text-xs text-konecta-navy group"
            >
              <div className="w-9 h-9 rounded-xl bg-konecta-navy/5 flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
                <Users size={16} />
              </div>
              <span>{t('share.community')}</span>
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
