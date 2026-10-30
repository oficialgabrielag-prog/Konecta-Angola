/**
 * Cloudflare R2 Image Storage Adapter for KONECTA
 * Storage: Cloudflare R2 bucket konectaangola
 */

import { d1Client } from './d1Client';

export async function uploadToCloudflare(file: File, onProgress?: (progress: number) => void): Promise<string> {
  if (onProgress) onProgress(30);
  const { url, error } = await d1Client.uploadImage(file);
  if (onProgress) onProgress(100);

  if (error || !url) {
    throw new Error(error?.message || 'Falha no upload para o Cloudflare R2.');
  }

  return url;
}

export function getOptimizedImageUrl(url?: string | null, _width = 800): string {
  if (!url) return '';
  return url;
}

export function getThumbnailUrl(url?: string | null): string {
  if (!url) return '';
  return url;
}
