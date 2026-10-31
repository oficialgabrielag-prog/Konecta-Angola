import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Community, Post, CommunityMember, CommunityAnnouncement, CommunityRule, CommentItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadToCloudinary } from '../lib/cloudinary';
import { KonectaRealtimeService } from '../lib/realtime';

interface CommunityDetailProps {
  communityId: string;
  user: any;
  onOpenAuth: () => void;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
  onImageClick: (url: string) => void;
}

export const CommunityDetail: React.FC<CommunityDetailProps> = ({
  communityId,
  user,
  onOpenAuth,
  onBack,
  onSelectUser,
  onImageClick,
}) => {
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('inicio');

  // Sub-data states
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);

  // New Post State inside community
  const [postContent, setPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [publishingPost, setPublishingPost] = useState(false);
  const postFileRef = useRef<HTMLInputElement>(null);

  // Comments for Posts
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Announcements Form (for owner/admin)
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [publishingAnn, setPublishingAnn] = useState(false);

  // Rules Form (for owner/admin)
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleBody, setRuleBody] = useState('');
  const [publishingRule, setPublishingRule] = useState(false);

  // Settings State (for owner/admin)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [savingSettings, setSavingSettings] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const isOwner = community?.owner_id === user?.id;

  useEffect(() => {
    loadCommunityData();

    // Subscribe to realtime changes on community tables
    const unsub1 = KonectaRealtimeService.subscribe('posts', () => loadPosts());
    const unsub2 = KonectaRealtimeService.subscribe('community_members', () => loadMembers());
    const unsub3 = KonectaRealtimeService.subscribe('community_announcements', () => loadAnnouncements());
    const unsub4 = KonectaRealtimeService.subscribe('community_rules', () => loadRules());

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [communityId, user]);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const commRes = await d1Client.communities.getById(communityId);
      const commData = commRes.data?.data || commRes.data;
      if (commData) {
        setCommunity(commData);
        setEditName(commData.name);
        setEditDesc(commData.description || '');
        setEditAvatar(commData.avatar_url || '');
        setEditCover(commData.cover_url || '');
        setEditVisibility(commData.visibility || 'public');
      }

      await Promise.all([
        loadPosts(),
        loadMembers(),
        loadAnnouncements(),
        loadRules()
      ]);
    } catch (err) {
      console.warn('Erro ao carregar comunidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await d1Client.posts.list(50, undefined, communityId);
      const items = res.data?.data || res.data || [];
      setPosts(items);
    } catch (e) {}
  };

  const loadMembers = async () => {
    try {
      const res = await d1Client.communities.getMembers(communityId);
      const items = res.data?.data || res.data || [];
      setMembers(items);
      if (user) {
        setIsMember(items.some((m: any) => m.user_id === user.id) || community?.owner_id === user.id);
      }
    } catch (e) {}
  };

  const loadAnnouncements = async () => {
    try {
      const res = await d1Client.communities.getAnnouncements(communityId);
      setAnnouncements(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const loadRules = async () => {
    try {
      const res = await d1Client.communities.getRules(communityId);
      setRules(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const handleToggleMembership = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (joining) return;

    setJoining(true);
    try {
      if (isMember && !isOwner) {
        await d1Client.communities.leave(communityId);
        setIsMember(false);
        setMembers(prev => prev.filter(m => m.user_id !== user.id));
      } else if (!isMember) {
        await d1Client.communities.join(communityId);
        setIsMember(true);
        setMembers(prev => [...prev, {
          id: `${communityId}_${user.id}`,
          community_id: communityId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
          profiles: {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Membro Konecta',
            avatar_url: user.user_metadata?.avatar_url
          }
        }]);
      }
    } catch (err) {
      console.warn('Erro na adesão à comunidade:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!postContent.trim() && !postImageFile) return;

    setPublishingPost(true);
    try {
      let imageUrl = '';
      if (postImageFile) {
        imageUrl = await uploadToCloudinary(postImageFile);
      }

      const res = await d1Client.posts.create({
        content: postContent.trim(),
        image_url: imageUrl || undefined,
        community_id: communityId
      });

      if (res.data) {
        const newPost = res.data?.data || res.data;
        setPosts(prev => [newPost, ...prev]);
        setPostContent('');
        setPostImageFile(null);
        if (postImagePreview) URL.revokeObjectURL(postImagePreview);
        setPostImagePreview(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar no feed da comunidade.');
    } finally {
      setPublishingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const count = p.likes_count || 0;
        return { ...p, likes_count: count + 1 };
      }
      return p;
    }));
    await d1Client.posts.toggleLike(postId, false);
  };

  const toggleComments = async (postId: string) => {
    const next = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: next }));
    if (next && !postComments[postId]) {
      const res = await d1Client.posts.getComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: res.data?.data || res.data || [] }));
    }
  };

  const handleAddComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    const opt: CommentItem = {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Membro Konecta'
      }
    };

    setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), opt] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));

    await d1Client.posts.addComment(postId, text);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !annTitle.trim() || !annBody.trim()) return;

    setPublishingAnn(true);
    try {
      const res = await d1Client.communities.createAnnouncement(communityId, annTitle, annBody);
      if (res.data) {
        setAnnouncements(prev => [res.data?.data || res.data, ...prev]);
        setAnnTitle('');
        setAnnBody('');
      }
    } catch (e) {
      alert('Erro ao publicar anúncio.');
    } finally {
      setPublishingAnn(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !ruleTitle.trim() || !ruleBody.trim()) return;

    setPublishingRule(true);
    try {
      const res = await d1Client.communities.createRule(communityId, ruleTitle, ruleBody, rules.length + 1);
      if (res.data) {
        setRules(prev => [...prev, res.data?.data || res.data]);
        setRuleTitle('');
        setRuleBody('');
      }
    } catch (e) {
      alert('Erro ao adicionar regra.');
    } finally {
      setPublishingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!isOwner) return;
    setRules(prev => prev.filter(r => r.id !== ruleId));
    await d1Client.communities.deleteRule(ruleId);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setSavingSettings(true);
    try {
      await d1Client.communities.update(communityId, {
        name: editName.trim(),
        description: editDesc.trim(),
        avatar_url: editAvatar,
        cover_url: editCover,
        visibility: editVisibility
      });

      setCommunity(prev => prev ? {
        ...prev,
        name: editName.trim(),
        description: editDesc.trim(),
        avatar_url: editAvatar,
        cover_url: editCover,
        visibility: editVisibility
      } : null);

      alert('Configurações da comunidade guardadas com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao guardar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUploadImage = async (file: File, type: 'avatar' | 'cover') => {
    try {
      const url = await uploadToCloudinary(file);
      if (type === 'avatar') setEditAvatar(url);
      else setEditCover(url);
    } catch (err) {
      alert('Erro ao carregar imagem para o Cloudinary.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4">
        <h2 className="text-xl font-bold text-konecta-navy mb-2">Comunidade não encontrada</h2>
        <button onClick={onBack} className="btn-primary py-2 px-6 text-xs mt-4">
          Voltar às Comunidades
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'inicio', label: 'Início', icon: 'home' },
    { id: 'feed', label: 'Feed', icon: 'dynamic_feed', badge: posts.length },
    { id: 'sobre', label: 'Sobre', icon: 'info' },
    { id: 'publicacoes', label: 'Publicações', icon: 'grid_view' },
    { id: 'membros', label: 'Membros', icon: 'groups', badge: members.length },
    { id: 'anuncios', label: 'Anúncios', icon: 'campaign', badge: announcements.length },
    { id: 'regras', label: 'Regras', icon: 'gavel', badge: rules.length },
    ...(isOwner ? [{ id: 'configuracoes', label: 'Configurações e Gestão', icon: 'settings' }] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-konecta-navy transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Voltar às Comunidades
      </button>

      {/* Community Cover Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-konecta-navy to-slate-900 h-48 sm:h-64 shadow-md border border-gray-100">
        {community.cover_url ? (
          <img src={community.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30 text-white">
            <span className="material-symbols-outlined text-8xl">groups</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Header Overlay Content */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 overflow-hidden shadow-xl shrink-0 border-2 border-konecta-gold">
              {community.avatar_url ? (
                <img src={community.avatar_url} alt={community.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-konecta-navy rounded-xl flex items-center justify-center font-black text-konecta-gold text-2xl">
                  {community.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-konecta-gold bg-black/40 px-2.5 py-0.5 rounded-full border border-konecta-gold/30">
                  {community.visibility === 'private' ? 'Privada' : 'Pública'}
                </span>
                <span className="text-xs text-gray-300">
                  {members.length} {members.length === 1 ? 'Membro' : 'Membros'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 leading-tight">{community.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOwner ? (
              <button
                onClick={() => setActiveTab('configuracoes')}
                className="btn-gold py-2 px-5 text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Gerir Comunidade
              </button>
            ) : (
              <button
                onClick={handleToggleMembership}
                disabled={joining}
                className={`btn-primary py-2 px-6 text-xs font-bold transition-all ${
                  isMember ? 'bg-green-600 hover:bg-red-500 text-white' : ''
                }`}
              >
                {joining ? 'A processar...' : isMember ? 'Membro Ativo ✓' : 'Aderir à Comunidade'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-konecta-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-konecta-gold text-konecta-navy' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* TAB 1: INÍCIO */}
        {activeTab === 'inicio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Post Box */}
              {isMember && (
                <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">
                          {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      placeholder={`Publicar algo em ${community.name}...`}
                      className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-xs resize-none focus:ring-1 focus:ring-konecta-navy text-konecta-navy"
                    />
                  </div>

                  {postImagePreview && (
                    <div className="relative inline-block ml-13">
                      <img src={postImagePreview} alt="" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                      <button
                        onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => postFileRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                    >
                      <span className="material-symbols-outlined text-[18px] text-konecta-gold">image</span>
                      Foto / Anexo
                    </button>
                    <input
                      type="file"
                      ref={postFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setPostImageFile(f);
                          setPostImagePreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                    <button
                      onClick={handleCreatePost}
                      disabled={publishingPost || (!postContent.trim() && !postImageFile)}
                      className="btn-primary py-2 px-6 text-xs"
                    >
                      {publishingPost ? 'A publicar...' : 'Publicar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Feed preview */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">
                  Publicações Recentes no Feed ({posts.length})
                </h3>
                {posts.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                    <p className="text-xs text-gray-400">Ainda não existem publicações nesta comunidade.</p>
                  </div>
                ) : (
                  posts.slice(0, 5).map(post => (
                    <div key={post.id} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden">
                          {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                              {post.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-konecta-navy">{post.profiles?.full_name || 'Membro Konecta'}</h4>
                          <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt=""
                          onClick={() => onImageClick(post.image_url!)}
                          className="rounded-xl max-h-80 w-full object-cover cursor-pointer hover:opacity-95"
                        />
                      )}
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">favorite</span>
                          {post.likes_count || 0}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-konecta-navy font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                          {post.comments_count || 0}
                        </button>
                      </div>

                      {/* Comments Drawer */}
                      {expandedComments[post.id] && (
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          {(postComments[post.id] || []).map(c => (
                            <div key={c.id} className="bg-gray-50 p-2.5 rounded-xl text-xs space-y-0.5">
                              <span className="font-bold text-konecta-navy">{c.profiles?.full_name || 'Membro'}</span>
                              <p className="text-gray-600">{c.content}</p>
                            </div>
                          ))}
                          <form onSubmit={e => handleAddComment(post.id, e)} className="flex gap-2 pt-1">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Escreve um comentário..."
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs"
                            />
                            <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                              Enviar
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              {/* About Box */}
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Sobre a Comunidade</h3>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{community.description}</p>
                <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
                  <p>Criada em {new Date(community.created_at).toLocaleDateString('pt-AO')}</p>
                  <p>Visibilidade: {community.visibility === 'private' ? 'Apenas para Membros' : 'Pública para todos'}</p>
                </div>
              </div>

              {/* Rules preview */}
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Regras Principais</h3>
                  <button onClick={() => setActiveTab('regras')} className="text-xs text-konecta-gold font-bold">Ver todas</button>
                </div>
                {rules.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma regra definida ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {rules.slice(0, 3).map((r, i) => (
                      <div key={r.id} className="text-xs bg-gray-50 p-2.5 rounded-xl">
                        <span className="font-bold text-konecta-navy">{i + 1}. {r.title}</span>
                        <p className="text-gray-500 text-[11px] mt-0.5">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Announcements preview */}
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Anúncios Oficiais</h3>
                  <button onClick={() => setActiveTab('anuncios')} className="text-xs text-konecta-gold font-bold">Ver todos</button>
                </div>
                {announcements.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sem anúncios no momento.</p>
                ) : (
                  <div className="space-y-2">
                    {announcements.slice(0, 2).map(a => (
                      <div key={a.id} className="p-3 bg-amber-50/60 border border-amber-200/50 rounded-xl space-y-1">
                        <span className="font-bold text-xs text-konecta-navy">{a.title}</span>
                        <p className="text-[11px] text-gray-600 line-clamp-2">{a.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEED COMPLETO DA COMUNIDADE */}
        {activeTab === 'feed' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {isMember && (
              <div className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <textarea
                  rows={3}
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder={`Publicar no feed de ${community.name}...`}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs resize-none focus:ring-1 focus:ring-konecta-navy text-konecta-navy"
                />
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => postFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    <span className="material-symbols-outlined text-[18px] text-konecta-gold">image</span>
                    Anexar Fotografia
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={publishingPost || (!postContent.trim() && !postImageFile)}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {publishingPost ? 'A publicar...' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {post.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-konecta-navy">{post.profiles?.full_name || 'Membro'}</h4>
                      <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      onClick={() => onImageClick(post.image_url!)}
                      className="rounded-xl max-h-96 w-full object-cover cursor-pointer"
                    />
                  )}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs">
                    <button onClick={() => handleLikePost(post.id)} className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 font-bold">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      {post.likes_count || 0}
                    </button>
                    <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 text-gray-500 hover:text-konecta-navy font-bold">
                      <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                      {post.comments_count || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SOBRE */}
        {activeTab === 'sobre' && (
          <div className="max-w-2xl mx-auto card-konecta p-8 space-y-6">
            <h3 className="text-lg font-bold text-konecta-navy">Sobre {community.name}</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{community.description}</p>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 text-xs">
              <div>
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Membros Registados</span>
                <span className="text-base font-black text-konecta-navy">{members.length}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Total de Publicações</span>
                <span className="text-base font-black text-konecta-navy">{posts.length}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Visibilidade</span>
                <span className="text-base font-black text-konecta-navy">{community.visibility}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Data de Criação</span>
                <span className="text-base font-black text-konecta-navy">{new Date(community.created_at).toLocaleDateString('pt-AO')}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PUBLICAÇÕES & FOTOGRAFIAS */}
        {(activeTab === 'publicacoes' || activeTab === 'fotografias') && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy mb-4">Galeria de Mídia da Comunidade</h3>
            {posts.filter(p => p.image_url).length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">image</span>
                <p className="text-xs text-gray-400">Nenhuma fotografia partilhada nesta comunidade ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {posts.filter(p => p.image_url).map(p => (
                  <div
                    key={p.id}
                    onClick={() => onImageClick(p.image_url!)}
                    className="h-44 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 border border-gray-100 shadow-xs"
                  >
                    <img src={p.image_url!} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MEMBROS */}
        {activeTab === 'membros' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Membros da Comunidade ({members.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map(m => (
                <div
                  key={m.id}
                  onClick={() => m.user_id && onSelectUser(m.user_id)}
                  className="card-konecta p-4 flex items-center gap-3 cursor-pointer hover:border-konecta-gold/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-sm">
                        {m.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-konecta-navy truncate">{m.profiles?.full_name || 'Membro Konecta'}</h4>
                    <span className="text-[10px] text-gray-400 block">
                      Aderiu a {new Date(m.joined_at).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: ANÚNCIOS */}
        {activeTab === 'anuncios' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {isOwner && (
              <form onSubmit={handleCreateAnnouncement} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Publicar Novo Anúncio Oficial</h4>
                <input
                  type="text"
                  required
                  placeholder="Título do anúncio..."
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Mensagem do anúncio para todos os membros..."
                  value={annBody}
                  onChange={e => setAnnBody(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy resize-none"
                />
                <button
                  type="submit"
                  disabled={publishingAnn || !annTitle.trim() || !annBody.trim()}
                  className="btn-gold py-2 px-6 text-xs font-bold"
                >
                  {publishingAnn ? 'A publicar...' : 'Lançar Anúncio'}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">campaign</span>
                  <p className="text-xs text-gray-400">Nenhum anúncio oficial publicado ainda.</p>
                </div>
              ) : (
                announcements.map(ann => (
                  <div key={ann.id} className="card-konecta p-6 border-l-4 border-l-konecta-gold shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-konecta-navy">{ann.title}</h4>
                      <span className="text-[10px] text-gray-400">{new Date(ann.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: REGRAS */}
        {activeTab === 'regras' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {isOwner && (
              <form onSubmit={handleCreateRule} className="card-konecta p-6 shadow-sm border border-gray-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-konecta-navy">Adicionar Regra de Convivência</h4>
                <input
                  type="text"
                  required
                  placeholder="Título da regra (ex: Seja respeitoso nos comentários)..."
                  value={ruleTitle}
                  onChange={e => setRuleTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Explicação detalhada da regra..."
                  value={ruleBody}
                  onChange={e => setRuleBody(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy resize-none"
                />
                <button
                  type="submit"
                  disabled={publishingRule || !ruleTitle.trim() || !ruleBody.trim()}
                  className="btn-gold py-2 px-6 text-xs font-bold"
                >
                  {publishingRule ? 'A adicionar...' : 'Gravar Regra'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">gavel</span>
                  <p className="text-xs text-gray-400">Nenhuma regra definida ainda.</p>
                </div>
              ) : (
                rules.map((rule, idx) => (
                  <div key={rule.id} className="card-konecta p-5 shadow-sm border border-gray-100 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-konecta-navy">
                        {idx + 1}. {rule.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{rule.body}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Eliminar regra"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: CONFIGURAÇÕES E GESTÃO (PARA OWNER) */}
        {activeTab === 'configuracoes' && isOwner && (
          <div className="max-w-2xl mx-auto card-konecta p-8 space-y-6">
            <h3 className="text-lg font-bold text-konecta-navy">Gestão e Configurações da Comunidade</h3>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                  Nome da Comunidade
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                  Descrição e Propósito
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                    Avatar da Comunidade
                  </label>
                  <div
                    onClick={() => avatarFileRef.current?.click()}
                    className="h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative"
                  >
                    {editAvatar ? (
                      <img src={editAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">Carregar Avatar</span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={avatarFileRef}
                    className="hidden"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'avatar')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                    Capa da Comunidade
                  </label>
                  <div
                    onClick={() => coverFileRef.current?.click()}
                    className="h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative"
                  >
                    {editCover ? (
                      <img src={editCover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">Carregar Capa</span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={coverFileRef}
                    className="hidden"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'cover')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-konecta-navy mb-1.5">
                  Privacidade
                </label>
                <select
                  value={editVisibility}
                  onChange={e => setEditVisibility(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="public">Pública (visível para todos os utilizadores)</option>
                  <option value="private">Privada (apenas membros aprovados)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary py-2.5 px-8 text-xs font-bold shadow-md"
                >
                  {savingSettings ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
