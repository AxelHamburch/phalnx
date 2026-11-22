---
title: Backups extern sichern
description: Das nächtliche Backup mit age verschlüsseln und auf den eigenen PC laden, damit es einen Serverausfall überlebt.
---

Dieses Kapitel ist **optional** und baut auf dem [nächtlichen Backup](/optional/backup/) auf. Die Backups dort liegen
auf dem Server selbst. Geht er verloren, sind sie mit weg. Hier verschlüsselst du sie und lädst sie **auf deinen PC**
(oder von dort auf eine externe Platte oder in einen Cloud-Speicher).

Dafür dient das Programm **age**. Das Prinzip: Auf dem Server liegt nur der **öffentliche** Schlüssel. Er kann
verschlüsseln, aber nicht entschlüsseln. Den **geheimen** Schlüssel hast nur du, auf deinem PC. Selbst wer den
Server übernimmt, kann die schon heruntergeladenen Backups nicht lesen.

Das Skript legt die verschlüsselte Kopie jede Nacht zusätzlich an, sobald ein öffentlicher Schlüssel auf dem Server
eingetragen ist. Sie liegt in `/var/backups/phalnx-export`, getrennt vom unverschlüsselten Backup, und auch hier
bleiben die letzten 14.

## 1. age installieren

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

:::note[Die Versionen dürfen verschieden sein]
Auf dem Server installiert Ubuntu 24.04 `age` in der Version **1.1.1**, unter Windows holt `winget` eine neuere
(zum Beispiel 1.3.2). Das ist in Ordnung: Das Dateiformat ist über alle Versionen gleich, und eine Datei, die der
Server verschlüsselt, entschlüsselt dein PC problemlos. Erzeuge den Schlüssel mit dem normalen `age-keygen` und **ohne**
neue Optionen wie `-pq`, denn die kennt die ältere Version auf dem Server nicht. Ob eine Zeile mit oder ohne `v` davor
erscheint, ist nur eine andere Schreibweise.
:::

## 2. Schlüsselpaar auf dem PC erzeugen

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

## 3. Öffentlichen Schlüssel auf den Server legen

Auf dem Server. Ersetze `<age1…>` samt der Klammern durch deine Zeile `Public key`:

```bash
echo "<age1…>" | sudo tee /etc/phalnx-backup.recipient
sudo chmod 644 /etc/phalnx-backup.recipient
```

Der öffentliche Schlüssel ist kein Geheimnis.

## 4. Das Skript erweitern

Das Skript aus dem Kapitel [Nächtliches Backup](/optional/backup/#das-skript) legt noch keine verschlüsselte Kopie an.
Du ergänzt sie mit zwei Befehlen, ohne etwas von Hand zu bearbeiten. Prüfe zuerst, ob die Erweiterung schon drin ist:

```bash
sudo grep -c phalnx-export /usr/local/sbin/phalnx-backup
```

Bei **`1` oder mehr** ist sie schon drin, dann springst du zu Schritt 5. Bei **`0`** machst du Folgendes. Der erste
Befehl löscht die letzte Zeile des Skripts:

```bash
sudo sed -i '/^echo "Backup fertig/d' /usr/local/sbin/phalnx-backup
```

Der zweite hängt die neue Funktion samt der letzten Zeile an. Kopiere ihn **ganz**, vom ersten `sudo` bis zum
alleinstehenden `EOF`:

```bash
sudo tee -a /usr/local/sbin/phalnx-backup > /dev/null <<'EOF'
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
EOF
```

Prüfe es danach noch einmal mit dem `grep`-Befehl von oben. Jetzt muss `1` oder mehr erscheinen.

## 5. Backup auslösen und prüfen

Auf dem Server:

```bash
sudo systemctl start phalnx-backup.service
sudo ls -lh /var/backups/phalnx-export
```

Es muss eine Datei `phalnx-<Datum>_<Uhrzeit>.tar.gz.age` erscheinen, die dir (`__ADMIN_USER__`) gehört. Kommt stattdessen
`No such file or directory`, hat das Skript keine verschlüsselte Kopie angelegt. Siehe die Tabelle „Wenn es nicht
klappt“ unten.

## 6. Auf den PC herunterladen

Auf deinem PC. Ein Befehl holt **alle** verschlüsselten Backups in den aktuellen Ordner (der `*` wird auf dem Server
aufgelöst, darum die Anführungszeichen):

```powershell
scp -P __SSH_PORT__ -i $HOME/.ssh/__SSH_KEY__ "__ADMIN_USER__@__SERVER_IP__:/var/backups/phalnx-export/*.age" .
```

Die Dateien sind verschlüsselt, du darfst sie auf einer externen Platte oder in einem Cloud-Speicher ablegen.
Willst du die verschlüsselte Kopie jede Nacht automatisch in einen AWS-Bucket laden lassen, zeigt das Kapitel
[Backups in AWS sichern](/optional/backup-aws/), wie das geht.

Wie du ein Backup wieder zurückspielst, steht im Kapitel
[Externe Backups wiederherstellen](/optional/backup-restore/).

## Wenn es nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| `/var/backups/phalnx-export` fehlt, obwohl das Backup lief | Das Skript hat die verschlüsselte Kopie übersprungen. Prüfe 1. die Skriptversion: `sudo grep -c phalnx-export /usr/local/sbin/phalnx-backup` (muss mindestens `1` zeigen, sonst die zwei Befehle aus Schritt 4 ausführen), 2. den Schlüssel: `sudo cat /etc/phalnx-backup.recipient` (eine Zeile `age1…`, nicht leer), 3. `age`: `age --version` auf dem Server |
| `age: command not found` auf dem Server | `sudo apt install -y age` |
| `age --version` meldet unter Windows einen Fehler | Das Terminal neu öffnen, siehe den Kasten in Schritt 1 |
| `scp` meldet `Permission denied` | Prüfe Port (`-P`, großes P), Schlüssel und Benutzer. Es sind dieselben Angaben wie bei `ssh`. |
| `scp` findet keine Datei | Es gibt noch keine verschlüsselte Kopie. Löse das Backup aus (Schritt 5) und prüfe `sudo ls -lh /var/backups/phalnx-export`. |
