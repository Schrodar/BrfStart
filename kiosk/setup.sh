#!/bin/sh
# =============================================================================
# Trapphustavla – gör en Raspberry Pi till en låst skärm som visar tavlan.
# =============================================================================
# Körs en gång på en nyinstallerad Raspberry Pi OS Lite (64-bit, Bookworm eller
# senare) – eller på en vanlig dator med Debian utan skrivbord, t.ex. en gammal
# bärbar som testskärm:
#
#   sudo sh setup.sh "https://<sajten>/tavla/<token>" [rotation] [--tailscale] [--laptop]
#
#   rotation     normal | 90 | 180 | 270   (standard: 90 = stående skärm)
#   --tailscale  installerar Tailscale för fjärrsupport via SSH
#   --laptop     bärbar dator: somnar inte när locket fälls ner, och den
#                inbyggda skärmen släcks när en extern skärm är inkopplad
#   --vm         virtuell maskin: ritar med processorn i stället för ett
#                grafikkort som en VM sällan har
#
# En http-adress (t.ex. dev-servern på din dator, http://192.168.1.10:3000/…)
# fungerar för test: webbläsaren får då behandla just den adressen som säker,
# så att offlinecachen fungerar. Riktiga skärmar ska alltid ha https.
#
# Kan köras igen för att byta adress eller rotation – allt skrivs över.
# Se kiosk/README.md för hela gången.
# =============================================================================
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Kör med sudo." >&2
  exit 1
fi

URL=""
ROTATION="90"
TAILSCALE="no"
LAPTOP="no"
VM="no"
for arg in "$@"; do
  case "$arg" in
    --tailscale) TAILSCALE="yes" ;;
    --laptop) LAPTOP="yes" ;;
    --vm) VM="yes" ;;
    http://*|https://*) URL="$arg" ;;
    *) ROTATION="$arg" ;;
  esac
done

case "$URL" in
  https://*/tavla/*|http://*/tavla/*) ;;
  *)
    echo "Ange skärmens adress från Admin → Trapphustavlor, t.ex." >&2
    echo "  sudo sh setup.sh \"https://brfexempel.se/tavla/abc123…\"" >&2
    exit 1
    ;;
esac
case "$ROTATION" in
  normal|90|180|270) ;;
  *) echo "Rotation ska vara normal, 90, 180 eller 270." >&2; exit 1 ;;
esac

# Service workern (offlinecachen) kräver https. För en test-adress över http
# pekas just den ut som säker. Bara http – en https-adress behöver inget.
EXTRA_FLAGS=""
case "$URL" in
  http://*)
    ORIGIN="$(echo "$URL" | sed -E 's#^(http://[^/]+).*#\1#')"
    EXTRA_FLAGS="--unsafely-treat-insecure-origin-as-secure=$ORIGIN"
    echo "OBS: http-adress – bara för test. Riktiga skärmar ska ha https."
    ;;
esac
if [ "$VM" = "yes" ]; then
  EXTRA_FLAGS="$EXTRA_FLAGS --disable-gpu"
fi

echo "==> Paket"
apt-get update
apt-get install -y --no-install-recommends cage wlr-randr fonts-dejavu-core
# Paketet heter chromium i nyare utgåvor och chromium-browser i äldre.
apt-get install -y --no-install-recommends chromium || apt-get install -y --no-install-recommends chromium-browser
BROWSER="$(command -v chromium || command -v chromium-browser)"

echo "==> Tid och språk"
# Klockan och nattläget räknas på skärmen – tidszonen måste vara svensk.
timedatectl set-timezone Europe/Stockholm
timedatectl set-ntp true

echo "==> Användare"
id tavla >/dev/null 2>&1 || useradd --create-home --shell /usr/sbin/nologin tavla
for group in video render input; do
  getent group "$group" >/dev/null && usermod -aG "$group" tavla
done
# Chromiums profil – här ligger service workerns cache och tavlans senast
# hämtade innehåll. Ska överleva omstarter, så inget overlay-filsystem.
install -d -o tavla -g tavla /var/lib/tavla

echo "==> Inställningar"
cat > /etc/tavla.conf <<EOF
# Skärmens adress från Admin → Trapphustavlor.
TAVLA_URL="$URL"
# normal | 90 | 180 | 270
TAVLA_ROTATION="$ROTATION"
EOF
chmod 640 /etc/tavla.conf
chgrp tavla /etc/tavla.conf

cat > /usr/local/bin/tavla-browser <<EOF
#!/bin/sh
. /etc/tavla.conf

# Skärmarna. En bärbar dators inbyggda skärm (eDP/LVDS) släcks när en extern
# skärm är inkopplad – annars delas tavlan över båda. Sedan vrids de som är kvar.
OUTPUTS="\$(wlr-randr | awk '/^[^ ]/ {print \$1}')"
EXTERNAL="\$(echo "\$OUTPUTS" | grep -Ev '^(eDP|LVDS|DSI)' || true)"
for OUT in \$OUTPUTS; do
  case "\$OUT" in
    eDP*|LVDS*|DSI*)
      if [ -n "\$EXTERNAL" ]; then
        wlr-randr --output "\$OUT" --off || true
        continue
      fi
      ;;
  esac
  wlr-randr --output "\$OUT" --transform "\$TAVLA_ROTATION" || true
done

# Chromium ska inte fråga om att återställa sidor efter ett strömavbrott.
PREFS=/var/lib/tavla/chromium/Default/Preferences
if [ -f "\$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "\$PREFS"
fi

exec $BROWSER \\
  --kiosk \\
  --ozone-platform=wayland \\
  --user-data-dir=/var/lib/tavla/chromium \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --no-first-run \\
  --disable-features=Translate,MediaRouter \\
  --check-for-update-interval=31536000 \\
  --password-store=basic \\
  --lang=sv-SE \\
  $EXTRA_FLAGS \\
  "\$TAVLA_URL"
EOF
chmod 755 /usr/local/bin/tavla-browser

# Låsta inställningar för Chromium: ingen översättningsruta, inga
# lösenordsfrågor och inga andra rutor som ingen kan stänga på en skärm utan mus.
for dir in /etc/chromium/policies/managed /etc/chromium-browser/policies/managed; do
  install -d "$dir"
  cat > "$dir/tavla.json" <<EOF
{
  "TranslateEnabled": false,
  "PasswordManagerEnabled": false,
  "AutofillAddressEnabled": false,
  "AutofillCreditCardEnabled": false,
  "BrowserSignin": 0,
  "DefaultNotificationsSetting": 2,
  "DefaultGeolocationSetting": 2,
  "MetricsReportingEnabled": false,
  "PromotionalTabsEnabled": false
}
EOF
done

echo "==> Tjänst"
cat > /etc/systemd/system/tavla.service <<EOF
[Unit]
Description=Trapphustavla (Chromium i helskärm)
# Väntar medvetet inte på nätet: tavlan ska starta och visa sitt sparade
# innehåll även när internet ligger nere.
After=systemd-user-sessions.service plymouth-quit-wait.service
Conflicts=getty@tty1.service

[Service]
User=tavla
PAMName=login
TTYPath=/dev/tty1
StandardInput=tty
UtmpIdentifier=tty1
UtmpMode=user
Environment=WLR_LIBINPUT_NO_DEVICES=1
ExecStart=/usr/bin/cage -d -- /usr/local/bin/tavla-browser
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

# Virtuell maskin: det virtuella grafikkortet klarar sällan hårdvaruritning,
# och då blir skärmen svart. Rita med processorn i stället.
if [ "$VM" = "yes" ]; then
  install -d /etc/systemd/system/tavla.service.d
  cat > /etc/systemd/system/tavla.service.d/vm.conf <<EOF
[Service]
Environment=WLR_RENDERER=pixman
Environment=WLR_NO_HARDWARE_CURSORS=1
EOF
else
  rm -f /etc/systemd/system/tavla.service.d/vm.conf
fi

# Omstart varje natt – rensar minne och ger en ren start. Tavlan är ändå
# svart på natten om nattläget är på.
cat > /etc/systemd/system/tavla-reboot.service <<EOF
[Unit]
Description=Nattlig omstart av trapphustavlan

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl reboot
EOF
cat > /etc/systemd/system/tavla-reboot.timer <<EOF
[Unit]
Description=Nattlig omstart av trapphustavlan

[Timer]
OnCalendar=*-*-* 04:15:00
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
EOF

# Hårdvaruvakthund: hänger sig hela Pi:n startas den om av sig själv.
install -d /etc/systemd/system.conf.d
cat > /etc/systemd/system.conf.d/tavla-watchdog.conf <<EOF
[Manager]
RuntimeWatchdogSec=15
EOF

# Loggar i minnet i stället för på SD-kortet – sparar på kortet.
install -d /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/tavla.conf <<EOF
[Journal]
Storage=volatile
RuntimeMaxUse=32M
EOF

if [ "$LAPTOP" = "yes" ]; then
  echo "==> Bärbar dator"
  # Locket ska kunna fällas ner med extern skärm, och datorn får aldrig somna.
  install -d /etc/systemd/logind.conf.d
  cat > /etc/systemd/logind.conf.d/tavla-laptop.conf <<EOF
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
EOF
  systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
fi

systemctl daemon-reload
systemctl set-default graphical.target
systemctl disable getty@tty1.service >/dev/null 2>&1 || true
systemctl enable tavla.service tavla-reboot.timer

if [ "$TAILSCALE" = "yes" ]; then
  echo "==> Tailscale"
  command -v tailscale >/dev/null 2>&1 || curl -fsSL https://tailscale.com/install.sh | sh
  echo "Logga in Pi:n i ditt Tailscale-konto:"
  tailscale up --ssh
fi

echo
echo "Klart. Starta om med: sudo reboot"
