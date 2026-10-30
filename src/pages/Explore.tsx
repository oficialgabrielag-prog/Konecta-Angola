import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Idea } from '../types';
import { IdeaCardSkeleton } from '../components/Skeletons';

interface ExploreProps {
  ideas: Idea[];
  onVoteIdea: (id: string) => void;
  user: any;
  onOpenAuth: () => void;
  onSelectPost: (idea: Idea) => void;
  onSelectUser?: (userId: string) => void;
}

export const Explore: React.FC<ExploreProps> = ({
  ideas,
  onVoteIdea,
  onSelectPost,
  onSelectUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedProvince, setSelectedProvince] = useState('Todas Províncias');

  const categories = ['Todas', 'Tecnologia', 'Inovação', 'Social', 'Energia', 'Agricultura', 'Educação', 'Saúde'];
  const provinces = ['Todas Províncias', 'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Uíge', 'Malanje', 'Namibe', 'Zaire', 'Cuanza Sul', 'Cuanza Norte', 'Bié', 'Moxico', 'Cunene', 'Cuando Cubango', 'Lunda Norte', 'Lunda Sul', 'Bengo'];

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || idea.category === selectedCategory;
    const matchesProvince = selectedProvince === 'Todas Províncias' || idea.province === selectedProvince || idea.profiles?.province === selectedProvince;
    return matchesSearch && matchesCategory && matchesProvince;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-12">
        <span className="feature-kicker">Descoberta em Angola</span>
        <h1 className="hero-title">Explorar Iniciativas</h1>
        <p className="text-gray-500 mt-2 max-w-xl text-sm leading-relaxed">
          Descobre e apoia as ideias mais inovadoras que estão a surgir em todas as províncias angolanas.
        </p>
      </header>

      {/* Filters Bar */}
      <div className="space-y-4 mb-12">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar iniciativas por título ou palavra-chave..."
              className="w-full bg-white border border-gray-200 rounded-2xl pl-14 pr-6 h-14 text-sm focus:outline-none focus:border-konecta-gold shadow-xs"
            />
          </div>

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="bg-white border border-gray-200 rounded-2xl px-5 h-14 text-xs font-bold text-konecta-navy focus:outline-none focus:border-konecta-gold shadow-xs"
          >
            {provinces.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-konecta-navy text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Ideas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ideas.length === 0 ? (
          <IdeaCardSkeleton count={6} />
        ) : filteredIdeas.length === 0 ? (
          <div className="col-span-full py-28 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">search_off</span>
            <p className="text-gray-500 italic text-sm">Nenhuma iniciativa encontrada com os filtros selecionados.</p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <motion.article 
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              key={idea.id} 
              className="card-konecta flex flex-col justify-between cursor-pointer group shadow-sm hover:border-konecta-gold/50 transition-all border border-gray-100" 
              onClick={() => onSelectPost(idea)}
            >
              <div>
                <div className="aspect-video bg-gray-50 rounded-2xl mb-5 overflow-hidden border border-gray-100">
                  {idea.image_url ? (
                    <img src={idea.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <span className="material-symbols-outlined text-4xl text-konecta-gold">lightbulb</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest px-2 py-0.5 bg-konecta-navy/5 rounded">
                    {idea.category}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {idea.province || idea.profiles?.province || 'Angola'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-konecta-navy group-hover:text-konecta-gold transition-colors mb-2 line-clamp-2 leading-tight">
                  {idea.title}
                </h3>
                
                <p className="text-xs text-gray-500 line-clamp-3 mb-6 leading-relaxed">
                  {idea.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={(e) => {
                    if (onSelectUser && idea.user_id) {
                      e.stopPropagation();
                      onSelectUser(idea.user_id);
                    }
                  }}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                    {idea.profiles?.avatar_url ? (
                      <img src={idea.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-400">
                        {idea.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-konecta-navy truncate max-w-[120px]">
                    {idea.profiles?.full_name || 'Membro'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoteIdea(idea.id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-all duration-200 transform active:scale-125 scale-105 shadow-md shadow-red-200"
                  title="Apoiar iniciativa"
                >
                  <span className="material-symbols-outlined text-[16px] text-white animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span className="font-extrabold">{idea.votes_count || 0}</span>
                </button>
              </div>
            </motion.article>
          ))
        )}
      </div>

    </div>
  );
};
