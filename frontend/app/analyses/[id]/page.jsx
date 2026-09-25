"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AnalysisEntryPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function redirectToAnalysis() {
      try {
        const { data } = await api.get(`/api/analyses/${id}`);
        if (cancelled) return;
        const status = String(data.status || "draft").toLowerCase();
        const destination = status === "reviewed" || status === "exported"
          ? "results"
          : "review";
        router.replace(`/analyses/${id}/${destination}`);
      } catch {
        if (!cancelled) router.replace("/dashboard");
      }
    }

    if (id) redirectToAnalysis();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <main className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center">
      <p className="text-sm text-textMuted">Opening analysis…</p>
    </main>
  );
}
