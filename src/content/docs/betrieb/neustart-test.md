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
systemctl is-active phoenixd relay albyhub lnbits caddy nft-lokal fail2ban
```

Jede Zeile muss `active` zeigen. Danach:

```bash
sudo journalctl -u lnbits -b --no-pager | grep -i nwc
```

## Was zu prüfen ist

- **Alby Hub entsperrt sich selbst.** Öffne es über den Tunnel. Ist es gesperrt, fehlt Auto-Unlock (siehe
  [Alby Hub](/dienste/albyhub/#auto-unlock)).
- **LNbits zahlt ohne Eingriff.** Sende 100 Sats aus LNbits. Klappt das, ist die Reihenfolge richtig und die
  NWC-Verbindung baut sich nach dem Neustart selbst wieder auf.
- **Die Port-Regeln sind wieder da:** `sudo nft list table inet lokal` zeigt die vier Regeln.
- **Fail2ban läuft** und kennt alle Jails: `sudo fail2ban-client status`.

## Wenn LNbits nicht zahlen kann

LNbits startet unabhängig von Alby Hub und vom Relay. War die Finanzierungsquelle beim Start noch nicht
erreichbar, kann LNbits zunächst eine Fehlermeldung zeigen. Wie sich LNbits dabei verhält, hängt von der
Version ab. Hilft Abwarten nicht, startest du LNbits neu:

```bash
sudo systemctl restart lnbits
```

Tritt das bei jedem Neustart auf, erhöhe die Wartezeit `ExecStartPre=/bin/sleep 5` in
`lnbits.service` (siehe [LNbits](/dienste/lnbits/)).

## Danach

- Gehe die [Prüfliste](/betrieb/pruefliste/) durch.
- Mache beim Anbieter einen **Snapshot** als Ausgangspunkt. Ein Snapshot enthält auch Geheimnisse. Bewahre
  ihn nicht ungeschützt auf.
