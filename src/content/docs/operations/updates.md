---
title: Updates durchführen
description: Versionen prüfen und die Bausteine aktualisieren, die nicht automatisch aktualisiert werden. Mit Sicherung, Rückweg und Test nach jedem Schritt.
---

Ubuntu aktualisiert sich selbst (siehe [Automatische Updates](/server/auto-updates/)). **phoenixd, Alby Hub,
LNbits und der Relay nicht.** Sie hast du von Hand installiert, also aktualisierst du sie auch von Hand. Dieses
Kapitel zeigt für jeden Baustein, wie du die installierte Version prüfst, die neueste findest und aktualisierst.

:::caution[Grundregeln für jedes Update]
1. **Release-Hinweise lesen**, bevor du aktualisierst. Besonders bei neuen Hauptversionen.
2. **Ein Baustein nach dem anderen.** Teste nach jedem Update eine kleine Zahlung, bevor du den nächsten
   angehst.
3. **Vorher sichern** (Datenverzeichnis kopieren) und den alten Stand aufheben, damit du zurückgehen kannst.
4. **Nicht mitten in einer Zahlung** aktualisieren und nicht, wenn gerade ein Kanal Aktivität hat.
:::

## Übersicht

| Baustein | Installierte Version | Neueste Version | Updatet sich selbst |
|---|---|---|---|
| Ubuntu und Pakete | `apt list --upgradable` | `sudo apt update` | ja (Sicherheitsupdates) |
| Caddy | `caddy version` | `apt policy caddy`, [Release-Seite](https://github.com/caddyserver/caddy/releases) | nein, über `apt` |
| Fail2ban | `fail2ban-client --version` | `apt policy fail2ban` | nein, über `apt` |
| phoenixd | siehe unten | [Release-Seite](https://github.com/ACINQ/phoenixd/releases) | nein |
| Alby Hub | siehe unten | [Release-Seite](https://github.com/getAlby/hub/releases) | nein |
| Relay (strfry) | siehe unten | [Tags-Seite](https://github.com/hoytech/strfry/tags) | nein |
| LNbits | siehe unten | [Release-Seite](https://github.com/lnbits/lnbits/releases) | nein |

## Neueste Version nachsehen

Prüfe **vor jedem Update**, ob es überhaupt eine neuere Version gibt. Dann sparst du dir den Aufwand. Dieser
Block fragt alle Bausteine auf einmal ab. Kopiere ihn und füge ihn auf dem Server ein:

```bash
echo "== phoenixd =="
curl -s https://api.github.com/repos/ACINQ/phoenixd/releases/latest | grep '"tag_name"'
echo "== Alby Hub =="
curl -s https://api.github.com/repos/getAlby/hub/releases/latest | grep '"tag_name"'
echo "== LNbits =="
curl -s https://api.github.com/repos/lnbits/lnbits/releases/latest | grep '"tag_name"'
echo "== Relay (strfry) =="
git ls-remote --tags --sort=-v:refname https://github.com/hoytech/strfry.git | head -3
echo "== Caddy =="
apt-cache policy caddy | grep -E "Installed|Candidate"
```

Unter jeder Überschrift steht die neueste Version. Bei phoenixd, Alby Hub und LNbits ist es die Zeile
`"tag_name"`, bei strfry die oberste Zeile (`refs/tags/1.1.3` heißt Version 1.1.3, Tags mit `beta` sind
Vorabversionen). Bei Caddy vergleichst du `Installed` mit `Candidate`. strfry veröffentlicht keine Releases,
nur Tags. Darum fragt der Befehl dort die Tags ab.

Die installierte Version zeigt der Befehl beim jeweiligen Baustein weiter unten. Die neueste Version siehst du
auch im Browser:

- phoenixd: [github.com/ACINQ/phoenixd/releases](https://github.com/ACINQ/phoenixd/releases)
- Alby Hub: [github.com/getAlby/hub/releases](https://github.com/getAlby/hub/releases)
- LNbits: [github.com/lnbits/lnbits/releases](https://github.com/lnbits/lnbits/releases)
- Relay (strfry): [github.com/hoytech/strfry/tags](https://github.com/hoytech/strfry/tags)
- Caddy: [github.com/caddyserver/caddy/releases](https://github.com/caddyserver/caddy/releases)

Bei Caddy ist `Candidate` maßgeblich, denn das ist die Version, die `apt` wirklich installiert. Auf der Release-Seite
erscheint eine neue Version oft ein paar Tage früher als im Paketarchiv.

## Ubuntu und die Pakete

Die Sicherheitsupdates und der Neustart laufen **automatisch**, siehe
[Automatische Updates](/server/auto-updates/). Von Hand brauchst du das nur, um **schnell** zu reagieren, zum
Beispiel bei einem dringenden Sicherheitsupdate. Ein Befehl macht alles:

```bash
sudo apt update && apt list --upgradable && sudo apt upgrade
```

Ist danach ein Neustart nötig (`*** System restart required ***` bei der Anmeldung), startest du den Server zu
einem passenden Zeitpunkt neu:

```bash
sudo reboot
```

Nach dem Neustart gilt wie immer: Alle Dienste müssen von allein laufen, siehe [Neustart-Test](/operations/reboot-test/).

**Arbeitet die Automatik?** Zeige an, wann zuletzt Pakete aktualisiert wurden und wann der Server zuletzt
neu gestartet ist:

```bash
grep -E "^Start-Date" /var/log/apt/history.log | tail -n 3; last -x reboot | head -n 3
```

Die erste Ausgabe zeigt die letzten Update-Läufe, die zweite die letzten Neustarts. Beides sollte zu den Zeiten
aus [Automatische Updates](/server/auto-updates/) passen. Liegt der letzte Update-Lauf Wochen zurück, arbeitet
die Automatik nicht richtig.

## Caddy

```bash
caddy version
```

Prüfe, ob es eine neuere Version gibt. Die Zeile „Candidate" zeigt die verfügbare Version:

```bash
sudo apt update && apt policy caddy
```

Ist „Installed" gleich „Candidate", bist du aktuell. Sonst:

```bash
sudo apt install --only-upgrade caddy
```

Danach prüfst du die Seite im Browser und `sudo systemctl status caddy --no-pager`. Das Caddyfile bleibt
erhalten.

## phoenixd

phoenixd hält den Seed und den Kanal. Aktualisiere es mit besonderer Sorgfalt.

**Version prüfen:**

```bash
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli getinfo
```

Die neueste Version steht auf der [Release-Seite](https://github.com/ACINQ/phoenixd/releases). Die Ausgabe enthält die Version (`version`, die Zahl vor dem Strich ist die Release-Version) und wichtige Daten
zu deinem Kanal:

```json
{
    "nodeId": "03aa…(Node-ID)",
    "channels": [
        {
            "state": "Normal",
            "channelId": "f80b…(Kanal-ID)",
            "balanceSat": 10000,
            "inboundLiquiditySat": 2000000,
            "capacitySat": 2010000,
            "fundingTxId": "a6c7…(Transaktions-ID)"
        }
    ],
    "chain": "mainnet",
    "blockHeight": 900000,
    "version": "0.9.3-66420de"
}
```

Die Werte hier sind Beispiele.

- `version`: die installierte phoenixd-Version. Vergleiche die Zahl vor dem Strich mit der Release-Seite.
- `state`: `Normal` heißt, der Kanal ist offen und funktioniert.
- `balanceSat`: dein Guthaben im Kanal, also das, was du ausgeben kannst.
- `inboundLiquiditySat`: wie viel du noch empfangen kannst.
- `capacitySat`: die Gesamtgröße des Kanals.
- `blockHeight`: der Stand der Bitcoin-Blockchain, den phoenixd kennt.

**Aktualisieren:**

```bash
sudo systemctl stop phoenixd
```

```bash
sudo -u uphoenixd -H bash -c 'cd ~ && exec bash'
```

In der Shell von `uphoenixd`. Trage die neue Version unter **Meine Werte** ein:

```bash
cd ~
VERSION=__VERSION_PHOENIXD__
wget https://github.com/ACINQ/phoenixd/releases/download/v$VERSION/phoenixd-$VERSION-linux-x64.zip
wget https://github.com/ACINQ/phoenixd/releases/download/v$VERSION/SHA256SUMS.asc
sha256sum -c --ignore-missing SHA256SUMS.asc
```

Es muss `OK` erscheinen. Dann tauschst du die Programmdateien aus. Der Ordner mit Seed und Daten
(`~/.phoenix`) bleibt **unberührt**. Den alten Stand hebst du auf:

```bash
mv phoenixd phoenixd-alt
unzip phoenixd-$VERSION-linux-x64.zip
mv phoenixd-$VERSION-linux-x64 phoenixd
rm phoenixd-$VERSION-linux-x64.zip SHA256SUMS.asc
exit
```

```bash
sudo systemctl start phoenixd
```

**Prüfen:**

```bash
sudo systemctl status phoenixd --no-pager
sudo -u uphoenixd -H /home/uphoenixd/phoenixd/phoenix-cli getinfo
```

Dann sendest du eine kleine Zahlung. Läuft alles, löschst du `phoenixd-alt` nach einigen Tagen.

**Zurück zum alten Stand:** `sudo systemctl stop phoenixd`, dann als `uphoenixd` `rm -r phoenixd` und
`mv phoenixd-alt phoenixd`, danach `sudo systemctl start phoenixd`.

## Alby Hub

**Version prüfen:**

```bash
curl -s http://127.0.0.1:8029/api/info | grep -o '"version":"[^"]*"'
```

Die neueste Version steht auf der [Release-Seite](https://github.com/getAlby/hub/releases) Aktualisiere nur, wenn sie höher ist.

**Aktualisieren.** Erst Alby Hub stoppen und die Daten sichern:

```bash
sudo systemctl stop albyhub
```

```bash
sudo -u ualbyhub cp -a /home/ualbyhub/data /home/ualbyhub/data-backup
```

Die Sicherung enthält Geheimnisse. Sie bleibt auf dem Server im Home-Verzeichnis (`700`) und gehört
nicht in ein ungeschütztes Backup. Dann lädst du die neue Version:

```bash
sudo -u ualbyhub -H bash -c 'cd ~ && exec bash'
```

```bash
cd ~
wget https://github.com/getAlby/hub/releases/latest/download/albyhub-Server-Linux-x86_64.tar.bz2
mv albyhub albyhub-alt
mkdir albyhub
tar -xjf albyhub-Server-Linux-x86_64.tar.bz2 -C albyhub
rm albyhub-Server-Linux-x86_64.tar.bz2
ls albyhub
exit
```

`ls albyhub` muss `bin` und `lib` zeigen. Deine Daten (`~/data`) und `albyhub.env` bleiben unverändert.

```bash
sudo systemctl start albyhub
```

**Prüfen:**

```bash
sudo systemctl status albyhub --no-pager
```

Dort muss `active (running)` stehen. Fehler im Log zeigst du so an:

```bash
sudo journalctl -u albyhub --since "10 min ago" --no-pager | grep -iE "error|fatal|panic"
```

Es sollte **nichts** ausgegeben werden. Öffne danach Alby Hub über den Tunnel. Ohne Passwortabfrage (Auto-Unlock) und mit sichtbarem Saldo ist es in
Ordnung. Sende eine kleine Zahlung aus LNbits. Neue Versionen von Alby Hub können die Datenbank umstellen.
Deshalb ist die Sicherung vorher wichtig.

**Zurück zum alten Stand:** `sudo systemctl stop albyhub`, dann `albyhub` löschen, `albyhub-alt` zurück in
`albyhub` umbenennen und die Sicherung zurückspielen, falls die Datenbank sich verändert hat.

## Relay (strfry)

**Version prüfen:**

```bash
sudo -u urelay git -C /home/urelay/strfry describe --tags
```

Prüfe vorher auf der [Tags-Seite von strfry](https://github.com/hoytech/strfry/tags), ob es eine neuere Version
gibt. Das Update lohnt sich nur, wenn dort eine höhere Nummer steht als die installierte.

:::note[Das dauert]
Das Übersetzen von strfry (`make`) braucht **einige Minuten**, auf einem kleinen Server auch länger. Warte, bis
die Eingabeaufforderung zurückkommt, und brich nicht ab.
:::

**Aktualisieren.** Der Relay speichert nichts Wichtiges. Verbindungen laufen kurz weg:

```bash
sudo -u urelay -H bash -c 'cd ~/strfry && exec bash'
```

```bash
git fetch --tags
git checkout $(git describe --tags $(git rev-list --tags --max-count=1))
git submodule update --init
make -j1
ls -la strfry
exit
```

`make -j1` braucht den Swap aus dem Kapitel [Swap und Tastaturlayout](/server/swap-keyboard/). Dann startest du
den Relay neu:

```bash
sudo systemctl restart relay
```

**Prüfen:**

```bash
sudo ss -tlnp | grep 7777
sudo ss -tnp | grep 7777
```

Es müssen `127.0.0.1:7777` und eine `ESTAB`-Verbindung zu `albyhub` erscheinen. Starte Alby Hub und LNbits
notfalls neu, damit sie sich wieder verbinden.

## LNbits

**Version prüfen:**

```bash
sudo -u ulnbits git -C /home/ulnbits/lnbits describe --tags
```

Die Version zeigt auch die Admin-Oberfläche von LNbits. Die neueste Version steht auf der
[Release-Seite](https://github.com/lnbits/lnbits/releases).

**Aktualisieren.** Erst die Daten sichern:

```bash
sudo systemctl stop lnbits
```

```bash
sudo -u ulnbits cp -a /home/ulnbits/lnbits/data /home/ulnbits/lnbits/data-backup
```

Die Sicherung enthält Geheimnisse und bleibt auf dem Server. Dann:

```bash
sudo -u ulnbits -H bash -c 'cd ~/lnbits && exec bash'
```

Das holt die neueste fertige Version (ohne Vorabversionen):

```bash
git fetch --tags
git checkout $(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
~/.local/bin/uv sync --all-extras
exit
```

Willst du eine **bestimmte** Version, ersetze die `git checkout`-Zeile durch `git checkout v1.7.1` (deine
Versionsnummer mit `v` davor).

```bash
sudo systemctl start lnbits
```

**Prüfen:**

```bash
sudo journalctl -u lnbits -n 50 --no-pager
sudo journalctl -u lnbits -n 50 --no-pager | grep -i nwc
```

Die zweite Zeile zeigt, ob die Finanzierungsquelle (NWC) läuft. Zum Beobachten gibt es zwei weitere Befehle.
Laufend mitlesen, beginnend mit den Ereignissen der letzten zwei Stunden (beenden mit **Strg+C**):

```bash
sudo journalctl -u lnbits -f --since "2 hour ago"
```

Einen bestimmten Zeitraum ansehen (das Datum ist ein Beispiel, setze deinen Zeitraum ein):

```bash
sudo journalctl -u lnbits --since "2026-11-14 05:00:00" --until "2026-11-14 08:00:00"
```

Öffne LNbits und sende 100 Sats. Prüfe außerdem, ob deine **Erweiterungen** noch funktionieren, denn sie
müssen zur Version passen.

### Erweiterungen nach einem Update

LNbits aktualisiert installierte Erweiterungen von selbst, beim Start und standardmäßig alle 24 Stunden. Lädt LNbits dabei im laufenden Betrieb neue Dateien, bleibt die Adresse der Oberfläche gleich (LNbits hängt nur die Startzeit des Servers an). Der Browser kann dann weiter die **alte** Datei zusammen mit der neuen Seite benutzen (aus einem noch offenen Tab oder seinem Zwischenspeicher). LNbits schickt für diese Dateien keine Angaben zur Gültigkeit mit, deshalb ist das nicht sicher, aber nach einer Neuinstallation derselben Version ist es wahrscheinlich. Das zeigt sich zum Beispiel als eingefrorene Seite oder als Fehler wie `… is not a function` in der Browser-Konsole (`F12`).

Das behebst du so:

1. LNbits neu starten: `sudo systemctl restart lnbits` oder im Admin-Bereich **Server neu starten**.
2. Die Seite einmal **hart neu laden** (`Strg+Umschalt+R`).

Die Einstellungen dazu stehen im Admin-Bereich unter **Settings → Extensions**: **Update extensions on startup** und **Extension update interval (hours)**. Bei `0` gibt es keine zeitgesteuerten Updates mehr, nur noch beim Start.

**Zurück zum alten Stand:** `sudo systemctl stop lnbits`, als `ulnbits` im Ordner `lnbits` mit
`git checkout v<alte Version>` zurückgehen, `uv sync --all-extras` ausführen und die Sicherung zurückspielen,
falls sich die Datenbank verändert hat.

## Sicherungen nach dem Update aufräumen

Beim Update bleiben alte Programmstände (`phoenixd-alt`, `albyhub-alt`) und Kopien der Daten
(`data-backup`) liegen. Sie enthalten dieselben Geheimnisse wie die Originale. Wenn alles ein paar Tage sicher
läuft und du **nicht mehr zurück** willst, löschst du sie. Zeige erst an, was vorhanden ist:

```bash
sudo ls -d /home/uphoenixd/phoenixd-alt /home/ualbyhub/albyhub-alt /home/ualbyhub/data-backup /home/ulnbits/lnbits/data-backup
```

Nicht vorhandene Ordner meldet `ls` als Fehler. Das ist in Ordnung, sie hast du bei diesem Update nicht
angelegt. Dann löschst du alles auf einmal:

```bash
sudo rm -rf /home/uphoenixd/phoenixd-alt
sudo rm -rf /home/ualbyhub/albyhub-alt
sudo rm -rf /home/ualbyhub/data-backup
sudo rm -rf /home/ulnbits/lnbits/data-backup
```

:::caution[Nicht zu früh löschen]
Danach gibt es **keinen Rückweg** auf den alten Stand mehr. Lösche erst, wenn die Prüfung des Updates bestanden ist
und der Dienst einige Tage fehlerfrei läuft. Der Ordner `~/.phoenix` mit dem Seed gehört **nicht** dazu und
bleibt unberührt. Die Befehle löschen nur die genannten Ordner.
:::

## Wann wie oft

| Was | Wie oft |
|---|---|
| Ubuntu-Pakete | automatisch. Von Hand nur, wenn es eilt, und gelegentlich die Kontrolle, ob die Automatik läuft |
| Caddy und Fail2ban | mit den Ubuntu-Paketen |
| phoenixd, Alby Hub, LNbits, Relay | bei jeder neuen Version mit Sicherheitsrelevanz, sonst alle paar Wochen. Folge den Release-Seiten. |

Nach größeren Änderungen wiederholst du die [Prüfliste](/operations/checklist/).
