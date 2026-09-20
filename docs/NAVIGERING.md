# Sidomenyn: arkitektur och felrättning

## Sammanfattning
Menyns öppnings-/stängningsanimation glitchade – panelen kunde under några
bildrutor få fel mått/renderingsgränser och sedan "snappa" till sitt slutläge.
Det syntes tydligast i **Firefox**, men i mindre grad i alla webbläsare.

Felet satt inte i en enskild animationsklass, easing eller bredd. Det berodde på
**var i DOM-trädet menyn låg**: en viewport-täckande `fixed` overlay med
`backdrop-blur` och en `transform`-animerad panel låg inuti en **`sticky` header
med eget stacking context** (`z-40`). Kombinationen tvingade webbläsaren att
samtidigt reda ut sticky-positionering, ett stacking context, en fixed
viewport-storlek, en transform, en `overflow`-klippning och en backdrop-filter.

Lösningen var strukturell: menyn flyttades **ut ur headern och renderas nu via en
React-portal direkt i `<body>`**, och den sticky toppbaren ersattes av en
icke-sticky HeroHeader.

## Rotorsak (den gamla strukturen)
```text
<header class="sticky top-0 z-40">        ← site-header.tsx
  └── <NavDrawer>
        └── <div class="fixed inset-0 z-40 overflow-hidden">   ← overlay
              ├── backdrop-blur-sm
              └── <aside> panel (translate-x-full → 0)          ← transform
```
Panelen var alltså `fixed` (tänkt mot viewporten) men låg fortfarande inuti den
sticky headerns renderings-/lagerstruktur. Att en `fixed` overlay + `backdrop-blur`
+ en `transform`-animerad panel + `overflow-hidden` nästlades inuti ett
`sticky` + `z-40`-lager är precis den sortens flerkravssituation som Firefox
kan mis-rastrera några bildrutor innan den snappar till rätt läge.

Bidragande (men inte huvudorsak):

- **Dubbla headerlager på startsidan.** `layout.tsx` renderade en sticky
  `SiteHeader`, och `page.tsx` hade dessutom en separat hero-sektion under den.
- **Accordionläget sattes efter öppning.** Ett `useEffect([open])` uppdaterade
  `openGroups` *efter* att öppningsrenderingen börjat → innehållshöjden kunde
  räknas om mitt i animationen.
- **Scrollbar-bredd.** Scroll-låset tog bort scrollbaren och breddade innehållet
  (åtgärdat separat, se nedan) – ett verkligt men mindre symptom.

## Den nya strukturen
```text
<body>
├── <SiteHeader>              relative / isolate, INTE sticky
│     └── HeroHeader (start) eller statisk header (undersidor)
│           └── <NavDrawer>   renderar bara en platshållare här
├── <main>
├── <SiteFooter>
└── (portal via createPortal → document.body)
      ├── menyknapp   fixed z-[80]   (samma knapp öppnar/stänger, ⋯ → ×)
      └── overlay     fixed z-[60] overflow-hidden
            └── panel  z-10, transform: translate3d(...)
```
Panelens storlek, position och transform beräknas nu **direkt mot viewporten**,
utan att passera genom en sticky- och stacking-context-header.

## Ändringar per fil

### `src/components/layout/site-header.tsx`
- Ingen `sticky` längre. På `/`: en helskärmshero
  `relative isolate flex min-h-svh overflow-hidden bg-brand-800`, med
  navigeringsraden ovanpå (`absolute inset-x-0 top-0 z-20`) och den ljusa logotypen
  (`<AssociationLogo light />`). På undersidor: en statisk
  `relative z-40 border-b border-border bg-surface`.
- Renderar `<NavDrawer user={user} variant="hero" | "default" />` – bara som
  platshållare; själva knappen portaleras.

### `src/components/layout/nav-drawer.tsx`
- **Portal:** `createPortal(portalContent, document.body)`, skyddat av ett
  `mounted`-state (SSR-säkert). En `<div className="h-11 w-11">`-platshållare
  behåller knappens plats i headerns flexrad.
- **En knapp** (`toggleDrawer`) för både öppna/stänga, `fixed z-[80]`, morphar
  ⋯ → ×. Den högerställs mot innehållskolumnen med
  `right: max(1rem, calc((100vw - 72rem) / 2 + 1.5rem))`.
- **Overlay** `fixed inset-0 z-[60] overflow-hidden` (+ `backdrop-blur-sm`, som
  behölls – det var inte felet). **Panel** `z-10`,
  `w-[min(100vw,440px)]`, explicit `transform: translate3d(0,0,0)` /
  `translate3d(100%,0,0)` med riktningsberoende easing,
  `transition-[transform] duration-300`.
- **Accordion** sätts synkront i `toggleDrawer` *innan* `setOpen(true)` – ingen
  omräkning efter att animationen startat.
- Scroll-lås på `document.documentElement` (behållet).

### `src/app/layout.tsx`
- Hämtar `getSiteContent()` och skickar `heroTitle` / `heroSubtitle` till
  `SiteHeader` (heron bor nu i headern, inte i `page.tsx`).

### `src/app/page.tsx`
- Den gamla hero-sektionen borttagen; innehållet börjar under HeroHeadern
  (ankaret `#start-content` används av pilen längst ned i heron).

### `src/app/globals.css`
- `html { scrollbar-gutter: stable; }` behållet – reserverar scrollbar-ytan så att
  scroll-låset aldrig ändrar innehållsbredden. Kompletterar den arkitektoniska
  fixen; löste inte ensamt snappen.

## Varför det löste problemet
Genom att flytta overlay + panel till ett fristående viewportlager direkt under
`<body>` behöver panelens mått och transform inte längre samordnas med headerns
sticky-positionering och stacking context. Den flerkravsreconciliation som Firefox
mis-rastrerade försvinner, och animationen blir stabil i alla webbläsare.
Det avgörande var alltså **arkitekturen** (var menyn renderas), inte hastighet,
bredd eller easing.

## Verifiering
- `npm run typecheck` grön.
- I webbläsaren: öppna/stäng menyn på start- och undersida, mobil + desktop –
  ingen snap, panelen glider jämnt, knappen morphar ⋯ → ×, Escape/utanförklick/länk
  stänger. **Slutlig kontroll i Firefox på Windows** (där buggen syntes mest).
