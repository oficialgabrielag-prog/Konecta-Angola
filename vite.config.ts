import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function diditApiPlugin() {
  const DIDIT_APP_ID = 'fd452321-eb1f-4413-b328-13e4c26a7571';
  const DIDIT_BI_WORKFLOW_ID = '2ff17dd6-e06d-4176-b0d0-36933fd33594';
  const DIDIT_BI_LINK = 'https://verify.didit.me/u/L_F91uBtQXaw0DaTP9M1lA';
  const DIDIT_ORG_WORKFLOW_ID = '6e57bec1-d247-4af6-88be-155edef5cac0';
  const DIDIT_ORG_LINK = 'https://verify.didit.me/u/ble-wdJHSvaIvhVe3vXKwA';

  return {
    name: 'didit-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/didit')) return next();

        res.setHeader('Content-Type', 'application/json');

        if (req.url.startsWith('/api/didit/config')) {
          return res.end(JSON.stringify({
            appId: DIDIT_APP_ID,
            workflows: {
              individual: { id: DIDIT_BI_WORKFLOW_ID, link: DIDIT_BI_LINK, priceKz: 5000 },
              organization: { id: DIDIT_ORG_WORKFLOW_ID, link: DIDIT_ORG_LINK, priceKz: 10000 }
            }
          }));
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          let parsed: any = {};
          try { parsed = JSON.parse(body || '{}'); } catch {}

          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL || 'https://rrczdshxyuamtomuswmv.supabase.co',
            process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY3pkc2h4eXVhbXRvbXVzd212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjkzODEsImV4cCI6MjEwODk0NTM4MX0.kNAHRVs4J5Z43ehGfutE6C9J0DmFzleoOxS2bi3ItCw'
          );

          if (req.url.startsWith('/api/didit/create-session')) {
            const { targetType, targetId, userId, fullName, nifOrBi, requestId: clientReqId } = parsed;
            const rawUuid = crypto.randomUUID();
            const sessionId = `didit_sess_${rawUuid}`;
            const workflowId = targetType === 'organization' ? DIDIT_ORG_WORKFLOW_ID : DIDIT_BI_WORKFLOW_ID;
            const baseLink = targetType === 'organization' ? DIDIT_ORG_LINK : DIDIT_BI_LINK;
            const verificationUrl = `${baseLink}?vendor_data=${encodeURIComponent(targetId || '')}&user_id=${encodeURIComponent(userId || '')}&session_id=${sessionId}&app_id=${DIDIT_APP_ID}`;
            const priceKz = targetType === 'organization' ? 10000 : 5000;
            const now = new Date().toISOString();
            const safeUuid = clientReqId || rawUuid;

            if (targetType === 'profile') {
              try {
                const { data } = await supabase
                  .from('profile_verification_requests')
                  .insert({
                    user_id: userId,
                    status: 'payment_pending',
                    price_amount: priceKz,
                    currency: 'Kz',
                    duration_days: 30,
                    explanation: fullName || 'Membro Konecta',
                    evidence_url: JSON.stringify({
                      didit_session_id: sessionId,
                      workflow_id: workflowId,
                      verification_url: verificationUrl,
                      nif_or_bi: nifOrBi || '',
                      price_kz: priceKz
                    })
                  })
                  .select()
                  .maybeSingle();

                return res.end(JSON.stringify({
                  sessionId,
                  workflowId,
                  verificationUrl,
                  priceKz,
                  status: 'payment_pending',
                  requestId: data?.id || safeUuid
                }));
              } catch {
                return res.end(JSON.stringify({
                  sessionId,
                  workflowId,
                  verificationUrl,
                  priceKz,
                  status: 'payment_pending',
                  requestId: safeUuid
                }));
              }
            } else {
              try {
                const { data } = await supabase
                  .from('organization_verification_requests')
                  .insert({
                    organization_id: targetId,
                    requested_by: userId,
                    status: 'payment_pending',
                    evidence_url: JSON.stringify({
                      didit_session_id: sessionId,
                      workflow_id: workflowId,
                      verification_url: verificationUrl,
                      nif: nifOrBi || '',
                      price_kz: priceKz
                    })
                  })
                  .select()
                  .maybeSingle();

                return res.end(JSON.stringify({
                  sessionId,
                  workflowId,
                  verificationUrl,
                  priceKz,
                  status: 'payment_pending',
                  requestId: data?.id || safeUuid
                }));
              } catch {
                return res.end(JSON.stringify({
                  sessionId,
                  workflowId,
                  verificationUrl,
                  priceKz,
                  status: 'payment_pending',
                  requestId: safeUuid
                }));
              }
            }
          }

          if (req.url.startsWith('/api/didit/simulate-decision')) {
            const { requestId, targetType, targetId, decision } = parsed;
            const now = new Date();
            const validUntil = new Date(now.getTime() + 30 * 86400000).toISOString();
            const expiredUntil = new Date(now.getTime() - 86400000).toISOString();
            const isUuid = Boolean(requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId));

            if (targetType === 'profile') {
              if (isUuid) {
                await supabase
                  .from('profile_verification_requests')
                  .update({ status: decision, reviewed_at: now.toISOString() })
                  .eq('id', requestId);
              } else if (targetId) {
                await supabase
                  .from('profile_verification_requests')
                  .update({ status: decision, reviewed_at: now.toISOString() })
                  .eq('user_id', targetId);
              }

              if (decision === 'approved') {
                await supabase
                  .from('profiles')
                  .update({ is_verified: true, verified_at: now.toISOString(), verified_until: validUntil, updated_at: now.toISOString() })
                  .eq('user_id', targetId);
              } else if (decision === 'subscription_expired') {
                await supabase
                  .from('profiles')
                  .update({ is_verified: false, verified_until: expiredUntil, updated_at: now.toISOString() })
                  .eq('user_id', targetId);
              } else if (decision === 'badge_suspended' || decision === 'rejected' || decision === 'not_verified') {
                await supabase
                  .from('profiles')
                  .update({ is_verified: false, updated_at: now.toISOString() })
                  .eq('user_id', targetId);
              }
            } else {
              if (isUuid) {
                await supabase
                  .from('organization_verification_requests')
                  .update({ status: decision, reviewed_at: now.toISOString() })
                  .eq('id', requestId);
              } else if (targetId) {
                await supabase
                  .from('organization_verification_requests')
                  .update({ status: decision, reviewed_at: now.toISOString() })
                  .eq('organization_id', targetId);
              }

              if (decision === 'approved') {
                await supabase
                  .from('organizations')
                  .update({ verification_status: 'verified', verified_at: now.toISOString(), verified_until: validUntil, updated_at: now.toISOString() })
                  .eq('id', targetId);
              } else if (decision === 'subscription_expired') {
                await supabase
                  .from('organizations')
                  .update({ verification_status: 'unverified', verified_until: expiredUntil, updated_at: now.toISOString() })
                  .eq('id', targetId);
              } else if (decision === 'badge_suspended' || decision === 'rejected' || decision === 'not_verified') {
                await supabase
                  .from('organizations')
                  .update({ verification_status: 'unverified', updated_at: now.toISOString() })
                  .eq('id', targetId);
              }
            }

            return res.end(JSON.stringify({ success: true, decision, targetId }));
          }

          if (req.url.startsWith('/api/didit/webhook')) {
            const { status, decision } = parsed;
            const mappedStatus = (decision === 'Approved' || status === 'Approved') ? 'approved' : 'in_review';
            return res.end(JSON.stringify({ received: true, mappedStatus }));
          }

          return res.end(JSON.stringify({ ok: true }));
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      diditApiPlugin(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'KONECTA – Ideias que unem. Pessoas que realizam.',
          short_name: 'KONECTA',
          description: 'Plataforma de inovação, desafios e projetos em Angola.',
          theme_color: '#102D57',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: true,
      port: 3000,
      hmr: false,
      ws: false as const,
    },
  };
});
