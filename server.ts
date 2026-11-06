import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

// Parse JSON with rawBody capture for webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rrczdshxyuamtomuswmv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY3pkc2h4eXVhbXRvbXVzd212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjkzODEsImV4cCI6MjEwODk0NTM4MX0.kNAHRVs4J5Z43ehGfutE6C9J0DmFzleoOxS2bi3ItCw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Didit Configuration (v3 API)
const DIDIT_APP_ID = process.env.DIDIT_APP_ID || 'fd452321-eb1f-4413-b328-13e4c26a7571';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || '';
const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
const DIDIT_BI_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_BI_ID || '2ff17dd6-e06d-4176-b0d0-36933fd33594';
const DIDIT_EMPRESA_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_EMPRESA_ID || '6e57bec1-d247-4af6-88be-155edef5cac0';
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Webhook idempotency & active sessions cache
const processedWebhooks = new Set<string>();
const activeSessions = new Map<string, any>();

// Helper to call Didit v3 API to create verification session
async function createDiditSessionViaApi(workflowId: string, vendorData: string, callbackUrl: string) {
  const isOrg = workflowId === DIDIT_EMPRESA_WORKFLOW_ID;
  const fallbackLink = isOrg ? 'https://verify.didit.me/u/ble-wdJHSvaIvhVe3vXKwA' : 'https://verify.didit.me/u/L_F91uBtQXaw0DaTP9M1lA';
  const rawSessionUuid = crypto.randomUUID();
  const fallbackSessionId = `didit_sess_${rawSessionUuid}`;
  const fallbackUrl = `${fallbackLink}?vendor_data=${encodeURIComponent(vendorData)}&session_id=${fallbackSessionId}&app_id=fd452321-eb1f-4413-b328-13e4c26a7571`;

  if (!DIDIT_API_KEY) {
    console.warn('DIDIT_API_KEY not configured, using sandbox workflow fallback URL.');
    return { sessionId: fallbackSessionId, verificationUrl: fallbackUrl };
  }

  try {
    const url = `${DIDIT_BASE_URL}/v3/session/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DIDIT_API_KEY,
        'Authorization': `Bearer ${DIDIT_API_KEY}`
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: vendorData,
        callback: callbackUrl
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Didit API v3 session returned status ${response.status}: ${errText}. Falling back to sandbox workflow link.`);
      return { sessionId: fallbackSessionId, verificationUrl: fallbackUrl };
    }

    const data = await response.json();
    const sessionId = data.session_id || data.id || fallbackSessionId;
    const verificationUrl = data.url || data.session_url || data.verification_url || fallbackUrl;

    return { sessionId, verificationUrl };
  } catch (err: any) {
    console.warn('Didit API v3 connection error, falling back to workflow link:', err);
    return { sessionId: fallbackSessionId, verificationUrl: fallbackUrl };
  }
}

// Webhook signature verification helper
function verifyDiditWebhookSignature(req: any): boolean {
  if (!DIDIT_WEBHOOK_SECRET) return true;
  const signature = req.headers['x-signature-v2'] || req.headers['x-signature-simple'] || req.headers['x-signature'] || req.headers['authorization'];
  const timestamp = req.headers['x-timestamp'] || req.headers['timestamp'];

  if (!signature || !timestamp) return false;

  const webhookTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(webhookTime) || Math.abs(now - webhookTime) > 300) {
    return false;
  }

  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
  const payloadToSign = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac('sha256', DIDIT_WEBHOOK_SECRET).update(payloadToSign).digest('hex');

  try {
    const sigClean = signature.replace(/^sha256=/, '');
    return crypto.timingSafeEqual(Buffer.from(sigClean, 'hex'), Buffer.from(hmac, 'hex'));
  } catch {
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
    } catch {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 1. PUBLIC DIDIT CONFIG
// -------------------------------------------------------------
app.get('/api/didit/config', (req, res) => {
  res.json({
    appId: DIDIT_APP_ID,
    workflows: {
      individual: { id: DIDIT_BI_WORKFLOW_ID, priceAOA: 5000 },
      organization: { id: DIDIT_EMPRESA_WORKFLOW_ID, priceAOA: 10000 }
    }
  });
});

// -------------------------------------------------------------
// 2. START BI VERIFICATION SESSION
// Route: POST /api/verification/bi/start
// -------------------------------------------------------------
app.post('/api/verification/bi/start', async (req, res) => {
  try {
    const { userId, fullName, biNumber, targetId: clientTargetId } = req.body;
    const targetId = clientTargetId || userId;

    if (!targetId) {
      return res.status(400).json({ error: 'Identificador de utilizador ou perfil é obrigatório' });
    }

    const priceAOA = 5000;
    const callbackUrl = `${APP_BASE_URL}/verification-return`;

    let apiResult;
    try {
      apiResult = await createDiditSessionViaApi(DIDIT_BI_WORKFLOW_ID, targetId, callbackUrl);
    } catch (apiErr: any) {
      console.error('Didit API v3 BI session error:', apiErr);
      return res.status(502).json({ error: apiErr.message || 'Erro ao comunicar com a API da Didit.' });
    }

    const { sessionId, verificationUrl } = apiResult;
    const rawSessionUuid = crypto.randomUUID();

    const evidenceMeta = {
      didit_session_id: sessionId,
      session_uuid: rawSessionUuid,
      workflow_id: DIDIT_BI_WORKFLOW_ID,
      verification_url: verificationUrl,
      full_name: fullName || '',
      bi_number: biNumber || '',
      price_aoa: priceAOA,
      payment_status: 'payment_pending',
      didit_status: 'pending',
      created_at: new Date().toISOString()
    };

    let requestId = rawSessionUuid;

    const { data: existing } = await supabase
      .from('profile_verification_requests')
      .select('id')
      .eq('user_id', targetId)
      .in('status', ['payment_pending', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      requestId = existing.id;
      const { error: updateErr } = await supabase
        .from('profile_verification_requests')
        .update({
          status: 'payment_pending',
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Supabase profile request update error:', updateErr);
        return res.status(500).json({ error: `Erro ao atualizar pedido de verificação: ${updateErr.message}` });
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('profile_verification_requests')
        .insert({
          user_id: targetId,
          status: 'payment_pending',
          requested_name: fullName || 'Membro Konecta',
          explanation: fullName || 'Membro Konecta',
          price_amount: priceAOA,
          currency: 'AOA',
          duration_days: 30,
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        console.error('Supabase profile verification request insert error:', insertError);
        return res.status(500).json({ error: `Erro ao gravar pedido de verificação: ${insertError.message}` });
      }

      if (inserted?.id) {
        requestId = inserted.id;
      }
    }

    const sessionPayload = {
      sessionId,
      requestId,
      targetType: 'profile',
      targetId,
      workflowId: DIDIT_BI_WORKFLOW_ID,
      verificationUrl,
      priceAOA,
      status: 'payment_pending',
      paymentStatus: 'payment_pending',
      diditStatus: 'pending',
      createdAt: new Date().toISOString()
    };
    activeSessions.set(sessionId, sessionPayload);
    activeSessions.set(requestId, sessionPayload);

    return res.json({
      success: true,
      sessionId,
      workflowId: DIDIT_BI_WORKFLOW_ID,
      verificationUrl,
      priceAOA,
      status: 'payment_pending',
      requestId
    });
  } catch (err: any) {
    console.error('Error starting BI verification:', err);
    return res.status(500).json({ error: err.message || 'Erro ao iniciar verificação de BI' });
  }
});

// -------------------------------------------------------------
// 3. START COMPANY VERIFICATION SESSION
// Route: POST /api/verification/company/start
// -------------------------------------------------------------
app.post('/api/verification/company/start', async (req, res) => {
  try {
    const { userId, organizationId, companyName, nif } = req.body;
    const targetId = organizationId;

    if (!targetId || !userId) {
      return res.status(400).json({ error: 'Identificador da empresa e do requerente são obrigatórios' });
    }

    const priceAOA = 10000;
    const callbackUrl = `${APP_BASE_URL}/verification-return`;

    let apiResult;
    try {
      apiResult = await createDiditSessionViaApi(DIDIT_EMPRESA_WORKFLOW_ID, targetId, callbackUrl);
    } catch (apiErr: any) {
      console.error('Didit API v3 Company session error:', apiErr);
      return res.status(502).json({ error: apiErr.message || 'Erro ao comunicar com a API da Didit.' });
    }

    const { sessionId, verificationUrl } = apiResult;
    const rawSessionUuid = crypto.randomUUID();

    const evidenceMeta = {
      didit_session_id: sessionId,
      session_uuid: rawSessionUuid,
      workflow_id: DIDIT_EMPRESA_WORKFLOW_ID,
      verification_url: verificationUrl,
      company_name: companyName || '',
      nif: nif || '',
      price_aoa: priceAOA,
      payment_status: 'payment_pending',
      didit_status: 'pending',
      created_at: new Date().toISOString()
    };

    let requestId = rawSessionUuid;

    const { data: existing } = await supabase
      .from('organization_verification_requests')
      .select('id')
      .eq('organization_id', targetId)
      .in('status', ['payment_pending', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      requestId = existing.id;
      const { error: updateErr } = await supabase
        .from('organization_verification_requests')
        .update({
          status: 'payment_pending',
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Supabase org request update error:', updateErr);
        return res.status(500).json({ error: `Erro ao atualizar pedido de verificação empresarial: ${updateErr.message}` });
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('organization_verification_requests')
        .insert({
          organization_id: targetId,
          requested_by: userId,
          status: 'payment_pending',
          requested_name: companyName || 'Empresa Konecta',
          price_amount: priceAOA,
          currency: 'AOA',
          evidence_url: JSON.stringify(evidenceMeta)
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        console.error('Supabase organization verification request insert error:', insertError);
        return res.status(500).json({ error: `Erro ao gravar pedido de verificação empresarial: ${insertError.message}` });
      }

      if (inserted?.id) {
        requestId = inserted.id;
      }
    }

    const sessionPayload = {
      sessionId,
      requestId,
      targetType: 'organization',
      targetId,
      workflowId: DIDIT_EMPRESA_WORKFLOW_ID,
      verificationUrl,
      priceAOA,
      status: 'payment_pending',
      paymentStatus: 'payment_pending',
      diditStatus: 'pending',
      createdAt: new Date().toISOString()
    };
    activeSessions.set(sessionId, sessionPayload);
    activeSessions.set(requestId, sessionPayload);

    return res.json({
      success: true,
      sessionId,
      workflowId: DIDIT_EMPRESA_WORKFLOW_ID,
      verificationUrl,
      priceAOA,
      status: 'payment_pending',
      requestId
    });
  } catch (err: any) {
    console.error('Error starting company verification:', err);
    return res.status(500).json({ error: err.message || 'Erro ao iniciar verificação empresarial' });
  }
});

// Alias endpoint for create-session
app.post('/api/didit/create-session', async (req, res) => {
  const { targetType } = req.body;
  if (targetType === 'organization') {
    return app._router.handle({ ...req, url: '/api/verification/company/start' }, res);
  }
  return app._router.handle({ ...req, url: '/api/verification/bi/start' }, res);
});

// -------------------------------------------------------------
// 4. CONFIRM PAYMENT FOR VERIFICATION REQUEST
// Route: POST /api/verification/confirm-payment
// -------------------------------------------------------------
app.post(['/api/verification/confirm-payment', '/api/didit/confirm-payment'], async (req, res) => {
  try {
    const { requestId, targetType, paymentMethod, phoneNumber } = req.body;
    const table = targetType === 'organization' ? 'organization_verification_requests' : 'profile_verification_requests';
    const now = new Date().toISOString();

    let cleanUuid = (requestId || '').trim().replace(/^didit_sess_/, '');
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUuid);

    let currentReq: any = null;
    if (isValidUuid) {
      const { data } = await supabase.from(table).select('*').eq('id', cleanUuid).maybeSingle();
      currentReq = data;
    }

    let meta: any = {};
    try { meta = JSON.parse(currentReq?.evidence_url || '{}'); } catch {}

    meta.payment_method = paymentMethod || 'mc_express';
    meta.payment_phone = phoneNumber || '';
    meta.payment_status = 'paid';
    meta.paid_at = now;

    const isDiditApproved = meta.didit_status === 'approved' || meta.didit_decision === 'Approved';

    let nextStatus = 'verification_pending';
    if (isDiditApproved) {
      nextStatus = 'approved';
      const validUntil = new Date(Date.now() + 30 * 86400000).toISOString();
      if (targetType === 'profile' && currentReq?.user_id) {
        await supabase.from('profiles').update({
          is_verified: true,
          verified_at: now,
          verified_until: validUntil,
          updated_at: now
        }).eq('user_id', currentReq.user_id);
      } else if (targetType === 'organization' && currentReq?.organization_id) {
        await supabase.from('organizations').update({
          verification_status: 'verified',
          verified_at: now,
          verified_until: validUntil,
          updated_at: now
        }).eq('id', currentReq.organization_id);
      }
    }

    if (currentReq?.id) {
      const { error: updateErr } = await supabase.from(table).update({
        status: nextStatus,
        evidence_url: JSON.stringify(meta)
      }).eq('id', currentReq.id);

      if (updateErr) {
        console.error('Supabase confirm payment update error:', updateErr);
        return res.status(500).json({ error: `Erro ao atualizar pagamento: ${updateErr.message}` });
      }
    }

    return res.json({
      success: true,
      status: nextStatus,
      requestId: currentReq?.id || cleanUuid,
      paymentConfirmed: true
    });
  } catch (err: any) {
    console.error('Error confirming payment:', err);
    return res.status(500).json({ error: err.message || 'Erro ao confirmar pagamento' });
  }
});

// -------------------------------------------------------------
// 5. WEBHOOK RECEIVER & DIDIT RESULT PROCESSING
// Route: POST /api/didit/webhook & POST /api/verification/didit-webhook
// -------------------------------------------------------------
app.post(['/api/verification/didit-webhook', '/api/didit/webhook'], async (req, res) => {
  try {
    if (!verifyDiditWebhookSignature(req)) {
      console.warn('Didit webhook signature verification failed.');
      return res.status(401).json({ error: 'Assinatura do webhook inválida' });
    }

    const event = req.body || {};
    const sessionId = event.session_id || event.sessionId || event.id || event.data?.session_id;
    const rawDecision = event.decision || event.status || event.data?.decision || event.data?.status || 'InReview';
    const vendorData = event.vendor_data || event.vendorData || event.data?.vendor_data;

    const eventKey = `${sessionId}_${rawDecision}`;
    if (processedWebhooks.has(eventKey)) {
      return res.json({ success: true, duplicate: true, message: 'Evento já processado' });
    }
    processedWebhooks.add(eventKey);

    // Map: Approved → approved; Declined/Rejected → rejected; Expired → subscription_expired; In Review/outros → in_review
    let mappedStatus: 'approved' | 'rejected' | 'in_review' | 'subscription_expired' = 'in_review';
    const lowerDec = String(rawDecision).toLowerCase();
    if (['approved', 'allow', 'success'].includes(lowerDec)) {
      mappedStatus = 'approved';
    } else if (['declined', 'rejected', 'block', 'failed'].includes(lowerDec)) {
      mappedStatus = 'rejected';
    } else if (['expired'].includes(lowerDec)) {
      mappedStatus = 'subscription_expired';
    } else {
      mappedStatus = 'in_review';
    }

    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 86400000).toISOString();

    let profileReq: any = null;
    let orgReq: any = null;

    if (sessionId) {
      const { data: pData } = await supabase
        .from('profile_verification_requests')
        .select('*')
        .like('evidence_url', `%${sessionId}%`)
        .maybeSingle();
      profileReq = pData;

      const { data: oData } = await supabase
        .from('organization_verification_requests')
        .select('*')
        .like('evidence_url', `%${sessionId}%`)
        .maybeSingle();
      orgReq = oData;
    }

    if (!profileReq && vendorData) {
      const { data: pData } = await supabase
        .from('profile_verification_requests')
        .select('*')
        .eq('user_id', vendorData)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      profileReq = pData;
    }

    if (!orgReq && vendorData) {
      const { data: oData } = await supabase
        .from('organization_verification_requests')
        .select('*')
        .eq('organization_id', vendorData)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      orgReq = oData;
    }

    // Process Profile Request
    if (profileReq) {
      let meta: any = {};
      try { meta = JSON.parse(profileReq.evidence_url || '{}'); } catch {}

      meta.didit_decision = rawDecision;
      meta.didit_status = mappedStatus;
      meta.webhook_received_at = now.toISOString();

      const isPaid = meta.payment_status === 'paid' || profileReq.status === 'verification_pending' || profileReq.status === 'approved';

      // CRITICAL: Badge is ONLY granted when BOTH Didit approves AND payment is confirmed!
      if (mappedStatus === 'approved' && isPaid) {
        const { error: reqErr } = await supabase.from('profile_verification_requests').update({
          status: 'approved',
          reviewed_at: now.toISOString(),
          evidence_url: JSON.stringify(meta)
        }).eq('id', profileReq.id);

        if (reqErr) console.error('Error updating profile request approval:', reqErr);

        const { error: profErr } = await supabase.from('profiles').update({
          is_verified: true,
          verified_at: now.toISOString(),
          verified_until: validUntil,
          updated_at: now.toISOString()
        }).eq('user_id', profileReq.user_id);

        if (profErr) console.error('Error updating profile verification status:', profErr);
      } else {
        const targetReqStatus = mappedStatus === 'approved' ? 'verification_pending' : mappedStatus;
        const { error: reqErr } = await supabase.from('profile_verification_requests').update({
          status: targetReqStatus,
          reviewed_at: now.toISOString(),
          evidence_url: JSON.stringify(meta)
        }).eq('id', profileReq.id);

        if (reqErr) console.error('Error updating profile request status:', reqErr);

        if (mappedStatus === 'rejected' || mappedStatus === 'subscription_expired') {
          const { error: profErr } = await supabase.from('profiles').update({
            is_verified: false,
            updated_at: now.toISOString()
          }).eq('user_id', profileReq.user_id);

          if (profErr) console.error('Error revoking profile verification:', profErr);
        }
      }
    }

    // Process Organization Request
    if (orgReq) {
      let meta: any = {};
      try { meta = JSON.parse(orgReq.evidence_url || '{}'); } catch {}

      meta.didit_decision = rawDecision;
      meta.didit_status = mappedStatus;
      meta.webhook_received_at = now.toISOString();

      const isPaid = meta.payment_status === 'paid' || orgReq.status === 'verification_pending' || orgReq.status === 'approved';

      if (mappedStatus === 'approved' && isPaid) {
        const { error: reqErr } = await supabase.from('organization_verification_requests').update({
          status: 'approved',
          reviewed_at: now.toISOString(),
          evidence_url: JSON.stringify(meta)
        }).eq('id', orgReq.id);

        if (reqErr) console.error('Error updating org request approval:', reqErr);

        const { error: orgErr } = await supabase.from('organizations').update({
          verification_status: 'verified',
          verified_at: now.toISOString(),
          verified_until: validUntil,
          updated_at: now.toISOString()
        }).eq('id', orgReq.organization_id);

        if (orgErr) console.error('Error updating organization verification status:', orgErr);
      } else {
        const targetReqStatus = mappedStatus === 'approved' ? 'verification_pending' : mappedStatus;
        const { error: reqErr } = await supabase.from('organization_verification_requests').update({
          status: targetReqStatus,
          reviewed_at: now.toISOString(),
          evidence_url: JSON.stringify(meta)
        }).eq('id', orgReq.id);

        if (reqErr) console.error('Error updating org request status:', reqErr);

        if (mappedStatus === 'rejected' || mappedStatus === 'subscription_expired') {
          const { error: orgErr } = await supabase.from('organizations').update({
            verification_status: 'unverified',
            updated_at: now.toISOString()
          }).eq('id', orgReq.organization_id);

          if (orgErr) console.error('Error revoking org verification:', orgErr);
        }
      }
    }

    if (sessionId) {
      const existing = activeSessions.get(sessionId);
      if (existing) {
        existing.diditStatus = mappedStatus;
        existing.status = mappedStatus;
      }
    }

    return res.json({ success: true, mappedStatus, sessionId });
  } catch (err: any) {
    console.error('Error in Didit webhook:', err);
    return res.status(500).json({ error: err.message || 'Erro ao processar webhook' });
  }
});

// -------------------------------------------------------------
// 6. GET VERIFICATION STATUS BY REQUEST ID / SESSION ID
// Route: GET /api/verification/status/:requestId
// -------------------------------------------------------------
app.get(['/api/verification/status/:requestId', '/api/verification/session/:requestId'], async (req, res) => {
  try {
    const { requestId } = req.params;
    let cleanUuid = (requestId || '').trim().replace(/^didit_sess_/, '');
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUuid);

    let requestData: any = null;
    let type: 'profile' | 'organization' = 'profile';

    if (isValidUuid) {
      const { data: pData } = await supabase.from('profile_verification_requests').select('*').eq('id', cleanUuid).maybeSingle();
      if (pData) {
        requestData = pData;
        type = 'profile';
      } else {
        const { data: oData } = await supabase.from('organization_verification_requests').select('*').eq('id', cleanUuid).maybeSingle();
        if (oData) {
          requestData = oData;
          type = 'organization';
        }
      }
    }

    if (!requestData) {
      const cached = activeSessions.get(requestId) || activeSessions.get(cleanUuid) || activeSessions.get(`didit_sess_${cleanUuid}`);
      if (cached) {
        return res.json({
          success: true,
          requestId: cached.requestId,
          targetType: cached.targetType,
          status: cached.status,
          paymentStatus: cached.paymentStatus,
          diditStatus: cached.diditStatus,
          verificationUrl: cached.verificationUrl,
          createdAt: cached.createdAt
        });
      }
      return res.status(404).json({ error: 'Pedido de verificação não encontrado' });
    }

    let meta: any = {};
    try { meta = JSON.parse(requestData.evidence_url || '{}'); } catch {}

    return res.json({
      success: true,
      requestId: requestData.id,
      targetType: type,
      status: requestData.status,
      paymentStatus: meta.payment_status || 'payment_pending',
      diditStatus: meta.didit_status || 'pending',
      verificationUrl: meta.verification_url,
      createdAt: requestData.created_at,
      reviewedAt: requestData.reviewed_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao consultar estado' });
  }
});

// -------------------------------------------------------------
// 7. SIMULATE DIDIT DECISION (ADMIN / SANDBOX EVALUATION)
// Route: POST /api/didit/simulate-decision
// -------------------------------------------------------------
app.post('/api/didit/simulate-decision', async (req, res) => {
  try {
    const { requestId, targetType, targetId, decision } = req.body;
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 86400000).toISOString();
    const expiredUntil = new Date(now.getTime() - 86400000).toISOString();
    const isUuid = Boolean(requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId));

    if (targetType === 'profile') {
      if (isUuid) {
        await supabase.from('profile_verification_requests').update({ status: decision, reviewed_at: now.toISOString() }).eq('id', requestId);
      } else if (targetId) {
        await supabase.from('profile_verification_requests').update({ status: decision, reviewed_at: now.toISOString() }).eq('user_id', targetId);
      }

      if (decision === 'approved') {
        await supabase.from('profiles').update({ is_verified: true, verified_at: now.toISOString(), verified_until: validUntil, updated_at: now.toISOString() }).eq('user_id', targetId);
      } else if (decision === 'subscription_expired') {
        await supabase.from('profiles').update({ is_verified: false, verified_until: expiredUntil, updated_at: now.toISOString() }).eq('user_id', targetId);
      } else if (['badge_suspended', 'rejected', 'not_verified'].includes(decision)) {
        await supabase.from('profiles').update({ is_verified: false, updated_at: now.toISOString() }).eq('user_id', targetId);
      }
    } else {
      if (isUuid) {
        await supabase.from('organization_verification_requests').update({ status: decision, reviewed_at: now.toISOString() }).eq('id', requestId);
      } else if (targetId) {
        await supabase.from('organization_verification_requests').update({ status: decision, reviewed_at: now.toISOString() }).eq('organization_id', targetId);
      }

      if (decision === 'approved') {
        await supabase.from('organizations').update({ verification_status: 'verified', verified_at: now.toISOString(), verified_until: validUntil, updated_at: now.toISOString() }).eq('id', targetId);
      } else if (decision === 'subscription_expired') {
        await supabase.from('organizations').update({ verification_status: 'unverified', verified_until: expiredUntil, updated_at: now.toISOString() }).eq('id', targetId);
      } else if (['badge_suspended', 'rejected', 'not_verified'].includes(decision)) {
        await supabase.from('organizations').update({ verification_status: 'unverified', updated_at: now.toISOString() }).eq('id', targetId);
      }
    }

    return res.json({ success: true, decision, targetId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro na simulação' });
  }
});

// -------------------------------------------------------------
// VITE DEV / PRODUCTION SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), 'index.html');
        const fs = await import('fs');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
