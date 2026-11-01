import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
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
import { CommunitySettings } from './pages/CommunitySettings';
import { CommunityFeedPage } from './pages/CommunityFeedPage';
import { Events } from './pages/Events';
import { KonectaRealtimeService } from './lib/realtime';
import { Messages } from './pages/Messages';
import { Search } from './pages/Search';
import { Pricing } from './pages/Pricing';
import { Admin } from './pages/Admin';
import { Reels } from './pages/Reels';
import { CommunityDetail } from './pages/CommunityDetail';
import { ProjectDetail } from './pages/ProjectDetail';
import { IdeaDetail } from './pages/IdeaDetail';
import { Organizations } from './pages/Organizations';
import { OrganizationDetail } from './pages/OrganizationDetail';
import { DigitalLibrary } from './pages/DigitalLibrary';
import { Settings } from './pages/Settings';
import { PolicyCenter } from './pages/PolicyCenter';
import { OnboardingModal } from './components/OnboardingModal';
import { d1Client } from './lib/d1Client';
import { supabase } from './lib/supabaseClient';
import { Idea, Challenge, Project, NotificationItem, ProfileUpdate, Profile as UserProfile, Community } from './types';
import { OfflineIndicator } from './components/PWAComponents';
import { ImageViewerModal } from './components/ImageViewerModal';
import { motion, AnimatePresence } from 'motion/react';
import { CANONICAL_IDEAS, CANONICAL_CHALLENGES, CANONICAL_PROJECTS } from './lib/canonicalData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedPost, setSelectedPost] = useState<Idea | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeCommunitySlug, setActiveCommunitySlug] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeOrgSlug, setActiveOrgSlug] = useState<string | null>(null);

  const openOrgDetail = (slug: string) => {
    setActiveOrgSlug(slug);
    navigateTab('org-detail');
  };

  const openReel = (reelId: string) => {
    setSelectedReelId(reelId);
    navigateTab('reels');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const d1Res = await d1Client.auth.me();
        if (d1Res.data?.user) {
          setUser(d1Res.data.user);
          setUserRole(d1Res.data.user.role || 'member');
          if (!d1Res.data.user.user_metadata?.province) {
            setShowOnboarding(true);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
        fetchInitialData();
      }
    };

    initAuth();
  }, []);

  // Realtime notification channel
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const unsubscribe = KonectaRealtimeService.subscribe('notifications', (payload: any) => {
      if (payload.new && payload.new.user_id === user.id) {
        fetchNotifications();
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Online presence heartbeat
  useEffect(() => {
    if (!user) return;

    const pingPresence = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (e) {
        // Silent ignore on background ping failure
      }
    };

    pingPresence();
    const interval = setInterval(pingPresence, 35000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchInitialData = async () => {
    // 1. STALE: Read immediately from localStorage cache
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

    // 2. REVALIDATE: Fetch fresh data from Supabase
    try {
      const [d1IdeasRes, d1ChallengesRes, d1ProjectsRes, d1ProfilesRes, d1CommunitiesRes] = await Promise.all([
        d1Client.ideas.list(30),
        d1Client.challenges.list(),
        d1Client.projects.list(),
        d1Client.profiles.list(),
        d1Client.communities.list()
      ]);

      if (d1IdeasRes.data) {
        const unique = Array.isArray(d1IdeasRes.data) ? d1IdeasRes.data : (d1IdeasRes.data.data || []);
        if (unique.length > 0) setIdeas(unique);
      }

      if (d1ChallengesRes.data) {
        const unique = Array.isArray(d1ChallengesRes.data) ? d1ChallengesRes.data : (d1ChallengesRes.data.data || []);
        if (unique.length > 0) setChallenges(unique);
      }

      if (d1ProjectsRes.data) {
        const unique = Array.isArray(d1ProjectsRes.data) ? d1ProjectsRes.data : (d1ProjectsRes.data.data || []);
        if (unique.length > 0) setProjects(unique);
      }
      
      if (d1ProfilesRes.data) {
        const unique = Array.isArray(d1ProfilesRes.data) ? d1ProfilesRes.data : (d1ProfilesRes.data.data || []);
        if (unique.length > 0) setProfiles(unique);
      }

      if (d1CommunitiesRes.data) {
        const unique = Array.isArray(d1CommunitiesRes.data) ? d1CommunitiesRes.data : (d1CommunitiesRes.data.data || []);
        if (unique.length > 0) setCommunities(unique);
      }
    } catch (err: any) {
      console.warn('Revalidação em segundo plano (Supabase):', err?.message || err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const d1Res = await d1Client.notifications.list();
      if (d1Res.data?.data) {
        setNotifications(d1Res.data.data);
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar notificações:', err?.message || err);
    }
  };

  const handleSignOut = async () => {
    try {
      await d1Client.auth.logout();
    } catch (e) {
      console.warn('Aviso ao terminar sessão:', e);
    }
    setUser(null);
    setNotifications([]);
    setUserRole(null);
    setCurrentTab('home');
  };

  const handleVoteIdea = async (id: string) => {
    if (!user) {
      setCurrentTab('login');
      return;
    }
    
    try {
      // Optimistic update
      setIdeas(prev => prev.map(item => item.id === id ? { ...item, votes_count: (item.votes_count || 0) + 1 } : item));

      await d1Client.ideas.toggleVote(id, false);
      fetchInitialData();
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

  const openProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigateTab('project-detail');
  };

  const openCommunityDetail = (communityId: string, slug?: string) => {
    setActiveCommunityId(communityId);
    if (slug) setActiveCommunitySlug(slug);
    navigateTab('community-detail');
  };

  const openIdeaDetail = (ideaId: string) => {
    setSelectedIdeaId(ideaId);
    navigateTab('idea-detail');
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
                onSelectCommunity={openCommunityDetail}
                onSelectReel={openReel}
                onVoteIdea={handleVoteIdea}
                onRequireAuth={() => navigateTab('login')}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'explore' && (
              <Explore
                ideas={ideas}
                reels={[]}
                communities={communities}
                projects={projects}
                onVoteIdea={handleVoteIdea}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectPost={openPostDetail}
                onSelectUser={openPublicProfile}
                onSelectCommunity={openCommunityDetail}
                onSelectReel={openReel}
                onSelectOrg={openOrgDetail}
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
                onSelectProject={openProjectDetail}
              />
            )}

            {currentTab === 'project-detail' && selectedProjectId && (
              <ProjectDetail
                projectId={selectedProjectId}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onBack={() => navigateTab('projects')}
                onSelectUser={openPublicProfile}
              />
            )}

            {currentTab === 'reels' && (
              <Reels
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectUser={openPublicProfile}
                initialReelId={selectedReelId}
              />
            )}

            {currentTab === 'community' && (
              <CommunityPage
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectUser={openPublicProfile}
                onSelectCommunity={openCommunityDetail}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'community-detail' && activeCommunityId && (
              <CommunityDetail
                communityId={activeCommunityId}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onBack={() => navigateTab('communities')}
                onSelectUser={openPublicProfile}
                onImageClick={setFullscreenImage}
              />
            )}

            {currentTab === 'community-settings' && (
              <CommunitySettings slug={activeCommunitySlug} onNavigateBack={() => navigateTab('communities')} />
            )}

            {currentTab === 'community-feed' && (
              <CommunityFeedPage communityId={activeCommunityId || ''} />
            )}

            {currentTab === 'communities' && (
              <Communities
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
                setActiveCommunitySlug={setActiveCommunitySlug}
                setActiveCommunityId={setActiveCommunityId}
              />
            )}

            {currentTab === 'idea-detail' && selectedIdeaId && (
              <IdeaDetail
                ideaId={selectedIdeaId}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onBack={() => navigateTab('explore')}
                onSelectUser={openPublicProfile}
              />
            )}

            {currentTab === 'events' && (
              <Events
                user={user}
                onOpenAuth={() => navigateTab('login')}
              />
            )}

            {currentTab === 'organizations' && (
              <Organizations
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onSelectOrg={openOrgDetail}
                onNavigateTab={navigateTab}
              />
            )}

            {currentTab === 'org-detail' && activeOrgSlug && (
              <OrganizationDetail
                slug={activeOrgSlug}
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onBack={() => navigateTab('organizations')}
              />
            )}

            {currentTab === 'library' && (
              <DigitalLibrary
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
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
                ideas={ideas}
                projects={projects}
                profiles={profiles}
                communities={communities}
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
                  await d1Client.ideas.delete(id);
                  fetchInitialData();
                }}
              />
            )}

            {currentTab === 'notifications' && (
              <Notifications
                notifications={notifications}
                onMarkAsRead={async (id) => {
                  await d1Client.notifications.markAsRead(id);
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

            {currentTab === 'settings' && (
              <Settings
                user={user}
                onOpenAuth={() => navigateTab('login')}
                onNavigateTab={navigateTab}
              />
            )}

            {currentTab === 'policy-center' && (
              <PolicyCenter
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

      <BottomNav
        currentTab={currentTab}
        setCurrentTab={navigateTab}
        user={user}
        onOpenAuth={() => navigateTab('login')}
        unreadCount={notifications.filter(n => !n.read).length}
      />

      <Footer onNavigateTab={navigateTab} />
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
