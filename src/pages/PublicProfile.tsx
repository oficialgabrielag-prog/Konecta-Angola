import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Profile, Idea, Project, Post, Follow } from '../types';
import { supabase, safeQuery, isSchemaCacheError, getFriendlyErrorMessage } from '../lib/supabase';
import { d1Client } from '../lib/d1Client';
import { shareContent } from '../lib/share';

interface PublicProfileProps {
  userId: string;
  currentUser: any;
  onOpenAuth: () => void;
  onSelectIdea: (idea: Idea) => void;
  onBack: () => void;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({
  userId,
  currentUser,
  onOpenAuth,
  onSelectIdea,
  onBack,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userIdeas, setUserIdeas] = useState<Idea[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  
  // Follow State
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'posts' | 'ideas' | 'projects'>('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPublicProfileData();
    }
  }, [userId, currentUser]);

  const loadPublicProfileData = async () => {
    setLoading(true);
    try {
      const [
        d1Profile,
        profileRes,
        ideasRes,
        postsRes,
        projectsRes,
        d1Followers,
        d1Following,
        followersRes,
        followingRes
      ] = await Promise.all([
        d1Client.profiles.get(userId),
        safeQuery<any>(() => supabase.from('profiles').select('*').eq('id', userId).single()),
        safeQuery<any>(() => supabase.from('ideas').select('*, profiles(*)').eq('user_id', userId).order('created_at', { ascending: false })),
        safeQuery<any>(() => supabase.from('posts').select('*, profiles(*)').eq('user_id', userId).order('created_at', { ascending: false })),
        safeQuery<any>(() => supabase.from('projects').select('*, profiles(*)').eq('leader_id', userId).order('created_at', { ascending: false })),
        d1Client.profiles.getFollowers(userId),
        d1Client.profiles.getFollowing(userId),
        safeQuery<any>(() => supabase.from('follows').select('id, follower_id').eq('following_id', userId)),
        safeQuery<any>(() => supabase.from('follows').select('id').eq('follower_id', userId))
      ]);

      setProfile(d1Profile.data?.data || profileRes?.data || null);
      setUserIdeas(ideasRes?.data || []);
      setUserPosts(postsRes?.data || []);
      setUserProjects(projectsRes?.data || []);

      const followersMerged = [...(d1Followers.data?.data || []), ...(followersRes?.data || [])];
      const uniqueFollowers = Array.from(new Map(followersMerged.map(f => [f.follower_id || f.id, f])).values());
      
      setFollowersCount(uniqueFollowers.length);
      setFollowingCount((d1Following.data?.data?.length || 0) + (followingRes?.data?.length || 0));

      if (currentUser) {
        setIsFollowing(uniqueFollowers.some((f: any) => f.follower_id === currentUser.id));
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar perfil público:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (currentUser.id === userId || followLoading) return;

    setFollowLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount(prev => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (!nextState) {
        // Unfollow D1 and Supabase
        await Promise.all([
          d1Client.profiles.toggleFollow(userId, true),
          safeQuery<any>(() => supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId))
        ]);
      } else {
        // Follow D1 and Supabase
        await Promise.all([
          d1Client.profiles.toggleFollow(userId, false),
          safeQuery<any>(() => supabase
            .from('follows')
            .insert({
              follower_id: currentUser.id,
              following_id: userId
            }))
        ]);
      }
    } catch (err: any) {
      console.warn('Aviso ao atualizar seguidor:', err?.message || err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-konecta-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  const fullName = profile?.full_name || 'Membro Konecta';
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="bg-konecta-bg min-h-screen pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-100 pt-10 pb-8 px-6 shadow-xs">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-konecta-navy transition-colors flex items-center gap-2 group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Voltar
          </button>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-[32px] overflow-hidden bg-gray-100 border-4 border-white shadow-xl relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-300 uppercase">
                  {fullName.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-[0.2em] bg-konecta-gold/10 px-2.5 py-1 rounded-full border border-konecta-gold/20 inline-block">
                Perfil Público
              </span>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-konecta-navy">{fullName}</h1>
              <p className="text-gray-500 text-sm font-medium">
                {profile?.province || 'Angola'} {profile?.municipality ? `· ${profile.municipality}` : ''}
              </p>

              {profile?.bio && (
                <p className="text-xs text-gray-600 max-w-lg mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center justify-center md:justify-start gap-6 pt-2 text-xs font-bold text-konecta-navy">
                <div>
                  <span className="font-black text-sm mr-1">{followersCount}</span>
                  <span className="text-gray-400 font-normal">Seguidores</span>
                </div>
                <div>
                  <span className="font-black text-sm mr-1">{followingCount}</span>
                  <span className="text-gray-400 font-normal">A Seguir</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {currentUser?.id !== userId && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`btn-primary py-2.5 px-6 text-xs transition-all ${
                    isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200' : ''
                  }`}
                >
                  {followLoading ? '...' : isFollowing ? 'A Seguir ✓' : '+ Seguir Utilizador'}
                </button>
              )}
              <button
                onClick={async () => {
                  const res = await shareContent({
                    title: `Perfil de ${fullName} no KONECTA`,
                    text: profile?.bio || `Conheça o perfil de ${fullName} na plataforma KONECTA Angola`,
                    url: window.location.href
                  });
                  if (res.message && res.copied) alert(res.message);
                }}
                className="w-10 h-10 rounded-full border border-gray-200 hover:border-konecta-navy flex items-center justify-center text-konecta-navy transition-colors bg-white shadow-xs"
                title="Partilhar Perfil"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
              </button>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex gap-8 border-t border-gray-100 pt-4 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('posts')} 
              className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'posts' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
            >
              Publicações ({userPosts.length})
              {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('ideas')} 
              className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'ideas' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
            >
              Ideias ({userIdeas.length})
              {activeTab === 'ideas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('projects')} 
              className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'projects' ? 'text-konecta-navy' : 'text-gray-400 hover:text-konecta-navy'}`}
            >
              Projetos ({userProjects.length})
              {activeTab === 'projects' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-konecta-gold rounded-full" />}
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {userPosts.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400 italic text-sm">Este utilizador ainda não publicou no feed.</p>
              </div>
            ) : (
              userPosts.map((post) => (
                <article key={post.id} className="card-konecta p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-widest">Feed Social</span>
                    <span className="metadata-text">{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="mt-4 rounded-2xl w-full max-h-96 object-cover border border-gray-100" />
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {/* IDEAS TAB */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {userIdeas.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">lightbulb</span>
                <p className="text-gray-400 italic text-sm">Este utilizador ainda não submeteu ideias.</p>
              </div>
            ) : (
              userIdeas.map((idea) => (
                <div 
                  key={idea.id} 
                  onClick={() => onSelectIdea(idea)}
                  className="card-konecta p-6 cursor-pointer hover:border-konecta-gold/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-konecta-gold uppercase">{idea.category}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{idea.province || 'Angola'}</span>
                  </div>
                  <h3 className="text-xl font-bold text-konecta-navy mb-2">{idea.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{idea.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {userProjects.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">folder_open</span>
                <p className="text-gray-400 italic text-sm">Este utilizador não lidera nenhum projeto no momento.</p>
              </div>
            ) : (
              userProjects.map((p) => (
                <div key={p.id} className="card-konecta p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-konecta-gold uppercase">{p.category}</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{p.status}</span>
                  </div>
                  <h3 className="text-xl font-bold text-konecta-navy mb-2">{p.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </div>
              ))
            )}
          </div>
        )}

      </main>

    </div>
  );
};
