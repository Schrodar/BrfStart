# Generisk BRF-sida

Boilerplate för bostadsrättsföreningars hemsidor. Forka repot, byt föreningens
uppgifter och färger, och du har en färdig sida med publik information,
medlemsområde och adminpanel där styrelsen sköter allt innehåll själv.

> **Status:** Databas (**Supabase Postgres via Prisma**) och inloggning
> (**Supabase Auth**) är inkopplade, och filer (foton, planritningar, dokument)
> ligger i **Supabase Storage**. Kvar: e-post loggas till konsolen (byts mot
> Resend). Se [Backend-status](#backend-status).

## Teknik

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma** mot **Supabase Postgres**
- **Supabase Auth** (@supabase/ssr) för inloggning
- **Zod** för formulärvalidering
- Server Actions för all datamutering
- **Supabase Storage** för lägenhetsfoton (publik) samt planritningar och
  föreningsdokument (privata, nås via signerade URL:er)
- **Multi-tenant**: delad databas, en deploy per förening (se nedan)
- E-post (Resend) kopplas in i nästa steg

## Kom igång

```bash
npm install
```

Skapa `.env` (databas + vilken förening deployen gäller – se [Multi-tenant](#multi-tenant)):

```bash
DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://…pooler.supabase.com:5432/postgres"
ASSOCIATION_SLUG="brf-min-forening"
```

Skapa `.env.local` med Supabase Auth-nycklarna (**Settings → API**):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_…"   # publik
SUPABASE_SERVICE_ROLE_KEY="sb_secret_…"            # hemlig, endast server
```

Sätt upp buckets, tabeller och föreningen (med demoinnehåll), starta sedan:

```bash
npm run storage:setup   # Storage-buckets (en gång per projekt)
npm run db:push         # skapar tabellerna
npm run db:seed         # skapar föreningen (ASSOCIATION_SLUG) + demoinnehåll
npm run dev
```

Öppna http://localhost:3000.

> **Windows-tips:** stoppa dev-servern innan `npm run build`/`prisma generate` –
> annars låser den Prismas query-engine (`EPERM`-fel).

### Konton och inloggning

Inloggning sker med **Supabase Auth** (e-post + lösenord). Nya boende registrerar
sig via **Registrera** och får status "väntar på godkännande" tills styrelsen
godkänner dem under **Admin → Medlemmar**. Registreringen skapar auth-användaren
via Supabase Admin-API med bekräftad e-post – ingen e-postbekräftelse behövs
eftersom styrelsens godkännande är grinden.

**Skapa den första administratören** – registrera ett konto (eller lägg till en
användare i Supabase → Authentication) och kör sedan:

```bash
npm run admin:promote -- brf-min-forening din@epost.se
```

> Obs: seed-datans medlemmar (t.ex. `boende@example.se`) är enbart visningsdata –
> för att logga in krävs ett riktigt konto i Supabase Auth.

## Multi-tenant

Flera föreningar delar **samma databas** men har **helt isolerad data**. Modellen
är **en deploy per förening**: varje deploy har egen domän och egen branding
(logotyp och färger), men samma `DATABASE_URL`. `ASSOCIATION_SLUG` i `.env` avgör
vilken förening deployen gäller. Föreningens namn, adress och kontaktuppgifter
ligger på föreningsraden i databasen och redigeras av styrelsen i adminpanelen.

Isoleringen sköts centralt av `src/lib/tenant.ts`: `getTenantDb()` ger en
Prisma-klient som **automatiskt filtrerar alla läsningar på `associationId`** (och
sätter det vid skrivning). Sidor, komponenter och actions är omedvetna om tenancy.

Lägg till en ny förening (ny deploy):

```bash
npm run association:create -- <slug> "<Föreningens namn>"   # skapa tenant-raden
# sätt ASSOCIATION_SLUG=<slug> i den deployens .env
npm run admin:promote -- <slug> <admin-epost>              # utse styrelse-admin
```

## Funktioner

**Publikt**

- Startsida, Om föreningen, Styrelse & valberedning
- Nyheter/Aktuellt
- Dokument (publika)
- För mäklare/köpare (föreningsfakta)
- Felanmälan (formulär → e-post till styrelsen)
- Kontakt, Integritetspolicy

**Medlemsområde** (inloggning krävs, konto måste vara godkänt)

- Interna dokument (t.ex. protokoll)
- Bokning av tvättstuga med tidspass och dubbelbokningsspärr

**Adminpanel** (endast styrelse) – styrelsen redigerar allt själv:

- Nyheter, dokument, styrelse/valberedning, föreningsfakta, sidtexter
- Hantera felanmälningar (status)
- Godkänna/hantera medlemmar
- Översikt över bokningar

## Anpassa för en ny förening

1. **Föreningsuppgifter:** namn, org.nr, adress, kontakt och förvaltare fylls i
   av styrelsen under Admin → Föreningsinfo → Namn och kontakt. Sajtens adress
   och logotypfiler ligger i [`src/config/siteConfig.ts`](src/config/siteConfig.ts),
   menyns struktur i [`src/config/site.ts`](src/config/site.ts).
2. **Färger & typsnitt:** [`src/app/globals.css`](src/app/globals.css) – byt
   `--color-brand-*` till föreningens profilfärg.
3. **Logotyp:** ersätt logotyperna i `public/images/` (se `siteConfig.logo`).
   Hero-filmen på startsidan ligger inte i repot – lägg föreningens egen film i
   `public/videos/` och peka ut den med `NEXT_PUBLIC_HERO_VIDEO`. Utan film
   visar heron sin mörka bakgrund.
4. **Startinnehåll:** ändra innehållet direkt i adminpanelen, eller redigera
   seed-datan i [`prisma/seed.ts`](prisma/seed.ts) och kör om `npm run db:seed`.

## Projektstruktur

```
src/
  app/
    (publika sidor)      page.tsx, om-foreningen, styrelse, nyheter, dokument,
                         for-maklare, felanmalan, kontakt, integritetspolicy
    logga-in, registrera Inloggning och självregistrering
    medlem/              Inloggat medlemsområde (skyddat)
    admin/               Adminpanel (skyddad, endast styrelse)
  components/
    ui/                  Återanvändbart UI-kit (Button, Card, Field, …)
    layout/              Sidhuvud, sidfot, delnavigation
  config/siteConfig.ts   Logotyp, sajtadress     config/site.ts  Navigation
  proxy.ts               Refreshar Supabase-sessionen på varje request
  lib/
    prisma.ts            Prisma-klient (singleton)
    supabase/            Supabase-klienter (server, client, admin, middleware)
    data/                DATALAGER – Prisma-anrop mot Supabase, mappat till types
    auth.ts              getCurrentUser + guards (Supabase Auth)
    email.ts             E-poststub. Byts mot Resend.
    types.ts             Domäntyper (datalagret mappar Prisma-rader hit)
prisma/
  schema.prisma          Datamodell (speglar src/lib/types.ts)
  seed.ts                Demoinnehåll (npm run db:seed)
scripts/
  promote-admin.ts       Gör en användare till admin (npm run admin:promote)
```

## Backend-status

| Del       | Status                                                            |
| --------- | ----------------------------------------------------------------- |
| Databas   | ✅ Inkopplad – Supabase Postgres via Prisma (`src/lib/data/*`)     |
| Auth      | ✅ Inkopplad – Supabase Auth (`src/lib/auth.ts`, `src/lib/supabase/*`) |
| E-post    | ⏳ Konsol-stub i `src/lib/email.ts` – byts mot Resend              |
| Filer     | ✅ Inkopplad – Supabase Storage (`src/lib/storage.ts`), 3 buckets    |

Datalagret exponerar samma funktionssignaturer oavsett backend, så sidor och
komponenter påverkas inte när auth/e-post/lagring kopplas in.

## Skript

```bash
npm run dev        # utvecklingsserver
npm run build      # produktionsbygge (prisma generate + next build)
npm run start      # kör produktionsbygget
npm run lint       # ESLint
npm run typecheck  # TypeScript utan att bygga
npm run db:push    # synka schema till databasen (utan migrationsfiler)
npm run db:migrate # skapa/apply migration (dev)
npm run db:seed    # seeda demoinnehåll
npm run db:studio  # Prisma Studio (bläddra i datan)
```
