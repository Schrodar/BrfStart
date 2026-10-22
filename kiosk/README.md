# Trapphustavla på Raspberry Pi

Så gör du en Raspberry Pi till en skärm i ett trapphus. Skärmen visar
föreningens tavla (`/tavla/<token>`) i en låst webbläsare. Den startar av sig
själv vid strömavbrott och visar det senaste innehållet även när internet
ligger nere.

## Hårdvara per skärm

| Del | Kommentar |
|---|---|
| Raspberry Pi 5, 2 GB | Räcker gott för en webbsida. |
| Officiellt nätaggregat 27 W | Billiga aggregat ger instabil drift. |
| RTC-batteri (Raspberry Pi RTC Battery) | Gör att klockan och nattläget stämmer när Pi:n startar utan nät. |
| SD-kort av typen *High Endurance* (32 GB) eller NVMe-SSD | Tål drift dygnet runt. |
| Skärm klassad för drift dygnet runt, gärna stående 24–32" | Vanliga TV-apparater håller sällan i längden. |
| Ram mot skadegörelse och ventilation | Pi:n monteras bakom skärmen. |
| Nät: kabel (helst) eller wifi | Fastighetsnät, föreningens fiber eller en 4G-router. |

## Installation

1. **Skapa skärmen i adminpanelen.** Gå till Admin → Trapphustavlor → Lägg till
   skärm, välj hus och kopiera adressen. Adressen visas bara en gång.
2. **Installera operativsystemet.** Skriv *Raspberry Pi OS Lite (64-bit)* till
   kortet med Raspberry Pi Imager. Under inställningarna i Imager:
   - sätt värdnamn, t.ex. `tavla-brfexempel-b`
   - skapa en egen användare (inte `tavla`, den skapas av skriptet)
   - slå på SSH
   - fyll i wifi om kabel saknas
   - välj tidszon Europe/Stockholm
3. **Kopiera in skriptet och kör det:**
   ```bash
   scp kiosk/setup.sh <användare>@tavla-brfexempel-b.local:
   ssh <användare>@tavla-brfexempel-b.local
   sudo sh setup.sh "https://brfexempel.se/tavla/<token>" 90 --tailscale
   sudo reboot
   ```
   - Rotation: `90` för stående skärm, `normal` för liggande. Testa `270` om
     bilden hamnar upp och ner.
   - `--tailscale` ger fjärråtkomst för support (se nedan). Kräver ett gratis
     Tailscale-konto.
4. **Kontrollera skärmen.** Efter omstarten visar den tavlan. I
   adminpanelen står skärmen som **Igång** inom någon minut.
5. **Testa offline innan du lämnar.** Dra ur nätverkskabeln (eller stäng av
   routern) och starta om Pi:n. Tavlan ska visas som vanligt. När nätet är
   tillbaka hämtar den nytt innehåll inom 15 minuter.

## Testa med en gammal bärbar dator i stället för en Pi

Samma skript fungerar på en vanlig dator. Den bärbara datorn gör då Pi:ns jobb
och skickar bilden till en extern skärm.

1. Installera **Debian 12 eller 13** (netinst) på datorn. I programvaruvalet
   bockar du bara i *SSH server* och *standard system utilities*, inget
   skrivbord. Välj **inte** Ubuntu: där är Chromium ett snap-paket som strular
   i kioskläge.
2. Koppla in den externa skärmen **innan** datorn startar.
3. Kör skriptet med `--laptop`:
   ```bash
   sudo sh setup.sh "https://brfexempel.se/tavla/<token>" 90 --laptop
   sudo reboot
   ```
   Den inbyggda skärmen släcks och tavlan visas på den externa. Locket kan
   fällas ner utan att datorn somnar.

Skillnader mot en Pi:
- **Batteriet** gör att ett strömavbrott inte märks. Testa omstart genom att
  hålla in strömknappen i stället.
- **RTC:** datorn har redan en inbyggd klocka med batteri.
- **Hårdvaruvakthund** saknas på en del datorer. Då hoppar systemd över den.

## Testa i en virtuell maskin (VirtualBox)

Det snabbaste sättet att öva in installationen. En snapshot gör att du kan börja
om från noll på sekunder, och nätet slås av och på med ett klick.

1. **Skapa maskinen.** Ny maskin i VirtualBox med Debian 12/13 netinst: 2 GB
   RAM, 2 processorer och 16 GB disk. Under Skärm väljer du grafikkortet
   *VMSVGA*. Installera med bara *SSH server* och *standard system utilities*.
2. **Starta dev-servern på din dator.** I VirtualBox standardnät (NAT) når
   maskinen din dator på `10.0.2.2`. Lägg in `DEV_ALLOWED_ORIGINS=10.0.2.2` i
   `.env.local` och starta `npm run dev`.
3. **Skapa en skärm** i adminpanelen på `http://localhost:3000/admin/tavlor`.
   Byt ut `localhost:3000` mot `10.0.2.2:3000` i adressen du får.
4. **Kör skriptet** i maskinen:
   ```bash
   sudo sh setup.sh "http://10.0.2.2:3000/tavla/<token>" normal --vm
   sudo reboot
   ```
   - `--vm` ritar med processorn, eftersom den virtuella maskinen saknar
     riktigt grafikkort.
   - Adressen är http, så skriptet låter webbläsaren behandla just den som
     säker. Annars fungerar inte offlinecachen.
5. **Testa nätavbrott.** I VirtualBox, under Enheter → Nätverk, bockar du ur
   *Anslut kabel*. Tavlan ska stå kvar. Starta om maskinen med kabeln urdragen,
   och tavlan ska komma upp från cachen.

Klockan i en virtuell maskin följer din dator. Klocktestet utan nät är därför
bara meningsfullt på en riktig Pi.

## Byta adress eller rotation

Kör skriptet igen med den nya adressen och starta om. Har du tappat bort
adressen väljer du *Ny adress* på skärmen i adminpanelen. Den gamla
adressen slutar då fungera direkt.

## Support på distans

Med Tailscale når du Pi:n från din egen dator, var den än sitter:

```bash
ssh <användare>@tavla-brfexempel-b
sudo systemctl restart tavla
journalctl -u tavla -b
```

Det första kommandot startar om webbläsaren. Det andra visar loggen sedan
senaste start.

## Så klarar tavlan nätavbrott

- **Sidan:** tavlan hämtar nytt innehåll var 15:e minut, varje timme eller en
  gång om dagen, enligt styrelsens val under Trapphustavlor → Inställningar.
  Även var 15:e minut blir bara några tiotal MB i månaden, så ett
  mobilabonnemang på 500 MB räcker gott. Den hämtar
  ingenting nattetid, utan hämtar direkt när skärmen tänds igen. Om
  hämtningen misslyckas visar den det den redan har, utan något
  felmeddelande, och försöker igen efter 15 minuter.
- **Klockan** på tavlan hämtas aldrig från servern. Den följer Pi:ns
  systemklocka, som ställs mot internettid (NTP) och går vidare på
  RTC-batteriet utan nät.
- **Senaste innehållet** sparas i webbläsaren (localStorage).
- **Service workern** (`public/tavla/sw.js`) sparar sidan, skripten,
  typsnitten och bilderna. Därför kan tavlan starta helt utan nät.
- **Webbläsarens profil** ligger i `/var/lib/tavla` och finns kvar efter
  omstart. Använd därför inte overlay-filsystem eller "read-only"-läge i
  `raspi-config`, eftersom det raderar cachen vid varje start.
- **Klockan** går på RTC-batteriet tills nätet och NTP är tillbaka.
- **Systemd** startar om webbläsaren om den kraschar. Hårdvaruvakthunden
  startar om Pi:n om hela systemet hänger sig.
- **Varje natt** startar Pi:n om kl. 04:15.

## Skärmens status

Admin → Trapphustavlor visar en status för varje skärm, och när den senast
hörde av sig. Skärmen hör bara av sig när den hämtar (var 15:e minut, varje
timme eller en gång om dagen, aldrig nattetid), så "Senast kontakt" kan vara flera timmar
gammal på en skärm som fungerar.

- **Igång:** skärmen har hämtat som väntat. Den får missa en hämtning, plus
  natten, innan den räknas som borta.
- **Inte kontakt:** skärmen har inte hört av sig. Tavlan visar fortfarande
  sitt senaste innehåll, men nya anslag når inte fram förrän nätet är
  tillbaka.
- **Inte startad:** skärmen har aldrig anslutit med sin nuvarande adress.
