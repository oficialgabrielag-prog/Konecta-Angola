import React from 'react';
import { Post } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center mb-4">
        <img 
          src={post.profiles?.avatar_url || '/placeholder-avatar.png'} 
          alt={post.profiles?.full_name || 'User'} 
          className="w-10 h-10 rounded-full mr-3" 
        />
        <div>
          <h3 className="font-semibold text-gray-900">{post.profiles?.full_name || 'Utilizador'}</h3>
          <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</p>
        </div>
      </div>
      <p className="text-gray-800 mb-4">{post.content}</p>
      {post.image_url && <img src={post.image_url} className="w-full rounded-lg mb-4" alt="Post media" />}
      <div className="flex items-center space-x-6 border-t pt-4">
        <button className="text-gray-600 hover:text-konecta-navy text-sm font-medium">Gosto ({post.likes_count || 0})</button>
        <button className="text-gray-600 hover:text-konecta-navy text-sm font-medium">Comentar ({post.comments_count || 0})</button>
      </div>
    </div>
  );
};
