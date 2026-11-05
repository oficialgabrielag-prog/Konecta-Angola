/**
 * Cloudinary para o KONECTA Angola: envio com progresso real e entrega otimizada.
 *
 * Variáveis de ambiente (Vite):
 *  VITE_CLOUDINARY_CLOUD_NAME
 *  VITE_CLOUDINARY_UPLOAD_PRESET           (por defeito, para tudo)
 *  VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE     (opcional)
 *  VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO     (opcional)
 *  VITE_CLOUDINARY_UPLOAD_PRESET_AUDIO     (opcional)
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'veajfhm1';
const PRESET_DEFAULT = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'konecta_angola';
const PRESET_IMAGE = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE || PRESET_DEFAULT;
const PRESET_VIDEO = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO || PRESET_DEFAULT;
const PRESET_AUDIO = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_AUDIO || PRESET_DEFAULT;

/** Limites do plano do Cloudinary (imagem 10 MB, vídeo 100 MB). */
export const UPLOAD_LIMITS = {
  imageBytes: 10 * 1024 * 1024,
  videoBytes: 100 * 1024 * 1024,
  audioBytes: 100 * 1024 * 1024,
  reelSeconds: 90,
  imageMaxSide: 2560,
};

export type UploadKind =
  | 'avatar' | 'cover' | 'post' | 'reel' | 'music' | 'book'
  | 'event' | 'chat' | 'document' | 'other';

const KIND_FOLDER: Record<UploadKind, string> = {
  avatar: 'konecta/avatars',
  cover: 'konecta/covers',
  post: 'konecta/posts',
  reel: 'konecta/reels',
  music: 'konecta/music',
  book: 'konecta/books',
  event: 'konecta/events',
  chat: 'konecta/chat',
  document: 'konecta/documents',
  other: 'konecta/other',
};

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

export interface UploadOptions {
  kind?: UploadKind;
  /** Id de quem envia (fica numa etiqueta, útil para limpezas). */
  userId?: string;
  /** Texto alternativo guardado como contexto do ficheiro. */
  alt?: string;
  signal?: AbortSignal;
}

/* ------------------------------------------------------------------ */
/* Envio                                                               */
/* ------------------------------------------------------------------ */

function detectType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  if (/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name)) return 'audio';
  if (/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) return 'video';
  return 'image';
}

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/** Reduz fotos grandes no telemóvel antes de enviar (poupa dados e armazenamento). */
async function downscaleImage(file: File): Promise<File> {
  const type = file.type;
  if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') return file;
  if (typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, UPLOAD_LIMITS.imageMaxSide / longest);
  if (scale === 1 && file.size <= 3 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const outType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outType, 0.86)
  );
  if (!blob || blob.size >= file.size) return file;
  const ext = outType === 'image/png' ? 'png' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return new File([blob], `${base}.${ext}`, { type: outType });
}

function xhrUpload(
  url: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      let json: any = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* resposta sem JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.secure_url) {
        resolve(json);
      } else {
        const err: any = new Error(json?.error?.message || `Falha no envio (${xhr.status}).`);
        err.status = xhr.status;
        reject(err);
      }
    };
    xhr.onerror = () => {
      const err: any = new Error('Sem ligação à internet. Verifica a rede e tenta de novo.');
      err.network = true;
      reject(err);
    };
    xhr.ontimeout = xhr.onerror;
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Envio cancelado.', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Envio cancelado.', 'AbortError'));
      });
    }
    xhr.send(form);
  });
}

export async function uploadMediaToCloudinary(
  originalFile: File,
  onProgress?: (percent: number) => void,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const kind: UploadKind = options.kind ?? 'other';
  const type = detectType(originalFile);

  // Validações antes de gastar dados
  if (type === 'image' && originalFile.size > UPLOAD_LIMITS.imageBytes * 3) {
    throw new Error(`A imagem é demasiado grande (${megabytes(originalFile.size)} MB).`);
  }
  if (type === 'video') {
    if (originalFile.size > UPLOAD_LIMITS.videoBytes) {
      throw new Error(
        `O vídeo tem ${megabytes(originalFile.size)} MB. O máximo é ${megabytes(UPLOAD_LIMITS.videoBytes)} MB.`
      );
    }
    if (kind === 'reel') {
      const seconds = await probeVideoDuration(originalFile);
      if (seconds && seconds > UPLOAD_LIMITS.reelSeconds) {
        throw new Error(`O reel pode ter no máximo ${UPLOAD_LIMITS.reelSeconds} segundos.`);
      }
    }
  }
  if (type === 'audio' && originalFile.size > UPLOAD_LIMITS.audioBytes) {
    throw new Error(`O áudio é demasiado grande (${megabytes(originalFile.size)} MB).`);
  }

  const file = type === 'image' ? await downscaleImage(originalFile) : originalFile;
  if (type === 'image' && file.size > UPLOAD_LIMITS.imageBytes) {
    throw new Error(
      `A imagem tem ${megabytes(file.size)} MB. O máximo é ${megabytes(UPLOAD_LIMITS.imageBytes)} MB.`
    );
  }

  const resourceType = type === 'image' ? 'image' : 'video'; // áudio também usa "video" no Cloudinary
  const preset = type === 'image' ? PRESET_IMAGE : type === 'video' ? PRESET_VIDEO : PRESET_AUDIO;

  const tags = ['konecta', kind];
  if (options.userId) tags.push(`user_${options.userId}`);

  const buildForm = () => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    form.append('folder', KIND_FOLDER[kind]);
    form.append('tags', tags.join(','));
    if (options.alt) {
      form.append('context', `alt=${options.alt.replace(/[|=]/g, ' ').slice(0, 200)}`);
    }
    return form;
  };

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  onProgress?.(1);

  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json = await xhrUpload(endpoint, buildForm(), onProgress, options.signal);
      onProgress?.(100);
      return {
        secure_url: json.secure_url,
        public_id: json.public_id,
        resource_type: json.resource_type || resourceType,
        format: json.format,
        duration: json.duration,
        width: json.width,
        height: json.height,
        bytes: json.bytes,
      };
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'AbortError') throw err;
      if (!err?.network) break; // erros do Cloudinary (4xx) não se repetem
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  console.error('Erro de envio Cloudinary:', lastError);
  throw new Error(lastError?.message || 'Falha ao comunicar com o Cloudinary.');
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
  options: UploadOptions = {}
): Promise<string> {
  const result = await uploadMediaToCloudinary(file, onProgress, options);
  return result.secure_url;
}

/* ------------------------------------------------------------------ */
/* Entrega otimizada (URLs)                                            */
/* ------------------------------------------------------------------ */

const UPLOAD_MARK = '/upload/';

function isCloudinaryUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\/res\.cloudinary\.com\//.test(url) && url.includes(UPLOAD_MARK);
}

/** Já tem transformações? (depois de /upload/ não começa por v123/ nem pelo id) */
function hasTransformation(url: string): boolean {
  const rest = url.split(UPLOAD_MARK)[1] || '';
  const first = rest.split('/')[0];
  return !!first && !/^v\d+$/.test(first) && /[a-z]{1,3}_[^/]/.test(first) && rest.includes('/');
}

function inject(url: string, transformation: string): string {
  const [head, tail] = url.split(UPLOAD_MARK);
  return `${head}${UPLOAD_MARK}${transformation}/${tail}`;
}

export interface ImageOptions {
  /** Largura máxima em píxeis CSS (o pedido sai a 2x, até ao limite). */
  w: number;
  h?: number;
  crop?: 'limit' | 'fill';
  gravity?: 'auto' | 'face';
}

/** Imagem otimizada: formato e qualidade automáticos, sem ampliar. */
export function cldImage(url: string | null | undefined, opts: ImageOptions): string | undefined {
  if (!url) return undefined;
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url;
  const width = Math.min(Math.round(opts.w * 2), 2560);
  let t: string;
  if (opts.crop === 'fill' && opts.h) {
    const height = Math.round(opts.h * 2);
    t = `c_fill,g_${opts.gravity || 'auto'},h_${height},w_${width}`;
  } else {
    t = `c_limit,w_${width}`;
  }
  return inject(url, `${t}/f_auto/q_auto`);
}

/** Lista de tamanhos para <img srcSet>. */
export function cldSrcSet(
  url: string | null | undefined,
  widths: number[] = [320, 480, 640, 828, 1080, 1440]
): string {
  if (!url || !isCloudinaryUrl(url) || hasTransformation(url)) return '';
  return widths
    .map((w) => `${inject(url, `c_limit,w_${w}/f_auto/q_auto`)} ${w}w`)
    .join(', ');
}

/** Foto de perfil redonda (o recorte acompanha o rosto). */
export function cldAvatar(url: string | null | undefined, size = 48): string | undefined {
  if (!url) return undefined;
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url;
  const px = Math.min(size * 2, 512);
  return inject(url, `c_fill,g_face,h_${px},w_${px}/f_auto/q_auto`);
}

/** Capa com proporção fixa. */
export function cldCover(
  url: string | null | undefined,
  w: number,
  ratio: '16:9' | '4:3' | '1:1' | '3:4' = '16:9'
): string | undefined {
  if (!url) return undefined;
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url;
  return inject(url, `ar_${ratio},c_fill,g_auto,w_${Math.min(w * 2, 2560)}/f_auto/q_auto`);
}

/** Miniatura minúscula e desfocada para mostrar enquanto a imagem carrega. */
export function cldBlurPlaceholder(url: string | null | undefined): string {
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return '';
  return inject(url, 'c_limit,w_24/e_blur:800/q_auto:low');
}

/** Vídeo para reprodução: largura máxima 720 px e qualidade automática (mantém .mp4). */
export function cldVideo(url: string | null | undefined, width = 720): string {
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url || '';
  return inject(url, `c_limit,w_${width}/q_auto:good`);
}

/** Imagem de capa (poster) tirada do primeiro segundo do vídeo. */
export function cldVideoPoster(url: string | null | undefined, width = 540): string {
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return '';
  const poster = inject(url, `so_0,c_limit,w_${Math.min(width, 1080)}/q_auto`);
  return poster.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg$1');
}

/** Pré-visualização curta, sem som e leve, para feed e Explorar. */
export function cldVideoPreview(
  url: string | null | undefined,
  seconds = 5,
  width = 360
): string {
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url || '';
  return inject(url, `du_${seconds},so_0/c_limit,w_${width}/ac_none/q_auto:low`);
}

function safeHandle(value: string): string {
  return value.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 30);
}

/**
 * Versão para guardar/partilhar com marca de água KONECTA e @utilizador
 * (queimada no vídeo). Só deve ser pedida quando a pessoa guarda ou partilha
 * o ficheiro, nunca na reprodução normal.
 */
export function cldReelDownload(
  url: string | null | undefined,
  username: string,
  fileName = 'konecta-reel'
): string {
  if (!isCloudinaryUrl(url) || hasTransformation(url)) return url || '';
  const handle = encodeURIComponent(safeHandle(username) || 'konecta');
  const safeName = fileName.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || 'konecta-reel';
  const t = [
    'c_limit,w_720',
    'co_white,l_text:Arial_34_bold:KONECTA,o_75',
    'fl_layer_apply,g_south_east,x_28,y_100',
    `co_white,l_text:Arial_26:%40${handle},o_75`,
    'fl_layer_apply,g_south_east,x_28,y_60',
    'q_auto:good',
    `fl_attachment:${safeName}`,
  ].join('/');
  return inject(url, t);
}

/* Compatibilidade com o código antigo */
export function getOptimizedImageUrl(url?: string | null, width = 800): string | undefined {
  return cldImage(url, { w: Math.max(1, Math.round(width / 2)) });
}

export function getThumbnailUrl(url?: string | null): string | undefined {
  return cldImage(url, { w: 100 });
}

/** Fotogramas espalhados pelo vídeo para moderação da OpenAI. */
export function cldVideoFrames(
  url: string | null | undefined,
  durationSeconds: number = 10,
  count = 4
): string[] {
  if (!url || !isCloudinaryUrl(url)) return [];
  const dur = Math.max(1, durationSeconds || 10);
  const times: number[] = [];

  if (count <= 1) {
    times.push(1);
  } else if (count === 2) {
    times.push(1, Math.max(1, dur - 1));
  } else if (count === 3) {
    times.push(1, Math.round(dur * 0.5), Math.max(1, dur - 1));
  } else {
    times.push(
      1,
      Math.max(1, Math.round(dur * 0.33)),
      Math.max(1, Math.round(dur * 0.66)),
      Math.max(1, Math.round(dur - 1))
    );
  }

  const uniqueTimes = Array.from(new Set(times));

  return uniqueTimes.map((sec) => {
    const frameUrl = inject(url, `so_${sec},c_limit,w_640/q_auto`);
    return frameUrl.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg$1');
  });
}

