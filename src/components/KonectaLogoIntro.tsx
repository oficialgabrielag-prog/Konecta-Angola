import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface KonectaLogoIntroProps {
  onComplete?: () => void;
  minDurationMs?: number;
  isReady?: boolean;
}

export const KonectaLogoIntro: React.FC<KonectaLogoIntroProps> = ({
  onComplete,
  minDurationMs = 2200,
  isReady = true
}) => {
  // Phase 0: Crisp K mark (0s - 0.35s)
  // Phase 1: K deconstructs cleanly into modern parallel & diagonal lines (0.35s - 1.15s)
  // Phase 2: Lines converge and snap smoothly back into solid K (1.15s - 1.75s)
  // Phase 3: Solid K + clean KONECTA wordmark reveal (1.75s - 2.2s)
  // Phase 4: Smooth exit fade into app
  const [phase, setPhase] = useState<number>(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 1150);
    const t3 = setTimeout(() => setPhase(3), 1700);
    const t4 = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [minDurationMs]);

  useEffect(() => {
    if (minTimeElapsed && isReady) {
      setPhase(4);
      const exitTimeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, 380);
      return () => clearTimeout(exitTimeout);
    }
  }, [minTimeElapsed, isReady, onComplete]);

  // Vertical stem line slices
  const stemLines = [
    { id: 's1', y: 36, offset: -54, color: '#F5BD35', delay: 0.01 },
    { id: 's2', y: 50, offset: 48, color: '#FFFFFF', delay: 0.03 },
    { id: 's3', y: 64, offset: -68, color: '#F5BD35', delay: 0.05 },
    { id: 's4', y: 78, offset: 60, color: '#FFFFFF', delay: 0.02 },
    { id: 's5', y: 92, offset: -44, color: '#F5BD35', delay: 0.04 },
    { id: 's6', y: 106, offset: 52, color: '#FFFFFF', delay: 0.03 },
    { id: 's7', y: 120, offset: -62, color: '#F5BD35', delay: 0.06 },
    { id: 's8', y: 134, offset: 44, color: '#FFFFFF', delay: 0.04 },
    { id: 's9', y: 148, offset: -52, color: '#F5BD35', delay: 0.02 },
    { id: 's10', y: 162, offset: 40, color: '#FFFFFF', delay: 0.05 },
  ];

  // Upper diagonal arm lines
  const armLines = [
    { id: 'a1', x1: 76, y1: 100, x2: 100, y2: 78, dx: 34, dy: -34, color: '#F5BD35', delay: 0.02 },
    { id: 'a2', x1: 95, y1: 82, x2: 122, y2: 58, dx: 54, dy: -46, color: '#FFFFFF', delay: 0.05 },
    { id: 'a3', x1: 116, y1: 64, x2: 142, y2: 42, dx: 72, dy: -52, color: '#F5BD35', delay: 0.01 },
    { id: 'a4', x1: 135, y1: 48, x2: 158, y2: 30, dx: 86, dy: -56, color: '#FFFFFF', delay: 0.04 },
  ];

  // Lower diagonal leg lines
  const legLines = [
    { id: 'l1', x1: 82, y1: 100, x2: 108, y2: 124, dx: 38, dy: 30, color: '#FFFFFF', delay: 0.03 },
    { id: 'l2', x1: 104, y1: 120, x2: 130, y2: 144, dx: 58, dy: 42, color: '#F5BD35', delay: 0.06 },
    { id: 'l3', x1: 124, y1: 138, x2: 150, y2: 162, dx: 76, dy: 52, color: '#FFFFFF', delay: 0.02 },
    { id: 'l4', x1: 142, y1: 154, x2: 165, y2: 172, dx: 92, dy: 58, color: '#F5BD35', delay: 0.05 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 4 ? 0 : 1 }}
      transition={{ duration: 0.38, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B1E3B] text-white overflow-hidden select-none"
    >
      {/* Subtle natural ambient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(245, 189, 53, 0.08) 0%, rgba(16, 45, 87, 0.35) 45%, rgba(6, 16, 33, 0.95) 100%)'
        }}
      />

      {/* Centered Logo Mark + Wordmark */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="KONECTA"
          >
            <defs>
              <linearGradient id="konectaKGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#F5BD35" />
                <stop offset="100%" stopColor="#E5A91F" />
              </linearGradient>
            </defs>

            {/* Solid Letter K */}
            <motion.g
              animate={{
                opacity: phase === 0 ? 1 : phase === 1 ? 0 : 1,
                scale: phase === 1 ? 0.94 : phase === 3 ? [0.97, 1.02, 1] : 1
              }}
              transition={{
                opacity: { duration: phase === 1 ? 0.14 : 0.32, ease: 'easeOut' },
                scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              }}
            >
              {/* Vertical Stem */}
              <rect
                x="50"
                y="30"
                width="28"
                height="140"
                rx="6"
                fill="url(#konectaKGold)"
              />

              {/* Upper Arm */}
              <path
                d="M 68 102 L 138 34 C 143 29, 151 29, 156 34 L 160 38 C 164 43, 163 51, 158 56 L 98 114 Z"
                fill="#FFFFFF"
              />

              {/* Lower Leg */}
              <path
                d="M 88 98 L 148 158 C 153 163, 154 171, 149 176 L 144 180 C 139 184, 131 183, 126 178 L 74 126 Z"
                fill="url(#konectaKGold)"
              />
            </motion.g>

            {/* Kinetic Line Deconstruction & Reassembly */}
            <AnimatePresence>
              {(phase === 1 || phase === 2) && (
                <g>
                  {stemLines.map((line) => {
                    const isDispersed = phase === 1;
                    return (
                      <motion.line
                        key={line.id}
                        initial={{ x1: 50, x2: 78, opacity: 1 }}
                        animate={{
                          x1: isDispersed ? 50 + line.offset * 1.2 : 50,
                          x2: isDispersed ? 78 + line.offset * 1.9 : 78,
                          opacity: isDispersed ? 0.9 : 1,
                          strokeWidth: isDispersed ? 3 : 2.5
                        }}
                        transition={{
                          duration: isDispersed ? 0.65 : 0.5,
                          delay: line.delay,
                          ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1]
                        }}
                        y1={line.y}
                        y2={line.y}
                        stroke={line.color}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {armLines.map((line) => {
                    const isDispersed = phase === 1;
                    return (
                      <motion.line
                        key={line.id}
                        initial={{
                          x1: line.x1,
                          y1: line.y1,
                          x2: line.x2,
                          y2: line.y2,
                          opacity: 1
                        }}
                        animate={{
                          x1: isDispersed ? line.x1 + line.dx * 0.6 : line.x1,
                          y1: isDispersed ? line.y1 + line.dy * 0.6 : line.y1,
                          x2: isDispersed ? line.x2 + line.dx * 1.35 : line.x2,
                          y2: isDispersed ? line.y2 + line.dy * 1.35 : line.y2,
                          opacity: isDispersed ? 0.9 : 1,
                          strokeWidth: isDispersed ? 3.5 : 2.5
                        }}
                        transition={{
                          duration: isDispersed ? 0.68 : 0.5,
                          delay: line.delay,
                          ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1]
                        }}
                        stroke={line.color}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {legLines.map((line) => {
                    const isDispersed = phase === 1;
                    return (
                      <motion.line
                        key={line.id}
                        initial={{
                          x1: line.x1,
                          y1: line.y1,
                          x2: line.x2,
                          y2: line.y2,
                          opacity: 1
                        }}
                        animate={{
                          x1: isDispersed ? line.x1 + line.dx * 0.6 : line.x1,
                          y1: isDispersed ? line.y1 + line.dy * 0.6 : line.y1,
                          x2: isDispersed ? line.x2 + line.dx * 1.35 : line.x2,
                          y2: isDispersed ? line.y2 + line.dy * 1.35 : line.y2,
                          opacity: isDispersed ? 0.9 : 1,
                          strokeWidth: isDispersed ? 3.5 : 2.5
                        }}
                        transition={{
                          duration: isDispersed ? 0.68 : 0.5,
                          delay: line.delay,
                          ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1]
                        }}
                        stroke={line.color}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* Clean Wordmark Reveal (No instructions, no slogan noise) */}
        <motion.div
          animate={{
            opacity: phase >= 2 ? 1 : 0,
            y: phase >= 2 ? 0 : 10
          }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 flex flex-col items-center"
        >
          <span className="text-2xl sm:text-3xl font-extrabold tracking-[0.28em] text-white">
            KONECTA
          </span>
          <span className="text-[10px] font-bold tracking-[0.38em] text-konecta-gold uppercase mt-1">
            Angola
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};
