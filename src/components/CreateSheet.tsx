import React from 'react';
import { useT } from '../context/LanguageContext';
import { Edit3, Film, Lightbulb, BookOpen, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  const actions = [
    {
      id: 'post',
      title: t('create.post'),
      desc: 'Partilha uma reflexão, notícia ou fotografia com a rede',
      icon: Edit3,
      accent: 'navy'
    },
    {
      id: 'reel',
      title: t('create.reel'),
      desc: 'Envia um vídeo vertical com música angolana',
      icon: Film,
      accent: 'gold'
    },
    {
      id: 'idea',
      title: t('create.idea'),
      desc: 'Submete uma solução ou proposta de inovação',
      icon: Lightbulb,
      accent: 'navy'
    },
    {
      id: 'book',
      title: t('create.book'),
      desc: 'Publica a tua obra literária ou capítulo na Biblioteca Digital',
      icon: BookOpen,
      accent: 'gold'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="bg-white w-full max-w-lg rounded-t-3xl p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-black/[0.06] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-konecta-navy uppercase tracking-wider">
                {t('create.title')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {actions.map((item) => {
                const Icon = item.icon;
                const isGold = item.accent === 'gold';
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left p-3.5 bg-gray-50/70 hover:bg-gray-100/80 active:scale-[0.98] border border-gray-100 rounded-2xl flex items-center gap-3.5 transition-all group"
                    onClick={() => onSelectAction(item.id)}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isGold
                          ? 'bg-konecta-gold/15 text-konecta-gold group-hover:bg-konecta-gold group-hover:text-konecta-navy'
                          : 'bg-konecta-navy/8 text-konecta-navy group-hover:bg-konecta-navy group-hover:text-white'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-konecta-navy">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
