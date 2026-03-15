/**
 * main.jsx - Entry point for SmartAttend React app.
 * Wraps the app with MUI ThemeProvider, ToastProvider, ThemeModeProvider, and ErrorBoundary.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './styles/global.css'
import App from './App.jsx'
import theme from './styles/theme.js'
import { ToastProvider } from './context/ToastContext'
import { ThemeModeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/common/ErrorBoundary'

// Apply dark mode from localStorage on initial load (before React renders)
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}

// Unregister any existing service workers to clear stale cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeModeProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
