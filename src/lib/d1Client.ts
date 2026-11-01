import { supabase } from './supabaseClient';
import { KonectaRealtimeService } from './realtime';

// Initialize Realtime subscriptions
KonectaRealtimeService.init();

function wrapArray(arr: any[]) {
  const result: any = arr;
  result.data = arr;
  return result;
}

function wrapObject(obj: any) {
  if (!obj) return obj;
  const result: any = { ...obj };
  result.data = obj;
  return result;
}

export const d1Client: any = {
  auth: {
    async register(data: { email: string; password: string; full_name?: string; province?: string; municipality?: string }): Promise<any> {
      const cleanEmail = data.email.trim().toLowerCase();
      const displayName = data.full_name?.trim() || cleanEmail.split('@')[0];

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: displayName,
            province: data.province || 'Luanda',
            municipality: data.municipality || ''
          }
        }
      });

      if (authError || !authData.user) {
        return { data: null, error: authError };
      }

      const user = authData.user;
      const username = displayName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 6)}`;

      // Ensure profile exists in `profiles` table (using user_id, NOT id)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let profile = existingProfile;
      if (!profile) {
        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username,
            display_name: displayName,
            bio: 'Membro da comunidade Konecta Angola',
            avatar_url: null,
            cover_url: null,
            visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        profile = createdProfile || {
          user_id: user.id,
          username,
          display_name: displayName,
          bio: 'Membro da comunidade Konecta Angola',
          avatar_url: null,
          cover_url: null,
          visibility: 'public'
        };
      }

      const formattedProfile = {
        ...profile,
        id: profile.user_id,
        full_name: profile.display_name
      };

      const userObj = {
        ...user,
        role: 'member',
        user_metadata: {
          ...user.user_metadata,
          ...formattedProfile
        }
      };

      return {
        data: {
          user: userObj,
          profile: formattedProfile,
          session: authData.session
        },
        error: null
      };
    },

    async login(credentials: { email: string; password: string }): Promise<any> {
      const cleanEmail = credentials.email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: credentials.password
      });

      if (authError || !authData.user) {
        return { data: null, error: authError };
      }

      const user = authData.user;

      // Check or create profile (satisfies: 1 user in auth, 0 in profiles -> create without duplicates)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let profile = existingProfile;
      if (!profile) {
        const displayName = user.user_metadata?.full_name || cleanEmail.split('@')[0] || 'Inovador Konecta';
        const username = displayName
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 6)}`;

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username,
            display_name: displayName,
            bio: 'Membro da comunidade Konecta Angola',
            avatar_url: user.user_metadata?.avatar_url || null,
            cover_url: null,
            visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        profile = createdProfile || {
          user_id: user.id,
          username,
          display_name: displayName,
          avatar_url: user.user_metadata?.avatar_url || null
        };
      }

      const formattedProfile = {
        ...profile,
        id: profile.user_id,
        full_name: profile.display_name
      };

      const userObj = {
        ...user,
        role: 'member',
        user_metadata: {
          ...user.user_metadata,
          ...formattedProfile
        }
      };

      return {
        data: {
          user: userObj,
          profile: formattedProfile,
          session: authData.session
        },
        error: null
      };
    },

    async me(): Promise<any> {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) return { data: null, error: null };

      // Query profiles by user_id
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Inovador Konecta';
        const username = displayName
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 6)}`;

        const { data: created } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username,
            display_name: displayName,
            bio: 'Membro da comunidade Konecta Angola',
            avatar_url: user.user_metadata?.avatar_url || null,
            cover_url: null,
            visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        profile = created || {
          user_id: user.id,
          username,
          display_name: displayName
        };
      }

      const formattedProfile = {
        ...profile,
        id: profile.user_id,
        full_name: profile.display_name
      };

      const userObj = {
        ...user,
        role: 'member',
        user_metadata: {
          ...user.user_metadata,
          ...formattedProfile
        }
      };

      return {
        data: {
          user: userObj,
          profile: formattedProfile
        },
        error: null
      };
    },

    async logout(): Promise<any> {
      await supabase.auth.signOut();
    }
  },

  profiles: {
    async get(userId: string): Promise<any> {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        const formatted = { ...data, id: data.user_id, full_name: data.display_name };
        return { data: wrapObject(formatted), error: null };
      }
      return { data: null, error };
    },

    async update(userId: string, data: any): Promise<any> {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.full_name) payload.display_name = data.full_name;
      if (data.display_name) payload.display_name = data.display_name;
      if (data.bio !== undefined) payload.bio = data.bio;
      if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
      if (data.cover_url !== undefined) payload.cover_url = data.cover_url;
      if (data.visibility !== undefined) payload.visibility = data.visibility;
      if (data.username !== undefined) payload.username = data.username;

      const { data: updated, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      const formatted = updated ? { ...updated, id: updated.user_id, full_name: updated.display_name } : null;
      return {
        data: wrapObject(formatted),
        error
      };
    },

    async getFollowers(userId: string): Promise<any> {
      const { data: followRows } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', userId);

      const followerIds = (followRows || []).map(f => f.follower_id);
      if (followerIds.length === 0) return { data: wrapArray([]), error: null };

      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', followerIds);

      const formatted = (profs || []).map(p => ({ ...p, id: p.user_id, full_name: p.display_name }));
      return { data: wrapArray(formatted), error: null };
    },

    async getFollowing(userId: string): Promise<any> {
      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', userId);

      const followingIds = (followRows || []).map(f => f.following_id);
      if (followingIds.length === 0) return { data: wrapArray([]), error: null };

      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', followingIds);

      const formatted = (profs || []).map(p => ({ ...p, id: p.user_id, full_name: p.display_name }));
      return { data: wrapArray(formatted), error: null };
    },

    async toggleFollow(targetUserId: string, follow: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (follow) {
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('follows').delete().match({
          follower_id: user.id,
          following_id: targetUserId
        });
        return { success: !error, error };
      }
    },

    async list(limit = 20): Promise<any> {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(limit)
        .order('created_at', { ascending: false });

      const formatted = (data || []).map(p => ({ ...p, id: p.user_id, full_name: p.display_name }));
      return { data: wrapArray(formatted), error };
    }
  },

  posts: {
    async list(limit = 30, userId?: string, communityId?: string): Promise<any> {
      let query = supabase
        .from('posts')
        .select('*, post_media(*), post_comments(*), post_reactions(*), communities(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('author_id', userId);
      }
      if (communityId) {
        query = query.eq('community_id', communityId);
      } else {
        // If no communityId, we should only show posts that are either public (community_id is null)
        // or posts from public communities.
        // Actually, for simplicity and respecting RLS, we can fetch all and let RLS handle it, 
        // but we might want to explicitly filter out posts from secret communities if RLS doesn't cover "public feed" vs "member only".
        // For now, let's just fetch all and ensure we return the community info.
      }

      const { data: postRows, error } = await query;
      if (error || !postRows) return { data: wrapArray([]), error };

      // Fetch profiles using user_id
      const authorIds = Array.from(new Set(postRows.map(p => p.author_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', authorIds);

        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = postRows.map(p => ({
        id: p.id,
        author_id: p.author_id,
        user_id: p.author_id,
        content: p.body,
        body: p.body,
        community_id: p.community_id,
        communities: p.communities, // Add community metadata
        visibility: p.visibility,
        status: p.status,
        image_url: p.post_media?.[0]?.media_url || null,
        likes_count: p.post_reactions?.length || 0,
        comments_count: p.post_comments?.length || 0,
        created_at: p.created_at,
        profiles: profilesMap[p.author_id] || {
          id: p.author_id,
          user_id: p.author_id,
          full_name: 'Inovador Konecta',
          display_name: 'Inovador Konecta',
          avatar_url: null
        }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async create(data: { content?: string; body?: string; image_url?: string; community_id?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Autenticação necessária para publicar.' } };
      }

      const postBody = (data.content || data.body || '').trim();
      if (!postBody && !data.image_url) {
        return { data: null, error: { message: 'O post precisa de texto ou imagem.' } };
      }

      // 1. Insert into posts table (author_id = user.id, body = content)
      const { data: newPost, error: postErr } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          body: postBody,
          community_id: data.community_id || null,
          visibility: 'public',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (postErr || !newPost) {
        console.error('Error inserting post to Supabase:', postErr);
        return { data: null, error: postErr };
      }

      // 2. Insert image into post_media if provided
      let mediaUrl = null;
      if (data.image_url) {
        const { data: mediaData, error: mediaErr } = await supabase
          .from('post_media')
          .insert({
            post_id: newPost.id,
            media_url: data.image_url,
            media_type: 'image',
            created_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (mediaErr) {
          console.warn('Aviso ao registar post_media:', mediaErr);
        }
        mediaUrl = mediaData?.media_url || data.image_url;
      }

      // 3. Fetch author profile and community info
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let communityData = null;
      if (newPost.community_id) {
        const { data: comm } = await supabase
          .from('communities')
          .select('*')
          .eq('id', newPost.community_id)
          .maybeSingle();
        communityData = comm;
      }

      const formattedProfile = profile
        ? { ...profile, id: profile.user_id, full_name: profile.display_name }
        : {
            id: user.id,
            user_id: user.id,
            full_name: user.user_metadata?.full_name || 'Inovador Konecta',
            display_name: user.user_metadata?.full_name || 'Inovador Konecta',
            avatar_url: user.user_metadata?.avatar_url || null
          };

      const formattedPost = {
        id: newPost.id,
        author_id: newPost.author_id,
        user_id: newPost.author_id,
        content: newPost.body,
        body: newPost.body,
        community_id: newPost.community_id,
        communities: communityData,
        image_url: mediaUrl,
        likes_count: 0,
        comments_count: 0,
        created_at: newPost.created_at,
        profiles: formattedProfile
      };

      return { data: wrapObject(formattedPost), error: null };
    },

    async delete(postId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      await supabase.from('post_media').delete().eq('post_id', postId);
      await supabase.from('post_comments').delete().eq('post_id', postId);
      await supabase.from('post_reactions').delete().eq('post_id', postId);
      await supabase.from('saved_posts').delete().eq('post_id', postId);

      const { error } = await supabase
        .from('posts')
        .delete()
        .match({ id: postId, author_id: user.id });

      return { success: !error, error };
    },

    async toggleLike(postId: string, isLiked: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isLiked) {
        const { error } = await supabase.from('post_reactions').delete().match({
          post_id: postId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('post_reactions').insert({
          post_id: postId,
          user_id: user.id,
          reaction: 'like',
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async toggleBookmark(postId: string, isBookmarked: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isBookmarked) {
        const { error } = await supabase.from('saved_posts').delete().match({
          post_id: postId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('saved_posts').insert({
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async getBookmarks(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: saves } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id);

      const postIds = (saves || []).map(s => s.post_id);
      if (postIds.length === 0) return { data: wrapArray([]), error: null };

      const { data: postRows, error } = await supabase
        .from('posts')
        .select('*, post_media(*), post_comments(*), post_reactions(*)')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (error || !postRows) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(postRows.map(p => p.author_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', authorIds);

        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = postRows.map(p => ({
        id: p.id,
        post_id: p.id,
        user_id: p.author_id,
        author_id: p.author_id,
        content: p.body,
        image_url: p.post_media?.[0]?.media_url || null,
        likes_count: p.post_reactions?.length || 0,
        comments_count: p.post_comments?.length || 0,
        created_at: p.created_at,
        profiles: profilesMap[p.author_id] || { id: p.author_id, full_name: 'Inovador Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getComments(postId: string): Promise<any> {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error || !comments) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(comments.map(c => c.author_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', authorIds);

        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = comments.map(c => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.author_id,
        author_id: c.author_id,
        content: c.body,
        body: c.body,
        created_at: c.created_at,
        profiles: profilesMap[c.author_id] || { id: c.author_id, full_name: 'Membro Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addComment(postId: string, text: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          body: text.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !newComment) return { data: null, error };

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const formatted = {
        id: newComment.id,
        post_id: newComment.post_id,
        user_id: newComment.author_id,
        author_id: newComment.author_id,
        content: newComment.body,
        body: newComment.body,
        created_at: newComment.created_at,
        profiles: profile
          ? { ...profile, id: profile.user_id, full_name: profile.display_name }
          : { id: user.id, full_name: 'Membro Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    }
  },

  communities: {
    async list(): Promise<any> {
      const { data: commRows, error } = await supabase
        .from('communities')
        .select('*, community_members(*)')
        .order('created_at', { ascending: false });

      if (error || !commRows) return { data: wrapArray([]), error };

      const formatted = commRows.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        owner_id: c.owner_id,
        avatar_url: c.avatar_url,
        cover_url: c.cover_url,
        visibility: c.visibility,
        image_url: c.avatar_url || c.cover_url || null,
        member_count: c.community_members?.length || 0,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!data) return { data: null, error };
      const formatted = {
        ...data,
        image_url: data.avatar_url || data.cover_url || null
      };
      return { data: wrapObject(formatted), error: null };
    },

    async getBySlug(slug: string): Promise<any> {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      const formatted = data ? { ...data, image_url: data.avatar_url || data.cover_url || null } : null;
      return { data: wrapObject(formatted), error };
    },

    async create(data: { name: string; description: string; image_url?: string; cover_url?: string; visibility?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Autenticação necessária para criar comunidade.' } };
      }

      const cleanName = (data.name || '').trim();
      const cleanDesc = (data.description || '').trim();
      if (!cleanName) {
        return { data: null, error: { message: 'Nome da comunidade é obrigatório.' } };
      }

      const baseSlug = cleanName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'comunidade';
      const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const { data: comm, error: commErr } = await supabase
        .from('communities')
        .insert({
          name: cleanName,
          slug,
          owner_id: user.id,
          description: cleanDesc,
          avatar_url: data.image_url || null,
          cover_url: data.cover_url || null,
          visibility: data.visibility || 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (commErr || !comm) {
        console.error('Falha ao criar comunidade no Supabase:', commErr);
        return { data: null, error: commErr };
      }

      try {
        await supabase
          .from('community_members')
          .insert({
            community_id: comm.id,
            user_id: user.id,
            joined_at: new Date().toISOString()
          });
      } catch (err: any) {
        console.warn('Aviso ao associar owner em community_members:', err);
      }

      const formatted = {
        ...comm,
        image_url: comm.avatar_url,
        member_count: 1
      };

      return { data: wrapObject(formatted), error: null };
    },

    async update(id: string, data: any): Promise<any> {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
      if (data.cover_url !== undefined) payload.cover_url = data.cover_url;
      if (data.visibility !== undefined) payload.visibility = data.visibility;

      const { error } = await supabase
        .from('communities')
        .update(payload)
        .eq('id', id);
      return { success: !error, error };
    },

    async join(communityId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: user.id,
        joined_at: new Date().toISOString()
      });
      return { success: !error, error };
    },

    async leave(communityId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('community_members').delete().match({
        community_id: communityId,
        user_id: user.id
      });
      return { success: !error, error };
    },

    async getMembers(communityId: string): Promise<any> {
      const { data: members, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId);

      if (error || !members) return { data: wrapArray([]), error };

      const userIds = members.map(m => m.user_id);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = members.map(m => ({
        ...m,
        profiles: profilesMap[m.user_id] || { id: m.user_id, full_name: 'Membro Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getAnnouncements(communityId: string): Promise<any> {
      const { data, error } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(data.map(a => a.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => { profilesMap[p.user_id] = { ...p, full_name: p.display_name }; });
      }

      const formatted = data.map(a => ({
        ...a,
        profiles: profilesMap[a.author_id] || { full_name: 'Administrador' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async createAnnouncement(communityId: string, title: string, body: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('community_announcements')
        .insert({
          community_id: communityId,
          author_id: user.id,
          title: title.trim(),
          body: body.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async getRules(communityId: string): Promise<any> {
      const { data, error } = await supabase
        .from('community_rules')
        .select('*')
        .eq('community_id', communityId)
        .order('position', { ascending: true });

      return { data: wrapArray(data || []), error };
    },

    async createRule(communityId: string, title: string, body: string, position = 0): Promise<any> {
      const { data, error } = await supabase
        .from('community_rules')
        .insert({
          community_id: communityId,
          title: title.trim(),
          body: body.trim(),
          position,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async deleteRule(ruleId: string): Promise<any> {
      const { error } = await supabase
        .from('community_rules')
        .delete()
        .eq('id', ruleId);
      return { success: !error, error };
    },

    async getTabSettings(communityId: string): Promise<any> {
      const { data, error } = await supabase
        .from('community_tab_settings')
        .select('*')
        .eq('community_id', communityId)
        .order('position', { ascending: true });

      return { data: wrapArray(data || []), error };
    },

    async updateTabSetting(communityId: string, tabKey: string, isEnabled: boolean): Promise<any> {
      const { error } = await supabase
        .from('community_tab_settings')
        .upsert({
          community_id: communityId,
          tab_key: tabKey,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        }, { onConflict: 'community_id,tab_key' });

      return { success: !error, error };
    }
  },

  ideas: {
    async list(limit = 40, category?: string): Promise<any> {
      let query = supabase
        .from('ideas')
        .select('*, idea_votes(*), idea_comments(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error || !data) {
        // Fallback to posts if ideas empty
        return d1Client.posts.list(limit);
      }

      const authorIds = Array.from(new Set(data.map(i => i.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = data.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category || 'Inovação',
        status: item.status || 'open',
        user_id: item.author_id,
        author_id: item.author_id,
        votes_count: item.idea_votes?.length || 0,
        comments_count: item.idea_comments?.length || 0,
        created_at: item.created_at,
        profiles: profilesMap[item.author_id] || { id: item.author_id, full_name: 'Inovador Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('ideas')
        .select('*, idea_votes(*), idea_comments(*), idea_collaborators(*)')
        .eq('id', id)
        .maybeSingle();

      if (!data) return { data: null, error };

      let profile = null;
      if (data.author_id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', data.author_id).maybeSingle();
        if (p) profile = { ...p, id: p.user_id, full_name: p.display_name };
      }

      const formatted = {
        ...data,
        votes_count: data.idea_votes?.length || 0,
        comments_count: data.idea_comments?.length || 0,
        collaborators_count: data.idea_collaborators?.length || 0,
        profiles: profile || { id: data.author_id, full_name: 'Inovador Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async create(data: { title: string; description: string; category?: string; status?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: created, error } = await supabase
        .from('ideas')
        .insert({
          title: data.title.trim(),
          description: data.description.trim(),
          category: data.category || 'Inovação',
          status: data.status || 'open',
          author_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !created) return { data: null, error };

      const formatted = {
        id: created.id,
        title: created.title,
        description: created.description,
        category: created.category,
        status: created.status,
        author_id: created.author_id,
        user_id: created.author_id,
        votes_count: 0,
        comments_count: 0,
        created_at: created.created_at,
        profiles: { id: user.id, full_name: user.user_metadata?.full_name || 'Inovador Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async toggleVote(ideaId: string, isVoted: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isVoted) {
        const { error } = await supabase.from('idea_votes').delete().match({
          idea_id: ideaId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('idea_votes').insert({
          idea_id: ideaId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async getComments(ideaId: string): Promise<any> {
      const { data: comments, error } = await supabase
        .from('idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (error || !comments) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(comments.map(c => c.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = comments.map(c => ({
        id: c.id,
        idea_id: c.idea_id,
        author_id: c.author_id,
        content: c.body,
        body: c.body,
        created_at: c.created_at,
        profiles: profilesMap[c.author_id] || { id: c.author_id, full_name: 'Membro Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addComment(ideaId: string, text: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: newComment, error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: ideaId,
          author_id: user.id,
          body: text.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !newComment) return { data: null, error };

      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

      const formatted = {
        id: newComment.id,
        idea_id: newComment.idea_id,
        author_id: newComment.author_id,
        content: newComment.body,
        body: newComment.body,
        created_at: newComment.created_at,
        profiles: profile ? { ...profile, full_name: profile.display_name } : { full_name: 'Membro Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async getCollaborators(ideaId: string): Promise<any> {
      const { data, error } = await supabase
        .from('idea_collaborators')
        .select('*')
        .eq('idea_id', ideaId);

      if (error || !data) return { data: wrapArray([]), error };

      const userIds = data.map(c => c.user_id);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', userIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, full_name: p.display_name };
        });
      }

      const formatted = data.map(c => ({
        ...c,
        profiles: profilesMap[c.user_id] || { full_name: 'Colaborador' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addCollaborator(ideaId: string, targetUserId: string): Promise<any> {
      const { error } = await supabase.from('idea_collaborators').insert({
        idea_id: ideaId,
        user_id: targetUserId
      });
      return { success: !error, error };
    },

    async delete(ideaId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      await supabase.from('idea_votes').delete().eq('idea_id', ideaId);
      await supabase.from('idea_comments').delete().eq('idea_id', ideaId);
      await supabase.from('idea_collaborators').delete().eq('idea_id', ideaId);

      const { error } = await supabase
        .from('ideas')
        .delete()
        .match({ id: ideaId, author_id: user.id });

      return { success: !error, error };
    }
  },

  challenges: {
    async list(): Promise<any> {
      const res = await d1Client.events.list();
      const items = res.data?.data || res.data || [];
      const formatted = items.map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        category: 'Inovação',
        status: 'open',
        user_id: ev.organizer_id,
        participants_count: ev.participant_count || 0,
        created_at: ev.created_at
      }));
      return { data: wrapArray(formatted), error: null };
    },

    async create(data: any): Promise<any> {
      return d1Client.events.create({
        title: data.title,
        description: data.description,
        date: data.deadline || new Date().toISOString()
      });
    },

    async join(challengeId: string): Promise<any> {
      return d1Client.events.join(challengeId);
    },

    async leave(challengeId: string): Promise<any> {
      return d1Client.events.leave(challengeId);
    }
  },

  projects: {
    async list(category?: string): Promise<any> {
      let query = supabase
        .from('projects')
        .select('*, project_members(*), project_tasks(*), project_followers(*)')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: rows, error } = await query;
      if (error || !rows) return { data: wrapArray([]), error };

      const ownerIds = Array.from(new Set(rows.map(p => p.owner_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (ownerIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', ownerIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = rows.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        status: p.status || 'active',
        category: p.category || 'Geral',
        visibility: p.visibility || 'public',
        cover_url: p.cover_url || null,
        image_url: p.cover_url || null,
        owner_id: p.owner_id,
        leader_id: p.owner_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
        members_count: p.project_members?.length || 0,
        tasks_count: p.project_tasks?.length || 0,
        followers_count: p.project_followers?.length || 0,
        profiles: profilesMap[p.owner_id] || { id: p.owner_id, full_name: 'Líder do Projeto' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_members(*), project_tasks(*), project_milestones(*), project_followers(*)')
        .eq('id', id)
        .maybeSingle();

      if (!data) return { data: null, error };

      let ownerProfile = null;
      if (data.owner_id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', data.owner_id).maybeSingle();
        if (p) ownerProfile = { ...p, id: p.user_id, full_name: p.display_name };
      }

      const formatted = {
        ...data,
        leader_id: data.owner_id,
        image_url: data.cover_url,
        members_count: data.project_members?.length || 0,
        tasks_count: data.project_tasks?.length || 0,
        followers_count: data.project_followers?.length || 0,
        profiles: ownerProfile || { id: data.owner_id, full_name: 'Líder do Projeto' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async create(data: { title: string; description: string; category?: string; visibility?: string; cover_url?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const cleanTitle = (data.title || '').trim();
      const baseSlug = cleanTitle
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'projeto';
      const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const { data: created, error } = await supabase
        .from('projects')
        .insert({
          title: cleanTitle,
          slug,
          description: data.description?.trim() || '',
          category: data.category || 'Geral',
          visibility: data.visibility || 'public',
          cover_url: data.cover_url || null,
          status: 'active',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !created) return { data: null, error };

      // Add owner as first member
      try {
        await supabase.from('project_members').insert({
          project_id: created.id,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });
      } catch (e) {}

      const formatted = {
        ...created,
        leader_id: created.owner_id,
        image_url: created.cover_url,
        members_count: 1,
        tasks_count: 0
      };

      return { data: wrapObject(formatted), error: null };
    },

    async update(id: string, data: any): Promise<any> {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.category !== undefined) payload.category = data.category;
      if (data.status !== undefined) payload.status = data.status;
      if (data.visibility !== undefined) payload.visibility = data.visibility;
      if (data.cover_url !== undefined) payload.cover_url = data.cover_url;

      const { error } = await supabase.from('projects').update(payload).eq('id', id);
      return { success: !error, error };
    },

    async join(projectId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: user.id,
        joined_at: new Date().toISOString()
      });
      return { success: !error, error };
    },

    async leave(projectId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('project_members').delete().match({
        project_id: projectId,
        user_id: user.id
      });
      return { success: !error, error };
    },

    async getMembers(projectId: string): Promise<any> {
      const { data: members, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);

      if (error || !members) return { data: wrapArray([]), error };

      const userIds = members.map(m => m.user_id);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', userIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = members.map(m => ({
        ...m,
        id: `${m.project_id}_${m.user_id}`,
        profiles: profilesMap[m.user_id] || { id: m.user_id, full_name: 'Membro do Projeto' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async apply(projectId: string, payload: { message: string; skills: string[] }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('project_applications')
        .insert({
          project_id: projectId,
          applicant_id: user.id,
          message: payload.message.trim(),
          skills: payload.skills || [],
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async getApplications(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_applications')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: wrapArray([]), error };

      const applicantIds = Array.from(new Set(data.map(a => a.applicant_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (applicantIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', applicantIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = data.map(a => ({
        ...a,
        profiles: profilesMap[a.applicant_id] || { id: a.applicant_id, full_name: 'Inovador Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async updateApplicationStatus(applicationId: string, status: 'accepted' | 'rejected' | 'withdrawn'): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { data: app, error: fetchErr } = await supabase
        .from('project_applications')
        .select('*, projects(*)')
        .eq('id', applicationId)
        .maybeSingle();

      if (fetchErr || !app) return { success: false, error: fetchErr || 'Candidatura não encontrada' };

      const { error } = await supabase
        .from('project_applications')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) return { success: false, error };

      if (status === 'accepted') {
        try {
          await supabase.from('project_members').insert({
            project_id: app.project_id,
            user_id: app.applicant_id,
            joined_at: new Date().toISOString()
          });
        } catch (e) {}

        try {
          await supabase.from('notifications').insert({
            user_id: app.applicant_id,
            title: 'Candidatura Aceotada!',
            body: `A tua candidatura para o projeto foi aceite. Já fazes parte da equipa!`,
            read: false,
            created_at: new Date().toISOString()
          });
        } catch (e) {}
      } else if (status === 'rejected') {
        try {
          await supabase.from('notifications').insert({
            user_id: app.applicant_id,
            title: 'Atualização de Candidatura',
            body: `A tua candidatura para o projeto foi analisada. Continua a inovar!`,
            read: false,
            created_at: new Date().toISOString()
          });
        } catch (e) {}
      }

      return { success: true, error: null };
    },

    async getMyApplications(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data, error } = await supabase
        .from('project_applications')
        .select('*, projects(*)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      return { data: wrapArray(data || []), error };
    },

    async convertIdeaToProject(ideaId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data: idea, error: ideaErr } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .maybeSingle();

      if (ideaErr || !idea) return { data: null, error: 'Ideia não encontrada' };

      const res = await d1Client.projects.create({
        title: idea.title,
        description: idea.description,
        category: idea.category || 'Inovação'
      });

      return res;
    },

    async getTasks(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      return { data: wrapArray(data || []), error };
    },

    async createTask(projectId: string, title: string, description?: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description?.trim() || null,
          status: 'todo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async updateTask(taskId: string, payload: any): Promise<any> {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.description !== undefined) updateData.description = payload.description;

      const { data, error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .maybeSingle();

      return { data: wrapObject(data), error };
    },

    async deleteTask(taskId: string): Promise<any> {
      const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
      return { success: !error, error };
    },

    async getMilestones(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      return { data: wrapArray(data || []), error };
    },

    async createMilestone(projectId: string, payload: { title: string; description?: string; due_date?: string }): Promise<any> {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: projectId,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          due_date: payload.due_date || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async updateMilestone(milestoneId: string, payload: any): Promise<any> {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.title !== undefined) updateData.title = payload.title;

      const { data, error } = await supabase
        .from('project_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .select()
        .maybeSingle();

      return { data: wrapObject(data), error };
    },

    // Feed do projeto (project_updates)
    async getUpdates(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(data.map(u => u.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, full_name: p.display_name };
        });
      }

      const formatted = data.map(u => ({
        ...u,
        profiles: profilesMap[u.author_id] || { full_name: 'Líder do Projeto' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async createUpdate(projectId: string, payload: { title: string; body: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('project_updates')
        .insert({
          project_id: projectId,
          author_id: user.id,
          title: payload.title.trim(),
          body: payload.body.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    // Discussões do projeto (project_comments)
    async getComments(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error || !data) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(data.map(c => c.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, full_name: p.display_name };
        });
      }

      const formatted = data.map(c => ({
        ...c,
        profiles: profilesMap[c.author_id] || { full_name: 'Membro Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addComment(projectId: string, body: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          author_id: user.id,
          body: body.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    // Anexos (project_attachments)
    async getAttachments(projectId: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      return { data: wrapArray(data || []), error };
    },

    async addAttachment(projectId: string, fileUrl: string): Promise<any> {
      const { data, error } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          file_url: fileUrl,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    // Seguidores (project_followers)
    async toggleFollow(projectId: string, isFollowing: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isFollowing) {
        const { error } = await supabase.from('project_followers').delete().match({
          project_id: projectId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('project_followers').insert({
          project_id: projectId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async isFollowing(projectId: string): Promise<boolean> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('project_followers')
        .select('project_id')
        .match({ project_id: projectId, user_id: user.id })
        .maybeSingle();

      return !!data;
    }
  },

  reels: {
    async list(limit = 20): Promise<any> {
      const { data, error } = await supabase
        .from('reels')
        .select('*, reel_comments(*), reel_reactions(*), reel_saves(*), reel_music_uses(*, music_tracks(*))')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return { data: wrapArray([]), error };

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const authorIds = Array.from(new Set(data.map(r => r.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = data.map(r => ({
        id: r.id,
        author_id: r.author_id,
        caption: r.caption,
        video_url: r.video_url,
        thumbnail_url: r.thumbnail_url,
        format: r.format,
        width: r.width,
        height: r.height,
        created_at: r.created_at,
        likes_count: r.reel_reactions?.length || 0,
        comments_count: r.reel_comments?.length || 0,
        saves_count: r.reel_saves?.length || 0,
        is_liked: currentUserId ? (r.reel_reactions || []).some((rx: any) => rx.user_id === currentUserId) : false,
        is_saved: currentUserId ? (r.reel_saves || []).some((s: any) => s.user_id === currentUserId) : false,
        profiles: profilesMap[r.author_id] || { id: r.author_id, full_name: 'Criador Konecta' },
        music_info: r.reel_music_uses?.[0] ? {
          track: r.reel_music_uses[0].music_tracks,
          settings: {
            startMs: r.reel_music_uses[0].start_ms,
            endMs: r.reel_music_uses[0].end_ms,
            musicVolume: r.reel_music_uses[0].music_volume,
            originalVolume: r.reel_music_uses[0].original_audio_volume
          }
        } : null
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async create(payload: {
      cloudinary_public_id: string;
      video_url: string;
      caption?: string;
      thumbnail_url?: string;
      format?: string;
      width?: number;
      height?: number;
      duration_seconds?: number;
      bytes?: number;
      visibility?: string;
      status?: string;
    }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      if (!payload.cloudinary_public_id) {
        return { data: null, error: { message: 'Identificador do Cloudinary (cloudinary_public_id) é obrigatório.' } };
      }

      if (!payload.video_url) {
        return { data: null, error: { message: 'URL do vídeo (video_url) é obrigatória.' } };
      }

      const { data, error } = await supabase
        .from('reels')
        .insert({
          author_id: user.id,
          cloudinary_public_id: payload.cloudinary_public_id,
          video_url: payload.video_url,
          caption: payload.caption || '',
          thumbnail_url: payload.thumbnail_url || payload.video_url,
          format: payload.format || 'mp4',
          width: payload.width || null,
          height: payload.height || null,
          duration_seconds: payload.duration_seconds || null,
          bytes: payload.bytes || null,
          visibility: payload.visibility || 'public',
          status: payload.status || 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error inserting reel in Supabase:', error);
        return { data: null, error };
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

      const formatted = {
        ...data,
        likes_count: 0,
        comments_count: 0,
        saves_count: 0,
        is_liked: false,
        is_saved: false,
        profiles: profile ? { ...profile, full_name: profile.display_name } : { full_name: 'Criador Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async toggleReaction(reelId: string, isLiked: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isLiked) {
        const { error } = await supabase.from('reel_reactions').delete().match({
          reel_id: reelId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('reel_reactions').insert({
          reel_id: reelId,
          user_id: user.id,
          reaction: 'like',
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async getComments(reelId: string): Promise<any> {
      const { data, error } = await supabase
        .from('reel_comments')
        .select('*')
        .eq('reel_id', reelId)
        .order('created_at', { ascending: true });

      if (error || !data) return { data: wrapArray([]), error };

      const authorIds = Array.from(new Set(data.map(c => c.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, full_name: p.display_name };
        });
      }

      const formatted = data.map(c => ({
        ...c,
        content: c.body,
        profiles: profilesMap[c.author_id] || { full_name: 'Membro Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addComment(reelId: string, body: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('reel_comments')
        .insert({
          reel_id: reelId,
          author_id: user.id,
          body: body.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(data), error };
    },

    async toggleSave(reelId: string, isSaved: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isSaved) {
        const { error } = await supabase.from('reel_saves').delete().match({
          reel_id: reelId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('reel_saves').insert({
          reel_id: reelId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    }
  },

  events: {
    async list(filter?: { event_type?: string; format?: string; category?: string; search?: string }): Promise<any> {
      let query = supabase
        .from('events')
        .select('*, event_attendees(*)')
        .order('starts_at', { ascending: true });

      if (filter?.event_type) {
        query = query.eq('event_type', filter.event_type);
      }
      if (filter?.format) {
        query = query.eq('format', filter.format);
      }
      if (filter?.category && filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }

      const { data: eventRows, error } = await query;
      if (error || !eventRows) return { data: wrapArray([]), error };

      const organizerIds = Array.from(new Set(eventRows.map(e => e.organizer_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (organizerIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', organizerIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      let filtered = eventRows;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        filtered = eventRows.filter(e => 
          e.title?.toLowerCase().includes(q) || 
          e.description?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
        );
      }

      const formatted = filtered.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        date: ev.starts_at,
        venue: ev.venue || ev.location || 'Luanda / Híbrido',
        online_url: ev.online_url,
        format: ev.format || 'presencial',
        event_type: ev.event_type || 'event',
        capacity: ev.capacity || 100,
        category: ev.category || 'Inovação',
        requirements: ev.requirements,
        agenda: ev.agenda,
        certificate_available: ev.certificate_available || false,
        status: ev.status || 'published',
        visibility: ev.visibility || 'public',
        cover_photo_url: ev.cover_photo_url || ev.image_url,
        image_url: ev.cover_photo_url || ev.image_url,
        organizer_id: ev.organizer_id,
        community_id: ev.community_id,
        participant_count: (ev.event_attendees || []).filter((a: any) => a.response === 'going').length || ev.event_attendees?.length || 0,
        attendees: ev.event_attendees || [],
        profiles: profilesMap[ev.organizer_id] || { id: ev.organizer_id, full_name: 'Organizador Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getById(id: string): Promise<any> {
      const { data: ev, error } = await supabase
        .from('events')
        .select('*, event_attendees(*)')
        .eq('id', id)
        .maybeSingle();

      if (error || !ev) return { data: null, error };

      let profile = null;
      if (ev.organizer_id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', ev.organizer_id).maybeSingle();
        if (p) profile = { ...p, id: p.user_id, full_name: p.display_name };
      }

      const formatted = {
        ...ev,
        date: ev.starts_at,
        venue: ev.venue || 'Luanda',
        image_url: ev.cover_photo_url || ev.image_url,
        participant_count: (ev.event_attendees || []).filter((a: any) => a.response === 'going').length || ev.event_attendees?.length || 0,
        profiles: profile || { id: ev.organizer_id, full_name: 'Organizador Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async create(data: {
      title: string;
      description: string;
      starts_at: string;
      ends_at?: string;
      venue?: string;
      online_url?: string;
      format?: string;
      event_type?: string;
      capacity?: number;
      category?: string;
      requirements?: string;
      agenda?: string;
      certificate_available?: boolean;
      visibility?: string;
      cover_photo_url?: string;
      community_id?: string;
    }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          title: data.title.trim(),
          description: data.description.trim(),
          starts_at: data.starts_at,
          ends_at: data.ends_at || data.starts_at,
          venue: data.venue?.trim() || 'Luanda',
          online_url: data.online_url?.trim() || null,
          format: data.format || 'presencial',
          event_type: data.event_type || 'event',
          capacity: data.capacity || 100,
          category: data.category || 'Inovação',
          requirements: data.requirements?.trim() || null,
          agenda: data.agenda?.trim() || null,
          certificate_available: !!data.certificate_available,
          visibility: data.visibility || 'public',
          cover_photo_url: data.cover_photo_url || null,
          community_id: data.community_id || null,
          organizer_id: user.id,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (newEvent) {
        // Automatically join organizer as going
        try {
          await supabase.from('event_attendees').insert({
            event_id: newEvent.id,
            user_id: user.id,
            response: 'going',
            responded_at: new Date().toISOString()
          });
        } catch (e) {}
      }

      return { data: wrapObject(newEvent), error };
    },

    async update(id: string, payload: any): Promise<any> {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.starts_at !== undefined) updateData.starts_at = payload.starts_at;
      if (payload.ends_at !== undefined) updateData.ends_at = payload.ends_at;
      if (payload.venue !== undefined) updateData.venue = payload.venue;
      if (payload.online_url !== undefined) updateData.online_url = payload.online_url;
      if (payload.format !== undefined) updateData.format = payload.format;
      if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
      if (payload.category !== undefined) updateData.category = payload.category;
      if (payload.requirements !== undefined) updateData.requirements = payload.requirements;
      if (payload.agenda !== undefined) updateData.agenda = payload.agenda;
      if (payload.certificate_available !== undefined) updateData.certificate_available = payload.certificate_available;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.cover_photo_url !== undefined) updateData.cover_photo_url = payload.cover_photo_url;

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      return { data: wrapObject(data), error };
    },

    async cancel(id: string): Promise<any> {
      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      return { success: !error, error };
    },

    async join(eventId: string, response: 'going' | 'interested' | 'not_going' = 'going'): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      // Check capacity if going
      if (response === 'going') {
        const { data: ev } = await supabase.from('events').select('capacity, status').eq('id', eventId).maybeSingle();
        if (ev?.status === 'cancelled') return { success: false, error: 'Este evento foi cancelado.' };
        
        const { count } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('response', 'going');

        if (ev?.capacity && count !== null && count >= ev.capacity) {
          return { success: false, error: 'Este evento esgotou a capacidade de participantes.' };
        }
      }

      // Upsert attendee response
      const { error } = await supabase.from('event_attendees').upsert({
        event_id: eventId,
        user_id: user.id,
        response,
        responded_at: new Date().toISOString()
      }, { onConflict: 'event_id,user_id' });

      if (!error && response === 'going') {
        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Inscrição Confirmada!',
            body: 'A tua inscrição no evento foi registada com sucesso.',
            read: false,
            created_at: new Date().toISOString()
          });
        } catch (e) {}
      }

      return { success: !error, error };
    },

    async leave(eventId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('event_attendees').delete().match({
        event_id: eventId,
        user_id: user.id
      });
      return { success: !error, error };
    },

    async getMyAttendances(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('event_id, response, events(*, event_attendees(*))')
        .eq('user_id', user.id);

      const items = (attendees || []).map(a => ({
        ...(a.events as any),
        my_response: a.response,
        participant_count: (((a.events || {}) as any).event_attendees || []).filter((at: any) => at.response === 'going').length
      })).filter(Boolean);

      return { data: wrapArray(items), error: null };
    },

    async getMyEvents(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: eventRows } = await supabase
        .from('events')
        .select('*, event_attendees(*)')
        .eq('organizer_id', user.id)
        .order('starts_at', { ascending: false });

      const formatted = (eventRows || []).map(ev => ({
        ...ev,
        participant_count: (ev.event_attendees || []).filter((a: any) => a.response === 'going').length
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getAttendees(eventId: string): Promise<any> {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId);

      if (error || !data) return { data: wrapArray([]), error };

      const userIds = data.map(a => a.user_id);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', userIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = data.map(a => ({
        ...a,
        profiles: profilesMap[a.user_id] || { id: a.user_id, full_name: 'Inovador Konecta' }
      }));

      return { data: wrapArray(formatted), error: null };
    }
  },

  messages: {
    async searchProfiles(query: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      const clean = query.trim().toLowerCase();
      if (!clean) return { data: wrapArray([]), error: null };

      let { data: profs, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${clean}%,username.ilike.%${clean}%`)
        .limit(20);

      if (error || !profs || profs.length === 0) {
        const { data: allProfs } = await supabase.from('profiles').select('*').limit(50);
        profs = (allProfs || []).filter(p => 
          p.display_name?.toLowerCase().includes(clean) ||
          p.username?.toLowerCase().includes(clean)
        );
      }

      if (user) {
        profs = profs.filter(p => p.user_id !== user.id);

        try {
          const { data: blocks } = await supabase
            .from('user_blocks')
            .select('blocked_id, blocker_id')
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

          if (blocks && blocks.length > 0) {
            const blockedIds = new Set(
              blocks.map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
            );
            profs = profs.filter(p => !blockedIds.has(p.user_id));
          }
        } catch (e) {}
      }

      const formatted = profs.map(p => ({
        ...p,
        id: p.user_id,
        user_id: p.user_id,
        full_name: p.display_name || p.username || 'Membro Konecta',
        display_name: p.display_name || p.username || 'Membro Konecta',
        username: p.username,
        avatar_url: p.avatar_url,
        province: p.province || 'Angola'
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async listConversations(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: memberRows } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const convIds = (memberRows || []).map(m => m.conversation_id);
      if (convIds.length === 0) return { data: wrapArray([]), error: null };

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*, conversation_members(*)')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (error || !conversations) return { data: wrapArray([]), error };

      const allUserIds = new Set<string>();
      conversations.forEach(c => {
        (c.conversation_members || []).forEach((m: any) => {
          if (m.user_id) allUserIds.add(m.user_id);
        });
      });

      let profilesMap: Record<string, any> = {};
      if (allUserIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', Array.from(allUserIds));

        (profs || []).forEach(p => {
          profilesMap[p.user_id] = {
            id: p.user_id,
            user_id: p.user_id,
            full_name: p.display_name || p.username || 'Membro Konecta',
            display_name: p.display_name || p.username || 'Membro Konecta',
            username: p.username,
            avatar_url: p.avatar_url,
            province: p.province || 'Angola'
          };
        });
      }

      const formattedConvs = await Promise.all(
        conversations.map(async (c) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const participants = (c.conversation_members || []).map((m: any) => {
            return profilesMap[m.user_id] || {
              id: m.user_id,
              user_id: m.user_id,
              full_name: 'Membro Konecta',
              avatar_url: null
            };
          });

          return {
            ...c,
            participants,
            last_message: lastMsg?.body || 'Conversa iniciada',
            last_message_at: lastMsg?.created_at || c.updated_at || c.created_at,
            unread_count: 0
          };
        })
      );

      return { data: wrapArray(formattedConvs), error: null };
    },

    async getMessages(convId: string): Promise<any> {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      const formatted = (messages || []).map(m => ({
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.body,
        media_url: m.media_url || null,
        created_at: m.created_at
      }));

      return { data: wrapArray(formatted), error };
    },

    async sendMessage(convId: string, content: string, mediaUrl?: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          body: content.trim(),
          media_url: mediaUrl || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      const formatted = newMsg ? { ...newMsg, content: newMsg.body } : null;
      return {
        data: wrapObject(formatted),
        error
      };
    },

    async deleteMessage(messageId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase
        .from('messages')
        .delete()
        .match({ id: messageId, sender_id: user.id });

      return { success: !error, error };
    },

    async startConversation(targetUserId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Sessão expirada. Por favor, inicie sessão.' } };

      if (user.id === targetUserId) {
        return { data: null, error: { message: 'Não é possível iniciar conversa consigo próprio.' } };
      }

      try {
        const { data: blocks } = await supabase
          .from('user_blocks')
          .select('id')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`);

        if (blocks && blocks.length > 0) {
          return { data: null, error: { message: 'Não é possível enviar mensagens a este utilizador devido a restrições de privacidade ou bloqueio.' } };
        }
      } catch (e) {}

      const { data: myMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myMembers && myMembers.length > 0) {
        const myConvIds = myMembers.map(m => m.conversation_id);
        const { data: sharedMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .in('conversation_id', myConvIds)
          .eq('user_id', targetUserId);

        if (sharedMembers && sharedMembers.length > 0) {
          const sharedConvId = sharedMembers[0].conversation_id;
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*, conversation_members(*)')
            .eq('id', sharedConvId)
            .maybeSingle();

          if (existingConv) {
            return { data: wrapObject(existingConv), error: null };
          }
        }
      }

      try {
        const { data: rpcConvId, error: rpcErr } = await supabase.rpc('start_direct_conversation', {
          p_target_user_id: targetUserId
        });

        if (!rpcErr && rpcConvId) {
          const { data: convData } = await supabase
            .from('conversations')
            .select('*, conversation_members(*)')
            .eq('id', rpcConvId)
            .maybeSingle();

          if (convData) return { data: wrapObject(convData), error: null };
        }
      } catch (e) {
        console.warn('RPC start_direct_conversation fallback to manual insert:', e);
      }

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !newConv) return { data: null, error: error || { message: 'Erro ao criar conversa.' } };

      await supabase.from('conversation_members').insert([
        { conversation_id: newConv.id, user_id: user.id, joined_at: new Date().toISOString() },
        { conversation_id: newConv.id, user_id: targetUserId, joined_at: new Date().toISOString() }
      ]);

      const { data: fullConv } = await supabase
        .from('conversations')
        .select('*, conversation_members(*)')
        .eq('id', newConv.id)
        .maybeSingle();

      return { data: wrapObject(fullConv || newConv), error: null };
    }
  },

  notifications: {
    async list(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const formatted = (notifs || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        title: n.title,
        message: n.body,
        read: Boolean(n.read),
        created_at: n.created_at
      }));

      return { data: wrapArray(formatted), error };
    },

    async markAllAsRead(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);

      return { success: !error, error };
    },

    async markAsRead(id: string): Promise<any> {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      return { success: !error, error };
    }
  },

  reports: {
    async create(data: { target_type: string; target_id: string; reason: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: data.target_type,
        target_id: data.target_id,
        reason: data.reason,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      return { success: !error, error };
    },

    async update(id: string, data: any): Promise<any> {
      const { error } = await supabase.from('reports').update(data).eq('id', id);
      return { success: !error, error };
    },

    async list(): Promise<any> {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      return { data: wrapArray(data || []), error };
    }
  },

  stats: {
    async get(): Promise<any> {
      const [postsCount, commsCount, eventsCount] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('communities').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true })
      ]);

      return {
        data: {
          ideas: postsCount.count || 0,
          projects: commsCount.count || 0,
          challenges: eventsCount.count || 0,
          events: eventsCount.count || 0,
          bookmarks: 0
        }
      };
    }
  },

  search: {
    async global(query: string): Promise<any> {
      const clean = query.trim().toLowerCase();
      if (!clean) {
        return { data: { ideas: [], profiles: [], projects: [], communities: [], events: [] } };
      }

      const [postsRes, profsRes, commsRes] = await Promise.all([
        supabase.from('posts').select('*, post_media(*)').ilike('body', `%${clean}%`).limit(10),
        supabase.from('profiles').select('*').ilike('display_name', `%${clean}%`).limit(10),
        supabase.from('communities').select('*').ilike('name', `%${clean}%`).limit(10)
      ]);

      const ideas = (postsRes.data || []).map(p => ({
        id: p.id,
        title: p.body.slice(0, 50),
        description: p.body,
        image_url: p.post_media?.[0]?.media_url || null
      }));

      const profiles = (profsRes.data || []).map(p => ({
        ...p,
        id: p.user_id,
        full_name: p.display_name
      }));

      const communities = (commsRes.data || []).map(c => ({
        ...c,
        image_url: c.avatar_url
      }));

      return {
        data: {
          ideas,
          profiles,
          projects: communities,
          communities,
          events: []
        }
      };
    }
  },

  music: {
    async listCategories(): Promise<any> {
      const { data, error } = await supabase
        .from('music_categories')
        .select('*')
        .order('name', { ascending: true });
      return { data: wrapArray(data || []), error };
    },

    async createCategory(name: string): Promise<any> {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');
      const { data, error } = await supabase
        .from('music_categories')
        .insert({ name, slug, created_at: new Date().toISOString() })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async deleteCategory(id: string): Promise<any> {
      const { error } = await supabase.from('music_categories').delete().eq('id', id);
      return { success: !error, error };
    },

    async listTracks(filters?: { category_id?: string; status?: string; search?: string }): Promise<any> {
      let query = supabase
        .from('music_tracks')
        .select('*, music_categories(*)')
        .order('created_at', { ascending: false });

      if (filters?.category_id && filters.category_id !== 'all') {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'published');
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,artist.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      return { data: wrapArray(data || []), error };
    },

    async getTrackById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*, music_categories(*)')
        .eq('id', id)
        .maybeSingle();
      return { data: wrapObject(data), error };
    },

    async createTrack(payload: any): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('music_tracks')
        .insert({
          ...payload,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async updateTrack(id: string, payload: any): Promise<any> {
      const { error } = await supabase
        .from('music_tracks')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      return { success: !error, error };
    },

    async deleteTrack(id: string): Promise<any> {
      const { error } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', id);
      return { success: !error, error };
    },

    async isAdmin(): Promise<boolean> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Secondary check for the specific email mentioned in prompt
      if (user.email === 'oficialgabrielag@gmail.com' || user.email === 'officialgabrielag@gmail.com') return true;

      const { data } = await supabase
        .from('music_library_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },

    async addMusicToReel(reelId: string, trackId: string, settings: { start_ms: number; end_ms: number; music_volume: number; original_audio_volume: number }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase
        .from('reel_music_uses')
        .insert({
          reel_id: reelId,
          track_id: trackId,
          ...settings,
          created_by: user.id,
          created_at: new Date().toISOString()
        });
      return { success: !error, error };
    },

    async getReelMusic(reelId: string): Promise<any> {
      const { data, error } = await supabase
        .from('reel_music_uses')
        .select('*, music_tracks(*)')
        .eq('reel_id', reelId)
        .maybeSingle();
      return { data: wrapObject(data), error };
    }
  },

  organizations: {
    async list(filter?: { category?: string; province?: string; search?: string; verified?: boolean; owner_id?: string; my_member?: string }): Promise<any> {
      let query = supabase
        .from('organizations')
        .select('*, organization_members(*), organization_followers(*)')
        .order('created_at', { ascending: false });

      if (filter?.category && filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }
      if (filter?.province && filter.province !== 'all') {
        query = query.eq('province', filter.province);
      }
      if (filter?.verified !== undefined) {
        query = query.eq('verified', filter.verified);
      }
      if (filter?.owner_id) {
        query = query.eq('owner_id', filter.owner_id);
      }

      const { data, error } = await query;
      if (error || !data) return { data: wrapArray([]), error };

      let filtered = data;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        filtered = data.filter(o => 
          o.name?.toLowerCase().includes(q) || 
          o.description?.toLowerCase().includes(q) ||
          o.municipality?.toLowerCase().includes(q)
        );
      }

      const formatted = filtered.map(org => ({
        ...org,
        followers_count: org.organization_followers?.length || 0,
        members_count: org.organization_members?.length || 0,
        image_url: org.logo_url || org.cover_url
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async getBySlug(slug: string): Promise<any> {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_members(*), organization_followers(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!data) return { data: null, error };

      const formatted = {
        ...data,
        followers_count: data.organization_followers?.length || 0,
        members_count: data.organization_members?.length || 0,
        image_url: data.logo_url || data.cover_url
      };
      return { data: wrapObject(formatted), error: null };
    },

    async getById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_members(*), organization_followers(*)')
        .eq('id', id)
        .maybeSingle();

      if (!data) return { data: null, error };

      const formatted = {
        ...data,
        followers_count: data.organization_followers?.length || 0,
        members_count: data.organization_members?.length || 0,
        image_url: data.logo_url || data.cover_url
      };
      return { data: wrapObject(formatted), error: null };
    },

    async create(payload: {
      name: string;
      category: string;
      description?: string;
      mission?: string;
      logo_url?: string;
      cover_url?: string;
      website?: string;
      email?: string;
      phone?: string;
      address?: string;
      province?: string;
      municipality?: string;
    }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Sessão expirada ou não autenticada. Por favor, inicie sessão.' } };

      const baseSlug = payload.name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'org';
      const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      let { data, error } = await supabase
        .from('organizations')
        .insert({
          name: payload.name.trim(),
          slug,
          category: payload.category,
          description: payload.description?.trim() || null,
          mission: payload.mission?.trim() || null,
          logo_url: payload.logo_url || null,
          cover_url: payload.cover_url || null,
          website: payload.website?.trim() || null,
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          address: payload.address?.trim() || null,
          province: payload.province || 'Luanda',
          municipality: payload.municipality || '',
          owner_id: user.id,
          verified: false,
          verification_status: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Initial insert to organizations failed, retrying without verification_status:', error);
        const retry = await supabase
          .from('organizations')
          .insert({
            name: payload.name.trim(),
            slug,
            category: payload.category,
            description: payload.description?.trim() || null,
            mission: payload.mission?.trim() || null,
            logo_url: payload.logo_url || null,
            cover_url: payload.cover_url || null,
            website: payload.website?.trim() || null,
            email: payload.email?.trim() || null,
            phone: payload.phone?.trim() || null,
            address: payload.address?.trim() || null,
            province: payload.province || 'Luanda',
            municipality: payload.municipality || '',
            owner_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        data = retry.data;
        error = retry.error;
      }

      if (data) {
        try {
          await supabase.from('organization_members').insert({
            organization_id: data.id,
            user_id: user.id,
            role: 'owner',
            joined_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Failed adding owner to organization_members:', e);
        }
      }

      return { data: wrapObject(data), error };
    },

    async update(id: string, payload: any): Promise<any> {
      const { error } = await supabase
        .from('organizations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id);
      return { success: !error, error };
    },

    async toggleFollow(orgId: string, isFollowing: boolean): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      if (isFollowing) {
        const { error } = await supabase.from('organization_followers').delete().match({
          organization_id: orgId,
          user_id: user.id
        });
        return { success: !error, error };
      } else {
        const { error } = await supabase.from('organization_followers').insert({
          organization_id: orgId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
        return { success: !error, error };
      }
    },

    async getMembers(orgId: string): Promise<any> {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId);

      if (error || !data) return { data: wrapArray([]), error };

      const userIds = data.map(m => m.user_id);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', userIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = data.map(m => ({
        ...m,
        profiles: profilesMap[m.user_id] || { id: m.user_id, full_name: 'Membro' }
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async addMember(orgId: string, userId: string, role = 'member'): Promise<any> {
      const { error } = await supabase.from('organization_members').upsert({
        organization_id: orgId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString()
      }, { onConflict: 'organization_id,user_id' });
      return { success: !error, error };
    },

    async updateMemberRole(orgId: string, userId: string, role: string): Promise<any> {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .match({ organization_id: orgId, user_id: userId });
      return { success: !error, error };
    },

    async removeMember(orgId: string, userId: string): Promise<any> {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .match({ organization_id: orgId, user_id: userId });
      return { success: !error, error };
    },

    async getPosts(orgId: string): Promise<any> {
      const { data, error } = await supabase
        .from('organization_posts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      return { data: wrapArray(data || []), error };
    },

    async createPost(orgId: string, payload: { title?: string; body: string; media_url?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('organization_posts')
        .insert({
          organization_id: orgId,
          author_id: user.id,
          title: payload.title?.trim() || null,
          body: payload.body.trim(),
          media_url: payload.media_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async getDocuments(orgId: string): Promise<any> {
      const { data, error } = await supabase
        .from('organization_documents')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      return { data: wrapArray(data || []), error };
    },

    async uploadDocument(orgId: string, payload: { title: string; category?: string; file_url: string; visibility?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('organization_documents')
        .insert({
          organization_id: orgId,
          uploader_id: user.id,
          title: payload.title.trim(),
          category: payload.category || 'Geral',
          file_url: payload.file_url,
          visibility: payload.visibility || 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async deleteDocument(docId: string): Promise<any> {
      const { error } = await supabase.from('organization_documents').delete().eq('id', docId);
      return { success: !error, error };
    },

    async requestVerification(orgId: string, payload: { details: string; proof_url?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('organization_verification_requests')
        .insert({
          organization_id: orgId,
          requester_id: user.id,
          details: payload.details.trim(),
          proof_url: payload.proof_url || null,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async listVerificationRequests(): Promise<any> {
      const { data, error } = await supabase
        .from('organization_verification_requests')
        .select('*, organizations(*)')
        .order('created_at', { ascending: false });
      return { data: wrapArray(data || []), error };
    },

    async reviewVerification(requestId: string, status: 'approved' | 'rejected', orgId: string): Promise<any> {
      const { error: reqErr } = await supabase
        .from('organization_verification_requests')
        .update({ status })
        .eq('id', requestId);

      if (reqErr) return { success: false, error: reqErr };

      if (status === 'approved') {
        await supabase
          .from('organizations')
          .update({ verified: true, verification_status: 'verified', updated_at: new Date().toISOString() })
          .eq('id', orgId);
      }
      return { success: true, error: null };
    },

    // Digital Library / Authors & Books
    async listBooks(filter?: { author_id?: string; genre?: string; search?: string }): Promise<any> {
      let query = supabase
        .from('author_books')
        .select('*, book_chapters(*), book_reviews(*)')
        .order('created_at', { ascending: false });

      if (filter?.author_id) {
        query = query.eq('author_id', filter.author_id);
      }
      if (filter?.genre && filter.genre !== 'all') {
        query = query.eq('genre', filter.genre);
      }

      const { data, error } = await query;
      if (error || !data) return { data: wrapArray([]), error };

      let filtered = data;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        filtered = data.filter(b => 
          b.title?.toLowerCase().includes(q) || 
          b.synopsis?.toLowerCase().includes(q)
        );
      }

      const authorIds = Array.from(new Set(filtered.map(b => b.author_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', authorIds);
        (profs || []).forEach(p => {
          profilesMap[p.user_id] = { ...p, id: p.user_id, full_name: p.display_name };
        });
      }

      const formatted = filtered.map(book => {
        const reviews = book.book_reviews || [];
        const avgRating = reviews.length > 0 ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length : 0;
        return {
          ...book,
          chapters_count: book.book_chapters?.length || 0,
          reviews_count: reviews.length,
          average_rating: parseFloat(avgRating.toFixed(1)),
          profiles: profilesMap[book.author_id] || { id: book.author_id, full_name: 'Autor Konecta' }
        };
      });

      return { data: wrapArray(formatted), error: null };
    },

    async getBookById(id: string): Promise<any> {
      const { data, error } = await supabase
        .from('author_books')
        .select('*, book_chapters(*), book_reviews(*)')
        .eq('id', id)
        .maybeSingle();

      if (!data) return { data: null, error };

      let profile = null;
      if (data.author_id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', data.author_id).maybeSingle();
        if (p) profile = { ...p, id: p.user_id, full_name: p.display_name };
      }

      const reviews = data.book_reviews || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length : 0;

      const formatted = {
        ...data,
        chapters_count: data.book_chapters?.length || 0,
        reviews_count: reviews.length,
        average_rating: parseFloat(avgRating.toFixed(1)),
        profiles: profile || { id: data.author_id, full_name: 'Autor Konecta' }
      };

      return { data: wrapObject(formatted), error: null };
    },

    async createBook(payload: {
      title: string;
      subtitle?: string;
      synopsis?: string;
      genre: string;
      language?: string;
      copyright_notice?: string;
      cover_url?: string;
    }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('author_books')
        .insert({
          author_id: user.id,
          title: payload.title.trim(),
          subtitle: payload.subtitle?.trim() || null,
          synopsis: payload.synopsis?.trim() || null,
          genre: payload.genre || 'Literatura',
          language: payload.language || 'Português',
          copyright_notice: payload.copyright_notice?.trim() || 'Todos os direitos reservados',
          cover_url: payload.cover_url || null,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async updateBook(id: string, payload: any): Promise<any> {
      const { error } = await supabase
        .from('author_books')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id);
      return { success: !error, error };
    },

    async deleteBook(id: string): Promise<any> {
      await supabase.from('book_chapters').delete().eq('book_id', id);
      await supabase.from('book_reviews').delete().eq('book_id', id);
      const { error } = await supabase.from('author_books').delete().eq('id', id);
      return { success: !error, error };
    },

    async createChapter(bookId: string, payload: { title: string; content: string; chapter_number?: number }): Promise<any> {
      const { data, error } = await supabase
        .from('book_chapters')
        .insert({
          book_id: bookId,
          title: payload.title.trim(),
          content: payload.content.trim(),
          chapter_number: payload.chapter_number || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return { data: wrapObject(data), error };
    },

    async updateChapter(chapterId: string, payload: any): Promise<any> {
      const { error } = await supabase
        .from('book_chapters')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', chapterId);
      return { success: !error, error };
    },

    async deleteChapter(chapterId: string): Promise<any> {
      const { error } = await supabase.from('book_chapters').delete().eq('id', chapterId);
      return { success: !error, error };
    },

    async addReview(bookId: string, rating: number, comment: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data, error } = await supabase
        .from('book_reviews')
        .upsert({
          book_id: bookId,
          user_id: user.id,
          rating,
          comment: comment.trim(),
          created_at: new Date().toISOString()
        }, { onConflict: 'book_id,user_id' })
        .select()
        .single();
      return { data: wrapObject(data), error };
    }
  },

  settings: {
    async get(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return { data: wrapObject(data || {}), error: null };
    },

    async update(payload: any): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { data: existing } = await supabase
        .from('user_settings')
        .select('privacy_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      const mergedPrivacy = {
        ...(existing?.privacy_settings || {}),
        ...(payload.privacy_settings || {})
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          privacy_settings: mergedPrivacy,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      return { success: !error, error };
    }
  },

  blocks: {
    async list(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id);

      if (error || !data || data.length === 0) return { data: wrapArray([]), error };

      const blockedUserIds = data.map(b => b.blocked_id);
      const { data: profs } = await supabase.from('profiles').select('*').in('user_id', blockedUserIds);

      let profMap: Record<string, any> = {};
      (profs || []).forEach(p => { profMap[p.user_id] = p; });

      const formatted = data.map(b => ({
        id: b.id,
        blocked_id: b.blocked_id,
        created_at: b.created_at,
        profiles: profMap[b.blocked_id] || { user_id: b.blocked_id, display_name: 'Utilizador Bloqueado' }
      }));

      return { data: wrapArray(formatted), error };
    },

    async blockUser(targetUserId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
          created_at: new Date().toISOString()
        });

      return { success: !error, error };
    },

    async unblockUser(targetUserId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .match({ blocker_id: user.id, blocked_id: targetUserId });

      return { success: !error, error };
    }
  },

  admin: {
    async getMetrics(): Promise<any> {
      const [usersCount, postsCount, commsCount, eventsCount, reportsCount] = await Promise.all([
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('communities').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true })
      ]);

      return {
        data: {
          users: usersCount.count || 0,
          ideas: postsCount.count || 0,
          projects: commsCount.count || 0,
          challenges: eventsCount.count || 0,
          communities: commsCount.count || 0,
          events: eventsCount.count || 0,
          reports: reportsCount.count || 0
        }
      };
    }
  }
};
