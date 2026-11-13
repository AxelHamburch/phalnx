---
title: SSH-Schlüssel
description: Einen SSH-Schlüssel mit Passphrase auf dem PC erzeugen und auf dem Server hinterlegen.
---

Statt eines Passworts meldest du dich mit einem **Schlüsselpaar** an. Der private Teil bleibt auf deinem PC,
der öffentliche liegt auf dem Server.

## Schlüssel erzeugen (auf dem PC)

Im Terminal deines PCs (unter Windows PowerShell), **nicht** auf dem Server:

```powershell
ssh-keygen -t ed25519 -C "__HOSTNAME__-admin" -f $HOME\.ssh\__SSH_KEY__
```

- Bei **„Enter passphrase"** vergibst du unbedingt eine **starke** Passphrase. Ohne sie reicht der Diebstahl der
  Datei zur Anmeldung. Stark heißt: mindestens 16 Zeichen, lang statt kompliziert (zum Beispiel vier bis
  fünf zufällige Wörter oder ein vom Passwortmanager erzeugter Wert), nirgends sonst verwendet und nicht
  aus Namen, Daten oder Sprüchen gebaut. Lege sie im Passwortmanager ab.
- Es entstehen `__SSH_KEY__` (**privat, niemals weitergeben**) und `__SSH_KEY__.pub` (öffentlich).
- Sichere `__SSH_KEY__` zusätzlich offline, zum Beispiel auf einem verschlüsselten USB-Stick. Ohne die Datei
  und ohne Web-Konsole kommst du nicht mehr auf den Server.

## Zweiten Schlüssel als Reserve anlegen

Erzeuge denselben Schlüssel zusätzlich auf einem **zweiten Gerät**, zum Beispiel auf dem Heim-PC und auf dem
Laptop. Jedes Gerät bekommt sein **eigenes** Schlüsselpaar, du kopierst keinen privaten Schlüssel von einem
Gerät auf das andere. Auf dem Server trägst du beide öffentlichen Schlüssel ein, **eine Zeile pro Schlüssel**
in `authorized_keys`. Fällt ein Gerät aus oder geht verloren, kommst du mit dem anderen weiter auf den
Server und verlierst nie den Zugriff. Bei einem verlorenen Gerät löschst du dessen Zeile.

Das machst du am besten gleich im nächsten Abschnitt: Wiederhole dort die Schritte für jeden Schlüssel.

## Öffentlichen Schlüssel auf den Server bringen

Zuerst auf dem **PC** anzeigen und die eine Zeile kopieren:

```powershell
Get-Content $HOME\.ssh\__SSH_KEY__.pub
```

Dann auf dem **Server als `root`**:

```bash
install -d -m 700 -o __ADMIN_USER__ -g __ADMIN_USER__ /home/__ADMIN_USER__/.ssh
nano /home/__ADMIN_USER__/.ssh/authorized_keys
```

In `nano` fügst du die eine Zeile aus `__SSH_KEY__.pub` ein (jeden weiteren Schlüssel als **eigene Zeile** darunter) und speicherst. Danach die Rechte setzen:

```bash
chown __ADMIN_USER__:__ADMIN_USER__ /home/__ADMIN_USER__/.ssh/authorized_keys
chmod 600 /home/__ADMIN_USER__/.ssh/authorized_keys
```

## Prüfen

Öffne ein **neues** Terminal-Fenster und lass das Fenster mit der Root-Sitzung offen:

```powershell
ssh -i $HOME\.ssh\__SSH_KEY__ __ADMIN_USER__@__SERVER_IP__
```

Auf dem Server dann:

```bash
sudo whoami
```

Die Ausgabe muss `root` sein. Erst wenn das klappt, machst du weiter. Härtest du SSH, bevor der Schlüssel
funktioniert, sperrst du dich aus.

### Wenn es nicht klappt

- **Es kommt eine Passwortabfrage statt der Passphrase:** Der Schlüssel liegt nicht richtig in
  `authorized_keys`. Prüfe, dass dort **eine** Zeile steht, die mit `ssh-ed25519` beginnt, und dass die
  Rechte `700` für `.ssh` und `600` für die Datei stimmen.
- **`Permission denied (publickey)`:** Falscher Dateiname oder falsche Datei. Der Befehl muss mit `-i` auf die
  **private** Datei (ohne `.pub`) zeigen.

Weiter mit [SSH härten und Firewall](/server/ssh-hardening/).
