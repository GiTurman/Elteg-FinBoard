import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

window.addEventListener('unhandledrejection', (event) => {
  // Suppress benign WebSocket errors from Vite HMR
  if (event.reason && (
    (event.reason.message && event.reason.message.includes('WebSocket')) ||
    (event.reason.toString && event.reason.toString().includes('WebSocket'))
  )) {
    event.preventDefault();
    console.warn('Suppressed benign WebSocket rejection:', event.reason);
  }
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);