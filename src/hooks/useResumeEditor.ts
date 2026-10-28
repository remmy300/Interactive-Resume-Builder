"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createEmptyResume,
  normalizeResumeData,
  type ResumeData,
} from "@/lib/resume-schema";
import { resumeReducer } from "@/lib/resume-reducer";

export interface ResumeSummary {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeRecord extends ResumeSummary {
  data: ResumeData;
}

interface ListResponse {
  items: ResumeSummary[];
  total: number;
  nextSkip: number | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      body?.error ?? `Request failed with status ${response.status}.`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const DEFAULT_TITLE = "Untitled resume";
const AUTOSAVE_DELAY_MS = 1200;

function serialize(title: string, data: ResumeData): string {
  return JSON.stringify({ title, data });
}

export type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

/**
 * Owns the resume list, the document being edited, dirty tracking, autosave,
 * and the optimistic-concurrency handshake with the API.
 */
export function useResumeEditor() {
  const [items, setItems] = useState<ResumeSummary[]>([]);
  const [data, dispatch] = useReducer(resumeReducer, undefined, createEmptyResume);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [savedKey, setSavedKey] = useState(() => serialize(DEFAULT_TITLE, data));

  const savingRef = useRef(false);
  const failedKeyRef = useRef<string | null>(null);
  const didLoadRef = useRef(false);
  const currentKey = useMemo(() => serialize(title, data), [title, data]);
  const currentKeyRef = useRef(currentKey);
  const isDirty = currentKey !== savedKey;

  useEffect(() => {
    currentKeyRef.current = currentKey;
  }, [currentKey]);

  const applyRecord = useCallback((record: ResumeRecord) => {
    const normalized = normalizeResumeData(record.data);
    setResumeId(record.id);
    setTitle(record.title);
    setUpdatedAt(record.updatedAt);
    dispatch({ type: "replace", data: normalized });
    setSavedKey(serialize(record.title, normalized));
    setSaveState("idle");
    setError(null);
  }, []);

  const openResume = useCallback(
    async (id: string) => {
      setSaveState("loading");
      try {
        const record = await apiFetch<ResumeRecord>(`/api/resumes/${id}`);
        applyRecord(record);
        return true;
      } catch (openError) {
        setSaveState("error");
        setError(
          openError instanceof Error ? openError.message : "Could not open resume.",
        );
        return false;
      }
    },
    [applyRecord],
  );

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const load = async () => {
      try {
        const list = await apiFetch<ListResponse>("/api/resumes?take=50");
        setItems(list.items);
        if (list.items[0]) {
          await openResume(list.items[0].id);
        }
      } catch (loadError) {
        setSaveState("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your resumes.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [openResume]);

  const newResume = useCallback(() => {
    const empty = createEmptyResume();
    setResumeId(null);
    setTitle(DEFAULT_TITLE);
    setUpdatedAt(null);
    dispatch({ type: "replace", data: empty });
    setSavedKey(serialize(DEFAULT_TITLE, empty));
    setSaveState("idle");
    setError(null);
  }, []);

  const save = useCallback(
    async (options: { silent?: boolean } = {}): Promise<boolean> => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setError("Give your resume a title before saving.");
        return false;
      }
      if (savingRef.current) return false;

      savingRef.current = true;
      setIsSaving(true);
      if (!options.silent) setSaveState("saving");

      try {
        const requestBody = resumeId
          ? { title: trimmedTitle, data, updatedAt: updatedAt ?? undefined }
          : { title: trimmedTitle, data };

        const record = resumeId
          ? await apiFetch<ResumeRecord>(`/api/resumes/${resumeId}`, {
              method: "PATCH",
              headers: JSON_HEADERS,
              body: JSON.stringify(requestBody),
            })
          : await apiFetch<ResumeRecord>("/api/resumes", {
              method: "POST",
              headers: JSON_HEADERS,
              body: JSON.stringify(requestBody),
            });

        const normalized = normalizeResumeData(record.data);
        setResumeId(record.id);
        setTitle((current) => (current === trimmedTitle ? record.title : current));
        setUpdatedAt(record.updatedAt);
        setSavedKey(serialize(record.title, normalized));
        setItems((previous) => [
          {
            id: record.id,
            title: record.title,
            isPublic: record.isPublic,
            publicSlug: record.publicSlug,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          },
          ...previous.filter((item) => item.id !== record.id),
        ]);
        setSaveState("saved");
        setError(null);
        failedKeyRef.current = null;
        return true;
      } catch (saveError) {
        setSaveState("error");
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not save your resume.",
        );
        // Remember the failing revision so the autosave effect does not loop.
        failedKeyRef.current = currentKeyRef.current;
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [data, resumeId, title, updatedAt],
  );

  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!resumeId || !isDirty || isLoading || isSaving) return;
    if (failedKeyRef.current === currentKey) return;

    const timer = setTimeout(() => {
      void saveRef.current({ silent: true });
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [currentKey, isDirty, isLoading, isSaving, resumeId]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const removeResume = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiFetch<void>(`/api/resumes/${id}`, { method: "DELETE" });
      setItems((previous) => previous.filter((item) => item.id !== id));
      return true;
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the resume.",
      );
      return false;
    }
  }, []);

  const restoreResume = useCallback(async (id: string): Promise<boolean> => {
    try {
      const restored = await apiFetch<ResumeSummary>(
        `/api/resumes/${id}/restore`,
        { method: "POST" },
      );
      setItems((previous) => [
        restored,
        ...previous.filter((item) => item.id !== restored.id),
      ]);
      return true;
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Could not restore the resume.",
      );
      return false;
    }
  }, []);

  const toggleShare = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        const result = await apiFetch<{
          isPublic: boolean;
          publicSlug: string | null;
        }>(`/api/resumes/${id}/share`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ enabled }),
        });
        setItems((previous) =>
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isPublic: result.isPublic,
                  publicSlug: result.publicSlug,
                }
              : item,
          ),
        );
        return result;
      } catch (shareError) {
        setError(
          shareError instanceof Error
            ? shareError.message
            : "Could not update sharing.",
        );
        return null;
      }
    },
    [],
  );

  const currentItem = items.find((item) => item.id === resumeId) ?? null;

  return {
    data,
    dispatch,
    title,
    setTitle,
    resumeId,
    updatedAt,
    items,
    currentItem,
    isLoading,
    isSaving,
    isDirty,
    saveState,
    error,
    clearError: () => setError(null),
    openResume,
    newResume,
    save,
    removeResume,
    restoreResume,
    toggleShare,
  };
}
