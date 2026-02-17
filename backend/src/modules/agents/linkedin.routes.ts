import { Router } from "express";
import {
  listLinkedInBrowserRuns,
  runLinkedInBrowserAutomation,
} from "./linkedin-browser.service";
import {
  getLinkedInAgentConfig,
  listLinkedInAgentRuns,
  listLinkedInOpportunities,
  runLinkedInAgent,
  updateLinkedInAgentConfig,
} from "./linkedin.service";

export const linkedInAgentRouter = Router();

linkedInAgentRouter.get("/agents/linkedin/config", (_req, res) => {
  res.json({ config: getLinkedInAgentConfig() });
});

linkedInAgentRouter.put("/agents/linkedin/config", (req, res) => {
  const config = updateLinkedInAgentConfig(req.body ?? {});
  res.json({ config });
});

linkedInAgentRouter.get("/agents/linkedin/opportunities", (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : undefined;
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  const opportunities = listLinkedInOpportunities(query, limit && limit > 0 ? limit : 8);
  res.json({ opportunities });
});

linkedInAgentRouter.get("/agents/linkedin/runs", (_req, res) => {
  res.json({ runs: listLinkedInAgentRuns() });
});

linkedInAgentRouter.post("/agents/linkedin/runs", (req, res) => {
  const run = runLinkedInAgent(req.body ?? {});
  res.status(201).json({ run });
});

linkedInAgentRouter.get("/agents/linkedin/browser-runs", (_req, res) => {
  res.json({ runs: listLinkedInBrowserRuns() });
});

linkedInAgentRouter.post("/agents/linkedin/browser-runs", async (req, res, next) => {
  try {
    const run = await runLinkedInBrowserAutomation(req.body ?? {});
    res.status(201).json({ run });
  } catch (error) {
    next(error);
  }
});
