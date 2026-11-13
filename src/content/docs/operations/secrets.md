---
title: Geheimnisse und Backups
description: Wie du Seed, Passwörter und Schlüssel schützt und Backups so anlegst, dass sie keinen Schaden anrichten.
---

Auf dem Server liegen Dinge, mit denen man Geld bewegen kann. Dieses Kapitel fasst zusammen, wie du sie
schützt.

## Der Seed von phoenixd

- Sichere den **Seed offline**: auf Papier, nicht auf dem Server, nicht in einer Cloud. Wer den Seed hat, hat
  das Geld.
- Auf dem Server liegt er nur bei `uphoenixd` (`seed.dat`, Rechte `600`). Kein anderer Dienst bekommt ihn.

## Passwörter und Zugangsdaten

- Passwörter nur in Dateien mit `chmod 600`, nie in Skripten und nie in der Shell-History.
- Zugangsdaten **nie** im Chat, in Screenshots oder in einem Git-Repository ablegen.
- Alle Passwörter gehören in den Passwortmanager: Admin-Passwort, Passphrase des SSH-Schlüssels, Entsperr-Passwort
  von Alby Hub, Passwort des Caddy-Admin-Schutzes, LNbits-Admin.
- Prüfe regelmäßig, welche Schlüssel für die Anmeldung zugelassen sind. Es dürfen nur deine drinstehen:

  ```bash
  ls -la ~/.ssh/
  cat ~/.ssh/authorized_keys
  ```

## Keine überflüssigen Schlüssel

- **Keine Zugangsschlüssel mit Vollzugriff** auf dem Server, zum Beispiel für Cloud-Speicher. Brauchst du
  einen für Backups, lege einen eigenen Zugang an, der nur auf **einen** Speicherort schreiben darf (kein
  Lesen, kein Löschen). Dann kann ein Dieb die Backups weder lesen noch löschen.
- Auf dem Server liegen keine Schlüssel, die mehr dürfen als nötig.

## Backups

- **Verschlüssele Backups, bevor sie den Server verlassen** (zum Beispiel mit `age` oder `gpg`). Sie enthalten
  sonst den Seed und die Passwörter im Klartext.
- Sichere vor allem `phoenixd` (`~/.phoenix`), die Daten von Alby Hub (`~/data`) und die von LNbits
  (`~/lnbits/data`).
- Bewahre Sicherungen, die du vor einem Update anlegst (siehe [Updates durchführen](/operations/updates/)), nicht
  länger als nötig auf. Sie enthalten dieselben Geheimnisse wie die Originale.
- **Snapshots** beim Anbieter enthalten ebenfalls Geheimnisse. Bewahre sie nicht ungeschützt auf.

## Wenig Guthaben auf dem Server

Was nicht gebraucht wird, liegt woanders (Cold Storage). Das begrenzt den Schaden, falls doch etwas schiefgeht.
Auch das Budget der NWC-Verbindung von LNbits dient diesem Zweck.
