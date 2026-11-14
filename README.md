# Phalnx

A step-by-step guide to a hardened Lightning server on an Ubuntu 24.04 VPS: **phoenixd**, **Alby Hub**, a
local **relay** (strfry), **LNbits** and **Caddy**. Built with [Starlight](https://starlight.astro.build)
(Astro).

The guide itself is currently **German only**. English will follow. Repository structure, file names and
server file names are English.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # local server on http://localhost:4321
npm run build    # static site to dist/
npm run preview  # serve dist/ locally
```

`npm run build` writes to `dist/`. Upload the **contents** of that folder to your web server.

## Structure

```text
src/
├── content/docs/            pages (Markdown), one folder per part
│   ├── start/               intro: security, overview, preparation
│   ├── server/              part A: server foundation
│   ├── services/            part B: phoenixd, Alby Hub, relay, LNbits, Caddy ...
│   ├── operations/          part C: acceptance, updates, emergency
│   └── optional/            part D: optional add-ons (Telegram notifications, backups later)
├── config/placeholders.ts   placeholders for the "Meine Werte" panel
├── scripts/placeholders.ts  client logic of the panel
├── components/ThemeSelect.astro  "Meine Werte" button in the header
└── styles/custom.css        look of panel and highlights
astro.config.mjs             title, language and sidebar
```

Sidebar order and labels live in `astro.config.mjs`. Diagrams are written as ` ```mermaid ` blocks and
rendered in the browser (`astro-mermaid`).

## Placeholders ("Meine Werte")

Pages contain changeable values as `__KEY__`, for example `__SSH_PORT__`, `__SERVER_IP__` or `__DOMAIN__`.
The **Meine Werte** button in the header lets the reader set them. The browser replaces them in text, code
blocks and the copy button. Values are stored in `localStorage` only.

Add a placeholder:

1. Add an entry in `src/config/placeholders.ts` (key, label, default, allowed pattern).
2. Use `__NEW_KEY__` in the pages.

Rules:

- Keys: **UPPERCASE, digits and `_`** only. Otherwise the syntax highlighter splits the token.
- In running text always wrap `__KEY__` in `backticks`, otherwise Markdown renders it bold.
- `pattern` is a **whitelist**. Values end up in shell commands, so spaces, quotes, `;`, `|` and `&` are
  not allowed.
- No placeholders in code titles (`title="..."`). They are not replaced there.

## Writing content

- Pages are Markdown (`.md`), file names and URL slugs in English. Admonitions: `:::note`, `:::tip`,
  `:::caution`, `:::danger`.
- Each page follows the pattern: goal, commands in separate blocks, **check**, **if it fails**.
- Commands that must wait for each other go into **separate code blocks**.
- Only panel values or dummies appear in the guide: no real IPs, domains or credentials. Use the
  documentation range `203.0.113.0/24` for IPs and `example.org` for domains.
- Server file names used in the guide are English (for example `00-hardening.conf`, `nft-local.service`).
- Untested commands go into a `:::caution[Nicht getestet]` box.

## License

MIT, see [LICENSE](LICENSE).
