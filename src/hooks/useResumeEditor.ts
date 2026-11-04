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
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import { resumeReducer } from "@/lib/resume-reducer";
import { checkResumeValidity } from "@/lib/resume-validity";

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

  const savingRef = useRef<Promise<boolean> | null>(null);
  const savedKeyRef = useRef(savedKey);
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
    const key = serialize(record.title, normalized);
    setSavedKey(key);
    savedKeyRef.current = key;
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
    const key = serialize(DEFAULT_TITLE, empty);
    setSavedKey(key);
    savedKeyRef.current = key;
    setSaveState("idle");
    setError(null);
  }, []);

  const importResume = useCallback((imported: ResumeData, nextTitle: string) => {
    setResumeId(null);
    setTitle(nextTitle.trim() || DEFAULT_TITLE);
    setUpdatedAt(null);
    dispatch({ type: "replace", data: imported });
    setSaveState("idle");
    setError(null);
  }, []);

  const saveRef = useRef<(options?: { silent?: boolean }) => Promise<boolean>>(
    async () => false,
  );

  const save = useCallback(
    async (options: { silent?: boolean } = {}): Promise<boolean> => {
      // A save is already running (often an autosave). Wait for it, then save
      // whatever is still unsaved, instead of silently doing nothing.
      if (savingRef.current) {
        await savingRef.current;
        await new Promise((resolve) => setTimeout(resolve, 0));
        return saveRef.current(options);
      }

      // Nothing changed since the last save, so there is nothing to send.
      if (currentKeyRef.current === savedKeyRef.current) return true;

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setError("Give your resume a title before saving.");
        return false;
      }
      const validity = checkResumeValidity(data);
      if (!validity.valid) {
        setError(`Add ${validity.missing.join(", ")} before saving.`);
        return false;
      }

      // What this request contains. After a successful save the editor is "clean"
      // relative to this snapshot, not to the server's echo of it, so a harmless
      // formatting difference can never leave Save enabled or trigger a save loop.
      const sentKey = serialize(title, data);

      const run = async (): Promise<boolean> => {
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

          setResumeId(record.id);
          setTitle((current) => (current === trimmedTitle ? record.title : current));
          setUpdatedAt(record.updatedAt);
          setSavedKey(sentKey);
          savedKeyRef.current = sentKey;
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
          savingRef.current = null;
          setIsSaving(false);
        }
      };

      savingRef.current = run();
      return savingRef.current;
    },
    [data, resumeId, title, updatedAt],
  );

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
    importResume,
    save,
    removeResume,
    restoreResume,
    toggleShare,
  };
}
