import { useState, useEffect } from 'react';

export function usePointerFine(): boolean {
  const [isFine, setIsFine] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsFine(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isFine;
}
