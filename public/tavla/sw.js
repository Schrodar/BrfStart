/*
 * Service worker för trapphustavlan (/tavla/*).
 *
 * Gör att en skärm som startar om utan nät ändå visar tavlan:
 *   - sajtens egna filer (sidan, skript, typsnitt, logga): nätet först, med
 *     sparad kopia som reserv – online är allt alltid färskt.
 *   - bilder från Supabase Storage: sparad kopia först. Adresserna är unika
 *     per uppladdad fil och ändras aldrig.
 *   - /api/tavla rörs inte. Innehållet sparar sidan själv i localStorage.
 *
 * Sidan skickar { type: "precache", urls } efter registreringen, så att det som
 * laddades innan workern fanns också sparas.
 */

const CACHE = "tavla-v1";
const NETWORK_TIMEOUT_MS = 8000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isSupabaseImage(url) {
  return url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/");
}

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    return !url.pathname.startsWith("/api/") && !url.pathname.includes("webpack-hmr");
  }
  return isSupabaseImage(url) || url.hostname === "fonts.gstatic.com";
}

/** Fetch som ger upp efter en stund – ett wifi utan internet kan annars hänga länge. */
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetchWithTimeout(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  // Bilder från en annan domän kan komma som opaque (status 0) – spara dem ändå.
  if (res.ok || res.type === "opaque") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;
  const url = new URL(request.url);
  event.respondWith(isSupabaseImage(url) ? cacheFirst(request) : networkFirst(request));
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "precache" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all([
        // Byggfiler från tidigare deployer behövs inte längre – utan städning
        // växer cachen med varje deploy.
        cache.keys().then((requests) =>
          Promise.all(
            requests
              .filter((r) => new URL(r.url).pathname.startsWith("/_next/static/") && !data.urls.includes(r.url))
              .map((r) => cache.delete(r)),
          ),
        ),
        ...data.urls
          .filter((u) => typeof u === "string" && shouldHandle(new Request(u)))
          .map((u) =>
            cache.match(u).then((hit) =>
              hit
                ? undefined
                : fetch(u, { mode: new URL(u).origin === self.location.origin ? "same-origin" : "no-cors" })
                    .then((res) => (res.ok || res.type === "opaque" ? cache.put(u, res) : undefined))
                    .catch(() => undefined),
            ),
          ),
      ]),
    ),
  );
});
