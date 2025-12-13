import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker Management
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: Register service worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  } else {
    // Development: Unregister any existing service workers
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister().then(() => {
            console.log('ServiceWorker unregistered for development');
          });
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
