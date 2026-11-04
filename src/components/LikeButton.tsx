import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onToggle: () => void;
  disabled?: boolean;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ isLiked, likesCount, onToggle, disabled }) => {
  const [showHearts, setShowHearts] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onToggle();
    if (!isLiked) {
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 800);
      navigator.vibrate?.(12);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-AO', { notation: 'compact' }).format(num);
  };

  return (
    <button onClick={handleClick} disabled={disabled} className="flex flex-col items-center group relative">
      <motion.div
        whileTap={{ scale: 0.8 }}
        animate={{ scale: isLiked ? 1.25 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Heart 
          size={30} 
          strokeWidth={isLiked ? 0 : 2}
          className={`${isLiked ? "fill-[#FF3040] text-[#FF3040]" : "text-white fill-white/10 group-hover:scale-110"} transition-all`} 
        />
      </motion.div>
      <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">{formatNumber(likesCount)}</span>
      
      <AnimatePresence>
        {showHearts && (
          [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0, y: 0, x: 0 }}
              animate={{ opacity: 0, scale: 1.5, y: -50, x: (i % 2 === 0 ? 1 : -1) * (i * 5) }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none"
            >
              <Heart size={16} fill="#FF3040" className="text-[#FF3040]" />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </button>
  );
};
