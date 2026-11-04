import React, { useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Reel } from '../types';
import { cldVideoPoster, cldVideoPreview, cldAvatar } from '../lib/cloudinary';

interface ReelPreviewCardProps {
  reel: Reel;
  onClick: () => void;
  shouldPreview: boolean;
}

export const ReelPreviewCard: React.FC<ReelPreviewCardProps> = ({ reel, onClick, shouldPreview }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (shouldPreview && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [shouldPreview]);

  return (
    <div 
      className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group bg-gray-900"
      onClick={onClick}
    >
      {/* Poster / Preview */}
      <img
        src={cldVideoPoster(reel.video_url)}
        alt={reel.caption}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${shouldPreview ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {shouldPreview && (
        <video
          ref={videoRef}
          src={cldVideoPreview(reel.video_url)}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          loop
          preload="none"
        />
      )}

      {/* Overlay Info */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 p-3 flex flex-col justify-between">
        <div className="flex justify-end">
          {!shouldPreview && <Play size={20} className="text-white drop-shadow-md" />}
        </div>
        <div className="flex items-center gap-2">
          <img src={cldAvatar(reel.profiles?.avatar_url, 32)} alt="" className="w-8 h-8 rounded-full border border-white/20" />
          <span className="text-white text-xs font-bold truncate">@{reel.profiles?.username || 'user'}</span>
        </div>
      </div>
    </div>
  );
};
