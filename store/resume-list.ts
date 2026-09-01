"use client";

import { draftStorageKey, LEGACY_DRAFT_STORAGE_KEY } from "@/store/resume-store";

/**
 * The list of resumes a user has created, entirely client-side (localStorage)
 * — this app makes an explicit privacy promise not to store CV content on
 * the server, so "multiple resumes" has to be a browser-only feature. Each
 * entry here is just an index row (id/name/timestamps); the actual
 * ResumeData for each id lives under its own key, see `draftStorageKey` in
 * `store/resume-store.ts`.
 */

export type ResumeListEntry = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
};

const INDEX_KEY = "resumeforge:resumes:v1";

function readIndex(): ResumeListEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: ResumeListEntry[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Resume list: failed to save", error);
  }
}

/** One-time migration for existing users: the single legacy draft (if any and
 * not already migrated) becomes the first entry in the new multi-resume list. */
export function migrateLegacyDraftIfNeeded(): ResumeListEntry[] {
  const existing = readIndex();
  if (existing.length > 0) return existing;

  let legacyRaw: string | null = null;
  try {
    legacyRaw = localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch {
    return existing;
  }
  if (!legacyRaw) return existing;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    localStorage.setItem(draftStorageKey(id), legacyRaw);
    localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch {
    return existing;
  }
  const migrated: ResumeListEntry[] = [{ id, name: "My resume", createdAt: now, updatedAt: now }];
  writeIndex(migrated);
  return migrated;
}

export function listResumes(): ResumeListEntry[] {
  return migrateLegacyDraftIfNeeded().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function createResumeEntry(name = "Untitled resume"): ResumeListEntry {
  const now = new Date().toISOString();
  const entry: ResumeListEntry = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
  writeIndex([entry, ...readIndex()]);
  return entry;
}

export function renameResumeEntry(id: string, name: string) {
  writeIndex(readIndex().map((r) => (r.id === id ? { ...r, name, updatedAt: new Date().toISOString() } : r)));
}

export function touchResumeEntry(id: string) {
  writeIndex(readIndex().map((r) => (r.id === id ? { ...r, updatedAt: new Date().toISOString() } : r)));
}

const UNTITLED_PREFIX = "Untitled resume";

/**
 * Fills in a default name from the resume's own content, but only while it's
 * still "Untitled resume" — once a user (or `duplicateResumeEntry`) has set
 * a real name, further edits to `personalInfo` shouldn't overwrite it. This
 * is what lets someone keep several differently-named drafts of the same
 * person's resume tailored to different roles.
 */
export function autoNameIfUntitled(id: string, candidateName: string) {
  const trimmed = candidateName.trim();
  if (!trimmed) return;
  writeIndex(
    readIndex().map((r) => (r.id === id && r.name.startsWith(UNTITLED_PREFIX) ? { ...r, name: trimmed } : r)),
  );
}

export function deleteResumeEntry(id: string) {
  writeIndex(readIndex().filter((r) => r.id !== id));
  try {
    localStorage.removeItem(draftStorageKey(id));
  } catch {
    // ignore
  }
}

export function duplicateResumeEntry(id: string): ResumeListEntry | null {
  const source = readIndex().find((r) => r.id === id);
  if (!source) return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(draftStorageKey(id));
  } catch {
    return null;
  }
  const copy = createResumeEntry(`${source.name} (copy)`);
  if (raw) {
    try {
      localStorage.setItem(draftStorageKey(copy.id), raw);
    } catch {
      // ignore — the copy still exists as an empty resume
    }
  }
  return copy;
}
