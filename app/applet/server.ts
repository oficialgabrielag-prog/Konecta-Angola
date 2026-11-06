import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rrczdshxyuamtomuswmv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY3pkc2h4eXVhbXRvbXVzd212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjkzODEsImV4cCI6MjEwODk0NTM4MX0.kNAHRVs4J5Z43ehGfutE6C9J0DmFzleoOxS2bi3ItCw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIDIT_ORGANIZATION_ID = process.env.DIDIT_ORGANIZATION_ID || '4f066c5c-aa85-45ff-931b-65fb9abf96fb';
const DIDIT_APP_ID = process.env.DIDIT_APP_ID || 'fd452321-eb1f-4413-b328-13e4c26a7571';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || '';
const DIDIT_BI_WORKFLOW_ID = process.env.DIDIT_BI_WORKFLOW_ID || '2ff17dd6-e06d-4176-b0d0-36933fd33594';
const DIDIT_BI_LINK = 'https://verify.didit.me/u/L_F91uBtQXaw0DaTP9M1lA';

const DIDIT_ORG_WORKFLOW_ID = process.env.DIDIT_ORG_WORKFLOW_ID || '6e57bec1-d247-4af6-88be-155edef5cac0';
const DIDIT_ORG_LINK = 'https://verify.didit.me/u/ble-wdJHSvaIvhVe3vXKwA';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Didit Integration API Endpoints

  // 1. Get Didit Configuration & Pricing
  app.get('/api/didit/config', (req, res) => {
    res.json({
      appId: DIDIT_APP_ID,
      organizationId: DIDIT_ORGANIZATION_ID,
      workflows: {
        individual: {
          id: DIDIT_BI_WORKFLOW_ID,
          link: DIDIT_BI_LINK,
          priceKz: 5000,
          label: 'Verificação de BI (Pessoa Física)'
        },
        organization: {
          id: DIDIT_ORG_WORKFLOW_ID,
          link: DIDIT_ORG_LINK,
          priceKz: 10000,
          label: 'Verificação de NIF (Empresa)'
        }
      }
    });
  });

  // 2. Create Didit Session
  app.post('/api/didit/create-session', async (req, res) => {
    try {
      const { targetType, targetId, userId, fullName, nifOrBi, requestId: clientReqId } = req.body;
      if (!targetType || !targetId || !userId) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios em falta (targetType, targetId, userId)' });
      }

      const rawUuid = crypto.randomUUID();
      const sessionId = `didit_sess_${rawUuid}`;
      const safeUuid = clientReqId || rawUuid;
      const workflowId = targetType === 'organization' ? DIDIT_ORG_WORKFLOW_ID : DIDIT_BI_WORKFLOW_ID;
      const baseLink = targetType === 'organization' ? DIDIT_ORG_LINK : DIDIT_BI_LINK;
      
      const verificationUrl = `${baseLink}?vendor_data=${encodeURIComponent(targetId)}&user_id=${encodeURIComponent(userId)}&session_id=${sessionId}&app_id=${DIDIT_APP_ID}`;

      const priceKz = targetType === 'organization' ? 10000 : 5000;
      const now = new Date().toISOString();

      if (targetType === 'profile') {
        const { data, error } = await supabase
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
            }),
            created_at: now
          })
          .select()
          .maybeSingle();

        if (error) console.warn('Aviso ao criar registo de verificação de perfil:', error.message);

        return res.json({
          sessionId,
          workflowId,
          verificationUrl,
          priceKz,
          status: 'payment_pending',
          requestId: data?.id || safeUuid
        });
      } else {
        const { data, error } = await supabase
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
            }),
            created_at: now
          })
          .select()
          .maybeSingle();

        if (error) console.warn('Aviso ao criar registo de verificação de organização:', error.message);

        return res.json({
          sessionId,
          workflowId,
          verificationUrl,
          priceKz,
          status: 'payment_pending',
          requestId: data?.id || safeUuid
        });
      }
    } catch (err: any) {
      console.error('Erro ao criar sessão Didit:', err);
      res.status(500).json({ error: err?.message || 'Falha no servidor ao criar sessão Didit' });
    }
  });

  // 3. Webhook Endpoint for Didit Status Updates
  app.post('/api/didit/webhook', async (req, res) => {
    try {
      const payload = req.body || {};
      const { session_id, vendor_data, status, decision, reason } = payload;

      console.log('[Didit Webhook] Evento recebido:', payload);

      const mappedStatus = 
        decision === 'Approved' || status === 'Approved' ? 'approved' :
        decision === 'Declined' || status === 'Declined' ? 'rejected' :
        decision === 'InReview' || status === 'InReview' ? 'in_review' : 'in_review';

      if (vendor_data) {
        const now = new Date();
        const validUntil = new Date(now.getTime() + 30 * 86400000).toISOString();

        // 1) Profile update
        const { data: profReq } = await supabase
          .from('profile_verification_requests')
          .select('*')
          .or(`user_id.eq.${vendor_data},id.eq.${vendor_data}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (profReq) {
          await supabase
            .from('profile_verification_requests')
            .update({
              status: mappedStatus,
              reviewed_at: now.toISOString()
            })
            .eq('id', profReq.id);

          if (mappedStatus === 'approved') {
            await supabase
              .from('profiles')
              .update({
                is_verified: true,
                verified_at: now.toISOString(),
                verified_until: validUntil,
                updated_at: now.toISOString()
              })
              .eq('user_id', profReq.user_id);
          }
        }

        // 2) Organization update
        const { data: orgReq } = await supabase
          .from('organization_verification_requests')
          .select('*')
          .or(`organization_id.eq.${vendor_data},id.eq.${vendor_data}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orgReq) {
          await supabase
            .from('organization_verification_requests')
            .update({
              status: mappedStatus,
              reviewed_at: now.toISOString()
            })
            .eq('id', orgReq.id);

          if (mappedStatus === 'approved') {
            await supabase
              .from('organizations')
              .update({
                verification_status: 'verified',
                verified_at: now.toISOString(),
                verified_until: validUntil,
                updated_at: now.toISOString()
              })
              .eq('id', orgReq.organization_id);
          }
        }
      }

      res.json({ received: true, mappedStatus });
    } catch (err: any) {
      console.error('Erro no webhook Didit:', err);
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  });

  // 4. Simulator Endpoint (Sandbox Realtime Test Bar)
  app.post('/api/didit/simulate-decision', async (req, res) => {
    try {
      const { requestId, targetType, targetId, decision, reason } = req.body;
      if (!targetType || !targetId || !decision) {
        return res.status(400).json({ error: 'Parâmetros em falta para simulação' });
      }

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 86400000).toISOString();
      const expiredUntil = new Date(now.getTime() - 86400000).toISOString();

      if (targetType === 'profile') {
        if (requestId) {
          await supabase
            .from('profile_verification_requests')
            .update({
              status: decision,
              reviewed_at: now.toISOString()
            })
            .eq('id', requestId);
        }

        if (decision === 'approved') {
          await supabase
            .from('profiles')
            .update({
              is_verified: true,
              verified_at: now.toISOString(),
              verified_until: validUntil,
              updated_at: now.toISOString()
            })
            .eq('user_id', targetId);
        } else if (decision === 'subscription_expired') {
          await supabase
            .from('profiles')
            .update({
              is_verified: false,
              verified_until: expiredUntil,
              updated_at: now.toISOString()
            })
            .eq('user_id', targetId);
        } else if (decision === 'badge_suspended' || decision === 'rejected' || decision === 'not_verified') {
          await supabase
            .from('profiles')
            .update({
              is_verified: false,
              updated_at: now.toISOString()
            })
            .eq('user_id', targetId);
        }
      } else {
        if (requestId) {
          await supabase
            .from('organization_verification_requests')
            .update({
              status: decision,
              reviewed_at: now.toISOString()
            })
            .eq('id', requestId);
        }

        if (decision === 'approved') {
          await supabase
            .from('organizations')
            .update({
              verification_status: 'verified',
              verified_at: now.toISOString(),
              verified_until: validUntil,
              updated_at: now.toISOString()
            })
            .eq('id', targetId);
        } else if (decision === 'subscription_expired') {
          await supabase
            .from('organizations')
            .update({
              verification_status: 'unverified',
              verified_until: expiredUntil,
              updated_at: now.toISOString()
            })
            .eq('id', targetId);
        } else if (decision === 'badge_suspended' || decision === 'rejected' || decision === 'not_verified') {
          await supabase
            .from('organizations')
            .update({
              verification_status: 'unverified',
              updated_at: now.toISOString()
            })
            .eq('id', targetId);
        }
      }

      return res.json({ success: true, decision, targetId });
    } catch (err: any) {
      console.error('Erro na simulação Didit:', err);
      res.status(500).json({ error: err?.message || 'Falha na simulação Didit' });
    }
  });

  // Mount Vite Middleware in Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KONECTA Server] A rodar na porta ${PORT}`);
  });
}

startServer();
