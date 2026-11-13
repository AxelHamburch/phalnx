---
title: SSH-Tunnel
description: Alby Hub und die Ersteinrichtung von LNbits über einen SSH-Tunnel erreichen, ohne einen Port zu öffnen.
---

## Was ein Tunnel ist

Alby Hub und LNbits sind von außen nicht erreichbar. Dein Browser auf dem PC kommt deshalb nicht direkt hin.
Ein SSH-Tunnel leitet einen Port deines PCs durch die bestehende SSH-Verbindung zum Server weiter:

```text
Browser → localhost:8029 (PC) ══ SSH-Verbindung ══> 127.0.0.1:8029 (Server) → Alby Hub
```

Für Alby Hub sieht es aus, als käme die Anfrage vom Server selbst. Der Datenverkehr ist durch SSH
verschlüsselt, und es muss kein Port geöffnet werden. Deshalb braucht Alby Hub, das Geld bewegen kann, keine
öffentliche Adresse.

## 1. Tunnel auf dem Server erlauben (einmalig)

In der SSH-Härtung steht `AllowTcpForwarding no`, das blockiert Tunnel. Du stellst es auf „nur lokal" und
erlaubst nur die Ziele Alby Hub und LNbits:

```bash
sudo nano /etc/ssh/sshd_config.d/00-hardening.conf
```

Die Zeile `AllowTcpForwarding no` ersetzt du durch:

```ini
AllowTcpForwarding local
PermitOpen 127.0.0.1:8029 127.0.0.1:5000
```

- `local` erlaubt nur Tunnel vom PC zum Server, keine in die andere Richtung.
- `PermitOpen` beschränkt die Ziele auf Alby Hub (8029) und LNbits (5000). Ein Tunnel zu anderen Ports wird
  abgelehnt.

```bash
sudo sshd -t && sudo systemctl restart ssh
```

`sshd -t` darf nichts ausgeben. Deine laufende Sitzung bleibt bestehen.

## 2. Tunnel öffnen (auf dem PC)

In einem **eigenen Fenster** (PowerShell oder Git Bash):

```bash
ssh -N -L 8029:127.0.0.1:8029 -L 5000:127.0.0.1:5000 __HOSTNAME__
```

- `-L 8029:127.0.0.1:8029` heißt: „Port 8029 auf meinem PC → Port 8029 auf dem Server."
- `-N` startet keine Shell, es werden nur die Tunnel offen gehalten. Das Fenster bleibt **leer**, das ist
  normal. Es fragt nur nach der Passphrase deines Schlüssels.
- Das Fenster muss **offen bleiben**, solange du den Tunnel brauchst. Mit **Strg+C** schließt du ihn.

Der Kurzname `__HOSTNAME__` kommt aus der Datei `.ssh\config` (siehe [SSH härten](/server/ssh-hardening/)).

## 3. Im Browser öffnen

- Alby Hub: `http://localhost:8029`
- LNbits (erst nach der Installation): `http://localhost:5000`

## Optional: Tunnel in `.ssh\config` eintragen

Dann genügt `ssh -N __HOSTNAME__`:

```text
Host __HOSTNAME__
    HostName __SERVER_IP__
    Port __SSH_PORT__
    User __ADMIN_USER__
    IdentityFile ~/.ssh/__SSH_KEY__
    LocalForward 8029 127.0.0.1:8029
    LocalForward 5000 127.0.0.1:5000
```

Mit diesem Eintrag öffnet auch ein normales `ssh __HOSTNAME__` die Tunnel mit.

## Wenn es nicht klappt

- `channel 2: open failed: administratively prohibited`: `AllowTcpForwarding` oder `PermitOpen` stimmt nicht,
  oder der Port steht nicht in `PermitOpen`.
- `bind [127.0.0.1]:8029: Address already in use`: Auf dem PC läuft schon etwas auf diesem Port, meist ein
  alter Tunnel. Schließe das alte Fenster.
- Die Seite lädt nicht: Läuft der Dienst? `sudo systemctl status albyhub --no-pager`.

:::note
Die Tunnel-Verbindung kommt auf dem Server vom Benutzer `__ADMIN_USER__`. Deshalb steht dieser Benutzer in
den [Port-Regeln](/services/port-rules/) bei Port 8029.
:::

Weiter mit [phoenixd](/services/phoenixd/).
