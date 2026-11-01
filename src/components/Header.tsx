import React, { useState } from 'react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  isAdmin?: boolean;
  onSignOut: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, user, isAdmin = false, onSignOut, unreadCount = 0 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'explore', label: 'Explorar', icon: 'explore' },
    { id: 'community', label: 'Feed Social', icon: 'dynamic_feed' },
    { id: 'reels', label: 'Reels', icon: 'smart_display' },
    { id: 'organizations', label: 'Organizações', icon: 'corporate_fare' },
    { id: 'library', label: 'Biblioteca', icon: 'menu_book' },
    { id: 'communities', label: 'Comunidades', icon: 'groups' },
    { id: 'projects', label: 'Projetos', icon: 'folder_special' },
    { id: 'events', label: 'Eventos', icon: 'event' },
    { id: 'challenges', label: 'Desafios', icon: 'emoji_events' },
    { id: 'pricing', label: 'Planos', icon: 'payments' },
  ];

  const showAdminButton = isAdmin || (user && user.email === 'oficialgabrielag@gmail.com');

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="px-4 sm:px-8 lg:px-12 h-20 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-50 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-8 lg:gap-10">
          <button
            onClick={() => handleNavClick('home')}
            className="flex flex-col items-start group"
          >
            <span className="text-xl font-extrabold tracking-tighter text-konecta-navy group-hover:text-konecta-gold transition-colors">
              KONECTA
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-konecta-gold -mt-1">
              Angola
            </span>
          </button>

          <nav className="hidden xl:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-link text-xs ${currentTab === item.id ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <button 
            onClick={() => handleNavClick('search')} 
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'search' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
            title="Pesquisa Geral"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">search</span>
          </button>

          {user ? (
            <>
              {showAdminButton && (
                <button 
                  onClick={() => handleNavClick('admin')} 
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'admin' ? 'bg-konecta-navy text-konecta-gold shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                  title="Painel de Administração"
                >
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">admin_panel_settings</span>
                </button>
              )}

              <button 
                onClick={() => handleNavClick('messages')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'messages' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                title="Mensagens"
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">forum</span>
              </button>

              <button 
                onClick={() => handleNavClick('notifications')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all relative ${currentTab === 'notifications' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                title="Notificações"
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-konecta-gold text-konecta-navy text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="h-6 w-px bg-gray-100 mx-1 hidden sm:block"></div>
              <button 
                onClick={() => handleNavClick('settings')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'settings' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                title="Configurações & Privacidade"
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">settings</span>
              </button>
              <button 
                onClick={() => handleNavClick('dashboard')} 
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${currentTab === 'dashboard' ? 'bg-konecta-navy text-white shadow-md' : 'text-konecta-navy hover:bg-gray-100'}`}
                title="Painel Pessoal"
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
                Terminar Sessão
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
