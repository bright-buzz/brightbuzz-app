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

// ✅ Request logger (API only)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 100) {
        logLine = logLine.slice(0, 99) + "…";
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
  // ✅ REGISTER ALL API ROUTES FIRST
  const server = await registerRoutes(app);

  // ✅ Vite ONLY in development (after routes)
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  // ✅ Production JSON 404 (NO HTML, NO SPA FALLBACK)
  app.use((req, res) => {
    res.status(404).json({
      message: "Not Found",
      method: req.method,
      path: req.path,
    });
  });

  // ✅ Error handler LAST
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

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
