import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Reel, CommentItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { KonectaRealtimeService } from '../lib/realtime';

interface ReelsProps {
  user: any;
  onOpenAuth: () => void;
  onSelectUser: (userId: string) => void;
}

export const Reels: React.FC<ReelsProps> = ({ user, onOpenAuth, onSelectUser }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    fetchReels();

    // Subscribe to realtime updates for reels
    const unsubscribe = KonectaRealtimeService.subscribe('reels', () => {
      fetchReels();
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

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

  const handleToggleLike = async (reel: Reel) => {
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

  const handleToggleSave = async (reel: Reel) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const currentSaved = reel.is_saved;
    setReels(prev => prev.map(r => r.id === reel.id ? { ...r, is_saved: !currentSaved } : r));

    try {
      await d1Client.reels.toggleSave(reel.id, currentSaved);
    } catch (err) {
      console.warn('Erro ao guardar reel:', err);
    }
  };

  const openComments = async (reel: Reel) => {
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

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('O vídeo selecionado ultrapassa o limite de 50MB.');
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!videoFile) {
      alert('Seleciona um vídeo para o Reel.');
      return;
    }
    if (uploading) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload video to Cloudinary (/video/upload)
      const cloudRes = await uploadMediaToCloudinary(videoFile, (p) => setUploadProgress(p));
      
      // Validate Cloudinary response: public_id & secure_url MUST exist
      if (!cloudRes || !cloudRes.public_id || !cloudRes.secure_url) {
        throw new Error('Falha no upload do Reel. Identificador de mídia ausente do Cloudinary.');
      }

      // 2. Insert record into Supabase 'reels' table with author_id, cloudinary_public_id, video_url, caption, status, and visibility
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

      if (res.error) {
        console.error('Erro de gravação no Supabase:', res.error);
        throw new Error(res.error.message || 'Falha ao guardar o Reel no banco de dados.');
      }

      const newReel = res.data?.data || res.data;
      if (newReel) {
        setReels(prev => [newReel, ...prev]);
      }

      setShowCreateModal(false);
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
      setCaption('');
      setUploadProgress(0);
    } catch (err: any) {
      console.error('Erro ao publicar reel:', err);
      alert(err.message || 'Falha no upload do Reel.');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = (reel: Reel) => {
    if (navigator.share) {
      navigator.share({
        title: `Reel no Konecta: ${reel.caption || 'Vídeo inspirador'}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(reel.video_url);
      alert('Link do Reel copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-black text-white flex flex-col items-center justify-center relative py-6 px-4">
      {/* Top Floating Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-konecta-gold text-2xl">movie</span>
          <span className="font-extrabold tracking-wider uppercase text-sm">Konecta Reels</span>
        </div>
        <button
          onClick={() => (user ? setShowCreateModal(true) : onOpenAuth())}
          className="btn-gold py-1.5 px-4 text-xs font-bold shadow-lg flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add_video</span>
          Criar Reel
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-gold"></div>
          <p className="text-xs text-gray-400">A carregar Reels em tempo real...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-10 text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-gray-600">videocam_off</span>
          <h3 className="text-lg font-bold">Nenhum Reel publicado ainda</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Sê o primeiro a gravar ou enviar um vídeo vertical para a comunidade Konecta Angola via Cloudinary.
          </p>
          <button
            onClick={() => (user ? setShowCreateModal(true) : onOpenAuth())}
            className="btn-gold py-2.5 px-6 text-xs font-bold"
          >
            Publicar o Primeiro Vídeo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm h-[75vh] max-h-[720px] relative bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
          {/* Reel Display */}
          {reels.map((reel, idx) => {
            const isCurrent = idx === activeIndex;
            if (!isCurrent) return null;

            return (
              <div key={reel.id} className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={el => { videoRefs.current[idx] = el; }}
                  src={reel.video_url}
                  poster={reel.thumbnail_url}
                  className="w-full h-full object-cover"
                  loop
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onClick={() => setIsPlaying(!isPlaying)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Play/Pause Overlay Indicator */}
                {!isPlaying && (
                  <div 
                    onClick={() => {
                      setIsPlaying(true);
                      videoRefs.current[idx]?.play();
                    }}
                    className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-4xl">play_arrow</span>
                    </div>
                  </div>
                )}

                {/* Sound Control */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isMuted ? 'volume_off' : 'volume_up'}
                  </span>
                </button>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 space-y-3">
                  <div 
                    onClick={() => reel.author_id && onSelectUser(reel.author_id)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border-2 border-konecta-gold shrink-0">
                      {reel.profiles?.avatar_url ? (
                        <img src={reel.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {reel.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm text-white group-hover:text-konecta-gold transition-colors truncate">
                        {reel.profiles?.full_name || 'Inovador Konecta'}
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        {new Date(reel.created_at).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                  </div>

                  {reel.caption && (
                    <p className="text-xs text-gray-200 leading-relaxed line-clamp-3">
                      {reel.caption}
                    </p>
                  )}
                </div>

                {/* Right Action Bar */}
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
                  {/* Like Button */}
                  <button
                    onClick={() => handleToggleLike(reel)}
                    className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                      reel.is_liked ? 'bg-red-600 text-white' : 'bg-black/50 text-white group-hover:bg-black/70'
                    }`}>
                      <span className="material-symbols-outlined text-2xl" style={reel.is_liked ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        favorite
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white shadow-xs">
                      {reel.likes_count || 0}
                    </span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => openComments(reel)}
                    className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-black/70 transition-all">
                      <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                    </div>
                    <span className="text-[10px] font-bold text-white shadow-xs">
                      {reel.comments_count || 0}
                    </span>
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={() => handleToggleSave(reel)}
                    className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                      reel.is_saved ? 'bg-konecta-gold text-konecta-navy' : 'bg-black/50 text-white group-hover:bg-black/70'
                    }`}>
                      <span className="material-symbols-outlined text-2xl" style={reel.is_saved ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        bookmark
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white shadow-xs">Salvar</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => handleShare(reel)}
                    className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-black/70 transition-all">
                      <span className="material-symbols-outlined text-2xl">share</span>
                    </div>
                    <span className="text-[10px] font-bold text-white shadow-xs">Partilhar</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Navigation Arrows for switching between reels */}
          {reels.length > 1 && (
            <div className="absolute right-3 top-4 flex flex-col gap-2 z-20">
              <button
                disabled={activeIndex === 0}
                onClick={() => {
                  if (activeIndex > 0) setActiveIndex(activeIndex - 1);
                }}
                className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center disabled:opacity-30 hover:bg-black/80 text-white"
                title="Vídeo anterior"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
              </button>
              <button
                disabled={activeIndex === reels.length - 1}
                onClick={() => {
                  if (activeIndex < reels.length - 1) setActiveIndex(activeIndex + 1);
                }}
                className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center disabled:opacity-30 hover:bg-black/80 text-white"
                title="Próximo vídeo"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Comments Drawer Modal */}
      <AnimatePresence>
        {activeCommentsReel && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-gray-900 border border-gray-800 text-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full shadow-2xl h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold text-lg">chat</span>
                  <h3 className="font-bold text-sm">Comentários ({comments.length})</h3>
                </div>
                <button
                  onClick={() => setActiveCommentsReel(null)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingComments ? (
                  <div className="py-12 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-gold"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-12 italic">
                    Ainda sem comentários neste Reel. Sê o primeiro a comentar!
                  </p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="p-3 bg-gray-800/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-konecta-gold">{c.profiles?.full_name || 'Membro Konecta'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  placeholder={user ? "Escreve um comentário..." : "Entra na tua conta para comentar..."}
                  disabled={!user}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-konecta-gold"
                />
                <button
                  type="submit"
                  disabled={!user || !newComment.trim()}
                  className="btn-gold py-2 px-4 text-xs font-bold shrink-0 disabled:opacity-40"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-gold">video_call</span>
                  <h3 className="text-lg font-bold">Publicar Novo Reel</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={uploading}
                  className="text-gray-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateReel} className="space-y-4">
                {/* Video Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                    Ficheiro de Vídeo (Cloudinary)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 border-2 border-dashed border-gray-700 hover:border-konecta-gold rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-950 transition-colors overflow-hidden relative"
                  >
                    {videoPreview ? (
                      <video src={videoPreview} className="w-full h-full object-cover" muted autoPlay loop />
                    ) : (
                      <div className="text-center p-4 space-y-2">
                        <span className="material-symbols-outlined text-4xl text-konecta-gold">upload_file</span>
                        <p className="text-xs text-gray-300 font-bold">Clica para carregar vídeo vertical</p>
                        <p className="text-[10px] text-gray-500">MP4, WebM ou MOV até 50MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSelectVideo}
                    accept="video/*"
                    className="hidden"
                  />
                </div>

                {/* Caption Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                    Legenda do Reel
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Conta sobre o projeto, ideia ou inovação apresentada no vídeo..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-konecta-gold resize-none"
                  />
                </div>

                {/* Upload Progress Bar */}
                {uploading && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>A enviar para Cloudinary e registar no Supabase...</span>
                      <span className="font-bold text-konecta-gold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-konecta-gold to-yellow-300 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={uploading}
                    className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !videoFile}
                    className="btn-gold py-2.5 px-6 text-xs font-bold shadow-md disabled:opacity-40"
                  >
                    {uploading ? 'A Enviar...' : 'Publicar Reel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
