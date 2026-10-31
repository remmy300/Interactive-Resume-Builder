"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { ResumeData } from "@/lib/resume-schema";

export interface LibraryResume {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryRecord extends LibraryResume {
  data: ResumeData;
}

interface ListResponse {
  items: LibraryResume[];
  total: number;
}

const LIST_URL = "/api/resumes?take=50";

/**
 * Loads the signed-in user's resumes for the career tool pages and keeps the
 * selected document in sync. All pages share the same API contract.
 */
export function useResumeLibrary() {
  const [items, setItems] = useState<LibraryResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [record, setRecord] = useState<LibraryRecord | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyList = useCallback((next: LibraryResume[]) => {
    setItems(next);
    setSelectedId((current) => {
      if (current && next.some((item) => item.id === current)) return current;
      return next[0]?.id ?? null;
    });
  }, []);

  // Initial load. State is only updated from async callbacks.
  useEffect(() => {
    let cancelled = false;
    apiFetch<ListResponse>(LIST_URL)
      .then((list) => {
        if (cancelled) return;
        applyList(list.items);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : "Could not load your resumes.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyList]);

  // Load the selected resume. No synchronous setState: the loading state is
  // derived from whether the cached record matches the current selection.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    apiFetch<LibraryRecord>(`/api/resumes/${selectedId}`)
      .then((value) => {
        if (cancelled) return;
        setRecord(value);
        setFailedId(null);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setRecord(null);
        setFailedId(selectedId);
        setError(
          loadError instanceof Error ? loadError.message : "Could not open that resume.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await apiFetch<ListResponse>(LIST_URL);
      applyList(list.items);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load your resumes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyList]);

  const activeRecord = record && record.id === selectedId ? record : null;
  const isLoadingRecord =
    Boolean(selectedId) && activeRecord === null && failedId !== selectedId;

  return {
    items,
    selectedId,
    setSelectedId,
    record: activeRecord,
    setRecord,
    isLoading,
    isLoadingRecord,
    error,
    setError,
    reload,
  };
}
