import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';

export function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let backListener: { remove: () => void } | null = null;

    async function registerBackButton() {
      try {
        backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // If on home/dashboard tab or top-level status, minimize app
          if (location.pathname === '/' || location.pathname === '/dashboard') {
            CapApp.minimizeApp();
          } else if (canGoBack) {
            navigate(-1);
          } else {
            navigate('/dashboard');
          }
        });
      } catch {
        // Not running on Capacitor native platform
      }
    }

    registerBackButton();

    return () => {
      backListener?.remove();
    };
  }, [location.pathname, navigate]);
}
