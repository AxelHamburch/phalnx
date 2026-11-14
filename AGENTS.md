## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Build-Stempel (Pflicht vor jedem Build)

Die Seite zeigt oben neben dem GitHub-Symbol `build: <Blockhöhe>`. Die Blockhöhe kommt von
`https://mempool.space/api/blocks/tip/height` und steht in `src/config/build.json`.

- **Immer `npm run build` benutzen, nie `astro build` direkt.** Das npm-Skript `prebuild` ruft
  `scripts/stamp-build.mjs` auf und holt die aktuelle Blockhöhe automatisch.
- Ist mempool.space nicht erreichbar, bleibt der alte Wert stehen und das Skript warnt. Dann den Build
  wiederholen oder dem Nutzer sagen, dass der Stempel veraltet ist.
- `src/config/build.json` gehört mit in jeden Commit, der einen Build auslöst.
