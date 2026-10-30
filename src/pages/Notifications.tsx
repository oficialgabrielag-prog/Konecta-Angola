import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItem } from '../types';
import { d1Client } from '../lib/d1Client';
import { useWebPush } from '../hooks/useWebPush';

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
  const [filterCategory, setFilterCategory] = useState<'all' | 'unread' | 'vote' | 'comment' | 'message'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  // Web Push Hook
  const { isSupported, isSubscribed, loading: pushLoading, enablePushNotifications, disablePushNotifications } = useWebPush(user);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-konecta-navy/5 flex items-center justify-center mx-auto mb-4 text-konecta-navy">
          <span className="material-symbols-outlined text-3xl">notifications</span>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-konecta-navy">Notificações da Rede</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Inicia sessão na KONECTA para consultar alertas de apoios, novos comentários e atualizações dos teus projetos.
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">
          Entrar na Conta →
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

    if (onNavigateTab) {
      if (notif.type === 'message') {
        onNavigateTab('messages');
      } else if (notif.type === 'vote' || notif.type === 'comment') {
        onNavigateTab('explore');
      } else {
        onNavigateTab('dashboard');
      }
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filterCategory === 'unread') return !n.read;
    if (filterCategory === 'vote') return n.type === 'vote';
    if (filterCategory === 'comment') return n.type === 'comment';
    if (filterCategory === 'message') return n.type === 'message';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="feature-kicker">Centro de Alertas</span>
          <h1 className="hero-title">Notificações</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Fica a par em tempo real de todas as interações com as tuas propostas e mensagens.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="text-xs font-bold text-konecta-navy hover:text-konecta-gold transition-colors flex items-center gap-1.5 py-2 px-4 rounded-xl bg-white border border-gray-200 shadow-xs self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            {markingAll ? 'A atualizar...' : 'Marcar todas como lidas'}
          </button>
        )}
      </header>

      {/* Web Push Banner */}
      <div className="bg-gradient-to-br from-konecta-navy/5 to-konecta-gold/10 rounded-2xl p-5 mb-8 border border-konecta-gold/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-konecta-navy text-konecta-gold flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">send_to_mobile</span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-konecta-navy">Notificações Push no Navegador</h4>
            <p className="text-xs text-gray-500">Recebe alertas instantâneos no teu telemóvel Android ou computador.</p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? disablePushNotifications : enablePushNotifications}
          disabled={pushLoading}
          className={`btn-primary py-2 px-5 text-xs whitespace-nowrap ${isSubscribed ? 'bg-green-600 hover:bg-red-500' : ''}`}
        >
          {pushLoading ? 'A processar...' : isSubscribed ? 'Notificações Ativas ✓' : 'Ativar Notificações Push'}
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100 mb-8">
        {[
          { id: 'all', label: `Todas (${notifications.length})` },
          { id: 'unread', label: `Não Lidas (${unreadCount})` },
          { id: 'vote', label: 'Votos / Apoios' },
          { id: 'comment', label: 'Comentários' },
          { id: 'message', label: 'Mensagens' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterCategory(item.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterCategory === item.id 
                ? 'bg-konecta-navy text-white shadow-xs' 
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200"
            >
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">notifications_off</span>
              <p className="text-gray-400 italic text-sm">
                Nenhuma notificação encontrada com o filtro selecionado.
              </p>
            </motion.div>
          ) : (
            filteredNotifs.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleNotificationClick(notif)}
                className={`card-konecta p-5 flex items-start gap-4 cursor-pointer transition-all border ${
                  notif.read 
                    ? 'bg-white/60 border-gray-100 text-gray-600' 
                    : 'bg-white border-konecta-gold/50 shadow-xs font-semibold text-konecta-navy'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.read ? 'bg-gray-100 text-gray-400' : 'bg-konecta-navy text-konecta-gold'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {notif.type === 'vote' ? 'favorite' : notif.type === 'comment' ? 'comment' : notif.type === 'message' ? 'forum' : 'notifications'}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-konecta-navy">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-konecta-gold shrink-0" title="Não lida"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {new Date(notif.created_at || Date.now()).toLocaleDateString('pt-AO')}
                    </span>
                    <span className="text-[10px] font-bold text-konecta-gold hover:underline">
                      Abrir destino →
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
