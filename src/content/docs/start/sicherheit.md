---
title: Sicherheit und Vorteile
description: Welche Sicherheitsgrundsätze dieses System umsetzt und welche Vorteile es dir bringt.
---

Ziel dieser Anleitung ist ein System, das **sicher und flexibel** zugleich ist. Sicher heißt hier nicht
„unangreifbar", sondern: Wenn ein Baustein Probleme macht, bleibt der Schaden klein, und du siehst, was
passiert ist. Flexibel heißt: Jeder Baustein lässt sich einzeln austauschen, umstellen oder abschalten.

## Die Sicherheitsgrundsätze

### 1. Ein Benutzer pro Dienst

phoenixd, Alby Hub, LNbits und der Relay laufen jeweils unter einem eigenen Linux-Benutzer ohne
Anmeldung, ohne Passwort und ohne `sudo`. Die Home-Verzeichnisse haben die Rechte `700`, Geheimnisse
`600`. Wer einen Dienst übernimmt, bekommt nur das, was dessen Benutzer lesen darf, und nicht die Daten der
anderen Dienste.

### 2. Nichts nach außen öffnen, was nur lokal gebraucht wird

Von außen ist nur SSH (auf einem eigenen Port) und Caddy (80 und 443) erreichbar. phoenixd, Alby Hub,
LNbits und der Relay lauschen auf `127.0.0.1`. Alby Hub, der Geld bewegen kann, bekommt **keine**
öffentliche Adresse. Du erreichst ihn über einen SSH-Tunnel.

### 3. Auch lokal darf nur verbinden, wer muss

Dateirechte schützen nicht vor dem Netzwerk. Deshalb entscheidet eine Firewall-Regel pro **Benutzer**,
wer sich mit welchem lokalen Port verbinden darf. LNbits kommt zum Beispiel nicht an die API von phoenixd.

### 4. Anmeldung nur per SSH-Schlüssel

Kein Passwort, kein Root, ein eigener Port, nur ein erlaubter Benutzer. Fail2ban sperrt IP-Adressen,
die zu oft scheitern.

### 5. Der Seed bleibt bei phoenixd

Alby Hub bekommt nur das HTTP-Passwort von phoenixd, nie den Seed. LNbits bekommt **gar kein**
Passwort von phoenixd, sondern zahlt über eine NWC-Verbindung mit **Budget**.

### 6. Schäden begrenzen

Das Budget der NWC-Verbindung begrenzt, was LNbits ausgeben kann. Für alles, das nur lesen oder
Rechnungen erstellen muss, gibt es von phoenixd ein Passwort mit eingeschränkten Rechten. Auf dem Server
liegt möglichst wenig Guthaben, der Rest liegt in Cold Storage.

### 7. Dienste in einer Sandbox

Systemd entzieht den Diensten zusätzlich Rechte: kein Zugriff auf fremde Home-Verzeichnisse, keine neuen
Privilegien, kein Schreiben ins System.

### 8. Zusätzlicher Schutz für die Weboberfläche

Der Admin-Bereich von LNbits liegt hinter einem zweiten Passwort in Caddy. Fail2ban zählt falsche
Anmeldungen am Web mit und sperrt Angreifer.

### 9. Updates und Neustarts ohne Handarbeit

Sicherheitsupdates von Ubuntu laufen automatisch. Nach einem Neustart starten alle Dienste in der
richtigen Reihenfolge von allein, und Alby Hub entsperrt sich selbst. Ein ausdrücklicher Neustart-Test
prüft das.

### 10. Keine überflüssigen Schlüssel auf dem Server

Auf dem Server liegen keine Zugangsschlüssel, die mehr dürfen als nötig (zum Beispiel für Cloud-Backups).
Backups verlassen den Server nur verschlüsselt.

## Die Vorteile

- **Flexibel:** LNbits ist bewusst von Alby Hub und vom Relay unabhängig. Du kannst die Finanzierungsquelle
  in einer Minute auf phoenixd oder ein anderes Wallet umstellen, ohne einen Abhängigkeitsfehler zu suchen.
- **Austauschbar:** Jeder Baustein hat eine klare Schnittstelle. Alby Hub, der Relay oder die Weboberfläche
  lassen sich ersetzen, ohne den Rest umzubauen.
- **Günstig:** Alles läuft auf einem kleinen VPS mit 2 GB Arbeitsspeicher.
- **Nachvollziehbar:** Jeder Schritt hat eine Prüfung. Am Ende gibt es eine Prüfliste, die du nach jeder
  größeren Änderung wiederholen kannst.
- **Rettungsweg:** Auch bei einer falschen SSH-Einstellung kommst du über die Web-Konsole deines
  Anbieters wieder auf den Server.
- **Eigene Kontrolle:** Seed, Kanal und Daten liegen bei dir.

## Was das System nicht leistet

:::caution[Das Restrisiko]
Alles läuft auf **einem** Server. Eine Übernahme von `root`, eine Lücke im Kernel oder ein Fehler in der
SSH-Konfiguration trifft deshalb alle Dienste. Die Härtung macht das unwahrscheinlicher, sie macht es
nicht unmöglich. Halte das Guthaben auf dem Server klein.
:::

- **Auto-Unlock speichert das Entsperr-Passwort von Alby Hub im Klartext.** Das ist der Preis dafür, dass
  alles nach einem Neustart von allein wieder läuft. Du kannst darauf verzichten und von Hand entsperren
  (siehe [Alby Hub](/dienste/albyhub/#auto-unlock)).
- **Fail2ban bremst nur das Raten von Passwörtern.** Lücken in Erweiterungen oder Angriffe mit gültigem
  Token verhindert es nicht.
- **Alby Hub lauscht in dieser Version auf allen Adressen** und ist nur durch die Firewall von außen
  geschützt.
- **Updates bleiben deine Aufgabe.** Ubuntu aktualisiert sich selbst, phoenixd, Alby Hub, LNbits und der
  Relay nicht. Das Kapitel [Updates durchführen](/betrieb/updates/) zeigt, wie.

Weiter mit dem [Überblick und der Architektur](/start/ueberblick/).
