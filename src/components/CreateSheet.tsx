import React from 'react';
import { useT } from '../context/LanguageContext';
import { Edit3, Film, Lightbulb, BookOpen, X } from 'lucide-react';

export const CreateSheet = ({ 
  isOpen, 
  onClose, 
  onSelectAction 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectAction: (action: string) => void; 
}) => {
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 border-t border-gray-100 shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-konecta-navy uppercase tracking-wider">
            {t('create.title')}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button 
            type="button"
            className="w-full text-left p-4 hover:bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4 transition-all group" 
            onClick={() => onSelectAction('post')}
          >
            <div className="w-11 h-11 rounded-xl bg-konecta-navy/5 text-konecta-navy flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
              <Edit3 size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-konecta-navy">{t('create.post')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Partilha uma reflexão, notícia ou fotografia com a rede</div>
            </div>
          </button>

          <button 
            type="button"
            className="w-full text-left p-4 hover:bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4 transition-all group" 
            onClick={() => onSelectAction('reel')}
          >
            <div className="w-11 h-11 rounded-xl bg-konecta-gold/10 text-konecta-gold flex items-center justify-center group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors">
              <Film size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-konecta-navy">{t('create.reel')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Envia um vídeo vertical com música angolana</div>
            </div>
          </button>

          <button 
            type="button"
            className="w-full text-left p-4 hover:bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4 transition-all group" 
            onClick={() => onSelectAction('idea')}
          >
            <div className="w-11 h-11 rounded-xl bg-konecta-navy/5 text-konecta-navy flex items-center justify-center group-hover:bg-konecta-navy group-hover:text-white transition-colors">
              <Lightbulb size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-konecta-navy">{t('create.idea')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Submete uma solução ou proposta de inovação</div>
            </div>
          </button>

          <button 
            type="button"
            className="w-full text-left p-4 hover:bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4 transition-all group" 
            onClick={() => onSelectAction('book')}
          >
            <div className="w-11 h-11 rounded-xl bg-konecta-gold/10 text-konecta-gold flex items-center justify-center group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-konecta-navy">{t('create.book')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Publica a tua obra literária ou capítulo na Biblioteca Digital</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
