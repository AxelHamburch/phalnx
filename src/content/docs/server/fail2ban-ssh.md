---
title: Fail2ban für SSH
description: Fail2ban sperrt IP-Adressen, die zu oft eine falsche SSH-Anmeldung versuchen.
---

Fail2ban liest die Anmeldeversuche und sperrt eine IP-Adresse in der Firewall, wenn sie zu oft scheitert. Hier
richtest du zuerst den Schutz für SSH ein. Der Schutz für die Weboberfläche kommt später im Kapitel
[Fail2ban für LNbits](/services/fail2ban-web/).

## Konfiguration

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
backend  = systemd
banaction = nftables
bantime  = 1h
findtime = 10m
maxretry = 5
bantime.increment = true
bantime.factor    = 2
bantime.maxtime   = 1w
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled  = true
port     = __SSH_PORT__
maxretry = 3
```

- Eine Sperre dauert zuerst eine Stunde und verdoppelt sich bei Wiederholung, höchstens eine Woche.
- `port` muss **dein** SSH-Port sein, sonst sperrt der Jail den falschen Port.
- `backend = systemd` liest das Journal. Jails, die eine Logdatei lesen, brauchen später ein eigenes
  `backend = auto`.

## Starten

```bash
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
```

Fail2ban läuft schon seit der Installation, aber noch mit den Standardwerten (Port 22). Erst der Neustart liest
deine `jail.local` ein.

## Prüfen

Fail2ban braucht einen Moment, bis es bereit ist. Gib die Befehle danach ein:

```bash
sudo fail2ban-client status sshd
```

```bash
sudo nft list table inet f2b-table | grep dport
```

Beim zweiten Befehl muss dein SSH-Port erscheinen. Kommt „Failed to access socket", war der Dienst noch
nicht bereit. Wiederhole den Befehl nach ein paar Sekunden.

### Probe, ob eine Sperre greift

Nur mit einer Test-IP, **nicht** mit deiner eigenen:

```bash
sudo fail2ban-client set sshd banip 203.0.113.7
```

```bash
sudo fail2ban-client set sshd unbanip 203.0.113.7
```

Beide Befehle antworten mit `1`.

## Wenn du dich selbst aussperrst

Die Passphrase deines Schlüssels prüft nur dein PC, der Server sieht sie nie. Ein Tippfehler dort zählt also
nicht. Als Fehlversuch zählen nur Anmeldungen, die beim Server ankommen und scheitern: ein falscher Benutzer
(zum Beispiel `root`), ein falscher Schlüssel oder viele Schlüssel im SSH-Agent, die nacheinander probiert
werden. Nach 3 solchen Versuchen in 10 Minuten ist deine IP für eine Stunde gesperrt, und SSH antwortet nicht
mehr.

Dann meldest du dich über die **Web-Konsole** des Anbieters an (siehe
[Notfall und Fehlersuche](/operations/emergency/)) und hebst die Sperre auf:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip <deine IP>
```

Deine IP steht unter `Banned IP list`. Weißt du sie nicht, hebe alle Sperren auf:
`sudo fail2ban-client unban --all`.

Weiter mit den [automatischen Updates](/server/auto-updates/).
