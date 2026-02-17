"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "./utils/api";
import StatCard from "./components/ui/StatCard";
import GlassCard from "./components/ui/GlassCard";

interface DashboardData {
  stats: {
    applicationsSent: number;
    interviewsScheduled: number;
    averageMatchScore: string;
    networkGrowth: number;
  };
  topJobs: Array<{
    id: string;
    title: string;
    company: string;
    logo: string;
    matchScore: number;
    salary: string;
    location: string;
    type: string;
  }>;
  activityFeed: Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    icon: string;
  }>;
  networkGrowthData: { labels: string[]; values: number[] };
  sourcePerformance: {
    manual: { applications: number; interviews: number; conversionRate: number };
    automation: { applications: number; interviews: number; conversionRate: number };
  };
}

const activityIcons: Record<string, string> = {
  application: "📤",
  referral: "🔗",
  interview: "🎙️",
  offer: "🎉",
  connection: "🤝",
  match: "🎯",
  network: "💬",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<DashboardData>("/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 130 }} />
          ))}
        </div>
        <div className="cards-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxGrowth = Math.max(...data.networkGrowthData.values, 1);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1>
          Welcome back, <span className="gradient-text">Suraj</span> 👋
        </h1>
        <p>Here&apos;s what&apos;s happening with your job search today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon="📤"
          label="Applications Sent"
          value={data.stats.applicationsSent}
          accentColor="var(--accent-blue)"
        />
        <StatCard
          icon="🎙️"
          label="Interviews Scheduled"
          value={data.stats.interviewsScheduled}
          accentColor="var(--accent-violet)"
        />
        <StatCard
          icon="🎯"
          label="Avg Match Score"
          value={data.stats.averageMatchScore}
          accentColor="var(--accent-emerald)"
        />
        <StatCard
          icon="🤝"
          label="Network Growth"
          value={`+${data.stats.networkGrowth}`}
          accentColor="var(--accent-cyan)"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top AI Matches */}
          <GlassCard hover={false}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🎯 Top AI Job Matches
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.topJobs.map((job, i) => (
                <div
                  key={job.id}
                  className={`animate-fade-in stagger-${i + 1}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--gradient-cool)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                    }}
                  >
                    {job.logo}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {job.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {job.company} · {job.location}
                    </div>
                  </div>
                  <div
                    className={`score-ring ${
                      job.matchScore >= 85
                        ? "score-high"
                        : job.matchScore >= 70
                          ? "score-medium"
                          : "score-low"
                    }`}
                  >
                    {job.matchScore}%
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Network Growth Chart */}
          <GlassCard hover={false}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              📈 Network Growth
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                height: 160,
                padding: "0 8px",
              }}
            >
              {data.networkGrowthData.labels.map((label, i) => {
                const heightPct = (data.networkGrowthData.values[i] / maxGrowth) * 100;
                return (
                  <div
                    key={label}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {data.networkGrowthData.values[i]}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 40,
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "6px 6px 2px 2px",
                        background: "var(--gradient-primary)",
                        opacity: 0.8,
                        transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Source Performance */}
          <GlassCard hover={false}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚡ Source Performance
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {(["manual", "automation"] as const).map((source) => {
                const perf = data.sourcePerformance[source];
                return (
                  <div
                    key={source}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        textTransform: "capitalize",
                        marginBottom: 10,
                        fontWeight: 500,
                      }}
                    >
                      {source === "manual" ? "🖱️ Manual" : "🤖 Automation"}
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
                      {perf.applications}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {perf.interviews} interviews · {perf.conversionRate}% conversion
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right column – Activity Feed */}
        <GlassCard hover={false} style={{ height: "fit-content" }}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🕐 Recent Activity
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.activityFeed.map((activity, i) => (
              <div
                key={activity.id}
                className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 10px",
                  borderRadius: "var(--radius-sm)",
                  transition: "background 0.2s",
                }}
              >
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                  {activityIcons[activity.type] || "📌"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activity.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
