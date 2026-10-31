import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rrczdshxyuamtomuswmv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY3pkc2h4eXVhbXRvbXVzd212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjkzODEsImV4cCI6MjEwODk0NTM4MX0.kNAHRVs4J5Z43ehGfutE6C9J0DmFzleoOxS2bi3ItCw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
