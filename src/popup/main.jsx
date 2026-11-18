import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SettingsProvider, applyTheme } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { readThemeMirror } from '../storage/settings';
import '../styles/index.css';

applyTheme(readThemeMirror()); // avoid a theme flash on first paint

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
