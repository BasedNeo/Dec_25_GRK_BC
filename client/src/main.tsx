import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker Management
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: Register service worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed silently
      });
    });
  } else {
    // Development: Unregister any existing service workers
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
