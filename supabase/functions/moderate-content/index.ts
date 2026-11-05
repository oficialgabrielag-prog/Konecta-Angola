import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const user = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (user.error || !user.data.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { text, image_urls, content_type, content_id } = await req.json();

    // 1. Analyze with OpenAI
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'omni-moderation-latest',
      }),
    });

    const moderation = await response.json();
    const isFlagged = moderation.results[0].flagged;
    
    // Determine action
    const action = isFlagged ? 'review' : 'allow';

    // 2. If flagged, log to queue
    if (action === 'review') {
      await supabaseClient.from('content_moderation_queue').insert({
        content_id: content_id,
        content_type: content_type,
        author_id: user.data.user.id,
        reason: JSON.stringify(moderation.results[0].categories),
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    return new Response(
      JSON.stringify({ action, flagged: isFlagged, categories: moderation.results[0].categories }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
