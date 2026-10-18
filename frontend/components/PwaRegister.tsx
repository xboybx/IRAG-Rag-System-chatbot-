'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('IRAG PWA Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('IRAG PWA Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
