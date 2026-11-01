import { supabase } from './supabaseClient';

export type RealtimeCallback = (payload: any) => void;

/**
 * Supabase Realtime Service for KONECTA
 * Listens to postgres_changes on core public tables:
 * profiles, posts, post_media, post_comments, post_reactions, communities, community_members, messages, notifications
 */
export class KonectaRealtimeService {
  private static channel = supabase.channel('konecta_realtime_channel');
  private static listeners: Map<string, Set<RealtimeCallback>> = new Map();
  private static isSubscribed = false;
  private static retryCount = 0;
  private static reconnectTimer: any = null;

  public static init() {
    if (this.isSubscribed) return;

    const tables = [
      'posts',
      'post_media',
      'post_comments',
      'post_reactions',
      'communities',
      'community_members',
      'community_announcements',
      'community_rules',
      'projects',
      'project_members',
      'project_updates',
      'project_tasks',
      'project_milestones',
      'project_comments',
      'ideas',
      'idea_votes',
      'idea_comments',
      'idea_collaborators',
      'reels',
      'reel_reactions',
      'reel_comments',
      'messages',
      'notifications',
      'profiles'
    ];

    tables.forEach((table) => {
      this.channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          this.notify(table, payload);
        }
      );
    });

    this.channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase Realtime] Conectado e ativo para tabelas públicas.');
        this.retryCount = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[Supabase Realtime Erro] Estado do canal: ${status}`, err || 'Falha na ligação do servidor de tempo real.');
        this.scheduleReconnect();
      }
    });

    this.isSubscribed = true;
  }

  private static scheduleReconnect() {
    this.isSubscribed = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // 2s, 4s, 8s, 16s, max 30s
    console.log(`[Supabase Realtime] Reagendando subscrição em ${delay / 1000}s (tentativa ${this.retryCount})...`);

    this.reconnectTimer = setTimeout(() => {
      try {
        supabase.removeChannel(this.channel);
      } catch (e) {}
      this.channel = supabase.channel(`konecta_realtime_channel_${Date.now()}`);
      this.init();
    }, delay);
  }

  public static subscribe(table: string, callback: RealtimeCallback): () => void {
    this.init();
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);

    return () => {
      this.listeners.get(table)?.delete(callback);
    };
  }

  private static notify(table: string, payload: any) {
    const tableListeners = this.listeners.get(table);
    if (tableListeners) {
      tableListeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (e) {
          console.warn(`[Realtime Callback Error: ${table}]`, e);
        }
      });
    }
  }
}
