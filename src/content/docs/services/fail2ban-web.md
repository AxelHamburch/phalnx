---
title: Fail2ban für LNbits
description: Falsche Anmeldungen am LNbits-Login und am Admin-Bereich mitzählen und die absendenden IP-Adressen sperren.
---

## Was es macht

Fail2ban liest das Zugriffslog von Caddy (`/var/log/caddy/access.log`). Wenn eine IP-Adresse zu oft
fehlschlägt, sperrt Fail2ban sie für eine Zeit in der Firewall (Ports 80 und 443). Der SSH-Zugang ist davon
nicht betroffen. Es gibt zwei Regeln (Jails):

| Jail | Zählt als Fehlversuch | Grenze | Sperre |
|---|---|---|---|
| `lnbits-auth` | `POST` und `PUT` auf `/api/v1/auth...` (Login, Registrierung, Nostr, Reset) mit Status 400, 401, 403 oder 429 | 10 in 10 Minuten | 1 Stunde, bei Wiederholung doppelt (höchstens 1 Woche) |
| `lnbits-admin` | **falsches** Caddy-Passwort auf `/admin`, `/users`, `/audit`, `/node/api` | 5 in 10 Minuten | 1 Stunde, bei Wiederholung doppelt (höchstens 1 Woche) |

LNbits sperrt von sich aus nur pro Konto, nicht pro IP, und das Caddy-Passwort hat keine eigene Sperre. Beides
schließt Fail2ban. Es bremst nur das Raten von Passwörtern. Lücken in Erweiterungen oder Angriffe mit gültigem
Token verhindert es nicht.

### Die eigene Sperre von LNbits (ab Version 1.7.0)

LNbits schützt die Anmeldung mit Benutzername und Passwort selbst:

- Nach **5 Fehlversuchen für ein Konto** ist dieses Konto gesperrt, zuerst 1 Minute. Jeder weitere
  Fehlversuch verdoppelt die Sperre: 2, 4, 8 Minuten, höchstens 15. LNbits antwortet dann mit Status `429`.
- Ein erfolgreicher Login setzt den Zähler zurück. Ohne neuen Fehlversuch verfällt er nach 15 Minuten. Ein
  Neustart von LNbits löscht ihn ebenfalls.
- Versuche mit **unbekannten Benutzernamen** verteilt LNbits auf 256 gemeinsame Zähler, je nach Name. Diese
  Zähler gelten für alle, nicht für eine IP. Wer viele erfundene Namen probiert, bekommt nach und nach `429`.
  Auch wer sich beim eigenen Benutzernamen vertippt, kann zufällig auf einen dieser gesperrten Zähler treffen.

Damit ist das Erraten des Passworts für **ein** Konto praktisch ausgeschlossen. Zwei Lücken bleiben, und die
schließt `lnbits-auth`:

- **Fremde können ein Konto aussperren.** Wer 5-mal ein falsches Passwort für dein Konto schickt, sperrt dich
  aus, egal von welcher IP.
- **Viele Konten mit demselben Passwort durchprobieren.** Pro Konto bleibt der Angreifer unter der Grenze.

LNbits selbst sperrt **keine IP**. Das macht nur Fail2ban. Ein `429` von LNbits zählt dabei als Fehlversuch.

:::note[Im Alltag]
Wer sich 10-mal bei LNbits vertippt oder 5-mal das Caddy-Passwort falsch eingibt, wird für eine Stunde
ausgesperrt. Mehrere Personen hinter **einer** öffentlichen IP (Event-WLAN, Mobilfunk) teilen sich die Zähler.
Für Events siehe [Login-Sperre vorübergehend ausschalten](#bei-einem-event-login-sperre-vorübergehend-ausschalten).
:::

### So wird gezählt

- **Pro IP-Adresse, nicht pro Konto.** Fail2ban kennt keine Konten. Es zählt alle Fehlversuche einer IP
  zusammen, egal bei welchem Konto.
- **Gelungene Anmeldungen setzen nichts zurück.** Sie passen nicht zum Filter und werden übergangen. Drei
  Fehlversuche, dann ein paar erfolgreiche Logins, dann wieder ein Fehlversuch: Das sind vier.
- **Jeder Fehlversuch zählt 10 Minuten lang** (`findtime`) und fällt danach aus der Zählung. Gesperrt wird,
  sobald innerhalb der letzten 10 Minuten die Grenze erreicht ist.

## 1. Log prüfen

Das Log muss JSON-Zeilen enthalten. Jede Zeile ist sehr lang, deshalb zeigt dieser Befehl nur die vier wichtigen
Angaben der letzten drei Zugriffe. Ist das Log leer, rufe einmal `https://__DOMAIN__/` im Browser auf und
wiederhole den Befehl:

```bash
sudo tail -n 3 /var/log/caddy/access.log | sed -E 's/.*"remote_ip":"([^"]*)".*"method":"([^"]*)".*"uri":"([^"]*)".*"status":([0-9]+).*/\1 \2 \3 \4/'
```

Jede Zeile der Ausgabe besteht aus IP-Adresse, Methode, Adresse und Statuscode, zum Beispiel:

```text
203.0.113.7 GET /static/js/two-factor.js?v=1794754325 200
```

Siehst du stattdessen die lange, unveränderte JSON-Zeile, passt das Format nicht. Dann mache nicht weiter. Die
Filter gehen vom Standard-JSON-Format von Caddy aus.

## 2. Filter für den Login

```bash
sudo nano /etc/fail2ban/filter.d/lnbits-auth.conf
```

```ini title="/etc/fail2ban/filter.d/lnbits-auth.conf"
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"method":"(?:POST|PUT)".*"uri":"/api/v1/auth(?:/usr|/register|/nostr|/reset|/impersonate)?(?:\?[^"]*)?".*"status":(?:400|401|403|429)\b
ignoreregex =
```

Kopiere den Text **genau so**. `<HOST>` ist ein Schlüsselwort von Fail2ban und steht für die IP-Adresse.
Fail2ban ersetzt es beim Lesen jeder Logzeile durch die echte IP, die dort steht, und zählt ihre
Fehlversuche. Trage dort **keine** eigene IP ein.

## 3. Filter für das Caddy-Passwort

```bash
sudo nano /etc/fail2ban/filter.d/lnbits-admin.conf
```

```ini title="/etc/fail2ban/filter.d/lnbits-admin.conf"
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"uri":"/(?:(?:admin|users|audit)(?:[/?][^"]*)?|node(?:/api/[^"]*)?)".*"Authorization":\["REDACTED"\].*"status":401\b
ignoreregex =
```

Dieser Filter zählt nur Anfragen **mit** gesendetem Passwort. Die erste Anfrage des Browsers ohne Passwort, auf
die Caddy mit der Passwortabfrage antwortet, zählt nicht.

## 4. Die beiden Jails

```bash
sudo nano /etc/fail2ban/jail.d/lnbits.local
```

```ini title="/etc/fail2ban/jail.d/lnbits.local"
[lnbits-auth]
enabled  = true
filter   = lnbits-auth
backend  = auto
logpath  = /var/log/caddy/access.log
port     = http,https
maxretry = 10
findtime = 10m
bantime  = 1h

[lnbits-admin]
enabled  = true
filter   = lnbits-admin
backend  = auto
logpath  = /var/log/caddy/access.log
port     = http,https
maxretry = 5
findtime = 10m
bantime  = 1h
```

:::caution[`backend = auto` ist wichtig]
In `jail.local` (Kapitel [Fail2ban für SSH](/server/fail2ban-ssh/)) steht für alle Jails
`backend = systemd`. Dann würde Fail2ban die Logdatei ignorieren, und die Jails sähen nichts. Die
Wiederholungs-Sperren (`bantime.increment` und so weiter) und `ignoreip` übernehmen die Jails aus
`jail.local`.
:::

## 5. Trocken testen, dann aktivieren

Die Filter laufen gegen dein echtes Log. Dabei wird **nichts gesperrt**:

```bash
sudo fail2ban-regex /var/log/caddy/access.log /etc/fail2ban/filter.d/lnbits-auth.conf
```

```bash
sudo fail2ban-regex /var/log/caddy/access.log /etc/fail2ban/filter.d/lnbits-admin.conf
```

Achte auf die Zeile `Lines: ... matched`. `0 matched` ist **normal**, solange es noch keine fehlgeschlagenen
Logins gibt. Ein Fehler wäre `ERROR` oder `Unable to compile regex`.

So bestätigst du die Filter:

- **Admin-Filter:** Rufe `https://__DOMAIN__/admin` auf, gib ein **falsches** Caddy-Passwort ein und wiederhole
  den Test. Es muss mindestens ein Treffer erscheinen.
- **Login-Filter:** Sende einen absichtlich falschen Login und wiederhole den Test:

  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://__DOMAIN__/api/v1/auth -H 'Content-Type: application/json' -d '{"username":"test","password":"falsch"}'
  ```

  Erwartet ist ein Status aus 400, 401, 403 oder 429. Danach muss `lnbits-auth` einen Treffer zeigen. Ein
  einzelner Versuch führt zu keiner Sperre, denn die Grenze liegt bei 10.

Aktivieren:

```bash
sudo fail2ban-client reload
```

Danach prüfen:

```bash
sudo fail2ban-client status
```

```bash
sudo fail2ban-client status lnbits-auth
sudo fail2ban-client status lnbits-admin
```

`lnbits-auth` und `lnbits-admin` müssen in der Liste stehen. Bei den Einzelabfragen muss unter `File list` das
Log `/var/log/caddy/access.log` stehen. Fehlt es, fehlt `backend = auto`.

## 6. Mit dem Handy testen (nicht im WLAN)

Nutze das Mobilfunknetz, damit nicht deine Heim-IP gesperrt wird:

1. Rufe 6-mal `https://__DOMAIN__/admin` auf und gib jedes Mal ein falsches Caddy-Passwort ein. Danach lädt
   die Seite nicht mehr.
2. Prüfe auf dem Server, dass die Handy-IP gesperrt ist: `sudo fail2ban-client status lnbits-admin`.
3. Entsperre sie wieder (siehe unten).

## Entsperren und überwachen

Sperrt Fail2ban dich auf dem Web, geht **SSH weiter**, denn die Regeln betreffen nur die Ports 80 und 443:

```bash
sudo fail2ban-client unban 1.2.3.4
```

Weitere Befehle:

| Aufgabe | Befehl |
|---|---|
| Eine IP aus einem Jail entsperren | `sudo fail2ban-client set lnbits-admin unbanip 1.2.3.4` |
| Alle Sperren aufheben | `sudo fail2ban-client unban --all` |
| Live mitlesen | `sudo tail -f /var/log/fail2ban.log` (Zeilen `Found`, `Ban`, `Unban`) |
| Eine IP vorübergehend ausnehmen (bis zum Neustart von Fail2ban) | `sudo fail2ban-client set lnbits-auth addignoreip 203.0.113.7` |
| Login-Sperre vorübergehend abschalten (zum Beispiel für ein Event) | `sudo fail2ban-client stop lnbits-auth` |
| Login-Sperre wieder einschalten | `sudo fail2ban-client reload` (oder Neustart von Fail2ban oder Server) |

Eine IP dauerhaft auszunehmen geht in `/etc/fail2ban/jail.d/lnbits.local` bei `ignoreip =` (durch Leerzeichen
getrennt), danach `sudo fail2ban-client reload`.

## Bei einem Event: Login-Sperre vorübergehend ausschalten

Melden sich viele Leute über dasselbe WLAN an, reichen ein paar Tippfehler, und alle sind gesperrt. Für die
Dauer des Events kannst du den Jail `lnbits-auth` anhalten:

```bash
sudo fail2ban-client stop lnbits-auth
```

- Der Jail zählt nicht mehr, und seine bestehenden Sperren fallen weg.
- `lnbits-admin` (Caddy-Passwort) und `sshd` laufen weiter.
- Die [eigene Sperre von LNbits](#die-eigene-sperre-von-lnbits-ab-version-170) pro Konto bleibt bestehen. Das
  Passwort eines Kontos lässt sich also auch ohne `lnbits-auth` nicht erraten. Wer sich 5-mal vertippt, wartet
  nur kurz, und die anderen im WLAN sind nicht betroffen.

Wieder einschalten, sobald das Event vorbei ist:

```bash
sudo fail2ban-client reload
sudo fail2ban-client status
```

`lnbits-auth` muss wieder in der Liste stehen. Vergisst du das, schaltet ein Neustart des Servers oder von
Fail2ban den Jail ebenfalls wieder ein.

Kennst du die öffentliche IP des Event-WLANs, ist das die feinere Lösung: Nimm nur diese IP aus, alle anderen
werden weiter gezählt (gilt ebenfalls bis zum nächsten Neustart von Fail2ban):

```bash
sudo fail2ban-client set lnbits-auth addignoreip <IP des Event-WLANs>
```

Die IP findest du im Log, wenn sich jemand aus dem WLAN anmeldet (Befehl aus Schritt 1), oder auf einem Gerät im
WLAN unter einer Seite wie `https://ifconfig.me`.

## Auffälligkeiten

Auffällig ist, wenn `lnbits-admin` auslöst. Dann probiert jemand dein Caddy-Passwort. Sieh dann auch in
LNbits nach, ob zur selben Zeit etwas geändert wurde.

Weiter mit den [Port-Regeln pro Benutzer](/services/port-rules/).
