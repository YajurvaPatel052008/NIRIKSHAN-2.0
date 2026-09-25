"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function AnalysisHistoryPage() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get(`/api/analyses/${id}/audit-history`)
      .then(({ data }) => setEntries(data))
      .catch(() => setError("This analysis history could not be loaded."));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/audit-history" className="text-sm font-semibold text-primary underline decoration-accent underline-offset-4">
        Back to audit history
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-text">Analysis history</h1>
      {error ? <p className="mt-6 border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</p> : null}
      <ol className="mt-8 space-y-4 border-l-2 border-border pl-6">
        {entries.map((entry) => (
          <li key={entry.id} className="relative border border-border bg-surface p-4">
            <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
            <p className="font-semibold capitalize text-text">{entry.action}</p>
            <p className="mt-1 text-sm text-textMuted">
              {entry.actor || `User ${entry.user_id}`} · {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Unknown time"}
            </p>
            {entry.details ? <pre className="mt-3 whitespace-pre-wrap text-xs text-textMuted">{JSON.stringify(entry.details, null, 2)}</pre> : null}
          </li>
        ))}
        {!error && entries.length === 0 ? <li className="text-sm text-textMuted">No audit events recorded yet.</li> : null}
      </ol>
    </div>
  );
}
