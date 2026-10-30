import React from 'react';
import { CommentItem } from '../types';

interface CommentCardProps {
  comment: CommentItem;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  return (
    <div className="card-konecta p-6 flex gap-4 shadow-sm border border-gray-100 bg-white rounded-3xl transition-all hover:shadow-md">
      <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100 shadow-inner">
        {comment.profiles?.avatar_url ? (
          <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-konecta-navy text-xs bg-konecta-navy/5">
            {comment.profiles?.full_name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-konecta-navy">{comment.profiles?.full_name || 'Utilizador Konecta'}</span>
            <span className="text-[10px] font-bold text-konecta-gold uppercase tracking-wider px-2 py-0.5 bg-konecta-navy/5 rounded-full">
              {comment.profiles?.province || 'Angola'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">{new Date(comment.created_at).toLocaleDateString('pt-AO')}</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-normal">{comment.content}</p>
      </div>
    </div>
  );
};
