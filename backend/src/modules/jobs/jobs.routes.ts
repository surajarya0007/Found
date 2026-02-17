import { Router } from "express";
import { applyToJob, listJobs } from "./jobs.service";

export const jobsRouter = Router();

jobsRouter.get("/jobs", (req, res) => {
  const jobs = listJobs({
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    level: typeof req.query.level === "string" ? req.query.level : undefined,
    minMatch:
      typeof req.query.minMatch === "string" ? Number(req.query.minMatch) : undefined,
  });

  res.json({ jobs });
});

jobsRouter.post("/jobs/:id/apply", (req, res) => {
  const application = applyToJob(req.params.id);
  res.status(201).json({ application });
});
