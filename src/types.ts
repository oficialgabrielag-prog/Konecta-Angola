export interface Profile {
  id: string;
  user_id?: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  province?: string;
  municipality?: string;
  interests?: string[];
  is_verified?: boolean;
  verified_at?: string;
  verified_until?: string;
  badge_type?: string;
  active_plan_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  trade_name?: string;
  nif?: string;
  category?: string;
  owner_id?: string;
  creator_id?: string;
  description?: string;
  mission?: string;
  logo_url?: string;
  cover_url?: string;
  province?: string;
  municipality?: string;
  address?: string;
  website?: string;
  website_url?: string;
  email?: string;
  contact_email?: string;
  phone?: string;
  contact_phone?: string;
  verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected' | string;
  verified_at?: string;
  verified_until?: string;
  followers_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface KonectaPaymentMethod {
  id: string;
  provider: 'bank_transfer' | 'express' | 'unitel_money' | string;
  display_name: string;
  account_name?: string;
  account_number?: string;
  instructions?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  // Backward compatibility aliases
  method_key?: string;
  title?: string;
  account_holder?: string;
  iban?: string;
  phone_number?: string;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  province?: string;
  municipality?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  province?: string;
  image_url?: string;
  user_id: string;
  community_id?: string;
  profiles?: Profile;
  communities?: Community;
  votes_count?: number;
  created_at?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  goal?: string;
  deadline?: string;
  reward?: string;
  status: 'open' | 'in_progress' | 'completed';
  user_id: string;
  profiles?: Profile;
  participants_count?: number;
  created_at?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed';
  category: string;
  province?: string;
  image_url?: string;
  leader_id: string;
  profiles?: Profile;
  created_at?: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee_id?: string;
  created_at?: string;
}

export interface Post {
  id: string;
  content: string;
  body?: string;
  image_url?: string;
  user_id: string;
  community_id?: string;
  profiles?: Profile;
  communities?: Community;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
}

export interface CommentItem {
  id: string;
  post_id?: string;
  idea_id?: string;
  discussion_id?: string;
  content: string;
  user_id: string;
  profiles?: Profile;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug?: string;
  description: string;
  owner_id?: string;
  avatar_url?: string;
  cover_url?: string;
  visibility?: string;
  image_url?: string;
  member_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image_url?: string;
  organizer_id: string;
  profiles?: Profile;
  participant_count?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  body?: string;
  media_url?: string | null;
  attachment_url?: string | null;
  message_type?: 'text' | 'image' | 'video' | 'audio' | string;
  status?: 'sending' | 'sent' | 'failed';
  expires_at?: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  last_message?: string;
  last_message_at?: string;
  participants?: Profile[];
  conversation_members?: any[];
  unread_count?: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string;
  actor?: Profile;
  title: string;
  message: string;
  body?: string;
  target_type?: string;
  target_id?: string;
  read_at?: string | null;
  read?: boolean;
  type?: 'vote' | 'comment' | 'message' | 'system' | string;
  notification_type?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Discussion {
  id: string;
  idea_id?: string;
  project_id?: string;
  title: string;
  content: string;
  user_id: string;
  profiles?: Profile;
  comments_count?: number;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
  posts?: Post;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  profiles?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'idea' | 'user' | 'comment';
  target_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned';
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface ChallengeVote {
  id: string;
  challenge_id: string;
  user_id: string;
  created_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  profiles?: Profile;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Reel {
  id: string;
  author_id: string;
  cloudinary_public_id: string;
  caption: string;
  video_url: string;
  thumbnail_url?: string;
  format?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  bytes?: number;
  visibility?: string;
  status?: string;
  likes_count?: number;
  comments_count?: number;
  saves_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  created_at: string;
  profiles?: Profile;
  music_info?: {
    track: MusicTrack;
    settings: {
      startMs: number;
      endMs: number;
      musicVolume: number;
      originalVolume: number;
    };
  } | null;
}

export interface CommunityAnnouncement {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  profiles?: Profile;
}

export interface CommunityRule {
  id: string;
  community_id: string;
  title: string;
  body: string;
  position?: number;
  created_at?: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  profiles?: Profile;
}

export interface MusicCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  category_id: string;
  audio_url: string;
  cloudinary_public_id: string;
  cover_url?: string;
  cover_cloudinary_public_id?: string;
  original_file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
  duration_ms: number;
  metadata?: any;
  rights_confirmed: boolean;
  rights_basis?: string;
  status: 'published' | 'draft' | 'archived';
  uploaded_by: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  categories?: MusicCategory;
}

export interface ReelMusicUse {
  id: string;
  reel_id: string;
  track_id: string;
  start_ms: number;
  end_ms: number;
  music_volume: number;
  original_audio_volume: number;
  created_by: string;
  created_at: string;
  music_tracks?: MusicTrack;
}

export interface MusicLibraryAdmin {
  id: string;
  user_id: string;
  role: 'super_admin' | 'music_editor';
  created_at: string;
}


export interface VerificationPricing {
  id: string;
  target_type: 'profile' | 'organization';
  price_amount: number;
  currency: string;
  duration_days: number;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  target_type: 'profile' | 'organization';
  target_id: string;
  proof_path: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  price_amount: number;
  currency: string;
  duration_days: number;
  created_at: string;
  profiles?: Profile;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_amount: number;
  currency: string;
  duration_days: number;
  benefits: any;
  limits: any;
  is_recommended: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'awaiting_proof' | 'pending_review' | 'approved' | 'rejected';
  proof_path?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  profiles?: Profile;
  plan?: SubscriptionPlan;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  plan?: SubscriptionPlan;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'verification' | 'subscription';
  reference_id: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}
