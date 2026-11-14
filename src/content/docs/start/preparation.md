---
title: Vorbereitung und Bedienung
description: Was du vorher brauchst und wie du mit dieser Anleitung arbeitest, inklusive Platzhalter, Terminal und nano.
---

## Was du brauchst

- Einen **VPS mit Ubuntu 24.04 LTS** und mindestens 2 GB Arbeitsspeicher. Diese Anleitung gilt nur für
  Ubuntu 24.04.
- Eine **Domain** für LNbits, bei der du einen A-Eintrag setzen kannst.
- Einen **Rechner zum Einrichten** (Windows, macOS oder Linux) mit Terminal und `ssh`. Unter Windows 10 und
  11 sind PowerShell und `ssh` enthalten, unter macOS und Linux das Terminal. Die Beispiele zeigen
  PowerShell. Auf macOS und Linux gelten dieselben `ssh`-Befehle.
- Einen **Passwortmanager** für die Passphrase des SSH-Schlüssels, das Admin-Passwort und weitere Passwörter.
- Etwas **Zeit und Ruhe**. Die Anleitung ist so gebaut, dass du jeden Schritt prüfst, bevor du weitermachst.

## Vor dem Start

- [ ] Ubuntu-Version **24.04 LTS** beim Anbieter wählen.
- [ ] Im Kundenbereich des Anbieters die **Web-Konsole** (Notzugang) öffnen und ausprobieren. Sie ist
      dein Rettungsweg, falls du dich aussperrst.
- [ ] Beim Anbieter eine **Firewall** anlegen, falls vorhanden: eingehend nur TCP `__SSH_PORT__`, `80` und `443`.
- [ ] Die **IP des Servers** notieren. In dieser Anleitung heißt sie `__SERVER_IP__`.

## Passwortmanager vorbereiten

Während der Einrichtung entstehen viele Zugangsdaten, Adressen und Befehle. Lege dir vorher im Passwortmanager
einen Eintrag **Login- und Passwortliste** an und fülle ihn nach und nach. Das spart dir Suchen und schützt vor
Fehlern. Die Vorlage übernimmt deine Werte aus **Meine Werte**:

```text
LNbits-Domain:           __DOMAIN__
Server-IP:               __SERVER_IP__
Servername:              __HOSTNAME__
SSH-Port:                __SSH_PORT__
Admin-Benutzer:          __ADMIN_USER__
Passwort Admin-Benutzer: ...
SSH-Passphrase:          ...

Login:                   ssh -p __SSH_PORT__ -i $HOME\.ssh\__SSH_KEY__ __ADMIN_USER__@__SERVER_IP__
Login kurz:              ssh __HOSTNAME__
phoenixd Seed:           ...
Alby-Hub-Passwort:       ...
Tunnel zu Alby Hub:      ssh -N -L 8029:127.0.0.1:8029 __HOSTNAME__
Alby Hub im Browser:     http://localhost:8029
LNbits Super-User:       z. B. SuperUser
LNbits Super-Passwort:   ...
NWC-Adresse von Alby:    nostr+walletconnect://<Schlüssel>?relay=ws://127.0.0.1:7777&secret=<Geheimnis>
LNbits-Nutzer:           z. B. DeinName
LNbits-Nutzer-Passwort:  ...
Caddy-Benutzer:          __CADDY_USER__
Caddy-Passwort:          ...
```

Die Felder mit `...` füllst du aus, sobald du den jeweiligen Schritt erledigt hast. Die Befehle in der Liste
zum Kopieren sind `ssh`-Befehle. Die Zeile **Login kurz** funktioniert, wenn du den Eintrag in der
`.ssh\config` angelegt hast (siehe [SSH-Tunnel](/services/tunnel/#optional-tunnel-in-sshconfig-eintragen)).

Lege auch die **Zugangsdaten deines VPS-Anbieters** im Passwortmanager ab.

:::caution[Seed und NWC-Adresse sind Geld]
Wer den **phoenixd-Seed** kennt, kann dein Guthaben nehmen. Die **NWC-Adresse** erlaubt Zahlungen im Rahmen ihres
Budgets. Schütze den Passwortmanager mit einem starken Hauptpasswort und, wenn möglich, einem zweiten Faktor.
Schreibe den Seed zusätzlich **auf Papier** auf und bewahre ihn getrennt auf. Lege ihn nicht ungeschützt in einer
Cloud ab.
:::

### Empfehlung: Standard Notes

Als Ablage eignet sich [Standard Notes](https://standardnotes.com/). Das ist eine Ende-zu-Ende-verschlüsselte
Notiz-App, deren Inhalte nur du lesen kannst. Sie ist einfach zu bedienen und läuft auf PC und Handy. Jeder
andere Passwortmanager, dem du vertraust, tut es genauso. Wichtig ist nur, dass die Liste **verschlüsselt** und an
einem Ort liegt, den du auch bei einem Ausfall deines PCs erreichst.

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
| **Dein PC** (Terminal, unter Windows PowerShell) | `PS C:\Users\...>` oder `$` | `ssh-keygen`, der Tunnel, Verbindungstest |
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
| Beenden | **Strg+X** |
| Speichern (nach Strg+X) | **Y**, dann **Enter** (Eingabetaste, auf manchen Tastaturen „Return") |
| Suchen | **Strg+W** |

Du beendest nano mit **Strg+X**. Wurde etwas geändert, fragt nano, ob es speichern soll. Antworte mit **Y**
und bestätige den Dateinamen mit **Enter**. Mit **N** verwirfst du die Änderung.

Das Einfügen in nano hängt von deinem Terminal ab. Hakt es, probiere ein anderes Terminal. Unter Windows
funktioniert **Git Bash** gut: Einfügen mit **Umschalt+Einfg** oder per Rechtsklick (Strg+V geht dort nicht).


## Hilfe bei Fehlern: eine KI fragen

Hilft der Abschnitt **Wenn es nicht klappt** nicht weiter, kann dir eine KI helfen. Kopiere dazu

1. den **Befehl**, den du eingegeben hast,
2. die **vollständige Meldung** (oder Ausgabe) und
3. diesen Satz: „Lies dir bitte zuerst diese Anleitung durch: https://phalnx.21mio.space. Hilf mir dann bei diesem
   Fehler."

in den Chat. Die KI kennt so den Ablauf, die Benutzer und die Ports und rät weniger.

:::danger[Keine Geheimnisse weitergeben]
Prüfe vor dem Absenden, was du kopierst. **Nie** weitergeben: Passwörter, Passphrasen, den **privaten**
SSH-Schlüssel, `http-password`, den Seed, Hashes, NWC-Adressen (`nostr+walletconnect://...`) und Tokens. Auch
die echte Server-IP und deine Domain musst du nicht nennen. Ersetze sie durch Platzhalter wie `203.0.113.10`
oder `lnbits.example.org`. Das gilt vor allem für Ausgaben von `cat` auf Konfigurationsdateien und für
Logs.
:::

## Wie die Prüfungen aufgebaut sind

Nach jedem Schritt steht ein Abschnitt **Prüfen** mit dem Befehl und der erwarteten Ausgabe. Weicht deine
Ausgabe ab, mach nicht weiter, sondern lies den Abschnitt **Wenn es nicht klappt**.

:::tip
Vor jeder Änderung an SSH oder Firewall lässt du immer ein zweites Fenster mit einer angemeldeten Sitzung
offen. Geht etwas schief, kommst du dort noch hinein.
:::

Weiter mit der [ersten Anmeldung](/server/first-login/).
