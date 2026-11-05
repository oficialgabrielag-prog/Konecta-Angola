// supabase/functions/moderate-content/index.ts
// Moderação de conteúdo do KONECTA: OpenAI Moderation (omni-moderation-latest).
// A chave OPENAI_API_KEY só existe aqui, no backend.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "omni-moderation-latest";
const OPENAI_URL = "https://api.openai.com/v1/moderations";
const OPENAI_TIMEOUT_MS = 12_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_IMAGES = 4;
const MAX_FRAMES = 4;
const RATE_LIMIT_PER_MINUTE = 30;

const CONTENT_TYPES = new Set([
  "post", "comment", "profile", "story", "photo", "reel", "reel_comment",
  "organization_post", "organization", "idea", "community", "event", "message",
  "general",
]);
// Tipos que a fila de moderação aceita (os outros só são analisados).
const QUEUE_TYPES = new Set([
  "post", "comment", "profile", "story", "photo", "reel", "reel_comment",
  "organization_post", "organization", "idea", "community", "event", "message",
]);

// --- Regras de decisão -------------------------------------------------
// Bloqueio imediato (o conteúdo nem chega a ser criado):
const BLOCK_IF_FLAGGED = ["sexual/minors"];
const BLOCK_SCORE_THRESHOLDS: Record<string, number> = {
  "sexual": 0.95,
  "violence/graphic": 0.9,
  "self-harm/instructions": 0.9,
  "harassment/threatening": 0.9,
  "hate/threatening": 0.9,
  "illicit/violent": 0.9,
};
// Qualquer outra sinalização vai para revisão humana.
// ----------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

// Limite simples por utilizador (por instância; protege a chave e o custo).
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

function isCloudinaryUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

type Decision = "allow" | "review" | "block";

export function decide(result: any): { decision: Decision; priority: number; flagged: string[] } {
  const categories: Record<string, boolean> = result?.categories ?? {};
  const scores: Record<string, number> = result?.category_scores ?? {};
  const flagged = Object.keys(categories).filter((k) => categories[k]);

  const blockedByFlag = BLOCK_IF_FLAGGED.some((c) => categories[c]);
  const blockedByScore = Object.entries(BLOCK_SCORE_THRESHOLDS)
    .some(([c, limit]) => (scores[c] ?? 0) >= limit);
  if (blockedByFlag || blockedByScore) return { decision: "block", priority: 5, flagged };

  if (result?.flagged || flagged.length > 0) {
    const top = Math.max(0, ...Object.values(scores));
    return { decision: "review", priority: top >= 0.8 ? 3 : 2, flagged };
  }
  return { decision: "allow", priority: 0, flagged };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  // 1) Autenticação: a sessão tem de ser válida
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return json({ error: "Sessão em falta." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Servidor mal configurado." }, 500);
  if (!openaiKey) return json({ error: "Moderação indisponível de momento." }, 503);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) return json({ error: "Sessão inválida." }, 401);

  if (rateLimited(userId)) {
    return json({ error: "Demasiados pedidos. Tenta de novo daqui a um minuto." }, 429);
  }

  // 2) Validação do pedido
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }

  const contentType = String(body?.content_type ?? "general");
  if (!CONTENT_TYPES.has(contentType)) return json({ error: "Tipo de conteúdo inválido." }, 400);

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length > MAX_TEXT_LENGTH) return json({ error: "Texto demasiado longo." }, 400);

  const rawImages = Array.isArray(body?.image_urls) ? body.image_urls : [];
  const rawFrames = Array.isArray(body?.video_frame_urls) ? body.video_frame_urls : [];
  if (rawImages.length > MAX_IMAGES || rawFrames.length > MAX_FRAMES) {
    return json({ error: "Demasiados ficheiros para analisar." }, 400);
  }
  if (![...rawImages, ...rawFrames].every(isCloudinaryUrl)) {
    return json({ error: "Só são aceites imagens do Cloudinary (HTTPS)." }, 400);
  }
  const mediaUrls: string[] = [...rawImages, ...rawFrames];

  if (!text && mediaUrls.length === 0) {
    // Nada para analisar: não é um erro, mas também não há risco.
    const emptyId = contentType === "profile" ? userId : crypto.randomUUID();
    return json({ ok: true, decision: "allow", action: "allow", flagged: false, content_id: emptyId });
  }

  // 3) Pedido à OpenAI
  const input: any[] = [];
  if (text) input.push({ type: "text", text });
  for (const url of mediaUrls) input.push({ type: "image_url", image_url: { url } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let moderation: any;
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: MODEL, input }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("OpenAI respondeu com erro", response.status);
      return json({ error: "A análise não está disponível. Tenta de novo." }, 502);
    }
    const payload = await response.json();
    moderation = payload?.results?.[0];
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    console.error("Falha na chamada à OpenAI", aborted ? "tempo esgotado" : (err as Error)?.message);
    return json({ error: aborted ? "A análise demorou demasiado." : "A análise não está disponível." }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }

  if (!moderation || typeof moderation !== "object") {
    return json({ error: "Resposta inválida do serviço de análise." }, 502);
  }

  // 4) Decisão
  const { decision, priority, flagged } = decide(moderation);
  const contentId = contentType === "profile" ? userId : crypto.randomUUID();

  // 5) Revisão humana: grava na fila (só a função, com a chave de serviço)
  let queueId: string | null = null;
  if (decision === "review" && QUEUE_TYPES.has(contentType)) {
    const flaggedMap: Record<string, boolean> = {};
    for (const key of flagged) flaggedMap[key] = true;
    const { data, error } = await admin.rpc("enqueue_moderation", {
      p_type: contentType,
      p_id: contentId,
      p_submitted_by: userId,
      p_source: "openai",
      p_priority: priority,
      p_categories: flaggedMap,
      p_scores: moderation.category_scores ?? {},
      p_excerpt: text ? text.slice(0, 500) : null,
      p_media: mediaUrls,
      p_report: null,
    });
    if (error) {
      // Se falhar, o app cria o conteúdo em "review" e o gatilho da base de dados enfileira-o.
      console.error("Falha ao gravar na fila de moderação", error.message);
    } else {
      queueId = data as string;
    }
  }

  const messages: Record<Decision, string> = {
    allow: "Conteúdo aprovado.",
    review: "O conteúdo será revisto antes de ficar visível.",
    block: "Este conteúdo parece violar as regras da comunidade e não pode ser publicado.",
  };

  return json({
    ok: true,
    decision,
    action: decision, // compatibilidade com o frontend antigo
    flagged: decision !== "allow",
    flagged_categories: flagged,
    category_scores: moderation.category_scores ?? {},
    content_id: contentId,
    queue_id: queueId,
    human_review_required: decision === "review",
    model: MODEL,
    message: messages[decision],
  });
});
