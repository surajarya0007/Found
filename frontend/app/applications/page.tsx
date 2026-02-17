"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../utils/api";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  logo: string;
  status: string;
  appliedDate: string;
  lastUpdate: string;
  nextStep: string;
  notes: string;
  matchScore: number;
}

interface ApplicationsData {
  applications: Application[];
  applicationStatsData: { labels: string[]; values: number[]; colors: string[] };
  weeklyApplications: { labels: string[]; values: number[] };
  metrics: {
    responseRate: string;
    avgTimeToInterview: string;
    offerRate: string;
    activeInterviews: number;
  };
}

const statusColumns = [
  { key: "applied", label: "Applied", emoji: "📤" },
  { key: "screening", label: "Screening", emoji: "🔍" },
  { key: "interview", label: "Interview", emoji: "🎙️" },
  { key: "offer", label: "Offer", emoji: "🎉" },
  { key: "rejected", label: "Rejected", emoji: "❌" },
];

export default function ApplicationsPage() {
  const [data, setData] = useState<ApplicationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<ApplicationsData>("/applications")
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
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (!data) return null;

  const maxWeekly = Math.max(...data.weeklyApplications.values, 1);

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>📋 Application Tracker</h1>
        <p>Track and manage all your job applications in one place.</p>
      </div>

      {/* Metrics */}
      <div className="stats-grid">
        <StatCard
          icon="📊"
          label="Response Rate"
          value={data.metrics.responseRate}
          accentColor="var(--accent-violet)"
        />
        <StatCard
          icon="⏱️"
          label="Avg Time to Interview"
          value={data.metrics.avgTimeToInterview}
          accentColor="var(--accent-cyan)"
        />
        <StatCard
          icon="🏆"
          label="Offer Rate"
          value={data.metrics.offerRate}
          accentColor="var(--accent-emerald)"
        />
        <StatCard
          icon="🎙️"
          label="Active Interviews"
          value={data.metrics.activeInterviews}
          accentColor="var(--accent-amber)"
        />
      </div>

      {/* Weekly Applications Chart */}
      <GlassCard hover={false} style={{ marginBottom: 24 }}>
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
          📈 Weekly Applications
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 140,
            padding: "0 16px",
          }}
        >
          {data.weeklyApplications.labels.map((label, i) => {
            const heightPct = (data.weeklyApplications.values[i] / maxWeekly) * 100;
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
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {data.weeklyApplications.values[i]}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 50,
                    height: `${Math.max(heightPct, 4)}%`,
                    borderRadius: "8px 8px 2px 2px",
                    background: "var(--gradient-primary)",
                    opacity: 0.8,
                    transition: "height 0.6s ease",
                  }}
                />
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Status Distribution */}
      <GlassCard hover={false} style={{ marginBottom: 24 }}>
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
          📊 Status Distribution
        </h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {data.applicationStatsData.labels.map((label, i) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: data.applicationStatsData.colors[i],
                }}
              >
                {data.applicationStatsData.values[i]}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Kanban Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${statusColumns.length}, 1fr)`,
          gap: 16,
          overflowX: "auto",
        }}
      >
        {statusColumns.map((col) => {
          const apps = data.applications.filter((a) => a.status === col.key);
          return (
            <div key={col.key}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-secondary)",
                }}
              >
                <span>{col.emoji}</span>
                <span>{col.label}</span>
                <span
                  className={`badge badge-violet`}
                  style={{ marginLeft: 4, fontSize: "0.7rem" }}
                >
                  {apps.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="glass animate-fade-in"
                    style={{ padding: "14px 16px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-sm)",
                          background: "var(--gradient-cool)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {app.logo}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.82rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {app.jobTitle}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                          {app.company}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      {app.nextStep}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span>Applied {app.appliedDate}</span>
                      <span
                        className={`score-ring ${
                          app.matchScore >= 85
                            ? "score-high"
                            : app.matchScore >= 70
                              ? "score-medium"
                              : "score-low"
                        }`}
                        style={{
                          width: 28,
                          height: 28,
                          fontSize: "0.6rem",
                        }}
                      >
                        {app.matchScore}
                      </span>
                    </div>
                  </div>
                ))}
                {apps.length === 0 && (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      border: "1px dashed var(--border-glass)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    No applications
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
