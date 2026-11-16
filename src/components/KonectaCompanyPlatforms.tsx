import React from 'react';
import { ArrowUpRight, BriefcaseBusiness, Heart } from 'lucide-react';

interface KonectaCompanyPlatformsProps {
  variant?: 'card' | 'drawer' | 'footer';
}

const KONECTA_PLATFORMS = [
  {
    id: 'vdn',
    name: 'Vai Dar Namoro',
    subtitle: 'Conexões & Relacionamentos',
    url: 'https://freevdn.netlify.app',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-500/20',
    renderIcon: (size: number) => (
      <Heart size={size} strokeWidth={2.2} className="fill-white/25" />
    ),
  },
  {
    id: 'cunene-vagas',
    name: 'Cunene Vagas',
    subtitle: 'Empregos, Lojas & Oportunidades',
    url: 'https://www.cunenevagas.online',
    iconBg: 'bg-gradient-to-br from-konecta-navy to-[#1d447d] text-konecta-gold shadow-sm shadow-konecta-navy/20',
    renderIcon: (size: number) => (
      <BriefcaseBusiness size={size} strokeWidth={2.1} />
    ),
  },
];

export const KonectaCompanyPlatforms: React.FC<KonectaCompanyPlatformsProps> = ({
  variant = 'card',
}) => {
  if (variant === 'footer') {
    return (
      <div>
        <h4 className="font-bold mb-5 uppercase text-xs tracking-widest text-konecta-gold">
          Também da empresa KONECTA
        </h4>
        <nav className="flex flex-col gap-3">
          {KONECTA_PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-white/80 hover:text-white transition-colors"
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${platform.iconBg}`}
              >
                {platform.renderIcon(17)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold group-hover:text-konecta-gold transition-colors">
                  {platform.name}
                </span>
                <span className="block text-[11px] text-white/50 truncate">
                  {platform.subtitle}
                </span>
              </span>
              <ArrowUpRight size={14} className="text-white/40 group-hover:text-konecta-gold shrink-0 transition-colors" />
            </a>
          ))}
        </nav>
      </div>
    );
  }

  if (variant === 'drawer') {
    return (
      <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
          Também da empresa KONECTA
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {KONECTA_PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all active:scale-[0.98]"
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${platform.iconBg}`}
              >
                {platform.renderIcon(19)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-konecta-navy truncate">
                  {platform.name}
                </span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {platform.subtitle}
                </span>
              </span>
              <ArrowUpRight size={15} className="text-gray-400 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-xs">
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-konecta-gold block">
          Também da empresa KONECTA
        </span>
        <h3 className="text-base font-extrabold text-konecta-navy">
          Outras Plataformas KONECTA
        </h3>
      </div>

      <div className="space-y-2.5">
        {KONECTA_PLATFORMS.map((platform) => (
          <a
            key={platform.id}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80 border border-gray-100 hover:border-konecta-gold/40 transition-all active:scale-[0.99]"
          >
            <span
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${platform.iconBg}`}
            >
              {platform.renderIcon(20)}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-konecta-navy group-hover:text-konecta-gold transition-colors truncate">
                {platform.name}
              </h4>
              <p className="text-[11px] text-gray-500 truncate">
                {platform.subtitle}
              </p>
            </div>
            <ArrowUpRight
              size={16}
              className="text-gray-400 group-hover:text-konecta-navy shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        ))}
      </div>
    </section>
  );
};
