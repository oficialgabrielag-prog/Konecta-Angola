import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';

interface OrganizationDetailProps {
  slug: string;
  user: any;
  onOpenAuth: () => void;
  onBack: () => void;
}

export const OrganizationDetail: React.FC<OrganizationDetailProps> = ({ slug, user, onOpenAuth, onBack }) => {
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

  // Verification request modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDetails, setVerifyDetails] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

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
      await d1Client.organizations.createPost(org.id, {
        title: postTitle.trim() || undefined,
        body: postBody.trim(),
        media_url: postMediaUrl || undefined
      });
      setShowPostModal(false);
      setPostTitle('');
      setPostBody('');
      setPostMediaUrl('');
      fetchOrgDetail();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar.');
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
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar documento.');
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
      alert('Pedido de verificação enviado com sucesso. Aguarde análise da administração.');
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar verificação.');
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
                {org.verified && (
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-100">
                    <span className="material-symbols-outlined text-[14px]">verified</span> Verificada
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-konecta-navy">{org.name}</h1>
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
                <input
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const res = await uploadMediaToCloudinary(f);
                      setDocFileUrl(res.secure_url);
                    }
                  }}
                  className="text-xs text-gray-500"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowDocModal(false)} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={uploadingDoc || !docTitle.trim() || !docFileUrl} className="btn-primary py-2 px-5 text-xs">Guardar</button>
                </div>
              </form>
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

    </div>
  );
};
