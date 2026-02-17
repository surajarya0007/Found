import { HttpError } from "../../errors/http-error";
import { addActivity, isoDate, store } from "../../store/store";
import type { ApplicationStatus } from "../../types/domain";

const statusOrder: ApplicationStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "error",
];

function countByStatus() {
  const labels = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Error"];
  const colors = [
    "rgba(59, 130, 246, 0.8)",
    "rgba(245, 158, 11, 0.8)",
    "rgba(139, 92, 246, 0.8)",
    "rgba(16, 185, 129, 0.8)",
    "rgba(244, 63, 94, 0.8)",
    "rgba(239, 68, 68, 0.8)",
  ];

  return {
    labels,
    values: statusOrder.map(
      (status) => store.applications.filter((app) => app.status === status).length,
    ),
    colors,
  };
}

function startOfIsoWeek(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  if (day !== 1) {
    utc.setUTCDate(utc.getUTCDate() - (day - 1));
  }
  return utc;
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const weekOfMonth = Math.ceil(weekStart.getUTCDate() / 7);
  return `W${weekOfMonth} ${month}`;
}

function buildWeeklyApplications() {
  const today = new Date();
  const weekLabels: string[] = [];
  const counts: number[] = [];

  for (let i = 6; i >= 0; i -= 1) {
    const weekDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    weekDate.setUTCDate(weekDate.getUTCDate() - i * 7);
    const weekStart = startOfIsoWeek(weekDate);
    weekLabels.push(formatWeekLabel(weekStart));

    const count = store.applications.filter((app) => {
      const date = new Date(app.appliedDate);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const appWeek = startOfIsoWeek(date);
      return appWeek.toISOString().slice(0, 10) === weekStart.toISOString().slice(0, 10);
    }).length;

    counts.push(count);
  }

  return {
    labels: weekLabels,
    values: counts,
  };
}

function buildMetrics() {
  const total = store.applications.length;
  const progressed = store.applications.filter((app) =>
    ["screening", "interview", "offer"].includes(app.status),
  ).length;
  const interviews = store.applications.filter((app) => app.status === "interview").length;
  const offers = store.applications.filter((app) => app.status === "offer").length;

  const averageDays = store.applications
    .filter((app) => app.status !== "applied")
    .map((app) => {
      const applied = new Date(app.appliedDate);
      const updated = new Date(app.lastUpdate);
      if (Number.isNaN(applied.getTime()) || Number.isNaN(updated.getTime())) {
        return null;
      }
      return Math.max(
        1,
        Math.round((updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)),
      );
    })
    .filter((value): value is number => value !== null);

  const avgDays = averageDays.length
    ? Math.round(averageDays.reduce((sum, days) => sum + days, 0) / averageDays.length)
    : 0;

  return {
    responseRate: total ? `${Math.round((progressed / total) * 100)}%` : "0%",
    avgTimeToInterview: `${avgDays || 0} days`,
    offerRate: total ? `${((offers / total) * 100).toFixed(1)}%` : "0.0%",
    activeInterviews: interviews,
  };
}

export function getApplicationsPayload() {
  return {
    applications: store.applications,
    applicationStatsData: countByStatus(),
    weeklyApplications: buildWeeklyApplications(),
    metrics: buildMetrics(),
  };
}

interface UpdateApplicationPayload {
  status?: string;
  nextStep?: string;
  notes?: string;
}

export function updateApplicationStatus(applicationId: string, payload: UpdateApplicationPayload) {
  if (!payload.status || typeof payload.status !== "string") {
    throw new HttpError(400, "Missing required field: status");
  }

  if (!statusOrder.includes(payload.status as ApplicationStatus)) {
    throw new HttpError(400, "Invalid status value");
  }

  const application = store.applications.find((app) => app.id === applicationId);

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  application.status = payload.status as ApplicationStatus;
  application.lastUpdate = isoDate();

  if (payload.nextStep) {
    application.nextStep = payload.nextStep;
  }

  if (payload.notes) {
    application.notes = payload.notes;
  }

  addActivity(
    "application",
    `Updated ${application.jobTitle} at ${application.company} to ${application.status}`,
    "checkCircle",
  );

  return application;
}
