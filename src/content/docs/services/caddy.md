---
title: Caddy
description: Caddy als Reverse Proxy mit automatischem HTTPS für LNbits einrichten und den Admin-Bereich mit einem zusätzlichen Passwort schützen.
---

Caddy macht **nur LNbits** öffentlich, mit automatischem HTTPS-Zertifikat. Der Admin-Bereich von LNbits liegt
zusätzlich hinter einem zweiten Passwort. Für Alby Hub gibt es bewusst keinen Eintrag.

## DNS

Beim Domain-Anbieter legst du einen **A-Eintrag** an: `__DOMAIN__` → `__SERVER_IP__`. Auf dem PC prüfst du:

```powershell
Resolve-DnsName __DOMAIN__
```

Die Ausgabe muss die Server-IP zeigen. Erst dann weiter, sonst bekommt Caddy kein Zertifikat.

## Installieren (offizielles Paket)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

```bash
sudo install -d -o caddy -g caddy -m 750 /var/log/caddy
```

Dabei entsteht der Benutzer `caddy`. Den brauchen die [Port-Regeln](/services/port-rules/).

## Passwort für den Admin-Bereich

Wähle ein **neues** Passwort (nicht das LNbits-Passwort) und erzeuge den Hash:

```bash
caddy hash-password
```

Der Hash beginnt mit `$2a---
title: Caddy
description: Caddy als Reverse Proxy mit automatischem HTTPS für LNbits einrichten und den Admin-Bereich mit einem zusätzlichen Passwort schützen.
---

Caddy macht **nur LNbits** öffentlich, mit automatischem HTTPS-Zertifikat. Der Admin-Bereich von LNbits liegt
zusätzlich hinter einem zweiten Passwort. Für Alby Hub gibt es bewusst keinen Eintrag.

## DNS

Beim Domain-Anbieter legst du einen **A-Eintrag** an: `__DOMAIN__` → `__SERVER_IP__`. Auf dem PC prüfst du:

```powershell
Resolve-DnsName __DOMAIN__
```

Die Ausgabe muss die Server-IP zeigen. Erst dann weiter, sonst bekommt Caddy kein Zertifikat.

## Installieren (offizielles Paket)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

```bash
sudo install -d -o caddy -g caddy -m 750 /var/log/caddy
```

Dabei entsteht der Benutzer `caddy`. Den brauchen die [Port-Regeln](/services/port-rules/).

## Passwort für den Admin-Bereich

Wähle ein **neues** Passwort (nicht das LNbits-Passwort) und erzeuge den Hash:

```bash
caddy hash-password
```

.

:::caution[Jetzt „Meine Werte" öffnen]
Kopiere den Hash und öffne oben in der Kopfzeile **Meine Werte**. Trage ihn dort im Feld
**Passwort-Hash für Caddy** ein. Erst dann stehen in den folgenden Befehlen dieser Seite dein echter Hash statt
des Platzhalters `HASH_EINFUEGEN`. Sonst startet Caddy nicht. Der Hash wird aus Sicherheitsgründen **nicht gespeichert**. Lädst du die Seite neu,
trägst du ihn erneut ein.
:::

Du trägst ihn als Umgebungsvariable ein, damit er nicht im Caddyfile steht:

```bash
sudo systemctl edit caddy
```

Oberhalb der Zeile „Lines below this comment will be discarded" fügst du ein. Setze deinen Hash unter
**Meine Werte** ein:

```ini
[Service]
Environment="LNBITS_ADMIN_HASH=__CADDY_HASH__"
```

```bash
sudo systemctl daemon-reload
```

:::caution
Das muss **vor** dem neuen Caddyfile passieren. Ist die Variable beim Start leer, startet Caddy nicht und alle
Seiten sind offline.
:::

## Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Ersetze den **gesamten Inhalt**. Die Werte stellst du über **Meine Werte** ein. `__CADDY_USER__` ist der
Benutzername der zusätzlichen Passwortabfrage vor dem Admin-Bereich, in allen drei Blöcken derselbe. Es ist
nicht der LNbits-Login.

```text
(zugriffslog) {
    log {
        output file /var/log/caddy/access.log {
            roll_size 50MiB
            roll_keep 10
            roll_keep_for 720h
        }
        format filter {
            fields {
                request>uri query {
                    replace api-key REDACTED
                    replace usr REDACTED
                    replace wal REDACTED
                }
            }
        }
    }
}

__DOMAIN__ {
    import zugriffslog

    # Admin-Bereich: zusätzliches Passwort
    @lnbits_admin {
        path /admin /admin/* /users /users/* /audit /audit/* /node /node/api/*
    }
    @lnbits_ext_install {
        method POST
        path /api/v1/extension /api/v1/extension/builder*
    }
    @lnbits_ext_admin {
        method PUT DELETE POST
        path_regexp ^/api/v1/extension/(wasm/.+|[^/]+/(activate|deactivate|permissions|db)|[^/]+)$
    }
    basic_auth @lnbits_admin bcrypt "LNbits Admin" {
        __CADDY_USER__ {$LNBITS_ADMIN_HASH}
    }
    basic_auth @lnbits_ext_install bcrypt "LNbits Admin" {
        __CADDY_USER__ {$LNBITS_ADMIN_HASH}
    }
    basic_auth @lnbits_ext_admin bcrypt "LNbits Admin" {
        __CADDY_USER__ {$LNBITS_ADMIN_HASH}
    }

    handle /api/v1/payments/sse* {
        reverse_proxy 127.0.0.1:5000 {
            header_up X-Forwarded-Host __DOMAIN__
            transport http {
                keepalive off
                compression off
            }
        }
    }

    handle {
        reverse_proxy 127.0.0.1:5000 {
            header_up X-Forwarded-Host __DOMAIN__
        }
    }
}
```

Was der Admin-Schutz abdeckt:

- Einstellungen, Backup, Neustart (`/admin`)
- Benutzerverwaltung (`/users`) und Audit-Log (`/audit`)
- Node-Oberfläche inklusive **Kanal schließen** (`/node`)
- Erweiterungen **installieren, deinstallieren, global ein- und ausschalten** und deren Berechtigungen

Frei bleiben Wallets, Zahlungen, LNURL und die Erweiterungen für normale Nutzer. Sie sehen nie eine
Passwortabfrage.

## Konfiguration prüfen

Zuerst prüfst du, ob die Datei gültig ist. Setze unter **Meine Werte** deinen Hash ein. Er steht in einfachen
Anführungszeichen, denn er enthält `$`-Zeichen:

```bash
sudo -u caddy env LNBITS_ADMIN_HASH='__CADDY_HASH__' caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Am Ende muss `Valid configuration` stehen. Kommt stattdessen `base64-decoding password: illegal base64 data`, steht
im Befehl noch der Platzhalter `HASH_EINFUEGEN` statt deines echten Hashes. Trage ihn unter **Meine Werte** ein
(oder ersetze ihn von Hand) und prüfe dasselbe auch bei `systemctl edit caddy` oben. Die Warnung „Caddyfile input is not formatted" betrifft nur die
Optik und ist kein Fehler. Danach startest du neu:

```bash
sudo systemctl restart caddy
```

## Prüfen

Caddy holt beim ersten Start das Zertifikat:

```bash
sudo systemctl status caddy --no-pager
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://__DOMAIN__/
curl -s -o /dev/null -w '%{http_code}\n' https://__DOMAIN__/admin
```

Erwartet: `200` für die erste Adresse und `401` für `/admin`. Im Browser fragt `https://__DOMAIN__/admin`
zuerst das Caddy-Passwort ab, danach kommt der LNbits-Login.

### Wenn es nicht klappt

- **`502` statt `200`:** Caddy erreicht LNbits nicht. Prüfe `sudo systemctl status lnbits --no-pager` und
  `sudo ss -tlnp | grep 5000` (es muss `127.0.0.1:5000` erscheinen).
- **Caddy startet nicht (`failed`):** Meist fehlt `LNBITS_ADMIN_HASH`. Prüfe
  `sudo systemctl show caddy -p Environment`.
- **Admin-Pfade liefern nicht `401`:** Das neue Caddyfile ist nicht aktiv. Prüfe mit
  `grep -n lnbits_admin /etc/caddy/Caddyfile` und starte Caddy neu.
- **Neues Passwort:** `caddy hash-password` ausführen, den Hash in `sudo systemctl edit caddy` ersetzen,
  dann `sudo systemctl daemon-reload && sudo systemctl restart caddy`.

Weiter mit [Fail2ban für LNbits](/services/fail2ban-web/).
