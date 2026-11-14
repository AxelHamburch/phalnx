---
title: Alltag
description: Was du im laufenden Betrieb regelmäßig tust, wie du Logs liest und worauf du bei Änderungen achtest.
---

## Regelmäßig

- **Wöchentlich:** `sudo apt update && sudo apt upgrade`, bei Bedarf Neustart. Siehe
  [Updates durchführen](/operations/updates/).
- **Neue Versionen** von phoenixd, Alby Hub, LNbits und Relay beobachten und nach Release-Hinweisen
  aktualisieren.
- **Nach größeren Änderungen:** die [Prüfliste](/operations/checklist/) wiederholen.
- **Sperren ansehen:** `sudo fail2ban-client status sshd` und die Web-Jails. Siehe
  [Fail2ban für LNbits](/services/fail2ban-web/).

## Logs ansehen

Fehlgeschlagene SSH-Anmeldungen des letzten Tages:

```bash
sudo journalctl -u ssh --since "1 day ago" | grep -i "failed\|invalid" | tail
```

Ein Dienst im Detail:

```bash
sudo journalctl -u phoenixd -n 50 --no-pager
sudo journalctl -u albyhub -n 200 --no-pager | grep -v "handled API request" | tail -n 30
sudo journalctl -u lnbits -n 50 --no-pager
sudo journalctl -u relay -n 50 --no-pager
```

Fehler seit dem letzten Start des Servers:

```bash
sudo journalctl -p err -b --no-pager | tail -20
```

## Dienste verwalten

| Aufgabe | Befehl |
|---|---|
| Status | `sudo systemctl status <Dienst> --no-pager` |
| Neu starten | `sudo systemctl restart <Dienst>` |
| Stoppen und starten | `sudo systemctl stop <Dienst>`, `sudo systemctl start <Dienst>` |
| Beim Booten aktivieren | `sudo systemctl enable <Dienst>` |
| Nach Änderung der `.service`-Datei | `sudo systemctl daemon-reload` |

Die Dienste heißen `phoenixd`, `relay`, `albyhub` und `lnbits`.

## Snapshots

Mache beim Anbieter einen **Snapshot** nach der Grundhärtung (vor der Installation der Dienste) und nach jeder
größeren Änderung. Ein Snapshot enthält auch Geheimnisse. Bewahre ihn nicht ungeschützt auf.

## Beim Ändern von SSH oder Firewall

Lass vor jeder Änderung an SSH oder Firewall **ein zweites Fenster** mit einer angemeldeten Sitzung offen.
Geht etwas schief, kommst du dort noch hinein. Zusätzlich bleibt dir die Web-Konsole des Anbieters.
