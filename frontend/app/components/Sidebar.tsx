"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/jobs", label: "AI Job Matching", icon: "🎯" },
  { href: "/applications", label: "Applications", icon: "📋" },
  { href: "/network", label: "Networking Hub", icon: "🤝" },
  { href: "/referrals", label: "Referrals", icon: "🔗" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="animate-slide-left"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
        background: "rgba(10, 14, 26, 0.95)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid var(--border-glass)",
        display: "flex",
        flexDirection: "column",
        padding: collapsed ? "24px 12px" : "24px 16px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
        overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          marginBottom: 32,
          padding: collapsed ? "0" : "0 4px",
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              F
            </div>
            <span
              className="gradient-text"
              style={{ fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}
            >
              Found
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "1.1rem",
            padding: 4,
            borderRadius: "var(--radius-sm)",
            transition: "all 0.2s",
          }}
          aria-label="Toggle sidebar"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "12px" : "12px 14px",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "rgba(139, 92, 246, 0.12)" : "transparent",
                borderLeft: isActive ? "3px solid var(--accent-violet)" : "3px solid transparent",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.9rem",
                transition: "all 0.2s ease",
                justifyContent: collapsed ? "center" : "flex-start",
                whiteSpace: "nowrap",
              }}
              title={item.label}
            >
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: "16px 14px",
            borderTop: "1px solid var(--border-glass)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            SA
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Suraj Arya</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Full Stack Developer
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
