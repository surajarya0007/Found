import { Router } from "express";
import {
  discoverExternalJobs,
  importExternalJobs,
  requireExternalConnectorAvailability,
} from "./jobs-connectors.service";

export const integrationsRouter = Router();

integrationsRouter.get("/integrations/jobs", async (req, res, next) => {
  try {
    requireExternalConnectorAvailability();

    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const company = typeof req.query.company === "string" ? req.query.company : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const payload = await discoverExternalJobs({
      query,
      company,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

integrationsRouter.post("/integrations/jobs/import", async (req, res, next) => {
  try {
    requireExternalConnectorAvailability();

    const query = typeof req.body?.query === "string" ? req.body.query : undefined;
    const company = typeof req.body?.company === "string" ? req.body.company : undefined;
    const limit = typeof req.body?.limit === "number" ? req.body.limit : undefined;

    const payload = await importExternalJobs({ query, company, limit });

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});
