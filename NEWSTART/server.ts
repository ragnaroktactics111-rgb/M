import express from "express";
import path from "path";
import { calculateDamage, getConstants } from "./src/server/calculator.js";

const app = express();
app.use(express.json());

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/constants", (req, res) => {
  res.json(getConstants());
});

app.post("/api/calculate", (req, res) => {
  try {
    const result = calculateDamage(req.body);
    res.json(result);
  } catch (error) {
    console.error("Calculation error:", error);
    res.status(500).json({ error: "Calculation failed" });
  }
});

// Local Development & Standard Production (Render, Cloud Run)
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import for Vite to avoid issues in Vercel production
    import("vite").then(async ({ createServer: createViteServer }) => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);

      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Export the app for Vercel Serverless Functions
export default app;
