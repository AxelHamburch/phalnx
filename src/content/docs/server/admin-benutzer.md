---
title: Admin-Benutzer
description: Einen eigenen Benutzer für die Anmeldung und für sudo anlegen, getrennt von den Dienst-Benutzern.
---

Ab jetzt meldest du dich nicht mehr als `root` an, sondern als eigener Admin-Benutzer. Er ist der **einzige**
Benutzer, der sich per SSH anmelden und `sudo` benutzen darf. Die Dienste (phoenixd, Alby Hub und so weiter)
bekommen später eigene Benutzer, die sich nie anmelden können.

## Benutzer anlegen

Auf dem Server als `root`:

```bash
adduser __ADMIN_USER__
```

Vergib ein **starkes, langes Passwort** (Passwortmanager). Die Fragen nach Name und Telefon lässt du leer.

```bash
usermod -aG sudo __ADMIN_USER__
```

## Wofür das Passwort gebraucht wird

Das Passwort brauchst du für zwei Dinge:

- für `sudo`,
- für die Anmeldung über die **Web-Konsole** deines Anbieters.

Für die normale Anmeldung per SSH wird es **nicht** gebraucht, dort gilt nur der Schlüssel. Weil die
Web-Konsole aber nicht über SSH läuft, ist dieses Passwort ihr einziger Schutz. Wähle deshalb ein langes
Passwort mit Buchstaben und Ziffern. Exotische Sonderzeichen machen das Tippen in der Web-Konsole
schwieriger (siehe [Swap und Tastaturlayout](/server/swap-tastatur/)).

## Prüfen

```bash
id __ADMIN_USER__
```

In der Ausgabe muss bei `groups` die Gruppe `sudo` stehen.

Weiter mit dem [SSH-Schlüssel](/server/ssh-schluessel/).
