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

Inloggning sker med **Supabase Auth**. Det finns ingen registrering och inget
godkännande.

- **De boende** har ett konto per lägenhet, utan namn och e-post. JnM lägger
  upp husen och lägenheterna i föreningens adminpanel via supportläget
  (Fastigheten → Hus och lägenheter) och skapar en kod per lägenhet. Breven
  skrivs ut direkt från sidan, ett per brevlåda. Koderna visas bara då – bara
  deras hash sparas.
- Koden löses in på `/aktivera`: den boende väljer ett lösenord och
  lägenhetens konto skapas. Sedan loggar man in med **lägenhetsnummer och
  lösenord**. Samma kod igen ger kontot ett nytt lösenord och loggar ut alla
  enheter – så återställs ett glömt lösenord. Högst tio felaktiga koder per IP
  och kvart.
- **Tappad kod:** JnM skapar en ny kod på lägenhetens sida eller under Konton
  (den gamla slutar gälla) och ett nytt brev går till brevlådan – aldrig till
  en e-postadress.
- **Ägarbyte:** kontot raderas så att säljaren loggas ut, annonsen rensas och
  koden slutar gälla. JnM gör det på lägenhetens sida och skriver ut köparens
  brev. Styrelsens "Försäljningen är klar" under Till salu gör samma sak, och
  köparens brev kommer sedan från JnM.
- **Styrelsen** använder sin lägenhets konto. En admin i styrelsen, eller JnM
  i supportläget, ger kontot admin-rätt under Styrelse → Konton: sök fram
  lägenheten och välj Gör till admin. Hela hushållet delar då admin-rätten,
  och den följer med när koden används igen. Säljs lägenheten raderas kontot,
  och admin-rätten med det. Ingen kan ta bort sin egen admin-rätt – det gör en
  annan admin eller JnM.
- **En ledamot som inte bor i föreningen** (t.ex. HSB:s) får ett personligt
  konto och loggar in med e-posten. JnM bjuder in från JnM-panelen eller med:

  ```bash
  npm run admin:invite -- brf-min-forening din@epost.se https://min-forening.se "Ditt Namn"
  ```

  Skriptet skriver ut en engångslänk till föreningens `/aktivera`. Där väljer
  personen sitt lösenord, och först då skapas kontot och admin-raden.

Sajten mejlar aldrig de boende: styrelsens svar och nya statusar syns på Mina
sidor. Det enda mejlet går till styrelsen när en felanmälan kommer in.

**Supportläget** öppnas med en engångslänk från JnM-panelen, eller med
`npm run support:link -- <slug> <plattformsadmin-e-post> <sajtens-adress>`.
Hus, lägenheter och koder finns bara där. Allt som ändras under
supportläget syns för styrelsen i Admin → Supportlogg.

**Övergång från registreringen:** gamla personliga boendekonton kan logga in
med e-post tills breven har delats ut. Ett sådant konto tas bort när
lägenhetens kod används första gången. De som blir kvar tas bort med
`npm run members:legacy -- <slug> --bekrafta` (utan `--bekrafta` visas bara
vilka det gäller), och därefter `npm run users:prune`.

> Obs: seed-datans konton är enbart visningsdata – för att logga in krävs ett
> riktigt konto i Supabase Auth.

## Multi-tenant

Flera föreningar delar **samma databas** men har **helt isolerad data**. Modellen
är **en deploy per förening**: varje deploy har egen domän och egen branding
(logotyp och färger), men samma `DATABASE_URL`. `ASSOCIATION_SLUG` i `.env` avgör
vilken förening deployen gäller. Föreningens namn, adress och kontaktuppgifter
ligger på föreningsraden i databasen och redigeras av styrelsen i adminpanelen.

Isoleringen sköts centralt av `src/lib/tenant.ts`: `getTenantDb()` ger en
Prisma-klient som **automatiskt filtrerar alla läsningar på `associationId`** (och
sätter det vid skrivning). Sidor, komponenter och actions är omedvetna om tenancy.

Lägenheternas koder och konton följer samma isolering. En kod slås bara upp i
sin egen förening, och lägenhetsnumret vid inloggning söks bara bland den
egna föreningens lägenheter. Inloggningskontona i Supabase Auth delas av alla
föreningar, så lägenhetens interna adress bygger på lägenhetens id, som är
unikt i hela databasen. En ny förening kräver alltså ingen egen databas,
inget eget Supabase-projekt och ingen mejltjänst.

Lägg till en ny förening (ny deploy):

```bash
npm run association:create -- <slug> "<Föreningens namn>"   # skapa tenant-raden
# sätt ASSOCIATION_SLUG=<slug> i den deployens .env
npm run admin:invite -- <slug> <admin-epost> <sajtens-adress>  # bjud in styrelse-admin
```

## Styrelsearbetet (BrfApp)

Tabellerna för ärenden, möten, protokoll och kontakter (`BoardMatter`,
`Meeting`, `AgendaItem`, `Contact` m.fl.) används av BrfApi i
[Schrodar/BrfApp](https://github.com/Schrodar/BrfApp). Både styrelseappen och
hemsidans admin går via API:t. Schemat ägs ändå här, som allt annat.

- Dokument kan ha synligheten **Bara styrelsen** (`board`). De syns bara i
  admin och kan bara laddas ner av godkänd admin. Justerade protokoll hamnar
  där.
- `npm run contacts:migrate` flyttar underleverantörerna från
  felanmälningskategorierna till kontaktregistret. Utan `--bekrafta` visar det
  bara vad som skulle hända. Körs när adminvyn har bytt till registret.

**Ordningen vid schemaändringar.** Prisma läser alla kolumner i varje fråga, så
kod med en ny kolumn på en befintlig tabell (t.ex. `Association.brandColor`)
kraschar mot en databas som saknar den. Därför:

1. `db push` mot testprojektet, och prova lokalt.
2. `db push` mot den riktiga databasen. Ändringar som bara lägger till tabeller
   och kolumner påverkar inte sajterna som redan kör.
3. Först därefter: deploya BrfStart och synka schemat i JohanIt och BrfApp.

## Drift (Coolify på egen VPS)

Varje förening är en egen applikation i Coolify, byggd från repot med
[`Dockerfile`](Dockerfile) (build pack: Dockerfile, port 3000). Imagen kör
Next.js fristående server (`output: "standalone"`).

Miljövariabler per förening (se `.env.example`):

| Variabel | Vid bygget | Vid körning |
|---|:---:|:---:|
| `DATABASE_URL` | ✓ | ✓ |
| `ASSOCIATION_SLUG` | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `NEXT_PUBLIC_HERO_VIDEO` (valfri) | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | | ✓ |
| `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, `EMAIL_FROM` | | ✓ |

"Vid bygget" = markera som *Build Variable* i Coolify. De publika sidorna
förrenderas med föreningens data, så bygget läser databasen, och `NEXT_PUBLIC_*`
bakas in i klientkoden – ändras de krävs ett nytt bygge, inte bara omstart.
`DIRECT_URL` behövs bara när migreringar körs (lokalt), inte i Coolify.

Herofilmen ligger inte i repot och följer därför inte med i bygget: lägg den i
Supabase Storage (publik bucket) eller på en CDN och ange adressen i
`NEXT_PUBLIC_HERO_VIDEO`.

Servern har 2 vCPU/4 GB: ställ Coolify på **ett bygge i taget** (Servers →
localhost → Advanced → Concurrent builds = 1). Dockerfilen sätter ett minnestak
för bygget; sätt gärna även ett minnestak per container (ca 350 MB) under
applikationens *Resource Limits*.

## Funktioner

**Publikt**

- Startsida, Om föreningen, Styrelse & valberedning
- Nyheter/Aktuellt
- Dokument (publika)
- För mäklare/köpare (föreningsfakta)
- Felanmälan (formulär → e-post till styrelsen)
- Kontakt, Integritetspolicy

**Mina sidor** (lägenhetens konto, skapat med koden i brevet)

- Felanmälningar med status och styrelsens svar
- Interna dokument (t.ex. protokoll)
- Min lägenhet: fakta, planritning och bilder
- Sälja bostaden: annonsen skickas till styrelsen, eller publiceras av kontot
  självt med annonsrätt

**Adminpanel** (styrelsen) – styrelsen redigerar allt själv:

- Nyheter, dokument, styrelse/valberedning, föreningsfakta, sidtexter
- Felanmälningar (status, svar till anmälaren, mötesläge)
- Till salu (annonser och annonsrätt) och trapphustavlor
- Konton: admin-rätt för ledamöternas lägenhetskonton

**Supportläge** (JnM)

- Hus och lägenheter, koder och brev, ny kod och ägarbyte
- Koder och brev även från Konton, med sökning på lägenhetsnummer

## Anpassa för en ny förening

1. **Föreningsuppgifter:** namn, org.nr, adress, kontakt och förvaltare fylls i
   av styrelsen under Admin → Föreningsinfo → Namn och kontakt. Sajtens adress
   och logotypfiler ligger i [`src/config/siteConfig.ts`](src/config/siteConfig.ts),
   menyns struktur i [`src/config/site.ts`](src/config/site.ts).
2. **Färger & typsnitt:** [`src/app/globals.css`](src/app/globals.css) – byt
   `--color-brand-*` till föreningens profilfärg.
3. **Logotyp:** ersätt logotyperna i `public/images/` (se `siteConfig.logo`).
4. **Bakgrund i heron:** välj i `hero` överst i
   [`src/config/siteConfig.ts`](src/config/siteConfig.ts) genom att kommentera
   ut raden du inte vill använda:
   ```ts
   const hero: HeroBackground = {
     video: process.env.NEXT_PUBLIC_HERO_VIDEO, // film – går före bilden
     image: "/images/hero.webp",                 // bild – när ingen film används
   };
   ```
   Båda bortkommenterade ger den gröna bakgrunden (`brand-800`), som är
   grundsidans standard. Bilden läggs i `public/images/`. Filmen ligger inte i
   repot: lägg den i `public/videos/` eller på en CDN och peka ut den med
   `NEXT_PUBLIC_HERO_VIDEO` i deployens env (läses vid bygget). Bilden tonar
   fram med en långsam zoom, och toningen över bild och film följer
   `--color-brand-900`.
5. **Startinnehåll:** ändra innehållet direkt i adminpanelen, eller redigera
   seed-datan i [`prisma/seed.ts`](prisma/seed.ts) och kör om `npm run db:seed`.

## Projektstruktur

```
src/
  app/
    (publika sidor)      page.tsx, om-foreningen, styrelse, nyheter, dokument,
                         for-maklare, felanmalan, kontakt, integritetspolicy
    logga-in, aktivera   Inloggning och aktivering med koden i brevet
    medlem/              Inloggat medlemsområde (skyddat)
    admin/               Adminpanel (skyddad, endast styrelse)
  components/
    ui/                  Återanvändbart UI-kit (Button, Card, Field, …)
    layout/              Sidhuvud, sidfot, delnavigation
  config/siteConfig.ts   Logotyp, hero, adress   config/site.ts  Navigation
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
  invite-admin.ts        Bjuder in en styrelse-admin (npm run admin:invite)
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
npm run admin:invite    # bjud in en styrelseadmin (engångslänk)
npm run support:link    # supportlänk till en förenings adminpanel
npm run members:legacy  # ta bort gamla personliga boendekonton (torrkörning utan --bekrafta)
npm run users:prune     # ta bort inloggningar som inte hör till någon förening
```
