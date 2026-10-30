import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWA';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition"
      >
        <Download className="w-4 h-4" />
        Instalar App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 transition"
        >
          <Download className="w-4 h-4" />
          Instalar no iOS
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-20 sm:items-center sm:pb-4"
            >
              <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Instalar no iPhone / iPad</h3>
                  <button onClick={() => setShowIOSGuide(false)} className="p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold">1</div>
                    <p>Toque no ícone de <strong>Partilhar</strong> <Share className="inline w-4 h-4 mb-1" /> na barra inferior do Safari.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold">2</div>
                    <p>Deslize para baixo e toque em <strong>Adicionar ao Ecrã Principal</strong>.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Entendi
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-black px-4 py-3 text-xs font-medium text-white shadow-2xl sm:left-auto sm:right-4 sm:w-80"
        >
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Modo Offline — Estamos a usar dados em cache para poupar o teu saldo.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
