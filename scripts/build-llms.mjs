/**
 * Erzeugt aus den Seiten der Anleitung zwei Textdateien für KI-Assistenten:
 *   public/llms-full.txt  die ganze Anleitung in einer Datei, in der Reihenfolge der Seitenleiste
 *   public/llms.txt       ein kurzes Inhaltsverzeichnis mit Links
 *
 * Sie werden bei jedem `npm run build` neu geschrieben (npm-Skript `prebuild`). Es gibt nichts zu pflegen:
 * neue Seiten kommen über die Seitenleiste in `astro.config.mjs` automatisch dazu.
 * Nutzer geben der KI den Link https://phalnx.21mio.space/llms-full.txt. Die KI soll daraus erkennen, in
 * welchem Schritt der Nutzer ist und was laut Anleitung erscheinen muss.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const SITE = 'https://phalnx.21mio.space';
const at = (p) => fileURLToPath(new URL(p, root));

const { PLACEHOLDERS } = await import(pathToFileURL(at('src/config/placeholders.ts')).href);
const { APPS } = await import(pathToFileURL(at('src/config/apps.ts')).href);

// Reihenfolge und Gruppen aus der Seitenleiste lesen
const cfg = readFileSync(at('astro.config.mjs'), 'utf8');
const sidebar = cfg.slice(cfg.indexOf('sidebar:'));
const entries = [];
for (const m of sidebar.matchAll(/label:\s*'([^']+)'(?:,\s*slug:\s*'([^']+)')?/g)) {
	entries.push(m[2] ? { page: m[2], label: m[1] } : { group: m[1] });
}

const plain = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1 ($2)');

// Überschriften einer Seite eine Ebene tiefer setzen (außerhalb von Codeblöcken), damit "## Seite:" die oberste bleibt
function demote(md) {
	let fence = false;
	return md
		.split('\n')
		.map((line) => {
			if (/^\s*```/.test(line)) fence = !fence;
			return !fence && /^#{1,5}\s/.test(line) ? '#' + line : line;
		})
		.join('\n');
}

function readPage(slug) {
	for (const ext of ['md', 'mdx']) {
		const f = at(`src/content/docs/${slug}.${ext}`);
		if (!existsSync(f)) continue;
		let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
		const fm = s.match(/^---\n([\s\S]*?)\n---\n/);
		const meta = {};
		if (fm) {
			for (const line of fm[1].split('\n')) {
				const m = line.match(/^(\w+):\s*(.*)$/);
				if (m) meta[m[1]] = m[2].trim();
			}
			s = s.slice(fm[0].length);
		}
		return { meta, body: s.trim(), ext };
	}
	return null;
}

// Anwendungsseite entsteht aus apps.ts (die .mdx enthält nur eine Komponente)
function appsText() {
	return APPS.map((a) => `### ${a.name}\n\n${a.paragraphs.map(plain).join('\n\n')}\n\nKapitel: ${SITE}${a.link}`).join('\n\n');
}

const defaults = PLACEHOLDERS.map((p) => `| \`__${p.key}__\` | ${p.label} | \`${p.default}\` |`).join('\n');

const preamble = `# Phalnx: Anleitung für einen gehärteten Lightning-Server (vollständiger Text)

Quelle: ${SITE}/ (diese Datei wird bei jedem Build automatisch aus den Seiten erzeugt)

## Hinweise für die KI

Du hilfst einem Menschen, der die Anleitung **Phalnx** Schritt für Schritt auf einem eigenen Ubuntu-24.04-Server
(VPS) umsetzt. Der Text unten ist die ganze Anleitung. Typisch ist: Der Nutzer kopiert einen **Befehl aus seinem
Terminal samt der Ausgabe** (oder einer Fehlermeldung) in den Chat. Gehe so vor:

1. **Finde heraus, in welchem Schritt der Nutzer ist.** Suche den Befehl in der Anleitung. Jede Seite hat die
   Überschrift \`## Seite: <Titel>\` und eine Adresse. Anhand des Befehls erkennst du Kapitel und Schritt.
2. **Vergleiche mit der Anleitung.** Fast jeder Schritt hat einen Abschnitt **Prüfen** (Befehl und erwartete
   Ausgabe) und **Wenn es nicht klappt**. Sage dem Nutzer, was laut Anleitung erscheinen soll, ob seine Ausgabe
   dazu passt und was der nächste Schritt ist.
3. **Achte auf den Ort.** Vor jedem Befehl steht, wo er läuft: auf dem **PC** des Nutzers (PowerShell oder Terminal),
   auf dem Server als \`root\`, als **Admin-Benutzer** (Befehle mit \`sudo\`) oder in der **Shell eines
   Dienst-Benutzers** (\`uphoenixd\`, \`ualbyhub\`, \`ulnbits\`, \`urelay\`). Die Eingabeaufforderung zeigt es
   (\`PS C:\\…>\`, \`root@…#\`, \`admin@…:~$\`, \`uphoenixd@…:~$\`). Dienst-Benutzer haben absichtlich **kein sudo**.
   Eine Meldung „not in the sudoers file" dort ist richtig und kein Fehler.
4. **Platzhalter:** In den Befehlen stehen Werte wie \`__SSH_PORT__\`. Die Website ersetzt sie im Browser durch die
   Werte des Nutzers („Meine Werte"). In dieser Datei siehst du die Platzhalter selbst. Bei einer Rückmeldung des
   Nutzers hat er statt der Platzhalter seine echten Werte. Das ist erwartet. Standardwerte:

| Platzhalter | Bedeutung | Standardwert in der Anleitung |
|---|---|---|
${defaults}

5. **Keine Geheimnisse verlangen oder wiederholen.** Frage **nie** nach Passwörtern, Passphrasen, dem privaten
   SSH-Schlüssel, dem Seed, \`http-password\`, Hashes, NWC-Adressen (\`nostr+walletconnect://…\`) oder Tokens. Bittet
   der Nutzer um Hilfe mit solchen Daten, sage ihm, er soll sie durch Platzhalter ersetzen. Auch die echte
   Server-IP und die Domain sind nicht nötig.
6. **Weiche nicht von der Anleitung ab,** wenn es nicht nötig ist, und rate nicht. Fehlt dir ein Teil der Ausgabe,
   frage nach. Bei Zweifeln an einem Befehl verweise auf das Kapitel.
7. **Vor riskanten Schritten warnen** (SSH und Firewall ändern, Dateien löschen, Kanal schließen, Backup
   zurückspielen). Die Anleitung rät, vorher eine zweite SSH-Sitzung offen zu lassen.

Aufbau der Anleitung: **Einstieg** (Sicherheit, Anwendungen, Architektur, Vorbereitung), **Teil A** Server-Grundlage,
**Teil B** Dienste (SSH-Tunnel, phoenixd, Alby Hub, Relay, LNbits, Caddy, Fail2ban, Port-Regeln), **Teil C**
Abnahme und Betrieb (Neustart-Test, Prüfliste, Updates, Geheimnisse, Alltag, Notfall), **Teil D** Optionales
(Telegram, Backup). Admonitions stehen als \`:::note\`, \`:::tip\`, \`:::caution\`, \`:::danger\` im Text.

---
`;

const parts = [preamble];
const index = [
	'# Phalnx',
	'',
	'> Schrittweise Anleitung für einen gehärteten Lightning-Server auf einem Ubuntu-24.04-VPS: phoenixd, Alby Hub, lokaler Nostr-Relay (strfry), LNbits und Caddy.',
	'',
	`Den vollständigen Text in einer Datei findest du unter ${SITE}/llms-full.txt`,
	'',
];

for (const e of entries) {
	if (e.group) {
		parts.push(`\n# ${e.group}\n`);
		index.push('', `## ${e.group}`, '');
		continue;
	}
	const page = readPage(e.page);
	if (!page) {
		console.warn(`WARNUNG: Seite ${e.page} nicht gefunden`);
		continue;
	}
	const url = `${SITE}/${e.page}/`;
	const title = page.meta.title ?? e.label;
	const body = demote(e.page === 'start/applications' ? appsText() : page.body);
	parts.push(`\n## Seite: ${title}\n\nAdresse: ${url}\n${page.meta.description ? `Kurzbeschreibung: ${page.meta.description}\n` : ''}\n${body}\n`);
	index.push(`- [${title}](${url})${page.meta.description ? `: ${page.meta.description}` : ''}`);
}

writeFileSync(at('public/llms-full.txt'), parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
writeFileSync(at('public/llms.txt'), index.join('\n') + '\n');
const kb = Math.round(readFileSync(at('public/llms-full.txt')).length / 1024);
console.log(`llms-full.txt: ${entries.filter((e) => e.page).length} Seiten, ${kb} KB`);
