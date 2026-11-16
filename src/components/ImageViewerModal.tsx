import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { PinchZoomImage } from './PinchZoomImage';

interface ImageViewerModalProps {
  imageUrl: string | null;
  images?: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, images, initialIndex = 0, onClose }) => {
  const imageList = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [imageUrl, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && imageList.length > 1) {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
      }
      if (e.key === 'ArrowRight' && imageList.length > 1) {
        setCurrentIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageList.length, onClose]);

  if (imageList.length === 0) return null;

  const currentImg = imageList[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className="relative max-w-6xl max-h-[94vh] w-full h-full flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button Only (No zoom icons) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 sm:top-4 sm:right-4 z-50 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          {/* Previous / Next Buttons */}
          {imageList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all"
                aria-label="Anterior"
              >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all"
                aria-label="Seguinte"
              >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
              </button>
            </>
          )}

          {/* Pinch-to-Zoom Photo Stage */}
          <PinchZoomImage
            key={currentImg}
            src={currentImg}
            alt="Fotografia"
            mode="viewer"
            loading="eager"
            className="w-full h-full flex items-center justify-center overflow-hidden"
            imgClassName="max-w-full max-h-[86vh] object-contain rounded-2xl shadow-2xl"
          />

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
