export async function uploadToCloudinary(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'veajfhm1';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'konecta_angola';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Resposta do Cloudinary sem URL segura.'));
          }
        } catch {
          reject(new Error('Erro ao processar resposta do Cloudinary.'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          const detail = errRes.error?.message || `Status ${xhr.status}`;
          reject(new Error(`Falha no upload para o Cloudinary: ${detail}`));
        } catch {
          reject(new Error(`Falha no upload para o Cloudinary (Código ${xhr.status}).`));
        }
      }
    };

    xhr.timeout = 15000; // 15 seconds max timeout
    xhr.ontimeout = () => {
      reject(new Error('O envio da imagem para o Cloudinary excedeu o tempo limite (15s). Verifique a sua ligação à internet.'));
    };

    xhr.onerror = () => {
      reject(new Error('Erro de ligação durante o envio da imagem para o Cloudinary. Tente novamente.'));
    };

    xhr.send(formData);
  });
}

/**
 * Returns a Cloudinary optimized image URL with auto-format, auto-quality, and responsive width.
 */
export function getOptimizedImageUrl(url?: string | null, width = 800): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  // Insert transformations after /upload/
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

/**
 * Returns a 200x200 cropped thumbnail for user avatars and preview cards.
 */
export function getThumbnailUrl(url?: string | null): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  return url.replace('/upload/', '/upload/f_auto,q_auto,w_200,h_200,c_fill/');
}
