import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { perf } from './utils/perf';
import './index.css';

perf.mark('app-boot');

// Unregister stale Service Worker in development to prevent stale caches
if (import.meta.env.DEV && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
