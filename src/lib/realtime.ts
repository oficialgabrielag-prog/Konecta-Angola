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

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase Realtime] Conectado e ativo para tabelas públicas.');
      }
    });

    this.isSubscribed = true;
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
