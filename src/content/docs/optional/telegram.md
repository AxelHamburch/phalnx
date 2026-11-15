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
`/start` geschrieben) oder `ReadTimeout: Timed out waiting for Telegram`. Bei `ReadTimeout` antwortet Telegram nicht,
meist liegt es am Token (siehe unten).

## 4. Festlegen, worüber du informiert wirst

Weiter unten auf derselben Seite legst du die Meldungen fest. Das sind die Werte, die LNbits mitbringt:

| Meldung | Bedeutung | Vorschlag |
|---|---|---|
| **Settings updated** | Einstellungen wurden gespeichert | an lassen. Eine Meldung, die du nicht ausgelöst hast, ist ein Alarm. |
| **Server Start/Stop** | LNbits wurde gestartet oder gestoppt | an lassen. Zeigt dir auch den Neustart nach den automatischen Updates. |
| **Credit / Debit** | Der Super-User hat ein Konto gutgeschrieben oder belastet | an lassen |
| **Incoming Payments** | Eingang ab einem Betrag (Standard 1.000.000 Sats) | auf **10.000 Sats** setzen. Mikrozahlungen darunter werden ausgeblendet. |
| **Outgoing Payments** | Ausgang ab einem Betrag (Standard 1.000.000 Sats) | auf **10.000 Sats** setzen, wie beim Eingang |
| **Server Status** | Regelmäßiger Statusbericht (Standard alle 24 Stunden) | auf **168 Stunden** setzen. Ein Bericht pro Woche reicht. Bleibt er aus, ist der Server vielleicht aus. |
| **Balance Delta Changed** | Der Unterschied zwischen Knoten-Saldo und LNbits-Saldo hat sich verändert (Prüfung jede Minute) | auf **0** setzen (Meldung aus). Du steuerst das Guthaben in Alby Hub selbst, deshalb weicht der Wert immer ab. |
| **Watchdog Limit** | Meldet, wenn der Knoten deutlich weniger Guthaben hat als LNbits verwaltet | an, wenn du es nutzen willst |

Die Standardwerte von 1.000.000 Sats sind für ein Setup mit kleinem Guthaben viel zu hoch, du bekämst nie eine
Meldung. Speichere danach mit **Speichern**.

## 5. Testen

Der einfachste Test: Klicke in den Einstellungen auf **Speichern**. Es muss in Telegram die Meldung
**Settings updated** erscheinen.

Eine Zahlung löst erst ab 10.000 Sats eine Meldung aus. Willst du das testen, setze die Grenze für Ausgang oder
Eingang kurz auf 100 Sats, zahle etwas mehr und stelle sie danach wieder auf 10.000 Sats.

## Wenn es nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| Keine Nachricht nach dem Speichern | **Enable Telegram** ist aus oder der Token ist falsch. Prüfe beides. |
| Im Log steht eine Telegram-Fehlermeldung (zum Beispiel `chat not found`) | Falsche Chat-ID, oder du hast dem Bot noch nie `/start` geschrieben. |
| Im Log steht `ReadTimeout: Timed out waiting for Telegram` | Telegram antwortet nicht. Teste den Token (siehe unten), hole bei Bedarf einen neuen. |
| Du willst einen neuen Token | Bei **@BotFather** `/revoke` senden. Der alte Token ist danach ungültig. Trage den neuen in LNbits ein. |

### Token testen

Mit diesem Test prüfst du, ob Telegram deinen Token annimmt. Der Token bleibt dabei unsichtbar und landet nicht im
Befehlsverlauf:

```bash
read -rs TG
curl -sS -m 15 -w '\n%{http_code} in %{time_total}s\n' "https://api.telegram.org/bot$TG/getMe"
unset TG
```

Beim ersten Befehl fügst du den Token ein (es erscheint nichts) und drückst Enter. Erwartet wird
`{"ok":true,"result":{…}}` in unter einer Sekunde.

- `404 Not Found` oder `401 Unauthorized`: Der Token ist falsch oder ungültig.
- **Keine Antwort** (`timed out`, `0 bytes received`): Auch das kann am Token liegen. Hole bei **@BotFather** einen neuen
  (`/mybots` → Bot wählen → **API Token** → **Revoke current token**) und teste ihn. Das hat in einem Test das Problem gelöst.

:::tip[Wenn der Token in falsche Hände geraten ist]
Sende bei BotFather `/revoke` und trage den neuen Token in LNbits ein. Das kostet dich nichts, und der alte
Token funktioniert sofort nicht mehr.
:::
