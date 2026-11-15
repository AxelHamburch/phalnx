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

:::note[Auch optional: Backup]
Die nächtliche Sicherung der Datenbanken beschreibt das Kapitel [Nächtliches Backup](/optional/backup/).
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

1. Öffne den neuen Bot in Telegram (Link von BotFather) und sende ihm `/start`. Der Bot kann dir erst schreiben,
   wenn **du** ihm zuerst geschrieben hast.
2. Öffne [t.me/userinfobot](https://t.me/userinfobot) (**@userinfobot**) und schreibe ihm „hallo". Er antwortet mit
   deiner **ID**. Das ist die Chat-ID, zum Beispiel `123456789`. Notiere sie im Passwortmanager.

Die Chat-ID ist kein Geheimnis. Der Bot stammt aber nicht von Telegram selbst. Gib ihm nie deinen Token.

## 3. In LNbits eintragen

1. Öffne als Super-User die Admin-Oberfläche von LNbits (über Caddy mit dem zusätzlichen Passwort) und gehe zu
   **Settings → System → Benachrichtigungen → Telegram Configuration**.
2. **Enable Telegram** einschalten, den **Access Token** von BotFather und die **Telegram Chat ID** eintragen.
3. **Speichern** klicken und den Server neu starten (**Restart Server**).

Beim Speichern und beim Start schickt LNbits normalerweise eine Nachricht. Kommt nichts an, prüfe das Log:

```bash
sudo journalctl -u lnbits --since "10 min ago" --no-pager | grep -i telegram
```

Dort steht, was schiefging, zum Beispiel `chat not found` (falsche Chat-ID, oder du hast dem Bot noch nicht
`/start` geschrieben) oder `ReadTimeout: Timed out waiting for Telegram`. Bei `ReadTimeout` erreicht der **Server**
Telegram nicht (siehe unten).

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
| Im Log steht `ReadTimeout: Timed out waiting for Telegram` | Der Server erreicht `api.telegram.org` nicht. Test siehe unten. |
| Du willst einen neuen Token | Bei **@BotFather** `/revoke` senden. Der alte Token ist danach ungültig. Trage den neuen in LNbits ein. |

### Erreicht der Server Telegram?

```bash
curl -4 -sS -m 10 -o /dev/null -w '%{http_code}\n' https://api.telegram.org
curl -6 -sS -m 10 -o /dev/null -w '%{http_code}\n' https://api.telegram.org
```

Es muss jeweils eine Zahl wie `302` oder `200` kommen. Bei einer Zeitüberschreitung (`timed out`) ist diese
Verbindung (IPv4 oder IPv6) vom Server zu Telegram gestört. Die lokalen Port-Regeln dieser Anleitung blockieren
Telegram nicht, sie betreffen nur `127.0.0.1`.

:::tip[Wenn der Token in falsche Hände geraten ist]
Sende bei BotFather `/revoke` und trage den neuen Token in LNbits ein. Das kostet dich nichts, und der alte
Token funktioniert sofort nicht mehr.
:::
