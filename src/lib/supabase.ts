import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase configuration missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isGatewayOrNetworkError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  const msg = String(err.message || err.error_description || err || '').toLowerCase();
  return (
    status === 504 ||
    status === 502 ||
    status === 503 ||
    status === 0 ||
    msg.includes('504') ||
    msg.includes('gateway timeout') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('upstream')
  );
}

export function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST002' ||
    (typeof err.message === 'string' && (
      err.message.includes('schema cache') ||
      err.message.includes('PGRST002') ||
      err.message.includes('Could not query the database for the schema cache')
    ))
  );
}

export function getFriendlyErrorMessage(err: any, defaultMsg = 'Ocorreu um erro ao processar. Tente novamente.'): string {
  if (!err) return defaultMsg;
  if (isGatewayOrNetworkError(err)) {
    return 'Os servidores da base de dados estão temporariamente com alta latência ou inacessíveis (HTTP 504). Por favor, verifique a sua ligação e tente novamente.';
  }
  if (isSchemaCacheError(err)) {
    return 'A base de dados do Supabase está temporariamente a sincronizar o cache de esquemas (PGRST002). Por favor, tente novamente em instantes.';
  }
  return err.message || defaultMsg;
}

/**
 * Robust wrapper for Supabase calls to handle transient errors, network latency, and 504 Gateway Timeouts
 * with strict timeout protection and immediate fallback.
 */
export async function safeQuery<T>(queryFn: () => Promise<T> | any, retries = 1, timeoutMs = 3000): Promise<T> {
  let lastResult: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      const queryPromise = Promise.resolve(queryFn());
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
        setTimeout(() => resolve({ 
          data: null, 
          error: { status: 504, message: '504 Gateway Timeout (Servidor Supabase lento)' } 
        }), timeoutMs)
      );

      const res = await Promise.race([queryPromise, timeoutPromise]);
      lastResult = res;

      if (res && res.error) {
        // If it's a 504 Gateway Timeout or Network Error, do not hang with retries
        if (isGatewayOrNetworkError(res.error)) {
          console.warn('[Supabase] Resposta lenta/504 detectada. A utilizar dados em cache para manter a plataforma rápida.');
          return res as T;
        }

        if (isSchemaCacheError(res.error) && i < retries - 1) {
          console.warn(`[Supabase] Aviso de sincronização de esquema (PGRST002). Tentativa ${i + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, 400));
          continue;
        }
      }
      return res as T;
    } catch (err: any) {
      lastResult = { data: null, error: err };
      if (isGatewayOrNetworkError(err)) {
        console.warn('[Supabase] Erro de rede/504 interceptado:', err?.message || err);
        return lastResult as T;
      }
      if (isSchemaCacheError(err) && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
        continue;
      }
      return lastResult as T;
    }
  }
  return lastResult as T;
}

