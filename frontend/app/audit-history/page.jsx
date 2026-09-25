"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AuditHistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/analyses")
      .then(({ data }) => setAnalyses(data))
      .catch(() => setError("Audit history could not be loaded."));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
        Accountability
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-text">Audit history</h1>
      <p className="mt-2 text-textMuted">Choose an analysis to view its activity timeline.</p>
      {error ? <p className="mt-6 border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</p> : null}
      <div className="mt-8 divide-y divide-border border border-border bg-surface">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-text">{analysis.title || "Untitled analysis"}</p>
              <p className="mt-1 text-sm capitalize text-textMuted">{analysis.status}</p>
            </div>
            <Link
              href={`/analyses/${analysis.id}/history`}
              className="font-semibold text-primary underline decoration-accent underline-offset-4"
            >
              View history
            </Link>
          </div>
        ))}
        {!error && analyses.length === 0 ? (
          <p className="p-5 text-sm text-textMuted">No analyses have been created yet.</p>
        ) : null}
      </div>
    </div>
  );
}
