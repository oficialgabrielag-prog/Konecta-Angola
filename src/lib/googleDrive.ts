import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

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
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- Google Picker Logic ---

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

export const createPicker = async (accessToken: string, callback: (data: any) => void) => {
  await loadGoogleScripts();

  const pickerOrigin =
    window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
  view.setMimeTypes('audio/*,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/m4a,audio/x-m4a,audio/flac,audio/ogg');

  const uploadView = new window.google.picker.DocsUploadView();

  const picker = new window.google.picker.PickerBuilder()
    .addView(view)
    .addView(uploadView)
    .setOAuthToken(accessToken)
    .setCallback(callback)
    .setOrigin(pickerOrigin)
    .setTitle('Selecionar Música do Google Drive')
    .build();
  
  picker.setVisible(true);
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
