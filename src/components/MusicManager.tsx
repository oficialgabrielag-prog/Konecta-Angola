import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { MusicTrack, MusicCategory } from '../types';
import * as musicMetadata from 'music-metadata-browser';
import { googleSignIn, createPicker, downloadDriveFile, getAccessToken, initAuth } from '../lib/googleDrive';
import { Music } from 'lucide-react';

interface MusicManagerProps {
  user: any;
}

export const MusicManager: React.FC<MusicManagerProps> = ({ user }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [durationMs, setDurationMs] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchData();
    const unsub = initAuth();
    return () => unsub();
  }, []);

  const processFile = async (file: File | Blob, name: string) => {
    setSelectedFile(new File([file], name, { type: file.type }));
    setTitle(name.replace(/\.[^/.]+$/, ""));
    
    try {
      const tags = await musicMetadata.parseBlob(file);
      setMetadata(tags);
      if (tags.common.title) setTitle(tags.common.title);
      if (tags.common.artist) setArtist(tags.common.artist);
      if (tags.common.album) setAlbum(tags.common.album);
      if (tags.format.duration) setDurationMs(Math.round(tags.format.duration * 1000));

      if (tags.common.picture && tags.common.picture.length > 0) {
        const pic = tags.common.picture[0];
        const blob = new Blob([pic.data as any], { type: pic.format });
        setCoverPreview(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.warn('Could not extract metadata:', err);
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        setDurationMs(Math.round(audio.duration * 1000));
      };
    }
  };

  const handleDriveSelect = async () => {
    try {
      setIsDriveLoading(true);
      let token = await getAccessToken();
      
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }

      await createPicker(token, async (data: any) => {
        if (data.action === 'picked') {
          const driveFile = data.docs[0];
          setIsUploading(true);
          setUploadProgress(5);
          
          try {
            const blob = await downloadDriveFile(driveFile.id, token!);
            await processFile(blob, driveFile.name);
          } catch (err: any) {
            alert(err.message || 'Falha ao processar ficheiro do Drive');
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
        }
      });
    } catch (err: any) {
      console.error('Drive picker error:', err);
      alert('Falha ao abrir Google Drive: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsDriveLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tracksRes, catsRes] = await Promise.all([
        d1Client.music.listTracks({ status: 'all' }),
        d1Client.music.listCategories()
      ]);
      setTracks(tracksRes.data?.data || []);
      setCategories(catsRes.data?.data || []);
      if (catsRes.data?.data?.length > 0) {
        setCategoryId(catsRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching music data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, file.name);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title || !artist || !categoryId || !rightsConfirmed) {
      alert('Por favor preencha todos os campos obrigatórios e confirme os direitos.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload audio to Cloudinary
      const audioResult = await uploadMediaToCloudinary(selectedFile, (p) => setUploadProgress(10 + (p * 0.7)));
      
      // 2. Upload cover if exists
      let coverUrl = '';
      let coverPublicId = '';
      if (coverFile) {
        const coverResult = await uploadMediaToCloudinary(coverFile);
        coverUrl = coverResult.secure_url;
        coverPublicId = coverResult.public_id;
      }

      // 3. Save to database
      const trackPayload = {
        title,
        artist,
        album,
        category_id: categoryId,
        audio_url: audioResult.secure_url,
        cloudinary_public_id: audioResult.public_id,
        cover_url: coverUrl || null,
        cover_cloudinary_public_id: coverPublicId || null,
        original_file_name: selectedFile.name,
        mime_type: selectedFile.type,
        file_size_bytes: selectedFile.size,
        duration_ms: durationMs,
        metadata: metadata ? JSON.stringify(metadata) : null,
        rights_confirmed: true,
        status: 'published'
      };

      const res = await d1Client.music.createTrack(trackPayload);
      if (res.error) throw res.error;

      setShowUploadModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Falha ao carregar música: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setArtist('');
    setAlbum('');
    setDurationMs(0);
    setCoverFile(null);
    setCoverPreview(null);
    setRightsConfirmed(false);
    setMetadata(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta música da biblioteca?')) return;
    try {
      await d1Client.music.deleteTrack(id);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await d1Client.music.createCategory(newCategoryName.trim());
      setNewCategoryName('');
      fetchData();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Eliminar esta categoria? Músicas nesta categoria ficarão sem categoria.')) return;
    try {
      await d1Client.music.deleteCategory(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-konecta-navy">KONECTA Music Manager</h2>
          <p className="text-gray-500 text-sm">Gerencie a biblioteca oficial de músicas para Reels.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="px-6 py-3 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
          >
            Gerir Categorias
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <span className="material-symbols-outlined">add</span>
            Enviar Música
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-3xl font-black text-konecta-navy block">{tracks.length}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400">Total de Músicas</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-3xl font-black text-green-600 block">
            {tracks.filter(t => t.status === 'published').length}
          </span>
          <span className="text-[10px] font-bold uppercase text-gray-400">Publicadas</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-3xl font-black text-konecta-gold block">{categories.length}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400">Categorias</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-3xl font-black text-konecta-navy block">0</span>
          <span className="text-[10px] font-bold uppercase text-gray-400">Utilizações em Reels</span>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-konecta-navy">Músicas na Biblioteca</h3>
          <div className="flex gap-2">
            {/* Search/Filter UI could go here */}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Música</th>
                <th className="px-6 py-4">Artista / Álbum</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Duração</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhuma música carregada de momento.
                  </td>
                </tr>
              ) : (
                tracks.map(track => (
                  <tr key={track.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                          {track.cover_url ? (
                            <img src={track.cover_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-lg">music_note</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-konecta-navy">{track.title}</p>
                          <p className="text-[10px] text-gray-400">{track.mime_type?.split('/')[1]?.toUpperCase() || 'AUDIO'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{track.artist}</p>
                      <p className="text-[10px] text-gray-400">{track.album || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">
                        {track.categories?.name || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Math.floor(track.duration_ms / 60000)}:{(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        track.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {track.status === 'published' ? 'Publicada' : track.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-konecta-navy transition-colors">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(track.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-konecta-navy">Enviar Nova Música</h3>
                <button 
                  onClick={() => !isUploading && setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-8 overflow-y-auto flex-1 space-y-6">
                {/* File Selection */}
                {!selectedFile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-konecta-gold hover:bg-konecta-gold/5 transition-all cursor-pointer group"
                    >
                      <span className="material-symbols-outlined text-4xl text-gray-300 group-hover:text-konecta-gold transition-colors mb-3">cloud_upload</span>
                      <h4 className="text-base font-bold text-konecta-navy mb-1">Ficheiro Local</h4>
                      <p className="text-gray-400 text-xs">MP3, WAV, M4A, AAC, FLAC</p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        onClick={(e) => e.stopPropagation()}
                        accept="audio/*"
                        className="hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDriveSelect}
                      disabled={isDriveLoading}
                      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-konecta-gold hover:bg-konecta-gold/5 transition-all cursor-pointer group flex flex-col items-center justify-center disabled:opacity-50"
                    >
                      {isDriveLoading ? (
                        <div className="w-10 h-10 border-4 border-konecta-gold/30 border-t-konecta-gold rounded-full animate-spin mb-3"></div>
                      ) : (
                        <div className="w-10 h-10 mb-3 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-8 h-8 group-hover:scale-110 transition-transform">
                            <path fill="#0066DA" d="M15.427 15l-3.427 6h-8.573l3.427-6h8.573z"/>
                            <path fill="#00AA47" d="M22.5 15l-3.427 6h-8.573l3.427-6h8.573z" transform="rotate(120 15 15)"/>
                            <path fill="#FFBB00" d="M22.5 15l-3.427 6h-8.573l3.427-6h8.573z" transform="rotate(240 15 15)"/>
                          </svg>
                        </div>
                      )}
                      <h4 className="text-base font-bold text-konecta-navy mb-1">Google Drive</h4>
                      <p className="text-gray-400 text-xs">Selecionar da sua conta</p>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-konecta-gold text-konecta-navy flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined">music_note</span>
                      </div>
                      <div>
                        <p className="font-bold text-konecta-navy">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {Math.floor(durationMs / 60000)}:{(Math.floor((durationMs % 60000) / 1000)).toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Trocar ficheiro
                    </button>
                  </div>
                )}

                {selectedFile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Título da Música *</label>
                        <input 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full bg-gray-50 border-gray-100 focus:border-konecta-gold rounded-xl p-3 text-sm"
                          placeholder="Ex: Angola Avante"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Artista *</label>
                        <input 
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          className="w-full bg-gray-50 border-gray-100 focus:border-konecta-gold rounded-xl p-3 text-sm"
                          placeholder="Ex: Anselmo Ralph"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Álbum (Opcional)</label>
                        <input 
                          value={album}
                          onChange={(e) => setAlbum(e.target.value)}
                          className="w-full bg-gray-50 border-gray-100 focus:border-konecta-gold rounded-xl p-3 text-sm"
                          placeholder="Nome do álbum"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Categoria *</label>
                        <select 
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="w-full bg-gray-50 border-gray-100 focus:border-konecta-gold rounded-xl p-3 text-sm"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Capa da Música (Opcional)</label>
                      <div 
                        onClick={() => coverInputRef.current?.click()}
                        className="aspect-square bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        {coverPreview ? (
                          <>
                            <img src={coverPreview} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-bold">Substituir Capa</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">add_photo_alternate</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Selecionar Imagem</span>
                          </>
                        )}
                        <input 
                          type="file"
                          ref={coverInputRef}
                          onChange={handleCoverSelect}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="bg-konecta-gold/5 rounded-2xl p-5 border border-konecta-gold/20">
                    <div className="flex gap-4">
                      <input 
                        type="checkbox"
                        id="rights"
                        checked={rightsConfirmed}
                        onChange={(e) => setRightsConfirmed(e.target.checked)}
                        className="mt-1 rounded text-konecta-gold focus:ring-konecta-gold"
                      />
                      <label htmlFor="rights" className="text-xs text-gray-600 leading-relaxed">
                        Confirmo que possuo os direitos necessários ou uma licença válida para disponibilizar esta música aos utilizadores do KONECTA Angola. Estou ciente de que o uso indevido de material protegido por direitos de autor resultará na remoção do conteúdo.
                      </label>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-konecta-navy">
                      <span>A carregar música para o servidor...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-konecta-gold"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </form>

              <div className="p-8 border-t border-gray-100 flex gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="flex-1 py-4 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors border border-gray-100"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !rightsConfirmed}
                  className="flex-[2] btn-primary py-4 text-xs flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      A Enviar...
                    </>
                  ) : (
                    <>Publicar na Biblioteca</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Categories Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-konecta-navy">Gerir Categorias</h3>
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-8 space-y-6">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria..."
                    className="flex-1 bg-gray-50 border-gray-100 rounded-xl p-3 text-sm focus:border-konecta-gold outline-none"
                  />
                  <button type="submit" className="btn-primary px-4 py-2 text-xs">Adicionar</button>
                </form>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-bold text-konecta-navy">{cat.name}</span>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
