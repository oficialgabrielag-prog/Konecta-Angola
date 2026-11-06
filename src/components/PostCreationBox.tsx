import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { d1Client } from '../lib/d1Client';
import { useToast } from '../context/UIContext';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { Image, X, FileText } from 'lucide-react';
import { GoogleDrivePickerModal, SelectedDocumentResult } from './GoogleDrivePickerModal';

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
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);
  const [isDocAttachment, setIsDocAttachment] = useState(false);
  const { showToast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadMediaToCloudinary(file, (p) => {
        // O progresso real é recebido aqui.
        // Se quisermos mostrar numa barra, precisamos de estado.
        // Por agora, usamos um toast de progresso ou só o estado uploading.
        if (p < 100) console.log(`Progresso: ${p}%`);
      }, { kind: 'post' });
      setMediaUrl(res.secure_url);
      showToast('Imagem carregada com sucesso.', 'success');
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
      const res = await d1Client.posts.create({
        content: content.trim(),
        image_url: mediaUrl || undefined,
        community_id: communityId || undefined
      });

      if (res.error) {
        showToast(res.error.message || 'Erro ao guardar publicação.', 'error');
        return;
      }

      setContent('');
      setMediaUrl(null);

      const createdPost = res.data?.data || res.data;
      if (res.message || createdPost?.status === 'review') {
        showToast(res.message || 'Enviado para revisão. Vai aparecer depois de aprovado.', 'info');
      } else {
        showToast('Publicação criada com sucesso!', 'success');
      }
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
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-2">
            {isDocAttachment ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className="text-xs font-bold text-konecta-navy truncate">
                    {attachedDocName || 'Documento Google Drive'}
                  </p>
                  <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                    Google Drive Anexado
                  </span>
                </div>
              </div>
            ) : (
              <div className="max-h-48 overflow-hidden rounded-lg">
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setMediaUrl(null);
                setAttachedDocName(null);
                setIsDocAttachment(false);
              }}
              className="absolute top-3 right-3 p-1 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-konecta-navy transition-colors">
              <Image size={17} className="text-konecta-gold" />
              <span>{uploadingImage ? 'A carregar foto...' : 'Foto'}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  setIsDocAttachment(false);
                  setAttachedDocName(null);
                  handleImageUpload(e);
                }}
                disabled={uploadingImage} 
              />
            </label>

            {/* Google Drive Document / File Button */}
            <button
              type="button"
              onClick={() => setShowDriveModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 transition-colors"
              title="Importar documento ou imagem do Google Drive"
            >
              <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span>Google Drive</span>
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading || (!content.trim() && !mediaUrl)}
            className="bg-konecta-navy text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-konecta-gold hover:text-konecta-navy transition-all disabled:opacity-50"
          >
            {loading ? 'A publicar...' : 'Publicar'}
          </button>
        </div>
      </form>

      {/* Google Drive Document Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        title="Selecionar Documento do Google Drive"
        onSelectDocument={(doc) => {
          setMediaUrl(doc.cloudinaryUrl || doc.driveUrl || null);
          setAttachedDocName(doc.name);
          setIsDocAttachment(!doc.mimeType?.startsWith('image/'));
          if (!content.trim() && !doc.mimeType?.startsWith('image/')) {
            setContent(`Partilha de documento: ${doc.name}`);
          }
        }}
      />
    </div>
  );
};
