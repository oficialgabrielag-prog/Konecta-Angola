import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  images?: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, images, initialIndex = 0, onClose }) => {
  const imageList = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
  }, [imageUrl, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && imageList.length > 1) {
        setScale(1);
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
      }
      if (e.key === 'ArrowRight' && imageList.length > 1) {
        setScale(1);
        setCurrentIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageList.length, onClose]);

  if (imageList.length === 0) return null;

  const currentImg = imageList[currentIndex];

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.8));
  const handleResetZoom = () => setScale(1);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setCurrentIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative max-w-6xl max-h-[92vh] w-full h-full flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Controls */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2 bg-black/60 p-1.5 rounded-full border border-white/20 backdrop-blur-md">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Aumentar zoom (+)"
            >
              <span className="material-symbols-outlined text-xl">zoom_in</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Diminuir zoom (-)"
            >
              <span className="material-symbols-outlined text-xl">zoom_out</span>
            </button>
            {scale !== 1 && (
              <button
                onClick={handleResetZoom}
                className="px-2.5 py-1 text-xs font-bold text-konecta-gold rounded-full hover:bg-white/20 transition-colors"
                title="Repor tamanho"
              >
                100%
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Fechar (ESC)"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Previous / Next Buttons */}
          {imageList.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all"
                title="Anterior"
              >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all"
                title="Seguinte"
              >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
              </button>
            </>
          )}

          {/* Main Image Container */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
            <motion.img
              key={currentImg}
              src={currentImg}
              alt="Fotografia em ecrã completo"
              animate={{ scale }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onDoubleClick={() => setScale(prev => (prev === 1 ? 2 : 1))}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
            />
          </div>

          {/* Indicator */}
          {imageList.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-xs font-bold text-white backdrop-blur-md">
              {currentIndex + 1} / {imageList.length}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
