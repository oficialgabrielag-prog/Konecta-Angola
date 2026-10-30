import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Project, Post, Follow } from '../types';
import { uploadToCloudflare } from '../lib/cloudinary';
import { d1Client } from '../lib/d1Client';

interface ProfileProps {
  user: any;
  onOpenAuth: () => void;
  userIdeas: Idea[];
  userProjects: Project[];
  onUpdateProfile: (updated: any) => void;
  onIdeaCreated: () => void;
  onDeleteIdea: (id: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({
  user,
  onOpenAuth,
  userIdeas,
  userProjects,
  onUpdateProfile,
  onIdeaCreated,
  onDeleteIdea,
}) => {
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'ideas' | 'projects' | 'bookmarks'>('posts');
  
  // Data states
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Social stats (Followers & Following)
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProvince, setEditProvince] = useState('Luanda');
  const [editMunicipality, setEditMunicipality] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchFollowData();
      fetchBookmarkedPosts();
      initEditProfileForm();
    }
  }, [user]);

  const initEditProfileForm = async () => {
    try {
      const d1Res = await d1Client.profiles.get(user.id);
      if (d1Res.data?.data) {
        const profile = d1Res.data.data;
        setEditFullName(profile.full_name || user.user_metadata?.full_name || user.full_name || '');
        setEditBio(profile.bio || '');
        setEditProvince(profile.province || 'Luanda');
        setEditMunicipality(profile.municipality || '');
      } else {
        setEditFullName(user.user_metadata?.full_name || user.full_name || '');
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar perfil:', err?.message || err);
    }
  };

  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data } = await d1Client.posts.list(50, user.id);
      setUserPosts(data?.data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar posts:', err?.message || err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchBookmarkedPosts = async () => {
    setLoadingBookmarks(true);
    try {
      const { data } = await d1Client.posts.getBookmarks();
      setBookmarkedPosts(data?.data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar favoritos:', err?.message || err);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const fetchFollowData = async () => {
    try {
      const [d1Followers, d1Following] = await Promise.all([
        d1Client.profiles.getFollowers(user.id),
        d1Client.profiles.getFollowing(user.id)
      ]);

      setFollowers(d1Followers.data?.data || []);
      setFollowing(d1Following.data?.data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar seguidores:', err?.message || err);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const url = await uploadToCloudflare(file);
      await d1Client.profiles.update(user.id, { avatar_url: url });

      onUpdateProfile({ ...user.user_metadata, avatar_url: url });
      onIdeaCreated();
      fetchUserPosts();
    } catch (err: any) {
      console.warn('Aviso ao atualizar fotografia de perfil:', err?.message || err);
      alert(err?.message || 'Erro ao atualizar fotografia.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if ((!newPostText.trim() && !pendingImage) || !user || publishing) return;

    setPublishing(true);
    try {
      let imageUrl = '';
      if (pendingImage) {
        imageUrl = await uploadToCloudflare(pendingImage);
      }

      const res = await d1Client.posts.create({
        content: newPostText.trim(),
        image_url: imageUrl || undefined,
      });

      const createdPost = res.data?.data;
      if (createdPost) {
        setUserPosts(prev => [createdPost, ...prev]);
      }
      
      setNewPostText('');
      setPendingImage(null);
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
      setPendingImagePreview(null);
      fetchUserPosts();
    } catch (err: any) {
      console.warn('Aviso ao publicar post:', err?.message || err);
      alert(err?.message || 'Erro ao publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Tens a certeza que queres eliminar esta publicação?')) return;
    
    try {
      await d1Client.posts.delete(id);
      setUserPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.warn('Aviso ao eliminar post:', err?.message || err);
      alert(err?.message || 'Erro ao eliminar publicação.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || savingProfile) return;

    setSavingProfile(true);
    try {
      await d1Client.profiles.update(user.id, {
        full_name: editFullName.trim(),
        bio: editBio.trim() || null,
        province: editProvince,
        municipality: editMunicipality.trim() || null
      });

      onUpdateProfile({
        ...user.user_metadata,
        full_name: editFullName.trim(),
        province: editProvince,
        municipality: editMunicipality.trim()
      });

      setShowEditModal(false);
      onIdeaCreated();
    } catch (err: any) {
      console.warn('Aviso ao guardar perfil:', err?.message || err);
      alert(err?.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-konecta-navy uppercase tracking-tighter">O Teu Perfil</h2>
        <p className="text-gray-500 mb-8 text-sm">Inicia sessão para gerires as tuas publicações, projetos e rede de conexões.</p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">Entrar na Conta →</button>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.avatar_url;
  const fullName = editFullName || user.user_metadata?.full_name || user.full_name || 'Membro Konecta';

  return (
    <div className="bg-konecta-bg min-h-screen pb-20">
      
      {/* PROFILE HEADER */}
      <header className="bg-white border-b border-gray-100 pt-12 pb-8 px-6 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="relative group">
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-[32px] overflow-hidden bg-gray-50 border-4 border-white shadow-xl relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200 uppercase">
                  {fullName.charAt(0)}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-konecta-navy/60 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-konecta-gold text-konecta-navy w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg border-2 border-white" title="Mudar fotografia de perfil">
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-[0.2em] bg-konecta-gold/10 px-2.5 py-1 rounded-full border border-konecta-gold/20 inline-block">
              Inovador Registado
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-konecta-navy">{fullName}</h1>
            <p className="text-gray-500 text-sm font-medium">
              @{user.email?.split('@')[0]} · {editProvince || 'Angola'}
            </p>

            {editBio && (
              <p className="text-xs text-gray-600 max-w-lg mt-2 leading-relaxed">
                {editBio}
              </p>
            )}

            {/* Social Counts */}
            <div className="flex items-center justify-center md:justify-start gap-6 pt-3">
              <button 
                onClick={() => setShowFollowModal('followers')}
                className="text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors"
              >
                <span className="font-black text-sm mr-1">{followers.length}</span> 
                <span className="text-gray-400 font-normal">Seguidores</span>
              </button>
              <button 
                onClick={() => setShowFollowModal('following')}
                className="text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors"
              >
                <span className="font-black text-sm mr-1">{following.length}</span> 
                <span className="text-gray-400 font-normal">A Seguir</span>
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setShowEditModal(true)}
              className="btn-primary py-2.5 px-6 text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Editar Perfil
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="max-w-4xl mx-auto flex gap-8 mt-10 overflow-x-auto scrollbar-hide border-t border-gray-100 pt-4">
          <button 
            onClick={() => setActiveTab('posts')} 
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'posts' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
          >
            Publicações ({userPosts.length})
            {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('ideas')} 
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'ideas' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
          >
            Minhas Ideias ({userIdeas.length})
            {activeTab === 'ideas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('projects')} 
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'projects' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
          >
            Projetos Ativos ({userProjects.length})
            {activeTab === 'projects' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('bookmarks')} 
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'bookmarks' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
          >
            Favoritos ({bookmarkedPosts.length})
            {activeTab === 'bookmarks' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="space-y-8">
            {/* Quick Post Box */}
            <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <textarea 
                placeholder="Partilha uma nova atualização, ideia rápida ou reflexão..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-konecta-navy rounded-2xl p-4 text-sm resize-none text-konecta-navy"
                rows={3}
              />

              <AnimatePresence>
                {pendingImagePreview && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative inline-block mt-2"
                  >
                    <img src={pendingImagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-100 shadow-sm" />
                    <button 
                      onClick={() => { setPendingImage(null); setPendingImagePreview(null); }} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined text-[20px] text-konecta-gold">add_photo_alternate</span>
                  Adicionar Foto
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                <button 
                  onClick={handlePublish} 
                  disabled={publishing || (!newPostText.trim() && !pendingImage)} 
                  className="btn-primary py-2.5 px-7 text-xs"
                >
                  {publishing ? 'A publicar...' : 'Publicar'}
                </button>
              </div>
            </section>

            {/* Posts List */}
            <div className="space-y-6">
              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-konecta-navy"></div>
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-gray-400 italic text-sm">Ainda não partilhaste nenhuma publicação no teu perfil.</p>
                </div>
              ) : (
                userPosts.map((post) => (
                  <article key={post.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest">Publicação Pessoal</span>
                        <span className="metadata-text">{new Date(post.created_at || '').toLocaleDateString('pt-AO')}</span>
                      </div>
                      <button 
                        onClick={() => handleDeletePost(post.id)} 
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all"
                        title="Eliminar publicação"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</div>
                    {post.image_url && <img src={post.image_url} className="mt-5 rounded-2xl w-full h-auto max-h-96 object-cover border border-gray-100" alt="" />}
                    <div className="flex gap-6 mt-6 pt-4 border-t border-gray-50 text-xs text-gray-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-red-400">favorite</span> {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span> {post.comments_count || 0}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {/* IDEAS TAB */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {userIdeas.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-5xl text-gray-200 mb-2">lightbulb</span>
                <p className="text-gray-400 italic text-sm">Ainda não registaste nenhuma ideia comunitária.</p>
              </div>
            ) : (
              userIdeas.map((idea) => (
                <div key={idea.id} className="card-konecta p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest">{idea.category}</span>
                    <h3 className="text-xl font-bold text-konecta-navy">{idea.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{idea.description}</p>
                    <span className="text-[10px] text-gray-400 block pt-2">
                      {idea.votes_count || 0} apoios · {new Date(idea.created_at || '').toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Tens a certeza de que queres eliminar esta ideia da plataforma KONECTA? Esta ação é irreversível.')) {
                        onDeleteIdea(idea.id);
                      }
                    }}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"
                    title="Eliminar ideia"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {userProjects.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-5xl text-gray-200 mb-2">folder_open</span>
                <p className="text-gray-400 italic text-sm">Não lideras nenhum projeto ativo de momento.</p>
              </div>
            ) : (
              userProjects.map((p) => (
                <div key={p.id} className="card-konecta p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest">{p.category}</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{p.status}</span>
                  </div>
                  <h3 className="text-xl font-bold text-konecta-navy mb-2">{p.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-6">
            {loadingBookmarks ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-konecta-navy"></div>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-5xl text-gray-200 mb-2">bookmark_border</span>
                <p className="text-gray-400 italic text-sm">Ainda não guardaste nenhuma publicação nos favoritos.</p>
              </div>
            ) : (
              bookmarkedPosts.map((post) => (
                <article key={post.id} className="card-konecta p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0">
                      {post.profiles?.avatar_url && (
                        <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-konecta-navy">{post.profiles?.full_name || 'Utilizador'}</h4>
                      <p className="text-[10px] text-gray-400 uppercase">{post.profiles?.province || 'Angola'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && <img src={post.image_url} alt="" className="mt-4 rounded-xl max-h-80 w-full object-cover" />}
                </article>
              ))
            )}
          </div>
        )}

      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xl font-bold text-konecta-navy">Editar Dados do Perfil</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                    Biografia / Ocupação
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Conta um pouco sobre a tua experiência, projetos e áreas de interesse..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                      Província
                    </label>
                    <select
                      value={editProvince}
                      onChange={(e) => setEditProvince(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="Luanda">Luanda</option>
                      <option value="Benguela">Benguela</option>
                      <option value="Huambo">Huambo</option>
                      <option value="Huíla">Huíla</option>
                      <option value="Cabinda">Cabinda</option>
                      <option value="Uíge">Uíge</option>
                      <option value="Malanje">Malanje</option>
                      <option value="Namibe">Namibe</option>
                      <option value="Zaire">Zaire</option>
                      <option value="Cuanza Sul">Cuanza Sul</option>
                      <option value="Cuanza Norte">Cuanza Norte</option>
                      <option value="Bié">Bié</option>
                      <option value="Moxico">Moxico</option>
                      <option value="Cunene">Cunene</option>
                      <option value="Quando Cubango">Quando Cubango</option>
                      <option value="Lunda Norte">Lunda Norte</option>
                      <option value="Lunda Sul">Lunda Sul</option>
                      <option value="Bengo">Bengo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                      Município
                    </label>
                    <input
                      type="text"
                      value={editMunicipality}
                      onChange={(e) => setEditMunicipality(e.target.value)}
                      placeholder="Ex: Cazenga, Kilamba Kiaxi"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile || !editFullName.trim()}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {savingProfile ? 'A gravar...' : 'Guardar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Followers / Following Modal */}
      <AnimatePresence>
        {showFollowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-konecta-navy">
                  {showFollowModal === 'followers' ? 'Seguidores' : 'A Seguir'}
                </h3>
                <button onClick={() => setShowFollowModal(null)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {(showFollowModal === 'followers' ? followers : following).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-8">
                    Nenhum utilizador registado nesta lista ainda.
                  </p>
                ) : (
                  (showFollowModal === 'followers' ? followers : following).map((item) => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                        {item.profiles?.avatar_url && (
                          <img src={item.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-konecta-navy">{item.profiles?.full_name || 'Utilizador'}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{item.profiles?.province || 'Angola'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
