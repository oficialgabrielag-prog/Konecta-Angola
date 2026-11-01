import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';

interface OrganizationsProps {
  user: any;
  onOpenAuth: () => void;
  onSelectOrg: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const Organizations: React.FC<OrganizationsProps> = ({ user, onOpenAuth, onSelectOrg, onNavigateTab }) => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'my' | 'following'>('all');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('church');
  const [description, setDescription] = useState('');
  const [mission, setMission] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [municipality, setMunicipality] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    { key: 'church', label: 'Igrejas', icon: 'church' },
    { key: 'political_party', label: 'Partidos Políticos', icon: 'gavel' },
    { key: 'civic_movement', label: 'Movimentos Cívicos', icon: 'campaign' },
    { key: 'writer_poet', label: 'Escritores e Poetas', icon: 'edit_note' },
    { key: 'association', label: 'Associações', icon: 'diversity_3' },
    { key: 'ngo', label: 'ONGs', icon: 'volunteer_activism' },
    { key: 'school_university', label: 'Escolas e Universidades', icon: 'school' },
    { key: 'other', label: 'Outras Instituições', icon: 'corporate_fare' }
  ];

  const provinces = [
    'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Cuanza Sul', 
    'Cuanza Norte', 'Malanje', 'Uíge', 'Zaire', 'Lunda Norte', 'Lunda Sul',
    'Bié', 'Moxico', 'Quando Cubango', 'Namibe', 'Cunene', 'Bengo'
  ];

  useEffect(() => {
    fetchOrganizations();
  }, [selectedCategory, selectedProvince, verifiedOnly, viewMode]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const filter: any = {};
      if (selectedCategory !== 'all') filter.category = selectedCategory;
      if (selectedProvince !== 'all') filter.province = selectedProvince;
      if (verifiedOnly) filter.verified = true;
      if (viewMode === 'my' && user) filter.owner_id = user.id;

      const res = await d1Client.organizations.list(filter);
      let list = res.data?.data || res.data || [];

      if (viewMode === 'following' && user) {
        list = list.filter((org: any) => 
          org.organization_followers?.some((f: any) => f.user_id === user.id)
        );
      }

      setOrganizations(list);
      setError(null);
    } catch (err: any) {
      console.warn('Erro ao carregar organizações:', err);
      setError('Não foi possível carregar as organizações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await d1Client.organizations.list({ search: searchQuery });
      setOrganizations(res.data?.data || res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setFormError(null);
    try {
      const res = await uploadMediaToCloudinary(file);
      setLogoUrl(res.secure_url);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao carregar logótipo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setFormError(null);
    try {
      const res = await uploadMediaToCloudinary(file);
      setCoverUrl(res.secure_url);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao carregar capa.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    if (!name.trim()) {
      setFormError('Por favor, introduza o nome da organização.');
      return;
    }

    if (!category) {
      setFormError('Por favor, selecione uma categoria.');
      return;
    }

    if (creating || uploadingLogo || uploadingCover) return;

    setCreating(true);
    try {
      let formattedWebsite = website.trim();
      if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      const payload = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        mission: mission.trim() || undefined,
        logo_url: logoUrl || undefined,
        cover_url: coverUrl || undefined,
        website: formattedWebsite || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        province,
        municipality: municipality.trim() || undefined
      };

      const res = await d1Client.organizations.create(payload);
      if (res.error) {
        throw new Error(res.error.message || res.error || 'Erro ao criar organização.');
      }

      setShowCreateModal(false);
      resetForm();
      fetchOrganizations();
      if (res.data?.slug) {
        onSelectOrg(res.data.slug);
      }
    } catch (err: any) {
      console.error('Erro em handleCreateOrg:', err);
      setFormError(err.message || 'Erro ao criar organização.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('church');
    setDescription('');
    setMission('');
    setLogoUrl('');
    setCoverUrl('');
    setWebsite('');
    setEmail('');
    setPhone('');
    setAddress('');
    setProvince('Luanda');
    setMunicipality('');
    setFormError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-konecta-gold uppercase">Ecossistema Institucional</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight mt-1">Organizações & Autores</h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Igrejas, partidos políticos, movimentos cívicos, escritores, associações, ONGs e universidades reunidos na rede social KONECTA Angola.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => onNavigateTab('library')}
            className="btn-secondary whitespace-nowrap text-xs py-3 px-5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
            Biblioteca Digital & Autores
          </button>
          <button 
            onClick={() => {
              if (!user) onOpenAuth();
              else {
                resetForm();
                setShowCreateModal(true);
              }
            }}
            className="btn-gold whitespace-nowrap text-xs py-3 px-6 shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add_business</span>
            Criar Organização
          </button>
        </div>
      </header>

      {/* View Mode & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'Todas', icon: 'public' },
            { key: 'my', label: 'Minhas Organizações', icon: 'admin_panel_settings' },
            { key: 'following', label: 'A Seguir', icon: 'bookmark_added' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key !== 'all' && !user) {
                  onOpenAuth();
                  return;
                }
                setViewMode(tab.key as any);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === tab.key ? 'bg-konecta-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 text-konecta-gold rounded"
            />
            <span>Apenas verificadas ✓</span>
          </label>

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs focus:outline-none focus:border-konecta-gold"
          >
            <option value="all">Todas as Províncias</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Categories Horizontal Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all text-center border ${
            selectedCategory === 'all' 
              ? 'bg-konecta-navy text-white border-konecta-navy shadow-md' 
              : 'bg-white text-gray-700 border-gray-200 hover:border-konecta-gold'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">apps</span>
          <span className="text-xs font-bold">Todas</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all text-center border ${
              selectedCategory === cat.key 
                ? 'bg-konecta-navy text-white border-konecta-navy shadow-md' 
                : 'bg-white text-gray-700 border-gray-200 hover:border-konecta-gold'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${selectedCategory === cat.key ? 'text-konecta-gold' : 'text-gray-500'}`}>
              {cat.icon}
            </span>
            <span className="text-xs font-bold leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="mb-10 relative max-w-xl mx-auto">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <span className="material-symbols-outlined">search</span>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar igrejas, partidos, escritores, ONGs..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs shadow-sm focus:outline-none focus:border-konecta-gold"
        />
      </form>

      {/* Main Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center max-w-lg mx-auto border border-red-100">
          <p className="font-bold">Erro</p>
          <p className="text-xs mt-2">{error}</p>
          <button onClick={fetchOrganizations} className="mt-4 btn-primary py-2 text-xs">Tentar Novamente</button>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-28 bg-white rounded-3xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">corporate_fare</span>
          <p className="text-gray-600 font-semibold text-sm">Nenhuma organização encontrada.</p>
          <p className="text-xs text-gray-400 mt-1">Regista a tua instituição ou autor para começar.</p>
          <button 
            onClick={() => user ? setShowCreateModal(true) : onOpenAuth()}
            className="mt-6 btn-gold text-xs py-2.5 px-6"
          >
            Criar Organização Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {organizations.map((org) => {
            const isVerified = org.verified;
            return (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectOrg(org.slug)}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="h-32 bg-gradient-to-br from-konecta-navy/10 to-konecta-gold/10 relative overflow-hidden">
                    {org.cover_url && (
                      <img src={org.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-konecta-navy uppercase tracking-wider">
                      {org.category}
                    </div>
                  </div>

                  <div className="px-6 pt-0 pb-6 relative">
                    <div className="-mt-10 mb-4 flex items-end justify-between">
                      <div className="w-16 h-16 rounded-2xl border-4 border-white bg-konecta-navy text-white text-xl font-black flex items-center justify-center overflow-hidden shadow-md">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          org.name.charAt(0)
                        )}
                      </div>
                      {isVerified && (
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-blue-100">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Verificada
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-konecta-navy mb-1 group-hover:text-konecta-gold transition-colors">
                      {org.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                      <span>{org.province}{org.municipality ? `, ${org.municipality}` : ''}</span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {org.description || 'Sem descrição informada.'}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{org.followers_count || 0} seguidores</span>
                  <span className="font-bold text-konecta-navy group-hover:underline flex items-center gap-1">
                    Ver perfil <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Organization Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Criar Nova Organização ou Perfil Institucional</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Nome da Organização</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Igreja Evangélica / Editora Luanda"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium"
                    >
                      {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve resumo sobre a instituição ou autor..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Missão</label>
                  <input
                    type="text"
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="Missão ou propósito principal..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Província</label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium"
                    >
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Município</label>
                    <input
                      type="text"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      placeholder="Ex: Luanda, Viana..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Website</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="www.exemplo.ao"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@org.ao"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Telefone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+244 ..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Logótipo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-konecta-navy file:text-white"
                    />
                    {uploadingLogo && <span className="text-[10px] text-konecta-gold block mt-1">A carregar logótipo...</span>}
                    {logoUrl && <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover mt-2 border" />}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Imagem de Capa</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-konecta-navy file:text-white"
                    />
                    {uploadingCover && <span className="text-[10px] text-konecta-gold block mt-1">A carregar capa...</span>}
                    {coverUrl && <img src={coverUrl} alt="" className="w-24 h-12 rounded-xl object-cover mt-2 border" />}
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || uploadingLogo || uploadingCover || !name.trim()}
                    className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(creating || uploadingLogo || uploadingCover) && (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {uploadingLogo || uploadingCover ? 'A carregar imagem...' : creating ? 'A criar...' : 'Criar Organização'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
