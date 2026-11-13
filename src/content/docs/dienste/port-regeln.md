---
title: Port-Regeln pro Benutzer
description: Eine Firewall-Regel, die lokale Verbindungen zu den Dienst-Ports nur für bestimmte Benutzer zulässt.
---

## Wozu

Dateirechte schützen nicht vor dem Netzwerk: Jeder Benutzer auf dem Server kann sich mit `127.0.0.1:9740`
(phoenixd) verbinden. Wer in LNbits einbricht (Benutzer `ulnbits`), könnte also die API von phoenixd
anfragen. Mit einer Firewall-Regel, die auf den **Benutzer** schaut, der die Verbindung aufbaut, kommt die
Verbindung gar nicht erst zustande.

Wer darf wohin (zusätzlich zu `root`):

| Port | Dienst | darf verbinden |
|---|---|---|
| 9740 | phoenixd | `uphoenixd`, `ualbyhub` |
| 8029 | Alby Hub | `ualbyhub`, `__ADMIN_USER__` (für den Tunnel) |
| 5000 | LNbits | `ulnbits`, `caddy` |
| 7777 | Relay | `urelay`, `ualbyhub`, `ulnbits` |

Jetzt existieren alle Benutzer, auch `caddy`. Das ist die Voraussetzung, denn die Namen werden beim Laden
aufgelöst.

## Das Regelwerk

```bash
sudo nano /etc/nftables-lokal.conf
```

```text title="/etc/nftables-lokal.conf"
add table inet lokal
delete table inet lokal
table inet lokal {
  chain output {
    type filter hook output priority 0; policy accept;
    oifname "lo" tcp dport 9740 meta skuid != { "root", "uphoenixd", "ualbyhub" } reject with tcp reset
    oifname "lo" tcp dport 8029 meta skuid != { "root", "__ADMIN_USER__", "ualbyhub" } reject with tcp reset
    oifname "lo" tcp dport 5000 meta skuid != { "root", "caddy", "ulnbits" } reject with tcp reset
    oifname "lo" tcp dport 7777 meta skuid != { "root", "ualbyhub", "ulnbits", "urelay" } reject with tcp reset
  }
}
```

Jede Zeile heißt: „Verbindungen zu diesem Port über die lokale Schnittstelle (`lo`) werden abgelehnt, außer
sie kommen von einem der aufgeführten Benutzer."

- Die ersten zwei Zeilen (`add` und `delete`) sorgen dafür, dass sich die Datei beliebig oft neu laden lässt.
- Die Regeln stehen in einer **eigenen Tabelle** (`lokal`), deshalb stören sie `ufw` und Fail2ban nicht. Die
  Standarddatei `/etc/nftables.conf` mit dem Dienst `nftables.service` verwendest du **nicht**. Sie beginnt
  mit `flush ruleset` und würde die Tabellen von `ufw` und Fail2ban löschen.
- Bei Port 5000 steht `__ADMIN_USER__` bewusst **nicht**. Die Ersteinrichtung von LNbits per Tunnel ist
  erledigt, danach erreichst du LNbits nur noch über Caddy. Brauchst du später wieder einen Tunnel zu LNbits,
  trage `"__ADMIN_USER__"` in diese Zeile ein und lade die Regeln neu (`sudo systemctl reload nft-lokal`).

## Beim Booten laden

Damit die Regeln nach jedem Neustart wieder geladen werden, legst du einen eigenen systemd-Dienst an:

```bash
sudo nano /etc/systemd/system/nft-lokal.service
```

```ini title="/etc/systemd/system/nft-lokal.service"
[Unit]
Description=Lokale Port-Regeln pro Benutzer
After=network.target ufw.service
Before=phoenixd.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/nft -f /etc/nftables-lokal.conf
ExecReload=/usr/sbin/nft -f /etc/nftables-lokal.conf

[Install]
WantedBy=multi-user.target
```

`Type=oneshot` heißt: Der Dienst lädt die Regeln einmal und ist danach fertig. `RemainAfterExit=yes` lässt ihn
danach als „aktiv" gelten. `Before=phoenixd.service` sorgt dafür, dass die Regeln stehen, bevor die ersten
Dienste starten. Mit `reload` lädst du die Datei nach einer Änderung neu (`ExecReload`).

Erst die Datei prüfen. Keine Ausgabe heißt in Ordnung. Ein Fehler wie `Could not resolve user` bedeutet, dass
ein Benutzer (zum Beispiel `caddy`) noch nicht existiert:

```bash
sudo nft -c -f /etc/nftables-lokal.conf
```

Dann den Dienst anlegen und starten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nft-lokal
```

Regeln anzeigen. Es müssen die vier Zeilen zu sehen sein:

```bash
sudo nft list table inet lokal
```

## Prüfen

Mit `ulnbits` als Probe. `-m 3` bricht nach 3 Sekunden ab:

```bash
sudo -u ulnbits curl -s -m 3 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9740/getinfo
```

Das muss **scheitern**: Verbindung abgelehnt, Ausgabe `000`.

```bash
sudo -u ualbyhub curl -s -m 3 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9740/getinfo
```

Das muss **antworten**: `401` (verbunden, aber ohne Passwort).

Dann öffnest du den Tunnel neu und rufst `http://localhost:8029` auf. Alby Hub muss laden. Lädt es nicht
mehr, kommt die Tunnel-Verbindung nicht als `__ADMIN_USER__` an. Zum Schluss sendest du aus LNbits noch
einmal 100 Sats, um die NWC-Kette zu prüfen.

:::note[Grenze der Regel]
Die Regel schützt nur Verbindungen über `localhost`. Als `root` (also bei einer Übernahme von `root`) hilft
sie nicht. Läuft ein Dienst nach der Regel nicht mehr, prüfe mit `sudo journalctl -u <dienst> -n 50`, ob eine
Verbindung zu einem Port abgelehnt wird.
:::

Teil B ist damit fertig. Weiter mit dem [Neustart-Test](/betrieb/neustart-test/).
