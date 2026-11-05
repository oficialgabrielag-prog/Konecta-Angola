import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/UIContext';
import { useWebPush } from '../hooks/useWebPush';
import { useT } from '../i18n/LanguageContext';

interface NotificationsProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  user: any;
  onOpenAuth: () => void;
  onRefreshNotifications?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ 
  notifications, 
  onMarkAsRead, 
  user, 
  onOpenAuth,
  onRefreshNotifications,
  onNavigateTab
}) => {
  const t = useT();
  const { showToast } = useToast();
  const [filterCategory, setFilterCategory] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  // Moderation decision modal & appeal state
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Web Push Hook
  const { isSubscribed, loading: pushLoading, enablePushNotifications, disablePushNotifications } = useWebPush(user);

  // Helper: Relative time formatting
  const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return t('time.now');
    if (diffSec < 3600) return t('time.minutes_ago').replace('{n}', Math.floor(diffSec / 60).toString());
    if (diffSec < 86400) return t('time.hours_ago').replace('{n}', Math.floor(diffSec / 3600).toString());
    if (diffSec < 172800) return t('messages.yesterday');

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  // Helper: Group by Hoje, Ontem, Anteriores
  const groupNotifications = (items: NotificationItem[]) => {
    const groups: { label: string; items: NotificationItem[] }[] = [];
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    items.forEach(item => {
      const itemDate = new Date(item.created_at || Date.now());
      let label = t('notifications.earlier');
      if (itemDate.toDateString() === now.toDateString()) {
        label = t('messages.today');
      } else if (itemDate.toDateString() === yesterday.toDateString()) {
        label = t('messages.yesterday');
      }

      let g = groups.find(group => group.label === label);
      if (!g) {
        g = { label, items: [] };
        groups.push(g);
      }
      g.items.push(item);
    });

    return groups;
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-konecta-navy/5 flex items-center justify-center mx-auto mb-4 text-konecta-navy">
          <span className="material-symbols-outlined text-3xl">notifications</span>
        </div>
        <h2 className="text-xl font-bold mb-2 text-konecta-navy">{t('notifications.title_empty')}</h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          {t('notifications.login_hint')}
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3 rounded-full">
          {t('common.enter')}
        </button>
      </div>
    );
  }

  const handleMarkAllAsRead = async () => {
    if (markingAll || notifications.length === 0) return;
    setMarkingAll(true);
    try {
      await d1Client.notifications.markAllAsRead();
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err: any) {
      console.warn('Aviso ao marcar notificações como lidas:', err?.message || err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    onMarkAsRead(notif.id);

    const type = notif.notification_type || notif.type;
    if (type === 'moderation_decision' || notif.target_type === 'moderation_action') {
      setSelectedNotif(notif);
      return;
    }

    if (onNavigateTab) {
      const targetType = notif.target_type || notif.notification_type || notif.type;
      if (targetType === 'message' || targetType === 'conversation') {
        onNavigateTab('messages');
      } else if (targetType === 'reel') {
        onNavigateTab('reels');
      } else if (targetType === 'community') {
        onNavigateTab('communities');
      } else if (targetType === 'project' || targetType === 'project_application') {
        onNavigateTab('projects');
      } else if (targetType === 'profile' || targetType === 'user' || targetType === 'friend_request' || targetType === 'follow') {
        onNavigateTab('explore');
      } else {
        onNavigateTab('home');
      }
    }
  };

  const handleSubmitAppeal = async () => {
    if (!selectedNotif || !selectedNotif.target_id) return;
    if (explanation.trim().length < 10) {
      showToast('A explicação deve ter pelo menos 10 caracteres', 'error');
      return;
    }
    setSubmittingAppeal(true);
    try {
      const { error } = await supabase.from('moderation_appeals').insert({
        appellant_id: user.id,
        moderation_action_id: selectedNotif.target_id,
        explanation: explanation.trim()
      });
      if (error) {
        if (error.code === '23505') {
          showToast('Já submeteu um recurso para esta decisão.', 'error');
        } else {
          showToast(`Erro ao enviar recurso: ${error.message}`, 'error');
        }
      } else {
        showToast('Recurso enviado com sucesso! Será analisado pelos administradores.', 'success');
        setShowAppealModal(false);
        setSelectedNotif(null);
        setExplanation('');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro inesperado ao submeter recurso', 'error');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filterCategory === 'unread') return !n.read_at;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const groupedNotifs = groupNotifications(filteredNotifs);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-[0.2em]">{t('notifications.alert_center')}</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-konecta-navy tracking-tight mt-1">{t('nav.notifications')}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {t('notifications.subtitle')}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="text-xs font-semibold text-konecta-navy hover:text-konecta-gold transition-colors flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-gray-200 shadow-xs self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            <span>{markingAll ? t('notifications.updating') : t('notifications.mark_all_read')}</span>
          </button>
        )}
      </header>

      {/* Web Push Banner */}
      <div className="bg-konecta-navy/5 rounded-2xl p-4 sm:p-5 mb-6 border border-konecta-gold/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-konecta-navy text-konecta-gold flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">send_to_mobile</span>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-konecta-navy">{t('notifications.push_title')}</h4>
            <p className="text-xs text-gray-500">{t('notifications.push_desc')}</p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? disablePushNotifications : enablePushNotifications}
          disabled={pushLoading}
          className={`py-1.5 px-4 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
            isSubscribed ? 'bg-emerald-600 text-white' : 'bg-konecta-navy text-white hover:bg-slate-800'
          }`}
        >
          {pushLoading ? t('common.loading') : isSubscribed ? t('notifications.push_active') : t('notifications.push_enable')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-3 mb-6">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterCategory === 'all'
              ? 'bg-konecta-navy text-white shadow-xs font-bold'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('notifications.tab_all')} ({notifications.length})
        </button>
        <button
          onClick={() => setFilterCategory('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterCategory === 'unread'
              ? 'bg-konecta-navy text-white shadow-xs font-bold'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('notifications.tab_unread')} ({unreadCount})
        </button>
      </div>

      {/* Grouped Notifications List */}
      {filteredNotifs.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200 space-y-2">
          <span className="material-symbols-outlined text-4xl text-gray-300">notifications_off</span>
          <p className="text-gray-500 text-xs">
            {filterCategory === 'unread' ? t('notifications.empty_unread') : t('notifications.empty_all')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifs.map(group => (
            <div key={group.label} className="space-y-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest px-1">
                {group.label}
              </span>

              <div className="space-y-2">
                {group.items.map(notif => {
                  const isRead = Boolean(notif.read_at);
                  const iconInfo = getNotificationIcon(notif.notification_type || notif.type);
                  const actor = notif.actor;
                  const actorName = actor?.display_name || actor?.full_name || 'Alguém';

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isRead 
                          ? 'bg-white border-gray-100 hover:border-gray-200 text-gray-700' 
                          : 'bg-amber-50/40 border-konecta-gold/40 shadow-xs font-medium text-konecta-navy'
                      }`}
                    >
                      {/* Actor Avatar or Icon */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-konecta-navy">
                          {actor?.avatar_url ? (
                            <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{actorName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${iconInfo.badgeColor}`}>
                          <span className="material-symbols-outlined text-xs">{iconInfo.icon}</span>
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-xs font-bold text-konecta-navy truncate">
                            {notif.title || actorName}
                          </h4>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {notif.body || notif.message}
                        </p>
                      </div>

                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-konecta-gold shrink-0 mt-2" title="Não lida"></span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Moderation Decision Modal */}
      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">gavel</span>
              </div>
              <h3 className="text-lg font-bold text-konecta-navy mb-1">{selectedNotif.title || 'Decisão de Moderação'}</h3>
              <p className="text-xs text-gray-500 mb-4">{formatRelativeTime(selectedNotif.created_at)}</p>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-700 leading-relaxed mb-6 space-y-2">
                <p>{selectedNotif.body || selectedNotif.message}</p>
              </div>

              <div className="flex flex-col gap-2">
                {selectedNotif.target_id && (
                  <button
                    onClick={() => {
                      setShowAppealModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-konecta-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">assignment_return</span>
                    <span>Submeter Recurso</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appeal Submission Modal */}
      <AnimatePresence>
        {showAppealModal && selectedNotif && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-konecta-navy">gavel</span>
                  <h3 className="text-lg font-bold text-konecta-navy">Recurso de Moderação</h3>
                </div>
                <button
                  onClick={() => setShowAppealModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Se consideras que a decisão de moderação foi um equívoco, explica o teu ponto de vista. A equipa de administração irá rever a tua solicitação.
              </p>

              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="Explica o motivo pelo qual a publicação deve ser restaurada (mínimo 10 caracteres)..."
                rows={5}
                className="w-full p-3.5 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-konecta-gold focus:border-transparent outline-none resize-none mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAppealModal(false)}
                  disabled={submittingAppeal}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitAppeal}
                  disabled={submittingAppeal || explanation.trim().length < 10}
                  className="px-5 py-2.5 rounded-xl bg-konecta-navy text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submittingAppeal ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar Recurso</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Helper: Notification Icon and color based on type
function getNotificationIcon(type?: string): { icon: string; badgeColor: string } {
  switch (type) {
    case 'like':
    case 'post_like':
    case 'vote':
      return { icon: 'favorite', badgeColor: 'bg-red-500' };
    case 'comment':
    case 'post_comment':
      return { icon: 'chat_bubble', badgeColor: 'bg-blue-600' };
    case 'follow':
      return { icon: 'person_add', badgeColor: 'bg-emerald-600' };
    case 'friend_request':
      return { icon: 'group_add', badgeColor: 'bg-indigo-600' };
    case 'friend_request_accepted':
      return { icon: 'how_to_reg', badgeColor: 'bg-emerald-600' };
    case 'message':
      return { icon: 'forum', badgeColor: 'bg-konecta-navy' };
    case 'community':
    case 'community_update':
      return { icon: 'groups', badgeColor: 'bg-amber-600' };
    case 'event':
      return { icon: 'event', badgeColor: 'bg-purple-600' };
    case 'project_application':
      return { icon: 'folder_special', badgeColor: 'bg-teal-600' };
    case 'moderation_decision':
      return { icon: 'gavel', badgeColor: 'bg-red-600' };
    default:
      return { icon: 'notifications', badgeColor: 'bg-konecta-navy' };
  }
}
