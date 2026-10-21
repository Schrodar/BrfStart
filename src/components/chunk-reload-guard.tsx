"use client";

import { useEffect } from "react";
import { isChunkLoadError, reloadOnce } from "@/lib/chunk-reload";

/**
 * Laddar om sidan när en JavaScript-fil från ett gammalt bygge inte går att
 * hämta (se src/lib/chunk-reload.ts). Fångar fel som inte hamnar i någon
 * felgräns; de som gör det tas om hand i global-error.tsx.
 */
export function ChunkReloadGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error)) reloadOnce();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) reloadOnce();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
