import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Link from "next/link";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Found – AI Job Search Dashboard",
  description:
    "AI-powered job search dashboard with smart matching, networking automation, and application tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <Sidebar />
        <main
          style={{
            marginLeft: "var(--sidebar-width)",
            minHeight: "100vh",
            transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 40,
              padding: "12px 24px",
              background: "linear-gradient(180deg, rgba(10,14,26,0.9), rgba(10,14,26,0))",
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <Link
              href="/automation"
              className="btn-ghost"
              style={{
                borderColor: "var(--border-active)",
                color: "var(--text-primary)",
                padding: "8px 14px",
              }}
            >
              ⚡ Automation
            </Link>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
