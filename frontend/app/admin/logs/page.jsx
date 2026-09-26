"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import AdminErrorMessage from "@/components/AdminErrorMessage";
import api from "@/lib/api";

const pageSize = 25;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/admin/audit-logs", {
        params: { offset: page * pageSize, limit: pageSize }
      });
      setLogs(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to load audit logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <AdminGuard>
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-textMuted hover:text-text">
          <ArrowLeft size={16} aria-hidden="true" /> Admin dashboard
        </Link>
        <header className="mb-6 mt-5 border-b border-border pb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Administration</p>
          <h1 className="text-3xl font-semibold tracking-tight text-text">Audit logs</h1>
          <p className="mt-2 text-textMuted">Platform events, newest first.</p>
        </header>
        {error && <AdminErrorMessage message={error} />}
        <section className="border border-border bg-surface">
          {loading ? <p className="p-6 text-sm text-textMuted">Loading audit logs…</p> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-textMuted">
                    <tr><th className="px-5 py-3">Timestamp</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Analysis</th><th className="px-5 py-3">Actor ID</th><th className="px-5 py-3">Details</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top hover:bg-bg/70">
                        <td className="whitespace-nowrap px-5 py-4 text-textMuted">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-5 py-4 font-medium text-text">{log.action}</td>
                        <td className="px-5 py-4"><Link href={`/analyses/${log.analysis_id}/history`} className="font-mono text-primary underline decoration-border underline-offset-4">#{log.analysis_id}</Link></td>
                        <td className="px-5 py-4 font-mono text-textMuted">{log.user_id}</td>
                        <td className="max-w-sm px-5 py-4"><pre className="whitespace-pre-wrap break-words font-mono text-xs text-textMuted">{JSON.stringify(log.details || {}, null, 2)}</pre></td>
                      </tr>
                    ))}
                    {!logs.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-textMuted">No audit log entries on this page.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <p className="text-sm text-textMuted">
                  {logs.length ? `Showing ${page * pageSize + 1}–${page * pageSize + logs.length}` : "No entries"} · Page {page + 1}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-textMuted disabled:opacity-40">
                    <ChevronLeft size={16} aria-hidden="true" /> Previous
                  </button>
                  <button type="button" disabled={logs.length < pageSize || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-textMuted disabled:opacity-40">
                    Next <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminGuard>
  );
}
