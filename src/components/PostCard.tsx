import React from 'react';
import { Post } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserBadge } from './UserBadges';
import { cldAvatar, cldCover, cldImage } from '../lib/cloudinary';

interface PostCardProps {
  post: Post;
  onOpenFullscreenPost?: (post: Post) => void;
  onImageClick?: (url: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post,
  onOpenFullscreenPost,
  onImageClick,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden transition-all hover:shadow-md">
      {/* Community Context Banner */}
      {post.communities && (
        <div className="h-20 relative overflow-hidden group/cover">
          {post.communities.cover_url ? (
            <img 
              src={cldCover(post.communities.cover_url, 600)} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105" 
              alt="" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-konecta-navy to-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-konecta-gold/50 shadow-sm shrink-0">
              {post.communities.avatar_url ? (
                <img src={cldAvatar(post.communities.avatar_url, 28)} className="w-full h-full object-cover rounded-md" alt="" />
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src={cldAvatar(post.profiles?.avatar_url)} 
              alt={post.profiles?.full_name || 'User'} 
              className="w-10 h-10 rounded-full mr-3 border border-gray-100 shadow-sm bg-gray-50" 
              loading="lazy"
              decoding="async"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-konecta-navy text-sm">{post.profiles?.full_name || 'Utilizador'}</h3>
                <UserBadge profile={post.profiles} size="xs" showPlan={true} />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenFullscreenPost ? onOpenFullscreenPost(post) : (post.image_url && onImageClick?.(post.image_url))}
              className="p-1.5 text-gray-400 hover:text-konecta-navy hover:bg-gray-100 rounded-lg transition-colors"
              title="Visualizar em tela cheia"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(post)}
                className="p-1.5 text-gray-400 hover:text-konecta-navy hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          </div>
        </div>
        
        <p 
          onClick={() => onOpenFullscreenPost?.(post)}
          className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap cursor-pointer hover:text-gray-900 transition-colors"
        >
          {post.content}
        </p>
        
        {post.image_url && (
          <div 
            onClick={() => onOpenFullscreenPost ? onOpenFullscreenPost(post) : onImageClick?.(post.image_url!)}
            className="rounded-xl overflow-hidden mb-4 border border-gray-50 max-h-96 bg-gray-50 cursor-pointer group/img relative"
          >
            <img 
              src={cldImage(post.image_url, { w: 800 })} 
              className="w-full h-full object-cover group-hover/img:scale-[1.01] transition-transform duration-300" 
              alt="Post media" 
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-white opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-xs">
                fullscreen
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between border-t border-gray-50 pt-4">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 text-xs font-bold transition-colors">
              <span className="material-symbols-outlined text-sm">favorite</span>
              {post.likes_count || 0}
            </button>
            <button className="flex items-center gap-1.5 text-gray-500 hover:text-konecta-navy text-xs font-bold transition-colors">
              <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
              {post.comments_count || 0}
            </button>
          </div>

          <button 
            onClick={() => onOpenFullscreenPost ? onOpenFullscreenPost(post) : (post.image_url && onImageClick?.(post.image_url))}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-konecta-navy transition-colors"
          >
            <span className="material-symbols-outlined text-sm">fullscreen</span>
            <span>Tela cheia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
