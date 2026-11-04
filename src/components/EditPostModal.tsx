import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Check } from 'lucide-react';
import { d1Client } from '../lib/d1Client';
import { useUI } from '../context/UIContext';
import { Post, Idea } from '../types';

interface EditPostModalProps {
  post: Post | Idea | any;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedItem: any) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onSaved
}) => {
  const { showToast } = useUI();
  const isIdea = 'title' in post && post.title !== undefined;
  
  const [content, setContent] = useState(() => post.content || post.body || post.description || '');
  const [title, setTitle] = useState(() => post.title || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (isIdea) {
      if (!title.trim()) {
        showToast('O título não pode estar vazio.', 'error');
        return;
      }
      if (!content.trim()) {
        showToast('A descrição não pode estar vazia.', 'error');
        return;
      }

      setSaving(true);
      try {
        const res = await d1Client.ideas.update(post.id, {
          title: title.trim(),
          description: content.trim()
        });

        if (res.error) {
          throw new Error(res.error.message || 'Erro ao atualizar ideia.');
        }

        showToast('Ideia atualizada com sucesso!', 'success');
        onSaved({
          ...post,
          title: title.trim(),
          description: content.trim()
        });
        onClose();
      } catch (err: any) {
        console.error('Erro ao editar ideia:', err);
        showToast(err?.message || 'Erro ao guardar alterações.', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      if (!content.trim() && !post.image_url) {
        showToast('A publicação não pode estar vazia.', 'error');
        return;
      }

      setSaving(true);
      try {
        const res = await d1Client.posts.update(post.id, {
          body: content.trim()
        });

        if (res.error) {
          throw new Error(res.error.message || 'Erro ao atualizar publicação.');
        }

        showToast('Publicação atualizada com sucesso!', 'success');
        onSaved({
          ...post,
          content: content.trim(),
          body: content.trim()
        });
        onClose();
      } catch (err: any) {
        console.error('Erro ao editar publicação:', err);
        showToast(err?.message || 'Erro ao guardar alterações.', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h3 className="font-extrabold text-konecta-navy text-lg">
                {isIdea ? 'Editar Ideia' : 'Editar Publicação'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Altera o conteúdo da tua publicação pública
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {isIdea && (
              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-2">
                  Título da Ideia
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título claro e conciso..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-konecta-navy focus:bg-white rounded-2xl p-3.5 text-sm font-semibold text-konecta-navy transition-all focus:outline-none focus:ring-2 focus:ring-konecta-navy/10"
                  maxLength={150}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-2">
                {isIdea ? 'Descrição Detalhada' : 'Texto da Publicação'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="O que pretendes partilhar..."
                rows={5}
                className="w-full bg-gray-50 border border-gray-200 focus:border-konecta-navy focus:bg-white rounded-2xl p-4 text-sm text-gray-800 leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-konecta-navy/10 resize-none"
                required
              />
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
                <span>Podes editar as tuas palavras a qualquer momento.</span>
                <span>{content.length} caracteres</span>
              </div>
            </div>

            {post.image_url && (
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Imagem Anexada
                </span>
                <div className="rounded-xl overflow-hidden max-h-36 border border-gray-100 bg-gray-50">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (!content.trim() && !isIdea) || (isIdea && (!title.trim() || !content.trim()))}
                className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>A guardar...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Guardar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
