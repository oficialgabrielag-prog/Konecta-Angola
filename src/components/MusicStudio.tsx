import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Play, Pause, Music, Volume2, Check, Plus } from "lucide-react";
import { d1Client } from '../lib/d1Client';
import { MusicTrack, MusicCategory } from '../types';

interface MusicStudioProps {
  onClose: () => void;
  onSelect: (track: MusicTrack, settings: { startMs: number; endMs: number; musicVolume: number; originalVolume: number }) => void;
  videoDurationMs: number;
}

export const MusicStudio: React.FC<MusicStudioProps> = ({ onClose, onSelect, videoDurationMs }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsMPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Trimming & Volume settings
  const [startMs, setStartMs] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [originalVolume, setOriginalVolume] = useState(0.2);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tracksRes, catsRes] = await Promise.all([
        d1Client.music.listTracks({ status: 'published' }),
        d1Client.music.listCategories()
      ]);
      setTracks(tracksRes.data?.data || []);
      setCategories(catsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching music:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTracks = tracks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.artist.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategoryId === 'all' || t.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const togglePlay = (track: MusicTrack) => {
    if (selectedTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsMPlaying(!isPlaying);
    } else {
      setSelectedTrack(track);
      setIsMPlaying(true);
      setStartMs(0);
      if (audioRef.current) {
        audioRef.current.src = track.audio_url;
        audioRef.current.play();
      }
    }
  };

  const handleConfirm = () => {
    if (selectedTrack) {
      onSelect(selectedTrack, {
        startMs,
        endMs: startMs + videoDurationMs,
        musicVolume,
        originalVolume
      });
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gray-900 border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-konecta-gold/10 rounded-xl">
              <Music className="text-konecta-gold" size={20} />
            </div>
            <h3 className="text-xl font-black uppercase text-white tracking-tighter">Music Studio</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50">
            <X size={24} />
          </button>
        </div>

        {!selectedTrack ? (
          <>
            {/* Search & Filters */}
            <div className="p-6 space-y-4 border-b border-white/5 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar por música ou artista..."
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-white/20 focus:ring-1 focus:ring-konecta-gold outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                <button 
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                    selectedCategoryId === 'all' ? 'bg-konecta-gold border-konecta-gold text-konecta-navy' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                      selectedCategoryId === cat.id ? 'bg-konecta-gold border-konecta-gold text-konecta-navy' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-konecta-gold"></div>
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-white/30 italic text-sm">
                  <p>Nenhuma música encontrada.</p>
                </div>
              ) : (
                filteredTracks.map(track => (
                  <div 
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTrack(track)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden relative group-hover:scale-105 transition-transform flex-shrink-0">
                        {track.cover_url ? (
                          <img src={track.cover_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Music size={20} />
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isPlaying && (selectedTrack as any)?.id === track.id ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" />}
                        </button>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{track.title}</p>
                        <p className="text-[11px] text-white/40 font-bold uppercase truncate">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/20">
                      <span className="text-[10px] font-bold">{formatTime(track.duration_ms)}</span>
                      <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-konecta-gold hover:text-konecta-navy transition-all">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Trimming & Configuration View */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-40 h-40 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white/5 relative group">
                {selectedTrack.cover_url ? (
                  <img src={selectedTrack.cover_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center text-white/20">
                    <Music size={60} />
                  </div>
                )}
                <button 
                  onClick={() => setIsMPlaying(!isPlaying)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isPlaying ? <Pause size={40} className="text-white" /> : <Play size={40} className="text-white" />}
                </button>
              </div>
              
              <div>
                <h4 className="text-xl font-black text-white">{selectedTrack.title}</h4>
                <p className="text-konecta-gold font-bold uppercase tracking-wider text-xs mt-1">{selectedTrack.artist}</p>
              </div>

              {/* Range Selector Simulation */}
              <div className="w-full space-y-4 px-4">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Trecho da Música</label>
                  <span className="text-xs font-bold text-white">{formatTime(startMs)} — {formatTime(startMs + videoDurationMs)}</span>
                </div>
                <div className="relative h-12 bg-white/5 rounded-xl border border-white/5 overflow-hidden group">
                  {/* Waveform placeholder */}
                  <div className="absolute inset-0 flex items-center justify-around px-2 opacity-20">
                    {Array.from({length: 40}).map((_, i) => (
                      <div key={i} className="w-1 bg-white rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                    ))}
                  </div>
                  {/* Selection Highlight */}
                  <div 
                    className="absolute h-full bg-konecta-gold/20 border-x-2 border-konecta-gold flex items-center justify-between"
                    style={{ 
                      left: `${(startMs / selectedTrack.duration_ms) * 100}%`,
                      width: `${(videoDurationMs / selectedTrack.duration_ms) * 100}%`
                    }}
                  >
                    <div className="w-1 h-6 bg-konecta-gold rounded-full -ml-0.5" />
                    <div className="w-1 h-6 bg-konecta-gold rounded-full -mr-0.5" />
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={Math.max(0, selectedTrack.duration_ms - videoDurationMs)}
                    value={startMs}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setStartMs(val);
                      if (audioRef.current) audioRef.current.currentTime = val / 1000;
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                <p className="text-[9px] text-white/20 uppercase font-bold text-center">Arraste para escolher o início (Duração: {formatTime(videoDurationMs)})</p>
              </div>

              {/* Volume Controls */}
              <div className="w-full grid grid-cols-2 gap-8 px-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/30">
                    <span className="flex items-center gap-1.5"><Music size={12} /> Música</span>
                    <span>{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={musicVolume}
                    onChange={e => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-konecta-gold bg-white/10 rounded-full h-1"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/30">
                    <span className="flex items-center gap-1.5"><Volume2 size={12} /> Original</span>
                    <span>{Math.round(originalVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={originalVolume}
                    onChange={e => setOriginalVolume(parseFloat(e.target.value))}
                    className="w-full accent-konecta-gold bg-white/10 rounded-full h-1"
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto p-8 border-t border-white/5 flex gap-4">
              <button 
                onClick={() => { setSelectedTrack(null); setIsMPlaying(false); }}
                className="flex-1 py-4 text-xs font-bold text-white/40 hover:text-white transition-colors"
              >
                Trocar Música
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-[2] btn-gold py-4 text-xs flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirmar Configuração
              </button>
            </div>
          </div>
        )}

        <audio 
          ref={audioRef}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime * 1000;
            setCurrentTime(time);
            // Loop segment during preview
            if (selectedTrack && time >= (startMs + videoDurationMs)) {
              e.currentTarget.currentTime = startMs / 1000;
            }
          }}
          onEnded={() => setIsMPlaying(false)}
          className="hidden"
        />
      </motion.div>
    </div>
  );
};
