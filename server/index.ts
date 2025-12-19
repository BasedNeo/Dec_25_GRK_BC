import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import compression from "compression";
import { apiLimiter } from './middleware/rateLimiter';
import { helmetConfig, corsConfig, sanitizeRequest, secureLogger } from './middleware/security';
import { encryptSensitiveResponse, decryptSensitiveRequest } from './middleware/encryptedPayload';

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);
app.use(compression());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use(helmetConfig);
app.use(corsConfig);
app.use(sanitizeRequest);
app.use(secureLogger);
app.use('/api', apiLimiter);
app.use(encryptSensitiveResponse);
app.use(decryptSensitiveRequest);

(async () => {
  // Branded loading page HTML
  const brandedLoadingPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Based Guardians - Loading</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(180deg, #000 0%, #0a0a1a 50%, #000 100%); font-family: system-ui, -apple-system, sans-serif; color: white; text-align: center; padding: 2rem; }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .logo { font-size: 4rem; margin-bottom: 1.5rem; animation: float 3s ease-in-out infinite; }
    .ring { width: 60px; height: 60px; border: 3px solid rgba(0,255,255,0.2); border-top-color: #00ffff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1.5rem; }
    .title { font-size: 1.5rem; font-weight: bold; background: linear-gradient(90deg, #00ffff, #bf00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
    .subtitle { color: #00ffff; font-size: 0.75rem; letter-spacing: 0.3em; text-transform: uppercase; animation: pulse-glow 2s ease-in-out infinite; }
    .footer { position: absolute; bottom: 2rem; color: #444; font-size: 0.7rem; }
  </style>
  <meta http-equiv="refresh" content="3">
</head>
<body>
  <div class="logo">🛸</div>
  <div class="ring"></div>
  <div class="title">BASED GUARDIANS</div>
  <div class="subtitle">Entering the Giga Brain Galaxy...</div>
  <div class="footer">If this takes too long, try refreshing</div>
</body>
</html>`;

  // Fast health check at root - MUST be first for deployment health checks
  // Health checks typically don't send Accept: text/html
  app.get("/", (req, res, next) => {
    const acceptHeader = req.headers['accept'] || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // Pure health checkers (no user agent or specific health check agents)
    const isHealthChecker = !userAgent || 
      userAgent.includes('HealthChecker') || 
      userAgent.includes('kube-probe') ||
      userAgent.includes('GoogleHC');
    
    // If request doesn't accept HTML AND is a health checker, respond immediately
    if (!acceptHeader.includes('text/html') && isHealthChecker) {
      return res.status(200).send('OK');
    }
    
    // If request doesn't accept HTML but is a browser, show branded page
    if (!acceptHeader.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(brandedLoadingPage);
    }
    
    // Browser requests fall through to static file serving
    next();
  });

  // Additional health check endpoints (these stay simple for monitoring)
  app.get("/_health", (_req, res) => {
    res.status(200).send('OK');
  });

  await registerRoutes(httpServer, app);

  // Initialize backup scheduler for automated daily backups
  const { BackupScheduler } = await import('./lib/backupScheduler');
  BackupScheduler.initialize();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
