---
title: Nächtliches Backup
description: Die Datenbanken von phoenixd, Alby Hub und LNbits jede Nacht sichern, nach Datum benennen und in einem Umlaufspeicher aufbewahren.
---

Dieses Kapitel ist **optional**, aber dringend empfohlen. Jede Nacht um **02:00 Uhr** entsteht ein Backup, das nach
Datum und Uhrzeit benannt ist, zum Beispiel `phalnx-2026-11-14_02-00.tar.gz`. So erkennst du auch Backups, die du von
Hand auslöst. Sie liegen im Ordner **`/var/backups/phalnx`** auf dem Server. Das Backup sichert

- **phoenixd** (`~/.phoenix`, mit Seed und Konfiguration),
- **Alby Hub** (`~/data` und `albyhub.env`),
- **LNbits** (`~/lnbits/data` mit der Datenbank und den Erweiterungen, dazu die `.env`),
- **Caddy** (das `Caddyfile` und die Datei mit dem Passwort-Hash des Admin-Schutzes).

Die Backups liegen in einem **Umlaufspeicher**: Es werden die letzten 14 behalten (Backups von Hand zählen mit), das
älteste wird jeweils gelöscht. So wächst der Speicher nicht endlos.

:::caution[Das schützt nicht vor einem Serverausfall]
Die Backups liegen **auf dem Server selbst**. Sie helfen bei einem Bedienfehler, einem fehlerhaften Update oder
einer beschädigten Datenbank. Geht der Server verloren, sind sie mit weg. Dafür gibt es die **verschlüsselte Kopie zum Herunterladen**
(siehe unten). Die Dateien auf dem Server enthalten den **Seed** und alle Passwörter im **Klartext**. Kopiere sie
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
NAME="phalnx-$(date +%F_%H-%M)"

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

# backup_files <Name> <Datei> [<Datei> ...]: einzelne Konfigurationsdateien sichern
backup_files() {
  local name=$1
  shift
  mkdir -p "$STAGE/$name"
  for f in "$@"; do
    if [ -e "$f" ]; then cp -p "$f" "$STAGE/$name/"; else echo "Fehlt: $f" >&2; fi
  done
}

backup_dir phoenixd /home/uphoenixd/.phoenix
backup_dir albyhub  /home/ualbyhub/data /home/ualbyhub/albyhub.env
backup_dir lnbits   /home/ulnbits/lnbits/data /home/ulnbits/lnbits/.env
backup_files caddy  /etc/caddy/Caddyfile /etc/systemd/system/caddy.service.d/override.conf

# Archiv unter Zwischennamen schreiben, erst am Ende umbenennen
tar -C "$STAGE" -czf "$DEST/$NAME.tar.gz.part" .
mv "$DEST/$NAME.tar.gz.part" "$DEST/$NAME.tar.gz"

# Umlaufspeicher: nur die neuesten $KEEP Archive behalten
ls -1 "$DEST"/phalnx-*.tar.gz | sort | head -n -"$KEEP" | xargs -r rm -f --

# Optional: verschlüsselte Kopie zum Herunterladen (nur wenn ein Empfängerschlüssel eingetragen ist)
RECIPIENT_FILE=/etc/phalnx-backup.recipient
EXPORT=/var/backups/phalnx-export
EXPORT_OWNER=__ADMIN_USER__
if [ -s "$RECIPIENT_FILE" ]; then
  install -d -m 700 -o "$EXPORT_OWNER" -g "$EXPORT_OWNER" "$EXPORT"
  age -R "$RECIPIENT_FILE" -o "$EXPORT/$NAME.tar.gz.age.part" "$DEST/$NAME.tar.gz"
  chown "$EXPORT_OWNER:$EXPORT_OWNER" "$EXPORT/$NAME.tar.gz.age.part"
  mv "$EXPORT/$NAME.tar.gz.age.part" "$EXPORT/$NAME.tar.gz.age"
  ls -1 "$EXPORT"/phalnx-*.tar.gz.age | sort | head -n -"$KEEP" | xargs -r rm -f --
  echo "Verschlüsselte Kopie: $EXPORT/$NAME.tar.gz.age"
fi

echo "Backup fertig: $NAME.tar.gz"
```

Rechte setzen:

```bash
sudo chown root:root /usr/local/sbin/phalnx-backup
sudo chmod 700 /usr/local/sbin/phalnx-backup
```

Wie viele Backups behalten werden, steht oben in `KEEP=14`. Ändere die Zahl, wenn du mehr oder weniger Tage
aufbewahren willst. Willst du einen Dienst nicht sichern, löschst du die passende Zeile `backup_dir …` oder `backup_files …`. Weitere
Konfigurationsdateien, etwa die Fail2ban-Dateien unter `/etc/fail2ban/`, nimmst du auf dieselbe Weise in eine
weitere Zeile `backup_files` auf.

Die Datei `override.conf` entsteht mit `systemctl edit caddy` und enthält den Hash des Caddy-Passworts. Behandle sie wie
ein Geheimnis. Fehlt eine Datei, schreibt das Skript `Fehlt: …` ins Log und sichert den Rest.

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

Es muss eine Datei `phalnx-<Datum>_<Uhrzeit>.tar.gz` mit Rechten `-rw-------` und Besitzer `root` erscheinen.
Das Ergebnis liegt immer in `/var/backups/phalnx`. Der Ordner gehört `root` und ist für andere gesperrt (`700`). Darum
braucht jeder Befehl dort `sudo`, und ein Platzhalter wie `*` funktioniert nur innerhalb von `sudo bash -c '…'`. Dass
alle drei Dienste enthalten sind und die Datenbanken mitgesichert wurden, zeigt der Inhalt:

```bash
sudo bash -c 'tar -tzf "$(ls -1 /var/backups/phalnx/phalnx-*.tar.gz | tail -n 1)" | grep -E "sql.gz|seed|.env|Caddyfile"'
```

Du solltest unter `phoenixd/`, `albyhub/` und `lnbits/` jeweils mindestens eine Datei mit `.sql.gz` am Ende sehen,
dazu `seed.dat` bei phoenixd und `Caddyfile` bei Caddy. Der Befehl nimmt das neueste Archiv. Die Namen der Datenbanken hängen von den Programmen ab. Fehlt eine, ist das Backup
unvollständig.

Den Zeitplan und den Lauf der letzten Nacht prüfst du so:

```bash
systemctl list-timers phalnx-backup.timer
sudo journalctl -u phalnx-backup --since "2 days ago" --no-pager
```

Im Log muss `Backup fertig` stehen. Steht dort ein Fehler, läuft das Backup nicht. Schau am Tag nach der
Einrichtung nach und danach gelegentlich, so wie bei der [Kontrolle der Updates](/operations/updates/#ubuntu-und-die-pakete).

## Verschlüsselt auf den eigenen PC laden

Damit du ein Backup **sicher außerhalb des Servers** hast, verschlüsselst du es und lädst es auf deinen PC. Dafür
dient das Programm **age**. Das Prinzip: Auf dem Server liegt nur der **öffentliche** Schlüssel. Er kann
verschlüsseln, aber nicht entschlüsseln. Den **geheimen** Schlüssel hast nur du, auf deinem PC. Selbst wer den
Server übernimmt, kann die schon heruntergeladenen Backups nicht lesen.

Das Skript legt die verschlüsselte Kopie jede Nacht zusätzlich an, sobald ein öffentlicher Schlüssel auf dem
Server eingetragen ist. Ohne Schlüssel bleibt alles wie bisher.

### 1. age installieren

Auf dem Server:

```bash
sudo apt install -y age
```

Auf deinem PC (eine der Zeilen, je nach System):

```text
Windows (PowerShell):  winget install FiloSottile.age
macOS:                 brew install age
Linux (Debian/Ubuntu): sudo apt install age
```

:::caution[Unter Windows: Terminal neu öffnen]
Nach der Installation meldet `winget` „Path environment variable modified; restart your shell". Das heißt: Das
**bereits offene** Terminal kennt `age` noch nicht, und `age --version` meldet „Die Benennung age wurde nicht als Name
eines Cmdlet … erkannt". Schließe das PowerShell-Fenster und öffne ein **neues**. Arbeitest du in einem Terminal in
VS Code, schließe **VS Code ganz** und starte es neu. Erst dann gilt der neue Pfad.
:::

Prüfe es danach mit:

```bash
age --version
```

Es erscheint eine Versionsnummer (zum Beispiel `v1.3.2`). Ist `winget` nicht vorhanden, findest du Downloads auf der
[Seite von age](https://github.com/FiloSottile/age/releases).

### 2. Schlüsselpaar auf dem PC erzeugen

Auf deinem PC, in einem Ordner deiner Wahl:

```bash
age-keygen -o phalnx-backup-key.txt
```

Es erscheint eine Zeile `Public key: age1…`. Das ist der **öffentliche** Schlüssel. Die Datei
`phalnx-backup-key.txt` enthält den **geheimen** Schlüssel (`AGE-SECRET-KEY-…`).

:::danger[Ohne den geheimen Schlüssel sind die Backups wertlos]
Speichere den **Inhalt** von `phalnx-backup-key.txt` im Passwortmanager und lege eine Kopie an einen zweiten Ort
(Papier oder ein verschlüsselter USB-Stick). Verlierst du ihn, kann **niemand** die Backups entschlüsseln. Lege die
Datei **nie** auf den Server und gib sie nie weiter.
:::

### 3. Öffentlichen Schlüssel auf den Server legen

Auf dem Server. Ersetze `<age1…>` samt der Klammern durch deine Zeile `Public key`:

```bash
echo "<age1…>" | sudo tee /etc/phalnx-backup.recipient
sudo chmod 644 /etc/phalnx-backup.recipient
```

Der öffentliche Schlüssel ist kein Geheimnis. Danach lösen wir das Backup einmal von Hand aus:

```bash
sudo systemctl start phalnx-backup.service
sudo ls -lh /var/backups/phalnx-export
```

Es muss eine Datei `phalnx-<Datum>_<Uhrzeit>.tar.gz.age` erscheinen, die dir (`__ADMIN_USER__`) gehört. Sie liegt in
`/var/backups/phalnx-export`, getrennt vom unverschlüsselten Backup. Auch hier bleiben die letzten 14.

### 4. Auf den PC herunterladen

Auf deinem PC. Ein Befehl holt **alle** verschlüsselten Backups in den aktuellen Ordner (der `*` wird auf dem Server
aufgelöst, darum die Anführungszeichen):

```powershell
scp -P __SSH_PORT__ -i $HOME\.ssh\__SSH_KEY__ "__ADMIN_USER__@__SERVER_IP__:/var/backups/phalnx-export/*.age" .
```

Hast du den Eintrag in der `.ssh\config` (siehe [SSH-Tunnel](/services/tunnel/#optional-tunnel-in-sshconfig-eintragen)),
geht es kürzer:

```powershell
scp "__HOSTNAME__:/var/backups/phalnx-export/*.age" .
```

Die Dateien sind verschlüsselt, du darfst sie auf einer externen Platte oder in einem Cloud-Speicher ablegen.

Ein frisches Backup **jetzt** anlegen und danach laden (das Passwort für `sudo` fragt `ssh -t`):

```powershell
ssh -t __HOSTNAME__ "sudo systemctl start phalnx-backup.service"
```

### 5. Entschlüsseln

Auf deinem PC, im Ordner mit der Datei und der Schlüsseldatei. Setze den Namen deiner Datei ein:

```bash
age -d -i phalnx-backup-key.txt -o phalnx-2026-11-14_02-00.tar.gz phalnx-2026-11-14_02-00.tar.gz.age
```

Es entsteht das entschlüsselte Archiv. Es enthält wieder den Seed und alle Passwörter im Klartext. Lösche es, sobald
du es nicht mehr brauchst.

## Von deinem PC wieder hochladen

Das brauchst du, wenn du ein Backup auf den Server **zurückspielen** willst, zum Beispiel auf einem neuen Server.
Entschlüsselt wird auf dem **PC** (Schritt 5 oben). Der geheime Schlüssel bleibt so von jedem Server fern. Das
entschlüsselte Archiv wandert dann über SSH, das verschlüsselt überträgt.

Auf deinem PC:

```powershell
scp -P __SSH_PORT__ -i $HOME\.ssh\__SSH_KEY__ phalnx-2026-11-14_02-00.tar.gz __ADMIN_USER__@__SERVER_IP__:
```

Oder kürzer: `scp phalnx-2026-11-14_02-00.tar.gz __HOSTNAME__:`. Die Datei landet im Home-Verzeichnis von `__ADMIN_USER__`.
Auf dem Server entpackst du sie und löschst sie danach sofort:

```bash
sudo mkdir -p /root/restore
sudo tar -xzf ~/phalnx-2026-11-14_02-00.tar.gz -C /root/restore
rm ~/phalnx-2026-11-14_02-00.tar.gz
```

Weiter geht es im Abschnitt [Zurückspielen](#zurückspielen), dort ab `sudo systemctl stop lnbits`. Das Entpacken
dort ist schon erledigt. Lösche danach `/root/restore`. Entferne auch das entschlüsselte Archiv auf deinem PC.

## Ein Backup testen

Ein Backup, das du nie getestet hast, ist kein Backup. Entpacke das neueste in einen **Testordner** und prüfe, ob sich die
LNbits-Datenbank wiederherstellen lässt. Das ändert nichts am laufenden System:

```bash
sudo mkdir -p /root/restore-test
sudo bash -c 'tar -xzf "$(ls -1 /var/backups/phalnx/phalnx-*.tar.gz | tail -n 1)" -C /root/restore-test'
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
LNbits mit dem Backup vom 14. November 2026, 02:00 Uhr. Setze den Namen deines Archivs ein
(`sudo ls -1 /var/backups/phalnx` zeigt alle):

```bash
sudo mkdir -p /root/restore
sudo tar -xzf /var/backups/phalnx/phalnx-2026-11-14_02-00.tar.gz -C /root/restore
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

### Ist das phoenixd-Backup sinnvoll?

Es ist nützlich, aber **nicht zum Zurückspielen**. Der Seed ist der eigentliche Rettungsweg, und du hast ihn im
Passwortmanager und auf Papier. Das Backup hilft bei diesen Dingen:

- Es enthält `phoenix.conf` mit deinen Einstellungen.
- Es enthält den **Zahlungsverlauf** (die Datenbank). Den brauchst du für Abrechnung und Nachvollziehen.

Der Preis: Der Seed liegt zusätzlich in jedem Backup im Klartext. Das ist ein Grund mehr, die Archive **nur verschlüsselt**
vom Server zu nehmen. Wenn du das nicht willst, nimmst du die Zeile `backup_dir phoenixd …` aus dem Skript. Dann
sicherst du nur Alby Hub, LNbits und Caddy. Der Seed bleibt im Passwortmanager und auf Papier.

## Wenn es nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| `sudo ls` zeigt den Ordner nicht oder er ist leer | Das Skript ist fehlgeschlagen, es gibt dann kein Archiv. Das Log nennt den Grund: `sudo journalctl -u phalnx-backup -n 30 --no-pager` |
| Du willst die Fehlermeldung direkt sehen | Starte das Skript ohne systemd: `sudo /usr/local/sbin/phalnx-backup`. Mehr Einzelheiten zeigt `sudo bash -x /usr/local/sbin/phalnx-backup`. |
| `sqlite3: command not found` | Das Programm fehlt: `sudo apt install -y sqlite3` |
| `Permission denied` beim Start | Rechte setzen (`chmod 700`, `chown root:root`), siehe Abschnitt „Das Skript" |
| `No such file or directory` für einen Quellordner | Der Dienst heißt bei dir anders oder ist nicht installiert. Passe den Pfad an oder lösche die Zeile. |
| `Fehlt: …` im Log | Eine einzelne Datei existiert nicht, der Rest ist gesichert. |

## Platz im Blick behalten

Ein Backup ist so groß wie die Daten, mal 14. Prüfe gelegentlich den freien Platz:

```bash
df -h /
sudo du -sh /var/backups/phalnx
```

Wird eine Datenbank groß, senkst du `KEEP` oder legst die Backups später auf ein anderes System aus.
