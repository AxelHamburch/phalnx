---
title: Swap und Tastaturlayout
description: Eine Swap-Datei als Sicherheitsnetz für wenig Arbeitsspeicher und das richtige Tastaturlayout für die Web-Konsole.
---

## Swap-Datei anlegen

Ein kleiner VPS hat oft nur 2 GB Arbeitsspeicher und keinen Swap. Wird der Speicher knapp, beendet das System
dann Programme. Zum Beispiel bricht das Bauen des Relays später mit
`g++: fatal error: Killed signal terminated program cc1plus` ab. Deshalb legst du jetzt eine Swap-Datei an:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Damit sie nach einem Neustart wieder da ist:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Der Server soll den Swap nur im Notfall benutzen, nicht regelmäßig:

```bash
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
```

```bash
sudo sysctl --system
```

:::note
`chmod 600` ist wichtig. Im Swap können Reste von Speicherinhalten (zum Beispiel Passwörter) landen. Nur
`root` darf die Datei lesen.
:::

### Prüfen

```bash
free -h
```

Bei `Swap` muss `2,0Gi` stehen. Mit `tail -2 /etc/fstab` siehst du, dass die Zeile für `/swapfile` genau
einmal am Ende steht.

### Wenn es nicht klappt

- `fallocate: Text file busy` und `swapon: Device or resource busy`: Die Datei ist schon als Swap aktiv.
  Du musst die Befehle zum Anlegen nicht noch einmal ausführen.
- `Permission denied` bei `>> /etc/fstab`: Die Umleitung `>>` läuft nicht mit `sudo`. Nutze die Form mit
  `| sudo tee -a`, wie oben.

## Tastaturlayout für die Web-Konsole

Die Web-Konsole deines Anbieters (Notzugang) nutzt das Layout des Servers, und das ist standardmäßig
**US**. Dann sind `z` und `y` vertauscht, und Sonderzeichen liegen an anderen Stellen. Das merkst du erst im
Notfall, wenn du dich nicht anmelden kannst. Deshalb stellst du es jetzt auf das Layout deines Landes
(`__KEYBOARD__`) ein:

```bash
sudo sed -i 's/^XKBLAYOUT=.*/XKBLAYOUT="__KEYBOARD__"/' /etc/default/keyboard
cat /etc/default/keyboard
```

In der Ausgabe muss `XKBLAYOUT="__KEYBOARD__"` stehen. Dann übernimmst du es:

```bash
sudo setupcon --save
```

Im Kundenbereich des Anbieters gibt es oft zusätzlich ein Layout für die Konsole. Es sollte zum Layout auf
dem Server passen.

:::caution[Passwort in der Web-Konsole von Hand tippen]
Beim **Einfügen** über die Web-Konsole gehen Tasten verloren oder werden verändert. Zum Beispiel wird aus
`/` eine `7`, weil die Umschalt-Taste fehlt. Das Passwort kommt dann falsch an, und du bekommst
„Login incorrect". Tippe Benutzername und Passwort immer Zeichen für Zeichen auf der Tastatur.
:::

### Hinweis zu `localectl`

`localectl set-keymap` funktioniert unter Ubuntu **nicht** („Setting X11 and console keymaps is not
supported in Debian"). Der Weg über `/etc/default/keyboard` ist der richtige.

Weiter mit dem [Admin-Benutzer](/server/admin-user/).
