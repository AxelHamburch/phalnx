---
title: Alby Hub
description: Alby Hub unter einem eigenen Benutzer installieren, mit phoenixd verbinden, über den Tunnel einrichten und Auto-Unlock aktivieren.
---

Alby Hub steuert phoenixd und vergibt **NWC-Verbindungen** mit Budget. Es hat keine öffentliche Adresse.
Du öffnest es über den [SSH-Tunnel](/services/tunnel/).

## Installieren

Zum Entpacken der `.tar.bz2`-Datei braucht `tar` das Programm `bzip2`. Es fehlt auf einem frischen Ubuntu:

```bash
sudo apt install -y bzip2
```

```bash
sudo -u ualbyhub -H bash -c 'cd ~ && exec bash'
```

Jetzt in der Shell von `ualbyhub`:

```bash
cd ~
wget https://github.com/getAlby/hub/releases/latest/download/albyhub-Server-Linux-x86_64.tar.bz2
mkdir -p ~/albyhub ~/data
tar -xjf albyhub-Server-Linux-x86_64.tar.bz2 -C ~/albyhub
rm albyhub-Server-Linux-x86_64.tar.bz2
ls ~/albyhub
install -m 600 /dev/null ~/albyhub.env
exit
```

`ls ~/albyhub` muss `bin` und `lib` zeigen.

Der Link enthält `latest`, du bekommst also immer die neueste Version. Das ist praktisch, aber der Dateiname
kann sich ändern. Kommt beim Download ein Fehler, sieh auf der
[Release-Seite](https://github.com/getAlby/hub/releases) nach, wie die Datei jetzt heißt.

## Konfiguration

Als `__ADMIN_USER__` zeigst du das Vollzugriffs-Passwort von phoenixd an:

```bash
sudo grep '^http-password=' /home/uphoenixd/.phoenix/phoenix.conf
```

Dann öffnest du die Umgebungsdatei von Alby Hub:

```bash
sudo -u ualbyhub nano /home/ualbyhub/albyhub.env
```

```ini
WORK_DIR=/home/ualbyhub/data
PORT=8029
LN_BACKEND_TYPE=PHOENIX
PHOENIXD_ADDRESS=http://127.0.0.1:9740
PHOENIXD_AUTHORIZATION=<http-password von oben, nur der Wert>
```

Bei `PHOENIXD_AUTHORIZATION` trägst du **nur den Wert nach dem `=`** ein, ohne `http-password=`, ohne
Anführungszeichen und ohne Leerzeichen. Dein Passwort steht in `phoenix.conf` zweimal: `http-password`
(Vollzugriff) und `http-password-limited-access`. Alby Hub braucht das **Vollzugriffs-Passwort**, denn es muss
zahlen können.

Die Zeile `RELAY` kommt erst im Kapitel [Lokaler Relay](/services/relay/) dazu. Bis dahin nimmt Alby Hub die
offiziellen Relays.

## Als Dienst einrichten

```bash
sudo nano /etc/systemd/system/albyhub.service
```

```ini title="/etc/systemd/system/albyhub.service"
[Unit]
Description=Alby Hub
After=network-online.target phoenixd.service relay.service
Wants=network-online.target phoenixd.service relay.service

[Service]
User=ualbyhub
Group=ualbyhub
WorkingDirectory=/home/ualbyhub
EnvironmentFile=/home/ualbyhub/albyhub.env
Environment=LD_LIBRARY_PATH=/home/ualbyhub/albyhub/lib
ExecStart=/home/ualbyhub/albyhub/bin/albyhub
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=tmpfs
BindPaths=/home/ualbyhub
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
UMask=0077

[Install]
WantedBy=multi-user.target
```

`After=` und `Wants=` sorgen dafür, dass Alby Hub nach einem Neustart erst startet, wenn phoenixd und der
Relay da sind. `relay.service` gibt es noch nicht. Systemd ignoriert das, bis das nächste Kapitel erledigt
ist.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now albyhub
```

## Prüfen

```bash
sudo systemctl status albyhub --no-pager
sudo journalctl -u albyhub -n 30 --no-pager
sudo ss -tlnp | grep 8029
```

Die installierte Version fragst du lokal ab:

```bash
curl -s http://127.0.0.1:8029/api/info | grep -o '"version":"[^"]*"'
```

Alby Hub hört auf Port 8029, und zwar auf **allen** Netzwerkadressen des Servers. Darum zeigt `ss` dort `*`
statt `127.0.0.1`. Das lässt sich in diesem Programm nicht ändern. Damit trotzdem niemand von außen hinkommt,
lässt die Firewall den Port nicht durch. Du erreichst Alby Hub deshalb nur über den SSH-Tunnel von deinem PC.
Dass der Port von außen wirklich zu ist, prüfst du so:

```powershell
Test-NetConnection __SERVER_IP__ -Port 8029
```

Es muss `TcpTestSucceeded : False` erscheinen.

## Ersteinrichtung über den Tunnel

1. Tunnel öffnen (siehe [SSH-Tunnel](/services/tunnel/)), im Browser `http://localhost:8029` aufrufen.
2. Auf der Willkommensseite („Welcome to Alby Hub") wählst du **Get Started (PHOENIX)**. Du musst nichts
   eintragen, denn Alby Hub erkennt phoenixd über `LN_BACKEND_TYPE=PHOENIX` und nutzt es direkt. Die Auswahl
   „Advanced Setup" brauchst du nicht.
3. Die Seite „Connect Your Alby Account" überspringst du mit **Maybe later**. Das Verbinden mit einem
   Alby-Account ist optional und wird später in Teil D: Optional gezeigt.
4. Bei „Create Password" vergibst du ein **Entsperr-Passwort**, wiederholst es und setzt den Haken bei
   „I've secured this password in a safe place". Es soll lang sein und gehört in den Passwortmanager. Es lässt
   sich nicht zurücksetzen. Dann klickst du auf **Create Password**.
5. Auf der Startseite muss der Saldo von phoenixd erscheinen, anfangs 0.

Alby Hub legt beim ersten Aufruf das Konto an. Wer die Seite zuerst öffnet, wird Besitzer. Das bist du, weil
sie nur über den Tunnel erreichbar ist.

## Alby Hub mit Guthaben füllen (Kanal öffnen)

phoenixd hat zu Beginn **keinen Kanal**, und ohne Kanal kannst du weder senden noch empfangen. Der Kanal
entsteht automatisch bei der ersten eingehenden Zahlung. Du füllst die angeschlossene phoenixd-Wallet also
direkt in Alby Hub (über den Tunnel, `http://localhost:8029`):

1. Öffne links **Wallet** und klicke auf **Receive**.
2. Gib den Betrag ein und eine Beschreibung, zum Beispiel `phoenix start`, und klicke auf **Create Invoice**.
   Beginne mit **nicht weniger als 30.000 Sats**: Das Öffnen des Kanals und die Gebühren dafür kosten schon
   mehr als 20.000 Sats (siehe unten).
3. Bezahle die Rechnung aus einer anderen Wallet. Kommt die Zahlung an, zeigt Alby Hub **Payment Received**.

Mit dieser ersten Zahlung öffnet ACINQ den Kanal zu deinem Knoten. Dafür behält ACINQ eine **Gebühr** ein, für
die Liquidität und die Transaktionen zum Öffnen und späteren Schließen des Kanals. Sie liegt bei **etwas mehr als 20.000 Sats**.
Bei meinem Test blieben von 30.000 Sats rund **7.600 Sats** als Guthaben. Bei hohen Netzwerkgebühren (Fees) kann
der Abzug höher ausfallen. Dann ist es ratsam, **mehr als 30.000 Sats** einzuzahlen. Die aktuellen Bedingungen stehen auf [phoenix.acinq.co/server](https://phoenix.acinq.co/server).
Zahle nur, was du bereit bist auszugeben, und halte das Guthaben insgesamt klein.

Auf der Startseite („Home") hakt Alby Hub nun den Schritt **1. Receive your first payment** ab und zeigt den
zweiten Schritt: **2. Connect your first app**. Genau das brauchst du als Nächstes (siehe unten).

Danach dauert es **einige Minuten**, bis der Kanal endgültig offen ist. Den Stand prüfst du im Terminal:

```bash
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli getinfo
```

In der Liste `channels` erscheint ein Eintrag. Steht dort `"state": "Normal"`, ist der Kanal offen. Bei
`balanceSat` siehst du dein Guthaben (siehe die Erklärung der Felder im Kapitel
[Updates durchführen](/operations/updates/#phoenixd)). Erst jetzt lohnt sich der Test.

**Erste Transaktionen:** Mache in Alby Hub eine kleine Zahlung in beide Richtungen, zum Beispiel 100 Sats
**empfangen** (Rechnung in Alby Hub erzeugen, aus einer anderen Wallet zahlen) und 100 Sats **senden** (Rechnung
einer anderen Wallet bezahlen). Klappt beides, sind phoenixd und Alby Hub richtig verbunden. LNbits kommt erst in
den späteren Kapiteln dazu.

## Sub-Wallet für LNbits anlegen

LNbits bekommt nicht Zugriff auf die ganze Wallet, sondern auf eine eigene **Sub-Wallet** mit eigenem Guthaben.
Das ist der Schritt „Connect your first app" (über den Tunnel, `http://localhost:8029`):

1. Öffne links **Sub-wallets** und klicke auf **Create Sub-wallet**.
2. Als Name nimmst du den Namen deiner LNbits-Instanz, zum Beispiel `__DOMAIN__`, und klickst auf
   **Create Sub-wallet**.
3. Die **Lightning address** überspringst du, sie gehört zu einem Alby-Account. Du kannst die Sub-Wallet aber
   schon mit **Top Up** um etwa 1.000 Sats auffüllen. Dann klickst du auf **Next**.
4. Jetzt kommt der wichtige Teil. Klicke auf **Copy Connection Secret** und lege den Wert im
   **Passwortmanager** ab. Alby Hub zeigt ihn **nur jetzt** und nie wieder. Den QR-Code (Reveal QR) brauchst du
   nicht.
5. Scrolle ganz nach unten und klicke auf **Finish**, damit die Verbindung übernommen wird.

Der kopierte Wert ist die NWC-Adresse (`nostr+walletconnect://…`). Du passt sie im Kapitel
[LNbits](/services/lnbits/#nwc-verbindung-von-alby-hub-zu-lnbits) leicht an und trägst sie dort als
Finanzierungsquelle ein.

## Auto-Unlock

Ohne Auto-Unlock bleibt Alby Hub nach jedem Neustart des Servers **gesperrt**, bis du das Passwort eingibst.
Solange kann LNbits über NWC nicht zahlen. Mit Auto-Unlock entsperrt sich Alby Hub selbst.

:::caution[Der Preis]
Das Entsperr-Passwort liegt dann **im Klartext** bei Alby Hub (laut Quelltext in der Datenbank). Das Risiko
bleibt klein, weil `/home/ualbyhub` die Rechte `700` hat, kein anderer Benutzer die Datenbank lesen kann und
Alby Hub von außen nicht erreichbar ist. Es ist aber da.
:::

Wer das nicht will, lässt Auto-Unlock aus und entsperrt nach jedem Neustart von Hand. Dann stellst du bei den
[automatischen Updates](/server/auto-updates/) `Automatic-Reboot "false"` ein und startest selbst neu.

**Einschalten** (über den Tunnel, `http://localhost:8029`):

1. Einstellungen → **Auto Unlock**.
2. Das Entsperr-Passwort eingeben und aktivieren.

Hat es geklappt, zeigt die Seite dort den Knopf „Disable Auto Unlock".

**Prüfen:** Alby Hub neu starten und die Oberfläche öffnen. Es darf **keine** Passwortabfrage kommen, und der
Saldo muss sofort erscheinen.

```bash
sudo systemctl restart albyhub
```

Danach prüfst du den Dienst. Es muss `active (running)` stehen:

```bash
sudo systemctl status albyhub --no-pager
```

Das Log von Alby Hub ist sehr lang. Lass dir darum nur Fehler der letzten Minuten zeigen:

```bash
sudo journalctl -u albyhub --since "10 min ago" --no-pager | grep -iE "error|fatal|panic"
```

Es sollte **nichts** erscheinen. Dann ist der Start sauber gelaufen. Lade jetzt `http://localhost:8029` neu.
Kommt die Passwortabfrage trotzdem, ist Auto-Unlock nicht aktiv.

Weiter mit dem [lokalen Relay](/services/relay/).
