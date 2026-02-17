import { store } from "../../store/store";

export function getDashboardPayload() {
  const applications = store.applications;
  const averageMatch = applications.length
    ? Math.round(applications.reduce((sum, app) => sum + app.matchScore, 0) / applications.length)
    : 0;

  const manualApps = applications.filter((app) => (app as any).source !== "automation");
  const autoApps = applications.filter((app) => (app as any).source === "automation");

  const sourcePerformance = {
    manual: {
      applications: manualApps.length,
      interviews: manualApps.filter((app) => app.status === "interview").length,
      conversionRate: manualApps.length > 0
        ? Math.round((manualApps.filter((app) => app.status === "interview").length / manualApps.length) * 100)
        : 0,
    },
    automation: {
      applications: autoApps.length,
      interviews: autoApps.filter((app) => app.status === "interview").length,
      conversionRate: autoApps.length > 0
        ? Math.round((autoApps.filter((app) => app.status === "interview").length / autoApps.length) * 100)
        : 0,
    },
  };

  const runs = (store as any).linkedInBrowserRuns || [];
  const queryStats = new Map<string, { jobsFound: number; applications: number }>();
  const runQueryMap = new Map<string, string>();

  runs.forEach((run: any) => {
    runQueryMap.set(run.id, run.query);
    const existing = queryStats.get(run.query) || { jobsFound: 0, applications: 0 };
    existing.jobsFound += (run.discoveredJobs || []).length;
    queryStats.set(run.query, existing);
  });

  applications.forEach((app: any) => {
    if (app.automationRunId) {
      const query = runQueryMap.get(app.automationRunId);
      if (query) {
        const stats = queryStats.get(query);
        if (stats) stats.applications++;
      }
    }
  });

  const queryPerformance = Array.from(queryStats.entries())
    .map(([query, stats]) => ({
      query,
      jobsFound: stats.jobsFound,
      applications: stats.applications,
    }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 5);

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
    sourcePerformance,
    queryPerformance,
  };
}
