const http = require("http");
const { URL } = require("url");
const {
  store,
  createId,
  isoDate,
  addActivity,
  createApplicationFromJob,
} = require("./store");

const PORT = Number(process.env.PORT || 4000);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });

    req.on("error", (err) => reject(err));
  });
}

function countByStatus(applications) {
  const order = ["applied", "screening", "interview", "offer", "rejected", "error"];
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
    values: order.map((status) => applications.filter((app) => app.status === status).length),
    colors,
  };
}

function startOfIsoWeek(date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  if (day !== 1) {
    utc.setUTCDate(utc.getUTCDate() - (day - 1));
  }
  return utc;
}

function formatWeekLabel(weekStart) {
  const month = weekStart.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const weekOfMonth = Math.ceil(weekStart.getUTCDate() / 7);
  return `W${weekOfMonth} ${month}`;
}

function buildWeeklyApplications(applications) {
  const today = new Date();
  const weekLabels = [];
  const counts = [];

  for (let i = 6; i >= 0; i -= 1) {
    const weekDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    weekDate.setUTCDate(weekDate.getUTCDate() - i * 7);
    const weekStart = startOfIsoWeek(weekDate);
    const label = formatWeekLabel(weekStart);

    weekLabels.push(label);

    const count = applications.filter((app) => {
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

function buildApplicationMetrics(applications) {
  const total = applications.length;
  const progressed = applications.filter((app) => ["screening", "interview", "offer"].includes(app.status)).length;
  const interviews = applications.filter((app) => app.status === "interview").length;
  const offers = applications.filter((app) => app.status === "offer").length;

  const averageDays = applications
    .filter((app) => app.status !== "applied")
    .map((app) => {
      const applied = new Date(app.appliedDate);
      const updated = new Date(app.lastUpdate);
      if (Number.isNaN(applied.getTime()) || Number.isNaN(updated.getTime())) {
        return null;
      }
      return Math.max(1, Math.round((updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)));
    })
    .filter((value) => value !== null);

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

function buildDashboardPayload() {
  const applications = store.applications;
  const averageMatch = applications.length
    ? Math.round(applications.reduce((sum, app) => sum + app.matchScore, 0) / applications.length)
    : 0;

  return {
    stats: {
      applicationsSent: applications.length,
      interviewsScheduled: applications.filter((app) => app.status === "interview").length,
      averageMatchScore: `${averageMatch}%`,
      networkGrowth: store.connections.length,
    },
    topJobs: store.jobs.slice(0, 5),
    activityFeed: store.activityFeed.slice(0, 10),
    networkGrowthData: store.networkGrowthData,
  };
}

function buildAutomationRun(job, mode) {
  const runId = createId("run");
  const createdAt = new Date().toISOString();

  const steps = [
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
    steps[2].status = "error";
    steps[2].error = "Required fields missing in the application form parser.";
    steps[3].status = "blocked";
    steps[5].status = "blocked";
  }

  const hasError = steps.some((step) => step.status === "error");

  return {
    id: runId,
    mode,
    jobId: job.id,
    company: job.company,
    role: job.title,
    createdAt,
    status: hasError ? "error" : "success",
    steps,
  };
}

async function handler(req, res) {
  if (!req.url) {
    sendError(res, 400, "Invalid request URL");
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  try {
    if (req.method === "GET" && path === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        service: "found-backend",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/dashboard") {
      sendJson(res, 200, buildDashboardPayload());
      return;
    }

    if (req.method === "GET" && path === "/api/v1/jobs") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const level = url.searchParams.get("level") || "All";
      const minMatch = Number(url.searchParams.get("minMatch") || 0);

      const jobs = store.jobs.filter((job) => {
        const searchOk =
          !search ||
          job.title.toLowerCase().includes(search) ||
          job.company.toLowerCase().includes(search);
        const levelOk = level === "All" || job.level === level;
        const scoreOk = job.matchScore >= minMatch;

        return searchOk && levelOk && scoreOk;
      });

      sendJson(res, 200, { jobs });
      return;
    }

    const applyMatch = path.match(/^\/api\/v1\/jobs\/([^/]+)\/apply$/);
    if (req.method === "POST" && applyMatch) {
      const jobId = applyMatch[1];
      const job = store.jobs.find((item) => item.id === jobId);

      if (!job) {
        sendError(res, 404, "Job not found");
        return;
      }

      const existing = store.applications.find(
        (app) => app.company === job.company && app.jobTitle === job.title,
      );

      if (existing) {
        sendError(res, 409, "Application already exists for this role");
        return;
      }

      const application = createApplicationFromJob(job, "AI quick apply");
      sendJson(res, 201, { application });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/applications") {
      sendJson(res, 200, {
        applications: store.applications,
        applicationStatsData: countByStatus(store.applications),
        weeklyApplications: buildWeeklyApplications(store.applications),
        metrics: buildApplicationMetrics(store.applications),
      });
      return;
    }

    const updateApplicationMatch = path.match(/^\/api\/v1\/applications\/([^/]+)\/status$/);
    if (req.method === "PATCH" && updateApplicationMatch) {
      const applicationId = updateApplicationMatch[1];
      const body = await parseJsonBody(req);

      if (!body.status || typeof body.status !== "string") {
        sendError(res, 400, "Missing required field: status");
        return;
      }

      const application = store.applications.find((app) => app.id === applicationId);
      if (!application) {
        sendError(res, 404, "Application not found");
        return;
      }

      application.status = body.status;
      application.lastUpdate = isoDate();
      if (body.nextStep) {
        application.nextStep = body.nextStep;
      }
      if (body.notes) {
        application.notes = body.notes;
      }

      addActivity("application", `Updated ${application.jobTitle} at ${application.company} to ${application.status}`, "checkCircle");
      sendJson(res, 200, { application });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/network/connections") {
      const status = url.searchParams.get("status");
      const connections = status
        ? store.connections.filter((connection) => connection.status === status)
        : store.connections;

      sendJson(res, 200, { connections });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/network/followups") {
      sendJson(res, 200, { followUps: store.followUps });
      return;
    }

    if (req.method === "POST" && path === "/api/v1/network/messages/draft") {
      const body = await parseJsonBody(req);
      const name = body.name || "there";
      const company = body.company || "your company";
      const tone = body.tone || "professional";

      const styles = {
        professional: `Hi ${name},\n\nI hope you're doing well. I am actively exploring software roles at ${company} and would value your perspective on the team and hiring process.`,
        casual: `Hey ${name},\n\nI am looking at openings at ${company} and wanted to quickly connect. If you're open, I'd love to hear how things work on your side.`,
        formal: `Hello ${name},\n\nI am writing to express my interest in opportunities at ${company}. If convenient, I would appreciate any guidance regarding relevant teams or recruiters.`,
      };

      const message = `${styles[tone] || styles.professional}\n\nBest regards,\n${store.profile.name}`;
      sendJson(res, 200, { message });
      return;
    }

    if (req.method === "POST" && path === "/api/v1/network/outreach") {
      const body = await parseJsonBody(req);

      if (!body.contactName || !body.company || !body.message) {
        sendError(res, 400, "Missing required fields: contactName, company, message");
        return;
      }

      const followUp = {
        id: createId("f"),
        contactName: body.contactName,
        company: body.company,
        scheduledDate: body.scheduledDate || isoDate(),
        type: body.type || "Outreach Follow-up",
        aiMessage: body.message,
        status: body.scheduledDate ? "scheduled" : "pending",
      };

      store.followUps.unshift(followUp);
      store.outreachHistory.unshift({ ...followUp, sentAt: new Date().toISOString() });

      addActivity("network", `AI prepared outreach for ${body.contactName} at ${body.company}`, "messageCircle");

      sendJson(res, 201, { followUp });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/referrals") {
      sendJson(res, 200, { referrals: store.referrals });
      return;
    }

    if (req.method === "POST" && path === "/api/v1/referrals/request") {
      const body = await parseJsonBody(req);

      if (!body.targetCompany || !body.targetRole || !body.referrer || !body.message) {
        sendError(res, 400, "Missing required fields: targetCompany, targetRole, referrer, message");
        return;
      }

      const referral = {
        id: createId("r"),
        targetCompany: body.targetCompany,
        targetRole: body.targetRole,
        referrer: body.referrer,
        referrerTitle: body.referrerTitle || "Connection",
        status: "sent",
        dateSent: isoDate(),
        message: body.message,
      };

      store.referrals.unshift(referral);
      addActivity("referral", `Referral request sent to ${body.referrer} (${body.targetCompany})`, "userCheck");

      sendJson(res, 201, { referral });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/profile") {
      sendJson(res, 200, {
        profile: store.profile,
        aiSettings: store.aiSettings,
      });
      return;
    }

    if (req.method === "PUT" && path === "/api/v1/profile/ai-settings") {
      const body = await parseJsonBody(req);
      store.aiSettings = {
        ...store.aiSettings,
        ...body,
      };
      sendJson(res, 200, { aiSettings: store.aiSettings });
      return;
    }

    if (req.method === "GET" && path === "/api/v1/automation/runs") {
      sendJson(res, 200, { runs: store.automationRuns });
      return;
    }

    if (req.method === "POST" && path === "/api/v1/automation/runs") {
      const body = await parseJsonBody(req);

      if (!body.jobId || typeof body.jobId !== "string") {
        sendError(res, 400, "Missing required field: jobId");
        return;
      }

      const mode = body.mode === "live" ? "live" : "dry-run";
      const job = store.jobs.find((item) => item.id === body.jobId);

      if (!job) {
        sendError(res, 404, "Job not found");
        return;
      }

      const run = buildAutomationRun(job, mode);
      store.automationRuns.unshift(run);

      let application = null;
      if (mode === "live" && run.status === "success") {
        const exists = store.applications.find(
          (app) => app.company === job.company && app.jobTitle === job.title,
        );
        if (!exists) {
          application = createApplicationFromJob(job, "automation run");
        }
      }

      if (run.status === "error") {
        addActivity("application", `Automation failed for ${job.title} at ${job.company}`, "alertTriangle");
      }

      sendJson(res, 201, { run, application });
      return;
    }

    sendError(res, 404, "Route not found");
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : "Internal server error");
  }
}

const server = http.createServer(handler);

server.listen(PORT, () => {
  console.log(`Found backend API listening on http://localhost:${PORT}`);
});
