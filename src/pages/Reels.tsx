import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Share2, Plus, Volume2, VolumeX, X, MoreVertical } from "lucide-react";
import { Reel, CommentItem, MusicTrack } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary, cldVideo, cldVideoPoster, cldAvatar } from '../lib/cloudinary';
import { KonectaRealtimeService } from '../lib/realtime';
import { MusicStudio } from '../components/MusicStudio';
import { Music } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useT } from '../i18n/LanguageContext';
import { LikeButton } from '../components/LikeButton';


interface ReelsProps {
  user: any;
  onOpenAuth: () => void;
  onSelectUser: (userId: string) => void;
  initialReelId?: string | null;
}

const getTrackAudioUrl = (track: any): string | null => {
  if (!track) return null;
  return track.audio_url || track.file_url || track.media_url || track.url || null;
};

export const Reels: React.FC<ReelsProps> = ({ user, onOpenAuth, onSelectUser, initialReelId }) => {
  const t = useT();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const { openShareSheet, createIntent, setCreateIntent, showToast } = useUI();

  // Comments modal state
  const [activeCommentsReel, setActiveCommentsReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Create Reel Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Music Studio Integration
  const [showMusicStudio, setShowMusicStudio] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicSettings, setMusicSettings] = useState({
    startMs: 0,
    endMs: 0,
    musicVolume: 0.8,
    originalVolume: 0.2
  });
  const [videoDurationMs, setVideoDurationMs] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoOrientationMap, setVideoOrientationMap] = useState<Record<string, 'cover' | 'contain'>>({});
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Single shared audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Cleanup on unmount to prevent audio/video reference leaks or stuck playback
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute('src');
      }
      videoRefs.current = {};
    };
  }, []);

  // Pause playback when tab is switched or page hidden
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        Object.values(videoRefs.current).forEach(v => v?.pause());
        if (audioRef.current) audioRef.current.pause();
      } else {
        const activeReel = reels[activeIndex];
        const v = activeReel ? videoRefs.current[activeReel.id] : null;
        if (v && !isMuted) {
          v.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [activeIndex, reels, isMuted]);

  useEffect(() => {
    fetchReels();

    const unsubscribe = KonectaRealtimeService.subscribe('reels', (payload: any) => {
      if (payload.new) {
        setReels(prev => {
          const incoming = payload.new;
          const exists = prev.some(r => r.id === incoming.id);
          if (!exists) return [incoming, ...prev];
          return prev.map(r => r.id === incoming.id ? { ...r, ...incoming } : r);
        });
      } else {
        fetchReels();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Scroll to initialReelId when specified
  useEffect(() => {
    if (createIntent === 'reel') {
      if (user) {
        setShowCreateModal(true);
      } else {
        onOpenAuth();
      }
      setCreateIntent(null);
    }
  }, [createIntent, user, setCreateIntent, onOpenAuth]);

  useEffect(() => {
    if (initialReelId && reels.length > 0) {
      const idx = reels.findIndex(r => r.id === initialReelId);
      if (idx !== -1) {
        setActiveIndex(idx);
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: idx * containerRef.current.clientHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [initialReelId, reels]);

  // Handle active video & audio playback when active index or mute changes
  useEffect(() => {
    const activeReel = reels[activeIndex];
    if (!activeReel) return;

    console.debug('[Reels] Reel ativo:', activeReel.id, 'Legenda:', activeReel.caption?.slice(0, 30));

    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      if (id === activeReel.id) {
        const m = activeReel.music_info?.settings;
        const originalVol = m?.originalVolume ?? 1;
        video.muted = isMuted || originalVol === 0;
        if (!video.muted && originalVol > 0) {
          video.volume = originalVol;
        }

        video.play().catch(err => {
          console.warn('[Reels] Vídeo autoplay bloqueado:', err);
          setAutoplayBlocked(true);
        });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });

    // Single audio controller for secondary music track
    const musicTrackUrl = getTrackAudioUrl(activeReel.music_info?.track);
    if (musicTrackUrl && audioRef.current) {
      if (audioRef.current.getAttribute('src') !== musicTrackUrl) {
        audioRef.current.setAttribute('src', musicTrackUrl);
        audioRef.current.load();
      }
      const m = activeReel.music_info?.settings;
      audioRef.current.volume = isMuted ? 0 : (m?.musicVolume ?? 0.8);
      audioRef.current.currentTime = (m?.startMs || 0) / 1000;
      audioRef.current.play().catch(err => {
        console.warn('[Reels] Áudio playback bloqueado:', err);
        setAutoplayBlocked(true);
      });
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
  }, [activeIndex, reels, isMuted]);

  const fetchReels = async () => {
    try {
      const res = await d1Client.reels.list(30);
      const items = res.data?.data || res.data || [];
      setReels(items);
    } catch (err) {
      console.warn('Aviso ao carregar reels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight;
    if (height > 0) {
      const index = Math.round(scrollTop / height);
      if (index !== activeIndex && index >= 0 && index < reels.length) {
        setActiveIndex(index);
      }
    }
  };

  const handleToggleLike = async (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }

    const currentLiked = reel.is_liked;
    const newLikesCount = currentLiked ? Math.max(0, (reel.likes_count || 1) - 1) : (reel.likes_count || 0) + 1;

    // Optimistic update
    setReels(prev => prev.map(r => r.id === reel.id ? { ...r, is_liked: !currentLiked, likes_count: newLikesCount } : r));

    try {
      await d1Client.reels.toggleReaction(reel.id, currentLiked);
    } catch (err) {
      console.warn('Erro ao curtir reel:', err);
    }
  };

  const handleToggleSave = async (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }

    const currentSaved = reel.is_saved;
    const newSavesCount = currentSaved ? Math.max(0, (reel.saves_count || 1) - 1) : (reel.saves_count || 0) + 1;
    setReels(prev => prev.map(r => r.id === reel.id ? { ...r, is_saved: !currentSaved, saves_count: newSavesCount } : r));

    try {
      await d1Client.reels.toggleSave(reel.id, currentSaved);
    } catch (err) {
      console.warn('Erro ao guardar reel:', err);
    }
  };

  const openComments = async (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCommentsReel(reel);
    setLoadingComments(true);
    try {
      const res = await d1Client.reels.getComments(reel.id);
      setComments(res.data?.data || res.data || []);
    } catch (err) {
      console.warn('Erro ao carregar comentários:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!activeCommentsReel || !newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment('');

    const optimisticComment: CommentItem = {
      id: crypto.randomUUID(),
      post_id: activeCommentsReel.id,
      content: commentText,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Membro Konecta',
        avatar_url: user.user_metadata?.avatar_url
      }
    };

    setComments(prev => [...prev, optimisticComment]);
    setReels(prev => prev.map(r => r.id === activeCommentsReel.id ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r));

    try {
      await d1Client.reels.addComment(activeCommentsReel.id, commentText);
    } catch (err) {
      console.warn('Erro ao enviar comentário:', err);
    }
  };

  const handleShare = (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    openShareSheet({
      targetId: reel.id,
      targetType: 'reel',
      title: reel.caption || 'Reel Konecta',
      authorName: `@${reel.profiles?.full_name?.replace(/\s+/g, '').toLowerCase() || 'criador_konecta'}`,
      thumbnail: reel.thumbnail_url || undefined,
      videoUrl: reel.video_url,
      allowShares: reel.allow_shares !== false
    });
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploading(false);
      setUploadProgress(0);
      showToast('Upload cancelado.', 'info');
    }
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!videoFile) {
      showToast(t('reels.select_video_err'), 'error');
      return;
    }
    if (uploading) return;

    setUploading(true);
    setUploadProgress(1);
    abortControllerRef.current = new AbortController();

    try {
      const cloudRes = await uploadMediaToCloudinary(videoFile, (p) => setUploadProgress(p), {
        kind: 'reel',
        userId: user.id,
        signal: abortControllerRef.current?.signal
      });
      
      const res = await d1Client.reels.create({
        cloudinary_public_id: cloudRes.public_id,
        video_url: cloudRes.secure_url,
        caption: caption.trim() || '',
        thumbnail_url: cloudRes.secure_url.replace(/\.[^/.]+$/, ".jpg"),
        format: cloudRes.format || 'mp4',
        width: cloudRes.width,
        height: cloudRes.height,
        duration_seconds: cloudRes.duration ? Math.round(cloudRes.duration) : undefined,
        bytes: cloudRes.bytes,
        status: 'published',
        visibility: 'public'
      });

      if (res.error) throw new Error(res.error.message || t('reels.save_err'));

      const newReel = res.data?.data || res.data;
      
      // 4. Save music usage if selected
      if (newReel && selectedMusic) {
        const musicRes = await d1Client.music.addMusicToReel(newReel.id, selectedMusic.id, {
          start_ms: musicSettings.startMs,
          end_ms: musicSettings.endMs,
          music_volume: musicSettings.musicVolume,
          original_audio_volume: musicSettings.originalVolume
        });

        if (musicRes.error) {
          console.error("Erro ao associar música:", musicRes.error);
          showToast(t('reels.music_err'), 'error');
        }
        
        newReel.music_info = {
          track: selectedMusic,
          settings: musicSettings
        };
      }

      if (newReel) setReels(prev => [newReel, ...prev]);

      setShowCreateModal(false);
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
      setCaption('');
      setSelectedMusic(null);
      setUploadProgress(0);
      showToast('Reel publicado com sucesso!', 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao publicar Reel:', err);
        showToast(err.message || t('reels.upload_err'), 'error');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-black z-30 overflow-hidden">
      {/* Single Audio Controller */}
      <audio 
        ref={audioRef}
        loop
        preload="auto"
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          const activeReel = reels[activeIndex];
          if (activeReel?.music_info) {
            const endMs = activeReel.music_info.settings.endMs;
            if (endMs && audio.currentTime * 1000 >= endMs) {
              audio.currentTime = (activeReel.music_info.settings.startMs || 0) / 1000;
            }
          }
        }}
      />

      {/* Immersive Scroll Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
      >
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-gold"></div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">{t('reels.loading')}</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
              <Share2 size={40} className="text-gray-700" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase text-white mb-2">{t('reels.empty_title')}</h3>
              <p className="text-sm text-gray-500 max-w-xs">{t('reels.empty_desc')}</p>
            </div>
            <button
              onClick={() => (user ? setShowCreateModal(true) : onOpenAuth())}
              className="btn-gold px-8 py-3 font-black uppercase tracking-tighter"
            >
              {t('reels.create_first')}
            </button>
          </div>
        ) : (
          reels.map((reel, index) => {
            const fitMode = videoOrientationMap[reel.id] || 'cover';
            return (
              <div key={reel.id} className="h-full w-full snap-start relative flex items-center justify-center">
                {/* VIDEO - Background content */}
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[reel.id] = el;
                    } else {
                      delete videoRefs.current[reel.id];
                    }
                  }}
                  src={cldVideo(reel.video_url)}
                  poster={cldVideoPoster(reel.video_url)}
                  className={`absolute inset-0 w-full h-full bg-black ${
                    fitMode === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                  loop
                  muted={isMuted}
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    const isVert = v.videoHeight >= v.videoWidth;
                    setVideoOrientationMap(prev => ({ ...prev, [reel.id]: isVert ? 'cover' : 'contain' }));
                  }}
                  onPlay={() => {
                    if (index === activeIndex && getTrackAudioUrl(reel.music_info?.track) && audioRef.current) {
                      audioRef.current.play().catch(() => setAutoplayBlocked(true));
                    }
                  }}
                  onPause={() => {
                    if (index === activeIndex && audioRef.current) {
                      audioRef.current.pause();
                    }
                  }}
                  onEnded={() => {
                    if (index === activeIndex && audioRef.current) {
                      audioRef.current.pause();
                    }
                  }}
                  onWaiting={() => {
                    if (index === activeIndex && audioRef.current) {
                      audioRef.current.pause();
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (index !== activeIndex) return;
                    const v = e.currentTarget;
                    if (audioRef.current && reel.music_info) {
                      const m = reel.music_info.settings;
                      const expectedAudioTime = ((m.startMs || 0) / 1000) + (v.currentTime % (v.duration || 1));
                      if (Math.abs(audioRef.current.currentTime - expectedAudioTime) > 0.35) {
                        audioRef.current.currentTime = expectedAudioTime;
                      }
                      if (!v.paused && audioRef.current.paused && !isMuted) {
                        audioRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  onClick={(e) => {
                    const v = e.target as HTMLVideoElement;
                    if (v.paused) {
                      v.play();
                    } else {
                      v.pause();
                    }
                  }}
                  onDoubleClick={(e) => {
                    if (!reel.is_liked) {
                      handleToggleLike(reel, e as any);
                    }
                    
                    // Show heart animation
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      const heart = document.createElement('div');
                      heart.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none text-white animate-reel-heart-pop';
                      heart.innerHTML = '<span class="material-symbols-outlined text-8xl fill-white">favorite</span>';
                      container.appendChild(heart);
                      setTimeout(() => heart.remove(), 1000);
                    }
                  }}
                />

                {/* MARCA DE ÁGUA DISCRETA */}
                <div className="absolute top-[calc(5rem+env(safe-area-inset-top)+0.5rem)] right-4 z-10 text-white font-black text-xs opacity-55 pointer-events-none tracking-widest uppercase">
                  KONECTA
                </div>

                {/* TAP TO UNMUTE HINT */}
                {(isMuted || autoplayBlocked) && index === activeIndex && (
                  <button 
                    onClick={() => {
                      setIsMuted(false);
                      setAutoplayBlocked(false);
                      const v = videoRefs.current[reel.id];
                      if (v) {
                        v.muted = false;
                        v.play().catch(() => {});
                      }
                      if (audioRef.current && getTrackAudioUrl(reel.music_info?.track)) {
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-2 cursor-pointer hover:bg-black/90 transition-all text-white text-xs font-semibold shadow-xl"
                  >
                    <VolumeX size={18} className="text-konecta-gold" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('reels.unmute_hint')}</span>
                  </button>
                )}

                {/* GRADIENT BOTTOM PARA LEGIBILIDADE */}
                <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/85 via-black/20 to-transparent z-[2] pointer-events-none" />

                {/* AÇÕES DIREITA */}
                <div className="absolute right-3 sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-5 sm:gap-7">
                  <div 
                    onClick={() => reel.author_id && onSelectUser(reel.author_id)}
                    className="relative mb-2 cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full border-2 border-konecta-gold overflow-hidden shadow-xl group-hover:scale-110 transition-transform bg-gray-900">
                      {reel.profiles?.avatar_url ? (
                        <img 
                          src={cldAvatar(reel.profiles.avatar_url)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                          {reel.profiles?.full_name?.charAt(0) || 'K'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-konecta-gold text-konecta-navy rounded-full p-0.5">
                      <Plus size={10} strokeWidth={4} />
                    </div>
                  </div>

                  <LikeButton
                    isLiked={!!reel.is_liked}
                    likesCount={reel.likes_count || 0}
                    onToggle={() => handleToggleLike(reel, {} as any)}
                  />

                  <button 
                    onClick={(e) => openComments(reel, e)} 
                    className="flex flex-col items-center group gap-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/25 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/40 transition-all">
                      <MessageCircle size={26} strokeWidth={2} className="text-white" />
                    </div>
                    <span className="text-white text-[11px] font-bold drop-shadow-lg">{reel.comments_count || 0}</span>
                  </button>

                  <button 
                    onClick={(e) => handleToggleSave(reel, e)} 
                    className="flex flex-col items-center group gap-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/25 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/40 transition-all">
                      <Bookmark 
                        size={26} 
                        strokeWidth={2}
                        className={`${reel.is_saved ? "fill-konecta-gold text-konecta-gold" : "text-white"}`} 
                      />
                    </div>
                    <span className="text-white text-[11px] font-bold drop-shadow-lg">{reel.saves_count || 0}</span>
                  </button>

                  <button 
                    onClick={(e) => handleShare(reel, e)} 
                    className="flex flex-col items-center group gap-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/25 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/40 transition-all">
                      <Share2 size={24} strokeWidth={2} className="text-white" />
                    </div>
                    <span className="text-white text-[9px] font-black uppercase tracking-widest drop-shadow-lg">{t('menu.share')}</span>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="w-10 h-10 rounded-full bg-black/25 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>

                {/* INFO EMBAIXO */}
                <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 sm:left-8 right-16 sm:right-24 z-10">
                  <div 
                    onClick={() => reel.author_id && onSelectUser(reel.author_id)}
                    className="text-white text-sm sm:text-base font-bold drop-shadow-xl flex items-center gap-2 cursor-pointer hover:text-konecta-gold transition-colors"
                  >
                    @{reel.profiles?.full_name?.replace(/\s+/g, '').toLowerCase() || 'criador_konecta'}
                  </div>
                  <div className="text-white/95 text-xs sm:text-sm leading-relaxed mt-2 drop-shadow-xl max-w-md line-clamp-3">
                    {reel.caption || t('home.no_caption')}
                  </div>

                  {getTrackAudioUrl(reel.music_info?.track) && (
                    <div className="flex items-center gap-2 mt-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-none border-l-2 border-konecta-gold w-fit overflow-hidden">
                      <Music size={12} className="text-konecta-gold animate-pulse shrink-0" />
                      <div className="text-[10px] font-black uppercase tracking-[0.1em] text-white whitespace-nowrap overflow-hidden max-w-[140px]">
                        <div className="inline-block truncate">
                          {reel.music_info?.track?.title} • {reel.music_info?.track?.artist}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comments Modal (Drawer) */}
      <AnimatePresence>
        {activeCommentsReel && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gray-900 rounded-t-[32px] w-full max-w-xl h-[70vh] flex flex-col shadow-2xl overflow-hidden border-t border-white/10"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <MessageCircle size={20} className="text-konecta-gold" />
                  <h3 className="font-black uppercase text-sm text-white tracking-widest">Discussão ({comments.length})</h3>
                </div>
                <button onClick={() => setActiveCommentsReel(null)} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingComments ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-gold"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
                    <p className="text-sm">Ainda não há comentários.</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-white/5">
                        {c.profiles?.avatar_url ? (
                          <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                            {c.profiles?.full_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black text-white">{c.profiles?.full_name}</span>
                          <span className="text-[10px] text-white/30 uppercase font-bold">{new Date(c.created_at).toLocaleDateString('pt-AO')}</span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="p-6 bg-gray-950 border-t border-white/5 flex gap-3">
                <input
                  type="text"
                  placeholder={user ? "Adiciona um comentário..." : "Inicia sessão para comentar..."}
                  disabled={!user}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 bg-white/5 border-none rounded-2xl px-5 py-3 text-sm text-white placeholder-white/20 focus:ring-1 focus:ring-konecta-gold outline-none"
                />
                <button
                  type="submit"
                  disabled={!user || !newComment.trim()}
                  className="bg-konecta-gold text-konecta-navy font-black rounded-2xl px-6 text-xs uppercase disabled:opacity-30"
                >
                  Enviar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Reel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-konecta-gold/10 rounded-xl">
                    <Plus size={20} className="text-konecta-gold" />
                  </div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tighter">Publicar Iniciativa Reel</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-white/30 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateReel} className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-56 border-2 border-dashed border-white/10 hover:border-konecta-gold/50 rounded-3xl flex flex-col items-center justify-center cursor-pointer bg-black/40 transition-all overflow-hidden relative group"
                >
                  {videoPreview ? (
                    <video src={videoPreview} className="w-full h-full object-cover" muted autoPlay loop />
                  ) : (
                    <div className="text-center p-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-konecta-gold/5 flex items-center justify-center mx-auto group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors">
                        <Plus size={28} />
                      </div>
                      <div>
                        <p className="text-sm text-white font-black uppercase tracking-tighter">Carregar Vídeo Vertical</p>
                        <p className="text-[11px] text-white/30 mt-1 uppercase font-bold">Máximo 50MB · Formato MP4/MOV</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) {
                        showToast('O vídeo deve ter no máximo 50MB.', 'error');
                        return;
                      }
                      if (videoPreview) URL.revokeObjectURL(videoPreview);
                      setVideoFile(file);
                      setVideoPreview(URL.createObjectURL(file));
                      
                      // Get duration for Music Studio
                      const tempVideo = document.createElement('video');
                      tempVideo.preload = 'metadata';
                      tempVideo.onloadedmetadata = () => {
                        window.URL.revokeObjectURL(tempVideo.src);
                        setVideoDurationMs(Math.round(tempVideo.duration * 1000));
                      };
                      tempVideo.src = URL.createObjectURL(file);
                    }
                  }}
                  accept="video/*"
                  className="hidden"
                />

                {/* Music Studio Integration UI */}
                <div className="space-y-4">
                  {!selectedMusic ? (
                    <button
                      type="button"
                      disabled={!videoFile}
                      onClick={() => setShowMusicStudio(true)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-konecta-gold/10 rounded-xl text-konecta-gold group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors">
                          <Music size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-black text-white uppercase tracking-tighter">Adicionar Música</p>
                          <p className="text-[10px] text-white/30 font-bold uppercase">Explorar Biblioteca Konecta</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-white/20">chevron_right</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-konecta-gold/5 border border-konecta-gold/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-konecta-gold text-konecta-navy flex items-center justify-center">
                          {selectedMusic.cover_url ? (
                            <img src={selectedMusic.cover_url} className="w-full h-full object-cover rounded-xl" alt="" />
                          ) : (
                            <Music size={20} />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-black text-white truncate max-w-[180px]">{selectedMusic.title}</p>
                          <p className="text-[10px] text-konecta-gold font-bold uppercase tracking-widest">{selectedMusic.artist}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedMusic(null)}
                        className="p-2 text-white/30 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-2">Legenda Inspiradora</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="O que torna este projeto especial para Angola?"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-white/20 focus:ring-1 focus:ring-konecta-gold outline-none resize-none"
                  />
                </div>

                {uploading && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase text-white/40 tracking-wider">
                      <span>Sincronizando com o servidor...</span>
                      <span className="text-konecta-gold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="bg-konecta-gold h-full rounded-full"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !videoFile}
                  className="btn-gold w-full py-4 font-black uppercase tracking-widest text-sm shadow-xl disabled:opacity-20"
                >
                  {uploading ? 'Processando...' : 'Publicar na Rede Konecta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Music Studio Modal */}
      {showMusicStudio && (
        <MusicStudio 
          videoDurationMs={videoDurationMs}
          onClose={() => setShowMusicStudio(false)}
          onSelect={(track, settings) => {
            setSelectedMusic(track);
            setMusicSettings(settings);
            setShowMusicStudio(false);
          }}
        />
      )}
    </div>
  );
};

