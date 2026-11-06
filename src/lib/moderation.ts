import { supabase } from './supabaseClient';

export interface ModerateContentOptions {
  contentType: string;
  text?: string;
  imageUrls?: string[];
  videoFrameUrls?: string[];
  contentId?: string;
}

export interface ModerationResult {
  decision: 'allow' | 'review' | 'block';
  contentId: string;
  message: string;
  unavailable?: boolean;
  flaggedCategories?: string[];
  categoryScores?: Record<string, number>;
}

export async function moderateContent(options: ModerateContentOptions): Promise<ModerationResult> {
  const { contentType, text = '', imageUrls = [], videoFrameUrls = [], contentId } = options;
  const targetContentId = contentId || crypto.randomUUID();

  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        content_id: targetContentId,
        content_type: contentType,
        text,
        image_urls: imageUrls,
        video_frame_urls: videoFrameUrls,
      },
    });

    if (error || !data) {
      console.error('Falha na invocação da moderação:', error || 'Sem resposta');
      return {
        decision: 'review',
        contentId: targetContentId,
        message: 'A moderação está indisponível de momento. O teu conteúdo será revisto antes de aparecer.',
        unavailable: true,
      };
    }

    const decision: 'allow' | 'review' | 'block' = data.decision || data.action || 'allow';
    const finalContentId: string = data.content_id || targetContentId;
    const message: string = data.message || (
      decision === 'block'
        ? 'Este conteúdo parece violar as regras da comunidade e não pode ser publicado.'
        : decision === 'review'
        ? 'O conteúdo será revisto antes de ficar visível.'
        : 'Conteúdo aprovado.'
    );

    return {
      decision,
      contentId: finalContentId,
      message,
      unavailable: false,
      flaggedCategories: data.flagged_categories || [],
      categoryScores: data.category_scores || {},
    };
  } catch (err) {
    console.error('Erro na moderação no frontend:', err);
    return {
      decision: 'review',
      contentId: targetContentId,
      message: 'A moderação está indisponível de momento. O teu conteúdo será revisto antes de aparecer.',
      unavailable: true,
    };
  }
}
