import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { supabase } from '../lib/supabaseClient';
import { PostCard } from '../components/PostCard';
import { PostCreationBox } from '../components/PostCreationBox';

export const CommunityFeedPage: React.FC<{ communityId: string }> = ({ communityId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [communityId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_media(*)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      const authorIds = Array.from(new Set((data || []).map(p => p.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', authorIds);
        
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { full_name: p.display_name, avatar_url: p.avatar_url };
        });
      }
      
      const formatted = (data || []).map(p => ({
        ...p,
        content: p.body,
        image_url: p.post_media?.[0]?.media_url || null,
        profiles: profilesMap[p.author_id] || { full_name: 'Membro Konecta', avatar_url: null }
      }));

      setPosts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">A carregar feed...</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-konecta-navy mb-8">Feed da Comunidade</h1>
      <PostCreationBox communityId={communityId} onPostCreated={fetchPosts} />
      <div className="space-y-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && <p className="text-center text-gray-500">Sem publicações nesta comunidade.</p>}
      </div>
    </div>
  );
};
