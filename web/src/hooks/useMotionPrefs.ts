import { useState, useEffect } from 'react';

export function useMotionPrefs() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [isBatterySaver, setIsBatterySaver] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);

    // Battery API check (where supported)
    // @ts-expect-error navigator.getBattery is experimental
    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      // @ts-expect-error navigator.getBattery is experimental
      navigator.getBattery().then((battery: { level: number; charging: boolean; addEventListener: (event: string, fn: () => void) => void }) => {
        const checkBattery = () => {
          // If battery is low (< 20%) and not charging, treat as battery saver
          setIsBatterySaver(battery.level <= 0.2 && !battery.charging);
        };
        checkBattery();
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      }).catch(() => {
        // Battery API blocked or unsupported
      });
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return { prefersReducedMotion, isBatterySaver, shouldAnimate: !prefersReducedMotion && !isBatterySaver };
}
