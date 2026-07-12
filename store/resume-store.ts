"use client";

import { createStore, useStore } from "zustand";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { createElement } from "react";
import type { ResumeData } from "@/lib/types/resume";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ResumeState {
  data: ResumeData;
  saveStatus: SaveStatus;
  setData: (patch: Partial<ResumeData>) => void;
  replaceData: (data: ResumeData) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

type ResumeStoreApi = ReturnType<typeof createResumeStore>;

const ResumeStoreContext = createContext<ResumeStoreApi | null>(null);

export function createResumeStore(initial: ResumeData) {
  return createStore<ResumeState>((set) => ({
    data: initial,
    saveStatus: "idle",
    setData: (patch) => set((state) => ({ data: { ...state.data, ...patch } })),
    replaceData: (data) => set({ data }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
  }));
}

export function ResumeStoreProvider({
  initial,
  children,
}: {
  initial: ResumeData;
  children: ReactNode;
}) {
  const storeRef = useRef<ResumeStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createResumeStore(initial);
  }
  return createElement(ResumeStoreContext.Provider, { value: storeRef.current }, children);
}

export function useResumeStore<T>(selector: (state: ResumeState) => T): T {
  const store = useContext(ResumeStoreContext);
  if (!store) {
    throw new Error("useResumeStore must be used within a ResumeStoreProvider");
  }
  return useStore(store, selector);
}
