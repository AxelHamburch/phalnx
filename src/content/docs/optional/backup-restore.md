---
title: Externe Backups wiederherstellen
description: Ein verschlüsseltes Backup auf dem PC entschlüsseln, auf den Server hochladen und LNbits daraus zurückspielen.
---

Dieses Kapitel brauchst du nur im Ernstfall, zum Beispiel nach einem misslungenen Update, einer beschädigten
Datenbank oder auf einem **neuen Server**. Es setzt die Kapitel [Nächtliches Backup](/optional/backup/) und
[Backups extern sichern](/optional/backup-external/) voraus.

Der Weg: Das verschlüsselte Backup wird auf dem **PC** entschlüsselt (dort liegt dein geheimer Schlüssel), über SSH auf
den Server hochgeladen und dort entpackt. Der geheime Schlüssel kommt so nie auf einen Server.

:::tip[Liegt das Backup noch auf dem Server?]
Dann brauchst du Teil 1 und 2 nicht. Entpacke das Archiv direkt aus `/var/backups/phalnx` (Teil 3) und mache bei
Teil 4 weiter.
:::

## 1. Entschlüsseln (auf dem PC)

Auf deinem PC, im Ordner mit der `.age`-Datei und der Schlüsseldatei. Setze den Namen deiner Datei ein:

```bash
age -d -i phalnx-backup-key.txt -o phalnx-2026-11-14_02-00.tar.gz phalnx-2026-11-14_02-00.tar.gz.age
```

Es entsteht das entschlüsselte Archiv. Es enthält wieder den Seed und alle Passwörter im Klartext. Lösche es, sobald
du es nicht mehr brauchst.

## 2. Auf den Server hochladen

Auf deinem PC:

```powershell
scp -P __SSH_PORT__ -i $HOME\.ssh\__SSH_KEY__ phalnx-2026-11-14_02-00.tar.gz __ADMIN_USER__@__SERVER_IP__:
```

Die Datei landet im Home-Verzeichnis von
`__ADMIN_USER__`. SSH überträgt sie verschlüsselt.

## 3. Entpacken (auf dem Server)

Aus einer hochgeladenen Datei. Danach löschst du sie sofort:

```bash
sudo mkdir -p /root/restore
sudo tar -xzf ~/phalnx-2026-11-14_02-00.tar.gz -C /root/restore
rm ~/phalnx-2026-11-14_02-00.tar.gz
```

Oder aus einem Backup, das auf dem Server liegt (`sudo ls -1 /var/backups/phalnx` zeigt alle):

```bash
sudo mkdir -p /root/restore
sudo tar -xzf /var/backups/phalnx/phalnx-2026-11-14_02-00.tar.gz -C /root/restore
```

Im Ordner `/root/restore` liegen jetzt `phoenixd/`, `albyhub/`, `lnbits/` und `caddy/`.

## 4. LNbits zurückspielen

Als Beispiel die LNbits-Datenbank. Zuerst wird LNbits gestoppt:

```bash
sudo systemctl stop lnbits
```

Dann wird die defekte Datenbank beiseitegelegt und die gesicherte eingespielt:

```bash
D=/home/ulnbits/lnbits/data
sudo mv $D/database.sqlite3 $D/database.sqlite3.defekt
sudo rm -f $D/database.sqlite3-wal $D/database.sqlite3-shm
sudo bash -c "gunzip -c /root/restore/lnbits/database.sqlite3.sql.gz | sqlite3 $D/database.sqlite3"
sudo chown ulnbits:ulnbits $D/database.sqlite3
sudo systemctl start lnbits
```

Prüfe danach im Log, dass LNbits startet:

```bash
sudo journalctl -u lnbits -n 50 --no-pager
```

Die Erweiterungen (`ext_*.sqlite3`) holst du auf demselben Weg zurück, jeweils mit ihrem Dateinamen.

## 5. Aufräumen

Der Ordner `/root/restore` enthält Geheimnisse. Lösche ihn, die `.defekt`-Datei und auf dem PC das entschlüsselte
Archiv:

```bash
sudo rm -rf /root/restore
sudo rm -f /home/ulnbits/lnbits/data/database.sqlite3.defekt
```

:::danger[phoenixd nicht aus einem alten Backup zurückspielen]
Ein **alter Stand** der phoenixd-Daten kann den Kanalzustand veralten lassen, und das kann zu Verlusten führen.
Der **Seed** ist der Rettungsweg: Mit ihm stellst du phoenixd auf einem neuen Server wieder her. Das
phoenixd-Backup dient vor allem dazu, `seed.dat` und die Konfiguration zu sichern. Spiele die Datenbank von
phoenixd nur zurück, wenn du genau weißt, was du tust.
:::

## Alby Hub, Caddy und andere Dateien

Alby Hub und die Konfigurationsdateien holst du nach demselben Muster zurück: den Dienst stoppen, die Datei aus
`/root/restore` an ihren Platz legen (Datenbanken aus der `.sql.gz`-Datei mit `sqlite3` neu aufbauen), Besitzer
setzen und den Dienst starten. Das `Caddyfile` und die Datei mit dem Passwort-Hash liegen in `/root/restore/caddy/`.
Kopiere sie nach `/etc/caddy/Caddyfile` und `/etc/systemd/system/caddy.service.d/override.conf`, dann
`sudo systemctl daemon-reload` und `sudo systemctl restart caddy`.
