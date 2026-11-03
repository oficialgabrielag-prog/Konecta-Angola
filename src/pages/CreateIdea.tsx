import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { d1Client } from '../lib/d1Client';
import { useT } from '../context/LanguageContext';

interface CreateIdeaProps {
  user: any;
  onOpenAuth: () => void;
  onIdeaCreated: () => void;
  setCurrentTab: (tab: string) => void;
}

export const CreateIdea: React.FC<CreateIdeaProps> = ({ user, onOpenAuth, onIdeaCreated, setCurrentTab }) => {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tecnologia');
  const [province, setProvince] = useState('Luanda');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categories = ['Tecnologia', 'Inovação', 'Agricultura', 'Educação', 'Saúde', 'Energia', 'Social', 'Negócios'];
  const provinces = ['Luanda', 'Benguela', 'Huíla', 'Cabinda', 'Huambo', 'Bié', 'Uíge', 'Cuanza Sul', 'Namibe', 'Malanje'];

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-konecta-navy uppercase tracking-tighter">{t('create.share_idea_title')}</h2>
        <p className="text-gray-500 mb-8 text-sm">{t('create.idea_desc')}</p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">{t('common.enter')} →</button>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('error.general'));
        return;
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!title.trim() || !description.trim()) {
      setError(t('error.general'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let imageUrl = '';
      if (imageFile) {
        try {
          imageUrl = await uploadToCloudinary(imageFile, (progress) => {
            setUploadProgress(progress);
          });
        } catch (imgErr: any) {
          setError(imgErr?.message || t('error.general'));
          setSubmitting(false);
          return;
        }
      }

      // Insert idea into Supabase
      const ideaPayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        province,
        image_url: imageUrl || undefined,
      };

      const res = await d1Client.ideas.create(ideaPayload);
      if (res.error) {
        throw new Error(res.error.message || t('error.general'));
      }

      setSuccess(true);
      if (imagePreview) URL.revokeObjectURL(imagePreview);

      setTimeout(() => {
        onIdeaCreated();
        setCurrentTab('explore');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao submeter ideia:', err?.message || err);
      setError(err?.message || t('error.general'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
      
      <header className="mb-12">
        <button
          onClick={() => setCurrentTab('home')}
          className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-konecta-navy transition-colors flex items-center gap-2 mb-8"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t('create.back_to_home')}
        </button>
        <span className="feature-kicker">{t('create.new_initiative')}</span>
        <h1 className="hero-title">{t('create.share_idea_title')}</h1>
        <p className="text-gray-500 mt-2 max-w-xl text-sm leading-relaxed">
          {t('create.share_idea_subtitle')}
        </p>
      </header>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-3xl">check</span>
          </div>
          <h2 className="text-2xl font-bold text-green-900">{t('create.success_title')}</h2>
          <p className="text-sm text-green-700">{t('create.success_desc')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            {error && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 shrink-0 text-xl">sync_problem</span>
                  <div>
                    <p className="font-bold text-sm text-konecta-navy mb-1">{t('create.error_title')}</p>
                    <p className="text-gray-600 font-normal leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="btn-primary py-2 px-5 text-xs whitespace-nowrap self-end sm:self-center"
                >
                  {submitting ? t('create.trying') : t('create.retry')}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-konecta-navy">
                {t('create.idea_title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('create.idea_title_placeholder')}
                className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-konecta-gold shadow-xs text-konecta-navy"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-konecta-navy">{t('create.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-konecta-gold shadow-xs text-konecta-navy"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-konecta-navy">{t('create.province')}</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-konecta-gold shadow-xs text-konecta-navy"
                >
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-konecta-navy">
                {t('create.detailed_desc')} <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('create.detailed_desc_placeholder')}
                className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-konecta-gold resize-none shadow-xs text-konecta-navy"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-konecta-navy">{t('create.cover_image')}</label>
              
              {imagePreview ? (
                <div className="relative rounded-3xl overflow-hidden bg-gray-50 border border-gray-200 aspect-square flex items-center justify-center group shadow-xs">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-4 right-4 bg-konecta-navy text-white p-2 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {submitting && uploadProgress > 0 && (
                    <div className="absolute inset-0 bg-konecta-navy/70 backdrop-blur-xs flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-konecta-gold border-t-transparent rounded-full animate-spin mb-3"></div>
                      <span className="text-white text-xs font-bold uppercase tracking-widest">{t('common.loading')} {uploadProgress}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-200 hover:border-konecta-gold rounded-[32px] aspect-square flex flex-col items-center justify-center cursor-pointer bg-white transition-all group">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-konecta-gold group-hover:text-konecta-navy transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-konecta-navy transition-colors">{t('create.upload_photo')}</span>
                  <p className="text-[10px] text-gray-400 mt-2">{t('create.upload_hint')}</p>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="bg-konecta-navy rounded-3xl p-6 text-white space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-konecta-gold uppercase tracking-widest">{t('create.recommendations')}</h3>
              <ul className="space-y-3 text-xs opacity-80 leading-relaxed">
                <li className="flex gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-konecta-gold">check_circle</span>
                  {t('create.recommendation_1')}
                </li>
                <li className="flex gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-konecta-gold">check_circle</span>
                  {t('create.recommendation_2')}
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-gold w-full py-4 text-sm font-extrabold uppercase tracking-widest shadow-lg hover:brightness-105 transition-all"
            >
              {submitting ? t('create.publishing') : t('create.publish_btn')}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
