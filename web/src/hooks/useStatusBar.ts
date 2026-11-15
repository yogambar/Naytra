import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from './useTheme';

export function useStatusBar() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    async function syncStatusBar() {
      try {
        if (resolvedTheme === 'dark') {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#0F1318' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        }
      } catch {
        // Native StatusBar not available on web
      }
    }

    syncStatusBar();
  }, [resolvedTheme]);
}
