/**
 * Cloudinary Storage Adapter for KONECTA Angola
 * Cloud Name: veajfhm1
 * Upload Preset: konecta_angola
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'veajfhm1';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'konecta_angola';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  bytes?: number;
}

export async function uploadToCloudinary(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadMediaToCloudinary(file, onProgress);
  return result.secure_url;
}

export async function uploadMediaToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> {
  if (onProgress) onProgress(15);

  const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i);
  const resourceType = isVideo ? 'video' : 'image';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  if (onProgress) onProgress(35);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: formData
    });

    if (onProgress) onProgress(85);

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.secure_url || !json?.public_id) {
      console.error('Cloudinary upload error:', json);
      throw new Error(json?.error?.message || `Falha no envio de ${resourceType} para o Cloudinary (public_id ausente).`);
    }

    if (onProgress) onProgress(100);

    return {
      secure_url: json.secure_url,
      public_id: json.public_id,
      resource_type: json.resource_type || resourceType,
      format: json.format,
      duration: json.duration,
      width: json.width,
      height: json.height,
      bytes: json.bytes
    };
  } catch (err: any) {
    console.error('Erro de envio Cloudinary:', err);
    throw new Error(err.message || 'Falha ao comunicar com o Cloudinary.');
  }
}

export function getOptimizedImageUrl(url?: string | null, width = 800): string {
  if (!url) return '';
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`);
  }
  return url;
}

export function getThumbnailUrl(url?: string | null): string {
  return getOptimizedImageUrl(url, 200);
}

