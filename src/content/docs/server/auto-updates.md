---
title: Automatische Updates
description: Sicherheitsupdates von Ubuntu automatisch einspielen und den Server nachts bei Bedarf neu starten.
---

Ubuntu kann Sicherheitsupdates selbst einspielen. Das schließt bekannte Lücken, ohne dass du daran denken
musst. Die Dienste, die du selbst installierst (phoenixd, Alby Hub, LNbits, Relay), aktualisieren sich nicht
von allein. Dafür gibt es das Kapitel [Updates durchführen](/betrieb/updates/).

## Einschalten

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

Antworte mit **Yes**. Dann öffnest du die Einstellungen:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Prüfe, dass diese Zeile **nicht** auskommentiert ist (kein `//` davor):

```text
"${distro_id}:${distro_codename}-security";
```

## Automatischer Neustart

Nach Kernel-Updates ist ein Neustart nötig. Du kannst ihn automatisch zu einer festen Uhrzeit machen lassen.
Ergänze in derselben Datei:

```text
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "__REBOOT_TIME__";
```

Der Server kann auch aus anderen Gründen neu starten (Wartung des Anbieters, Absturz). Deshalb muss **nach
jedem Neustart alles von allein wieder laufen**. Dafür sind drei Dinge nötig, die du in den nächsten
Kapiteln einrichtest:

- Alle Dienste sind mit `systemctl enable` aktiviert.
- Alby Hub startet nach phoenixd und dem Relay (`After=` und `Wants=`).
- Alby Hub entsperrt sich selbst (Auto-Unlock, siehe [Alby Hub](/dienste/albyhub/#auto-unlock)).

Wer Auto-Unlock nicht nutzen will, setzt `Automatic-Reboot "false"` und startet nach Updates selbst neu,
wenn er Zeit hat.

## Prüfen

Der Probelauf installiert nichts, zeigt aber, ob die Einstellung funktioniert. Ein Tippfehler fällt sonst erst
auf, wenn schon monatelang keine Sicherheitsupdates eingespielt wurden:

```bash
sudo unattended-upgrade --dry-run --debug 2>&1 | tail -5
```

In Ordnung ist eine Zeile wie `No packages found that can be upgraded unattended ...`. Der Rest der
Ausgabe ist egal. Bei `Traceback` oder `Error` prüfst du die Datei `50unattended-upgrades` auf Tippfehler.

Weiter mit den [Dienst-Benutzern](/server/dienst-benutzer/).
