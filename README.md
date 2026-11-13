# Phalnx

Anleitung für einen eigenen Lightning-Server auf einem Ubuntu-VPS: **phoenixd**, **Alby Hub**, ein lokaler
**Relay**, **LNbits** und **Caddy**, gehärtet und Schritt für Schritt nachvollziehbar. Gebaut mit
[Starlight](https://starlight.astro.build) (Astro).

Die Seite ist zunächst nur auf Deutsch. Weitere Sprachen kommen später dazu.

## Entwickeln

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev      # lokaler Server auf http://localhost:4321
npm run build    # statische Seite nach dist/
npm run preview  # dist/ lokal ansehen
```

Die Ausgabe von `npm run build` liegt in `dist/`. Den **Inhalt** dieses Ordners lädst du auf den Webserver.

## Aufbau

```text
src/
├── content/docs/          Seiten (Markdown), ein Ordner pro Teil
│   ├── start/             Einstieg: Sicherheit, Überblick, Vorbereitung
│   ├── server/            Teil A: Server-Grundlage
│   ├── services/           Teil B: phoenixd, Alby Hub, Relay, LNbits, Caddy ...
│   └── operations/           Teil C: Abnahme, Updates, Notfall
├── config/placeholders.ts Platzhalter für „Meine Werte"
├── scripts/placeholders.ts  Client-Logik des Panels
├── components/ThemeSelect.astro  Knopf „Meine Werte" in der Kopfzeile
└── styles/custom.css      Aussehen von Panel und Hervorhebungen
astro.config.mjs           Titel, Sprache und Seitenleiste
```

Die Reihenfolge und die Namen in der Seitenleiste stehen in `astro.config.mjs`.

## Platzhalter („Meine Werte")

In den Seiten stehen veränderbare Werte als `__SCHLUESSEL__`, zum Beispiel `__SSH_PORT__`, `__SERVER_IP__`
oder `__DOMAIN__`. Der Knopf **Meine Werte** in der Kopfzeile erlaubt dem Leser, sie einzustellen. Der Browser
ersetzt sie im Text, in den Codeblöcken und im Kopier-Knopf. Gespeichert wird nur in `localStorage`.

Einen neuen Platzhalter anlegen:

1. In `src/config/placeholders.ts` einen Eintrag ergänzen (Schlüssel, Beschriftung, Standardwert, erlaubtes
   Muster).
2. In den Seiten `__NEUER_SCHLUESSEL__` verwenden.

Regeln:

- Schlüssel nur aus **GROSSBUCHSTABEN, Ziffern und `_`**. Sonst zerteilt der Syntax-Highlighter das Token.
- Im Fließtext `__SCHLUESSEL__` immer in `Backticks` setzen, sonst macht Markdown daraus Fettschrift.
- Das `pattern` ist eine **Whitelist**. Die Werte landen in Shell-Befehlen, deshalb sind Leerzeichen,
  Anführungszeichen, `;`, `|` und `&` nicht erlaubt.
- Keine Platzhalter in Code-Titeln (`title="..."`). Dort wird nicht ersetzt.

## Inhalte schreiben

- Seiten sind Markdown (`.md`). Hinweisboxen: `:::note`, `:::tip`, `:::caution`, `:::danger`.
- Jede Seite folgt dem Muster: Ziel, Befehle in getrennten Blöcken, **Prüfen**, **Wenn es nicht klappt**.
- Befehle, die auf einander warten müssen, stehen in **getrennten Codeblöcken**.
- In der Anleitung stehen nur Werte aus dem Panel oder Dummys: keine echten IPs, Domains oder Zugangsdaten.
  Für IP-Adressen gilt der Dokumentationsbereich `203.0.113.0/24`, für Domains `example.org`.
- Befehle, die nicht getestet sind, stehen in einer Box `:::caution[Nicht getestet]`.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
