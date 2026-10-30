import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { useWebPush } from '../hooks/useWebPush';

interface OnboardingModalProps {
  user: any;
  onComplete: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  user,
  onComplete,
  onNavigateTab
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.full_name || '');
  const [province, setProvince] = useState('Luanda');
  const [municipality, setMunicipality] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const { isSupported, enablePushNotifications } = useWebPush(user);

  const provinces = [
    'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Uíge', 
    'Malanje', 'Namibe', 'Zaire', 'Cuanza Sul', 'Cuanza Norte', 
    'Bié', 'Moxico', 'Cunene', 'Quando Cubango', 'Lunda Norte', 'Lunda Sul', 'Bengo'
  ];

  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      await d1Client.profiles.update(user.id, {
        full_name: fullName.trim(),
        province,
        municipality: municipality.trim() || null,
        bio: bio.trim() || null
      });

      setStep(2);
    } catch (err: any) {
      console.warn('Aviso ao guardar perfil no onboarding:', err?.message || err);
      alert(err?.message || 'Erro ao guardar dados do perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full shadow-2xl space-y-6"
      >
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-konecta-navy text-konecta-gold flex items-center justify-center text-xs font-black">
              {step}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-konecta-navy">
              {step === 1 ? 'Completa o teu Perfil' : step === 2 ? 'Descobre a Rede' : 'Começar a Participar'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase text-gray-400">Passo {step} de 3</span>
        </div>

        {step === 1 && (
          <form onSubmit={handleSaveStep1} className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-konecta-navy">Bem-vindo à KONECTA!</h3>
              <p className="text-xs text-gray-500">Garante que os teus dados estão corretos para te conectar com inovadores da tua região.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="O teu nome profissional ou público"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                  Província
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {provinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                  Município
                </label>
                <input
                  type="text"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ex: Cazenga"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                Biografia Breve
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Áreas de interesse, projetos ou competências que queres partilhar..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="btn-gold w-full py-3 text-xs font-black uppercase tracking-widest shadow-md mt-4"
            >
              {saving ? 'A guardar...' : 'Continuar →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <span className="material-symbols-outlined text-4xl text-konecta-gold">hub</span>
              <h3 className="text-xl font-bold text-konecta-navy">Explora o Ecossistema</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                No KONECTA encontras iniciativas reais em todas as províncias, desafios comunitários urgentes e equipas de projetos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <button
                onClick={() => { onComplete(); onNavigateTab('explore'); }}
                className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-konecta-gold transition-colors"
              >
                <span className="material-symbols-outlined text-konecta-gold text-2xl block mb-1">lightbulb</span>
                <span className="font-bold text-xs text-konecta-navy block">Explorar Ideias</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Apoia iniciativas reais</span>
              </button>

              <button
                onClick={() => { onComplete(); onNavigateTab('communities'); }}
                className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-konecta-gold transition-colors"
              >
                <span className="material-symbols-outlined text-konecta-gold text-2xl block mb-1">groups</span>
                <span className="font-bold text-xs text-konecta-navy block">Comunidades</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Junta-te a grupos</span>
              </button>
            </div>

            <button
              onClick={() => setStep(3)}
              className="btn-primary w-full py-3 text-xs"
            >
              Avançar para Notificações →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <span className="material-symbols-outlined text-4xl text-konecta-navy">notifications_active</span>
              <h3 className="text-xl font-bold text-konecta-navy">Notificações da Rede</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                Queres receber alertas quando outros membros responderem aos teus posts, apoiarem as tuas ideias ou enviarem mensagens?
              </p>
            </div>

            {isSupported ? (
              <button
                onClick={async () => {
                  await enablePushNotifications();
                  onComplete();
                }}
                className="btn-gold w-full py-3.5 text-xs font-black uppercase tracking-widest shadow-md"
              >
                Ativar Notificações Push
              </button>
            ) : null}

            <button
              onClick={onComplete}
              className="text-xs font-bold text-gray-400 hover:text-konecta-navy block w-full py-2"
            >
              Continuar para a Plataforma →
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
};
