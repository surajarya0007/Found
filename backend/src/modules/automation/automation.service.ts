import { HttpError } from "../../errors/http-error";
import {
  addActivity,
  createApplicationFromJob,
  createId,
  persistStore,
  store,
} from "../../store/store";
import type { AutomationRun, AutomationStep } from "../../types/domain";

export function listAutomationRuns() {
  return store.automationRuns;
}

function buildAutomationRun(jobId: string, mode: "dry-run" | "live"): AutomationRun {
  const job = store.jobs.find((item) => item.id === jobId);

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  const steps: AutomationStep[] = [
    { id: "discover_job", label: "Locate target role", status: "success" },
    { id: "profile_sync", label: "Prepare profile + resume context", status: "success" },
    { id: "form_fill", label: "Autofill application form", status: "success" },
    { id: "submit_application", label: "Submit application", status: "success" },
    { id: "find_contacts", label: "Find recruiters and hiring contacts", status: "success" },
    {
      id: "send_outreach",
      label: "Draft and send outreach sequence",
      status: mode === "dry-run" ? "skipped" : "success",
    },
  ];

  if (mode === "live" && job.skillGap.length >= 2 && job.matchScore < 90) {
    steps[2] = {
      ...steps[2],
      status: "error",
      error: "Required fields missing in the application form parser.",
    };
    steps[3] = { ...steps[3], status: "blocked" };
    steps[5] = { ...steps[5], status: "blocked" };
  }

  const hasError = steps.some((step) => step.status === "error");

  return {
    id: createId("run"),
    mode,
    jobId: job.id,
    company: job.company,
    role: job.title,
    createdAt: new Date().toISOString(),
    status: hasError ? "error" : "success",
    steps,
  };
}

interface CreateRunPayload {
  jobId?: string;
  mode?: string;
}

export function createAutomationRun(payload: CreateRunPayload) {
  if (!payload.jobId || typeof payload.jobId !== "string") {
    throw new HttpError(400, "Missing required field: jobId");
  }

  const mode = payload.mode === "live" ? "live" : "dry-run";
  const run = buildAutomationRun(payload.jobId, mode);
  store.automationRuns.unshift(run);

  let application = null;

  if (mode === "live" && run.status === "success") {
    const targetJob = store.jobs.find((job) => job.id === payload.jobId);

    if (!targetJob) {
      throw new HttpError(404, "Job not found");
    }

    const existing = store.applications.find(
      (app) => app.company === targetJob.company && app.jobTitle === targetJob.title,
    );

    if (!existing) {
      application = createApplicationFromJob(targetJob, "automation run");
    }
  }

  if (run.status === "error") {
    addActivity("application", `Automation failed for ${run.role} at ${run.company}`, "alertTriangle");
  } else if (mode === "dry-run") {
    persistStore();
  }

  return {
    run,
    application,
  };
}
