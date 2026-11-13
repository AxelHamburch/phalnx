---
title: Notfall und Fehlersuche
description: Was du tust, wenn du dich ausgesperrt hast, der lokale Relay oder Alby Hub ausfällt oder der Verdacht auf einen Einbruch besteht.
---

## Ausgesperrt: die Web-Konsole

Hast du dich per SSH ausgesperrt (falscher Port, falscher Schlüssel, Fail2ban), kommst du über die
**Web-Konsole** des Anbieters wieder auf den Server. Sie läuft nicht über SSH, deshalb gelten die
SSH-Einstellungen dort nicht.

1. Öffne im Kundenbereich des Anbieters die Web-Konsole.
2. Melde dich als `__ADMIN_USER__` mit dem **Passwort** an (nicht mit dem Schlüssel).
3. Behebe das Problem, zum Beispiel:

   ```bash
   sudo nano /etc/ssh/sshd_config.d/00-haertung.conf
   sudo systemctl restart ssh
   ```

   Oder hebe eine Sperre von Fail2ban auf:

   ```bash
   sudo fail2ban-client unban --all
   ```

:::caution[In der Web-Konsole von Hand tippen]
Tippe Benutzername und Passwort **Zeichen für Zeichen**. Beim Einfügen gehen Tasten verloren oder werden
verändert. Stimmt das Tastaturlayout nicht (`z` und `y` vertauscht), siehe
[Swap und Tastaturlayout](/server/swap-tastatur/).
:::

Weitere Fälle:

- **`Login incorrect`:** Tippfehler, falsches Layout oder das Passwort wurde geändert. Das Root-Passwort des
  Anbieters hilft hier nicht, denn nur `__ADMIN_USER__` darf sich anmelden.
- **Fail2ban sperrt dich auch per SSH aus (zum Beispiel durch den Jail `sshd`):** Entsperre dich über die
  Web-Konsole mit `sudo fail2ban-client unban --all`.

## Der lokale Relay fällt aus

LNbits liest aus der NWC-Adresse nur **ein** `relay=` und schaltet nicht selbst um. Fällt der lokale Relay
aus, stellst du es von Hand auf den offiziellen:

1. In der NWC-Adresse von LNbits das `relay=` auf den offiziellen Relay ändern:
   `relay=wss%3A%2F%2Frelay.getalby.com`
2. Speichern und LNbits neu starten: `sudo systemctl restart lnbits`.
3. Alby Hub hört dort schon, denn der offizielle Relay steht in seiner `RELAY`-Liste.
4. Repariere danach den lokalen Relay und stelle die Adresse zurück.

Teste den Notweg **einmal**, bevor du ihn brauchst: Relay stoppen (`sudo systemctl stop relay`), `relay=` in
LNbits auf den offiziellen setzen, LNbits neu starten, 100 Sats zahlen. Danach zurückstellen und den Relay
wieder starten.

## Alby Hub fällt aus: LNbits direkt mit phoenixd

Fällt **Alby Hub** aus, kannst du LNbits als Notlösung direkt auf phoenixd umstellen. Finanzierungsquelle
`PhoenixdWallet`, Adresse `http://127.0.0.1:9740` und das Passwort von phoenixd. Dabei gilt:

:::danger[Das Limit von NWC entfällt]
Mit dem Vollzugriffs-Passwort kann LNbits (und jeder, der LNbits übernimmt) wieder alles: zahlen, senden und
den Kanal schließen. Nutze diesen Weg nur kurz.
:::

- Trage das Passwort **nicht vorab** ein. Hole es erst im Ernstfall aus
  `/home/uphoenixd/.phoenix/phoenix.conf` (`sudo cat`).
- Die [Port-Regel](/dienste/port-regeln/) muss `ulnbits` den Port 9740 dann erlauben. Das ist eine **bewusste**
  Änderung: Nimm `ulnbits` in die erste Zeile der nft-Datei auf und lade neu mit
  `sudo systemctl reload nft-lokal`.
- Danach so schnell wie möglich zurück auf NWC, die Regel wieder entfernen und das Passwort aus der
  LNbits-Konfiguration löschen.
- Halte in der Zwischenzeit möglichst wenig Guthaben im Kanal.

## Ein Dienst startet nicht

```bash
sudo systemctl status <Dienst> --no-pager
sudo journalctl -u <Dienst> -n 50 --no-pager
```

Typische Ursachen:

- **Tippfehler in der `.service`-Datei oder der Konfiguration.** Das Log nennt die Zeile.
- **Falscher Pfad bei `ExecStart`.** Prüfe, dass die Datei existiert und dem richtigen Benutzer gehört.
- **Die Sandbox ist zu streng.** Lockere testweise `ProtectHome` und `BindPaths` und prüfe das Log.
- **Ein Benutzer in den Port-Regeln fehlt.** Läuft ein Dienst nach den Port-Regeln nicht mehr, sieh nach, ob
  eine Verbindung zu einem Port abgelehnt wird.
- **`Active: activating (auto-restart)`:** Der Dienst stürzt ab und systemd startet ihn alle 5 Sekunden neu
  (`RestartSec=5`). Das Log zeigt den Grund.

## Bei Verdacht auf einen Einbruch

:::danger[Nicht reparieren]
Repariere nichts am betroffenen System. Reagiere in dieser Reihenfolge:
:::

1. **Guthaben abziehen:** Schließe den Kanal (phoenixd `closechannel`) und bringe das Geld in Sicherheit.
2. **Schlüssel rotieren:** Neue SSH-Schlüssel, neue Passwörter, neue NWC-Verbindungen.
3. **Server neu aufsetzen** und diese Anleitung von vorn durchgehen. Hole die Daten nur aus Sicherungen, die
   du vor dem Verdacht angelegt hast.

## Weitere Hilfe

- Die [Prüfliste](/betrieb/pruefliste/) zeigt, ob die Härtung noch stimmt.
- Die Kapitel dieser Anleitung haben jeweils einen Abschnitt „Wenn es nicht klappt".
