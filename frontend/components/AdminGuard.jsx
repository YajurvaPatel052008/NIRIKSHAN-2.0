"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token || role !== "admin") router.replace("/dashboard");
  }, [hasHydrated, role, router, token]);

  if (!hasHydrated || !token || role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-textMuted">
        Checking administrator access…
      </div>
    );
  }

  return children;
}
