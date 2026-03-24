import express from "express";
import http from "http";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Root `.env` — `tsx server.ts` does not load it unless we do (unlike Vite). */
dotenv.config({ path: path.join(__dirname, ".env") });

const DEFAULT_NEST_PORT = 3000;

function resolveNestProxyTarget(): {
  host: string;
  port: number;
  baseUrl: string;
  portSource: "NEST_API_PORT" | "VITE_API_BASE_URL" | "default";
} {
  const nestPortRaw = process.env.NEST_API_PORT?.trim();
  if (nestPortRaw !== undefined && nestPortRaw !== "") {
    const p = Number(nestPortRaw);
    if (!Number.isNaN(p) && p > 0) {
      const host = process.env.NEST_API_HOST?.trim() || "127.0.0.1";
      return {
        host,
        port: p,
        baseUrl: `http://${host}:${p}`,
        portSource: "NEST_API_PORT",
      };
    }
  }

  const viteBase = process.env.VITE_API_BASE_URL?.trim();
  if (viteBase) {
    try {
      const u = new URL(viteBase);
      const host = process.env.NEST_API_HOST?.trim() || u.hostname || "127.0.0.1";
      const port = u.port ? Number(u.port) : DEFAULT_NEST_PORT;
      return {
        host,
        port,
        baseUrl: `http://${host}:${port}`,
        portSource: "VITE_API_BASE_URL",
      };
    } catch {
      /* fall through */
    }
  }

  const host = process.env.NEST_API_HOST?.trim() || "127.0.0.1";
  return {
    host,
    port: DEFAULT_NEST_PORT,
    baseUrl: `http://${host}:${DEFAULT_NEST_PORT}`,
    portSource: "default",
  };
}

async function startServer() {
  const app = express();
  const nestTarget = resolveNestProxyTarget();
  /** Web UI (Vite) — keep separate from the Nest API (default port 3000). */
  const PORT = Number(process.env.FRONTEND_PORT) || 5173;

  app.use(express.json());

  // Mock Database
  const db = {
    users: [],
    rides: [],
    drivers: [
      { id: "d1", name: "Abebe Bikila", phone: "+251911223344", status: "online", rating: 4.8, vehicle: "Toyota Vitz", plate: "AA-2-12345" },
      { id: "d2", name: "Mulugeta Tesfaye", phone: "+251922334455", status: "online", rating: 4.9, vehicle: "Suzuki Dzire", plate: "OR-3-54321" },
    ],
  };

  // API Routes
  app.post("/api/auth/otp", (req, res) => {
    const { phone } = req.body;
    console.log(`Sending OTP to ${phone}`);
    res.json({ success: true, message: "OTP sent successfully" });
  });

  app.post("/api/auth/verify", (req, res) => {
    const { phone, otp, role } = req.body;
    // Simulate verification
    const user = { id: Math.random().toString(36).substr(2, 9), phone, role, name: "New User" };
    res.json({ success: true, user });
  });

  app.get("/api/drivers/online", (req, res) => {
    res.json(db.drivers.filter(d => d.status === "online"));
  });

  app.post("/api/rides/request", (req, res) => {
    const ride = { id: Math.random().toString(36).substr(2, 9), ...req.body, status: "pending", createdAt: new Date() };
    db.rides.push(ride);
    res.json({ success: true, ride });
  });

  app.get("/api/admin/stats", (req, res) => {
    res.json({
      totalRides: db.rides.length,
      activeDrivers: db.drivers.filter(d => d.status === "online").length,
      revenue: db.rides.reduce((acc, r) => acc + (r.fare || 0), 0),
    });
  });

  /** Forward Nest admin routes — avoids 404 when the browser hits the Vite origin instead of Nest. */
  app.use("/admin", (req, res) => {
    const suffix = req.url === "/" || req.url === "" ? "" : req.url;
    const upstreamPath = `/admin${suffix}`;
    const proxyReq = http.request(
      {
        hostname: nestTarget.host,
        port: nestTarget.port,
        path: upstreamPath,
        method: req.method,
        headers: { ...req.headers, host: `${nestTarget.host}:${nestTarget.port}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on("error", (err) => {
      console.error("[admin proxy]", err.message);
      if (!res.headersSent) {
        res.status(502).json({
          message: "Nest API unavailable",
          detail: `Expected Nest at ${nestTarget.baseUrl} (port from ${nestTarget.portSource}; set NEST_API_PORT or VITE_API_BASE_URL in root .env).`,
        });
      }
    });
    req.pipe(proxyReq);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web app (Vite) on http://localhost:${PORT}`);
    console.log(
      `Nest API (run separately): ${nestTarget.baseUrl} — /admin/* proxied (Nest port: ${nestTarget.port} from ${nestTarget.portSource})`,
    );
  });
}

startServer();
