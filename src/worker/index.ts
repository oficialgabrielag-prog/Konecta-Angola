import { D1Database, R2Bucket } from './d1-types';

export interface Env {
  DB: D1Database;
  STORAGE?: R2Bucket;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

// Security: Password Hashing using Web Crypto (SubtleCrypto)
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

async function getSessionUser(request: Request, env: Env): Promise<{ id: string; email: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Try to get token from Cookie if not in Authorization header
  if (!token) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('konecta_session='));
    if (sessionCookie) {
      token = sessionCookie.split('=')[1];
    }
  }

  if (!token) return null;

  try {
    const session = await env.DB.prepare(
      'SELECT s.user_id, s.expires_at, u.id, u.email, u.role FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?'
    )
      .bind(token)
      .first<{ user_id: string; expires_at: string; id: string; email: string; role: string }>();

    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return null;
    }
    return { id: session.id, email: session.email, role: session.role };
  } catch (err) {
    console.error('Session lookup error:', err);
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Basic CSRF Protection: Verify Origin for mutation requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('Origin');
      // Ensure Origin is checked for cross-site requests
      if (!origin && request.headers.get('Sec-Fetch-Site') === 'cross-site') {
        return jsonResponse({ error: 'Pedido bloqueado por razões de segurança (CSRF).' }, 403, cors);
      }
    }

    try {
      // 1. HEALTH CHECK & D1 CONNECTION
      if (path === '/api/health') {
        const d1Test = await env.DB.prepare('SELECT 1 as connected').first<{ connected: number }>();
        return jsonResponse(
          {
            status: 'online',
            service: 'konecta-worker',
            database: 'konectaangola',
            database_id: '9735a337-c6c3-416e-ab8a-c51ca4038b2e',
            d1_connected: Boolean(d1Test?.connected === 1),
            r2_connected: Boolean(env.STORAGE),
            timestamp: new Date().toISOString()
          },
          200,
          cors
        );
      }

      // 1.1 R2 IMAGE UPLOAD (Cloudflare R2 Storage)
      if (path === '/api/upload' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('file') as File;
          if (!file) return jsonResponse({ error: 'Nenhum ficheiro fornecido.' }, 400, cors);

          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileKey = `img_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const mime = file.type || 'image/jpeg';

          if (env.STORAGE) {
            await env.STORAGE.put(fileKey, file.stream(), {
              httpMetadata: { contentType: mime }
            });
            return jsonResponse({
              url: `/api/images/${fileKey}`,
              key: fileKey,
              filename: file.name
            }, 201, cors);
          } else {
            // In-memory data URL fallback if R2 binding isn't mounted in environment
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            return jsonResponse({
              url: `data:${mime};base64,${base64}`,
              key: fileKey,
              filename: file.name
            }, 201, cors);
          }
        } else {
          return jsonResponse({ error: 'Formato multipart/form-data requerido.' }, 400, cors);
        }
      }

      // 1.2 R2 IMAGE SERVE
      if (path.startsWith('/api/images/') && request.method === 'GET') {
        const imageKey = path.replace('/api/images/', '');
        if (env.STORAGE) {
          const object = await env.STORAGE.get(imageKey);
          if (!object) {
            return new Response('Imagem não encontrada.', { status: 404, headers: cors });
          }
          const headers = new Headers(cors);
          headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          if (object.httpEtag) headers.set('ETag', object.httpEtag);
          return new Response(object.body, { headers });
        }
        return new Response('Serviço de imagens temporariamente indisponível.', { status: 503, headers: cors });
      }


      // 2. AUTH: REGISTER
      if (path === '/api/auth/register' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const fullName = String(body.full_name || body.fullName || '').trim();
        const province = String(body.province || 'Luanda').trim();
        const municipality = String(body.municipality || '').trim();

        if (!email || !password || password.length < 6) {
          return jsonResponse({ error: 'E-mail e palavra-passe (mínimo 6 caracteres) são obrigatórios.' }, 400, cors);
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) {
          return jsonResponse({ error: 'Este e-mail já está registado.' }, 409, cors);
        }

        const userId = crypto.randomUUID();
        const salt = crypto.randomUUID();
        const passwordHash = await hashPassword(password, salt);
        const createdAt = new Date().toISOString();

        // Transactional insert into users and profiles
        await env.DB.batch([
          env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, salt, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(userId, email, passwordHash, salt, 'member', createdAt, createdAt),
          env.DB.prepare(
            'INSERT INTO profiles (id, full_name, province, municipality, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(userId, fullName || email.split('@')[0], province, municipality, 'member', createdAt, createdAt)
        ]);

        // Create initial session
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare(
          'INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
        ).bind(sessionId, userId, expiresAt, createdAt).run();

        const cookie = `konecta_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;

        return jsonResponse(
          {
            user: {
              id: userId,
              email,
              user_metadata: { full_name: fullName, province, municipality }
            },
            token: sessionId,
            message: 'Registo realizado com sucesso.'
          },
          201,
          { ...cors, 'Set-Cookie': cookie }
        );
      }

      // 3. AUTH: LOGIN
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!email || !password) {
          return jsonResponse({ error: 'E-mail e palavra-passe são obrigatórios.' }, 400, cors);
        }

        const user = await env.DB.prepare(
          'SELECT id, email, password_hash, salt, role FROM users WHERE email = ?'
        ).bind(email).first<{ id: string; email: string; password_hash: string; salt: string; role: string }>();

        if (!user) {
          return jsonResponse({ error: 'E-mail ou palavra-passe incorretos.' }, 401, cors);
        }

        const computedHash = await hashPassword(password, user.salt);
        if (computedHash !== user.password_hash) {
          return jsonResponse({ error: 'E-mail ou palavra-passe incorretos.' }, 401, cors);
        }

        // Fetch profile
        const profile = await env.DB.prepare(
          'SELECT id, full_name, avatar_url, bio, province, municipality, role FROM profiles WHERE id = ?'
        ).bind(user.id).first();

        // Create new session
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare(
          'INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
        ).bind(sessionId, user.id, expiresAt, new Date().toISOString()).run();

        const cookie = `konecta_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;

        return jsonResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              user_metadata: profile || {}
            },
            profile,
            token: sessionId
          },
          200,
          { ...cors, 'Set-Cookie': cookie }
        );
      }

      // 4. AUTH: ME / SESSION VALIDATION
      if (path === '/api/auth/me' && request.method === 'GET') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) {
          return jsonResponse({ user: null }, 200, cors);
        }

        const profile = await env.DB.prepare(
          'SELECT id, full_name, avatar_url, bio, province, municipality, role, created_at FROM profiles WHERE id = ?'
        ).bind(currentUser.id).first();

        return jsonResponse(
          {
            user: {
              id: currentUser.id,
              email: currentUser.email,
              role: currentUser.role,
              user_metadata: profile || {}
            },
            profile
          },
          200,
          cors
        );
      }

      // 5. AUTH: LOGOUT
      if (path === '/api/auth/logout' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization') || '';
        let token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token) {
          const cookieHeader = request.headers.get('Cookie') || '';
          const cookies = cookieHeader.split(';').map(c => c.trim());
          const sessionCookie = cookies.find(c => c.startsWith('konecta_session='));
          if (sessionCookie) token = sessionCookie.split('=')[1];
        }

        if (token) {
          await env.DB.prepare('DELETE FROM user_sessions WHERE id = ?').bind(token).run();
        }

        const cookie = `konecta_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
        return jsonResponse({ message: 'Sessão terminada com sucesso.' }, 200, { ...cors, 'Set-Cookie': cookie });
      }

      // 6. PROFILES: FOLLOWERS & FOLLOWING
      if (path.startsWith('/api/profiles/') && path.endsWith('/followers') && request.method === 'GET') {
        const targetUserId = path.split('/')[3];
        const results = await env.DB.prepare(
          `SELECT f.*, pr.id as follower_id, pr.full_name, pr.avatar_url, pr.province
           FROM follows f
           JOIN profiles pr ON f.follower_id = pr.id
           WHERE f.following_id = ?`
        ).bind(targetUserId).all();
        return jsonResponse({ data: results.results || [] }, 200, cors);
      }

      if (path.startsWith('/api/profiles/') && path.endsWith('/following') && request.method === 'GET') {
        const targetUserId = path.split('/')[3];
        const results = await env.DB.prepare(
          `SELECT f.*, pr.id as following_id, pr.full_name, pr.avatar_url, pr.province
           FROM follows f
           JOIN profiles pr ON f.following_id = pr.id
           WHERE f.follower_id = ?`
        ).bind(targetUserId).all();
        return jsonResponse({ data: results.results || [] }, 200, cors);
      }

      if (path.startsWith('/api/profiles/') && path.endsWith('/follow')) {
        const targetUserId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const followId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)')
            .bind(followId, currentUser.id, targetUserId, new Date().toISOString()).run();
          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
            .bind(currentUser.id, targetUserId).run();
          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 6.1 PROFILES: GET or LIST
      if ((path === '/api/profiles' || path.startsWith('/api/profiles/')) && request.method === 'GET') {
        const profileId = path.startsWith('/api/profiles/') ? path.split('/')[3] : 'all';
        
        if (!profileId || profileId === 'all') {
          const limit = Number(url.searchParams.get('limit') || '12');
          const results = await env.DB.prepare('SELECT * FROM profiles ORDER BY created_at DESC LIMIT ?').bind(limit).all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        const profile = await env.DB.prepare(
          'SELECT id, full_name, avatar_url, bio, province, municipality, role, created_at FROM profiles WHERE id = ?'
        ).bind(profileId).first();

        if (!profile) {
          return jsonResponse({ error: 'Perfil não encontrado.' }, 404, cors);
        }
        return jsonResponse({ data: profile }, 200, cors);
      }

      // 7. PROFILES: UPDATE
      if (path.startsWith('/api/profiles/') && (request.method === 'PUT' || request.method === 'PATCH')) {
        const profileId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser || currentUser.id !== profileId) {
          return jsonResponse({ error: 'Não autorizado.' }, 403, cors);
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE profiles SET 
            full_name = COALESCE(?, full_name),
            avatar_url = COALESCE(?, avatar_url),
            bio = COALESCE(?, bio),
            province = COALESCE(?, province),
            municipality = COALESCE(?, municipality),
            updated_at = ?
           WHERE id = ?`
        ).bind(
          body.full_name ?? null,
          body.avatar_url ?? null,
          body.bio ?? null,
          body.province ?? null,
          body.municipality ?? null,
          now,
          profileId
        ).run();

        const updated = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profileId).first();
        return jsonResponse({ data: updated }, 200, cors);
      }

      // 7.1 BOOKMARKS: LIST
      if (path === '/api/bookmarks' && request.method === 'GET') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const results = await env.DB.prepare(
          `SELECT p.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
           FROM post_bookmarks b
           JOIN posts p ON b.post_id = p.id
           LEFT JOIN profiles pr ON p.user_id = pr.id
           WHERE b.user_id = ?
           ORDER BY b.created_at DESC`
        ).bind(currentUser.id).all();

        const formatted = (results.results || []).map((row: any) => ({
          id: row.id,
          content: row.content,
          image_url: row.image_url,
          user_id: row.user_id,
          likes_count: row.likes_count || 0,
          comments_count: row.comments_count || 0,
          created_at: row.created_at,
          profiles: {
            full_name: row.profile_full_name,
            avatar_url: row.profile_avatar_url,
            province: row.profile_province
          }
        }));
        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 8. POSTS: LIST
      if (path === '/api/posts' && request.method === 'GET') {
        const limit = Number(url.searchParams.get('limit') || '20');
        const userId = url.searchParams.get('user_id');
        let results;
        if (userId) {
          results = await env.DB.prepare(
            `SELECT p.id, p.content, p.image_url, p.user_id, p.likes_count, p.comments_count, p.created_at,
                    pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM posts p
             LEFT JOIN profiles pr ON p.user_id = pr.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC
             LIMIT ?`
          ).bind(userId, limit).all();
        } else {
          results = await env.DB.prepare(
            `SELECT p.id, p.content, p.image_url, p.user_id, p.likes_count, p.comments_count, p.created_at,
                    pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM posts p
             LEFT JOIN profiles pr ON p.user_id = pr.id
             ORDER BY p.created_at DESC
             LIMIT ?`
          ).bind(limit).all();
        }

        const formatted = (results.results || []).map((row: any) => ({
          id: row.id,
          content: row.content,
          image_url: row.image_url,
          user_id: row.user_id,
          likes_count: row.likes_count || 0,
          comments_count: row.comments_count || 0,
          created_at: row.created_at,
          profiles: {
            full_name: row.profile_full_name,
            avatar_url: row.profile_avatar_url,
            province: row.profile_province
          }
        }));

        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 9. POSTS: CREATE
      if (path === '/api/posts' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) {
          return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const content = String(body.content || '').trim();
        const imageUrl = body.image_url ? String(body.image_url).trim() : null;

        if (!content && !imageUrl) {
          return jsonResponse({ error: 'Conteúdo ou imagem é obrigatório.' }, 400, cors);
        }

        const postId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO posts (id, content, image_url, user_id, likes_count, comments_count, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)'
        ).bind(postId, content, imageUrl, currentUser.id, now).run();

        const newPost = await env.DB.prepare(
          `SELECT p.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
           FROM posts p LEFT JOIN profiles pr ON p.user_id = pr.id WHERE p.id = ?`
        ).bind(postId).first<any>();

        return jsonResponse({
          data: {
            ...newPost,
            profiles: {
              full_name: newPost?.profile_full_name,
              avatar_url: newPost?.profile_avatar_url,
              province: newPost?.profile_province
            }
          }
        }, 201, cors);
      }

      // 11. POSTS: LIKE
      if (path.startsWith('/api/posts/') && path.endsWith('/like')) {
        const postId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const likeId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)')
            .bind(likeId, postId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?')
            .bind(postId, postId).run();

          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')
            .bind(postId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?')
            .bind(postId, postId).run();

          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 12. POSTS: COMMENTS
      if (path.startsWith('/api/posts/') && path.endsWith('/comments')) {
        const postId = path.split('/')[3];

        if (request.method === 'GET') {
          const results = await env.DB.prepare(
            `SELECT c.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url 
             FROM comments c LEFT JOIN profiles pr ON c.user_id = pr.id 
             WHERE c.post_id = ? ORDER BY c.created_at ASC`
          ).bind(postId).all();

          const formatted = (results.results || []).map((row: any) => ({
            ...row,
            profiles: { full_name: row.profile_full_name, avatar_url: row.profile_avatar_url }
          }));

          return jsonResponse({ data: formatted }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const body = (await request.json().catch(() => ({}))) as any;
          const content = String(body.content || '').trim();
          if (!content) return jsonResponse({ error: 'Conteúdo do comentário é obrigatório.' }, 400, cors);

          const commentId = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.prepare('INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(commentId, postId, currentUser.id, content, now).run();

          await env.DB.prepare('UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?')
            .bind(postId, postId).run();

          const newComment = await env.DB.prepare(
            `SELECT c.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url 
             FROM comments c LEFT JOIN profiles pr ON c.user_id = pr.id WHERE c.id = ?`
          ).bind(commentId).first<any>();

          return jsonResponse({
            data: { ...newComment, profiles: { full_name: newComment?.profile_full_name, avatar_url: newComment?.profile_avatar_url } }
          }, 201, cors);
        }
      }

      // 12.1 POSTS: BOOKMARK
      if (path.startsWith('/api/posts/') && path.endsWith('/bookmark')) {
        const postId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const bookmarkId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO post_bookmarks (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)')
            .bind(bookmarkId, postId, currentUser.id, new Date().toISOString()).run();
          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?')
            .bind(postId, currentUser.id).run();
          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 12.2 POSTS: DELETE
      if (path.startsWith('/api/posts/') && request.method === 'DELETE') {
        const postId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        await env.DB.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?')
          .bind(postId, currentUser.id).run();
        return jsonResponse({ success: true }, 200, cors);
      }


      // 10. IDEAS: LIST
      if (path === '/api/ideas' && request.method === 'GET') {
        const limit = Number(url.searchParams.get('limit') || '20');
        const userId = url.searchParams.get('user_id');
        let results;
        if (userId) {
          results = await env.DB.prepare(
            `SELECT i.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM ideas i
             LEFT JOIN profiles pr ON i.user_id = pr.id
             WHERE i.user_id = ?
             ORDER BY i.created_at DESC
             LIMIT ?`
          ).bind(userId, limit).all();
        } else {
          results = await env.DB.prepare(
            `SELECT i.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM ideas i
             LEFT JOIN profiles pr ON i.user_id = pr.id
             ORDER BY i.created_at DESC
             LIMIT ?`
          ).bind(limit).all();
        }

        const formatted = (results.results || []).map((row: any) => ({
          ...row,
          profiles: {
            full_name: row.profile_full_name,
            avatar_url: row.profile_avatar_url,
            province: row.profile_province
          }
        }));

        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 10.1 IDEAS: CREATE
      if (path === '/api/ideas' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const category = String(body.category || 'General').trim();
        const province = String(body.province || 'Angola').trim();
        const imageUrl = body.image_url ? String(body.image_url).trim() : null;

        if (!title || !description) return jsonResponse({ error: 'Título e descrição são obrigatórios.' }, 400, cors);

        const ideaId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO ideas (id, title, description, category, province, image_url, user_id, votes_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'
        ).bind(ideaId, title, description, category, province, imageUrl, currentUser.id, now, now).run();

        const newIdea = await env.DB.prepare(
          `SELECT i.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url FROM ideas i LEFT JOIN profiles pr ON i.user_id = pr.id WHERE i.id = ?`
        ).bind(ideaId).first<any>();

        return jsonResponse({ data: { ...newIdea, profiles: { full_name: newIdea?.profile_full_name, avatar_url: newIdea?.profile_avatar_url } } }, 201, cors);
      }

      // 10.2 IDEAS: VOTE
      if (path.startsWith('/api/ideas/') && path.endsWith('/vote')) {
        const ideaId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const voteId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO idea_votes (id, idea_id, user_id) VALUES (?, ?, ?)')
            .bind(voteId, ideaId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE ideas SET votes_count = (SELECT COUNT(*) FROM idea_votes WHERE idea_id = ?) WHERE id = ?')
            .bind(ideaId, ideaId).run();

          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM idea_votes WHERE idea_id = ? AND user_id = ?')
            .bind(ideaId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE ideas SET votes_count = (SELECT COUNT(*) FROM idea_votes WHERE idea_id = ?) WHERE id = ?')
            .bind(ideaId, ideaId).run();

          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 10.3 IDEAS: DELETE
      if (path.startsWith('/api/ideas/') && request.method === 'DELETE') {
        const ideaId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        await env.DB.prepare('DELETE FROM ideas WHERE id = ? AND (user_id = ? OR ? = "admin")')
          .bind(ideaId, currentUser.id, currentUser.role).run();
        return jsonResponse({ success: true }, 200, cors);
      }

      // 10.4 IDEAS: COMMENTS
      if (path.startsWith('/api/ideas/') && path.endsWith('/comments')) {
        const ideaId = path.split('/')[3];

        if (request.method === 'GET') {
          const results = await env.DB.prepare(
            `SELECT c.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM comments c LEFT JOIN profiles pr ON c.user_id = pr.id
             WHERE c.idea_id = ? ORDER BY c.created_at ASC`
          ).bind(ideaId).all();

          const formatted = (results.results || []).map((row: any) => ({
            ...row,
            profiles: { full_name: row.profile_full_name, avatar_url: row.profile_avatar_url, province: row.profile_province }
          }));
          return jsonResponse({ data: formatted }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const body = (await request.json().catch(() => ({}))) as any;
          const content = String(body.content || '').trim();
          if (!content) return jsonResponse({ error: 'Conteúdo obrigatório.' }, 400, cors);

          const commentId = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.prepare('INSERT INTO comments (id, idea_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(commentId, ideaId, currentUser.id, content, now).run();

          const newComment = await env.DB.prepare(
            `SELECT c.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url, pr.province as profile_province
             FROM comments c LEFT JOIN profiles pr ON c.user_id = pr.id WHERE c.id = ?`
          ).bind(commentId).first<any>();

          return jsonResponse({
            data: { ...newComment, profiles: { full_name: newComment?.profile_full_name, avatar_url: newComment?.profile_avatar_url, province: newComment?.profile_province } }
          }, 201, cors);
        }
      }


      // 14. CHALLENGES: LIST
      if (path === '/api/challenges' && request.method === 'GET') {
        const results = await env.DB.prepare(
          `SELECT c.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url
           FROM challenges c LEFT JOIN profiles pr ON c.user_id = pr.id
           ORDER BY c.created_at DESC`
        ).all();
        const formatted = (results.results || []).map((row: any) => ({
          ...row,
          profiles: { full_name: row.profile_full_name, avatar_url: row.profile_avatar_url }
        }));
        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 14.1 CHALLENGES: JOIN / LEAVE
      if (path.startsWith('/api/challenges/') && path.endsWith('/join')) {
        const challengeId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const joinId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO challenge_participants (id, challenge_id, user_id) VALUES (?, ?, ?)')
            .bind(joinId, challengeId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE challenges SET participants_count = (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = ?) WHERE id = ?')
            .bind(challengeId, challengeId).run();

          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM challenge_participants WHERE challenge_id = ? AND user_id = ?')
            .bind(challengeId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE challenges SET participants_count = (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = ?) WHERE id = ?')
            .bind(challengeId, challengeId).run();

          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 14.2 CHALLENGES: CREATE
      if (path === '/api/challenges' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const category = String(body.category || 'General').trim();
        const goal = body.goal ? String(body.goal).trim() : null;
        const deadline = body.deadline ? String(body.deadline).trim() : null;

        if (!title || !description) return jsonResponse({ error: 'Título e descrição são obrigatórios.' }, 400, cors);

        const challengeId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO challenges (id, title, description, category, goal, deadline, status, user_id, participants_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
        ).bind(challengeId, title, description, category, goal, deadline, 'open', currentUser.id, now).run();

        return jsonResponse({ success: true, id: challengeId }, 201, cors);
      }

      // 15. PROJECTS: LIST
      if (path === '/api/projects' && request.method === 'GET') {
        const leaderId = url.searchParams.get('leader_id') || url.searchParams.get('user_id');
        let results;
        if (leaderId) {
          results = await env.DB.prepare(
            `SELECT p.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url
             FROM projects p LEFT JOIN profiles pr ON p.leader_id = pr.id
             WHERE p.leader_id = ?
             ORDER BY p.created_at DESC`
          ).bind(leaderId).all();
        } else {
          results = await env.DB.prepare(
            `SELECT p.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url
             FROM projects p LEFT JOIN profiles pr ON p.leader_id = pr.id
             ORDER BY p.created_at DESC`
          ).all();
        }
        const formatted = (results.results || []).map((row: any) => ({
          ...row,
          profiles: { full_name: row.profile_full_name, avatar_url: row.profile_avatar_url }
        }));
        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 15.1 PROJECTS: CREATE
      if (path === '/api/projects' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const category = String(body.category || 'General').trim();
        const province = String(body.province || 'Angola').trim();
        const imageUrl = body.image_url ? String(body.image_url).trim() : null;

        if (!title || !description) return jsonResponse({ error: 'Título e descrição são obrigatórios.' }, 400, cors);

        const projectId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO projects (id, title, description, status, category, province, image_url, leader_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(projectId, title, description, 'planning', category, province, imageUrl, currentUser.id, now).run();

        return jsonResponse({ success: true, id: projectId }, 201, cors);
      }

      // 15.2 PROJECTS: TASKS
      if (path.startsWith('/api/projects/') && path.endsWith('/tasks')) {
        const projectId = path.split('/')[3];

        if (request.method === 'GET') {
          const results = await env.DB.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').bind(projectId).all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const body = (await request.json().catch(() => ({}))) as any;
          const title = String(body.title || '').trim();
          if (!title) return jsonResponse({ error: 'Título da tarefa é obrigatório.' }, 400, cors);

          const taskId = crypto.randomUUID();
          await env.DB.prepare('INSERT INTO tasks (id, project_id, title, status, assignee_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(taskId, projectId, title, 'todo', currentUser.id, new Date().toISOString()).run();
          
          const newTask = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
          return jsonResponse({ data: newTask }, 201, cors);
        }
      }

      if (path.startsWith('/api/tasks/') && (request.method === 'PUT' || request.method === 'PATCH')) {
        const taskId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        await env.DB.prepare('UPDATE tasks SET status = COALESCE(?, status), title = COALESCE(?, title) WHERE id = ?')
          .bind(body.status ?? null, body.title ?? null, taskId).run();
        
        return jsonResponse({ success: true }, 200, cors);
      }

      // 15.3 PROJECTS: MILESTONES
      if (path.startsWith('/api/projects/') && path.endsWith('/milestones')) {
        const projectId = path.split('/')[3];

        if (request.method === 'GET') {
          const results = await env.DB.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC').bind(projectId).all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const body = (await request.json().catch(() => ({}))) as any;
          const title = String(body.title || '').trim();
          if (!title) return jsonResponse({ error: 'Título do marco é obrigatório.' }, 400, cors);

          const milestoneId = crypto.randomUUID();
          await env.DB.prepare('INSERT INTO milestones (id, project_id, title, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(milestoneId, projectId, title, body.description || null, body.due_date || null, 'pending', new Date().toISOString()).run();
          
          const newMilestone = await env.DB.prepare('SELECT * FROM milestones WHERE id = ?').bind(milestoneId).first();
          return jsonResponse({ data: newMilestone }, 201, cors);
        }
      }

      if (path.startsWith('/api/milestones/') && (request.method === 'PUT' || request.method === 'PATCH')) {
        const milestoneId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        await env.DB.prepare('UPDATE milestones SET status = COALESCE(?, status), title = COALESCE(?, title), description = COALESCE(?, description), due_date = COALESCE(?, due_date) WHERE id = ?')
          .bind(body.status ?? null, body.title ?? null, body.description ?? null, body.due_date ?? null, milestoneId).run();
        
        return jsonResponse({ success: true }, 200, cors);
      }

      // 15.4 PROJECTS: MEMBERS
      if (path.startsWith('/api/projects/') && path.endsWith('/members')) {
        const projectId = path.split('/')[3];

        if (request.method === 'GET') {
          const results = await env.DB.prepare(
            `SELECT pm.*, pr.full_name, pr.avatar_url, pr.province 
             FROM project_members pm JOIN profiles pr ON pm.user_id = pr.id 
             WHERE pm.project_id = ?`
          ).bind(projectId).all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const memberId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)')
            .bind(memberId, projectId, currentUser.id, 'Colaborador', new Date().toISOString()).run();
          
          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          await env.DB.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
            .bind(projectId, currentUser.id).run();
          
          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 16. COMMUNITIES: LIST
      if (path === '/api/communities' && request.method === 'GET') {
        const results = await env.DB.prepare('SELECT * FROM communities ORDER BY member_count DESC').all();
        return jsonResponse({ data: results.results || [] }, 200, cors);
      }

      // 16.1 COMMUNITIES: CREATE
      if (path === '/api/communities' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        const name = String(body.name || '').trim();
        const description = String(body.description || '').trim();
        const imageUrl = body.image_url ? String(body.image_url).trim() : null;

        if (!name || !description) return jsonResponse({ error: 'Nome e descrição são obrigatórios.' }, 400, cors);

        const communityId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO communities (id, name, description, image_url, member_count, created_at) VALUES (?, ?, ?, ?, 0, ?)'
        ).bind(communityId, name, description, imageUrl, now).run();

        return jsonResponse({ success: true, id: communityId }, 201, cors);
      }

      // 16.2 COMMUNITIES: JOIN / LEAVE
      if (path.startsWith('/api/communities/') && path.endsWith('/join')) {
        const communityId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const memberId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO community_members (id, community_id, user_id) VALUES (?, ?, ?)')
            .bind(memberId, communityId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?) WHERE id = ?')
            .bind(communityId, communityId).run();

          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM community_members WHERE community_id = ? AND user_id = ?')
            .bind(communityId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?) WHERE id = ?')
            .bind(communityId, communityId).run();

          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 18. EVENTS: LIST
      if (path === '/api/events' && request.method === 'GET') {
        const results = await env.DB.prepare(
          `SELECT e.*, pr.full_name as profile_full_name, pr.avatar_url as profile_avatar_url
           FROM events e LEFT JOIN profiles pr ON e.organizer_id = pr.id
           ORDER BY e.date ASC`
        ).all();
        const formatted = (results.results || []).map((row: any) => ({
          ...row,
          profiles: { full_name: row.profile_full_name, avatar_url: row.profile_avatar_url }
        }));
        return jsonResponse({ data: formatted }, 200, cors);
      }

      // 18.1 EVENTS: CREATE
      if (path === '/api/events' && request.method === 'POST') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const body = (await request.json().catch(() => ({}))) as any;
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const date = String(body.date || '').trim();
        const location = String(body.location || '').trim();
        const imageUrl = body.image_url ? String(body.image_url).trim() : null;

        if (!title || !description || !date || !location) return jsonResponse({ error: 'Todos os campos são obrigatórios.' }, 400, cors);

        const eventId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO events (id, title, description, date, location, image_url, organizer_id, participant_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
        ).bind(eventId, title, description, date, location, imageUrl, currentUser.id, now).run();

        return jsonResponse({ success: true, id: eventId }, 201, cors);
      }

      // 18.2 EVENTS: JOIN / LEAVE
      if (path.startsWith('/api/events/') && path.endsWith('/join')) {
        const eventId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'POST') {
          const participantId = crypto.randomUUID();
          await env.DB.prepare('INSERT OR IGNORE INTO event_participants (id, event_id, user_id) VALUES (?, ?, ?)')
            .bind(participantId, eventId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_participants WHERE event_id = ?) WHERE id = ?')
            .bind(eventId, eventId).run();

          return jsonResponse({ success: true }, 200, cors);
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?')
            .bind(eventId, currentUser.id).run();
          
          await env.DB.prepare('UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_participants WHERE event_id = ?) WHERE id = ?')
            .bind(eventId, eventId).run();

          return jsonResponse({ success: true }, 200, cors);
        }
      }

      // 11. CONVERSATIONS & MESSAGES
      if (path === '/api/conversations') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        if (request.method === 'GET') {
          const results = await env.DB.prepare(
            `SELECT c.*, 
                    (SELECT json_group_array(json_object('id', pr.id, 'full_name', pr.full_name, 'avatar_url', pr.avatar_url, 'province', pr.province))
                     FROM conversation_members cm 
                     JOIN profiles pr ON cm.user_id = pr.id 
                     WHERE cm.conversation_id = c.id) as participants
             FROM conversations c
             JOIN conversation_members cm2 ON c.id = cm2.conversation_id
             WHERE cm2.user_id = ?
             ORDER BY c.last_message_at DESC`
          ).bind(currentUser.id).all();

          const formatted = (results.results || []).map((row: any) => ({
            ...row,
            participants: JSON.parse(row.participants || '[]')
          }));

          return jsonResponse({ data: formatted }, 200, cors);
        }

        if (request.method === 'POST') {
          const body = (await request.json().catch(() => ({}))) as any;
          const targetUserId = body.target_user_id;
          if (!targetUserId) return jsonResponse({ error: 'ID do destinatário é obrigatório.' }, 400, cors);

          // Check for existing conversation between these two
          const existing = await env.DB.prepare(
            `SELECT conversation_id FROM conversation_members 
             WHERE user_id = ? AND conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = ?)`
          ).bind(currentUser.id, targetUserId).first<{ conversation_id: string }>();

          if (existing) {
            const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(existing.conversation_id).first();
            return jsonResponse({ data: conv }, 200, cors);
          }

          const convId = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.batch([
            env.DB.prepare('INSERT INTO conversations (id, last_message, last_message_at, created_at) VALUES (?, ?, ?, ?)')
              .bind(convId, 'Conversa iniciada', now, now),
            env.DB.prepare('INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, ?)')
              .bind(crypto.randomUUID(), convId, currentUser.id),
            env.DB.prepare('INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, ?)')
              .bind(crypto.randomUUID(), convId, targetUserId)
          ]);

          const newConv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(convId).first();
          return jsonResponse({ data: newConv }, 201, cors);
        }
      }

      if (path.startsWith('/api/conversations/') && path.endsWith('/messages')) {
        const convId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        // Verify membership
        const membership = await env.DB.prepare('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
          .bind(convId, currentUser.id).first();
        if (!membership) return jsonResponse({ error: 'Não autorizado.' }, 403, cors);

        if (request.method === 'GET') {
          const results = await env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
            .bind(convId).all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        if (request.method === 'POST') {
          const body = (await request.json().catch(() => ({}))) as any;
          const content = String(body.content || '').trim();
          if (!content) return jsonResponse({ error: 'Conteúdo da mensagem é obrigatório.' }, 400, cors);

          const msgId = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.batch([
            env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
              .bind(msgId, convId, currentUser.id, content, now),
            env.DB.prepare('UPDATE conversations SET last_message = ?, last_message_at = ? WHERE id = ?')
              .bind(content, now, convId)
          ]);

          const newMsg = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(msgId).first();
          return jsonResponse({ data: newMsg }, 201, cors);
        }
      }

      // 20. STATS: DASHBOARD
      if (path === '/api/stats' && request.method === 'GET') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const [ideas, projects, challenges, events, bookmarks] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM ideas WHERE user_id = ?').bind(currentUser.id).first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM projects WHERE leader_id = ?').bind(currentUser.id).first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM challenge_participants WHERE user_id = ?').bind(currentUser.id).first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM event_participants WHERE user_id = ?').bind(currentUser.id).first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM post_bookmarks WHERE user_id = ?').bind(currentUser.id).first<{ count: number }>()
        ]);

        return jsonResponse({
          data: {
            ideas: ideas?.count || 0,
            projects: projects?.count || 0,
            challenges: challenges?.count || 0,
            events: events?.count || 0,
            bookmarks: bookmarks?.count || 0
          }
        }, 200, cors);
      }

      // 17. NOTIFICATIONS: LIST
      if (path === '/api/notifications' && request.method === 'GET') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        const results = await env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
          .bind(currentUser.id).all();
        return jsonResponse({ data: results.results || [] }, 200, cors);
      }

      // 17.1 NOTIFICATIONS: MARK ALL AS READ
      if (path === '/api/notifications/read-all' && (request.method === 'PUT' || request.method === 'POST')) {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        await env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(currentUser.id).run();
        return jsonResponse({ success: true }, 200, cors);
      }

      // 17.2 NOTIFICATIONS: MARK SINGLE AS READ
      if (path.startsWith('/api/notifications/') && path.endsWith('/read') && (request.method === 'PUT' || request.method === 'POST')) {
        const notifId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

        await env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').bind(notifId, currentUser.id).run();
        return jsonResponse({ success: true }, 200, cors);
      }

      // 21. REPORTS: MODERATION
      if (path === '/api/reports') {
        if (request.method === 'GET') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser || currentUser.role !== 'admin') {
            return jsonResponse({ error: 'Acesso restrito.' }, 403, cors);
          }
          const results = await env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').all();
          return jsonResponse({ data: results.results || [] }, 200, cors);
        }

        if (request.method === 'POST') {
          const currentUser = await getSessionUser(request, env);
          if (!currentUser) return jsonResponse({ error: 'Autenticação necessária.' }, 401, cors);

          const body = (await request.json().catch(() => ({}))) as any;
          const reportId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(reportId, currentUser.id, body.target_type || 'post', body.target_id, body.reason, 'pending', new Date().toISOString()).run();

          return jsonResponse({ success: true, id: reportId }, 201, cors);
        }
      }

      if (path.startsWith('/api/reports/') && (request.method === 'PUT' || request.method === 'PATCH')) {
        const reportId = path.split('/')[3];
        const currentUser = await getSessionUser(request, env);
        if (!currentUser || currentUser.role !== 'admin') {
          return jsonResponse({ error: 'Acesso restrito.' }, 403, cors);
        }

        const body = (await request.json().catch(() => ({}))) as any;
        await env.DB.prepare('UPDATE reports SET status = ? WHERE id = ?').bind(body.status || 'reviewed', reportId).run();
        return jsonResponse({ success: true }, 200, cors);
      }

      // 22. ADMIN METRICS
      if (path === '/api/admin/metrics' && request.method === 'GET') {
        const currentUser = await getSessionUser(request, env);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.email !== 'oficialgabrielag@gmail.com')) {
          return jsonResponse({ error: 'Acesso restrito.' }, 403, cors);
        }

        const [users, ideas, projects, challenges, communities, events, reports] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM ideas').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM challenges').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM communities').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM events').first<{ count: number }>(),
          env.DB.prepare('SELECT COUNT(*) as count FROM reports WHERE status = "pending"').first<{ count: number }>()
        ]);

        return jsonResponse({
          data: {
            users: users?.count || 0,
            ideas: ideas?.count || 0,
            projects: projects?.count || 0,
            challenges: challenges?.count || 0,
            communities: communities?.count || 0,
            events: events?.count || 0,
            reports: reports?.count || 0
          }
        }, 200, cors);
      }


      // 19. SEARCH: GLOBAL
      if (path === '/api/search' && request.method === 'GET') {
        const query = (url.searchParams.get('q') || '').trim().toLowerCase();
        if (query.length < 2) return jsonResponse({ data: { ideas: [], profiles: [], projects: [], communities: [], events: [] } }, 200, cors);

        const searchTerm = `%${query}%`;

        const [ideas, profiles, projects, communities, events] = await Promise.all([
          env.DB.prepare('SELECT * FROM ideas WHERE title LIKE ? OR description LIKE ? LIMIT 10').bind(searchTerm, searchTerm).all(),
          env.DB.prepare('SELECT * FROM profiles WHERE full_name LIKE ? OR bio LIKE ? LIMIT 10').bind(searchTerm, searchTerm).all(),
          env.DB.prepare('SELECT * FROM projects WHERE title LIKE ? OR description LIKE ? LIMIT 10').bind(searchTerm, searchTerm).all(),
          env.DB.prepare('SELECT * FROM communities WHERE name LIKE ? OR description LIKE ? LIMIT 10').bind(searchTerm, searchTerm).all(),
          env.DB.prepare('SELECT * FROM events WHERE title LIKE ? OR description LIKE ? LIMIT 10').bind(searchTerm, searchTerm).all(),
        ]);

        return jsonResponse({
          data: {
            ideas: ideas.results || [],
            profiles: profiles.results || [],
            projects: projects.results || [],
            communities: communities.results || [],
            events: events.results || []
          }
        }, 200, cors);
      }

      // 404 FOR UNRECOGNIZED API ROUTES
      return jsonResponse({ error: 'Endpoint não encontrado.', path }, 404, cors);

    } catch (err: any) {
      console.error('Worker internal error:', err);
      return jsonResponse(
        { error: 'Erro interno do servidor no Cloudflare Worker.', details: err?.message || String(err) },
        500,
        cors
      );
    }
  }
};
