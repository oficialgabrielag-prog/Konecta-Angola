import React from 'react';
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

  const leftTabs = [
    { id: 'home', label: t('nav.home'), icon: 'home' },
    { id: 'explore', label: t('nav.explore'), icon: 'explore' },
  ];

  const rightTabs = [
    { id: 'reels', label: t('nav.reels'), icon: 'smart_display' },
    { id: 'profile', label: t('nav.profile'), icon: 'person', requiresAuth: true },
  ];

  const handleTabClick = (tabId: string, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      onOpenAuth();
      return;
    }
    setCurrentTab(tabId);
    window.scrollTo(0, 0);
  };

  const renderTab = (tab: { id: string; label: string; icon: string; requiresAuth?: boolean }) => {
    const isActive = currentTab === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => handleTabClick(tab.id, tab.requiresAuth)}
        aria-label={tab.label}
        className={`flex-1 flex flex-col items-center justify-center h-full relative transition-transform active:scale-90 ${
          isOverlay
            ? (isActive ? 'text-konecta-gold font-bold' : 'text-white/75')
            : (isActive ? 'text-konecta-navy font-bold' : 'text-gray-400')
        }`}
      >
        <div className="relative flex items-center justify-center">
          <span
            className={`material-symbols-outlined text-[23px] transition-transform ${
              isActive
                ? (isOverlay ? 'text-konecta-gold scale-105' : 'text-konecta-navy scale-105')
                : ''
            }`}
            style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : { fontVariationSettings: "'wght' 450" }}
          >
            {tab.icon}
          </span>

          {tab.id === 'home' && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-konecta-gold rounded-full ring-2 ring-white" />
          )}
        </div>

        <span className={`text-[10px] mt-0.5 tracking-tight leading-none ${
          isActive
            ? (isOverlay ? 'text-konecta-gold font-extrabold' : 'text-konecta-navy font-extrabold')
            : (isOverlay ? 'text-white/75 font-medium' : 'font-medium')
        }`}>
          {tab.label}
        </span>

        {isActive && (
          <motion.div
            layoutId="bottomNavIndicator"
            className="absolute top-0 w-7 h-[2.5px] bg-konecta-gold rounded-b-full"
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          />
        )}
      </button>
    );
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 xl:hidden pb-safe transition-colors ${
        isOverlay
          ? 'bg-gradient-to-t from-black/90 via-black/55 to-transparent border-none shadow-none'
          : 'bg-white/92 backdrop-blur-2xl border-t border-black/[0.06] shadow-[0_-4px_24px_rgba(16,45,87,0.06)]'
      }`}
    >
      <div className="flex items-center justify-around h-[58px] px-2 max-w-lg mx-auto">
        {leftTabs.map(renderTab)}

        <div className="flex items-center justify-center px-2">
          <button
            type="button"
            onClick={onOpenCreateMenu}
            aria-label="Criar"
            className={`w-11 h-11 rounded-2xl ${
              isOverlay
                ? 'bg-konecta-gold text-konecta-navy shadow-lg'
                : 'bg-konecta-navy text-konecta-gold shadow-md'
            } flex items-center justify-center active:scale-90 transition-transform`}
          >
            <span className="material-symbols-outlined text-[24px] font-bold">
              add
            </span>
          </button>
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
};
