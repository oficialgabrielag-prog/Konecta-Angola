import React, { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { KonectaCompanyPlatforms } from './KonectaCompanyPlatforms';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  isAdmin?: boolean;
  onSignOut: () => void;
  unreadCount?: number;
  unreadMessagesCount?: number;
  variant?: 'default' | 'overlay';
  onReplayIntro?: () => void;
  hideOnMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  user,
  isAdmin = false,
  onSignOut,
  unreadCount = 0,
  unreadMessagesCount = 0,
  variant = 'default',
  hideOnMobile = false,
}) => {
  const { t } = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOverlay = variant === 'overlay';

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: 'home' },
    { id: 'explore', label: t('nav.explore'), icon: 'explore' },
    { id: 'community', label: t('nav.feed'), icon: 'dynamic_feed' },
    { id: 'reels', label: t('nav.reels'), icon: 'smart_display' },
    { id: 'organizations', label: t('nav.organizations'), icon: 'corporate_fare' },
    { id: 'library', label: t('nav.library'), icon: 'menu_book' },
    { id: 'communities', label: t('nav.communities'), icon: 'groups' },
    { id: 'projects', label: t('nav.projects'), icon: 'folder_special' },
    { id: 'events', label: t('nav.events'), icon: 'event' },
    { id: 'challenges', label: t('nav.challenges'), icon: 'emoji_events' },
    { id: 'plans', label: 'Planos', icon: 'payments' },
    { id: 'verification', label: 'Verificação', icon: 'verified_user' },
  ];

  const showAdminButton = isAdmin || (user && user.email === 'oficialgabrielag@gmail.com');

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`pt-safe px-4 sm:px-8 lg:px-12 h-14 sm:h-16 justify-between items-center transition-colors ${
          hideOnMobile ? 'hidden lg:flex' : 'flex'
        } ${
          isOverlay
            ? 'fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent border-none text-white'
            : 'border-b border-black/[0.06] bg-white/92 sticky top-0 z-50 backdrop-blur-2xl'
        }`}
      >
        <div className="flex items-center gap-8 lg:gap-10">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-transform"
            aria-label="Página inicial Konecta"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-konecta-navy to-[#0A1830] flex items-center justify-center p-1.5 shadow-xs border border-white/10">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <rect x="22" y="15" width="16" height="70" rx="3.5" fill="#F5BD35" />
                <path d="M 34 52 L 72 16 C 74 14, 78 14, 80 16 L 82 18 C 84 20, 84 24, 81 27 L 48 59 Z" fill="#FFFFFF" />
                <path d="M 44 48 L 74 78 C 76 80, 76 84, 74 86 L 71 89 C 69 91, 65 91, 63 88 L 36 61 Z" fill="#F5BD35" />
              </svg>
            </div>

            <div className="flex flex-col items-start">
              <span
                className={`text-lg sm:text-xl font-extrabold tracking-tighter leading-none transition-colors ${
                  isOverlay ? 'text-white' : 'text-konecta-navy'
                }`}
              >
                KONECTA
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-konecta-gold mt-0.5 leading-none">
                Angola
              </span>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-xs font-semibold transition-colors cursor-pointer ${
                  isOverlay
                    ? (currentTab === item.id ? 'text-konecta-gold font-bold' : 'text-white/80 hover:text-white')
                    : (currentTab === item.id ? 'nav-link active' : 'nav-link')
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={() => handleNavClick('search')}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              isOverlay
                ? (currentTab === 'search' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                : (currentTab === 'search' ? 'bg-konecta-navy text-white shadow-sm' : 'text-konecta-navy hover:bg-gray-100')
            }`}
            aria-label={t('common.search')}
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {user ? (
            <>
              {showAdminButton && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className={`hidden sm:flex w-9 h-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                    isOverlay
                      ? (currentTab === 'admin' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                      : (currentTab === 'admin' ? 'bg-konecta-navy text-konecta-gold shadow-sm' : 'text-konecta-navy hover:bg-gray-100')
                  }`}
                  aria-label={t('nav.admin')}
                >
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleNavClick('messages')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative active:scale-90 ${
                  isOverlay
                    ? (currentTab === 'messages' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'messages' ? 'bg-konecta-navy text-white shadow-sm' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                aria-label={t('nav.messages')}
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-konecta-gold text-konecta-navy text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('notifications')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative active:scale-90 ${
                  isOverlay
                    ? (currentTab === 'notifications' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'notifications' ? 'bg-konecta-navy text-white shadow-sm' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                aria-label={t('nav.notifications')}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-konecta-gold text-konecta-navy text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className={`h-5 w-px mx-1 hidden xl:block ${isOverlay ? 'bg-white/20' : 'bg-gray-200'}`} />

              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className={`hidden xl:flex w-9 h-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                  isOverlay
                    ? (currentTab === 'settings' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'settings' ? 'bg-konecta-navy text-white shadow-sm' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                aria-label={t('settings.title')}
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className={`hidden xl:flex w-9 h-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                  currentTab === 'dashboard' ? 'bg-konecta-navy text-white shadow-sm' : (isOverlay ? 'text-white hover:bg-white/20' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                aria-label={t('nav.dashboard')}
              >
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className={`hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                  currentTab === 'profile'
                    ? 'border-konecta-gold bg-konecta-gold/10'
                    : (isOverlay ? 'border-white/25 text-white hover:border-white/50' : 'border-gray-200 hover:border-konecta-navy')
                }`}
                aria-label={t('nav.profile')}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                  )}
                </div>
                <span className={`text-xs font-bold hidden md:inline max-w-[90px] truncate ${isOverlay ? 'text-white' : 'text-konecta-navy'}`}>
                  {user.user_metadata?.full_name?.split(' ')[0] || 'Perfil'}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleNavClick('login')}
              className="btn-primary py-1.5 px-4 sm:px-5 text-xs active:scale-95"
            >
              Entrar
            </button>
          )}

          {/* Mobile / Tablet Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className={`xl:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ml-0.5 ${
              isOverlay
                ? 'bg-white/15 text-white'
                : 'bg-gray-100 text-konecta-navy hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Native Mobile Slide-Down Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setMobileMenuOpen(false)}
              className="xl:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="xl:hidden bg-white border-b border-gray-200 shadow-2xl fixed top-14 sm:top-16 left-0 right-0 z-40 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-b-3xl"
            >
              {user && (
                <div className="mb-4 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavClick('profile')}
                    className="flex items-center gap-3 text-left min-w-0 flex-1 active:scale-[0.98] transition-transform"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-konecta-navy/10 flex items-center justify-center shrink-0">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                      ) : (
                        <span className="material-symbols-outlined text-konecta-navy text-lg">person</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-konecta-navy truncate">
                        {user.user_metadata?.full_name || 'Minha Conta'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        @{user.email?.split('@')[0]}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleNavClick('dashboard')}
                      aria-label={t('nav.dashboard')}
                      className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-konecta-navy flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('settings')}
                      aria-label={t('settings.title')}
                      className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-konecta-navy flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                    </button>
                    {showAdminButton && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('admin')}
                        aria-label={t('nav.admin')}
                        className="w-9 h-9 rounded-xl bg-konecta-navy text-konecta-gold flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.97] ${
                      currentTab === item.id
                        ? 'bg-konecta-navy text-white font-bold shadow-xs'
                        : 'bg-gray-50 text-konecta-navy hover:bg-gray-100'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${currentTab === item.id ? 'text-konecta-gold' : 'text-gray-400'}`}>
                      {item.icon}
                    </span>
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              <KonectaCompanyPlatforms variant="drawer" />

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavClick('help')}
                    className="font-semibold text-gray-500 hover:text-konecta-navy active:scale-95"
                  >
                    Ajuda e Suporte
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleNavClick('policy-center')}
                    className="font-semibold text-gray-500 hover:text-konecta-navy active:scale-95"
                  >
                    Políticas
                  </button>
                </div>

                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="font-bold text-red-600 hover:text-red-700 active:scale-95"
                  >
                    {t('common.signout')}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
