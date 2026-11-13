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

| Baustein | Version prüfen | Neueste Version | Updatet sich selbst |
|---|---|---|---|
| Ubuntu und Pakete | `apt list --upgradable` | `sudo apt update` | ja (Sicherheitsupdates) |
| Caddy | `caddy version` | `apt` | nein, über `apt` |
| Fail2ban | `fail2ban-client --version` | `apt` | nein, über `apt` |
| phoenixd | siehe unten | [Release-Seite](https://github.com/ACINQ/phoenixd/releases) | nein |
| Alby Hub | siehe unten | [Release-Seite](https://github.com/getAlby/hub/releases) | nein |
| Relay (strfry) | siehe unten | [Release-Seite](https://github.com/hoytech/strfry/releases) | nein |
| LNbits | siehe unten | [Release-Seite](https://github.com/lnbits/lnbits/releases) | nein |

Die neueste Version liest du auch auf dem Server ab. Das gilt für jeden Baustein, nur der Name ändert sich:

```bash
curl -s https://api.github.com/repos/ACINQ/phoenixd/releases/latest | grep '"tag_name"'
```

Ersetze `ACINQ/phoenixd` durch `getAlby/hub`, `hoytech/strfry` oder `lnbits/lnbits`.

## Ubuntu und die Pakete

Wöchentlich und von Hand:

```bash
sudo apt update
```

```bash
apt list --upgradable
```

```bash
sudo apt upgrade
```

Ist danach ein Neustart nötig (`*** System restart required ***` bei der Anmeldung), startest du den Server zu
einem passenden Zeitpunkt neu:

```bash
sudo reboot
```

Nach dem Neustart gilt wie immer: Alle Dienste müssen von allein laufen, siehe [Neustart-Test](/operations/reboot-test/).

## Caddy

```bash
caddy version
```

```bash
sudo apt update
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

:::caution[Nicht getestet]
Ob `getinfo` die Version ausgibt, ist nicht geprüft. Steht sie dort nicht, siehst du sie am Namen des
Ordners, aus dem du installiert hast, oder in den Hinweisen zur Version, die du heruntergeladen hast.
:::

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
sudo journalctl -u albyhub -n 200 --no-pager | grep -v "handled API request"
```

Öffne danach Alby Hub über den Tunnel. Ohne Passwortabfrage (Auto-Unlock) und mit sichtbarem Saldo ist es in
Ordnung. Sende eine kleine Zahlung aus LNbits. Neue Versionen von Alby Hub können die Datenbank umstellen.
Deshalb ist die Sicherung vorher wichtig.

**Zurück zum alten Stand:** `sudo systemctl stop albyhub`, dann `albyhub` löschen, `albyhub-alt` zurück in
`albyhub` umbenennen und die Sicherung zurückspielen, falls die Datenbank sich verändert hat.

## Relay (strfry)

**Version prüfen:**

```bash
sudo -u urelay git -C /home/urelay/strfry describe --tags
```

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

Die Version zeigt auch die Admin-Oberfläche von LNbits.

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

Trage die neue Version unter **Meine Werte** ein:

```bash
git fetch --tags
git checkout v__VERSION_LNBITS__
~/.local/bin/uv sync --all-extras
exit
```

```bash
sudo systemctl start lnbits
```

**Prüfen:**

```bash
sudo journalctl -u lnbits -n 50 --no-pager
sudo journalctl -u lnbits -n 50 --no-pager | grep -i nwc
```

Öffne LNbits und sende 100 Sats. Prüfe außerdem, ob deine **Erweiterungen** noch funktionieren, denn sie
müssen zur Version passen.

**Zurück zum alten Stand:** `sudo systemctl stop lnbits`, als `ulnbits` im Ordner `lnbits` mit
`git checkout v<alte Version>` zurückgehen, `uv sync --all-extras` ausführen und die Sicherung zurückspielen,
falls sich die Datenbank verändert hat.

## Wann wie oft

| Was | Wie oft |
|---|---|
| Ubuntu-Pakete | wöchentlich (die Sicherheitsupdates laufen ohnehin automatisch) |
| Caddy und Fail2ban | mit den Ubuntu-Paketen |
| phoenixd, Alby Hub, LNbits, Relay | bei jeder neuen Version mit Sicherheitsrelevanz, sonst alle paar Wochen. Folge den Release-Seiten. |

Nach größeren Änderungen wiederholst du die [Prüfliste](/operations/checklist/).
