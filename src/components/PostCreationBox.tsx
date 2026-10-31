import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface PostCreationBoxProps {
  communityId: string;
  onPostCreated: () => void;
}

export const PostCreationBox: React.FC<PostCreationBoxProps> = ({ communityId, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Based on instructions: table 'posts' uses 'author_id' and 'body'
      const { error } = await supabase
        .from('posts')
        .insert({
          body: content,
          community_id: communityId,
          author_id: user.id,
          visibility: 'public',
          status: 'published'
        });

      if (error) throw error;
      
      setContent('');
      onPostCreated();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar publicação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="O que estás a pensar?"
        className="w-full p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-konecta-navy mb-4"
        rows={3}
      />
      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={loading || !content.trim()}
          className="bg-konecta-navy text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'A publicar...' : 'Publicar'}
        </button>
      </div>
    </form>
  );
};
