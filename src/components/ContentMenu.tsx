import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { MoreVertical, Edit2, Trash2, Flag, Ban, Share2, Copy } from 'lucide-react';

export const ContentMenu = ({ 
  targetId, 
  targetType, 
  isOwner, 
  onDelete, 
  onReport,
  onEdit,
  onBlock,
  onShare
}: { 
  targetId: string; 
  targetType: string; 
  isOwner: boolean;
  onDelete: () => void;
  onReport: () => void;
  onEdit?: () => void;
  onBlock?: () => void;
  onShare: () => void;
}) => {
  const { t } = useT();
  const { showToast } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleCopy = () => {
    let url = `${window.location.origin}/p/${targetId}`;
    if (targetType === 'reel') url = `${window.location.origin}/r/${targetId}`;
    else if (targetType === 'idea') url = `${window.location.origin}/i/${targetId}`;
    else if (targetType === 'community') url = `${window.location.origin}/c/${targetId}`;
    else if (targetType === 'user' || targetType === 'profile') url = `${window.location.origin}/u/${targetId}`;
    else if (targetType === 'book') url = `${window.location.origin}/l/${targetId}`;

    navigator.clipboard.writeText(url)
      .then(() => showToast('Link copiado com sucesso!', 'success'))
      .catch(() => showToast('Erro ao copiar link.', 'error'));
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }} 
        aria-label="Opções"
        className="p-1.5 text-gray-400 hover:text-konecta-navy hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 rounded-2xl p-1.5 z-50 w-48 animate-in fade-in zoom-in-95 duration-150"
        >
          {isOwner && onEdit && (
            <button 
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors" 
              onClick={() => { onEdit(); setIsOpen(false); }}
            >
              <Edit2 size={14} className="text-gray-400" />
              <span>{t('menu.edit')}</span>
            </button>
          )}

          {isOwner ? (
            <button 
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
              onClick={() => { onDelete(); setIsOpen(false); }}
            >
              <Trash2 size={14} className="text-red-500" />
              <span>{t('menu.delete')}</span>
            </button>
          ) : (
            <>
              <button 
                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors" 
                onClick={() => { onReport(); setIsOpen(false); }}
              >
                <Flag size={14} className="text-gray-400" />
                <span>{t('menu.report')}</span>
              </button>
              {onBlock && (
                <button 
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors" 
                  onClick={() => { onBlock(); setIsOpen(false); }}
                >
                  <Ban size={14} className="text-gray-400" />
                  <span>{t('menu.block')}</span>
                </button>
              )}
            </>
          )}

          <div className="h-px bg-gray-100 my-1" />

          <button 
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors" 
            onClick={() => { onShare(); setIsOpen(false); }}
          >
            <Share2 size={14} className="text-gray-400" />
            <span>{t('menu.share')}</span>
          </button>
          <button 
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors" 
            onClick={handleCopy}
          >
            <Copy size={14} className="text-gray-400" />
            <span>{t('menu.copy')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
