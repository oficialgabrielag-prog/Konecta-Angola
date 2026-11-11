import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface KonectaLogoIntroProps {
  onComplete?: () => void;
  minDurationMs?: number;
  isReady?: boolean;
}

export const KonectaLogoIntro: React.FC<KonectaLogoIntroProps> = ({
  onComplete,
  minDurationMs = 2800,
  isReady = true
}) => {
  // Phase of the animation:
  // 0: Initial clean letter K (0s - 0.4s)
  // 1: Deconstructing into kinetic modern lines (0.4s - 1.4s)
  // 2: Lines snapping & fusing back together (1.4s - 2.0s)
  // 3: Pristine Solid K + Brand reveal (2.0s - 2.8s)
  // 4: Smooth exit fade (2.8s+)
  const [phase, setPhase] = useState<number>(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);   // Deconstruct into lines
    const t2 = setTimeout(() => setPhase(2), 1400);  // Reassemble back
    const t3 = setTimeout(() => setPhase(3), 2000);  // Solidify & brand reveal
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

  // Once both the minimum duration elapsed and the application is ready (auth & data loaded)
  useEffect(() => {
    if (minTimeElapsed && isReady) {
      setPhase(4);
      const exitTimeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, 450);
      return () => clearTimeout(exitTimeout);
    }
  }, [minTimeElapsed, isReady, onComplete]);

  // Slices of the letter K for the line deconstruction
  // Vertical stem slices (left column of the K)
  const stemLines = [
    { id: 's1', y: 35, offset: -65, color: '#F5BD35', delay: 0.02 },
    { id: 's2', y: 50, offset: 55, color: '#FFFFFF', delay: 0.05 },
    { id: 's3', y: 65, offset: -80, color: '#38BDF8', delay: 0.08 },
    { id: 's4', y: 80, offset: 70, color: '#F5BD35', delay: 0.03 },
    { id: 's5', y: 95, offset: -50, color: '#FFFFFF', delay: 0.07 },
    { id: 's6', y: 110, offset: 60, color: '#F5BD35', delay: 0.04 },
    { id: 's7', y: 125, offset: -75, color: '#38BDF8', delay: 0.09 },
    { id: 's8', y: 140, offset: 50, color: '#FFFFFF', delay: 0.06 },
    { id: 's9', y: 155, offset: -60, color: '#F5BD35', delay: 0.02 },
  ];

  // Diagonal arm lines (upper branch of the K)
  const armLines = [
    { id: 'a1', x1: 76, y1: 100, x2: 100, y2: 78, dx: 40, dy: -40, color: '#F5BD35', delay: 0.04 },
    { id: 'a2', x1: 95, y1: 82, x2: 122, y2: 58, dx: 65, dy: -55, color: '#38BDF8', delay: 0.08 },
    { id: 'a3', x1: 116, y1: 64, x2: 142, y2: 42, dx: 85, dy: -60, color: '#FFFFFF', delay: 0.02 },
    { id: 'a4', x1: 135, y1: 48, x2: 158, y2: 30, dx: 100, dy: -65, color: '#F5BD35', delay: 0.07 },
  ];

  // Diagonal leg lines (lower branch of the K)
  const legLines = [
    { id: 'l1', x1: 82, y1: 100, x2: 108, y2: 124, dx: 45, dy: 35, color: '#FFFFFF', delay: 0.05 },
    { id: 'l2', x1: 104, y1: 120, x2: 130, y2: 144, dx: 70, dy: 50, color: '#F5BD35', delay: 0.09 },
    { id: 'l3', x1: 124, y1: 138, x2: 150, y2: 162, dx: 95, dy: 60, color: '#38BDF8', delay: 0.03 },
    { id: 'l4', x1: 142, y1: 154, x2: 165, y2: 172, dx: 110, dy: 65, color: '#F5BD35', delay: 0.08 },
  ];

  // Dynamic light burst lines
  const burstLines = [
    { id: 'b1', x1: 15, y1: 70, x2: 60, y2: 70, delay: 0.08 },
    { id: 'b2', x1: 135, y1: 40, x2: 185, y2: 25, delay: 0.12 },
    { id: 'b3', x1: 140, y1: 160, x2: 195, y2: 180, delay: 0.1 },
    { id: 'b4', x1: 5, y1: 130, x2: 50, y2: 130, delay: 0.14 },
    { id: 'b5', x1: 70, y1: 10, x2: 70, y2: 45, delay: 0.11 },
    { id: 'b6', x1: 75, y1: 160, x2: 75, y2: 195, delay: 0.13 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 4 ? 0 : 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#060D1A] via-[#0A1830] to-[#040810] text-white overflow-hidden select-none cursor-default"
      style={{ backdropFilter: 'blur(20px)' }}
    >
      {/* Background Animated Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid lines in background */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #F5BD35 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Deep ambient radial glow */}
        <motion.div
          animate={{
            scale: phase === 1 ? [1, 1.4, 1.15] : phase >= 2 ? [1.15, 1.3, 1] : 1,
            opacity: phase === 1 ? 0.4 : phase >= 2 ? 0.55 : 0.25
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-konecta-navy via-konecta-gold/30 to-sky-500/25 blur-3xl pointer-events-none"
        />

        {/* Ambient energy ring */}
        <motion.div
          animate={{
            rotate: 360,
            scale: phase === 1 ? 1.2 : 1
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 0.6 }
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-white/5 pointer-events-none"
        />
      </div>

      {/* Main Kinetic Logo Container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* The Animated "K" SVG Canvas */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Golden metallic gradient */}
              <linearGradient id="goldBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#F5BD35" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              {/* Cyan / Tech neon gradient */}
              <linearGradient id="techBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F5BD35" stopOpacity="0.9" />
              </linearGradient>

              {/* Solid K Fill Gradient */}
              <linearGradient id="solidKGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#F5BD35" />
                <stop offset="100%" stopColor="#E5B842" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ======================================================== */}
            {/* LAYER 1: SOLID LETTER "K" (Visible in Phase 0 & Phase 3) */}
            {/* ======================================================== */}
            <motion.g
              animate={{
                opacity: phase === 0 ? 1 : phase === 1 ? 0 : phase >= 2 ? 1 : 0,
                scale: phase === 1 ? 0.92 : phase === 3 ? [0.96, 1.05, 1] : 1
              }}
              transition={{
                opacity: { duration: phase === 1 ? 0.18 : 0.4 },
                scale: { duration: 0.5, ease: 'easeOut' }
              }}
            >
              {/* Vertical stem of K */}
              <rect
                x="50"
                y="30"
                width="28"
                height="140"
                rx="6"
                fill="url(#solidKGrad)"
                filter={phase >= 2 ? 'url(#neonGlow)' : undefined}
              />

              {/* Upper diagonal arm */}
              <path
                d="M 68 102 L 138 34 C 143 29, 151 29, 156 34 L 160 38 C 164 43, 163 51, 158 56 L 98 114 Z"
                fill="url(#solidKGrad)"
                filter={phase >= 2 ? 'url(#neonGlow)' : undefined}
              />

              {/* Lower diagonal leg */}
              <path
                d="M 88 98 L 148 158 C 153 163, 154 171, 149 176 L 144 180 C 139 184, 131 183, 126 178 L 74 126 Z"
                fill="url(#solidKGrad)"
                filter={phase >= 2 ? 'url(#neonGlow)' : undefined}
              />
            </motion.g>

            {/* ======================================================== */}
            {/* LAYER 2: LINE DECONSTRUCTION MATRIX (Active in Phase 1 & 2) */}
            {/* ======================================================== */}
            <AnimatePresence>
              {(phase === 1 || phase === 2) && (
                <g filter="url(#neonGlow)">
                  {/* STEM SLICE LINES */}
                  {stemLines.map((line) => {
                    const isDispersed = phase === 1;
                    return (
                      <motion.g key={line.id}>
                        {/* Horizontal laser slices expanding & shooting out */}
                        <motion.line
                          initial={{ x1: 50, x2: 78, opacity: 1 }}
                          animate={{
                            x1: isDispersed ? 50 + line.offset * 1.5 : 50,
                            x2: isDispersed ? 78 + line.offset * 2.4 : 78,
                            opacity: isDispersed ? [0.6, 1, 0.85] : 1,
                            strokeWidth: isDispersed ? [2, 4, 2] : 2
                          }}
                          transition={{
                            duration: isDispersed ? 0.75 : 0.55,
                            delay: line.delay,
                            ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.34, 1.56, 0.64, 1]
                          }}
                          y1={line.y}
                          y2={line.y}
                          stroke={line.color}
                          strokeLinecap="round"
                        />

                        {/* Tech particle at the end of each moving line */}
                        {isDispersed && (
                          <motion.circle
                            initial={{ cx: 78, cy: line.y, opacity: 0 }}
                            animate={{
                              cx: 78 + line.offset * 2.4,
                              cy: line.y,
                              opacity: [0, 1, 0],
                              r: [1, 3, 1]
                            }}
                            transition={{ duration: 0.65, delay: line.delay + 0.1 }}
                            fill={line.color}
                          />
                        )}
                      </motion.g>
                    );
                  })}

                  {/* UPPER ARM LINES */}
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
                          x1: isDispersed ? line.x1 + line.dx * 0.7 : line.x1,
                          y1: isDispersed ? line.y1 + line.dy * 0.7 : line.y1,
                          x2: isDispersed ? line.x2 + line.dx * 1.6 : line.x2,
                          y2: isDispersed ? line.y2 + line.dy * 1.6 : line.y2,
                          opacity: isDispersed ? [0.7, 1, 0.9] : 1,
                          strokeWidth: isDispersed ? [2, 4.5, 2.5] : 2
                        }}
                        transition={{
                          duration: isDispersed ? 0.8 : 0.55,
                          delay: line.delay,
                          ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.34, 1.56, 0.64, 1]
                        }}
                        stroke={line.color}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* LOWER LEG LINES */}
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
                          x1: isDispersed ? line.x1 + line.dx * 0.7 : line.x1,
                          y1: isDispersed ? line.y1 + line.dy * 0.7 : line.y1,
                          x2: isDispersed ? line.x2 + line.dx * 1.6 : line.x2,
                          y2: isDispersed ? line.y2 + line.dy * 1.6 : line.y2,
                          opacity: isDispersed ? [0.7, 1, 0.9] : 1,
                          strokeWidth: isDispersed ? [2, 4.5, 2.5] : 2
                        }}
                        transition={{
                          duration: isDispersed ? 0.8 : 0.55,
                          delay: line.delay,
                          ease: isDispersed ? [0.16, 1, 0.3, 1] : [0.34, 1.56, 0.64, 1]
                        }}
                        stroke={line.color}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* HIGH-VELOCITY BURST ACCENTS (Phase 1 only) */}
                  {phase === 1 &&
                    burstLines.map((burst) => (
                      <motion.line
                        key={burst.id}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: [0, 1, 0],
                          opacity: [0, 0.9, 0]
                        }}
                        transition={{ duration: 0.65, delay: burst.delay }}
                        x1={burst.x1}
                        y1={burst.y1}
                        x2={burst.x2}
                        y2={burst.y2}
                        stroke="#F5BD35"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="4 4"
                      />
                    ))}
                </g>
              )}
            </AnimatePresence>

            {/* ======================================================== */}
            {/* LAYER 3: LIGHT FLASH / RECONSTRUCTION SWEEP (Phase 2 & 3) */}
            {/* ======================================================== */}
            {phase >= 2 && (
              <motion.circle
                initial={{ cx: 100, cy: 100, r: 0, opacity: 0 }}
                animate={{
                  r: [0, 65, 130],
                  opacity: [0.95, 0.45, 0]
                }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                stroke="#F5BD35"
                strokeWidth="1.5"
                fill="none"
              />
            )}
          </svg>
        </div>

        {/* Brand Name Typography Reveal */}
        <div className="mt-4 flex flex-col items-center justify-center space-y-1">
          <motion.div
            animate={{
              opacity: phase >= 2 ? 1 : 0.25,
              letterSpacing: phase >= 2 ? '0.3em' : '0.1em',
              y: phase >= 2 ? 0 : 8
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex items-center gap-1"
          >
            <h1 className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-white">
              KONECT<span className="text-konecta-gold">A</span>
            </h1>
          </motion.div>

          <motion.div
            animate={{
              opacity: phase >= 3 ? 1 : 0,
              y: phase >= 3 ? 0 : 6
            }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-konecta-gold" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.35em] text-konecta-gold uppercase">
              Angola
            </span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-konecta-gold" />
          </motion.div>

          <motion.p
            animate={{
              opacity: phase >= 3 ? 0.75 : 0
            }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-[11px] text-gray-400 font-medium tracking-wider pt-2"
          >
            Onde o Futuro Conecta
          </motion.p>
        </div>
      </div>

      {/* Modern High-Tech Bottom Indicator */}
      <div className="absolute bottom-10 inset-x-0 flex flex-col items-center justify-center space-y-2 pointer-events-none">
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-konecta-gold to-transparent"
          />
        </div>
        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
          {phase < 2 ? 'A inicializar sistema...' : 'Pronto'}
        </span>
      </div>

      {/* Skip button in top corner */}
      <button
        onClick={() => {
          setPhase(4);
          if (onComplete) onComplete();
        }}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-gray-400 hover:text-white transition-all cursor-pointer backdrop-blur-md"
      >
        Saltar intro ✕
      </button>
    </motion.div>
  );
};
