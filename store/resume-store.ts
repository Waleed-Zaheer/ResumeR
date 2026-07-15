"use client";

import { createStore, useStore, type Mutate, type StoreApi } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createElement } from "react";
import type { ResumeData } from "@/lib/types/resume";
import { createEmptyResumeData } from "@/lib/validations/resume";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const DRAFT_STORAGE_KEY = "resumeforge:draft:v1";

interface ResumeState {
  data: ResumeData;
  saveStatus: SaveStatus;
  setData: (patch: Partial<ResumeData>) => void;
  replaceData: (data: ResumeData) => void;
  resetData: () => void;
  setSaveStatus: (status: SaveStatus) => void;
}

type ResumeStoreApi = Mutate<StoreApi<ResumeState>, [["zustand/persist", PersistedDraft]]>;

const ResumeStoreContext = createContext<ResumeStoreApi | null>(null);

interface PersistedDraft {
  data: ResumeData;
}

/**
 * Wraps `localStorage` so a full/unavailable storage (private browsing,
 * quota exceeded) surfaces as a `saveStatus: "error"` instead of throwing
 * and crashing the builder.
 */
function createSafeStorage(onError: (error: unknown) => void): PersistStorage<PersistedDraft> {
  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (error) {
        onError(error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        onError(error);
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        onError(error);
      }
    },
  };
}

export function createResumeStore(initial: ResumeData): ResumeStoreApi {
  const store: ResumeStoreApi = createStore<ResumeState>()(
    persist(
      (set) => ({
        data: initial,
        saveStatus: "idle",
        setData: (patch) => set((state) => ({ data: { ...state.data, ...patch }, saveStatus: "saved" })),
        replaceData: (data) => set({ data, saveStatus: "saved" }),
        resetData: () => set({ data: createEmptyResumeData(), saveStatus: "idle" }),
        setSaveStatus: (saveStatus) => set({ saveStatus }),
      }),
      {
        name: DRAFT_STORAGE_KEY,
        storage: createSafeStorage((error) => {
          console.error("Resume draft: local save failed", error);
          store.setState({ saveStatus: "error" });
        }),
        partialize: (state) => ({ data: state.data }),
        skipHydration: true,
      }
    )
  );

  return store;
}

export function ResumeStoreProvider({
  initial,
  children,
}: {
  initial: ResumeData;
  children: ReactNode;
}) {
  const [store] = useState<ResumeStoreApi>(() => createResumeStore(initial));

  useEffect(() => {
    store.persist.rehydrate();
  }, [store]);

  return createElement(ResumeStoreContext.Provider, { value: store }, children);
}

export function useResumeStore<T>(selector: (state: ResumeState) => T): T {
  const store = useContext(ResumeStoreContext);
  if (!store) {
    throw new Error("useResumeStore must be used within a ResumeStoreProvider");
  }
  return useStore(store, selector);
}
