import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { uploadToCloudinary } from '../lib/cloudinary';

export const CommunitySettings: React.FC<{ slug: string | null; onNavigateBack: () => void }> = ({ slug, onNavigateBack }) => {
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCommunity();
  }, [slug]);

  const fetchCommunity = async () => {
    if (!slug) return;
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (data) {
        setCommunity(data);
        setName(data.name);
        setDescription(data.description || '');
        setAvatarUrl(data.avatar_url || '');
        setCoverUrl(data.cover_url || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    try {
      const url = await uploadToCloudinary(file);
      if (type === 'avatar') setAvatarUrl(url);
      else setCoverUrl(url);
    } catch (err) {
      alert('Erro ao enviar imagem.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name,
          description,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', community.id);
      
      if (error) throw error;
      
      alert('Configurações atualizadas!');
      onNavigateBack();
    } catch (err) {
      alert('Erro ao atualizar.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-20 text-center">A carregar...</div>;
  if (!community) return <div className="p-20 text-center">Comunidade não encontrada.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-konecta-navy mb-8">Configurações: {community.name}</h1>
      <form onSubmit={handleSubmit} className="card-konecta p-8 space-y-6">
        <div>
          <label className="block text-xs font-bold text-konecta-navy uppercase mb-2">Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-bold text-konecta-navy uppercase mb-2">Descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100" rows={4} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-konecta-navy uppercase mb-2">Avatar</label>
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden relative">
              {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-gray-400">Selecionar</span>}
            </button>
            <input type="file" ref={avatarInputRef} className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-konecta-navy uppercase mb-2">Capa</label>
            <button type="button" onClick={() => coverInputRef.current?.click()} className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden relative">
              {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <span className="text-gray-400">Selecionar</span>}
            </button>
            <input type="file" ref={coverInputRef} className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
          </div>
        </div>

        <button type="submit" disabled={updating} className="btn-primary w-full py-3">{updating ? 'A atualizar...' : 'Guardar Alterações'}</button>
      </form>
    </div>
  );
};
