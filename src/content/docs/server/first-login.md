---
title: Erste Anmeldung und Updates
description: Als root anmelden, das System aktualisieren, Servername und Zeitzone setzen und die ersten Pakete installieren.
---

Dieser Schritt läuft **einmalig als `root`**, mit dem Passwort, das dir der Anbieter gegeben hat. Danach
arbeitest du nur noch als eigener Admin-Benutzer.

## Anmelden

Auf deinem PC (Terminal, unter Windows PowerShell):

```powershell
ssh root@__SERVER_IP__
```

Beim ersten Mal fragt SSH, ob du dem Server vertraust. Antworte mit `yes`.

## System aktualisieren und einrichten

Auf dem Server als `root`:

```bash
apt update && apt upgrade -y
```

```bash
hostnamectl set-hostname __HOSTNAME__
timedatectl set-timezone __TIMEZONE__
```

```bash
apt install -y ufw fail2ban unattended-upgrades curl nano
```

Bei Rückfragen zu Konfigurationsdateien behältst du die vorhandene Version.

## Neustart

Starte den Server jetzt einmal neu. Damit ist ein neuer Kernel aktiv, und der neue Servername greift überall:

```bash
reboot
```

Warte etwa eine Minute und melde dich dann wieder als `root` an:

```powershell
ssh root@__SERVER_IP__
```

## Prüfen

In der Eingabezeile steht jetzt `root@__HOSTNAME__` statt des alten Namens vom Anbieter. Dann prüfst du:

```bash
hostnamectl
timedatectl
```

Es müssen dein Servername (`Static hostname: __HOSTNAME__`) und deine Zeitzone stehen.

Weiter mit [Swap und Tastaturlayout](/server/swap-keyboard/).
