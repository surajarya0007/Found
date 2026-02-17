"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../utils/api";
import GlassCard from "../components/ui/GlassCard";

interface Skill {
  name: string;
  level: number;
}

interface UserProfile {
  name: string;
  headline: string;
  location: string;
  avatar: string;
  email: string;
  skills: Skill[];
  careerGoals: {
    targetRoles: string[];
    salaryRange: { min: number; max: number };
    preferredCompanies: string[];
    preferredLocations: string[];
  };
}

interface AiSettings {
  aggressiveMatching: boolean;
  autoNetworking: boolean;
  weeklyDigest: boolean;
  messageTone: string;
  matchThreshold: number;
  networkingFrequency: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi<{ profile: UserProfile; aiSettings: AiSettings }>("/profile")
      .then((res) => {
        setProfile(res.profile);
        setAiSettings(res.aiSettings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleSetting(key: keyof AiSettings) {
    if (!aiSettings) return;
    const value = !aiSettings[key];
    setSaving(true);
    try {
      const res = await fetchApi<{ aiSettings: AiSettings }>("/profile/ai-settings", {
        method: "PUT",
        body: JSON.stringify({ [key]: value }),
      });
      setAiSettings(res.aiSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function updateThreshold(value: number) {
    setSaving(true);
    try {
      const res = await fetchApi<{ aiSettings: AiSettings }>("/profile/ai-settings", {
        method: "PUT",
        body: JSON.stringify({ matchThreshold: value }),
      });
      setAiSettings(res.aiSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
          <div className="skeleton" style={{ height: 400 }} />
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (!profile || !aiSettings) return null;

  const settingsToggles = [
    {
      key: "aggressiveMatching" as const,
      label: "Aggressive Matching",
      description: "Lower threshold for more job matches",
      icon: "🎯",
    },
    {
      key: "autoNetworking" as const,
      label: "Auto Networking",
      description: "Automatically suggest connections",
      icon: "🤖",
    },
    {
      key: "weeklyDigest" as const,
      label: "Weekly Digest",
      description: "Receive weekly summary emails",
      icon: "📧",
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>👤 Profile</h1>
        <p>Manage your profile, skills, and AI preferences.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24 }}>
        {/* Left: Profile Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <GlassCard hover={false}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  margin: "0 auto 14px",
                }}
              >
                {profile.avatar}
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 4 }}>
                {profile.name}
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                {profile.headline}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>📍 {profile.location}</span>
                <span>✉️ {profile.email}</span>
              </div>
            </div>
          </GlassCard>

          {/* Skills */}
          <GlassCard hover={false}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>🛠️ Skills</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {profile.skills.map((skill) => (
                <div key={skill.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: "0.82rem",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{skill.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{skill.level}%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-bar-fill" style={{ width: `${skill.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Career Goals + AI Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Career Goals */}
          <GlassCard hover={false}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
              🎯 Career Goals
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Target Roles
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.careerGoals.targetRoles.map((role) => (
                    <span key={role} className="badge badge-violet">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Salary Range
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  ${(profile.careerGoals.salaryRange.min / 1000).toFixed(0)}k – $
                  {(profile.careerGoals.salaryRange.max / 1000).toFixed(0)}k
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Preferred Companies
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.careerGoals.preferredCompanies.map((company) => (
                    <span key={company} className="badge badge-cyan">
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Preferred Locations
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.careerGoals.preferredLocations.map((loc) => (
                    <span key={loc} className="badge badge-emerald">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* AI Settings */}
          <GlassCard hover={false}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>🤖 AI Settings</h3>
              {saving && (
                <span style={{ fontSize: "0.75rem", color: "var(--accent-violet)" }}>
                  Saving...
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {settingsToggles.map((setting) => (
                <div
                  key={setting.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "1.2rem" }}>{setting.icon}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{setting.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {setting.description}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`toggle-track ${aiSettings[setting.key] ? "active" : ""}`}
                    onClick={() => toggleSetting(setting.key)}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>
              ))}

              {/* Match Threshold */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                      🎚️ Match Threshold
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Minimum match score for job recommendations
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--accent-violet)",
                    }}
                  >
                    {aiSettings.matchThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={aiSettings.matchThreshold}
                  onChange={(e) => {
                    setAiSettings({ ...aiSettings, matchThreshold: Number(e.target.value) });
                  }}
                  onMouseUp={(e) => updateThreshold(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => updateThreshold(Number((e.target as HTMLInputElement).value))}
                  style={{
                    width: "100%",
                    accentColor: "var(--accent-violet)",
                  }}
                />
              </div>

              {/* Message Tone */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: 4 }}>
                  💬 Message Tone
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>
                  Tone for AI-generated outreach messages
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["professional", "casual", "formal"].map((tone) => (
                    <button
                      key={tone}
                      className={
                        aiSettings.messageTone === tone ? "btn-primary" : "btn-ghost"
                      }
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.8rem",
                        textTransform: "capitalize",
                      }}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await fetchApi<{ aiSettings: AiSettings }>(
                            "/profile/ai-settings",
                            {
                              method: "PUT",
                              body: JSON.stringify({ messageTone: tone }),
                            }
                          );
                          setAiSettings(res.aiSettings);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Networking Frequency */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: 4 }}>
                  📅 Networking Frequency
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>
                  How often AI suggests new connections
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["daily", "weekly", "biweekly"].map((freq) => (
                    <button
                      key={freq}
                      className={
                        aiSettings.networkingFrequency === freq ? "btn-primary" : "btn-ghost"
                      }
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.8rem",
                        textTransform: "capitalize",
                      }}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await fetchApi<{ aiSettings: AiSettings }>(
                            "/profile/ai-settings",
                            {
                              method: "PUT",
                              body: JSON.stringify({ networkingFrequency: freq }),
                            }
                          );
                          setAiSettings(res.aiSettings);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
