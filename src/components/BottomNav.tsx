import { useT } from '../context/LanguageContext';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onOpenAuth: () => void;
  onOpenCreateMenu: () => void;
  unreadCount?: number;
  hidden?: boolean;
  variant?: 'default' | 'overlay';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuth,
  onOpenCreateMenu,
  unreadCount = 0,
  hidden = false,
  variant = 'default'
}) => {
  const { t } = useT();
  if (hidden) return null;

  const isOverlay = variant === 'overlay';

  const tabs = [
    { id: 'home', label: t('nav.home'), icon: 'home' },
    { id: 'explore', label: t('nav.explore'), icon: 'explore' },
    { id: 'reels', label: t('nav.reels'), icon: 'smart_display' },
    { id: 'profile', label: t('nav.profile'), icon: 'person', requiresAuth: true },
  ];

  const handleTabClick = (tabId: string, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      onOpenAuth();
      return;
    }
    setCurrentTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 xl:hidden pb-safe transition-all ${
      isOverlay 
        ? 'bg-gradient-to-t from-black/90 via-black/40 to-transparent border-none shadow-none' 
        : 'bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-2xl'
    }`}>
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        <button
          onClick={onOpenCreateMenu}
          className={`relative -top-3 w-12 h-12 rounded-full ${
            isOverlay 
              ? 'bg-konecta-gold text-konecta-navy shadow-lg border border-black/20' 
              : 'bg-gradient-to-tr from-konecta-navy to-slate-800 text-konecta-gold border-2 border-white shadow-xl'
          } flex items-center justify-center hover:scale-105 active:scale-95 transition-transform`}
          title="Criar nova publicação ou ideia"
        >
          <span className="material-symbols-outlined text-2xl font-black">
            add
          </span>
        </button>

        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.requiresAuth)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all active:scale-90 ${
                isOverlay
                  ? (isActive ? 'text-konecta-gold font-bold' : 'text-white/70 hover:text-white')
                  : (isActive ? 'text-konecta-navy font-bold' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <div className="relative">
                <span 
                  className={`material-symbols-outlined text-[24px] ${isActive ? (isOverlay ? 'text-konecta-gold scale-110' : 'text-konecta-navy font-bold scale-110') : ''}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>

                {tab.id === 'home' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-konecta-gold rounded-full border border-white" />
                )}
              </div>

              <span className={`text-[10px] mt-0.5 tracking-tight ${
                isActive 
                  ? (isOverlay ? 'text-konecta-gold font-extrabold' : 'text-konecta-navy font-extrabold') 
                  : (isOverlay ? 'text-white/80 font-medium' : 'font-medium')
              }`}>
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-0 w-8 h-0.5 bg-konecta-gold rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
