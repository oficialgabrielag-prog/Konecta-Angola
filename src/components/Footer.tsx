import React from 'react';
import { PWAInstallButton } from './PWAComponents';

export const Footer: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  return (
    <footer className="bg-konecta-navy text-white pt-20 pb-12 px-6 sm:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <div>
            <span className="text-2xl font-black uppercase tracking-tighter">KONECTA</span>
            <p className="text-konecta-gold text-[10px] font-bold uppercase tracking-[0.2em] -mt-1">
              Ideias que unem. Pessoas que realizam.
            </p>
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            A maior plataforma de colaboração e inovação comunitária em Angola. Conectamos mentes brilhantes para transformar o futuro do país.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Plataforma & Legal</h4>
          <nav className="flex flex-col gap-3 text-xs opacity-75">
            <button onClick={() => onNavigateTab && onNavigateTab('policy-center')} className="text-left hover:text-konecta-gold transition-colors">
              Centro de Políticas & Privacidade
            </button>
            <button onClick={() => onNavigateTab && onNavigateTab('settings')} className="text-left hover:text-konecta-gold transition-colors">
              Configurações da Conta
            </button>
            <button onClick={() => onNavigateTab && onNavigateTab('explore')} className="text-left hover:text-konecta-gold transition-colors">
              Explorar & Descoberta Global
            </button>
          </nav>
        </div>

        <div>
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Ecossistema KONECTA</h4>
          <nav className="flex flex-col gap-3 text-xs opacity-75">
            <a href="https://cunenevagas.online" target="_blank" rel="noopener noreferrer" className="hover:text-konecta-gold transition-colors flex items-center gap-1.5">
              <span>CuneneVagas (Empregos & Lojas)</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
            <a href="https://freevdn.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-konecta-gold transition-colors flex items-center gap-1.5">
              <span>VDN — Vai Dar Namoro</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </nav>
        </div>

        <div className="space-y-6">
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Aplicações</h4>
          <div className="flex flex-col gap-4">
            <PWAInstallButton />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40">
        <span>© 2026 Rede Konecta · Luanda, Angola</span>
        <div className="flex gap-8">
          <span>Feito com ❤️ por angolanos</span>
        </div>
      </div>
    </footer>
  );
};
