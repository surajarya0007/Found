import { HttpError } from "../../errors/http-error";
import { createApplicationFromJob, store } from "../../store/store";
import type { Job } from "../../types/domain";

interface JobFilters {
  search?: string;
  level?: string;
  minMatch?: number;
}

export function listJobs(filters: JobFilters = {}): Job[] {
  const search = (filters.search || "").toLowerCase();
  const level = filters.level || "All";
  const minMatch = Number(filters.minMatch || 0);

  return store.jobs.filter((job) => {
    const searchOk =
      !search ||
      job.title.toLowerCase().includes(search) ||
      job.company.toLowerCase().includes(search);
    const levelOk = level === "All" || job.level === level;
    const scoreOk = job.matchScore >= minMatch;

    return searchOk && levelOk && scoreOk;
  });
}

export function applyToJob(jobId: string) {
  const job = store.jobs.find((item) => item.id === jobId);

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  const existing = store.applications.find(
    (app) => app.company === job.company && app.jobTitle === job.title,
  );

  if (existing) {
    throw new HttpError(409, "Application already exists for this role");
  }

  return createApplicationFromJob(job, "AI quick apply");
}
