import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { useWebPush } from '../hooks/useWebPush';
import { useT } from '../context/LanguageContext';

interface SettingsProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
  onUpdateProfile?: (updated: any) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, 
  onOpenAuth, 
  onNavigateTab,
  onUpdateProfile 
}) => {
  const { t, language, setLanguage } = useT();
  const [activeTab, setActiveTab] = useState<string>('profile');
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

  // Privacy Settings State
  const [defaultPostVisibility, setDefaultPostVisibility] = useState('public');
  const [profileSearchable, setProfileSearchable] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMessagesFrom, setAllowMessagesFrom] = useState('everyone');

  // Notification Preferences (notification_preferences table)
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCommunityUpdates, setNotifCommunityUpdates] = useState(true);
  const [notifEventUpdates, setNotifEventUpdates] = useState(true);

  // Security & Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  // Timezone State
  const [timezone, setTimezone] = useState('Africa/Luanda');

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Appeals State
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);

  // Web Push Hook
  const { isSubscribed, enablePushNotifications, disablePushNotifications, loading: pushLoading } = useWebPush(user);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // 1. Load Profile
      const profRes = await d1Client.profiles.get(user.id);
      if (profRes.data?.data) {
        const p = profRes.data.data;
        if (p.display_name) setDisplayName(p.display_name);
        if (p.username) setUsername(p.username);
        if (p.bio) setBio(p.bio);
        if (p.province) setProvince(p.province);
        if (p.municipality) setMunicipality(p.municipality);
        if (p.avatar_url) setAvatarUrl(p.avatar_url);
      }

      // 2. Load User Settings & Privacy
      const setRes = await d1Client.settings.get();
      if (setRes.data) {
        const priv = setRes.data.privacy_settings || {};
        if (priv.default_post_visibility) setDefaultPostVisibility(priv.default_post_visibility);
        if (priv.profile_searchable !== undefined) setProfileSearchable(priv.profile_searchable);
        if (priv.show_online_status !== undefined) setShowOnlineStatus(priv.show_online_status);
        if (priv.allow_messages_from) setAllowMessagesFrom(priv.allow_messages_from);

        if (setRes.data.language) setLanguage(setRes.data.language as 'pt' | 'en');
        if (setRes.data.timezone) setTimezone(setRes.data.timezone);
      }

      // 3. Load Notification Preferences
      const notifPrefsRes = await d1Client.settings.getNotificationPreferences();
      if (notifPrefsRes.data?.data) {
        const np = notifPrefsRes.data.data;
        if (np.likes !== undefined) setNotifLikes(np.likes);
        if (np.comments !== undefined) setNotifComments(np.comments);
        if (np.follows !== undefined) setNotifFollows(np.follows);
        if (np.friend_requests !== undefined) setNotifFriendRequests(np.friend_requests);
        if (np.messages !== undefined) setNotifMessages(np.messages);
        if (np.community_updates !== undefined) setNotifCommunityUpdates(np.community_updates);
        if (np.event_updates !== undefined) setNotifEventUpdates(np.event_updates);
      }

      // 4. Load Blocked Users
      const blocksRes = await d1Client.blocks.list();
      setBlockedUsers(blocksRes.data?.data || blocksRes.data || []);

      // 5. Load User Appeals
      setLoadingAppeals(true);
      const { data: appealsData } = await supabase
        .from('moderation_appeals')
        .select('*')
        .eq('appellant_id', user.id)
        .order('created_at', { ascending: false });
      setAppeals(appealsData || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar dados de configurações:', err);
    } finally {
      setLoading(false);
      setLoadingAppeals(false);
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
        avatar_url: avatarUrl || null
      };

      const profRes = await d1Client.profiles.update(user.id, profileData);
      if (profRes.error) {
        throw new Error(profRes.error.message || 'Erro ao guardar dados do perfil.');
      }

      // Propagate to parent state
      onUpdateProfile?.({
        ...user.user_metadata,
        full_name: displayName.trim(),
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        province,
        municipality: municipality.trim(),
        bio: bio.trim()
      });

      // 2. Update Settings & Privacy in Supabase
      const settingsPayload = {
        language,
        timezone,
        privacy_settings: {
          default_post_visibility: defaultPostVisibility,
          profile_searchable: profileSearchable,
          show_online_status: showOnlineStatus,
          allow_messages_from: allowMessagesFrom
        }
      };

      const setRes = await d1Client.settings.update(settingsPayload);
      if (setRes.error) {
        throw new Error(setRes.error.message || 'Erro ao guardar privacidade.');
      }

      // 3. Update Notification Preferences in Supabase
      await d1Client.settings.updateNotificationPreferences({
        likes: notifLikes,
        comments: notifComments,
        follows: notifFollows,
        friend_requests: notifFriendRequests,
        messages: notifMessages,
        community_updates: notifCommunityUpdates,
        event_updates: notifEventUpdates
      });

      setSaveSuccess('Configurações guardadas com sucesso.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As palavras-passe introduzidas não coincidem.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess('Palavra-passe alterada com sucesso.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Não foi possível alterar a palavra-passe.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    if (!confirm('Desejas terminar a sessão em todos os dispositivos? Terás de iniciar sessão novamente.')) {
      return;
    }
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao terminar sessões: ' + (err.message || 'tenta novamente'));
      setSigningOutAll(false);
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
        <h2 className="text-2xl font-bold mb-3 text-konecta-navy">Configurações da conta</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Inicia sessão na KONECTA para gerir o teu perfil, privacidade, preferências de notificações e segurança.
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">
          Entrar na conta
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: t('nav.profile'), icon: 'badge' },
    { id: 'privacy', label: 'Privacidade e estado', icon: 'lock' },
    { id: 'notifications', label: t('nav.notifications'), icon: 'notifications' },
    { id: 'appeals', label: 'Os meus recursos', icon: 'gavel' },
    { id: 'security', label: 'Segurança e palavra-passe', icon: 'security' },
    { id: 'messages', label: 'Mensagens diretas', icon: 'chat' },
    { id: 'blocks', label: 'Membros bloqueados', icon: 'block' },
    { id: 'language', label: t('settings.lang'), icon: 'language' },
    { id: 'policies', label: 'Centro de Termos & Políticas', icon: 'policy' },
    { id: 'help', label: 'Ajuda e Suporte (976 848 444)', icon: 'support_agent' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      
      {/* Header */}
      <header className="mb-8">
        <span className="text-xs font-bold text-konecta-gold uppercase tracking-wider">Gestão da conta</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-konecta-navy mt-1">Configurações e privacidade</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1.5">
          Gere os teus dados de acesso, localização, alertas e segurança.
        </p>
      </header>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        
        {/* Navigation Tabs Sidebar */}
        <div className="w-full lg:w-72 bg-white rounded-2xl p-2.5 border border-gray-100 shadow-xs shrink-0">
          <div className="space-y-1">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'policies') {
                      onNavigateTab('policy-center');
                    } else if (t.id === 'help') {
                      onNavigateTab('help');
                    } else {
                      setActiveTab(t.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-konecta-navy text-white shadow-xs font-bold' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[19px] ${isActive ? 'text-konecta-gold' : 'text-gray-400'}`}>
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 bg-white rounded-2xl p-5 sm:p-8 border border-gray-100 shadow-xs space-y-6 w-full">
          
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-red-600">error</span>
              <span>{saveError}</span>
            </div>
          )}

          {/* 1. Profile & Location Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Perfil e localização</h3>
                <p className="text-xs text-gray-500">Dados públicos do teu perfil na KONECTA Angola.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Nome de exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Nome de utilizador (@username)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: nome_utilizador"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Província</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  >
                    {['Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire', 'Icolo e Bengo', 'Cazengo', 'Quando Cubango'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Município / Cidade</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="ex: Belas, Viana, Lobito, Lubango..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Biografia / Apresentação</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fala sobre as tuas ideias, projetos ou profissão..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                />
              </div>
            </div>
          )}

          {/* 2. Privacy & Online Status Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Privacidade e visibilidade</h3>
                <p className="text-xs text-gray-500">Define quem tem acesso às tuas publicações e ao teu estado de atividade.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">
                    Visibilidade padrão das publicações
                  </label>
                  <select
                    value={defaultPostVisibility}
                    onChange={(e) => setDefaultPostVisibility(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  >
                    <option value="public">Público (Todos na rede)</option>
                    <option value="followers">Apenas seguidores e amigos</option>
                    <option value="private">Privado (Apenas eu)</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                  <label className="flex items-start justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="font-bold text-xs text-konecta-navy">Mostrar estado de atividade (Online)</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                        Ao desativares esta opção, os outros membros não saberão quando estás online no chat, e tu também não conseguirás ver quem dos teus amigos está online na barra de mensagens.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => setShowOnlineStatus(e.target.checked)}
                      className="w-4 h-4 mt-1 text-konecta-navy rounded accent-konecta-navy shrink-0 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="font-bold text-xs text-konecta-navy">Perfil pesquisável na descoberta</p>
                      <p className="text-[11px] text-gray-500">Permite que outros membros te encontrem na barra de pesquisa e na aba Explorar.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileSearchable}
                      onChange={(e) => setProfileSearchable(e.target.checked)}
                      className="w-4 h-4 text-konecta-navy rounded accent-konecta-navy shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Preferências de notificações</h3>
                <p className="text-xs text-gray-500">Escolhe os eventos que geram alertas na tua conta.</p>
              </div>

              {/* Web Push Toggle */}
              <div className="p-4 bg-konecta-navy/5 border border-konecta-gold/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-konecta-navy text-konecta-gold flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">send_to_mobile</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-konecta-navy">Notificações push no telemóvel e navegador</h4>
                    <p className="text-[11px] text-gray-500">Recebe alertas mesmo com o aplicativo fechado.</p>
                  </div>
                </div>
                <button
                  onClick={isSubscribed ? disablePushNotifications : enablePushNotifications}
                  disabled={pushLoading}
                  className={`py-1.5 px-4 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                    isSubscribed ? 'bg-emerald-600 text-white' : 'bg-konecta-navy text-white hover:bg-slate-800'
                  }`}
                >
                  {pushLoading ? 'A processar...' : isSubscribed ? 'Ativo ✓' : 'Ativar push'}
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Gostos e reações em publicações', checked: notifLikes, setter: setNotifLikes },
                  { label: 'Novos comentários e respostas', checked: notifComments, setter: setNotifComments },
                  { label: 'Novos seguidores', checked: notifFollows, setter: setNotifFollows },
                  { label: 'Pedidos de amizade recebidos', checked: notifFriendRequests, setter: setNotifFriendRequests },
                  { label: 'Mensagens diretas no chat', checked: notifMessages, setter: setNotifMessages },
                  { label: 'Atualizações das tuas comunidades', checked: notifCommunityUpdates, setter: setNotifCommunityUpdates },
                  { label: 'Lembretes e novidades sobre eventos', checked: notifEventUpdates, setter: setNotifEventUpdates },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100/70 transition-colors">
                    <span className="text-xs font-medium text-gray-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="w-4 h-4 text-konecta-navy rounded accent-konecta-navy cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Appeals Tab */}
          {activeTab === 'appeals' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Os meus recursos de moderação</h3>
                <p className="text-xs text-gray-500">Acompanha o estado dos teus pedidos de revisão de conteúdos moderados.</p>
              </div>

              {loadingAppeals ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-konecta-navy border-t-transparent rounded-full mb-2"></span>
                  <p>A carregar recursos...</p>
                </div>
              ) : appeals.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">gavel</span>
                  <p className="text-xs text-gray-500">Não tens nenhum recurso submetido.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appeals.map(app => (
                    <div key={app.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status === 'accepted' ? 'Aprovado (Conteúdo restaurado)' :
                           app.status === 'rejected' ? 'Rejeitado' :
                           'Pendente de Análise'}
                        </span>
                        <span className="text-[10px] text-gray-400">{new Date(app.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                        "{app.explanation}"
                      </p>
                      {app.admin_note && (
                        <p className="text-xs text-gray-500 italic">
                          <span className="font-bold text-konecta-navy">Nota da administração:</span> {app.admin_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Segurança e palavra-passe</h3>
                <p className="text-xs text-gray-500">Gere as tuas credenciais de acesso e sessões ativas.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">Email associado</span>
                <p className="text-sm font-bold text-konecta-navy">{user.email}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Conta autenticada
                </span>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">Alterar palavra-passe</h4>

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-200">
                    {passwordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Nova palavra-passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Pelo menos 6 caracteres"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-konecta-navy mb-1.5">Confirmar palavra-passe</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repete a palavra-passe"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-konecta-navy focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword || !newPassword}
                  className="btn-primary py-2 px-6 text-xs rounded-full font-semibold disabled:opacity-40"
                >
                  {changingPassword ? 'A atualizar...' : 'Atualizar palavra-passe'}
                </button>
              </form>

              {/* Sign out all devices */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-konecta-navy">Terminar sessão em todos os dispositivos</p>
                  <p className="text-[11px] text-gray-500">Encerra o acesso em computadores ou telemóveis antigos.</p>
                </div>
                <button
                  onClick={handleSignOutAllDevices}
                  disabled={signingOutAll}
                  className="py-2 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                >
                  {signingOutAll ? 'A terminar...' : 'Terminar todas as sessões'}
                </button>
              </div>
            </div>
          )}

          {/* 5. Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Privacidade de mensagens diretas</h3>
                <p className="text-xs text-gray-500">Define quem tem autorização para iniciar diálogos diretos contigo.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-konecta-navy mb-1.5">
                  Quem pode enviar-te mensagens diretas
                </label>
                <select
                  value={allowMessagesFrom}
                  onChange={(e) => setAllowMessagesFrom(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                >
                  <option value="everyone">Todos os utilizadores registados</option>
                  <option value="followers">Apenas pessoas que sigo e amigos</option>
                  <option value="nobody">Ninguém</option>
                </select>
              </div>
            </div>
          )}

          {/* 6. Blocked Users Tab */}
          {activeTab === 'blocks' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">Membros bloqueados</h3>
                <p className="text-xs text-gray-500">Contas bloqueadas não podem enviar mensagens nem ver o teu perfil.</p>
              </div>

              {blockedUsers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                  Nenhum utilizador bloqueado de momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-bold text-xs text-konecta-navy">{b.profiles?.display_name || 'Utilizador'}</p>
                        <p className="text-[10px] text-gray-400">Bloqueado em {new Date(b.created_at).toLocaleDateString('pt-AO')}</p>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(b.blocked_id)}
                        disabled={unblockingId === b.blocked_id}
                        className="py-1.5 px-3.5 text-xs font-semibold text-konecta-navy bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {unblockingId === b.blocked_id ? 'A desbloquear...' : 'Desbloquear'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. Language & Timezone Tab */}
          {activeTab === 'language' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-konecta-navy">{t('settings.lang_timezone')}</h3>
                <p className="text-xs text-gray-500">Configurações regionais para datas, horas e textos da plataforma.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">{t('settings.lang_interface')}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'pt' | 'en')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  >
                    <option value="pt">Português (Angola)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-konecta-navy mb-1.5">{t('settings.timezone')}</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-konecta-navy"
                  >
                    <option value="Africa/Luanda">África/Luanda (WAT, UTC+1)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 8. Coming Soon Tab */}
          {activeTab === 'soon' && (
            <div className="py-8 text-center text-gray-400 space-y-2">
              <span className="material-symbols-outlined text-3xl">build</span>
              <p className="text-xs font-medium">Secção em desenvolvimento. Ficará disponível em breve.</p>
            </div>
          )}

          {/* Save Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-gold py-2.5 px-7 text-xs font-bold shadow-xs flex items-center gap-2 rounded-full"
            >
              {saving && <span className="animate-spin h-3.5 w-3.5 border-2 border-konecta-navy border-t-transparent rounded-full" />}
              <span>{saving ? 'A guardar...' : 'Guardar alterações'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
