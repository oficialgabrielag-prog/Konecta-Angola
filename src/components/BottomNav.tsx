import React from 'react';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onOpenAuth: () => void;
  unreadCount?: number;
  hidden?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuth,
  unreadCount = 0,
  hidden = false
}) => {
  if (hidden) return null;

  const tabs = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'explore', label: 'Explorar', icon: 'explore' },
    { id: 'create', label: 'Criar', icon: 'add', isPrimary: true },
    { id: 'reels', label: 'Reels', icon: 'smart_display' },
    { id: 'profile', label: 'Perfil', icon: 'person', requiresAuth: true },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-2xl xl:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="relative -top-3 w-12 h-12 rounded-full bg-gradient-to-tr from-konecta-navy to-slate-800 text-konecta-gold border-2 border-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                title="Criar nova publicação ou ideia"
              >
                <span className="material-symbols-outlined text-2xl font-black">
                  add
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.requiresAuth)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all active:scale-90 ${
                isActive ? 'text-konecta-navy font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <span 
                  className={`material-symbols-outlined text-[24px] ${isActive ? 'text-konecta-navy font-bold scale-110' : ''}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>

                {tab.id === 'home' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-konecta-gold rounded-full border border-white" />
                )}
              </div>

              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-konecta-navy font-extrabold' : 'font-medium'}`}>
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
