---
title: Vorbereitung und Bedienung
description: Was du vorher brauchst und wie du mit dieser Anleitung arbeitest, inklusive Platzhalter, Terminal und nano.
---

## Was du brauchst

- Einen **VPS mit Ubuntu 24.04 LTS** und mindestens 2 GB Arbeitsspeicher. Diese Anleitung gilt nur für
  Ubuntu 24.04.
- Eine **Domain** für LNbits, bei der du einen A-Eintrag setzen kannst.
- Einen **Windows-PC** mit PowerShell und `ssh` (ab Windows 10 enthalten).
- Einen **Passwortmanager** für die Passphrase des SSH-Schlüssels, das Admin-Passwort und weitere Passwörter.
- Etwas **Zeit und Ruhe**. Die Anleitung ist so gebaut, dass du jeden Schritt prüfst, bevor du weitermachst.

## Vor dem Start

- [ ] Ubuntu-Version **24.04 LTS** beim Anbieter wählen.
- [ ] Im Kundenbereich des Anbieters die **Web-Konsole** (Notzugang) öffnen und ausprobieren. Sie ist
      dein Rettungsweg, falls du dich aussperrst.
- [ ] Beim Anbieter eine **Firewall** anlegen, falls vorhanden: eingehend nur TCP `__SSH_PORT__`, `80` und `443`.
- [ ] Die **IP des Servers** notieren. In dieser Anleitung heißt sie `__SERVER_IP__`.

## Meine Werte

Oben in der Kopfzeile steht der Knopf **Meine Werte**. Dort trägst du zum Beispiel deine Server-IP,
deinen SSH-Port und deine Domain ein. Alle **hervorgehobenen** Stellen in den Befehlen übernehmen die Werte,
auch der Kopier-Knopf der Codeblöcke. Die Werte werden nur in deinem Browser gespeichert.

Ein Beispiel: Der folgende Befehl zeigt zuerst die Standardwerte. Ändere im Panel Port, Benutzer oder
IP, und der Befehl (und sein Kopier-Knopf) enthält danach deine Werte.

```bash
ssh -p __SSH_PORT__ __ADMIN_USER__@__SERVER_IP__
```

## Wo gibst du die Befehle ein?

Vor jedem Block steht, **wo** er läuft. Das ist wichtig, denn viele Fehler entstehen, wenn ein Befehl am
falschen Ort ausgeführt wird.

| Ort | Erkennbar an | Hier gehören hin |
|---|---|---|
| **Dein PC** (PowerShell) | `PS C:\Users\...>` | `ssh-keygen`, der Tunnel, `Test-NetConnection` |
| **Server als `root`** | `root@__HOSTNAME__:~#` | Nur die allerersten Schritte |
| **Server als `__ADMIN_USER__`** | `__ADMIN_USER__@__HOSTNAME__:~$` | Fast alle Befehle mit `sudo` |
| **Shell eines Dienstes** | `uphoenixd@__HOSTNAME__:~$` | Installation eines Dienstes. Dort gibt es **kein** `sudo` |

Eine Shell als Dienst-Benutzer öffnest und verlässt du so:

```bash
sudo -u uphoenixd -H bash -c 'cd ~ && exec bash'
```

Mit `exit` kommst du zurück zu `__ADMIN_USER__`. Alle Befehle mit `sudo` gibst du immer als `__ADMIN_USER__`
ein, **nie** in der Shell eines Dienstes. Dort meldet das System „not in the sudoers file". Das ist richtig so.

## Befehle kopieren und einfügen

- Jeder Codeblock hat einen **Kopier-Knopf**. Nutze ihn, statt zu markieren.
- Befehle mit mehreren Zeilen sind oft Absicht. Wo ein Schritt auf den vorherigen warten muss, stehen die
  Befehle in **getrennten Blöcken**. Gib sie nacheinander ein.
- Stehen spitze Klammern wie `<hash>` in einem Befehl, ersetzt du sie **samt der Klammern** durch deinen
  Wert. Bash versteht `<...>` sonst als Umleitung und meldet `No such file or directory`.

## Dateien bearbeiten mit nano

Konfigurationsdateien bearbeitest du mit `nano`:

| Aktion | Tasten |
|---|---|
| Speichern | **Strg+O**, dann Enter |
| Beenden | **Strg+X** |
| Suchen | **Strg+W** |

Das Einfügen in nano hängt von deinem Terminal ab. Hakt es, probiere ein anderes Terminal. Unter Windows
funktioniert **Git Bash** gut: Einfügen mit **Umschalt+Einfg** oder per Rechtsklick (Strg+V geht dort nicht).

## Wie die Prüfungen aufgebaut sind

Nach jedem Schritt steht ein Abschnitt **Prüfen** mit dem Befehl und der erwarteten Ausgabe. Weicht deine
Ausgabe ab, mach nicht weiter, sondern lies den Abschnitt **Wenn es nicht klappt**.

:::tip
Vor jeder Änderung an SSH oder Firewall lässt du immer ein zweites Fenster mit einer angemeldeten Sitzung
offen. Geht etwas schief, kommst du dort noch hinein.
:::

Weiter mit der [ersten Anmeldung](/server/erste-anmeldung/).
