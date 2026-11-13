---
title: Überblick und Architektur
description: Wie die Bausteine zusammenspielen, welche Namen und Ports verwendet werden und in welcher Reihenfolge alles startet.
---

## Die Bausteine

```text
phoenixd (127.0.0.1:9740) ← Alby Hub (8029) ←NWC→ Relay (127.0.0.1:7777) ←NWC→ LNbits (127.0.0.1:5000) ← Caddy (80/443) ← Internet
```

| Baustein | Aufgabe |
|---|---|
| **phoenixd** | Der Lightning-Knoten. Hält Seed und Kanal. |
| **Alby Hub** | Steuert phoenixd und vergibt NWC-Verbindungen mit Budget. Nur über einen SSH-Tunnel erreichbar. |
| **Relay (strfry)** | Leitet die NWC-Nachrichten lokal weiter, ohne Umweg über das Internet. |
| **LNbits** | Weboberfläche mit Wallets und Erweiterungen. Zahlt nur über NWC, mit Budget. |
| **Caddy** | Macht nur LNbits öffentlich, mit HTTPS und Passwortschutz für den Admin-Bereich. |

Alby Hub und LNbits sprechen **nie direkt** miteinander. Beide verbinden sich ausgehend zum Relay.
LNbits schickt eine verschlüsselte Anfrage an den Relay, der Relay gibt sie an Alby Hub weiter, die
Antwort läuft auf demselben Weg zurück. Der Relay kann den Inhalt nicht lesen.

## Namen und Vorgaben

Die Namen in der Tabelle kannst du ändern. Admin-Benutzer, Servername und SSH-Port stellst du über
**Meine Werte** ein, die Dienst-Benutzer bleiben in dieser Anleitung fest.

| Was | Name | Zweck |
|---|---|---|
| Server | `__HOSTNAME__` | Hostname |
| Admin-Benutzer | `__ADMIN_USER__` | Der einzige Benutzer, der sich per SSH anmeldet und `sudo` darf |
| Dienst-Benutzer 1 | `uphoenixd` | Nur für **phoenixd** (hält den Seed) |
| Dienst-Benutzer 2 | `ualbyhub` | Nur für **Alby Hub** |
| Dienst-Benutzer 3 | `ulnbits` | Nur für **LNbits** |
| Dienst-Benutzer 4 | `urelay` | Nur für den **lokalen Relay** |
| SSH-Port | `__SSH_PORT__` | Statt 22 |

Das Präfix `u` steht für „User des Dienstes". Der Admin-Benutzer muss immer von den Dienst-Benutzern getrennt
sein.

## Ports

| Port | Adresse | Programm | Erreichbar für |
|---|---|---|---|
| `__SSH_PORT__` | alle | sshd | alle (mit Schlüssel) |
| 80, 443 | alle | Caddy | alle |
| 9740 | 127.0.0.1 | phoenixd | `ualbyhub`, `uphoenixd` |
| 8029 | alle Adressen, durch die Firewall geschützt | Alby Hub | `ualbyhub`, Admin über Tunnel |
| 5000 | 127.0.0.1 | LNbits | `ulnbits`, `caddy` |
| 7777 | 127.0.0.1 | Relay | `urelay`, `ualbyhub`, `ulnbits` |

Die Lightning-Verbindung (Port 9735) baut phoenixd **ausgehend** auf. Es muss nichts lauschen.

## Reihenfolge nach einem Neustart

```text
phoenixd  →  relay  →  albyhub        lnbits (5 Sekunden später, ohne Abhängigkeit)
```

Alby Hub startet erst, wenn phoenixd und der Relay da sind. LNbits hängt **absichtlich nicht** von ihnen ab.
So lässt sich die Finanzierungsquelle jederzeit umstellen, ohne dass ein gestoppter Dienst LNbits mit
blockiert. Eine feste Wartezeit von 5 Sekunden gibt den anderen einen kleinen Vorsprung.

## Die Entscheidung: ein Server für alles

phoenixd, Alby Hub, LNbits und der Relay laufen auf demselben Server. Das spart Kosten. Das Restrisiko
(Root-Übernahme, Kernel-Lücke oder SSH-Fehler trifft alles) besteht aber auch bei einem Server nur mit
Alby Hub. Es wird mit wenig Guthaben und der Härtung in dieser Anleitung klein gehalten.

## Der Weg durch die Anleitung

1. **Teil A** richtet den Server ein und härtet ihn.
2. **Teil B** installiert die Dienste in der Reihenfolge phoenixd, Alby Hub, Relay, LNbits, Caddy.
3. **Teil C** prüft alles, zeigt Updates und den Notfall.

Warum Caddy erst zuletzt kommt: Alby Hub und LNbits legen beim **ersten Aufruf** das Admin-Konto an. Wer die
Seite zuerst öffnet, wird Admin. Deshalb machst du die Ersteinrichtung über den SSH-Tunnel, bevor etwas
öffentlich ist.

Weiter mit der [Vorbereitung](/start/vorbereitung/).
