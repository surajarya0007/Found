import { Router } from "express";
import { createAutomationRun, listAutomationRuns } from "./automation.service";

export const automationRouter = Router();

automationRouter.get("/automation/runs", (_req, res) => {
  res.json({ runs: listAutomationRuns() });
});

automationRouter.post("/automation/runs", (req, res) => {
  const payload = createAutomationRun(req.body ?? {});
  res.status(201).json(payload);
});
