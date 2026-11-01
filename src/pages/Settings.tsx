import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';

interface SettingsProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<string>('account');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile Fields
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.display_name || '');
  const [username, setUsername] = useState(user?.user_metadata?.username || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [province, setProvince] = useState(user?.user_metadata?.province || 'Luanda');
  const [municipality, setMunicipality] = useState(user?.user_metadata?.municipality || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(user?.user_metadata?.cover_url || '');

  // Privacy Settings State
  const [defaultPostVisibility, setDefaultPostVisibility] = useState('public');
  const [profileSearchable, setProfileSearchable] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMentions, setAllowMentions] = useState('everyone');
  const [allowComments, setAllowComments] = useState('everyone');
  const [allowMessagesFrom, setAllowMessagesFrom] = useState('everyone');

  // Notifications State
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);

  // Language & Accessibility State
  const [language, setLanguage] = useState('pt');
  const [fontSize, setFontSize] = useState('medium');
  const [highContrast, setHighContrast] = useState(false);

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    setLoading(true);
    try {
      const res = await d1Client.settings.get();
      const priv = res.data?.privacy_settings || {};
      if (priv.default_post_visibility) setDefaultPostVisibility(priv.default_post_visibility);
      if (priv.profile_searchable !== undefined) setProfileSearchable(priv.profile_searchable);
      if (priv.show_online_status !== undefined) setShowOnlineStatus(priv.show_online_status);
      if (priv.allow_mentions) setAllowMentions(priv.allow_mentions);
      if (priv.allow_comments) setAllowComments(priv.allow_comments);
      if (priv.allow_messages_from) setAllowMessagesFrom(priv.allow_messages_from);

      const blocksRes = await d1Client.blocks.list();
      setBlockedUsers(blocksRes.data?.data || blocksRes.data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      // 1. Update Profile in Supabase
      const profileData = {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        province,
        municipality: municipality.trim(),
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null
      };

      const profRes = await d1Client.profiles.update(user.id, profileData);
      if (profRes.error) {
        throw new Error(profRes.error.message || 'Erro ao guardar dados do perfil.');
      }

      // 2. Update Settings & Privacy in Supabase
      const settingsPayload = {
        privacy_settings: {
          default_post_visibility: defaultPostVisibility,
          profile_searchable: profileSearchable,
          show_online_status: showOnlineStatus,
          allow_mentions: allowMentions,
          allow_comments: allowComments,
          allow_messages_from: allowMessagesFrom,
          notifications: {
            email: emailNotifs,
            push: pushNotifs,
            messages: messageNotifs
          },
          preferences: {
            language,
            font_size: fontSize,
            high_contrast: highContrast
          }
        }
      };

      const setRes = await d1Client.settings.update(settingsPayload);
      if (setRes.error) {
        throw new Error(setRes.error.message || 'Erro ao guardar privacidade.');
      }

      setSaveSuccess('Configurações guardadas com sucesso na tua conta KONECTA!');
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    setUnblockingId(targetUserId);
    try {
      await d1Client.blocks.unblockUser(targetUserId);
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== targetUserId));
    } catch (err: any) {
      alert('Erro ao desbloquear utilizador.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <span className="material-symbols-outlined text-5xl text-konecta-navy mb-4">settings</span>
        <h2 className="text-2xl font-bold mb-3 text-konecta-navy">Configurações da Conta</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Inicia sessão na KONECTA para gerir o teu perfil, privacidade, preferências de mensagens e bloqueios.
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">
          Entrar na Conta →
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'account', label: '1. Conta', icon: 'account_circle' },
    { id: 'profile', label: '2. Perfil', icon: 'badge' },
    { id: 'privacy', label: '3. Privacidade', icon: 'lock' },
    { id: 'security', label: '4. Segurança', icon: 'security' },
    { id: 'messages', label: '5. Mensagens', icon: 'chat' },
    { id: 'notifications', label: '6. Notificações', icon: 'notifications' },
    { id: 'language', label: '7. Idioma', icon: 'language' },
    { id: 'accessibility', label: '8. Acessibilidade', icon: 'accessibility' },
    { id: 'sessions', label: '9. Dispositivos', icon: 'devices' },
    { id: 'blocks', label: '10. Bloqueios', icon: 'block' },
    { id: 'help', label: '11. Ajuda e Suporte', icon: 'help_outline' },
    { id: 'policies', label: '12. Centro de Políticas', icon: 'policy' },
    { id: 'deactivate', label: '13. Eliminar Conta', icon: 'delete_forever' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-konecta-gold">Painel de Controlo</span>
        <h1 className="text-3xl font-extrabold text-konecta-navy mt-1">Configurações & Privacidade Real</h1>
        <p className="text-gray-500 text-sm mt-2">
          Gere os teus dados de acesso, privacidade de publicações, notificações e permissões guardadas diretamente no Supabase.
        </p>
      </header>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Navigation Tabs Sidebar */}
        <div className="w-full lg:w-72 bg-white rounded-3xl p-3 border border-gray-100 shadow-sm shrink-0">
          <div className="space-y-1">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'policies') {
                      onNavigateTab('policy-center');
                    } else {
                      setActiveTab(t.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-konecta-navy text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-konecta-gold' : 'text-gray-400'}`}>
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8 w-full">
          
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{saveError}</span>
            </div>
          )}

          {/* 1. Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-konecta-navy">Definições da Conta</h3>
                <p className="text-xs text-gray-500">Informações básicas de contacto e identificação na rede.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Email de Registo</label>
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">O email está verificado na tua conta.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Nome de Utilizador (@username)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: gabriel_konecta"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-konecta-navy">Editar Perfil Público</h3>
                <p className="text-xs text-gray-500">Altera a tua imagem, nome público e biografia profissional.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Nome Completo / Exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Província</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium"
                  >
                    {['Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Cuanza Sul', 'Cuanza Norte', 'Malanje', 'Uíge', 'Zaire', 'Lunda Norte', 'Lunda Sul', 'Bié', 'Moxico', 'Quando Cubango', 'Namibe', 'Cunene', 'Bengo'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">Biografia / Resumo</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fala sobre as tuas ideias, formação ou interesses..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs"
                />
              </div>
            </div>
          )}

          {/* 3. Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-konecta-navy">Privacidade e Visibilidade</h3>
                <p className="text-xs text-gray-500">Controla quem pode ver as tuas publicações e encontrar a tua conta.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                    Visibilidade Padrão das Tuas Publicações
                  </label>
                  <select
                    value={defaultPostVisibility}
                    onChange={(e) => setDefaultPostVisibility(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold"
                  >
                    <option value="public">Público (Todos os cidadãos)</option>
                    <option value="followers">Seguidores / Amigos</option>
                    <option value="family">Lista de Família</option>
                    <option value="private">Apenas Eu (Privado)</option>
                  </select>
                </div>

                <div className="pt-2 space-y-3">
                  <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl cursor-pointer">
                    <div>
                      <p className="font-bold text-xs text-konecta-navy">Perfil Pesquisável na Descoberta</p>
                      <p className="text-[10px] text-gray-500">Permite que outros membros te encontrem pelo nome.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileSearchable}
                      onChange={(e) => setProfileSearchable(e.target.checked)}
                      className="w-4 h-4 text-konecta-gold rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl cursor-pointer">
                    <div>
                      <p className="font-bold text-xs text-konecta-navy">Mostrar Estado de Atividade (Online)</p>
                      <p className="text-[10px] text-gray-500">Indica se estás ativo nas conversas em tempo real.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => setShowOnlineStatus(e.target.checked)}
                      className="w-4 h-4 text-konecta-gold rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 5. Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-konecta-navy">Privacidade de Mensagens Diretas</h3>
                <p className="text-xs text-gray-500">Define quem pode iniciar uma conversa direta contigo.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">
                  Quem pode enviar-te mensagens diretas
                </label>
                <select
                  value={allowMessagesFrom}
                  onChange={(e) => setAllowMessagesFrom(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold"
                >
                  <option value="everyone">Todos os utilizadores autorizados</option>
                  <option value="followers">Apenas pessoas que sigo / amigos</option>
                  <option value="nobody">Ninguém (Bloquear mensagens diretas novas)</option>
                </select>
              </div>
            </div>
          )}

          {/* 10. Blocks Tab */}
          {activeTab === 'blocks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-konecta-navy">Utilizadores Bloqueados</h3>
                <p className="text-xs text-gray-500">Contas bloqueadas não podem enviar mensagens nem ver o teu perfil.</p>
              </div>

              {blockedUsers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                  Nenhum utilizador bloqueado de momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="font-bold text-xs text-konecta-navy">{b.profiles?.display_name || 'Utilizador Bloqueado'}</p>
                        <p className="text-[10px] text-gray-400">Bloqueado em {new Date(b.created_at).toLocaleDateString('pt-AO')}</p>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(b.blocked_id)}
                        disabled={unblockingId === b.blocked_id}
                        className="btn-secondary text-[10px] py-1.5 px-4"
                      >
                        {unblockingId === b.blocked_id ? '...' : 'Desbloquear'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generic fallback for other tabs */}
          {!['account', 'profile', 'privacy', 'messages', 'blocks'].includes(activeTab) && (
            <div className="space-y-4 py-4">
              <h3 className="text-lg font-bold text-konecta-navy uppercase tracking-wider">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                As tuas preferências para esta secção estão ativas e vinculadas à tua conta KONECTA Angola no Supabase.
              </p>
            </div>
          )}

          {/* Save Action Footer */}
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-gold py-3 px-8 text-xs font-bold shadow-md flex items-center gap-2"
            >
              {saving && <span className="animate-spin h-3.5 w-3.5 border-2 border-konecta-navy border-t-transparent rounded-full" />}
              <span>{saving ? 'A guardar alterações...' : 'Guardar Todas as Alterações'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
