import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace scopes for Google Drive document access and management
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
}

export interface DrivePickerOptions {
  mimeTypes?: string;
  title?: string;
  allowUpload?: boolean;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso da autenticação Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in Google Drive error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentDriveUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- Google Drive REST API Helpers ---

/**
 * Lists documents from user's Google Drive.
 */
export const listDriveDocuments = async (
  accessToken: string,
  options?: {
    search?: string;
    filterType?: 'all' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'image';
    pageSize?: number;
  }
): Promise<DriveFileItem[]> => {
  const pageSize = options?.pageSize || 30;
  let qParts = ["trashed = false and mimeType != 'application/vnd.google-apps.folder'"];

  if (options?.search && options.search.trim().length > 0) {
    const cleanSearch = options.search.replace(/'/g, "\\'");
    qParts.push(`name contains '${cleanSearch}'`);
  }

  if (options?.filterType === 'pdf') {
    qParts.push("mimeType = 'application/pdf'");
  } else if (options?.filterType === 'doc') {
    qParts.push("(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'text/plain')");
  } else if (options?.filterType === 'sheet') {
    qParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.ms-excel' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'text/csv')");
  } else if (options?.filterType === 'slide') {
    qParts.push("(mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/vnd.ms-powerpoint' or mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation')");
  } else if (options?.filterType === 'image') {
    qParts.push("mimeType contains 'image/'");
  }

  const query = qParts.join(' and ');
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,iconLink,thumbnailLink,webViewLink,webContentLink,modifiedTime)&pageSize=${pageSize}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Erro ao consultar Google Drive (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  return (data.files || []) as DriveFileItem[];
};

/**
 * Downloads or exports a Drive file into a standard Blob.
 * If file is a native Google Doc/Sheet/Presentation, it exports to PDF.
 */
export const downloadOrExportDriveFile = async (
  file: DriveFileItem,
  accessToken: string
): Promise<{ blob: Blob; mimeType: string; fileName: string }> => {
  const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
  const isGoogleSlide = file.mimeType === 'application/vnd.google-apps.presentation';

  if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
    // Export to PDF
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Falha ao exportar documento do Google (${res.status})`);
    }
    const blob = await res.blob();
    const cleanName = file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`;
    return { blob, mimeType: 'application/pdf', fileName: cleanName };
  }

  // Regular binary download
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao descarregar ficheiro do Google Drive (${res.status})`);
  }
  const blob = await res.blob();
  return { blob, mimeType: file.mimeType, fileName: file.name };
};

export const downloadDriveFile = async (fileId: string, accessToken: string): Promise<Blob> => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Falha ao descarregar ficheiro do Google Drive (${response.status}: ${errText || response.statusText})`);
  }

  return await response.blob();
};

// --- Google Picker Script Loader & Builder ---

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const loadGoogleScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) {
      resolve();
      return;
    }

    const initPicker = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          if (window.google?.picker) {
            resolve();
          } else {
            setTimeout(() => {
              if (window.google?.picker) resolve();
              else reject(new Error('Não foi possível carregar a API do Google Picker.'));
            }, 300);
          }
        });
      } else {
        reject(new Error('A biblioteca gapi não está disponível.'));
      }
    };

    if (window.gapi) {
      initPicker();
    } else {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        initPicker();
      };
      script.onerror = () => {
        reject(new Error('Falha ao carregar o script do Google API.'));
      };
      document.body.appendChild(script);
    }
  });
};

/**
 * Launches the native Google Picker UI with backward compatibility for MusicManager
 */
export const createPicker = async (
  accessToken: string,
  callbackOrOptions: ((data: any) => void) | DrivePickerOptions,
  maybeCallback?: (data: any) => void
) => {
  await loadGoogleScripts();

  let callback: (data: any) => void;
  let options: DrivePickerOptions = {};

  if (typeof callbackOrOptions === 'function') {
    callback = callbackOrOptions;
  } else {
    options = callbackOrOptions || {};
    callback = maybeCallback || (() => {});
  }

  const pickerOrigin =
    window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
  if (options.mimeTypes) {
    view.setMimeTypes(options.mimeTypes);
  }

  const pickerBuilder = new window.google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken)
    .setCallback(callback)
    .setOrigin(pickerOrigin)
    .setTitle(options.title || 'Selecionar Documento do Google Drive');

  if (options.allowUpload !== false) {
    const uploadView = new window.google.picker.DocsUploadView();
    pickerBuilder.addView(uploadView);
  }

  const picker = pickerBuilder.build();
  picker.setVisible(true);
};
