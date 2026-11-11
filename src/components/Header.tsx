import React, { useState } from 'react';
import { useT } from '../context/LanguageContext';

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
  onReplayIntro
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
      <header className={`px-4 sm:px-8 lg:px-12 h-20 flex justify-between items-center transition-all ${
        isOverlay 
          ? 'fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent border-none text-white' 
          : 'border-b border-gray-100 bg-white sticky top-0 z-50 backdrop-blur-md bg-white/95'
      }`}>
        <div className="flex items-center gap-8 lg:gap-10">
          <button
            onClick={() => {
              if (currentTab === 'home' && onReplayIntro) {
                onReplayIntro();
              } else {
                handleNavClick('home');
              }
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="Página inicial Konecta"
            title="Konecta Angola - Clique para rever abertura"
          >
            {/* Modern stylized K logo mark */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-konecta-navy to-[#0A1830] flex items-center justify-center p-1.5 shadow-xs border border-white/10 group-hover:border-konecta-gold group-hover:scale-105 transition-all">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <rect x="22" y="15" width="16" height="70" rx="3.5" fill="#F5BD35" />
                <path d="M 34 52 L 72 16 C 74 14, 78 14, 80 16 L 82 18 C 84 20, 84 24, 81 27 L 48 59 Z" fill="#FFFFFF" />
                <path d="M 44 48 L 74 78 C 76 80, 76 84, 74 86 L 71 89 C 69 91, 65 91, 63 88 L 36 61 Z" fill="#F5BD35" />
              </svg>
            </div>

            <div className="flex flex-col items-start">
              <span className={`text-xl font-extrabold tracking-tighter transition-colors ${
                isOverlay ? 'text-white group-hover:text-konecta-gold' : 'text-konecta-navy group-hover:text-konecta-gold'
              }`}>
                KONECTA
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-konecta-gold -mt-1">
                Angola
              </span>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-xs font-semibold transition-colors ${
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

        <div className="flex items-center gap-1.5 sm:gap-3">
          <button 
            onClick={() => handleNavClick('search')} 
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${
              isOverlay
                ? (currentTab === 'search' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                : (currentTab === 'search' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100')
            }`}
            title={t('common.search')}
            aria-label="Pesquisa geral"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">search</span>
          </button>

          {user ? (
            <>
              {showAdminButton && (
                <button 
                  onClick={() => handleNavClick('admin')} 
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${
                    isOverlay
                      ? (currentTab === 'admin' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                      : (currentTab === 'admin' ? 'bg-konecta-navy text-konecta-gold shadow-md' : 'text-konecta-navy hover:bg-gray-100')
                  }`}
                  title={t('nav.admin')}
                  aria-label="Painel de administração"
                >
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">admin_panel_settings</span>
                </button>
              )}

              <button 
                onClick={() => handleNavClick('messages')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all relative ${
                  isOverlay
                    ? (currentTab === 'messages' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'messages' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                title={t('nav.messages')}
                aria-label="Mensagens privadas"
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">forum</span>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-konecta-gold text-konecta-navy text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => handleNavClick('notifications')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all relative ${
                  isOverlay
                    ? (currentTab === 'notifications' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'notifications' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                title={t('nav.notifications')}
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-konecta-gold text-konecta-navy text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className={`h-6 w-px mx-1 hidden sm:block ${isOverlay ? 'bg-white/20' : 'bg-gray-100'}`}></div>
              <button 
                onClick={() => handleNavClick('settings')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${
                  isOverlay
                    ? (currentTab === 'settings' ? 'bg-konecta-gold text-konecta-navy' : 'text-white hover:bg-white/20')
                    : (currentTab === 'settings' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100')
                }`}
                title={t('settings.title')}
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">settings</span>
              </button>
              <button 
                onClick={() => handleNavClick('dashboard')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'dashboard' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                title={t('nav.dashboard')}
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">dashboard</span>
              </button>
              <button 
                onClick={() => handleNavClick('profile')} 
                className={`flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border transition-colors ${currentTab === 'profile' ? 'border-konecta-gold bg-konecta-gold/10' : 'border-gray-200 hover:border-konecta-navy'}`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                  )}
                </div>
                <span className="text-xs font-bold text-konecta-navy hidden sm:inline max-w-[90px] truncate">
                  {user.user_metadata?.full_name?.split(' ')[0] || 'Perfil'}
                </span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleNavClick('login')} 
              className="btn-primary py-2 px-4 sm:px-6 text-xs"
            >
              Entrar
            </button>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-konecta-navy hover:bg-gray-200 transition-colors ml-1"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-gray-200 shadow-xl fixed top-20 left-0 right-0 z-40 p-6 space-y-3 animate-in slide-in-from-top duration-200 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${
                  currentTab === item.id 
                    ? 'bg-konecta-navy text-white font-bold' 
                    : 'bg-gray-50 text-konecta-navy hover:bg-gray-100'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${currentTab === item.id ? 'text-konecta-gold' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>

          {user && (
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">@{user.email?.split('@')[0]}</span>
              <button
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-700"
              >
                {t('common.signout')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
