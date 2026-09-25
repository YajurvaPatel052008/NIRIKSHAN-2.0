"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  FilePlus2,
  RefreshCw
} from "lucide-react";
import api from "@/lib/api";

const statusStyles = {
  draft: "border-border bg-bg text-textMuted",
  analyzed: "border-warning/30 bg-warning/5 text-warning",
  reviewed: "border-success/30 bg-success/5 text-success",
  exported: "border-primary/20 bg-primary/5 text-primary"
};

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState([]);
  const [reviewAlerts, setReviewAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalyses = async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/analyses");
      const items = Array.isArray(data) ? data : data.items || data.analyses || [];
      setAnalyses(items);

      const analyzed = items.filter(
        (analysis) => String(analysis.status).toLowerCase() === "analyzed"
      );
      const alertResults = await Promise.all(
        analyzed.map(async (analysis) => {
          try {
            const response = await api.get(
              `/api/analyses/${analysis.id}/recommendations`
            );
            return response.data?.length ? analysis : null;
          } catch {
            return null;
          }
        })
      );
      setReviewAlerts(alertResults.filter(Boolean));
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setError(
          "The analysis list endpoint is not available yet. Ask the backend team to add GET /api/analyses."
        );
      } else {
        setError("Unable to load analyses. Please try again.");
      }
      setAnalyses([]);
      setReviewAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const stats = useMemo(() => {
    const count = (status) =>
      analyses.filter(
        (analysis) => String(analysis.status).toLowerCase() === status
      ).length;
    return [
      { label: "Total analyses", value: analyses.length },
      { label: "In review", value: count("analyzed") },
      { label: "Completed", value: count("reviewed") + count("exported") }
    ];
  }, [analyses]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
            Procurement intelligence
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Dashboard
          </h1>
          <p className="mt-2 text-textMuted">
            Track specifications, recommendations, and review progress.
          </p>
        </div>
        <Link
          href="/analyses/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primaryDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <FilePlus2 size={17} aria-hidden="true" />
          New Analysis
        </Link>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-3 border border-warning/30 bg-warning/5 p-4 text-sm text-warning" role="alert">
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={loadAnalyses}
            className="inline-flex shrink-0 items-center gap-1 font-semibold underline underline-offset-4"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Analysis summary">
        {isLoading
          ? [1, 2, 3].map((item) => <SkeletonCard key={item} />)
          : stats.map((stat) => (
              <div key={stat.label} className="border border-border bg-surface p-5">
                <p className="text-sm text-textMuted">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-text">{stat.value}</p>
              </div>
            ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border border-border bg-surface" aria-labelledby="recent-analyses">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 id="recent-analyses" className="font-semibold text-text">
                Recent Analyses
              </h2>
              <p className="mt-1 text-sm text-textMuted">Your latest procurement specifications.</p>
            </div>
            <ClipboardList size={20} className="text-primary" aria-hidden="true" />
          </div>
          {isLoading ? (
            <TableSkeleton />
          ) : analyses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-textMuted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analyses.map((analysis) => {
                    const status = String(analysis.status || "draft").toLowerCase();
                    return (
                      <tr key={analysis.id} className="hover:bg-bg/70">
                        <td className="px-5 py-4 font-medium text-text">
                          {analysis.title || "Untitled analysis"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
                              statusStyles[status] || statusStyles.draft
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-textMuted">
                          {formatDate(analysis.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/analyses/${analysis.id}`}
                            className="font-semibold text-primary underline decoration-accent underline-offset-4"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="border border-border bg-surface" aria-labelledby="review-alerts">
          <div className="border-b border-border px-5 py-4">
            <h2 id="review-alerts" className="font-semibold text-text">
              Review Alerts
            </h2>
            <p className="mt-1 text-sm text-textMuted">
              Analyses awaiting reviewer attention.
            </p>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">
              <div className="h-12 animate-pulse bg-bg" />
              <div className="h-12 animate-pulse bg-bg" />
            </div>
          ) : reviewAlerts.length === 0 ? (
            <div className="p-5 text-sm text-textMuted">No pending review alerts.</div>
          ) : (
            <ul className="divide-y divide-border">
              {reviewAlerts.map((analysis) => (
                <li key={analysis.id} className="p-5">
                  <p className="font-medium text-text">{analysis.title || "Untitled analysis"}</p>
                  <p className="mt-1 text-xs text-textMuted">
                    Analyzed {formatDate(analysis.created_at)}
                  </p>
                  <Link
                    href={`/analyses/${analysis.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Review recommendations
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium"
      }).format(date);
}

function SkeletonCard() {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="h-4 w-28 animate-pulse bg-bg" />
      <div className="mt-3 h-9 w-12 animate-pulse bg-bg" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-5" aria-label="Loading analyses">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="grid grid-cols-4 gap-4">
          <div className="h-5 animate-pulse bg-bg" />
          <div className="h-5 w-20 animate-pulse bg-bg" />
          <div className="h-5 w-28 animate-pulse bg-bg" />
          <div className="ml-auto h-5 w-12 animate-pulse bg-bg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <ClipboardList className="mx-auto text-textMuted" size={28} aria-hidden="true" />
      <p className="mt-3 font-medium text-text">No analyses yet</p>
      <p className="mt-1 text-sm text-textMuted">
        Start with a procurement specification to receive standards recommendations.
      </p>
      <Link
        href="/analyses/new"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-accent underline-offset-4"
      >
        Create your first analysis
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}
