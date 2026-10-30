import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { CreateIdea } from './pages/CreateIdea';
import { Challenges } from './pages/Challenges';
import { Projects } from './pages/Projects';
import { Community as CommunityPage } from './pages/Community';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PostDetail } from './pages/PostDetail';
import { Dashboard } from './pages/Dashboard';
import { Communities } from './pages/Communities';
import { Events } from './pages/Events';
import { Messages } from './pages/Messages';
import { Search } from './pages/Search';
import { Pricing } from './pages/Pricing';
import { Admin } from './pages/Admin';
import { OnboardingModal } from './components/OnboardingModal';
import { supabase, safeQuery } from './lib/supabase';
import { Idea, Challenge, Project, NotificationItem, ProfileUpdate } from './types';
import { OfflineIndicator } from './components/PWAComponents';
import { ImageViewerModal } from './components/ImageViewerModal';
import { motion, AnimatePresence } from 'motion/react';
import { CANONICAL_IDEAS, CANONICAL_CHALLENGES, CANONICAL_PROJECTS } from './lib/canonicalData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedPost, setSelectedPost] = useState<Idea | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('konecta_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // App Data State (Strictly real data; fake/sample posts and records are removed)
  const [ideas, setIdeas] = useState<Idea[]>(() => {
    try {
      const cached = localStorage.getItem('konecta_cached_ideas');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((i: any) => !i.id?.includes('can-'));
          return filtered;
        }
      }
      return [];
    } catch { return []; }
  });
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    try {
      const cached = localStorage.getItem('konecta_cached_challenges');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((c: any) => !c.id?.includes('can-'));
          return filtered;
        }
      }
      return [];
    } catch { return []; }
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = localStorage.getItem('konecta_cached_projects');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => !p.id?.includes('can-'));
          return filtered;
        }
      }
      return [];
    } catch { return []; }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    checkUser();
    fetchInitialData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        try { localStorage.setItem('konecta_demo_user', JSON.stringify(session.user)); } catch (e) {}
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('konecta_demo_user');
        setUser(null);
      } else {
        // Do not kick user out on temporary server 504 / null session!
        const saved = localStorage.getItem('konecta_demo_user');
        if (saved) {
          try { setUser(JSON.parse(saved)); } catch (e) {}
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime notification channel subscription for current user
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const notifChannel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const [userRole, setUserRole] = useState<string | null>(null);

  const checkUser = async () => {
    // 1. Immediately restore cached session so app opens in under 10ms with zero freeze
    try {
      const savedUserStr = localStorage.getItem('konecta_demo_user');
      if (savedUserStr) {
        setUser(JSON.parse(savedUserStr));
      }
    } catch (e) {}
    setLoading(false); // Immediate unblock!

    // 2. In background, check Supabase session with 2s timeout
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 2000)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      const currentUser = session?.user ?? null;
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('konecta_demo_user', JSON.stringify(currentUser));
        if (!currentUser.user_metadata?.province) {
          setShowOnboarding(true);
        }
        const { data } = await safeQuery<any>(() => supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle(), 1, 1500);
        setUserRole(data?.role || null);
      }
    } catch (e) {
      console.warn('Sessão verificada em modo resiliente:', e);
    }
  };

  const fetchInitialData = async () => {
    // 1. STALE: Read immediately from localStorage cache or fallback to canonical data so UI is instantly rendered without blank states
    try {
      const cachedIdeas = localStorage.getItem('konecta_cached_ideas');
      if (cachedIdeas) {
        const parsed = JSON.parse(cachedIdeas);
        if (Array.isArray(parsed) && parsed.length > 0) setIdeas(parsed);
      }
      const cachedChallenges = localStorage.getItem('konecta_cached_challenges');
      if (cachedChallenges) {
        const parsed = JSON.parse(cachedChallenges);
        if (Array.isArray(parsed) && parsed.length > 0) setChallenges(parsed);
      }
      const cachedProjects = localStorage.getItem('konecta_cached_projects');
      if (cachedProjects) {
        const parsed = JSON.parse(cachedProjects);
        if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
      }
    } catch (e) {}

    // 2. REVALIDATE: Fetch fresh data from Supabase in the background
    try {
      const [ideasRes, challengesRes, projectsRes] = await Promise.all([
        safeQuery<any>(() => supabase.from('ideas').select('*, profiles(*)').order('created_at', { ascending: false }).limit(20), 1, 3500),
        safeQuery<any>(() => supabase.from('challenges').select('*, profiles(*)').order('created_at', { ascending: false }).limit(10), 1, 3500),
        safeQuery<any>(() => supabase.from('projects').select('*, profiles(*)').order('created_at', { ascending: false }).limit(10), 1, 3500)
      ]);

      if (ideasRes?.data && Array.isArray(ideasRes.data) && ideasRes.data.length > 0) {
        setIdeas(ideasRes.data);
        try { localStorage.setItem('konecta_cached_ideas', JSON.stringify(ideasRes.data)); } catch (e) {}
      }
      if (challengesRes?.data && Array.isArray(challengesRes.data) && challengesRes.data.length > 0) {
        setChallenges(challengesRes.data);
        try { localStorage.setItem('konecta_cached_challenges', JSON.stringify(challengesRes.data)); } catch (e) {}
      }
      if (projectsRes?.data && Array.isArray(projectsRes.data) && projectsRes.data.length > 0) {
        setProjects(projectsRes.data);
        try { localStorage.setItem('konecta_cached_projects', JSON.stringify(projectsRes.data)); } catch (e) {}
      }
    } catch (err: any) {
      console.warn('Revalidação em segundo plano (Stale-While-Revalidate mantido):', err?.message || err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await safeQuery<any>(() => supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30));
      
      setNotifications(data || []);
    } catch (err: any) {
      console.warn('Aviso ao carregar notificações:', err?.message || err);
    }
  };

  const handleSignOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
    } catch (e) {}
    localStorage.removeItem('konecta_demo_user');
    setUser(null);
    setCurrentTab('home');
  };

  const handleVoteIdea = async (id: string) => {
    if (!user) {
      setCurrentTab('login');
      return;
    }
    
    try {
      const target = ideas.find(i => i.id === id);
      if (target) {
        setIdeas(prev => prev.map(item => item.id === id ? { ...item, votes_count: (item.votes_count || 0) + 1 } : item));
        await safeQuery<any>(() => supabase.from('ideas').update({ votes_count: (target.votes_count || 0) + 1 }).eq('id', id));
        fetchInitialData();
      }
    } catch (err: any) {
      console.warn('Aviso ao apoiar ideia:', err?.message || err);
    }
  };

  const handleUpdateProfile = (updated: ProfileUpdate) => {
    if (user) {
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...updated,
        },
      });
    }
  };

  const openPostDetail = (idea: Idea) => {
    setSelectedPost(idea);
    setCurrentTab('post-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPublicProfile = (targetUserId: string) => {
    if (user && targetUserId === user.id) {
      navigateTab('profile');
    } else {
      setSelectedUserId(targetUserId);
      setCurrentTab('public-profile');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateTab = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
      </div>
    );
  }

  // Auth Screens
  if (currentTab === 'login') {
    return <Login onSuccess={(u) => { setUser(u); setCurrentTab('home'); }} onNavigateRegister={() => setCurrentTab('register')} onBack={() => setCurrentTab('home')} />;
  }

  if (currentTab === 'register') {
    return <Register onSuccess={(u) => { setUser(u); setCurrentTab('home'); }} onNavigateLogin={() => setCurrentTab('login')} onBack={() => setCurrentTab('home')} />;
  }

  return (
    <div className="min-h-screen bg-konecta-bg text-konecta-text flex flex-col font-sans selection:bg-konecta-gold selection:text-konecta-navy">
      
      <Header
        currentTab={currentTab}
        setCurrentTab={navigateTab}
        user={user}
        isAdmin={userRole === 'admin'}
        onSignOut={handleSignOut}
        unreadCount={unreadCount}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab + (selectedPost?.id || '') + (selectedUserId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {currentTab === 'home' && (
              <Home
                setCurrentTab={navigateTab}
                ideas={ideas}
                challenges={challenges}
                user={user}
                onSelectPost={openPostDetail}
                onSelectUser={openPublicProfile}
                onVoteIdea={handleVoteIdea}
                onRequireAuth={() => navigateTab('login')}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'explore' && (
              <Explore
                ideas={ideas}
                onVoteIdea={handleVoteIdea}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectPost={openPostDetail}
                onSelectUser={openPublicProfile}
              />
            )}

            {currentTab === 'create' && (
              <CreateIdea
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onIdeaCreated={() => { fetchInitialData(); navigateTab('explore'); }}
                setCurrentTab={navigateTab}
              />
            )}

            {currentTab === 'post-detail' && selectedPost && (
              <PostDetail
                idea={selectedPost}
                user={user}
                onBack={() => navigateTab('home')}
                onVote={handleVoteIdea}
                onRequireAuth={() => navigateTab('login')}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'public-profile' && selectedUserId && (
              <PublicProfile
                userId={selectedUserId}
                currentUser={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectIdea={openPostDetail}
                onBack={() => navigateTab('explore')}
              />
            )}

            {currentTab === 'challenges' && (
              <Challenges
                challenges={challenges}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onParticipateChallenge={async () => fetchInitialData()}
              />
            )}

            {currentTab === 'projects' && (
              <Projects
                projects={projects}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onRefreshProjects={fetchInitialData}
              />
            )}

            {currentTab === 'community' && (
              <CommunityPage
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectUser={openPublicProfile}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'communities' && (
              <Communities
                user={user}
                onOpenAuth={() => navigateTab('login')}
              />
            )}

            {currentTab === 'events' && (
              <Events
                user={user}
                onOpenAuth={() => navigateTab('login')}
              />
            )}

            {currentTab === 'messages' && (
              <Messages
                user={user}
                onOpenAuth={() => navigateTab('login')}
              />
            )}

            {currentTab === 'search' && (
              <Search
                onSelectIdea={openPostDetail}
                onSelectUser={openPublicProfile}
                onNavigateTab={navigateTab}
              />
            )}

            {currentTab === 'dashboard' && (
              <Dashboard
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
              />
            )}

            {currentTab === 'profile' && (
              <Profile
                user={user}
                onOpenAuth={() => navigateTab('login')}
                userIdeas={ideas.filter(i => i.user_id === user?.id)}
                userProjects={projects.filter(p => p.leader_id === user?.id)}
                onUpdateProfile={handleUpdateProfile}
                onIdeaCreated={fetchInitialData}
                onDeleteIdea={async (id) => {
                  await supabase.from('ideas').delete().eq('id', id);
                  fetchInitialData();
                }}
              />
            )}

            {currentTab === 'notifications' && (
              <Notifications
                notifications={notifications}
                onMarkAsRead={async (id) => {
                  await supabase.from('notifications').update({ read: true }).eq('id', id);
                  fetchNotifications();
                }}
                onRefreshNotifications={fetchNotifications}
                onNavigateTab={navigateTab}
                user={user}
                onOpenAuth={() => navigateTab('login')}
              />
            )}

            {currentTab === 'pricing' && (
              <Pricing
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
              />
            )}

            {currentTab === 'admin' && (
              <Admin
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <OfflineIndicator />

      {showOnboarding && user && (
        <OnboardingModal
          user={user}
          onComplete={() => setShowOnboarding(false)}
          onNavigateTab={navigateTab}
        />
      )}

      <ImageViewerModal
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

    </div>
  );
}
