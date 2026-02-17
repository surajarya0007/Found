import { Router } from "express";
import { getDashboardPayload } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", (_req, res) => {
  res.json(getDashboardPayload());
});
