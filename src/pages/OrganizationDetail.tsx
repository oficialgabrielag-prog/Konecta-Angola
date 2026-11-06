import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { useToast } from '../context/UIContext';
import { OrgBadge } from '../components/UserBadges';
import { GoogleDrivePickerModal, SelectedDocumentResult } from '../components/GoogleDrivePickerModal';

interface OrganizationDetailProps {
  slug: string;
  user: any;
  onOpenAuth: () => void;
  onBack: () => void;
}

export const OrganizationDetail: React.FC<OrganizationDetailProps> = ({ slug, user, onOpenAuth, onBack }) => {
  const { showToast } = useToast();
  const [org, setOrg] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'publicacoes' | 'documentos' | 'membros' | 'sobre'>('geral');

  // Related data
  const [posts, setPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [posting, setPosting] = useState(false);

  // New Document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Relatórios');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showDriveModalForOrg, setShowDriveModalForOrg] = useState(false);
  const [driveDocName, setDriveDocName] = useState('');

  // Verification request modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDetails, setVerifyDetails] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Edit Organization modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('church');
  const [editDescription, setEditDescription] = useState('');
  const [editMission, setEditMission] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editProvince, setEditProvince] = useState('Luanda');
  const [editMunicipality, setEditMunicipality] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [uploadingEditCover, setUploadingEditCover] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const categories = [
    { key: 'church', label: 'Igrejas' },
    { key: 'political_party', label: 'Partidos Políticos' },
    { key: 'civic_movement', label: 'Movimentos Cívicos' },
    { key: 'writer_poet', label: 'Escritores e Poetas' },
    { key: 'association', label: 'Associações' },
    { key: 'ngo', label: 'ONGs' },
    { key: 'school_university', label: 'Escolas e Universidades' },
    { key: 'other', label: 'Outras Instituições' }
  ];

  const provinces = [
    'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Cuanza Sul', 
    'Cuanza Norte', 'Malanje', 'Uíge', 'Zaire', 'Lunda Norte', 'Lunda Sul',
    'Bié', 'Moxico', 'Quando Cubango', 'Namibe', 'Cunene', 'Bengo'
  ];

  const openEditModal = () => {
    if (!org) return;
    setEditName(org.name || '');
    setEditCategory(org.category || 'church');
    setEditDescription(org.description || '');
    setEditMission(org.mission || '');
    setEditWebsite(org.website_url || org.website || '');
    setEditEmail(org.contact_email || org.email || '');
    setEditPhone(org.contact_phone || org.phone || '');
    setEditAddress(org.address || '');
    setEditProvince(org.province || 'Luanda');
    setEditMunicipality(org.municipality || '');
    setEditLogoUrl(org.logo_url || '');
    setEditCoverUrl(org.cover_url || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEditLogo(true);
    setEditError(null);
    try {
      const res = await uploadMediaToCloudinary(file);
      setEditLogoUrl(res.secure_url);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao carregar logótipo.');
    } finally {
      setUploadingEditLogo(false);
    }
  };

  const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEditCover(true);
    setEditError(null);
    try {
      const res = await uploadMediaToCloudinary(file);
      setEditCoverUrl(res.secure_url);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao carregar capa.');
    } finally {
      setUploadingEditCover(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || savingEdit || uploadingEditLogo || uploadingEditCover) return;
    if (!editName.trim()) {
      setEditError('Por favor, introduza o nome da organização.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      let formattedWebsite = editWebsite.trim();
      if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      const updatePayload = {
        name: editName.trim(),
        category: editCategory,
        description: editDescription.trim() || null,
        mission: editMission.trim() || null,
        website_url: formattedWebsite || null,
        contact_email: editEmail.trim() || null,
        contact_phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        province: editProvince,
        municipality: editMunicipality.trim() || '',
        logo_url: editLogoUrl || null,
        cover_url: editCoverUrl || null
      };

      const res = await d1Client.organizations.update(org.id, updatePayload);
      if (res.error) {
        throw new Error(res.error.message || 'Erro ao atualizar organização.');
      }

      setShowEditModal(false);
      showToast('Organização atualizada com sucesso!', 'success');
      fetchOrgDetail();
    } catch (err: any) {
      console.error('Erro em handleSaveEdit:', err);
      setEditError(err.message || 'Erro ao guardar alterações.');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    fetchOrgDetail();
  }, [slug]);

  const fetchOrgDetail = async () => {
    setLoading(true);
    try {
      const res = await d1Client.organizations.getBySlug(slug);
      if (res.data) {
        const data = res.data;
        setOrg(data);
        if (user) {
          const following = (data.organization_followers || []).some((f: any) => f.user_id === user.id);
          setIsFollowing(following);
        }

        // Fetch sub-resources
        const [postsRes, docsRes, membersRes] = await Promise.all([
          d1Client.organizations.getPosts(data.id),
          d1Client.organizations.getDocuments(data.id),
          d1Client.organizations.getMembers(data.id)
        ]);

        setPosts(postsRes.data?.data || postsRes.data || []);
        setDocuments(docsRes.data?.data || docsRes.data || []);
        setMembers(membersRes.data?.data || membersRes.data || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar detalhes da organização:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!org) return;

    setActionLoading(true);
    try {
      await d1Client.organizations.toggleFollow(org.id, isFollowing);
      setIsFollowing(!isFollowing);
      fetchOrgDetail();
    } catch (err) {
      console.warn(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postBody.trim() || posting) return;
    setPosting(true);
    try {
      const res = await d1Client.organizations.createPost(org.id, {
        title: postTitle.trim() || undefined,
        body: postBody.trim(),
        media_url: postMediaUrl || undefined
      });

      if (res.error) {
        showToast(typeof res.error === 'string' ? res.error : res.error.message || 'Erro ao publicar.', 'error');
        setPosting(false);
        return;
      }

      const createdPost = res.data?.data || res.data;
      if (res.message || createdPost?.status === 'review') {
        showToast(res.message || 'Publicação enviada para revisão de segurança.', 'info');
      } else {
        showToast('Publicação criada com sucesso!', 'success');
      }

      setShowPostModal(false);
      setPostTitle('');
      setPostBody('');
      setPostMediaUrl('');
      fetchOrgDetail();
    } catch (err: any) {
      console.error('Erro ao publicar na organização:', err);
      showToast(err.message || 'Erro ao publicar.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileUrl) return;
    setUploadingDoc(true);
    try {
      await d1Client.organizations.uploadDocument(org.id, {
        title: docTitle.trim(),
        category: docCategory,
        file_url: docFileUrl
      });
      setShowDocModal(false);
      setDocTitle('');
      setDocFileUrl('');
      fetchOrgDetail();
      showToast('Documento institucional carregado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao enviar documento:', err);
      showToast(err.message || 'Erro ao enviar documento.', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyDetails.trim() || submittingVerify) return;
    setSubmittingVerify(true);
    try {
      await d1Client.organizations.requestVerification(org.id, { details: verifyDetails.trim() });
      setShowVerifyModal(false);
      setVerifyDetails('');
      showToast('Pedido de verificação enviado com sucesso. Aguarda análise da administração.', 'success');
    } catch (err: any) {
      console.error('Erro ao solicitar verificação:', err);
      showToast(err.message || 'Erro ao solicitar verificação.', 'error');
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-konecta-navy mb-3">Organização não encontrada</h2>
        <button onClick={onBack} className="btn-primary py-2.5 px-6 text-xs">Voltar</button>
      </div>
    );
  }

  const isOwner = user && org.owner_id === user.id;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14 space-y-8">
      
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
      </button>

      {/* Cover & Header */}
      <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
        <div className="h-48 sm:h-64 bg-gradient-to-br from-konecta-navy/20 to-konecta-gold/20 relative">
          {org.cover_url && <img src={org.cover_url} alt="" className="w-full h-full object-cover" />}
        </div>

        <div className="px-6 sm:px-10 pb-8 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-16 sm:-mt-20">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white bg-konecta-navy text-white text-3xl font-black flex items-center justify-center overflow-hidden shadow-lg">
              {org.logo_url ? <img src={org.logo_url} alt="" className="w-full h-full object-cover" /> : org.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-konecta-navy text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                  {org.category}
                </span>
                <OrgBadge organization={org} size="sm" showLabel={true} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-konecta-navy">{org.name}</h1>
              </div>
              <p className="text-xs text-gray-500 mt-1">{org.province}{org.municipality ? `, ${org.municipality}` : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleFollow}
              disabled={actionLoading}
              className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600' : 'btn-primary'
              }`}
            >
              {isFollowing ? 'A seguir ✓' : 'Seguir Organização'}
            </button>

            {isOwner && (
              <button
                onClick={openEditModal}
                className="btn-secondary py-2.5 px-5 text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar Organização
              </button>
            )}

            {isOwner && !org.verified && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="btn-gold py-2.5 px-5 text-xs"
              >
                Solicitar Verificação
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {[
          { key: 'geral', label: 'Visão Geral', icon: 'dashboard' },
          { key: 'publicacoes', label: `Publicações (${posts.length})`, icon: 'article' },
          { key: 'documentos', label: `Documentos (${documents.length})`, icon: 'folder' },
          { key: 'membros', label: `Membros (${members.length})`, icon: 'group' },
          { key: 'sobre', label: 'Sobre & Contactos', icon: 'info' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.key ? 'bg-konecta-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider">Missão & Propósito</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {org.mission || org.description || 'Nenhuma descrição informada.'}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-konecta-navy uppercase tracking-wider">Últimas Publicações</h3>
                  {isOwner && (
                    <button onClick={() => setShowPostModal(true)} className="btn-primary py-1.5 px-4 text-xs">
                      + Publicar
                    </button>
                  )}
                </div>

                {posts.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Ainda não existem publicações desta organização.</p>
                ) : (
                  <div className="space-y-4">
                    {posts.slice(0, 3).map(p => (
                      <div key={p.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        {p.title && <h4 className="font-bold text-konecta-navy text-sm">{p.title}</h4>}
                        <p className="text-xs text-gray-600 leading-relaxed">{p.body}</p>
                        {p.media_url && (
                          <div className="mt-3 rounded-xl overflow-hidden max-h-60 bg-gray-100">
                            <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 block pt-1">{new Date(p.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'publicacoes' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-konecta-navy">Publicações & Comunicados</h3>
                {isOwner && (
                  <button onClick={() => setShowPostModal(true)} className="btn-primary py-2 px-5 text-xs">
                    + Nova Publicação
                  </button>
                )}
              </div>

              {posts.length === 0 ? (
                <p className="text-xs text-gray-400 py-12 text-center">Nenhuma publicação encontrada.</p>
              ) : (
                <div className="space-y-6">
                  {posts.map(p => (
                    <div key={p.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                      {p.title && <h4 className="font-bold text-konecta-navy text-base">{p.title}</h4>}
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{p.body}</p>
                      {p.media_url && (
                        <div className="rounded-2xl overflow-hidden max-h-80 bg-gray-100">
                          <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 block">{new Date(p.created_at).toLocaleString('pt-AO')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-konecta-navy">Biblioteca de Documentos Institucionais</h3>
                {isOwner && (
                  <button onClick={() => setShowDocModal(true)} className="btn-primary py-2 px-5 text-xs">
                    + Carregar Documento
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <p className="text-xs text-gray-400 py-12 text-center">Nenhum documento disponível.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl text-konecta-gold">description</span>
                        <div>
                          <h4 className="text-xs font-bold text-konecta-navy">{doc.title}</h4>
                          <span className="text-[10px] text-gray-400 uppercase">{doc.category || 'Geral'}</span>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn-primary py-1.5 px-3 text-[10px]">
                        Descarregar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'membros' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-konecta-navy">Membros & Equipa Diretiva</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map(m => (
                  <div key={m.user_id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-konecta-navy text-white text-xs font-bold flex items-center justify-center overflow-hidden">
                        {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (m.profiles?.full_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-konecta-navy">{m.profiles?.full_name || 'Membro'}</h4>
                        <span className="text-[10px] text-konecta-gold uppercase font-bold">{m.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sobre' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-konecta-navy">Informações & Contactos Institucionais</h3>
              <div className="space-y-4 text-xs">
                {org.website && <p><strong>Website:</strong> <a href={org.website} target="_blank" rel="noreferrer" className="text-konecta-gold underline">{org.website}</a></p>}
                {org.email && <p><strong>Email:</strong> {org.email}</p>}
                {org.phone && <p><strong>Telefone:</strong> {org.phone}</p>}
                {org.address && <p><strong>Endereço:</strong> {org.address}</p>}
                <p><strong>Localização:</strong> {org.province}{org.municipality ? `, ${org.municipality}` : ''}</p>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">Estatísticas</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <span className="text-xl font-black text-konecta-navy block">{org.followers_count || 0}</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Seguidores</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <span className="text-xl font-black text-konecta-navy block">{members.length}</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Membros</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
              <h3 className="text-lg font-bold text-konecta-navy">Publicar Comunicado ou Mensagem</h3>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Título (opcional)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                />
                <textarea
                  required
                  rows={4}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Escreve o comunicado..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                />
                <input
                  type="url"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  placeholder="URL de imagem opcional"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowPostModal(false)} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={posting || !postBody.trim()} className="btn-primary py-2 px-5 text-xs">Publicar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Document Modal */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
              <h3 className="text-lg font-bold text-konecta-navy">Carregar Documento Institucional</h3>
              <form onSubmit={handleUploadDoc} className="space-y-4">
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Título do Documento"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                />
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Manifestos">Manifestos</option>
                  <option value="Relatórios">Relatórios</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Políticas">Políticas</option>
                  <option value="Livros">Livros</option>
                  <option value="Atas">Atas</option>
                  <option value="Geral">Documentos Gerais</option>
                </select>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDriveModalForOrg(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      <span>Importar do Google Drive</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Ou carregar ficheiro local:</span>
                    <input
                      type="file"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setUploadingDoc(true);
                          try {
                            const res = await uploadMediaToCloudinary(f, undefined, { kind: 'document' });
                            setDocFileUrl(res.secure_url);
                            setDriveDocName('');
                            if (!docTitle.trim()) setDocTitle(f.name.replace(/\.[^/.]+$/, ''));
                          } finally {
                            setUploadingDoc(false);
                          }
                        }
                      }}
                      className="text-xs text-gray-500 flex-1"
                    />
                  </div>

                  {docFileUrl && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                        <span className="font-semibold truncate">
                          {driveDocName ? `Ficheiro Google Drive: ${driveDocName}` : 'Documento pronto para envio'}
                        </span>
                      </div>
                      <a href={docFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline font-bold shrink-0">
                        Ver
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowDocModal(false); setDriveDocName(''); setDocFileUrl(''); }} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={uploadingDoc || !docTitle.trim() || !docFileUrl} className="btn-primary py-2 px-5 text-xs">
                    {uploadingDoc ? 'A enviar...' : 'Guardar Documento'}
                  </button>
                </div>
              </form>

              <GoogleDrivePickerModal
                isOpen={showDriveModalForOrg}
                onClose={() => setShowDriveModalForOrg(false)}
                title="Selecionar Documento Institucional do Google Drive"
                onSelectDocument={(doc) => {
                  setDocFileUrl(doc.cloudinaryUrl || doc.driveUrl || '');
                  setDriveDocName(doc.name);
                  if (!docTitle.trim()) {
                    setDocTitle(doc.name.replace(/\.[^/.]+$/, ''));
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
              <h3 className="text-lg font-bold text-konecta-navy">Solicitar Verificação Institucional</h3>
              <p className="text-xs text-gray-500">Forneça detalhes legais, NIF ou link oficial que comprove a legitimidade da organização.</p>
              <form onSubmit={handleRequestVerification} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  value={verifyDetails}
                  onChange={(e) => setVerifyDetails(e.target.value)}
                  placeholder="Detalhes legais de identificação..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowVerifyModal(false)} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={submittingVerify || !verifyDetails.trim()} className="btn-gold py-2 px-5 text-xs">Enviar Pedido</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Organization Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Editar Informações da Organização</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Nome da Organização</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Igreja Evangélica / Editora Luanda"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Categoria</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
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
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Breve resumo sobre a instituição ou autor..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Missão</label>
                  <input
                    type="text"
                    value={editMission}
                    onChange={(e) => setEditMission(e.target.value)}
                    placeholder="Missão ou propósito principal..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Província</label>
                    <select
                      value={editProvince}
                      onChange={(e) => setEditProvince(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium"
                    >
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Município</label>
                    <input
                      type="text"
                      value={editMunicipality}
                      onChange={(e) => setEditMunicipality(e.target.value)}
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
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="www.exemplo.ao"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="contacto@org.ao"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Telefone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
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
                      onChange={handleEditLogoUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-konecta-navy file:text-white"
                    />
                    {uploadingEditLogo && <span className="text-[10px] text-konecta-gold block mt-1">A carregar logótipo...</span>}
                    {editLogoUrl && <img src={editLogoUrl} alt="" className="w-12 h-12 rounded-xl object-cover mt-2 border" />}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Imagem de Capa</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditCoverUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-konecta-navy file:text-white"
                    />
                    {uploadingEditCover && <span className="text-[10px] text-konecta-gold block mt-1">A carregar capa...</span>}
                    {editCoverUrl && <img src={editCoverUrl} alt="" className="w-24 h-12 rounded-xl object-cover mt-2 border" />}
                  </div>
                </div>

                {editError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{editError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || uploadingEditLogo || uploadingEditCover || !editName.trim()}
                    className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(savingEdit || uploadingEditLogo || uploadingEditCover) && (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {uploadingEditLogo || uploadingEditCover ? 'A carregar imagem...' : savingEdit ? 'A guardar...' : 'Guardar Alterações'}
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
