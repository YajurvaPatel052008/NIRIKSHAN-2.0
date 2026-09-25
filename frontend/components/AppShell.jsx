"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  FileSearch,
  Gauge,
  History,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "New Analysis", href: "/analyses/new", icon: FileSearch },
  { label: "Audit History", href: "/audit-history", icon: History }
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isPublicRoute =
    pathname === "/" || pathname === "/login" || pathname === "/register";

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (isPublicRoute && token) {
      router.replace("/dashboard");
    } else if (!isPublicRoute && !token) {
      router.replace("/login");
    }
  }, [hasHydrated, isPublicRoute, pathname, router, token]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (isPublicRoute) {
    return <div className="min-h-screen bg-bg">{children}</div>;
  }

  if (!hasHydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-textMuted">
        Loading secure workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pt-1">
      <aside className="fixed bottom-0 left-0 top-1 z-40 flex w-64 flex-col bg-primary text-white">
        <div className="border-b border-white/20 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <ClipboardList size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">NIRIKSHAN</p>
              <p className="text-xs text-white/70">AI Standards Engine</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-white/20 bg-primaryDark text-white"
                    : "border-transparent text-white/80 hover:border-white/20 hover:bg-primaryDark hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                pathname.startsWith("/admin")
                  ? "border-white/20 bg-primaryDark text-white"
                  : "border-transparent text-white/80 hover:border-white/20 hover:bg-primaryDark hover:text-white"
              }`}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-white/20 px-6 py-4 text-xs text-white/60">
          SIH26108 · Prototype
        </div>
      </aside>
      <div className="ml-64 min-h-screen">
        <header className="sticky top-1 z-30 flex h-16 items-center justify-end border-b border-border bg-surface px-8">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-text">
                {user?.full_name || user?.email || "Guest user"}
              </p>
              <p className="text-xs capitalize text-textMuted">{user?.role || "Not signed in"}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-textMuted transition-colors hover:border-accent hover:text-text"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-8">{children}</main>
      </div>
    </div>
  );
}
