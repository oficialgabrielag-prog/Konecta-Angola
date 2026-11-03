import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { UIProvider } from './context/UIContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Auto-update Service Worker on deployment so public link updates instantly
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    console.log('[PWA] Aplicação pronta.');
  }
});

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LanguageProvider>
      <UIProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </UIProvider>
    </LanguageProvider>
  </BrowserRouter>
);
