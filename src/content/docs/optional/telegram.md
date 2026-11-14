---
title: Benachrichtigungen über Telegram
description: LNbits meldet sich per Telegram, wenn größere Zahlungen eingehen oder abfließen. So überwachst du deine Instanz aktiv und kannst schnell reagieren.
---

Dieses Kapitel ist **optional**. Es lohnt sich aber, denn so erfährst du sofort, was auf deiner LNbits-Instanz
passiert, ohne ständig nachzusehen. LNbits schickt dir eine Nachricht, wenn

- eine **größere Zahlung eingeht** oder **abfließt**,
- der Server **startet oder stoppt**,
- Einstellungen **geändert** wurden,
- ein Konto vom Super-User **gutgeschrieben oder belastet** wurde,
- sich der **Saldo** zwischen deinem Knoten und LNbits auffällig verschiebt.

Eine unerwartete Meldung über eine hohe Auszahlung oder über geänderte Einstellungen ist ein früher Hinweis auf
einen Einbruch. Dann gehst du nach der [Notfall-Anleitung](/operations/emergency/) vor.

:::note[Weitere Kapitel folgen]
Später kommt in diesem Teil ein **Backup-System** dazu: die LNbits-Datenbank täglich sichern und auf ein anderes
System exportieren.
:::

## Was du brauchst

- Ein Telegram-Konto (auf dem Handy oder am PC).
- LNbits läuft und du bist als **Super-User** angemeldet (siehe [LNbits](/services/lnbits/) und
  [Caddy](/services/caddy/)).

Der Server muss dazu **ausgehend** mit `api.telegram.org` sprechen. Das erlaubt die Firewall aus dieser Anleitung,
denn sie sperrt nur eingehenden Verkehr und die lokalen Ports.

:::danger[Der Token ist ein Geheimnis]
Mit dem Token des Bots kann jeder in deinem Namen Nachrichten schicken. Lege ihn im Passwortmanager ab und gib
ihn nie weiter, auch nicht an eine KI (siehe [Hilfe bei Fehlern](/start/preparation/#hilfe-bei-fehlern-eine-ki-fragen)).
:::

## 1. Einen Bot anlegen

1. Öffne in Telegram den Chat mit **@BotFather**. Das ist der offizielle Bot zum Anlegen neuer Bots. Achte auf
   das blaue Häkchen neben dem Namen.
2. Sende `/newbot`.
3. Vergib einen **Anzeigenamen** (zum Beispiel „Mein LNbits") und einen **Benutzernamen**. Der Benutzername muss
   auf `bot` enden, zum Beispiel `meinlnbits_bot`, und noch frei sein.
4. BotFather antwortet mit dem **Token**. Er sieht aus wie `123456789:AAH…` (eine Zahl, ein Doppelpunkt, eine lange
   Zeichenfolge). Speichere ihn im Passwortmanager.

## 2. Die Chat-ID herausfinden

LNbits muss wissen, **an wen** es schreiben soll. Das ist die Chat-ID deines Kontos.

1. Öffne den neuen Bot in Telegram (über den Link von BotFather oder die Suche) und sende ihm `/start`. Der Bot
   kann dir erst schreiben, wenn **du** ihm zuerst geschrieben hast.
2. Rufe auf deinem PC im Browser diese Adresse auf. Ersetze `<Token>` samt der Klammern durch deinen Token:

   ```text
   https://api.telegram.org/bot<Token>/getUpdates
   ```

   Öffne die Adresse in einem **privaten Fenster** (Inkognito-Modus) und schließe es danach. So landet der Token
   nicht im Browserverlauf, der oft auf andere Geräte synchronisiert wird. Die Verbindung zu Telegram ist per HTTPS
   verschlüsselt. Zeige die Adresse nicht auf Screenshots oder in geteilten Bildschirmen.

3. In der Antwort suchst du `"chat":{"id":` und liest die Zahl dahinter ab, zum Beispiel `123456789`. Das ist deine
   **Chat-ID**. Notiere sie im Passwortmanager.

**Alternative ohne Token in der Adresse:** Schreibe einem Bot, der dir deine ID nennt, zum Beispiel **@userinfobot**. Die Chat-ID
ist **kein** Geheimnis, sie verrät niemandem etwas. Dann kommt der Token nur bei BotFather und in LNbits vor. Dieser Bot
stammt aber nicht von Telegram selbst, das musst du ihm vertrauen.

Kommt `"result":[]` (leer), hast du dem Bot noch nichts geschickt. Sende ihm eine Nachricht und lade die Seite neu.
Für eine **Gruppe** fügst du den Bot der Gruppe hinzu und schreibst dort eine Nachricht. Die Chat-ID von Gruppen
ist eine **negative** Zahl, die Minuszeichen gehört dazu.

## 3. In LNbits eintragen

1. Öffne die Admin-Oberfläche von LNbits (Super-User, über Caddy mit dem zusätzlichen Passwort) und gehe zu den
   **Admin-Einstellungen**. Wähle links die Seite **Configure Notifications** aus.
2. Im Block **Telegram Configuration**:
   - **Enable Telegram** einschalten.
   - **Access Token**: den Token von BotFather eintragen.
   - **Telegram Chat ID**: deine Chat-ID eintragen.
3. Oben auf **Speichern** klicken.

Beim Speichern schickt LNbits normalerweise eine Nachricht „Settings updated" (das ist eine der Meldungen aus dem
nächsten Schritt). Kommt sie in Telegram an, funktioniert alles. Kommt nichts, klicke auf **Server neu starten**,
und prüfe dann das Log:

```bash
sudo journalctl -u lnbits --since "10 min ago" --no-pager | grep -i telegram
```

Dort steht, was Telegram abgelehnt hat, zum Beispiel einen falschen Token oder eine falsche Chat-ID.

## 4. Festlegen, worüber du informiert wirst

Weiter unten auf derselben Seite legst du die Meldungen fest. Das sind die Werte, die LNbits mitbringt:

| Meldung | Bedeutung | Vorschlag |
|---|---|---|
| **Settings updated** | Einstellungen wurden gespeichert | an lassen. Eine Meldung, die du nicht ausgelöst hast, ist ein Alarm. |
| **Server Start/Stop** | LNbits wurde gestartet oder gestoppt | an lassen. Zeigt dir auch den Neustart nach den automatischen Updates. |
| **Credit / Debit** | Der Super-User hat ein Konto gutgeschrieben oder belastet | an lassen |
| **Incoming Payments** | Eingang ab einem Betrag (Standard 1.000.000 Sats) | Betrag auf einen Wert setzen, der für dich „größer" ist, zum Beispiel 10.000 |
| **Outgoing Payments** | Ausgang ab einem Betrag (Standard 1.000.000 Sats) | **niedrig setzen**, zum Beispiel 1.000 bis 5.000. Hier willst du schnell Bescheid wissen. |
| **Server Status** | Regelmäßiger Statusbericht (Standard alle 24 Stunden) | optional. Bleibt er aus, ist der Server vielleicht aus. |
| **Balance Delta Changed** | Der Unterschied zwischen Knoten-Saldo und LNbits-Saldo hat sich verändert (Prüfung jede Minute) | Schwelle auf einen Wert über den üblichen Gebühren setzen, zum Beispiel 1.000. |
| **Watchdog Limit** | Meldet, wenn der Knoten deutlich weniger Guthaben hat als LNbits verwaltet | an, wenn du es nutzen willst |

Die Standardwerte für Ein- und Ausgang von 1.000.000 Sats sind für ein Setup mit **kleinem Guthaben** viel zu hoch.
Du würdest nie eine Meldung bekommen. Setze die Grenzen so, dass sie etwa ein Zehntel deines Budgets
ausmachen. Speichere danach wieder mit **Speichern**.

Die Meldung **Balance Delta** vergleicht den Saldo, den die Finanzierungsquelle meldet (hier über NWC), mit der
Summe aller LNbits-Konten. Wie genau das bei deiner Einrichtung ausfällt, kann ich nicht allgemein sagen. Beobachte
sie einige Tage und stelle die Schwelle ein, damit sie nicht bei jeder Gebühr auslöst.

## 5. Testen

1. Sende dir in LNbits eine Zahlung **über** deinem Grenzwert, zum Beispiel einen Betrag knapp über der
   Ausgangsgrenze, und bezahle sie.
2. Es muss in Telegram eine Nachricht erscheinen, mit Betrag und Konto.
3. Stelle den Grenzwert danach wieder auf deinen Wunschwert.

## Wenn es nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| Keine Nachricht nach dem Speichern | **Enable Telegram** ist aus oder der Token ist falsch. Prüfe beides. |
| Im Log steht eine Telegram-Fehlermeldung (zum Beispiel `chat not found`) | Falsche Chat-ID, oder du hast dem Bot noch nie `/start` geschrieben. |
| `getUpdates` liefert eine leere Liste | Dem Bot zuerst eine Nachricht senden, dann neu laden. |
| Nachrichten kommen nicht in der Gruppe an | Bei der Chat-ID der Gruppe fehlt das Minuszeichen, oder der Bot ist nicht Mitglied der Gruppe. |
| Du willst einen neuen Token | Bei **@BotFather** `/revoke` senden. Der alte Token ist danach ungültig. Trage den neuen in LNbits ein. |

:::tip[Wenn der Token in falsche Hände geraten ist]
Sende bei BotFather `/revoke` und trage den neuen Token in LNbits ein. Das kostet dich nichts, und der alte
Token funktioniert sofort nicht mehr.
:::
