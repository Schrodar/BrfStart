/**
 * Skydd mot versionsglapp efter en ny deploy.
 *
 * Varje bygge ger JavaScript-filerna nya namn, och de gamla finns inte kvar på
 * servern. En flik som öppnades före deployen kan ha förladdat en sida från
 * det gamla bygget – klickar besökaren dit efteråt hämtar webbläsaren en fil
 * som inte längre finns, och sidan kraschar med ChunkLoadError ("This page
 * couldn't load"). En vanlig omladdning hämtar det nya bygget och löser det.
 *
 * reloadOnce() laddar om högst en gång per tio sekunder, så att en fil som
 * verkligen saknas aldrig kan ge en omladdningsloop.
 */

/** Är felet en JavaScript-fil som inte gick att hämta? */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  return (
    typeof message === "string" &&
    /Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      message,
    )
  );
}

const KEY = "chunk-reload-at";
const MIN_INTERVAL_MS = 10_000;

/** Laddar om sidan, om det inte redan gjorts alldeles nyss. Sant om den laddade om. */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Utan sessionStorage (t.ex. blockerad lagring) laddar vi inte om alls –
    // hellre ett felmeddelande än en risk för en loop.
    return false;
  }
  window.location.reload();
  return true;
}
