---
title: Nächtliches Backup
description: Die Datenbanken von phoenixd, Alby Hub und LNbits jede Nacht sichern, nach Datum benennen und in einem Umlaufspeicher aufbewahren.
---

Dieses Kapitel ist **optional**, aber dringend empfohlen. Jede Nacht um **02:00 Uhr** entsteht ein Backup, das nach
dem Datum benannt ist, zum Beispiel `phalnx-2026-11-14.tar.gz`. Es sichert

- **phoenixd** (`~/.phoenix`, mit Seed und Konfiguration),
- **Alby Hub** (`~/data` und `albyhub.env`),
- **LNbits** (`~/lnbits/data` mit der Datenbank und den Erweiterungen, dazu die `.env`).

Die Backups liegen in einem **Umlaufspeicher**: Es werden die letzten 14 behalten, das älteste wird jeweils
gelöscht. So wächst der Speicher nicht endlos.

:::caution[Das schützt nicht vor einem Serverausfall]
Die Backups liegen **auf dem Server selbst**. Sie helfen bei einem Bedienfehler, einem fehlerhaften Update oder
einer beschädigten Datenbank. Geht der Server verloren, sind sie mit weg. Dafür kommt später der **Export auf ein
anderes System**. Bis dahin gilt: Die Dateien enthalten den **Seed** und alle Passwörter im **Klartext**. Kopiere sie
**nie unverschlüsselt** vom Server.
:::

## Wie das Backup arbeitet

- Die Datenbanken (SQLite) werden **im laufenden Betrieb** gesichert, ohne einen Dienst zu stoppen. Dafür dient
  `sqlite3 … .dump`, das einen **in sich stimmigen Stand** liefert. Das ist wichtig, denn eine einfach kopierte
  Datenbank kann mitten im Schreiben beschädigt sein.
- Die Datenbank wird dabei als der Benutzer des Dienstes gelesen (`ulnbits` usw.). So legt das Backup keine
  Dateien an, die dem Dienst später im Weg sind.
- Alle anderen Dateien (zum Beispiel `seed.dat`, Konfiguration) werden kopiert.
- Das Archiv gehört `root` und ist nur für `root` lesbar (Rechte `600`, Ordner `700`).
- Das fertige Archiv entsteht zuerst unter einem Zwischennamen und wird erst am Ende umbenannt. Ein abgebrochenes
  Backup ersetzt also kein gutes.

## Vorbereiten

Das Programm `sqlite3` fehlt auf einem frischen Ubuntu:

```bash
sudo apt install -y sqlite3
```

## Das Skript

```bash
sudo nano /usr/local/sbin/phalnx-backup
```

```bash title="/usr/local/sbin/phalnx-backup"
#!/bin/bash
# Nächtliches Backup von phoenixd, Alby Hub und LNbits (Umlaufspeicher)
set -euo pipefail
umask 077

DEST=/var/backups/phalnx
KEEP=14
NAME="phalnx-$(date +%F)"

mkdir -p "$DEST"
STAGE=$(mktemp -d "$DEST/.stage.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT

# backup_dir <Name> <Quellordner> [<weitere Dateien> ...]
backup_dir() {
  local name=$1 src=$2
  shift 2
  local out="$STAGE/$name"
  mkdir -p "$out"

  # Alle Dateien außer den Datenbanken kopieren
  tar -C "$src" --exclude='*.sqlite' --exclude='*.sqlite3' --exclude='*.db' \
      --exclude='*-wal' --exclude='*-shm' -cf - . | tar -C "$out" -xf -

  # Datenbanken als in sich stimmigen SQL-Dump sichern (als Besitzer der Datei)
  while IFS= read -r -d '' db; do
    rel=${db#"$src"/}
    mkdir -p "$out/$(dirname "$rel")"
    runuser -u "$(stat -c %U "$db")" -- sqlite3 "$db" .dump | gzip > "$out/$rel.sql.gz"
  done < <(find "$src" -type f \( -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \) -print0)

  # Einzelne Konfigurationsdateien dazulegen
  for f in "$@"; do cp -p "$f" "$out/"; done
}

backup_dir phoenixd /home/uphoenixd/.phoenix
backup_dir albyhub  /home/ualbyhub/data /home/ualbyhub/albyhub.env
backup_dir lnbits   /home/ulnbits/lnbits/data /home/ulnbits/lnbits/.env

# Archiv unter Zwischennamen schreiben, erst am Ende umbenennen
tar -C "$STAGE" -czf "$DEST/$NAME.tar.gz.part" .
mv "$DEST/$NAME.tar.gz.part" "$DEST/$NAME.tar.gz"

# Umlaufspeicher: nur die neuesten $KEEP Archive behalten
ls -1 "$DEST"/phalnx-*.tar.gz | sort | head -n -"$KEEP" | xargs -r rm -f --

echo "Backup fertig: $NAME.tar.gz"
```

Rechte setzen:

```bash
sudo chown root:root /usr/local/sbin/phalnx-backup
sudo chmod 700 /usr/local/sbin/phalnx-backup
```

Wie viele Backups behalten werden, steht oben in `KEEP=14`. Ändere die Zahl, wenn du mehr oder weniger Tage
aufbewahren willst. Willst du einen Dienst nicht sichern, löschst du die passende Zeile `backup_dir …`.

## Zeitplan um 02:00 Uhr

Ein systemd-Timer startet das Skript jede Nacht:

```bash
sudo nano /etc/systemd/system/phalnx-backup.service
```

```ini title="/etc/systemd/system/phalnx-backup.service"
[Unit]
Description=Nächtliches Backup von phoenixd, Alby Hub und LNbits

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/phalnx-backup
Nice=10
IOSchedulingClass=idle
```

```bash
sudo nano /etc/systemd/system/phalnx-backup.timer
```

```ini title="/etc/systemd/system/phalnx-backup.timer"
[Unit]
Description=Backup jede Nacht um 02:00

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now phalnx-backup.timer
```

Die Zeit gilt in der **Zeitzone des Servers** (siehe [Erste Anmeldung](/server/first-login/)). `Persistent=true` holt
ein verpasstes Backup nach, wenn der Server um 02:00 Uhr aus war. Die Uhrzeit liegt vor den
[automatischen Updates](/server/auto-updates/) (`__UPDATE_TIME__`) und dem Neustart (`__REBOOT_TIME__`). So wird das Backup nie
von einem Neustart unterbrochen.

## Prüfen

Das Backup einmal von Hand auslösen:

```bash
sudo systemctl start phalnx-backup.service
```

Je nach Datenmenge dauert das einige Sekunden. Dann siehst du das Ergebnis:

```bash
sudo ls -lh /var/backups/phalnx
```

Es muss eine Datei `phalnx-<heutiges Datum>.tar.gz` mit Rechten `-rw-------` und Besitzer `root` erscheinen. Dass
alle drei Dienste enthalten sind und die Datenbanken mitgesichert wurden, zeigt der Inhalt:

```bash
sudo tar -tzf /var/backups/phalnx/phalnx-$(date +%F).tar.gz | grep -E "sql.gz|seed|\.env"
```

Du solltest unter `phoenixd/`, `albyhub/` und `lnbits/` jeweils mindestens eine Datei mit `.sql.gz` am Ende sehen,
dazu `seed.dat` bei phoenixd. Die Namen der Datenbanken hängen von den Programmen ab. Fehlt eine, ist das Backup
unvollständig.

Den Zeitplan und den Lauf der letzten Nacht prüfst du so:

```bash
systemctl list-timers phalnx-backup.timer
sudo journalctl -u phalnx-backup --since "2 days ago" --no-pager
```

Im Log muss `Backup fertig` stehen. Steht dort ein Fehler, läuft das Backup nicht. Schau am Tag nach der
Einrichtung nach und danach gelegentlich, so wie bei der [Kontrolle der Updates](/operations/updates/#ubuntu-und-die-pakete).

## Ein Backup testen

Ein Backup, das du nie getestet hast, ist kein Backup. Entpacke eines in einen **Testordner** und prüfe, ob sich die
LNbits-Datenbank wiederherstellen lässt. Das ändert nichts am laufenden System:

```bash
sudo mkdir -p /root/restore-test
sudo tar -xzf /var/backups/phalnx/phalnx-$(date +%F).tar.gz -C /root/restore-test
sudo ls /root/restore-test/lnbits
```

```bash
sudo bash -c 'gunzip -c /root/restore-test/lnbits/database.sqlite3.sql.gz | sqlite3 /root/restore-test/test.sqlite3'
sudo sqlite3 /root/restore-test/test.sqlite3 "PRAGMA integrity_check;"
```

Es muss `ok` erscheinen. Dann räumst du auf, denn der Testordner enthält Geheimnisse:

```bash
sudo rm -rf /root/restore-test
```

## Zurückspielen

Das Zurückspielen brauchst du nur im Ernstfall, zum Beispiel nach einem misslungenen Update. Als Beispiel
LNbits mit dem Backup vom 14. November 2026. Setze deinen Tag ein:

```bash
sudo mkdir -p /root/restore
sudo tar -xzf /var/backups/phalnx/phalnx-2026-11-14.tar.gz -C /root/restore
sudo systemctl stop lnbits
```

```bash
D=/home/ulnbits/lnbits/data
sudo mv $D/database.sqlite3 $D/database.sqlite3.defekt
sudo rm -f $D/database.sqlite3-wal $D/database.sqlite3-shm
sudo bash -c "gunzip -c /root/restore/lnbits/database.sqlite3.sql.gz | sqlite3 $D/database.sqlite3"
sudo chown ulnbits:ulnbits $D/database.sqlite3
sudo systemctl start lnbits
```

Prüfe danach im Log (`sudo journalctl -u lnbits -n 50 --no-pager`), dass LNbits startet. Dann löschst du `/root/restore`
und die `.defekt`-Datei. Die Erweiterungen (`ext_*.sqlite3`) holst du auf demselben Weg zurück, jeweils mit ihrem
Dateinamen.

:::danger[phoenixd nicht aus einem alten Backup zurückspielen]
Ein **alter Stand** der phoenixd-Daten kann den Kanalzustand veralten lassen, und das kann zu Verlusten führen.
Der **Seed** ist der Rettungsweg: Mit ihm stellst du phoenixd auf einem neuen Server wieder her. Das
phoenixd-Backup dient vor allem dazu, `seed.dat` und die Konfiguration zu sichern. Spiele die Datenbank von
phoenixd nur zurück, wenn du genau weißt, was du tust.
:::

## Platz im Blick behalten

Ein Backup ist so groß wie die Daten, mal 14. Prüfe gelegentlich den freien Platz:

```bash
df -h /
sudo du -sh /var/backups/phalnx
```

Wird eine Datenbank groß, senkst du `KEEP` oder legst die Backups später auf ein anderes System aus.
