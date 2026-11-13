---
title: Dienst-Benutzer
description: Für jeden Dienst einen eigenen Linux-Benutzer ohne Anmeldung anlegen und die Trennung prüfen.
---

Das ist der Kern der Härtung. Jeder Dienst bekommt einen **eigenen Benutzer**. Wer einen Dienst übernimmt,
kann nur lesen, was dessen Benutzer lesen darf.

## Benutzer anlegen

```bash
for u in uphoenixd ualbyhub ulnbits urelay; do
  sudo useradd --create-home --home-dir /home/$u --shell /usr/sbin/nologin $u
  sudo passwd -l $u
  sudo chmod 700 /home/$u
done
sudo chmod 700 /home/__ADMIN_USER__
```

Was die Optionen bewirken:

- `--shell /usr/sbin/nologin`: keine interaktive Anmeldung. Auch `su` und SSH scheitern.
- `passwd -l`: Das Passwort ist gesperrt. Es gibt kein Passwort, das jemand raten könnte.
- `chmod 700`: `uphoenixd` kann nicht in `/home/ualbyhub` lesen und umgekehrt. Auch `__ADMIN_USER__` nicht,
  außer mit `sudo`.
- Keiner der Dienst-Benutzer steht in `AllowUsers` oder in der Gruppe `sudo`.

:::note
`passwd -l` meldet „password changed". Das heißt nur, dass das Passwort **gesperrt** wurde. Die
Dienst-Benutzer haben absichtlich kein Passwort.
:::

:::caution
Nimm die Dienst-Benutzer **nicht** in die Gruppe `docker` auf. Wer `docker` darf, ist faktisch `root`.
:::

## Als Dienst-Benutzer arbeiten

Zum Installieren eines Dienstes öffnest du eine Shell als dieser Benutzer. Das geht trotz `nologin`, weil
`sudo` die Shell direkt startet:

```bash
sudo -u uphoenixd -H bash -c 'cd ~ && exec bash'
```

Mit `exit` verlässt du sie. Ein einzelner Befehl geht auch ohne Shell:

```bash
sudo -u uphoenixd -H ls -la /home/uphoenixd
```

Beides gibst du immer als `__ADMIN_USER__` ein. In der Shell eines Dienst-Benutzers gibt es kein `sudo`
(„not in the sudoers file"). Das ist richtig so. Erst mit `exit` kommst du zu `__ADMIN_USER__` zurück.

## Prüfen, dass die Trennung wirkt

```bash
sudo -u ulnbits ls /home/uphoenixd /home/ualbyhub /home/urelay /root
sudo -u ualbyhub ls /home/uphoenixd
sudo -u uphoenixd ls /home/ualbyhub
sudo -u ulnbits cat /etc/shadow
```

Jeder Befehl muss mit **Permission denied** enden. Dann:

```bash
id uphoenixd; id ualbyhub; id ulnbits; id urelay
```

Bei jedem darf nur die eigene Gruppe stehen, kein `sudo`, kein `docker`.

## Was welcher Benutzer bekommt

| Datei oder Port | Eigentümer | Rechte | Wer braucht es |
|---|---|---|---|
| `/home/uphoenixd/.phoenix` | `uphoenixd` | `700` | nur phoenixd |
| `seed.dat` | `uphoenixd` | `600` | nur phoenixd, **niemals** für `ualbyhub` lesbar |
| `phoenix.conf` (enthält `http-password`) | `uphoenixd` | `600` | nur phoenixd |
| `/home/ualbyhub/...` | `ualbyhub` | `700` | nur Alby Hub |
| `/home/ulnbits/...` | `ulnbits` | `700` | nur LNbits |
| `/home/urelay/...` | `urelay` | `700` | nur Relay |
| API von phoenixd, `127.0.0.1:9740` | nur lokal | nur für `ualbyhub` (Kapitel [Port-Regeln](/dienste/port-regeln/)) | Alby Hub |
| Alby Hub, Port 8029 | nur lokal | Tunnel vom Admin | Admin |
| LNbits, `127.0.0.1:5000` | nur lokal | Caddy | Caddy |
| Relay, `127.0.0.1:7777` | nur lokal | Alby Hub, LNbits | Alby Hub, LNbits |

Alles andere (Passwörter, Tokens, `.env`-Dateien) legst du mit `chmod 600` an. Ein Beispiel, das du später
brauchst:

```bash
install -m 600 /dev/null /home/ualbyhub/albyhub.env
```

## Wie Alby Hub phoenixd erreicht

Alby Hub braucht das **HTTP-Passwort** von phoenixd, nicht den Seed. Das Passwort steht in
`/home/uphoenixd/.phoenix/phoenix.conf`. Für `ualbyhub` ist die Datei nicht lesbar, du trägst das Passwort
**einmalig von Hand** in die Umgebungsdatei von Alby Hub ein.

Dieses Passwort erlaubt Zahlen, On-Chain-Senden und **Kanal schließen**. Wer Alby Hub übernimmt, kann damit
alles tun. Deshalb gilt:

- **LNbits bekommt dieses Passwort nicht.** Es zahlt nur über NWC mit Limit.
- phoenixd hat ein zweites Passwort, `http-password-limited-access`. Es kann nur lesen und Rechnungen
  erstellen, nicht zahlen, senden oder Kanäle schließen. Nutze es für alles, das nur empfangen oder Salden
  anzeigen muss.
- Zahlungen mit Budget vergibst du über **NWC mit Limit**, nicht über das Vollzugriffs-Passwort.

Teil A ist damit fertig. Weiter mit Teil B: dem [SSH-Tunnel](/dienste/tunnel/).
