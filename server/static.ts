import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Pre-read index.html for faster serving
  const indexPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Serve static files with caching
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true
  }));

  // Fast fallthrough to index.html using pre-loaded content
  app.use("*", (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(indexHtml);
  });
}
