import React from 'react';
import { PWAInstallButton } from './PWAComponents';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-konecta-navy text-white pt-24 pb-12 px-6 sm:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
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
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Plataforma</h4>
          <nav className="flex flex-col gap-4 text-sm opacity-60">
            <a href="#" className="hover:text-konecta-gold transition-colors">Sobre Nós</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">Como Funciona</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">Impacto Social</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">Termos e Privacidade</a>
          </nav>
        </div>

        <div>
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Recursos</h4>
          <nav className="flex flex-col gap-4 text-sm opacity-60">
            <a href="#" className="hover:text-konecta-gold transition-colors">Central de Ajuda</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">Blog da Inovação</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">API para Programadores</a>
            <a href="#" className="hover:text-konecta-gold transition-colors">Kit de Imprensa</a>
          </nav>
        </div>

        <div className="space-y-6">
          <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-konecta-gold">Aplicações</h4>
          <div className="flex flex-col gap-4">
            <PWAInstallButton />
          </div>
          <div className="pt-6 flex gap-4 opacity-40">
            <span className="material-symbols-outlined cursor-pointer hover:text-konecta-gold">public</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-konecta-gold">mail</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-konecta-gold">share</span>
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
