# =============================================================================
# Docker-image för en förenings deploy (Coolify på egen VPS).
# =============================================================================
# Två steg: `builder` installerar allt och kör `next build`, `runner` innehåller
# bara den fristående servern (output: "standalone" i next.config.ts). Det som
# hamnar i builder – inklusive bygg-variablerna nedan – följer inte med till
# den färdiga imagen.
#
# Varje förening byggs för sig: de publika sidorna förrenderas med föreningens
# data redan vid bygget, och NEXT_PUBLIC_* bakas in i klientkoden. Bygget
# behöver därför databasen och föreningens variabler. I Coolify: markera dem
# som "Build Variable" (Available at Buildtime) så skickas de in som ARG.

FROM node:22-bookworm-slim AS base
# Prisma läser OpenSSL-versionen från systemet för att välja rätt motor.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Bygge -------------------------------------------------------------------
FROM base AS builder

# Schemat måste finnas före `npm ci`: postinstall kör `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ARG DATABASE_URL
ARG ASSOCIATION_SLUG
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_HERO_VIDEO

ENV NEXT_TELEMETRY_DISABLED=1
# Tak för byggets minne, så att ett bygge på den lilla servern inte tränger
# undan de sajter som redan kör. Räcker gott för det här projektet.
ENV NODE_OPTIONS=--max-old-space-size=1536

RUN npm run build

# --- Körning -----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Utan curl/wget i imagen – node finns ändå. Startsidan är statisk och billig.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
