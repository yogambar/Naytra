import { useState, useEffect } from 'react';

export function usePointerFine(): boolean {
  const [isFine, setIsFine] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return Boolean(window.matchMedia('(pointer: fine)')?.matches);
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery || typeof mediaQuery.addEventListener !== 'function') return;

    const handleChange = (e: MediaQueryListEvent) => {
      setIsFine(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isFine;
}
