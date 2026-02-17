"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../utils/api";
import GlassCard from "../components/ui/GlassCard";

interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  matchScore: number;
  type: string;
  level: string;
  posted: string;
  skills: string[];
  matchReasons: string[];
  description: string;
  skillGap: string[];
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const levels = ["All", "Senior", "Mid", "Junior", "Lead", "Staff"];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (level !== "All") params.set("level", level);
    const qs = params.toString();

    fetchApi<{ jobs: Job[] }>(`/jobs${qs ? `?${qs}` : ""}`)
      .then((res) => setJobs(res.jobs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, level]);

  async function handleApply(jobId: string) {
    setApplying(jobId);
    try {
      await fetchApi(`/jobs/${jobId}/apply`, { method: "POST" });
      setAppliedIds((prev) => new Set(prev).add(jobId));
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>🎯 AI Job Matching</h1>
        <p>Smart matches powered by your skills, experience, and career goals.</p>
      </div>

      {/* Filters */}
      <div
        className="glass-static animate-fade-in"
        style={{
          display: "flex",
          gap: 12,
          padding: "16px 20px",
          marginBottom: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className="input-glass"
          placeholder="Search jobs, companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={level === l ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 14px", fontSize: "0.8rem" }}
            >
              {l}
            </button>
          ))}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          {jobs.length} jobs found
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 240 }} />
          ))}
        </div>
      ) : (
        <div className="cards-grid">
          {jobs.map((job, i) => (
            <GlassCard
              key={job.id}
              className={`stagger-${Math.min(i + 1, 6)}`}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--radius-md)",
                    background: "var(--gradient-cool)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  {job.logo}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {job.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {job.company}
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

              {/* Meta */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                }}
              >
                <span>📍 {job.location}</span>
                <span>💰 {job.salary}</span>
                <span>🏷️ {job.type}</span>
                <span>📅 {job.posted}</span>
              </div>

              {/* Skills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {job.skills.slice(0, 5).map((skill) => (
                  <span key={skill} className="badge badge-violet">
                    {skill}
                  </span>
                ))}
                {job.skills.length > 5 && (
                  <span className="badge badge-blue">+{job.skills.length - 5}</span>
                )}
              </div>

              {/* Match Reasons */}
              {job.matchReasons.length > 0 && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--accent-emerald)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {job.matchReasons.slice(0, 2).map((reason, ri) => (
                    <span key={ri}>✓ {reason}</span>
                  ))}
                </div>
              )}

              {/* Skill Gaps */}
              {job.skillGap.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {job.skillGap.map((gap) => (
                    <span key={gap} className="badge badge-amber" style={{ fontSize: "0.7rem" }}>
                      Gap: {gap}
                    </span>
                  ))}
                </div>
              )}

              {/* Action */}
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => handleApply(job.id)}
                  disabled={applying === job.id || appliedIds.has(job.id)}
                >
                  {appliedIds.has(job.id)
                    ? "✓ Applied"
                    : applying === job.id
                      ? "Applying..."
                      : "⚡ Quick Apply"}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
