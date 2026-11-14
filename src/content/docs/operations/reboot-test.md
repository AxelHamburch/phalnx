---
title: Neustart-Test
description: Einmal ausdrücklich neu starten und prüfen, ob alle Dienste in der richtigen Reihenfolge von allein wieder laufen.
---

Der Server kann jederzeit neu starten: nach einem Kernel-Update, durch Wartung des Anbieters oder nach einem
Absturz. Dann muss **alles von allein wieder laufen**. Das testest du einmal ausdrücklich, bevor du dem System
Geld anvertraust.

## Neu starten

```bash
sudo reboot
```

Warte etwa eine Minute und melde dich wieder an. Dann prüfst du:

```bash
systemctl is-active phoenixd relay albyhub lnbits caddy nft-local fail2ban
```

Jede Zeile muss `active` zeigen. Danach:

```bash
sudo journalctl -u lnbits -b --no-pager | grep -i nwc
```

Der Befehl ist interessant, weil er zeigt, ob sich LNbits nach dem Neustart selbst wieder mit Alby Hub verbunden hat,
ohne dass du eine Zahlung auslösen musst. `-b` begrenzt das Log auf den aktuellen Start, `grep -i nwc` behält nur
die Zeilen zur NWC-Verbindung. Dort siehst du, ob LNbits den Relay erreicht und die Verbindung zu Alby Hub
aufgebaut hat. Meldungen über abgelehnte Verbindungen oder Zeitüberschreitungen weisen darauf hin, dass der
Relay oder Alby Hub noch nicht bereit waren oder die NWC-Adresse nicht stimmt. So findest du den Fehler, bevor
du im nächsten Schritt 100 Sats sendest.

## Was zu prüfen ist

- **Alby Hub entsperrt sich selbst.** Öffne es über den Tunnel. Ist es gesperrt, fehlt Auto-Unlock (siehe
  [Alby Hub](/services/albyhub/#auto-unlock)).
- **LNbits zahlt ohne Eingriff.** Sende 100 Sats aus LNbits. Klappt das, ist die Reihenfolge richtig und die
  NWC-Verbindung baut sich nach dem Neustart selbst wieder auf.
- **Die Port-Regeln sind wieder da:** `sudo nft list table inet local` zeigt die vier Regeln.
- **Fail2ban läuft** und kennt alle Jails: `sudo fail2ban-client status`.

## Wenn LNbits nicht zahlen kann

LNbits startet unabhängig von Alby Hub und vom Relay. War die Finanzierungsquelle beim Start noch nicht
erreichbar, kann LNbits zunächst eine Fehlermeldung zeigen. Wie sich LNbits dabei verhält, hängt von der
Version ab. Hilft Abwarten nicht, startest du LNbits neu:

```bash
sudo systemctl restart lnbits
```

Tritt das bei jedem Neustart auf, erhöhe die Wartezeit `ExecStartPre=/bin/sleep 5` in
`lnbits.service` (siehe [LNbits](/services/lnbits/)).

## Danach

- Gehe die [Prüfliste](/operations/checklist/) durch.
- Mache beim Anbieter einen **Snapshot** als Ausgangspunkt. Ein Snapshot enthält auch Geheimnisse. Bewahre
  ihn nicht ungeschützt auf.
