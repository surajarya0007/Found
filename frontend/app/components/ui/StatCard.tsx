interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  accentColor = "var(--accent-violet)",
}: StatCardProps) {
  return (
    <div className="glass animate-fade-in" style={{ padding: "20px 22px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: "1.5rem",
            width: 42,
            height: 42,
            borderRadius: "var(--radius-md)",
            background: `${accentColor}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{label}</div>
      {subtitle && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
