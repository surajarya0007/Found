"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../utils/api";
import GlassCard from "../components/ui/GlassCard";

interface Connection {
  id: string;
  name: string;
  headline: string;
  company: string;
  avatar: string;
  mutualConnections: number;
  relevanceScore: number;
  status: string;
  tags: string[];
}

interface FollowUp {
  id: string;
  contactName: string;
  company: string;
  scheduledDate: string;
  type: string;
  aiMessage: string;
  status: string;
}

export default function NetworkPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [draftTarget, setDraftTarget] = useState<{ name: string; company: string } | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [drafting, setDrafting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi<{ connections: Connection[] }>(
        `/network/connections${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
      ),
      fetchApi<{ followUps: FollowUp[] }>("/network/followups"),
    ])
      .then(([connRes, fuRes]) => {
        setConnections(connRes.connections);
        setFollowUps(fuRes.followUps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function handleDraft(name: string, company: string) {
    setDraftTarget({ name, company });
    setDrafting(true);
    try {
      const res = await fetchApi<{ message: string }>("/network/messages/draft", {
        method: "POST",
        body: JSON.stringify({ name, company, tone: "professional" }),
      });
      setDraftMessage(res.message);
    } catch (err) {
      console.error(err);
    } finally {
      setDrafting(false);
    }
  }

  async function handleSendOutreach() {
    if (!draftTarget || !draftMessage) return;
    try {
      await fetchApi("/network/outreach", {
        method: "POST",
        body: JSON.stringify({
          contactName: draftTarget.name,
          company: draftTarget.company,
          message: draftMessage,
        }),
      });
      // Refresh follow-ups
      const res = await fetchApi<{ followUps: FollowUp[] }>("/network/followups");
      setFollowUps(res.followUps);
      setDraftTarget(null);
      setDraftMessage("");
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
        <div className="cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  const statusFilters = [
    { key: "all", label: "All" },
    { key: "suggested", label: "Suggested" },
    { key: "pending", label: "Pending" },
    { key: "connected", label: "Connected" },
  ];

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>🤝 Networking Hub</h1>
        <p>Build meaningful connections and manage your professional network.</p>
      </div>

      {/* Filters */}
      <div
        className="glass-static animate-fade-in"
        style={{
          display: "flex",
          gap: 8,
          padding: "14px 20px",
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setStatusFilter(f.key);
              setLoading(true);
            }}
            className={statusFilter === f.key ? "btn-primary" : "btn-ghost"}
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            {f.label}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}
        >
          {connections.length} connections
        </span>
      </div>

      {/* Draft Modal */}
      {draftTarget && (
        <GlassCard hover={false} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              💬 Draft Message for {draftTarget.name}
            </h3>
            <button
              onClick={() => {
                setDraftTarget(null);
                setDraftMessage("");
              }}
              className="btn-ghost"
              style={{ padding: "4px 12px" }}
            >
              ✕
            </button>
          </div>
          {drafting ? (
            <div className="skeleton" style={{ height: 100 }} />
          ) : (
            <>
              <textarea
                className="input-glass"
                rows={5}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                style={{ resize: "vertical", marginBottom: 12 }}
              />
              <button className="btn-primary" onClick={handleSendOutreach}>
                📤 Send Outreach
              </button>
            </>
          )}
        </GlassCard>
      )}

      {/* Connections Grid */}
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            marginBottom: 16,
            color: "var(--text-primary)",
          }}
        >
          Connections
        </h2>
        <div className="cards-grid">
          {connections.map((conn, i) => (
            <GlassCard
              key={conn.id}
              className={`stagger-${Math.min(i + 1, 6)}`}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--gradient-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  {conn.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{conn.name}</div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {conn.headline}
                  </div>
                </div>
                <span className={`badge status-${conn.status}`}>{conn.status}</span>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                🏢 {conn.company} · 👥 {conn.mutualConnections} mutual
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {conn.tags.map((tag) => (
                  <span key={tag} className="badge badge-cyan" style={{ fontSize: "0.7rem" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                <div
                  style={{
                    flex: 1,
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Relevance: {conn.relevanceScore}%
                </div>
                <button
                  className="btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                  onClick={() => handleDraft(conn.name, conn.company)}
                >
                  💬 Draft
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Follow-ups */}
      <h2
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: 16,
          color: "var(--text-primary)",
        }}
      >
        📅 Follow-ups
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {followUps.map((fu) => (
          <GlassCard key={fu.id} style={{ padding: "16px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fu.contactName}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  {fu.company} · {fu.type}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {fu.scheduledDate}
                </span>
                <span className={`badge status-${fu.status}`}>{fu.status}</span>
              </div>
            </div>
            {fu.aiMessage && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: "3px solid var(--accent-violet)",
                  whiteSpace: "pre-line",
                  maxHeight: 80,
                  overflow: "hidden",
                }}
              >
                {fu.aiMessage}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
