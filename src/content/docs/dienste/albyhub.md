---
title: Alby Hub
description: Alby Hub unter einem eigenen Benutzer installieren, mit phoenixd verbinden, über den Tunnel einrichten und Auto-Unlock aktivieren.
---

Alby Hub steuert phoenixd und vergibt **NWC-Verbindungen** mit Budget. Es hat keine öffentliche Adresse.
Du öffnest es über den [SSH-Tunnel](/dienste/tunnel/).

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

`ls ~/albyhub` muss `bin` und `lib` zeigen. Heißt die Datei auf der
[Release-Seite](https://github.com/getAlby/hub/releases) inzwischen anders, passe den Namen an.

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

Die Zeile `RELAY` kommt erst im Kapitel [Lokaler Relay](/dienste/relay/) dazu. Bis dahin nimmt Alby Hub die
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

:::caution[Nicht getestet]
Ob dieser Befehl bei jeder Version genau so antwortet, ist nicht geprüft. Kommt nichts, führe
`curl -s http://127.0.0.1:8029/api/info` ohne `grep` aus und suche nach `version`. Die Version steht auch in
der Oberfläche von Alby Hub.
:::

Zeigt `ss` bei 8029 `*` statt `127.0.0.1`, lauscht Alby Hub auf allen Adressen. Das ist bei dieser Version so.
Es ist nur deshalb unproblematisch, weil die Firewall den Port nicht öffnet. Prüfe es vom PC aus:

```powershell
Test-NetConnection __SERVER_IP__ -Port 8029
```

Es muss `TcpTestSucceeded : False` erscheinen.

## Ersteinrichtung über den Tunnel

1. Tunnel öffnen (siehe [SSH-Tunnel](/dienste/tunnel/)), im Browser `http://localhost:8029` aufrufen.
2. Ein **Entsperr-Passwort** vergeben. Es soll lang sein und gehört in den Passwortmanager.
3. Mit `LN_BACKEND_TYPE=PHOENIX` sollte Alby Hub keinen Knoten-Typ mehr abfragen und phoenixd direkt nutzen.
   Fragt es doch, wähle „phoenixd" und trage Adresse und Passwort wie oben ein.
4. Das Verbinden mit einem Alby-Account ist optional.
5. Auf der Startseite muss der Saldo von phoenixd erscheinen, anfangs 0.

Alby Hub legt beim ersten Aufruf das Konto an. Wer die Seite zuerst öffnet, wird Besitzer. Das bist du, weil
sie nur über den Tunnel erreichbar ist.

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

Danach das Log ansehen, ohne die vielen Zeilen `handled API request`, damit nur der Start übrig bleibt:

```bash
sudo journalctl -u albyhub -n 200 --no-pager | grep -v "handled API request"
```

Im Log muss nach der Zeile `Started albyhub.service` der neue Start folgen. Lade dann `http://localhost:8029`
neu. Kommt die Passwortabfrage trotzdem, ist Auto-Unlock nicht aktiv.

Weiter mit dem [lokalen Relay](/dienste/relay/).
