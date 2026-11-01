import React from 'react';
import { Post } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden transition-all hover:shadow-md">
      {/* Community Context Banner */}
      {post.communities && (
        <div className="h-20 relative overflow-hidden group/cover">
          {post.communities.cover_url ? (
            <img src={post.communities.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-konecta-navy to-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-konecta-gold/50 shadow-sm shrink-0">
              {post.communities.avatar_url ? (
                <img src={post.communities.avatar_url} className="w-full h-full object-cover rounded-md" alt="" />
              ) : (
                <div className="w-full h-full bg-konecta-navy rounded-md flex items-center justify-center text-[10px] text-konecta-gold font-black">
                  {post.communities.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[150px]">{post.communities.name}</span>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-center mb-4">
          <img 
            src={post.profiles?.avatar_url || '/placeholder-avatar.png'} 
            alt={post.profiles?.full_name || 'User'} 
            className="w-10 h-10 rounded-full mr-3 border border-gray-100 shadow-sm" 
          />
          <div>
            <h3 className="font-bold text-konecta-navy text-sm">{post.profiles?.full_name || 'Utilizador'}</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>
        
        <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
        
        {post.image_url && (
          <div className="rounded-xl overflow-hidden mb-4 border border-gray-50 max-h-96">
            <img src={post.image_url} className="w-full h-full object-cover" alt="Post media" />
          </div>
        )}
        
        <div className="flex items-center gap-4 border-t border-gray-50 pt-4">
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-sm">favorite</span>
            {post.likes_count || 0}
          </button>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-konecta-navy text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
            {post.comments_count || 0}
          </button>
        </div>
      </div>
    </div>
  );
};
