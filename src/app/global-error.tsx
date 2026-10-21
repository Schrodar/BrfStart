"use client";

import { useEffect, useState } from "react";
import { isChunkLoadError, reloadOnce } from "@/lib/chunk-reload";
import "./globals.css";

/**
 * Sista felgränsen – ersätter hela sidan när något går fel som ingen annan
 * felgräns fångar. Är felet ett versionsglapp efter en deploy (se
 * src/lib/chunk-reload.ts) laddas sidan om direkt, och besökaren ser bara en
 * kort "Laddar om…". Annars visas ett felmeddelande på svenska.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (isChunkLoadError(error) && reloadOnce()) setReloading(true);
  }, [error]);

  return (
    <html lang="sv">
      <body className="theme-site">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            {reloading ? (
              <p className="font-body text-muted">Laddar om…</p>
            ) : (
              <>
                <h1 className="font-display text-3xl text-ink">
                  Sidan kunde inte visas
                </h1>
                <p className="mt-3 font-body text-muted">
                  Försök igen – oftast räcker det att ladda om sidan.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-full bg-brand-600 px-5 py-2.5 font-body text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Ladda om
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-border px-5 py-2.5 font-body text-sm font-semibold text-ink hover:bg-black/5"
                  >
                    Försök igen
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
