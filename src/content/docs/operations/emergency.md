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
   sudo nano /etc/ssh/sshd_config.d/00-hardening.conf
   sudo systemctl restart ssh
   ```

   Oder hebe eine Sperre von Fail2ban auf:

   ```bash
   sudo fail2ban-client unban --all
   ```

:::caution[In der Web-Konsole von Hand tippen]
Tippe Benutzername und Passwort **Zeichen für Zeichen**. Beim Einfügen gehen Tasten verloren oder werden
verändert. Stimmt das Tastaturlayout nicht (`z` und `y` vertauscht), siehe
[Swap und Tastaturlayout](/server/swap-keyboard/).
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
   `relay=wss://relay.getalby.com`
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
- Die [Port-Regel](/services/port-rules/) muss `ulnbits` den Port 9740 dann erlauben. Das ist eine **bewusste**
  Änderung: Nimm `ulnbits` in die erste Zeile der nft-Datei auf und lade neu mit
  `sudo systemctl reload nft-local`.
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

1. **Guthaben abziehen:** Schließe den Kanal und schicke das Geld an eine Bitcoin-Adresse, die du kontrollierst
   (siehe unten).
2. **Schlüssel rotieren:** Neue SSH-Schlüssel, neue Passwörter, neue NWC-Verbindungen.
3. **Server neu aufsetzen** und diese Anleitung von vorn durchgehen. Hole die Daten nur aus Sicherungen, die
   du vor dem Verdacht angelegt hast.

### Kanal schließen und Guthaben in Sicherheit bringen

Dafür brauchst du drei Angaben:

| Angabe | Woher |
|---|---|
| `<Kanal-ID>` | Der Wert `channelId` aus `phoenix-cli getinfo` (siehe [Updates durchführen](/operations/updates/#phoenixd)). Du brauchst nur die lange Zeichenfolge. |
| `<Bitcoin-Adresse>` | Eine **On-Chain-Adresse** (beginnt mit `bc1`, `1` oder `3`) aus einer Wallet, die **du** kontrollierst und die **nicht** auf dem Server liegt, zum Beispiel eine Hardware-Wallet. Kopiere sie dort aus dem Empfangen-Bereich. |
| `<Gebühr>` | Die Gebühr in **sat pro Byte** (sat/vB) für die Transaktion. Eine aktuelle Empfehlung zeigt [mempool.space](https://mempool.space) bei „Transaction Fees". Eine höhere Zahl bestätigt schneller, eine niedrigere kostet weniger. |

Die **Kanal-ID** liest du als `__ADMIN_USER__` so ab. Sie steht im Eintrag `channels` unter `channelId`:

```bash
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli getinfo
```

Den Befehl zum Schließen führst du als `__ADMIN_USER__` aus:

```bash
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli closechannel --channelId=<Kanal-ID> --address=<Bitcoin-Adresse> --feerateSatByte=<Gebühr>
```

Ersetze die Platzhalter **samt der spitzen Klammern**. Ein Beispiel mit Dummy-Werten, so sieht die Form aus:
`--channelId=f80b…(64 Zeichen) --address=bc1q… --feerateSatByte=10`. phoenixd schließt den Kanal, und das
Guthaben landet nach der Bestätigung auf der Adresse. Prüfe die Adresse sehr genau, eine Überweisung auf Bitcoin
lässt sich nicht zurückholen.

**Das Ergebnis:** Klappt es, gibt der Befehl nach dem `sudo`-Passwort eine einzige Zeile aus, eine lange Zeichenfolge
aus Ziffern und Buchstaben (64 Zeichen):

```text
9f3c…(64 Zeichen, Beispiel)
```

Das ist die **Transaktions-ID** der Schließung. Du kannst sie in einem Block-Explorer wie
[mempool.space](https://mempool.space) in das Suchfeld einfügen und siehst dann den Stand: Zuerst steht die
Transaktion unbestätigt im Mempool, danach zeigt der Explorer die Bestätigungen, sobald ein Block sie aufnimmt. Auch
deine Zieladresse erscheint dort mit dem Betrag. Notiere die ID, bis das Geld bei dir angekommen ist. Kommt statt
der Zeichenfolge eine Fehlermeldung, hat phoenixd den Kanal nicht geschlossen. Prüfe dann Kanal-ID, Adresse und
Gebühr und gib den Befehl noch einmal ein.

:::tip[Lege den Befehl vorher bereit]
Im Ernstfall zählt jede Minute, und du bist aufgeregt. Lege dir den Befehl darum **schon jetzt fertig ausgefüllt** im
Passwortmanager ab: mit deiner **Kanal-ID**, einer **Bitcoin-Adresse, die du selbst verwahrst** (zum Beispiel einer
Hardware-Wallet) und einer **Gebühr**, die zügig bestätigt wird. Dann musst du im Fall der Fälle nur noch kopieren,
einfügen und die Gebühr kurz mit [mempool.space](https://mempool.space) vergleichen. So bist du vorbereitet und kannst
schnell reagieren. Prüfe den Eintrag gelegentlich: Hat sich die Kanal-ID geändert (zum Beispiel nach einem neuen
Kanal), passe ihn an, und teste die Adresse vorher mit einem kleinen Betrag.
:::

Kommst du per SSH nicht mehr auf den Server, geht es auch über die **Web-Konsole** des Anbieters. Hast du den
**Seed** gesichert, kannst du das Guthaben notfalls auch auf einem neuen Gerät mit phoenixd wiederherstellen.

## Weitere Hilfe

- Die [Prüfliste](/operations/checklist/) zeigt, ob die Härtung noch stimmt.
- Die Kapitel dieser Anleitung haben jeweils einen Abschnitt „Wenn es nicht klappt".
- Kommst du nicht weiter, hilft eine KI. Wie du ihr den Fehler übergibst, ohne Geheimnisse preiszugeben, steht
  unter [Hilfe bei Fehlern](/start/preparation/#hilfe-bei-fehlern-eine-ki-fragen).
