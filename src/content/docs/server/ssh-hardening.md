---
title: SSH härten und Firewall
description: SSH nur mit Schlüssel, ohne Root, auf einem eigenen Port, und die Firewall mit den drei nötigen Ports.
---

Jetzt wird SSH eng gestellt: nur Schlüssel, kein Passwort, kein Root, ein eigener Port, ein erlaubter
Benutzer. Dazu kommt die Firewall.

Alle Befehle als `__ADMIN_USER__` auf dem Server. Das Fenster mit der Root-Sitzung bleibt offen, bis alle
Tests bestanden sind.

## Die Konfiguration anlegen

Statt `sshd_config` zu ändern, legst du eine eigene Datei an. Der Name beginnt mit `00-`, weil bei SSH der
**zuerst gelesene** Wert gilt. Cloud-Images bringen oft eine Datei `50-cloud-init.conf` mit
`PasswordAuthentication yes` mit, die sonst gewinnen würde.

```bash
sudo nano /etc/ssh/sshd_config.d/00-hardening.conf
```

```ini
Port __SSH_PORT__
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
AllowUsers __ADMIN_USER__
MaxAuthTries 3
LoginGraceTime 30
MaxSessions 3
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
```

- `AllowUsers` sorgt dafür, dass `uphoenixd`, `ualbyhub` und alle anderen sich **nie** per SSH anmelden
  können.
- `AllowTcpForwarding no` verhindert SSH-Tunnel. Für den Zugang zu Alby Hub erlaubst du später gezielt einen
  (Kapitel [SSH-Tunnel](/services/tunnel/)).

## Firewall öffnen, bevor SSH den Port wechselt

Sonst sperrst du dich aus:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow __SSH_PORT__/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP (Caddy)'
sudo ufw allow 443/tcp comment 'HTTPS (Caddy)'
```

```bash
sudo ufw enable
```

Bestätige mit `y`. Die laufende SSH-Sitzung bleibt bestehen. Danach:

```bash
sudo ufw status verbose
```

## Konfiguration prüfen

```bash
sudo sshd -t
```

Keine Ausgabe heißt in Ordnung. Dann siehst du, was SSH tatsächlich benutzen würde:

```bash
sudo sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|allowusers|authenticationmethods) '
```

## SSH neu starten (Ubuntu 24.04)

Unter Ubuntu 24.04 wird SSH über `ssh.socket` gestartet, und der Socket legt den Port fest. Ein `Port` in
der Konfiguration reicht dann nicht. Deshalb schaltest du den Socket ab:

```bash
sudo systemctl disable --now ssh.socket
sudo systemctl enable --now ssh.service
sudo systemctl restart ssh
```

Kontrolle, auf welchem Port SSH lauscht:

```bash
sudo ss -tlnp | grep sshd
```

Es muss `:__SSH_PORT__` erscheinen, nicht `:22`.

## Tests (neues Fenster, altes offen lassen)

Auf dem PC:

```powershell
ssh -p __SSH_PORT__ -i $HOME\.ssh\__SSH_KEY__ __ADMIN_USER__@__SERVER_IP__
```

Das **muss gehen**. Die beiden nächsten müssen **scheitern**:

```powershell
ssh -p __SSH_PORT__ root@__SERVER_IP__
```

Erwartet: `Permission denied (publickey)`.

```powershell
ssh -p __SSH_PORT__ -o PubkeyAuthentication=no __ADMIN_USER__@__SERVER_IP__
```

Erwartet: scheitert, es erscheint **kein** Passwortfeld.

Erst wenn alle drei Tests wie erwartet ausgehen, schließt du die Root-Sitzung.

## Praktisch: Kurzname auf dem PC

Damit du nicht jedes Mal Port, Benutzer und Schlüssel tippen musst, legst du auf dem PC einen Eintrag in
`C:\Users\<du>\.ssh\config` an. Die Datei hat keine Endung. Existiert sie nicht, legst du sie an:

```powershell
if (-not (Test-Path $HOME\.ssh\config)) { New-Item -ItemType File $HOME\.ssh\config -Force }
notepad $HOME\.ssh\config
```

```text
Host __HOSTNAME__
    HostName __SERVER_IP__
    Port __SSH_PORT__
    User __ADMIN_USER__
    IdentityFile ~/.ssh/__SSH_KEY__
```

Danach genügt:

```powershell
ssh __HOSTNAME__
```

## Notfall: ausgesperrt

Hast du dich ausgesperrt, öffnest du die **Web-Konsole** des Anbieters und meldest dich als
`__ADMIN_USER__` mit Passwort an (die Konsole läuft nicht über SSH). Korrigiere
`/etc/ssh/sshd_config.d/00-hardening.conf` und starte SSH neu:

```bash
sudo systemctl restart ssh
```

Weitere Hinweise stehen im Kapitel [Notfall und Fehlersuche](/operations/emergency/).

Weiter mit [Fail2ban für SSH](/server/fail2ban-ssh/).
