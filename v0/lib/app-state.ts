import { create } from "zustand"
import type { Stadium } from "./stadiums"

export type AppView = "globe" | "transition" | "dashboard"

interface AppState {
  view: AppView
  selectedStadium: Stadium | null
  setView: (view: AppView) => void
  /** From globe: opens transition → dashboard. */
  selectStadium: (stadium: Stadium) => void
  /** From dashboard: updates stadium without leaving the audit view. */
  setSelectedStadium: (stadium: Stadium) => void
  goBackToGlobe: () => void
}

export const useAppState = create<AppState>((set) => ({
  view: "globe",
  selectedStadium: null,
  setView: (view) => set({ view }),
  selectStadium: (stadium) => set({ selectedStadium: stadium, view: "transition" }),
  setSelectedStadium: (stadium) => set({ selectedStadium: stadium }),
  goBackToGlobe: () => set({ view: "globe", selectedStadium: null }),
}))
