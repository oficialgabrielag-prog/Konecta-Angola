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
        .select('*, post_media(*), post_comments(*), post_reactions(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('author_id', userId);
      }
      if (communityId) {
        query = query.eq('community_id', communityId);
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

      // 3. Fetch author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

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
        .select('*, reel_comments(*), reel_reactions(*), reel_saves(*)')
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
        profiles: profilesMap[r.author_id] || { id: r.author_id, full_name: 'Criador Konecta' }
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
    async list(): Promise<any> {
      const { data: eventRows, error } = await supabase
        .from('events')
        .select('*, event_attendees(*)')
        .order('starts_at', { ascending: true });

      if (error || !eventRows) return { data: wrapArray([]), error };

      const formatted = eventRows.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        date: ev.starts_at,
        location: 'Luanda / Híbrido',
        image_url: null,
        organizer_id: ev.organizer_id,
        participant_count: ev.event_attendees?.length || 0,
        created_at: ev.created_at
      }));

      return { data: wrapArray(formatted), error: null };
    },

    async create(data: { title: string; description: string; date?: string }): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Não autenticado' } };

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          title: data.title.trim(),
          description: data.description.trim(),
          starts_at: data.date || new Date().toISOString(),
          organizer_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data: wrapObject(newEvent), error };
    },

    async join(eventId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id
      });
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
    }
  },

  messages: {
    async listConversations(): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: wrapArray([]), error: null };

      const { data: memberRows } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const convIds = (memberRows || []).map(m => m.conversation_id);
      if (convIds.length === 0) return { data: wrapArray([]), error: null };

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*, conversation_members(*)')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      return { data: wrapArray(conversations || []), error: null };
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
        created_at: m.created_at
      }));

      return { data: wrapArray(formatted), error };
    },

    async sendMessage(convId: string, content: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          body: content.trim(),
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

    async startConversation(targetUserId: string): Promise<any> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      // 1. Create conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !newConv) return { data: null, error };

      // 2. Add members
      await supabase.from('conversation_members').insert([
        { conversation_id: newConv.id, user_id: user.id, joined_at: new Date().toISOString() },
        { conversation_id: newConv.id, user_id: targetUserId, joined_at: new Date().toISOString() }
      ]);

      return { data: wrapObject(newConv), error: null };
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
        read: false,
        created_at: n.created_at
      }));

      return { data: wrapArray(formatted), error };
    },

    async markAllAsRead(): Promise<any> {
      return { success: true };
    },

    async markAsRead(id: string): Promise<any> {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
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
