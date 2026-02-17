import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { HttpError } from "./errors/http-error";
import { v1Router } from "./routes/v1";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "found-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", v1Router);

app.use((_req, _res, next) => {
  next(new HttpError(404, "Route not found"));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});
