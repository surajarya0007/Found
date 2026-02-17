"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../utils/api";
import GlassCard from "../components/ui/GlassCard";

interface Referral {
  id: string;
  targetCompany: string;
  targetRole: string;
  referrer: string;
  referrerTitle: string;
  status: string;
  dateSent: string;
  message: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    targetCompany: "",
    targetRole: "",
    referrer: "",
    referrerTitle: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApi<{ referrals: Referral[] }>("/referrals")
      .then((res) => setReferrals(res.referrals))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetchApi<{ referral: Referral }>("/referrals/request", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setReferrals((prev) => [res.referral, ...prev]);
      setShowForm(false);
      setForm({ targetCompany: "", targetRole: "", referrer: "", referrerTitle: "", message: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const statusEmojis: Record<string, string> = {
    sent: "📤",
    viewed: "👀",
    responded: "💬",
    referred: "✅",
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
        <div className="cards-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>🔗 Referrals</h1>
            <p>Track referral requests and leverage your network.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Request Referral"}
          </button>
        </div>
      </div>

      {/* Request Form */}
      {showForm && (
        <GlassCard hover={false} style={{ marginBottom: 24 }} className="animate-fade-in">
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
            📝 New Referral Request
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <input
              className="input-glass"
              placeholder="Company"
              value={form.targetCompany}
              onChange={(e) => setForm({ ...form, targetCompany: e.target.value })}
            />
            <input
              className="input-glass"
              placeholder="Target Role"
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
            />
            <input
              className="input-glass"
              placeholder="Referrer Name"
              value={form.referrer}
              onChange={(e) => setForm({ ...form, referrer: e.target.value })}
            />
            <input
              className="input-glass"
              placeholder="Referrer Title (optional)"
              value={form.referrerTitle}
              onChange={(e) => setForm({ ...form, referrerTitle: e.target.value })}
            />
          </div>
          <textarea
            className="input-glass"
            placeholder="Message to referrer..."
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            style={{ resize: "vertical", marginBottom: 12 }}
          />
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !form.targetCompany || !form.targetRole || !form.referrer || !form.message}
          >
            {submitting ? "Sending..." : "📤 Send Request"}
          </button>
        </GlassCard>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {(["sent", "viewed", "responded", "referred"] as const).map((status) => {
          const count = referrals.filter((r) => r.status === status).length;
          return (
            <div
              key={status}
              className="glass animate-fade-in"
              style={{ padding: "18px 20px", textAlign: "center" }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>
                {statusEmojis[status]}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{count}</div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Referral Cards */}
      <div className="cards-grid">
        {referrals.map((ref, i) => (
          <GlassCard
            key={ref.id}
            className={`stagger-${Math.min(i + 1, 6)}`}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>{ref.targetCompany}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {ref.targetRole}
                </div>
              </div>
              <span className={`badge status-${ref.status}`}>
                {statusEmojis[ref.status]} {ref.status}
              </span>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                👤 {ref.referrer}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {ref.referrerTitle}
              </div>
            </div>

            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                whiteSpace: "pre-line",
                maxHeight: 60,
                overflow: "hidden",
                lineHeight: 1.5,
              }}
            >
              {ref.message}
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "auto" }}>
              Sent {ref.dateSent}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
