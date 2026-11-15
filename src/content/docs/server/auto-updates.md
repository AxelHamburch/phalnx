---
title: Automatische Updates
description: Sicherheitsupdates von Ubuntu automatisch einspielen und den Server nachts bei Bedarf neu starten.
---

Ubuntu kann Sicherheitsupdates selbst einspielen. Das schließt bekannte Lücken, ohne dass du daran denken
musst. Die Dienste, die du selbst installierst (phoenixd, Alby Hub, LNbits, Relay), aktualisieren sich nicht
von allein. Dafür gibt es das Kapitel [Updates durchführen](/operations/updates/).

## Einschalten

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

Antworte mit **Yes**. Dann öffnest du die Einstellungen:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Prüfe, dass diese Zeile **nicht** auskommentiert ist (kein `//` davor):

```text
"${distro_id}:${distro_codename}-security";
```

## Feste Zeiten für Updates und Neustart

Standardmäßig spielt Ubuntu Updates **zu einer zufälligen Zeit** ein, oft gegen 06:00 mit einer
Zufallsverzögerung von bis zu einer Stunde. Muss ein Dienst wie LNbits danach neu starten, passiert das zu einer
krummen Zeit wie 06:36, und du weißt nicht, wer den Neustart ausgelöst hat. Deshalb legst du alles auf feste
Zeiten:

| Uhrzeit | Was passiert |
|---|---|
| `__UPDATE_TIME__` | Ubuntu spielt Updates ein, ohne Zufallsverzögerung. |
| `__REBOOT_TIME__` | Falls ein Neustart nötig ist (zum Beispiel nach einem Kernel-Update), startet der Server neu. |

Ein Neustart zu **dieser** Zeit stammt also immer von den automatischen Updates. Ein Neustart zu einer anderen
Zeit kam von dir, vom Anbieter oder von einem Absturz.

**1. Updates auf eine feste Zeit legen, ohne Zufallsverzögerung:**

```bash
sudo systemctl edit apt-daily-upgrade.timer
```

Trage dort ein. Die leere Zeile `OnCalendar=` ist wichtig, sie löscht den Standardwert:

```ini
[Timer]
OnCalendar=
OnCalendar=*-*-* __UPDATE_TIME__
RandomizedDelaySec=0
```

Speichere (Strg+X, Y, Enter) und prüfe:

```bash
systemctl list-timers apt-daily-upgrade.timer
```

In der Spalte `NEXT` muss die Zeit `__UPDATE_TIME__` stehen.

**2. Automatische Dienst-Neustarts durch `needrestart` abschalten.** Nach Updates (zum Beispiel an der
`libc`) startet `needrestart` sonst Dienste wie LNbits sofort neu, mitten in der Updatezeit:

```bash
sudo mkdir -p /etc/needrestart/conf.d
echo '$nrconf{restart} = "l";' | sudo tee /etc/needrestart/conf.d/99-no-autorestart.conf
```

`"l"` heißt: nur auflisten, nichts neu starten. Die Dienste laufen weiter. Der Neustart um `__REBOOT_TIME__` sorgt
später für den Neustart mit den neuen Bibliotheken.

**3. Den Neustart auf eine feste Zeit legen.** Öffne die Datei wieder in `nano`:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Gehe mit Strg+End ans Dateiende und füge **in `nano`** (nicht im Terminal) diese zwei Zeilen ein:

```text
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "__REBOOT_TIME__";
```

Speichere (Strg+X, Y, Enter). Der Server startet nur neu, wenn ein Update es verlangt (die Datei `/var/run/reboot-required` existiert). Gibt es
nichts zu tun, bleibt er an.

### Wann hat der Server zuletzt neu gestartet?

```bash
last -x reboot shutdown | head
```

Steht dort ein Neustart um `__REBOOT_TIME__`, kam er von den automatischen Updates. Das Protokoll der Updates
liegt unter `/var/log/unattended-upgrades/`.

### Wichtige und dringende Updates sofort einspielen

Die feste Zeit ist für den Normalfall. Gibt es eine **dringende Sicherheitslücke**, warte nicht bis zur Nacht,
sondern spiele das Update selbst ein, **zu einer Zeit, die dir passt**:

```bash
sudo apt update && sudo apt upgrade -y
```

Dann prüfst du, ob ein Neustart nötig ist:

```bash
ls /var/run/reboot-required
```

Kommt `No such file or directory`, ist **kein** Neustart nötig. Das ist der Normalfall. Gibt es die Datei, starte neu:

```bash
sudo reboot
```

Nach dem Neustart ist die Datei weg, und der Neustart um `__REBOOT_TIME__` entfällt in dieser Nacht. Danach prüfst
du wie im [Neustart-Test](/operations/reboot-test/), ob alles wieder läuft.

Der Server kann auch aus anderen Gründen neu starten (Wartung des Anbieters, Absturz). Deshalb muss **nach
jedem Neustart alles von allein wieder laufen**. Dafür sind drei Dinge nötig, die du in den nächsten
Kapiteln einrichtest:

- Alle Dienste sind mit `systemctl enable` aktiviert.
- Alby Hub startet nach phoenixd und dem Relay (`After=` und `Wants=`).
- Alby Hub entsperrt sich selbst (Auto-Unlock, siehe [Alby Hub](/services/albyhub/#auto-unlock)).

Wer Auto-Unlock nicht nutzen will, setzt `Automatic-Reboot "false"` und startet nach Updates selbst neu,
wenn er Zeit hat.

## Prüfen

Der Probelauf installiert nichts, zeigt aber, ob die Einstellung funktioniert. Ein Tippfehler fällt sonst erst
auf, wenn schon monatelang keine Sicherheitsupdates eingespielt wurden:

```bash
sudo unattended-upgrade --dry-run --debug 2>&1 | tail -5
```

In Ordnung ist eine Zeile wie `No packages found that can be upgraded unattended ...`. Der Rest der
Ausgabe ist egal. Bei `Traceback` oder `Error` prüfst du die Datei `50unattended-upgrades` auf Tippfehler.

Weiter mit den [Dienst-Benutzern](/server/service-users/).
