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

:::note[Im Alltag]
Wer sich 10-mal bei LNbits vertippt oder 5-mal das Caddy-Passwort falsch eingibt, wird für eine Stunde
ausgesperrt. Mehrere Personen hinter **einer** öffentlichen IP (Event-WLAN, Mobilfunk) teilen sich die Zähler.
:::

## 1. Log prüfen

Das Log muss JSON-Zeilen enthalten. Ist es leer, rufe einmal `https://__DOMAIN__/` im Browser auf und
wiederhole den Befehl:

```bash
sudo tail -n 2 /var/log/caddy/access.log
```

In einer Zeile müssen `"remote_ip":"..."`, `"method"`, `"uri"` und am Ende `"status":...` vorkommen. Sieht es
anders aus, mache nicht weiter. Die Filter gehen vom Standard-JSON-Format von Caddy aus.

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

Eine IP dauerhaft auszunehmen geht in `/etc/fail2ban/jail.d/lnbits.local` bei `ignoreip =` (durch Leerzeichen
getrennt), danach `sudo fail2ban-client reload`.

Auffällig ist, wenn `lnbits-admin` auslöst. Dann probiert jemand dein Caddy-Passwort. Sieh dann auch in
LNbits nach, ob zur selben Zeit etwas geändert wurde.

Weiter mit den [Port-Regeln pro Benutzer](/dienste/port-regeln/).
