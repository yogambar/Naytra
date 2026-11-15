import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useGpuTier } from '../hooks/useGpuTier';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export interface SceneShellProps {
  accessibleLabel: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
  height?: string | number;
  width?: string | number;
  className?: string;
}

export const SceneShell: React.FC<SceneShellProps> = ({
  accessibleLabel,
  fallback,
  children,
  height = 200,
  width = '100%',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  const { tier, loading: gpuLoading } = useGpuTier();
  const { prefersReducedMotion } = useMotionPrefs();

  // Low GPU tier or reduced motion should show static fallback
  const shouldSkipWebGL = prefersReducedMotion || (!gpuLoading && tier < 2);

  // IntersectionObserver to pause rendering when off-screen
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Page visibility to pause when tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsVisible(false);
      } else if (containerRef.current) {
        // recheck intersection
        const rect = containerRef.current.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
        setIsVisible(inViewport);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
      role="img"
      aria-label={accessibleLabel}
    >
      {/* Screen-reader hidden canvas / 3D content */}
      <div className="sr-only">{accessibleLabel}</div>

      {shouldSkipWebGL || contextLost || !isVisible ? (
        <div aria-hidden="true" className="w-full h-full flex items-center justify-center">
          {fallback}
        </div>
      ) : (
        <Suspense fallback={fallback}>
          <div
            aria-hidden="true"
            className="w-full h-full"
            onContextMenu={(e) => e.preventDefault()}
            onLostPointerCapture={() => {}}
            // Context loss handling on canvas parent
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={() => {
              const canvas = containerRef.current?.querySelector('canvas');
              if (canvas) {
                canvas.addEventListener('webglcontextlost', () => setContextLost(true), { once: true });
                canvas.addEventListener('webglcontextrestored', () => setContextLost(false), { once: true });
              }
            }}
          >
            {children}
          </div>
        </Suspense>
      )}
    </div>
  );
};
