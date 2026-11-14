/**
 * Schreibt vor jedem Build die aktuelle Bitcoin-Blockhöhe (von mempool.space) nach src/config/build.json.
 * Die Seite zeigt sie als „build: <Blockhöhe>" neben dem GitHub-Symbol. Läuft automatisch über `npm run build`
 * (npm-Skript `prebuild`). Ist mempool.space nicht erreichbar, bleibt der letzte Wert stehen und es gibt eine Warnung.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/config/build.json', import.meta.url);
const URL_TIP = 'https://mempool.space/api/blocks/tip/height';

try {
	const res = await fetch(URL_TIP, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const block = Number((await res.text()).trim());
	if (!Number.isInteger(block) || block <= 0) throw new Error('Unerwartete Antwort');
	writeFileSync(FILE, JSON.stringify({ block, date: new Date().toISOString() }, null, '\t') + '\n');
	console.log(`build: Blockhöhe ${block}`);
} catch (e) {
	let old = '?';
	try {
		old = JSON.parse(readFileSync(FILE, 'utf8')).block;
	} catch {}
	console.warn(`WARNUNG: Blockhöhe von mempool.space nicht abrufbar (${e.message}). Es bleibt der alte Wert: ${old}`);
}
