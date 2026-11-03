import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/UIContext';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { Image, X } from 'lucide-react';

interface PostCreationBoxProps {
  communityId?: string | null;
  onPostCreated: () => void;
  onClose?: () => void;
}

export const PostCreationBox: React.FC<PostCreationBoxProps> = ({ 
  communityId, 
  onPostCreated,
  onClose 
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { showToast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 10MB.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadMediaToCloudinary(file);
      if (res.secure_url) {
        setMediaUrl(res.secure_url);
        showToast('Imagem carregada com sucesso.', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao carregar imagem para o post:', err);
      showToast(err?.message || 'Falha ao carregar imagem.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Inicia sessão para publicar.', 'error');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          body: content.trim(),
          community_id: communityId || null,
          author_id: user.id,
          visibility: 'public',
          status: 'published',
          media_url: mediaUrl || null
        });

      if (error) {
        // Fallback if media_url column is not on posts directly
        const fallback = await supabase
          .from('posts')
          .insert({
            body: mediaUrl ? `${content.trim()}\n\n${mediaUrl}` : content.trim(),
            community_id: communityId || null,
            author_id: user.id,
            visibility: 'public',
            status: 'published'
          });
        if (fallback.error) throw fallback.error;
      }
      
      setContent('');
      setMediaUrl(null);
      showToast('Publicação criada com sucesso!', 'success');
      onPostCreated();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Erro ao criar publicação:', err);
      showToast(err.message || 'Erro ao criar publicação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-konecta-navy">
          {communityId ? 'Nova Publicação na Comunidade' : 'Criar Nova Publicação'}
        </span>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-sm p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que pretendes partilhar com a rede Konecta?"
          className="w-full p-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-konecta-navy resize-none"
          rows={4}
        />

        {mediaUrl && (
          <div className="relative rounded-xl overflow-hidden max-h-48 border border-gray-200 bg-gray-50">
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setMediaUrl(null)}
              className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600 hover:text-konecta-navy">
            <Image size={18} className="text-konecta-gold" />
            <span>{uploadingImage ? 'A carregar foto...' : 'Adicionar foto'}</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={uploadingImage} 
            />
          </label>

          <button 
            type="submit" 
            disabled={loading || (!content.trim() && !mediaUrl)}
            className="bg-konecta-navy text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-konecta-gold hover:text-konecta-navy transition-all disabled:opacity-50"
          >
            {loading ? 'A publicar...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  );
};
