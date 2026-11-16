import React, { useRef, useState, useEffect, useCallback } from 'react';

interface PinchZoomImageProps {
  src?: string;
  fallbackSrc?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  mode?: 'inline' | 'viewer';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function getTouchDistance(t1: React.Touch, t2: React.Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}

function getTouchCenter(t1: React.Touch, t2: React.Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

function stripCloudinaryTransforms(url: string): string {
  const marker = '/upload/';
  if (!url.includes('res.cloudinary.com/') || !url.includes(marker)) return url;
  const [head, tail] = url.split(marker);
  const parts = tail.split('/');
  const vIndex = parts.findIndex((seg) => /^v\d+$/.test(seg));
  if (vIndex > 0) {
    return `${head}${marker}${parts.slice(vIndex).join('/')}`;
  }
  return url;
}

export const PinchZoomImage: React.FC<PinchZoomImageProps> = ({
  src,
  fallbackSrc,
  srcSet,
  sizes,
  alt = '',
  className = '',
  imgClassName = '',
  mode = 'inline',
  loading = 'eager',
  decoding = 'async',
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(src || fallbackSrc);
  const [disableSrcSet, setDisableSrcSet] = useState(false);
  const [triedRawFallback, setTriedRawFallback] = useState(false);

  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const pinchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lastTapRef = useRef<number>(0);
  const suppressClickUntilRef = useRef<number>(0);

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsGestureActive(false);
    setResolvedSrc(src || fallbackSrc);
    setDisableSrcSet(false);
    setTriedRawFallback(false);
  }, [src, fallbackSrc]);

  const clampTranslate = useCallback((nextX: number, nextY: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const el = containerRef.current;
    if (!el) return { x: nextX, y: nextY };
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(0, ((currentScale - 1) * rect.width) / 2);
    const maxY = Math.max(0, ((currentScale - 1) * rect.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = getTouchDistance(t1, t2);
      pinchStartScaleRef.current = scale;
      pinchStartCenterRef.current = getTouchCenter(t1, t2);
      pinchStartTranslateRef.current = translate;
      panStartRef.current = null;
      setIsGestureActive(true);
      suppressClickUntilRef.current = Date.now() + 350;
    } else if (e.touches.length === 1 && mode === 'viewer' && scale > 1) {
      e.stopPropagation();
      const t = e.touches[0];
      panStartRef.current = { x: t.clientX, y: t.clientY };
      panStartTranslateRef.current = translate;
      setIsGestureActive(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.stopPropagation();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = getTouchDistance(t1, t2);
      const center = getTouchCenter(t1, t2);

      const rawScale = pinchStartScaleRef.current * (dist / pinchStartDistRef.current);
      const maxScale = mode === 'viewer' ? 4 : 3.2;
      const nextScale = Math.min(maxScale, Math.max(1, rawScale));

      const dx = pinchStartCenterRef.current ? center.x - pinchStartCenterRef.current.x : 0;
      const dy = pinchStartCenterRef.current ? center.y - pinchStartCenterRef.current.y : 0;

      const rawX = pinchStartTranslateRef.current.x + dx;
      const rawY = pinchStartTranslateRef.current.y + dy;

      setScale(nextScale);
      if (mode === 'inline') {
        setTranslate({ x: rawX, y: rawY });
      } else {
        setTranslate(clampTranslate(rawX, rawY, nextScale));
      }
      suppressClickUntilRef.current = Date.now() + 350;
    } else if (e.touches.length === 1 && mode === 'viewer' && scale > 1 && panStartRef.current) {
      e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.x;
      const dy = t.clientY - panStartRef.current.y;
      setTranslate(
        clampTranslate(
          panStartTranslateRef.current.x + dx,
          panStartTranslateRef.current.y + dy,
          scale
        )
      );
      suppressClickUntilRef.current = Date.now() + 250;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      pinchStartCenterRef.current = null;
    }

    if (e.touches.length === 0) {
      panStartRef.current = null;
      setIsGestureActive(false);

      if (mode === 'inline') {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        return;
      }

      if (scale <= 1.05) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setTranslate((prev) => clampTranslate(prev.x, prev.y, scale));
      }

      if (e.changedTouches.length === 1 && Date.now() > suppressClickUntilRef.current - 300) {
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          lastTapRef.current = 0;
          if (scale > 1.1) {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
          } else {
            setScale(2.5);
            setTranslate({ x: 0, y: 0 });
          }
          suppressClickUntilRef.current = now + 250;
        } else {
          lastTapRef.current = now;
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mode !== 'viewer') return;
    if (e.ctrlKey || e.metaKey || scale > 1 || Math.abs(e.deltaY) > 0) {
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      const nextScale = Math.min(4, Math.max(1, Number((scale * factor).toFixed(3))));
      setScale(nextScale);
      if (nextScale <= 1.02) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'viewer') return;
    e.stopPropagation();
    if (scale > 1.1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.4);
      setTranslate({ x: 0, y: 0 });
    }
  };

  const handleImgError = () => {
    if (triedRawFallback) return;
    setTriedRawFallback(true);
    setDisableSrcSet(true);
    const candidate = fallbackSrc || (resolvedSrc ? stripCloudinaryTransforms(resolvedSrc) : undefined);
    if (candidate && candidate !== resolvedSrc) {
      setResolvedSrc(candidate);
    }
  };

  if (!resolvedSrc) return null;

  const isZoomed = isGestureActive || scale !== 1 || translate.x !== 0 || translate.y !== 0;
  const isElevated = mode === 'inline' && (isGestureActive || scale > 1.02);

  return (
    <div
      ref={containerRef}
      data-pinch-stage="true"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`${className} ${mode === 'viewer' ? 'touch-none' : 'touch-pan-y'} ${
        isElevated ? 'relative z-50 overflow-visible' : ''
      }`}
    >
      <img
        src={resolvedSrc}
        srcSet={!disableSrcSet && srcSet ? srcSet : undefined}
        sizes={!disableSrcSet && srcSet && sizes ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding={decoding}
        draggable={false}
        onError={handleImgError}
        style={
          isZoomed
            ? {
                transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                transition: isGestureActive ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                transformOrigin: 'center center',
                willChange: 'transform',
              }
            : undefined
        }
        className={`${imgClassName} select-none`}
      />
    </div>
  );
};
