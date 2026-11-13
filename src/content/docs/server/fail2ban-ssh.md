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
sudo systemctl enable --now fail2ban
```

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

Weiter mit den [automatischen Updates](/server/auto-updates/).
