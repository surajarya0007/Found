import { type CSSProperties, type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({
  children,
  style,
  className = "",
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={`${hover ? "glass" : "glass-static"} animate-fade-in ${className}`}
      style={{ padding: "22px", ...style }}
    >
      {children}
    </div>
  );
}
