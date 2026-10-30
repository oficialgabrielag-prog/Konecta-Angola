/**
 * Helper utility for Web Share API with clipboard fallback
 */
export interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
}

export const shareContent = async (options: ShareOptions): Promise<{ shared: boolean; copied: boolean; message: string }> => {
  const shareUrl = options.url || window.location.href;
  const shareData = {
    title: options.title || 'KONECTA Angola',
    text: options.text || 'Confira no KONECTA — Plataforma Colaborativa de Inovação em Angola',
    url: shareUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { shared: true, copied: false, message: 'Conteúdo partilhado com sucesso!' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, copied: false, message: 'Partilha cancelada.' };
      }
    }
  }

  // Fallback to Clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return { shared: false, copied: true, message: 'Link copiado para a área de transferência!' };
    }
  } catch (err: any) {
    console.warn('Erro ao copiar para clipboard:', err);
  }

  return { shared: false, copied: false, message: 'Não foi possível partilhar o link.' };
};
