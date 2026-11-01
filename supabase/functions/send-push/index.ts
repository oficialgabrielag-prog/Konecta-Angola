// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const pushWebhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

    const authHeader = req.headers.get("Authorization");
    const xPushSecret = req.headers.get("x-push-secret");

    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

    const isAuthorizedServiceRole = Boolean(serviceRoleKey && bearerToken && bearerToken === serviceRoleKey);
    const isAuthorizedWebhookSecret = Boolean(pushWebhookSecret && xPushSecret && xPushSecret === pushWebhookSecret);

    if (!isAuthorizedServiceRole && !isAuthorizedWebhookSecret) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    const { user_id, title, body, icon, url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Parâmetros user_id e title são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user active push devices from push_devices table
    const { data: devices, error } = await supabaseClient
      .from("push_devices")
      .select("*")
      .eq("user_id", user_id)
      .eq("enabled", true);

    if (error) {
      throw error;
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@konecta.ao";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          message: "Chaves VAPID não configuradas nas Secrets da Supabase Edge Function.",
          success: false
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title,
      body: body || "",
      icon: icon || "/icon-192.png",
      url: url || "/"
    });

    const sendResults = await Promise.allSettled(
      (devices || []).map(async (device) => {
        let pushSubscription;
        try {
          pushSubscription = typeof device.device_token === "string" 
            ? JSON.parse(device.device_token) 
            : device.device_token;
        } catch (e) {
          console.error("Device token JSON inválido:", device.device_token);
          return { id: device.id, status: "invalid_json" };
        }

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { id: device.id, status: "sent" };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Remove expired subscription from push_devices by id
            await supabaseClient.from("push_devices").delete().eq("id", device.id);
          }
          throw err;
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, count: sendResults.length, results: sendResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erro interno no servidor push" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
