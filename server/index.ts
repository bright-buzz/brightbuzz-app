import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { newsService } from "./services/newsService";

const log = console.log;
const app = express();

// ✅ CORS: allow Vercel frontend to call this Render backend
app.use(
  cors({
    origin: ["https://brightbuzz.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * IMPORTANT:
 * This endpoint is called by the frontend (Home page) using:
 *   apiRequest('POST', '/api/fetch-news', { force: true })
 *
 * It triggers a server-side refresh of the news pipeline.
 */
app.post("/api/fetch-news", async (req, res) => {
  try {
    const forceRefresh = Boolean(req.body?.force);
    await newsService.fetchLatestNews(forceRefresh);
    res.json({ success: true });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  // In production, the frontend is served by Vercel, not this backend
  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
