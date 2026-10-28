"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

export type ViewMode = "grid" | "table";

const DEFAULT_VIEW_MODE: ViewMode = "grid";

function isViewMode(value: string | null): value is ViewMode {
  return value === "grid" || value === "table";
}

function readViewMode(key: string): ViewMode {
  try {
    const stored = window.localStorage.getItem(key);
    return isViewMode(stored) ? stored : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

export function usePersistedViewMode(preferenceName: string) {
  const { user } = useCurrentUser();
  const storageKey = user ? `ecu:view:${user._id}:${preferenceName}` : null;
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    if (!storageKey) return;
    setViewModeState(readViewMode(storageKey));

    const syncViewMode = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setViewModeState(isViewMode(event.newValue) ? event.newValue : DEFAULT_VIEW_MODE);
      }
    };

    window.addEventListener("storage", syncViewMode);
    return () => window.removeEventListener("storage", syncViewMode);
  }, [storageKey]);

  const setViewMode = useCallback((value: string) => {
    if (!isViewMode(value)) return;
    setViewModeState(value);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // Keep the current-session preference if browser storage is unavailable.
    }
  }, [storageKey]);

  return { viewMode, setViewMode };
}
