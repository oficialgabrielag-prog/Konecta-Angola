import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface ModernAudioPlayerProps {
  src: string;
  variant?: 'light' | 'dark';
}

export const ModernAudioPlayer: React.FC<ModernAudioPlayerProps> = ({ src, variant = 'light' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-3 p-2 pr-4 rounded-full min-w-[200px] ${
      isLight ? 'bg-gray-100 text-konecta-navy' : 'bg-white/10 text-white'
    }`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isLight ? 'bg-konecta-navy text-white' : 'bg-konecta-gold text-konecta-navy'
        }`}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="relative h-1.5 bg-gray-300 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-100 ${
              isLight ? 'bg-konecta-navy' : 'bg-konecta-gold'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`flex justify-between text-[10px] font-bold ${
          isLight ? 'text-gray-500' : 'text-white/60'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
