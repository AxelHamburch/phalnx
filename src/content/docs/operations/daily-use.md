---
title: Alltag
description: Was du im laufenden Betrieb regelmäßig tust, wie du Logs liest und worauf du bei Änderungen achtest.
---

## Regelmäßig

- **Ubuntu-Updates** laufen automatisch. Gelegentlich kontrollierst du, ob die Automatik arbeitet, siehe
  [Updates durchführen](/operations/updates/#ubuntu-und-die-pakete).
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

**Schnellcheck, ob alles läuft** (viermal `active` heißt gut):

```bash
systemctl is-active phoenixd relay albyhub lnbits
```

**Fehler der letzten Stunde** in allen Diensten, je höchstens fünf Zeilen. Das ist der Befehl für den Alltag:

```bash
for d in phoenixd relay albyhub lnbits; do echo "== $d =="; sudo journalctl -u $d --since "1 hour ago" --no-pager | grep -iE "error|fatal|panic" | tail -n 5; done
```

Steht unter einem Dienst nichts, gab es keine Fehler. Nur wenn dort etwas auftaucht, schaust du dir diesen Dienst
genauer an:

```bash
sudo journalctl -u phoenixd -n 50 --no-pager
```

Ersetze `phoenixd` durch `lnbits`, `albyhub` oder `relay`. Setze **albyhub** und **relay** nur bei einem
konkreten Problem ein. Sie schreiben für jede Anfrage und jede Verbindung eine Zeile, das Log ist darum lang und
unübersichtlich. Für Alby Hub filterst du die Oberfläche heraus:

```bash
sudo journalctl -u albyhub -n 200 --no-pager | grep -v "handled API request" | tail -n 30
```

Den Verlauf von LNbits über die Zeit siehst du mit den Befehlen im Kapitel [Updates durchführen](/operations/updates/#lnbits).

Fehler seit dem letzten Start des Servers:

```bash
sudo journalctl -p err -b --no-pager | tail -20
```

:::note[Meldung „user NOT in sudoers"]
Steht dort zum Beispiel `ulnbits : user NOT in sudoers ; COMMAND=/usr/bin/apt update`, hat jemand `sudo` in der
Shell eines **Dienst-Benutzers** eingegeben. Die Dienst-Benutzer dürfen kein `sudo`, das ist Absicht und **kein
Angriff und kein Fehler**. Der Eintrag zeigt, dass die Sperre funktioniert. Die Meldung `auth could not identify
password` davor gehört dazu. Gib solche Befehle in der Shell von `__ADMIN_USER__` ein, nach `exit`. Taucht der
Eintrag auf, ohne dass du es warst, prüfe die Anmeldungen mit `last` und die [Notfall-Seite](/operations/emergency/).
:::

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
