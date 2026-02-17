import { Router } from "express";
import {
  getApplicationsPayload,
  updateApplicationStatus,
} from "./applications.service";

export const applicationsRouter = Router();

applicationsRouter.get("/applications", (_req, res) => {
  res.json(getApplicationsPayload());
});

applicationsRouter.patch("/applications/:id/status", (req, res) => {
  const application = updateApplicationStatus(req.params.id, req.body ?? {});
  res.json({ application });
});
