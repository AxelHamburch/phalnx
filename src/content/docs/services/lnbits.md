---
title: LNbits
description: LNbits unter einem eigenen Benutzer installieren, als Dienst einrichten und über NWC mit Budget an Alby Hub anbinden.
---

LNbits ist die Weboberfläche mit Wallets und Erweiterungen. Es zahlt **nur über NWC mit Budget** und bekommt
nie das Passwort von phoenixd.

Die aktuelle Version steht auf der [Release-Seite von LNbits](https://github.com/lnbits/lnbits/releases).
Die Anleitung holt automatisch die neueste fertige Version.

## Installieren

```bash
sudo -u ulnbits -H bash -c 'cd ~ && exec bash'
```

Jetzt in der Shell von `ulnbits`:

```bash
cd ~
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout $(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
~/.local/bin/uv sync --all-extras
```

`uv` installiert sich nach `~/.local/bin`. Der letzte Befehl dauert einige Minuten. Dann legst du die
Konfiguration an:

```bash
cp .env.example .env
chmod 600 .env
mkdir -p data
nano .env
```

Prüfe bzw. setze in `.env`:

```ini
LNBITS_ADMIN_UI=true
LNBITS_DATA_FOLDER="./data"
```

Die Finanzierungsquelle trägst du später in der Admin-Oberfläche ein, nicht hier. Mit
`LNBITS_ADMIN_UI=true` gelten nach dem ersten Start die Werte aus der Datenbank. Danach:

```bash
exit
```

## Als Dienst einrichten

```bash
sudo nano /etc/systemd/system/lnbits.service
```

```ini title="/etc/systemd/system/lnbits.service"
[Unit]
Description=LNbits
After=network-online.target
Wants=network-online.target

[Service]
User=ulnbits
Group=ulnbits
WorkingDirectory=/home/ulnbits/lnbits
ExecStartPre=/bin/sleep 5
ExecStart=/home/ulnbits/.local/bin/uv run lnbits --host 127.0.0.1 --port 5000
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=tmpfs
BindPaths=/home/ulnbits
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

LNbits hängt **absichtlich nicht** von Alby Hub oder dem Relay ab. Fällt einer aus, startet LNbits trotzdem.
So kannst du die Finanzierungsquelle jederzeit umstellen, ohne einen Abhängigkeitsfehler zu suchen.

`ExecStartPre=/bin/sleep 5` lässt LNbits nach **jedem** Start 5 Sekunden warten, damit phoenixd, der Relay und
Alby Hub einen kleinen Vorsprung haben. Das gilt auch bei `systemctl start` und `systemctl restart`: Der
Befehl kehrt erst nach den 5 Sekunden zurück. Brauchst du mehr Vorsprung, erhöhe die Zahl.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lnbits
```

### Prüfen

LNbits braucht beim Start etwas länger:

```bash
sudo systemctl status lnbits --no-pager
sudo journalctl -u lnbits -n 30 --no-pager
sudo ss -tlnp | grep 5000
```

Beim letzten Befehl muss `127.0.0.1:5000` erscheinen.

## Ersteinrichtung über den Tunnel

1. Tunnel öffnen (siehe [SSH-Tunnel](/services/tunnel/)), im Browser `http://localhost:5000` aufrufen.
2. LNbits zeigt die Ersteinrichtung. Lege einen **Admin-Benutzer und ein Passwort** an (Passwortmanager).

## NWC-Verbindung von Alby Hub zu LNbits

1. Du hast in Alby Hub schon eine **Sub-Wallet** für LNbits angelegt (siehe
   [Alby Hub](/services/albyhub/#sub-wallet-für-lnbits-anlegen)). Ihr Guthaben begrenzt, was LNbits ausgeben
   kann. Zum Testen genügen 1.000 Sats.
2. Nimm die dort im Passwortmanager abgelegte Verbindungsadresse. Sie sieht so aus:
   `nostr+walletconnect://<pubkey>?relay=...&relay=...&secret=...`
3. **Alle `relay=`-Teile entfernen und genau einen einsetzen**, den lokalen. Die Adresse muss dann so aussehen:

   ```text
   nostr+walletconnect://<pubkey>?relay=ws://127.0.0.1:7777&secret=<secret>
   ```
4. In LNbits (`http://localhost:5000`): **Settings → Funding**. Bei **Funding source** wählst du
   **Nostr Wallet Connect** und fügst die angepasste Adresse bei **Pairing URL** ein. Dann klickst du auf
   **Save** und startest den Server neu (**Restart Server**), denn die Finanzierungsquelle gilt erst nach einem
   Neustart.
5. Lade die Seite einmal mit einem **Hard Refresh** neu (zum Beispiel Strg+Umschalt+R). Jetzt zeigt LNbits bei
   **Funding source balance** das Guthaben der Sub-Wallet an, zum Beispiel `1.000 sats`.

### Prüfen

```bash
sudo journalctl -u lnbits -n 50 --no-pager | grep -i nwc
```

Es muss `NWCConnection is ready` erscheinen, mit `relay: ws://127.0.0.1:7777`.

Voraussetzung ist, dass in Alby Hub der Kanal offen und die phoenixd-Wallet gefüllt ist (siehe
[Alby Hub](/services/albyhub/#alby-hub-mit-guthaben-füllen-kanal-öffnen)). Dann ein Test mit kleinen Beträgen: In LNbits eine Wallet anlegen, **100 Sats empfangen** und **100 Sats
senden**. Klappt beides, ist die Kette phoenixd, Alby Hub, Relay und LNbits in Ordnung.

Für den Fall, dass der lokale Relay oder Alby Hub ausfällt, steht der Notweg im Kapitel
[Notfall und Fehlersuche](/operations/emergency/).

Weiter mit [Caddy](/services/caddy/).
