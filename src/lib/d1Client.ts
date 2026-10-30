/**
 * Cloudflare D1 Client Adapter for KONECTA
 * Database: konectaangola (ID: 9735a337-c6c3-416e-ab8a-c51ca4038b2e)
 * Worker Binding: env.DB
 */

const WORKER_BASE_URL = import.meta.env.VITE_D1_WORKER_URL || '';

function getToken(): string | null {
  try {
    return localStorage.getItem('konecta_d1_token');
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('konecta_d1_token', token);
    } else {
      localStorage.removeItem('konecta_d1_token');
    }
  } catch (e) {
    console.warn('Erro ao atualizar token D1:', e);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: any }> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = WORKER_BASE_URL ? `${WORKER_BASE_URL}${path}` : path;

  try {
    const res = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include' // Important for HttpOnly cookies
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return { data: null, error: json?.error || { status: res.status, message: `Erro HTTP ${res.status}` } };
    }
    return { data: json, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Falha na comunicação com o Cloudflare Worker/D1.' } };
  }
}

export const d1Client = {
  async checkHealth() {
    return request<{ status: string; database: string; d1_connected: boolean }>('/api/health');
  },

  auth: {
    async register(data: { email: string; password: string; full_name?: string; province?: string; municipality?: string }) {
      const res = await request<{ user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res.data?.token) {
        setToken(res.data.token);
      }
      return res;
    },

    async login(credentials: { email: string; password: string }) {
      const res = await request<{ user: any; profile: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.data?.token) {
        setToken(res.data.token);
      }
      return res;
    },

    async me() {
      return request<{ user: any; profile: any }>('/api/auth/me');
    },

    async logout() {
      await request('/api/auth/logout', { method: 'POST' });
      setToken(null);
    },

    getToken,
    setToken
  },

  profiles: {
    async list(limit = 12) {
      return request<{ data: any[] }>(`/api/profiles?limit=${limit}`);
    },
    async get(id: string) {
      return request<{ data: any }>(`/api/profiles/${id}`);
    },
    async update(id: string, updates: any) {
      return request<{ data: any }>(`/api/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    async getFollowers(id: string) {
      return request<{ data: any[] }>(`/api/profiles/${id}/followers`);
    },
    async getFollowing(id: string) {
      return request<{ data: any[] }>(`/api/profiles/${id}/following`);
    },
    async toggleFollow(id: string, isFollowing: boolean) {
      return request<{ success: boolean }>(`/api/profiles/${id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST'
      });
    }
  },

  posts: {
    async list(limit = 20, userId?: string) {
      const url = `/api/posts?limit=${limit}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`;
      return request<{ data: any[] }>(url);
    },
    async create(post: { content: string; image_url?: string }) {
      return request<{ data: any }>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(post)
      });
    },
    async delete(id: string) {
      return request<{ success: boolean }>(`/api/posts/${id}`, { method: 'DELETE' });
    },
    async getBookmarks() {
      return request<{ data: any[] }>('/api/bookmarks');
    },
    async toggleBookmark(id: string, isBookmarked: boolean) {
      return request<{ success: boolean }>(`/api/posts/${id}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST'
      });
    },
    async toggleLike(id: string, isLiked: boolean) {
      return request<{ success: boolean }>(`/api/posts/${id}/like`, {
        method: isLiked ? 'DELETE' : 'POST'
      });
    },
    async getComments(id: string) {
      return request<{ data: any[] }>(`/api/posts/${id}/comments`);
    },
    async addComment(id: string, content: string) {
      return request<{ data: any }>(`/api/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }
  },

  ideas: {
    async list(limit = 20, userId?: string) {
      const url = `/api/ideas?limit=${limit}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`;
      return request<{ data: any[] }>(url);
    },
    async create(idea: { title: string; description: string; category: string; province?: string; image_url?: string }) {
      return request<{ data: any }>('/api/ideas', {
        method: 'POST',
        body: JSON.stringify(idea)
      });
    },
    async delete(id: string) {
      return request<{ success: boolean }>(`/api/ideas/${id}`, { method: 'DELETE' });
    },
    async toggleVote(id: string, isVoted: boolean) {
      return request<{ success: boolean }>(`/api/ideas/${id}/vote`, {
        method: isVoted ? 'DELETE' : 'POST'
      });
    },
    async getComments(id: string) {
      return request<{ data: any[] }>(`/api/ideas/${id}/comments`);
    },
    async addComment(id: string, content: string) {
      return request<{ data: any }>(`/api/ideas/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }
  },
  challenges: {
    async list() {
      return request<{ data: any[] }>('/api/challenges');
    },
    async create(challenge: { title: string; description: string; category: string; goal?: string; deadline?: string; status?: string; user_id: string }) {
      return request<{ success: boolean; id: string }>('/api/challenges', {
        method: 'POST',
        body: JSON.stringify(challenge)
      });
    },
    async join(id: string) {
      return request<{ success: boolean }>(`/api/challenges/${id}/join`, {
        method: 'POST'
      });
    },
    async leave(id: string) {
      return request<{ success: boolean }>(`/api/challenges/${id}/join`, {
        method: 'DELETE'
      });
    }
  },
  projects: {
    async list(leaderId?: string) {
      const url = `/api/projects${leaderId ? `?leader_id=${encodeURIComponent(leaderId)}` : ''}`;
      return request<{ data: any[] }>(url);
    },
    async create(project: { title: string; description: string; category: string; province?: string; image_url?: string; leader_id: string }) {
      return request<{ success: boolean; id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(project)
      });
    },
    async getTasks(projectId: string) {
      return request<{ data: any[] }>(`/api/projects/${projectId}/tasks`);
    },
    async createTask(projectId: string, title: string) {
      return request<{ data: any }>(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title })
      });
    },
    async updateTask(taskId: string, updates: { status?: string; title?: string }) {
      return request<{ success: boolean }>(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    async getMilestones(projectId: string) {
      return request<{ data: any[] }>(`/api/projects/${projectId}/milestones`);
    },
    async createMilestone(projectId: string, data: { title: string; description?: string; due_date?: string }) {
      return request<{ data: any }>(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async updateMilestone(milestoneId: string, updates: { status?: string; title?: string; description?: string; due_date?: string }) {
      return request<{ success: boolean }>(`/api/milestones/${milestoneId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    async getMembers(projectId: string) {
      return request<{ data: any[] }>(`/api/projects/${projectId}/members`);
    },
    async join(projectId: string) {
      return request<{ success: boolean }>(`/api/projects/${projectId}/members`, {
        method: 'POST'
      });
    },
    async leave(projectId: string) {
      return request<{ success: boolean }>(`/api/projects/${projectId}/members`, {
        method: 'DELETE'
      });
    }
  },
  communities: {
    async list() {
      return request<{ data: any[] }>('/api/communities');
    },
    async create(community: { name: string; description: string; image_url?: string }) {
      return request<{ success: boolean; id: string }>('/api/communities', {
        method: 'POST',
        body: JSON.stringify(community)
      });
    },
    async join(id: string) {
      return request<{ success: boolean }>(`/api/communities/${id}/join`, {
        method: 'POST'
      });
    },
    async leave(id: string) {
      return request<{ success: boolean }>(`/api/communities/${id}/join`, {
        method: 'DELETE'
      });
    }
  },
  events: {
    async list() {
      return request<{ data: any[] }>('/api/events');
    },
    async create(event: { title: string; description: string; date: string; location: string; image_url?: string; organizer_id: string }) {
      return request<{ success: boolean; id: string }>('/api/events', {
        method: 'POST',
        body: JSON.stringify(event)
      });
    },
    async join(id: string) {
      return request<{ success: boolean }>(`/api/events/${id}/join`, {
        method: 'POST'
      });
    },
    async leave(id: string) {
      return request<{ success: boolean }>(`/api/events/${id}/join`, {
        method: 'DELETE'
      });
    }
  },
  messages: {
    async listConversations() {
      return request<{ data: any[] }>('/api/conversations');
    },
    async getMessages(conversationId: string) {
      return request<{ data: any[] }>(`/api/conversations/${conversationId}/messages`);
    },
    async sendMessage(conversationId: string, content: string) {
      return request<{ data: any }>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },
    async startConversation(targetUserId: string) {
      return request<{ data: any }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: targetUserId })
      });
    }
  },
  notifications: {
    async list() {
      return request<{ data: any[] }>('/api/notifications');
    },
    async markAllAsRead() {
      return request<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' });
    },
    async markAsRead(id: string) {
      return request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' });
    }
  },
  stats: {
    async get() {
      return request<{ data: { ideas: number; projects: number; challenges: number; events: number; bookmarks: number } }>('/api/stats');
    }
  },
  admin: {
    async getMetrics() {
      return request<{ data: any }>('/api/admin/metrics');
    }
  },
  reports: {
    async list() {
      return request<{ data: any[] }>('/api/reports');
    },
    async create(report: { target_type: string; target_id: string; reason: string; details?: string }) {
      return request<{ success: boolean; id: string }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify(report)
      });
    },
    async update(id: string, updates: { status: string }) {
      return request<{ success: boolean }>(`/api/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    }
  },
  search: {
    async global(query: string) {
      return request<{ data: { ideas: any[]; profiles: any[]; projects: any[]; communities: any[]; events: any[] } }>(`/api/search?q=${encodeURIComponent(query)}`);
    }
  },

  /**
   * Cloudflare R2 Upload
   */
  async uploadImage(file: File): Promise<{ url: string | null; error: any }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const headers = new Headers();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const url = WORKER_BASE_URL ? `${WORKER_BASE_URL}/api/upload` : '/api/upload';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { url: null, error: json?.error || { message: `Erro ${res.status} no upload para Cloudflare R2` } };
      }
      return { url: json.url, error: null };
    } catch (err: any) {
      return { url: null, error: { message: err?.message || 'Falha ao carregar imagem para o Cloudflare R2' } };
    }
  }
};

export const getOptimizedImageUrl = (url?: string, _options?: any): string => {
  return url || '';
};

export const getThumbnailUrl = (url?: string, _size?: number): string => {
  return url || '';
};

