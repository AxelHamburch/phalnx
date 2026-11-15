---
title: Prüfliste
description: Eine Liste von Befehlen, mit der du nach der Einrichtung und nach jeder größeren Änderung prüfst, ob die Härtung noch stimmt.
---

Jeder Block zeigt, ob ein Teil der Härtung noch stimmt. Gib die Befehle nacheinander ein und vergleiche mit
der Erwartung darunter. Wiederhole die Prüfliste nach jeder größeren Änderung.

## Anmeldung per SSH

Nur Schlüssel, kein Root, nur der Admin-Benutzer, dein Port:

```bash
sudo sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|allowusers) '
```

Erwartet: `port __SSH_PORT__`, `permitrootlogin no`, `passwordauthentication no`,
`allowusers __ADMIN_USER__`. Diese Ausgabe zeigt, was SSH tatsächlich benutzt. Mehr ist hier nicht zu
prüfen.

:::note
In den SSH-Dateien dürfen mehrere `PasswordAuthentication`-Zeilen stehen. Bei SSH gilt der **zuerst gelesene**
Wert, und deine Datei `00-hardening.conf` wird vor der Hauptdatei gelesen. Maßgeblich ist immer die Ausgabe von
`sshd -T`.
:::

## Benutzer

Wer hat eine Shell, wer ist root, wer darf `sudo`:

```bash
getent passwd | grep -E 'zero|bash$'
```

Nur `__ADMIN_USER__` und `root` dürfen eine echte Shell (`/bin/bash`) haben. Die Dienst-Benutzer haben
`/usr/sbin/nologin`.

```bash
sudo awk -F: '($3==0){print}' /etc/passwd
getent group sudo
```

Nur `root` hat die UID 0. In der Gruppe `sudo` steht nur `__ADMIN_USER__`.

## Dateirechte der Geheimnisse

```bash
sudo find /home -maxdepth 3 \( -name '*.env' -o -name 'seed.dat' -o -name 'phoenix.conf' \) -exec ls -l {} \;
```

Alle gefundenen Dateien müssen `-rw-------` haben (`600`), Eigentümer ist der jeweilige Dienst-Benutzer.

## Ports und Firewall

```bash
sudo ss -tulpn
```

Auf allen Adressen (`0.0.0.0` oder `*`) lauschen dürfen `sshd` auf `__SSH_PORT__` und `caddy` auf 80 und 443.
Die Ports 9740, 5000 und 7777 lauschen nur auf `127.0.0.1`.

- **Alby Hub (8029)** lauscht bei dieser Version auf `*:8029`. Das ist unproblematisch, solange die Firewall den
  Port blockiert (der Test von außen unten), aber der Schutz hängt dann allein an `ufw`.
- Die Ports 53 (DNS) und 2019 (Verwaltung von Caddy) sind nur lokal.
- Dass Caddy auch `udp 443` zeigt, ist normal (HTTP/3). `ufw` lässt von außen nur TCP zu.

```bash
sudo ufw status verbose
```

Erwartet: `active`, eingehend sind nur `__SSH_PORT__`, 80 und 443 erlaubt.

Von außen prüfst du auf dem PC, dass die Dienst-Ports zu sind:

```powershell
Test-NetConnection __SERVER_IP__ -Port 9740
Test-NetConnection __SERVER_IP__ -Port 8029
```

Beide müssen `TcpTestSucceeded : False` zeigen. Zur Gegenprobe muss `-Port __SSH_PORT__` `True` zeigen.

In **Git Bash** (und auf Linux) geht derselbe Test mit Bordmitteln:

```bash
timeout 3 bash -c '</dev/tcp/__SERVER_IP__/9740' && echo OFFEN || echo ZU
timeout 3 bash -c '</dev/tcp/__SERVER_IP__/8029' && echo OFFEN || echo ZU
```

Auf **macOS** (dort gibt es `timeout` nicht, dafür `nc`):

```bash
nc -z -w 3 __SERVER_IP__ 9740 && echo OFFEN || echo ZU
nc -z -w 3 __SERVER_IP__ 8029 && echo OFFEN || echo ZU
```

Beide Zeilen müssen `ZU` zeigen. Zur Gegenprobe muss derselbe Befehl mit dem Port `__SSH_PORT__` `OFFEN` zeigen.

## Dienste und Schutz

```bash
systemctl is-active fail2ban ufw unattended-upgrades nft-local phoenixd relay albyhub lnbits caddy
```

Jede Zeile muss `active` sein.

```bash
sudo fail2ban-client status
```

Die Liste muss `sshd`, `lnbits-auth` und `lnbits-admin` enthalten.

```bash
sudo journalctl -p err -b --no-pager | tail -20
```

Zeigt Fehler seit dem Start. Es sollte nichts Auffälliges dabei sein.

Optional bewertet systemd, wie stark die Sandbox der Dienste abgesichert ist:

```bash
for s in phoenixd relay albyhub lnbits; do sudo systemd-analyze security $s --no-pager | tail -1; done
```

Bei allen vier Diensten ist `5.1 MEDIUM` zu erwarten. Deutlich schlechter (zum Beispiel `8.3 EXPOSED`) heißt:
In der Service-Datei fehlen Sandbox-Zeilen.

## Überraschungen finden

Nichts darf laufen, was du nicht selbst eingerichtet hast. Zwei Befehle zeigen versteckte Zeitpläne und
selbst angelegte Dienste:

```bash
sudo ls /etc/cron.d /var/spool/cron/crontabs
find /etc/systemd/system -maxdepth 1 -name '*.service' -type f
```

Erwartet:
- **Cron:** nur Systemeinträge wie `e2scrub_all` und `kernel` in `/etc/cron.d`, der Ordner `crontabs` ist leer.
- **Dienste:** genau deine fünf: `albyhub`, `lnbits`, `nft-local`, `phoenixd` und `relay`.

Alles andere siehst du dir an: `sudo cat /etc/cron.d/<Name>` oder `systemctl cat <Name>`.

## Zusammenfassung der Tests

| Test | Erwartung |
|---|---|
| SSH als `root` | verweigert |
| SSH mit Passwort | verweigert |
| SSH als `uphoenixd` oder `ualbyhub` | verweigert |
| Port 22 | geschlossen |
| 9740, 8029, 5000, 7777 von außen | geschlossen |
| `sudo -u ulnbits curl -m 3 http://127.0.0.1:9740/getinfo` | scheitert (Verbindung abgelehnt) |
| `sudo -u ualbyhub curl -m 3 http://127.0.0.1:9740/getinfo` | `401` |
| `sudo -u ualbyhub ls /home/uphoenixd` | Permission denied |
| `sudo -u ulnbits ls /home/ualbyhub` | Permission denied |
| `sudo ss -tlnp \| grep 7777` | `127.0.0.1:7777` |
| `sudo nft list table inet local` | die vier Regeln sind da |
| `sudo ufw status` | active, nur `__SSH_PORT__`, 80 und 443 |
| `sudo fail2ban-client status sshd` | läuft, Port `__SSH_PORT__` |

## Ergebnis aufheben

Willst du die Ergebnisse später vergleichen, speichere die wichtigsten in einer Datei:

```bash
{ sudo sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|allowusers) '; sudo ss -tulpn; sudo ufw status verbose; systemctl is-active fail2ban ufw unattended-upgrades nft-local phoenixd relay albyhub lnbits caddy; } > ~/check_$(date +%F).txt
```

Zwei Dateien vergleichst du mit `diff ~/check_<old-date>.txt ~/check_<new-date>.txt`. So fällt auf,
wenn sich etwas verändert hat, zum Beispiel ein neuer offener Port.
