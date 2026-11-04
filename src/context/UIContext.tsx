import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ShareData {
  targetId: string;
  targetType: string;
  title: string;
  authorName: string;
  thumbnail?: string;
  videoUrl?: string;
  allowShares?: boolean;
}

interface ToastData {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface UIContextType {
  isCreateSheetOpen: boolean;
  setCreateSheetOpen: (open: boolean) => void;
  isShareSheetOpen: boolean;
  setShareSheetOpen: (open: boolean) => void;
  shareData: ShareData | null;
  openShareSheet: (data: ShareData) => void;
  createIntent: string | null;
  setCreateIntent: (intent: string | null) => void;
  isCreatePostModalOpen: boolean;
  setCreatePostModalOpen: (open: boolean) => void;
  toast: ToastData | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  hideToast: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isCreateSheetOpen, setCreateSheetOpen] = useState(false);
  const [isShareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [createIntent, setCreateIntent] = useState<string | null>(null);
  const [isCreatePostModalOpen, setCreatePostModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const openShareSheet = (data: ShareData) => {
    setShareData(data);
    setShareSheetOpen(true);
  };

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(curr => (curr?.id === id ? null : curr));
    }, 4500);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <UIContext.Provider value={{
      isCreateSheetOpen,
      setCreateSheetOpen,
      isShareSheetOpen,
      setShareSheetOpen,
      shareData,
      openShareSheet,
      createIntent,
      setCreateIntent,
      isCreatePostModalOpen,
      setCreatePostModalOpen,
      toast,
      showToast,
      hideToast
    }}>
      {children}
      {toast && (
        <div 
          role="alert"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] sm:w-auto px-5 py-3.5 bg-konecta-navy text-white shadow-2xl border-l-4 border-konecta-gold flex items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${toast.type === 'error' ? 'text-red-400' : toast.type === 'success' ? 'text-green-400' : 'text-konecta-gold'}`}>
              {toast.type === 'error' ? '!' : toast.type === 'success' ? '✓' : 'ℹ'}
            </span>
            <p className="text-xs sm:text-sm font-medium tracking-wide text-gray-100">{toast.message}</p>
          </div>
          <button 
            onClick={hideToast}
            aria-label="Fechar"
            className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const useToast = () => {
  const { showToast, hideToast } = useUI();
  return { showToast, hideToast };
};
