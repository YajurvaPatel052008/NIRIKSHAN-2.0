"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      currentAnalysisId: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setCurrentAnalysisId: (currentAnalysisId) => set({ currentAnalysisId }),
      setAuth: ({ user, token }) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null, currentAnalysisId: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated })
    }),
    {
      name: "NIRIKSHAN-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
