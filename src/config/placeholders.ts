/**
 * Platzhalter für das Panel „Meine Werte".
 *
 * In den Seiten (Markdown) stehen sie als `__SCHLUESSEL__`, zum Beispiel `__SSH_PORT__`.
 * Im Browser ersetzt das Panel sie durch die Werte des Lesers. Das gilt auch für den
 * Kopier-Knopf der Codeblöcke.
 *
 * Regeln:
 * - Schlüssel nur in GROSSBUCHSTABEN, Ziffern und `_` (damit der Syntax-Highlighter sie nicht zerteilt).
 * - In Fließtext immer in `Backticks` schreiben, sonst macht Markdown aus `__X__` Fettschrift.
 * - `pattern` ist eine Whitelist. Die Werte landen in Shell-Befehlen, deshalb sind
 *   Sonderzeichen (Leerzeichen, Anführungszeichen, `;`, `|`, `&` ...) nicht erlaubt.
 */

export interface PlaceholderField {
	/** Schlüssel ohne Unterstriche außen, z. B. SSH_PORT */
	key: string;
	label: string;
	hint: string;
	default: string;
	/** Regulärer Ausdruck (ohne Schrägstriche), muss den ganzen Wert treffen */
	pattern: string;
	error: string;
	/** false = wird nicht im Browser gespeichert (nur für die laufende Seite) */
	persist?: boolean;
	group: string;
}

export const PLACEHOLDER_GROUPS = ['Server', 'System', 'Web', 'Versionen'] as const;

export const PLACEHOLDERS: PlaceholderField[] = [
	{
		key: 'SERVER_IP',
		label: 'Server-IP',
		hint: 'Die IPv4-Adresse deines VPS.',
		default: '203.0.113.10',
		pattern: '[0-9a-fA-F:.]{3,45}',
		error: 'Nur Ziffern, Punkte und Doppelpunkte.',
		group: 'Server',
	},
	{
		key: 'HOSTNAME',
		label: 'Servername',
		hint: 'Name des Servers und Kurzname für „ssh <Name>".',
		default: 'zero',
		pattern: '[a-z0-9][a-z0-9-]{0,30}',
		error: 'Kleinbuchstaben, Ziffern und Bindestrich, höchstens 31 Zeichen.',
		group: 'Server',
	},
	{
		key: 'SSH_PORT',
		label: 'SSH-Port',
		hint: 'Statt 22. Wähle einen eigenen zwischen 1024 und 65535.',
		default: '2208',
		pattern: '(10[2-9][0-9]|1[1-9][0-9]{2}|[2-9][0-9]{3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])',
		error: 'Eine Zahl von 1024 bis 65535.',
		group: 'Server',
	},
	{
		key: 'ADMIN_USER',
		label: 'Admin-Benutzer',
		hint: 'Der einzige Benutzer, der sich per SSH anmeldet und sudo darf.',
		default: 'zeroadmin',
		pattern: '[a-z_][a-z0-9_-]{0,30}',
		error: 'Kleinbuchstaben, Ziffern, _ und -, nicht mit einer Ziffer beginnen.',
		group: 'Server',
	},
	{
		key: 'SSH_KEY',
		label: 'Name der Schlüsseldatei',
		hint: 'Dateiname des SSH-Schlüssels auf deinem PC (ohne .pub).',
		default: 'id_zero',
		pattern: '[A-Za-z0-9._-]{1,40}',
		error: 'Buchstaben, Ziffern, Punkt, _ und -.',
		group: 'Server',
	},
	{
		key: 'TIMEZONE',
		label: 'Zeitzone',
		hint: 'Eine Zeitzone aus „timedatectl list-timezones".',
		default: 'Europe/Berlin',
		pattern: '[A-Za-z]+(/[A-Za-z0-9_+-]+){1,2}',
		error: 'Zum Beispiel Europe/Berlin.',
		group: 'System',
	},
	{
		key: 'KEYBOARD',
		label: 'Tastaturlayout',
		hint: 'Zwei Buchstaben für dein Land (de, ch, at, fr ...). Wichtig für die Web-Konsole.',
		default: 'de',
		pattern: '[a-z]{2}',
		error: 'Zwei Kleinbuchstaben.',
		group: 'System',
	},
	{
		key: 'UPDATE_TIME',
		label: 'Uhrzeit für die automatischen Updates',
		hint: 'Wann Ubuntu Updates einspielt (HH:MM). Eine Stunde vor dem Neustart ist sinnvoll.',
		default: '03:30',
		pattern: '([01][0-9]|2[0-3]):[0-5][0-9]',
		error: 'Format HH:MM, zum Beispiel 03:30.',
		group: 'System',
	},
	{
		key: 'REBOOT_TIME',
		label: 'Uhrzeit für den automatischen Neustart',
		hint: 'Nach Kernel-Updates startet der Server dann neu (HH:MM).',
		default: '04:30',
		pattern: '([01][0-9]|2[0-3]):[0-5][0-9]',
		error: 'Format HH:MM, zum Beispiel 04:30.',
		group: 'System',
	},
	{
		key: 'DOMAIN',
		label: 'Domain für LNbits',
		hint: 'Muss per A-Eintrag auf die Server-IP zeigen.',
		default: 'lnbits.example.org',
		pattern: '([a-z0-9-]+\\.)+[a-z]{2,}',
		error: 'Eine Domain in Kleinbuchstaben, zum Beispiel lnbits.example.org.',
		group: 'Web',
	},
	{
		key: 'CADDY_USER',
		label: 'Benutzername für den Admin-Schutz von Caddy',
		hint: 'Name bei der zusätzlichen Passwortabfrage vor /admin. Nicht der LNbits-Login.',
		default: 'CaddyAuth',
		pattern: '[A-Za-z0-9_-]{1,32}',
		error: 'Buchstaben, Ziffern, _ und -.',
		group: 'Web',
	},
	{
		key: 'CADDY_HASH',
		label: 'Passwort-Hash für Caddy',
		hint: 'Ausgabe von „caddy hash-password". Wird nicht gespeichert.',
		default: 'HASH_EINFUEGEN',
		pattern: '[A-Za-z0-9$./_-]{6,120}',
		error: 'Der Hash enthält nur Buchstaben, Ziffern und $ . / _ -.',
		persist: false,
		group: 'Web',
	},
	{
		key: 'VERSION_PHOENIXD',
		label: 'phoenixd-Version',
		hint: 'Nur die Zahl ohne „v". Die aktuelle Version steht auf der Release-Seite.',
		default: '0.9.3',
		pattern: '[0-9]+(\\.[0-9]+){1,3}',
		error: 'Zum Beispiel 0.9.3.',
		group: 'Versionen',
	},
];
