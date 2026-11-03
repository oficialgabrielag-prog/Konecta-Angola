import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { NotificationItem } from '../types';
import { useT } from '../i18n/LanguageContext';

interface DashboardProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  onOpenAuth,
  onNavigateTab
}) => {
  const t = useT();
  const [ideasCount, setIdeasCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [challengesCount, setChallengesCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [d1StatsRes, d1NotifsRes] = await Promise.all([
        d1Client.stats.get(),
        d1Client.notifications.list()
      ]);

      const d1Stats = d1StatsRes.data?.data || { ideas: 0, projects: 0, challenges: 0, events: 0, bookmarks: 0 };

      setIdeasCount(d1Stats.ideas);
      setProjectsCount(d1Stats.projects);
      setChallengesCount(d1Stats.challenges);
      setEventsCount(d1Stats.events);
      setBookmarksCount(d1Stats.bookmarks);

      const d1Notifs = (d1NotifsRes.data?.data || []).slice(0, 5);
      setRecentNotifications(d1Notifs);
    } catch (err: any) {
      console.warn('Aviso ao carregar estatísticas do painel:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-konecta-navy/5 flex items-center justify-center mx-auto mb-4 text-konecta-navy">
          <span className="material-symbols-outlined text-3xl">dashboard</span>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-konecta-navy">{t('dashboard.title')}</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          {t('dashboard.login_hint')}
        </p>
        <button onClick={onOpenAuth} className="btn-primary w-full text-xs py-3.5">
          {t('profile.login_btn')}
        </button>
      </div>
    );
  }

  const navigate = (tab: string) => {
    if (onNavigateTab) onNavigateTab(tab);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-12">
        <span className="text-[10px] font-extrabold text-konecta-gold uppercase tracking-[0.2em]">{t('dashboard.overview')}</span>
        <h1 className="hero-title">{user.user_metadata?.full_name || t('dashboard.default_user_name')}</h1>
        <p className="text-gray-500 mt-3 max-w-xl text-sm leading-relaxed">
          {t('dashboard.subtitle')}
        </p>
      </header>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('profile')}
          className="card-konecta flex flex-col items-center text-center p-6 cursor-pointer hover:border-konecta-gold transition-colors"
        >
          <span className="material-symbols-outlined text-konecta-gold mb-2 text-2xl">lightbulb</span>
          <span className="text-3xl font-black text-konecta-navy mb-1">{loading ? '...' : ideasCount}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-gray-400">{t('profile.ideas_tab')}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate('projects')}
          className="card-konecta flex flex-col items-center text-center p-6 cursor-pointer hover:border-konecta-gold transition-colors"
        >
          <span className="material-symbols-outlined text-konecta-gold mb-2 text-2xl">folder_special</span>
          <span className="text-3xl font-black text-konecta-navy mb-1">{loading ? '...' : projectsCount}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-gray-400">{t('profile.projects_tab')}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('challenges')}
          className="card-konecta flex flex-col items-center text-center p-6 cursor-pointer hover:border-konecta-gold transition-colors"
        >
          <span className="material-symbols-outlined text-konecta-gold mb-2 text-2xl">emoji_events</span>
          <span className="text-3xl font-black text-konecta-navy mb-1">{loading ? '...' : challengesCount}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-gray-400">{t('dashboard.challenges_accepted')}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate('events')}
          className="card-konecta flex flex-col items-center text-center p-6 cursor-pointer hover:border-konecta-gold transition-colors"
        >
          <span className="material-symbols-outlined text-konecta-gold mb-2 text-2xl">event</span>
          <span className="text-3xl font-black text-konecta-navy mb-1">{loading ? '...' : eventsCount}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-gray-400">{t('dashboard.event_registrations')}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('profile')}
          className="card-konecta flex flex-col items-center text-center p-6 cursor-pointer hover:border-konecta-gold transition-colors col-span-2 md:col-span-1"
        >
          <span className="material-symbols-outlined text-konecta-gold mb-2 text-2xl">bookmark</span>
          <span className="text-3xl font-black text-konecta-navy mb-1">{loading ? '...' : bookmarksCount}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-gray-400">{t('dashboard.saved_bookmarks')}</span>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Recent Notifications & Activity */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-konecta-gold text-[20px]">notifications</span>
              {t('dashboard.recent_notifications')}
            </h3>
            <button 
              onClick={() => navigate('notifications')}
              className="text-[10px] font-extrabold text-konecta-navy hover:text-konecta-gold transition-colors uppercase tracking-[0.1em]"
            >
              {t('dashboard.view_all')}
            </button>
          </div>

          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">notifications_none</span>
                <p className="text-xs text-gray-400 italic">
                  {t('dashboard.notifications_empty')}
                </p>
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div key={n.id} className="card-konecta p-4 flex items-start gap-3 bg-white">
                  <span className="material-symbols-outlined text-konecta-gold text-[20px] mt-0.5">
                    {n.type === 'vote' ? 'favorite' : n.type === 'comment' ? 'comment' : 'info'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-konecta-navy">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <span className="text-[9px] text-gray-400 mt-1 block">
                      {new Date(n.created_at).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-base font-bold text-konecta-navy border-b border-gray-100 pb-3">
            {t('dashboard.quick_actions')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('create')}
              className="card-konecta hover:bg-konecta-navy hover:text-white group text-left p-5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined mb-2 text-2xl text-konecta-gold group-hover:text-konecta-gold block">
                add_circle
              </span>
              <span className="font-bold text-sm block">{t('dashboard.submit_idea')}</span>
              <span className="text-[11px] text-gray-400 group-hover:text-white/70 block mt-1">{t('dashboard.submit_idea_desc')}</span>
            </button>

            <button 
              onClick={() => navigate('projects')}
              className="card-konecta hover:bg-konecta-navy hover:text-white group text-left p-5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined mb-2 text-2xl text-konecta-gold group-hover:text-konecta-gold block">
                folder_special
              </span>
              <span className="font-bold text-sm block">{t('dashboard.manage_projects')}</span>
              <span className="text-[11px] text-gray-400 group-hover:text-white/70 block mt-1">{t('dashboard.manage_projects_desc')}</span>
            </button>

            <button 
              onClick={() => navigate('messages')}
              className="card-konecta hover:bg-konecta-navy hover:text-white group text-left p-5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined mb-2 text-2xl text-konecta-gold group-hover:text-konecta-gold block">
                chat
              </span>
              <span className="font-bold text-sm block">{t('nav.messages')}</span>
              <span className="text-[11px] text-gray-400 group-hover:text-white/70 block mt-1">{t('dashboard.messages_desc')}</span>
            </button>

            <button 
              onClick={() => navigate('explore')}
              className="card-konecta hover:bg-konecta-navy hover:text-white group text-left p-5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined mb-2 text-2xl text-konecta-gold group-hover:text-konecta-gold block">
                explore
              </span>
              <span className="font-bold text-sm block">{t('dashboard.explore_feed')}</span>
              <span className="text-[11px] text-gray-400 group-hover:text-white/70 block mt-1">{t('dashboard.explore_feed_desc')}</span>
            </button>
          </div>
        </div>

      </section>

    </div>
  );
};
