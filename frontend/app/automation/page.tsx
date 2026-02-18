"use client";

import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/ui/GlassCard";
import { fetchApi } from "../utils/api";

type LinkedInAgentMode = "assist" | "autopilot";

interface LinkedInAgentRun {
  id: string;
  mode: LinkedInAgentMode;
  company: string;
  role: string;
  createdAt: string;
  status: "running" | "success" | "partial" | "error";
  summary: {
    jobMatchesFound: number;
    applicationsSubmitted: number;
    recruiterMessagesPrepared: number;
    referralRequestsPrepared: number;
  };
  steps: Array<{ id: string; label: string; status: string; detail: string }>;
}

interface LinkedInBrowserRun {
  id: string;
  createdAt: string;
  query: string;
  location: string;
  status: "running" | "success" | "partial" | "error";
  discoveredJobs: Array<{ title: string; company: string; url: string }>;
  steps: Array<{ id: string; label: string; status: string; detail: string }>;
}

const statusBadge: Record<string, string> = {
  running: "status-screening",
  success: "status-interview",
  partial: "status-screening",
  error: "status-error",
  default: "badge-blue",
};

export default function AutomationPage() {
  const [agentRuns, setAgentRuns] = useState<LinkedInAgentRun[]>([]);
  const [browserRuns, setBrowserRuns] = useState<LinkedInBrowserRun[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("software engineer");
  const [mode, setMode] = useState<LinkedInAgentMode>("assist");
  const [approveApply, setApproveApply] = useState(false);
  const [approveOutreach, setApproveOutreach] = useState(false);
  const [approveReferral, setApproveReferral] = useState(false);

  const [browserLocation, setBrowserLocation] = useState("Remote");
  const [browserMaxJobs, setBrowserMaxJobs] = useState(5);
  const [browserSubmit, setBrowserSubmit] = useState(false);
  const [browserMessages, setBrowserMessages] = useState(false);
  const [browserApproveSubmit, setBrowserApproveSubmit] = useState(false);
  const [browserApproveMessage, setBrowserApproveMessage] = useState(false);
  const [browserConnectEmployees, setBrowserConnectEmployees] = useState(false);
  const [browserApproveConnections, setBrowserApproveConnections] = useState(false);

  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1",
    [],
  );

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, browserRes] = await Promise.all([
          fetchApi<{ runs: LinkedInAgentRun[] }>("/agents/linkedin/runs"),
          fetchApi<{ runs: LinkedInBrowserRun[] }>("/agents/linkedin/browser-runs"),
        ]);

        setAgentRuns(agentRes.runs || []);
        setBrowserRuns(browserRes.runs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    const streamUrl = `${API_BASE}/automation/stream`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.agents || payload?.browsers) {
          if (payload.agents) setAgentRuns(payload.agents);
          if (payload.browsers) setBrowserRuns(payload.browsers);
          return;
        }

        if (payload?.source === "agent" && payload.run) {
          setAgentRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === payload.run.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = payload.run;
              return copy;
            }
            return [payload.run, ...prev];
          });
        }

        if (payload?.source === "browser" && payload.run) {
          setBrowserRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === payload.run.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = payload.run;
              return copy;
            }
            return [payload.run, ...prev];
          });
        }
      } catch (err) {
        console.error("automation stream parse error", err);
      }
    };

    es.onerror = (err) => {
      console.warn("automation SSE disconnected", err);
    };

    return () => es.close();
  }, [API_BASE]);

  async function startAgentRun() {
    try {
      const res = await fetchApi<{ run: LinkedInAgentRun }>("/agents/linkedin/runs", {
        method: "POST",
        body: JSON.stringify({
          searchQuery: query,
          mode,
          approvals: {
            submitApplication: approveApply,
            sendOutreach: approveOutreach,
            requestReferral: approveReferral,
          },
        }),
      });

      setAgentRuns((prev) => [res.run, ...prev]);
    } catch (err) {
      console.error(err);
    }
  }

  async function startBrowserRun() {
    try {
      const res = await fetchApi<{ run: LinkedInBrowserRun }>("/agents/linkedin/browser-runs", {
        method: "POST",
        body: JSON.stringify({
          searchQuery: query,
          location: browserLocation,
          maxJobs: browserMaxJobs,
          submitApplications: browserSubmit,
          sendRecruiterMessages: browserMessages,
          approvals: {
            submitApplications: browserApproveSubmit,
            sendMessages: browserApproveMessage,
            sendConnections: browserApproveConnections,
          },
          connectWithEmployees: browserConnectEmployees,
        }),
      });

      setBrowserRuns((prev) => [res.run, ...prev]);
    } catch (err) {
      console.error(err);
    }
  }

  const loadingSkeleton = useMemo(
    () => (
      <div className="cards-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 200 }} />
        ))}
      </div>
    ),
    [],
  );

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>⚡ LinkedIn Automation</h1>
        <p>Discover roles, apply, and queue outreach with approval gates.</p>
      </div>

      {(() => {
        const runningAgents = agentRuns.filter((r) => r.status === "running");
        const runningBrowsers = browserRuns.filter((r) => r.status === "running");
        if (runningAgents.length === 0 && runningBrowsers.length === 0) return null;
        return (
          <GlassCard hover={false} className="animate-fade-in" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>🟡</span>
              <div style={{ fontWeight: 600 }}>Runs in progress</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.9rem" }}>
              {runningAgents.map((run) => (
                <div key={run.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{run.role}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {run.company} · agent run
                    </div>
                  </div>
                  <span className={`badge ${statusBadge[run.status] || "badge-blue"}`}>{run.status}</span>
                </div>
              ))}
              {runningBrowsers.map((run) => (
                <div key={run.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{run.query}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {run.location} · browser run
                    </div>
                  </div>
                  <span className={`badge ${statusBadge[run.status] || "badge-blue"}`}>{run.status}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        );
      })()}

      {/* Controls */}
      <div className="cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <GlassCard hover={false}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>🤖 Agent Run</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="input-glass"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query (role, company, keyword)"
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["assist", "autopilot"].map((m) => (
                <button
                  key={m}
                  className={mode === m ? "btn-primary" : "btn-ghost"}
                  style={{ padding: "8px 14px" }}
                  onClick={() => setMode(m as LinkedInAgentMode)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={approveApply} onChange={(e) => setApproveApply(e.target.checked)} />
                Approve apply now
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={approveOutreach}
                  onChange={(e) => setApproveOutreach(e.target.checked)}
                />
                Approve recruiter outreach
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={approveReferral}
                  onChange={(e) => setApproveReferral(e.target.checked)}
                />
                Approve referral requests
              </label>
            </div>
            <button className="btn-primary" onClick={startAgentRun} style={{ justifyContent: "center" }}>
              🚀 Start agent run
            </button>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>🌐 Browser Run</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="input-glass"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query (reuses above)"
            />
            <input
              className="input-glass"
              value={browserLocation}
              onChange={(e) => setBrowserLocation(e.target.value)}
              placeholder="Location (e.g., Remote, San Francisco)"
            />
            <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ whiteSpace: "nowrap" }}>Max jobs</span>
              <input
                type="number"
                min={1}
                max={10}
                value={browserMaxJobs}
                onChange={(e) => setBrowserMaxJobs(Number(e.target.value))}
                style={{ width: 80, background: "transparent", color: "var(--text-primary)", border: "none" }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserSubmit}
                  onChange={(e) => setBrowserSubmit(e.target.checked)}
                />
                Attempt Easy Apply
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserMessages}
                  onChange={(e) => setBrowserMessages(e.target.checked)}
                />
                Message recruiters
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserConnectEmployees}
                  onChange={(e) => setBrowserConnectEmployees(e.target.checked)}
                />
                Connect with employees
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserApproveSubmit}
                  onChange={(e) => setBrowserApproveSubmit(e.target.checked)}
                />
                Approve submission
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserApproveMessage}
                  onChange={(e) => setBrowserApproveMessage(e.target.checked)}
                />
                Approve messaging
              </label>
              <label className="input-glass" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={browserApproveConnections}
                  onChange={(e) => setBrowserApproveConnections(e.target.checked)}
                />
                Approve connections
              </label>
            </div>
            <button className="btn-primary" onClick={startBrowserRun} style={{ justifyContent: "center" }}>
              🌐 Start browser run
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Runs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, marginTop: 24 }}>
        <GlassCard hover={false}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Agent history</h3>
          {loading ? (
            loadingSkeleton
          ) : agentRuns.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No runs yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {agentRuns.map((run) => (
                <div key={run.id} className="glass" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{run.role}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {run.company} · {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`badge ${statusBadge[run.status] || "badge-blue"}`}>
                      {run.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <span>Matches: {run.summary.jobMatchesFound}</span>
                    <span>Applied: {run.summary.applicationsSubmitted}</span>
                    <span>Recruiters: {run.summary.recruiterMessagesPrepared}</span>
                    <span>Referrals: {run.summary.referralRequestsPrepared}</span>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {run.steps.slice(0, 4).map((step) => (
                      <div
                        key={step.id}
                        style={{
                          fontSize: "0.82rem",
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <strong>{step.label}</strong> — {step.status}
                        <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{step.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Browser history</h3>
          {loading ? (
            loadingSkeleton
          ) : browserRuns.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No runs yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {browserRuns.map((run) => (
                <div key={run.id} className="glass" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{run.query}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {run.location} · {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`badge ${statusBadge[run.status] || "badge-blue"}`}>
                      {run.status}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Jobs found: {run.discoveredJobs.length}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {run.steps.slice(0, 4).map((step) => (
                      <div
                        key={step.id}
                        style={{
                          fontSize: "0.8rem",
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <strong>{step.label}</strong> — {step.status}
                        <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{step.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
