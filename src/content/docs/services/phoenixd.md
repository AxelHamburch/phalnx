---
title: phoenixd
description: phoenixd als Lightning-Knoten unter einem eigenen Benutzer installieren, den Seed sichern und als Dienst einrichten.
---

phoenixd ist der Lightning-Knoten. Er hält den **Seed** und den Kanal. Alle anderen Dienste greifen über seine
API (nur lokal, Port 9740) darauf zu.

Die aktuelle Version steht auf der [Release-Seite von phoenixd](https://github.com/ACINQ/phoenixd/releases).
Trage sie unter **Meine Werte** ein (nur die Zahl, ohne `v`).

## Installieren

Auf dem Server als `__ADMIN_USER__`:

```bash
sudo apt install -y unzip
```

```bash
sudo -u uphoenixd -H bash -c 'cd ~ && exec bash'
```

Jetzt in der Shell von `uphoenixd`:

```bash
cd ~
VERSION=__VERSION_PHOENIXD__
wget https://github.com/ACINQ/phoenixd/releases/download/v$VERSION/phoenixd-$VERSION-linux-x64.zip
wget https://github.com/ACINQ/phoenixd/releases/download/v$VERSION/SHA256SUMS.asc
```

`VERSION` enthält **nur die Zahl**. Das `v` steht schon in der Adresse. Mit `v0.9.3` entsteht `vv0.9.3` und
der Download endet mit `404 Not Found`.

Prüfsumme kontrollieren:

```bash
sha256sum -c --ignore-missing SHA256SUMS.asc
```

Es muss `phoenixd-...zip: OK` erscheinen. Steht dort etwas anderes, brich ab und benutze die Datei nicht.

```bash
unzip phoenixd-$VERSION-linux-x64.zip
mv phoenixd-$VERSION-linux-x64 phoenixd
rm phoenixd-$VERSION-linux-x64.zip SHA256SUMS.asc
```

## Einmal von Hand starten

Dabei entstehen Seed und Konfiguration:

```bash
~/phoenixd/phoenixd --agree-to-terms-of-service
```

Warte, bis im Log steht, dass der Server lauscht (`listening on http://127.0.0.1:9740`). Dann beendest du ihn
mit **Strg+C**.

## Seed sichern

```bash
cat ~/.phoenix/seed.dat
```

Das sind 12 Wörter. Schreibe sie auf **Papier** und bewahre sie offline auf. Nicht fotografieren, nicht in
die Cloud. Wer die Wörter hat, hat das Geld.

## Rechte setzen und prüfen

phoenixd legt die Dateien meist schon richtig an. Das ist nur die Absicherung. Du bist noch in der Shell von
`uphoenixd` (die Eingabezeile beginnt mit `uphoenixd@`), sonst zeigt `~` auf ein anderes Verzeichnis:

```bash
chmod 700 ~/.phoenix
chmod 600 ~/.phoenix/seed.dat ~/.phoenix/phoenix.conf
ls -la ~/.phoenix
```

Richtig ist:

- `drwx------` bei `.` (der Ordner `.phoenix`) und bei `..` (`/home/uphoenixd`)
- `-rw-------` bei allen Dateien, besonders `seed.dat` und `phoenix.conf`
- Eigentümer überall `uphoenixd uphoenixd`

Steht irgendwo ein `r` in den hinteren Spalten (zum Beispiel `-rw-r--r--`), können andere mitlesen. Dann
wiederholst du die `chmod`-Befehle. Danach verlässt du die Shell:

```bash
exit
```

## Als Dienst einrichten

Wieder als `__ADMIN_USER__`:

```bash
sudo nano /etc/systemd/system/phoenixd.service
```

```ini title="/etc/systemd/system/phoenixd.service"
[Unit]
Description=phoenixd
After=network-online.target
Wants=network-online.target

[Service]
User=uphoenixd
Group=uphoenixd
WorkingDirectory=/home/uphoenixd
ExecStart=/home/uphoenixd/phoenixd/phoenixd --agree-to-terms-of-service
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=tmpfs
BindPaths=/home/uphoenixd
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

Die Zeilen darunter `NoNewPrivileges` bis `UMask` sind die **Sandbox**. `ProtectHome=tmpfs` zusammen mit
`BindPaths` bewirkt, dass der Dienst von `/home` nur sein eigenes Verzeichnis sieht. Funktioniert ein Dienst
damit nicht, lockere zuerst diese beiden Zeilen und prüfe mit `journalctl -u phoenixd -n 50`, woran es liegt.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now phoenixd
```

## Prüfen

```bash
sudo systemctl status phoenixd --no-pager
sudo ss -tlnp | grep 9740
```

Beim zweiten Befehl muss `127.0.0.1:9740` erscheinen. Dann fragst du den Knoten ab:

```bash
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli getinfo
```

`getinfo` zeigt die Node-ID, die installierte Version (`version`) und die Blockhöhe. Eine Liste `channels` ist
zuerst leer. Der erste Kanal entsteht bei der ersten eingehenden Zahlung. Danach stehen dort Zustand, Guthaben
und Kapazität des Kanals (Einzelheiten im Kapitel [Updates durchführen](/operations/updates/#phoenixd)). Dabei fallen Gebühren an. Die aktuellen Bedingungen stehen auf
[phoenix.acinq.co/server](https://phoenix.acinq.co/server). Lies sie, bevor du Geld schickst.

Weiter mit [Alby Hub](/services/albyhub/).
