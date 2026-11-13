---
title: Lokaler Relay (strfry)
description: Einen eigenen Nostr-Relay nur für den Server bauen, damit Alby Hub und LNbits ohne Umweg über das Internet über NWC sprechen.
---

## Wozu ein eigener Relay

Alby Hub und LNbits sprechen über **NWC**. Dafür brauchen beide einen Nostr-Relay, über den die Nachrichten
laufen. Standardmäßig ist das `wss://relay.getalby.com`. Fällt der aus, kann LNbits nicht zahlen, auch wenn
beide Dienste laufen.

Ein **eigener Relay nur für `127.0.0.1`** vermeidet das. Er ist von außen nicht erreichbar (kein Spam, kein
Caddy, keine Angriffsfläche) und braucht keinen Umweg über das Internet. Fällt der Server aus, ist ohnehin
alles weg.

Wie die Software damit umgeht:

- Alby Hub nimmt in der Variable `RELAY` **mehrere Relays, durch Komma getrennt**. Standard ist
  `wss://relay.getalby.com,wss://relay2.getalby.com`.
- Alby Hub hört auf **allen** eingetragenen Relays und antwortet auf allen.
- In neu erzeugte NWC-Verbindungen schreibt es **alle** Relays als `relay=`-Parameter. Apps nehmen meist nur
  das **erste**.
- LNbits liest aus der NWC-Adresse **nur das erste `relay=`**. Eine automatische Umschaltung gibt es dort nicht.

| Wer | Relay |
|---|---|
| Alby Hub (hört und antwortet) | beide: die offiziellen **und** der lokale |
| externe Apps (Handy und so weiter) | der offizielle, er steht an erster Stelle in `RELAY` |
| **LNbits** | der **lokale Relay** als Standard |
| LNbits im Störfall | `relay=` in der NWC-Adresse von Hand auf den offiziellen ändern |

## Bauen

Als Software dient **strfry**, ein kleiner, schneller Relay. Du baust ihn aus dem Quelltext. Pakete
installierst du als `__ADMIN_USER__`:

```bash
sudo apt install -y git g++ make libssl-dev zlib1g-dev liblmdb-dev libflatbuffers-dev \
  libsecp256k1-dev libzstd-dev libyaml-perl libtemplate-perl libregexp-grammars-perl
```

Der Compiler braucht viel Arbeitsspeicher. Dafür muss die Swap-Datei aus dem Kapitel
[Swap und Tastaturlayout](/server/swap-keyboard/) eingerichtet sein. Prüfen (bei `Swap` muss `2,0Gi` stehen):

```bash
free -h
```

```bash
sudo -u urelay -H bash -c 'cd ~ && exec bash'
```

`make -j1` baut mit einem Compiler gleichzeitig, das braucht am wenigsten Speicher:

```bash
cd ~
git clone https://github.com/hoytech/strfry.git
cd strfry
git checkout $(git describe --tags --abbrev=0)
git submodule update --init
make setup-golpe
make -j1
ls -la strfry
```

Das dauert einige Minuten. Die Ausgabe besteht aus vielen Compiler-Aufrufen, das sind keine Fehler. Ein
Problem erkennst du an `Killed`, `error:` oder `Error 1`. Am Ende zeigt `ls -la strfry` die fertige Datei
(rund 150 MB).

:::note
Bricht der Build mit `Killed signal terminated program cc1plus` ab, fehlt Arbeitsspeicher. Prüfe den Swap. Du
musst nicht von vorn beginnen: Wiederhole nur `cd ~/strfry`, `make -j1` und `ls -la strfry`.
:::

## Konfiguration

Noch in der Shell von `urelay`:

```bash
cp ~/strfry/strfry.conf ~/strfry.conf
mkdir -p ~/strfry-db
nano ~/strfry.conf
```

Suche mit **Strg+W** nach `db =` und setze den absoluten Pfad:

```ini
db = "/home/urelay/strfry-db/"
```

Bei `relay { ... }` steht schon alles richtig (`bind = "127.0.0.1"` und `port = 7777`). Prüfe es, ändere aber
nichts. Beende mit **Strg+X** und speichere mit **Y** und Enter. Danach:

```bash
exit
```

## Als Dienst einrichten

```bash
sudo nano /etc/systemd/system/relay.service
```

```ini title="/etc/systemd/system/relay.service"
[Unit]
Description=Lokaler NWC-Relay (strfry)
After=network.target

[Service]
User=urelay
Group=urelay
WorkingDirectory=/home/urelay
ExecStart=/home/urelay/strfry/strfry --config=/home/urelay/strfry.conf relay
Restart=on-failure
RestartSec=5
LimitNOFILE=1000000

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=tmpfs
BindPaths=/home/urelay
UMask=0077

[Install]
WantedBy=multi-user.target
```

`LimitNOFILE` braucht strfry, weil es beim Start viele Dateien öffnen darf (`nofiles` in der Konfiguration).
Fehlt es, bricht strfry mit einer Meldung zu `nofiles` ab.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now relay
```

### Prüfen

```bash
sudo systemctl status relay --no-pager
sudo ss -tlnp | grep 7777
```

Es muss `127.0.0.1:7777` erscheinen, nicht `0.0.0.0`.

## Alby Hub auf den lokalen Relay einstellen

```bash
sudo -u ualbyhub nano /home/ualbyhub/albyhub.env
```

Ergänze die Zeile, die offiziellen Relays zuerst, den lokalen zuletzt:

```ini
RELAY=wss://relay.getalby.com,wss://relay2.getalby.com,ws://127.0.0.1:7777
```

```bash
sudo systemctl restart albyhub
```

Danach prüfen:

```bash
sudo journalctl -u albyhub -n 100 --no-pager | grep -i relay
```

Die Zeile `Starting Alby Hub` muss bei `relay_urls` alle drei Relays zeigen, der lokale zuletzt:

```text
"relay_urls":["wss://relay.getalby.com","wss://relay2.getalby.com","ws://127.0.0.1:7777"]
```

Das heißt nur, dass sie **eingetragen** sind. Ob Alby Hub den lokalen Relay wirklich erreicht, zeigt die
Verbindung zu Port 7777. Es muss eine Zeile mit `ESTAB` stehen, in der `albyhub` und `strfry` vorkommen:

```bash
sudo ss -tnp | grep 7777
```

Fehlt der lokale Relay bei `relay_urls`, steht `RELAY` nicht richtig in `albyhub.env` (Tippfehler oder
Leerzeichen um das `=`).

Weiter mit [LNbits](/services/lnbits/).
