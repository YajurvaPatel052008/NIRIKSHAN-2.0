"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, FileText, ShieldCheck, TrendingUp } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import AdminErrorMessage from "@/components/AdminErrorMessage";
import api from "@/lib/api";

const statCards = [
  { key: "total_standards", label: "Total standards", icon: ShieldCheck },
  { key: "total_analyses", label: "Total analyses", icon: FileText },
  { key: "total_recommendations", label: "Total recommendations", icon: ClipboardList }
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/admin/stats")
      .then(({ data }) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setError("Unable to load admin statistics. Please try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminGuard>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-border pb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Administration</p>
          <h1 className="text-3xl font-semibold tracking-tight text-text">Admin dashboard</h1>
          <p className="mt-2 text-textMuted">Platform inventory and review activity.</p>
        </header>

        {error && <AdminErrorMessage message={error} />}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform statistics">
          {statCards.map(({ key, label, icon: Icon }) => (
            <div key={key} className="border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-textMuted">{label}</p>
                <Icon size={19} className="text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-text">
                {stats ? stats[key] ?? 0 : "—"}
              </p>
            </div>
          ))}
          <div className="border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Acceptance rate</p>
              <TrendingUp size={19} className="text-accent" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-text">
              {stats ? `${Math.round(Number(stats.acceptance_rate || 0) * 100)}%` : "—"}
            </p>
          </div>
        </section>

        <nav className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Admin tools">
          <AdminLink href="/admin/standards" title="Manage standards" description="Search, add, and edit standards and their relationships." />
          <AdminLink href="/admin/logs" title="Audit logs" description="Review platform actions with paginated audit events." />
        </nav>
      </div>
    </AdminGuard>
  );
}

function AdminLink({ href, title, description }) {
  return (
    <Link href={href} className="block border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <h2 className="font-semibold text-primary">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-textMuted">{description}</p>
    </Link>
  );
}
