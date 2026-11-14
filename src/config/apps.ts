/**
 * Die Anwendungen von Phalnx mit Kurzbeschreibung (Kachel) und Begründung (Popup und Übersichtsseite).
 * Eine Quelle für die Startseite (`AppCards.astro`) und die Seite `start/applications`.
 */
export interface AppInfo {
	id: string;
	name: string;
	icon: string;
	/** Ein Satz für die Kachel */
	short: string;
	/** Absätze für Popup und Übersichtsseite (einfaches Markdown: **fett** und [Text](https://…)) */
	paragraphs: string[];
	/** Kapitel mit der Anleitung */
	link: string;
}

export const APPS: AppInfo[] = [
	{
		id: 'phoenixd',
		name: 'phoenixd',
		icon: 'rocket',
		short: 'Der Lightning-Knoten. Hält Seed und Kanal und bleibt als einziger Dienst im Besitz des Seeds.',
		paragraphs: [
			'phoenixd und der Anbieter ACINQ sind erprobt und robust. Du musst dir nur den **Seed** merken und sicher aufbewahren, dann kommst du immer wieder an dein Geld.',
			'Du musst nur dafür sorgen, dass phoenixd aktuell bleibt. Alles andere rund um die Sicherung der Lightning-Daten, etwa das Static Channel Backup (SCB), übernimmt ACINQ. Dafür verlangt ACINQ Gebühren, die transparent angegeben sind.',
			'**Gebühren von phoenixd (ACINQ):** Senden per Lightning kostet 0,4 % + 4 sat, Empfangen ist kostenlos. Wenn neue Liquidität nötig ist, fallen 1 % + Mining-Gebühren an. Details: [Auto Liquidity](https://phoenix.acinq.co/server/auto-liquidity) · [Gebührentabelle (FAQ)](https://phoenix.acinq.co/faq). Stand: 14.11.2026. Die Zahlen können sich ändern, maßgeblich sind die verlinkten Seiten.',
		],
		link: '/services/phoenixd/',
	},
	{
		id: 'albyhub',
		name: 'Alby Hub',
		icon: 'setting',
		short: 'Verwaltet das Wallet, vergibt NWC-Verbindungen mit Budget und ist nur über einen SSH-Tunnel erreichbar.',
		paragraphs: [
			'Alby hat sich darauf spezialisiert, Lightning-Zahlungen als Dienst anzubieten. Alby Hub vermittelt den Zugriff auf eine Finanzierungsquelle, die du selbst bereitstellst oder auswählst. Hier ist das phoenixd. Anwendungen wie LNbits oder Wallet-Apps greifen über **Nostr Wallet Connect (NWC)** darauf zu.',
			'Mit der Alby Extension und einem Alby-Web-Account kommen weitere Funktionen dazu, etwa Lightning-Adressen, Nostr-Login, Nostr-Internet-Identifikation (NIP-05) oder regelmäßige Status-E-Mails zum Wallet.',
			'Die Admin-Oberfläche von Alby Hub ist nur über einen SSH-Tunnel erreichbar. Alby Hub hat damit **keine öffentliche Angriffsfläche**.',
		],
		link: '/services/albyhub/',
	},
	{
		id: 'relay',
		name: 'Nostr-Relay',
		icon: 'random',
		short: 'Die lokale Brücke zwischen Alby Hub und LNbits. Von außen nicht erreichbar.',
		paragraphs: [
			'Das Nostr-Relay ist das einfache Bindeglied zwischen Alby Hub und LNbits. Über diese Brücke können nur genau festgelegte Daten ausgetauscht werden.',
			'Das Relay ist von außen nicht erreichbar und spricht nur mit Alby Hub und LNbits. Die Schnittstelle ist damit klar begrenzt: Eine kompromittierte Seite hat **keinen direkten Zugriff** auf die andere Anwendung.',
		],
		link: '/services/relay/',
	},
	{
		id: 'lnbits',
		name: 'LNbits',
		icon: 'open-book',
		short: 'Die Weboberfläche mit Wallets und Erweiterungen. Zahlt nur über NWC mit Limit.',
		paragraphs: [
			'LNbits ist das Kernstück von Phalnx: ein mächtiges Wallet- und Kontensystem, das sich durch Extensions fast beliebig erweitern lässt. LNbits braucht eine Finanzierungsquelle. Sie kommt hier über den Weg Nostr-Relay → Alby Hub → phoenixd.',
			'Weil LNbits durch die vielen Erweiterungen eine sehr komplexe Anwendung ist, lässt sich nie ausschließen, dass ein Angreifer einen Fehler ausnutzt, um Geld zu stehlen. Um das Ausmaß zu begrenzen und einen Vorfall früher zu erkennen, ist Alby Hub dazwischengeschaltet.',
			'In Alby Hub legst du das **maximale Guthaben** und die **maximale Zahlungsmenge pro Zeiteinheit** fest. So bekommt LNbits eine von dir regelbare Finanzierungsquelle, ohne dass das gesamte Guthaben der phoenixd-Wallet offenliegt.',
		],
		link: '/services/lnbits/',
	},
	{
		id: 'caddy',
		name: 'Caddy',
		icon: 'seti:lock',
		short: 'Reverse Proxy mit automatischem HTTPS und zusätzlichem Passwortschutz für den Admin-Bereich.',
		paragraphs: [
			'Caddy ist ein Proxy-Server, der Anfragen aus dem Web an die Anwendungen auf dem VPS weiterleitet. Bei Phalnx ist das nur LNbits. Caddy sorgt außerdem für HTTPS, protokolliert den Webverkehr zusätzlich und schützt das Admin-Panel mit einem eigenen Passwort.',
			'Das Super-User-Admin-Panel von LNbits sieht zunächst aus wie das eines normalen Nutzers, hat aber zusätzliche Registerkarten für Einstellungen und Nutzerverwaltung. Caddy erkennt diese Aufrufe und fragt zuerst nach einem Passwort. Erst danach gibt es den Zugriff für die Sitzung frei.',
			'**Empfehlung:** Rufe das Super-User-Konto immer im **Inkognito-Modus** des Browsers auf. Das verhindert, dass du vergisst dich abzumelden, und du kannst zusätzlich im normalen Browser mit einem anderen Nutzer arbeiten.',
		],
		link: '/services/caddy/',
	},
];

/** Ersetzt **fett** durch <strong> (die Texte stammen aus dieser Datei, nicht von Nutzern). */
export function inline(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}
