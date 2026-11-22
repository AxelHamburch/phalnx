// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://phalnx.21mio.space',
	integrations: [
		mermaid({ autoTheme: true }),
		starlight({
			title: 'Phalnx',
			favicon: '/favicon.png',
			description:
				'Lightning-Server auf dem eigenen VPS: phoenixd, Alby Hub, LNbits und Caddy sicher einrichten und betreiben.',
			// Nur Deutsch. Weitere Sprachen später unter `locales` ergänzen (z. B. en) und die Seiten
			// nach src/content/docs/en/ spiegeln.
			defaultLocale: 'root',
			locales: {
				root: { label: 'Deutsch', lang: 'de' },
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/AxelHamburch/phalnx' },
			],
			components: {
				// Fügt den Knopf „Meine Werte" in die Kopfzeile ein.
				ThemeSelect: './src/components/ThemeSelect.astro',
					// Spenden-Symbol, „build: <Blockhöhe>" und GitHub-Symbol in der Kopfzeile.
					SocialIcons: './src/components/SocialIcons.astro',
			},
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Einstieg',
					items: [
						{ label: 'Sicherheit und Vorteile', slug: 'start/security' },
						{ label: 'Wozu welche Anwendung?', slug: 'start/applications' },
						{ label: 'Überblick und Architektur', slug: 'start/overview' },
						{ label: 'Vorbereitung und Bedienung', slug: 'start/preparation' },
					],
				},
				{
					label: 'Teil A: Server-Grundlage',
					items: [
						{ label: 'Erste Anmeldung und Updates', slug: 'server/first-login' },
						{ label: 'Swap und Tastaturlayout', slug: 'server/swap-keyboard' },
						{ label: 'Admin-Benutzer', slug: 'server/admin-user' },
						{ label: 'SSH-Schlüssel', slug: 'server/ssh-keys' },
						{ label: 'SSH härten und Firewall', slug: 'server/ssh-hardening' },
						{ label: 'Fail2ban für SSH', slug: 'server/fail2ban-ssh' },
						{ label: 'Automatische Updates', slug: 'server/auto-updates' },
						{ label: 'Dienst-Benutzer', slug: 'server/service-users' },
					],
				},
				{
					label: 'Teil B: Dienste',
					items: [
						{ label: 'SSH-Tunnel', slug: 'services/tunnel' },
						{ label: 'phoenixd', slug: 'services/phoenixd' },
						{ label: 'Alby Hub', slug: 'services/albyhub' },
						{ label: 'Lokaler Relay (strfry)', slug: 'services/relay' },
						{ label: 'LNbits', slug: 'services/lnbits' },
						{ label: 'Caddy', slug: 'services/caddy' },
						{ label: 'Fail2ban für LNbits', slug: 'services/fail2ban-web' },
						{ label: 'Port-Regeln pro Benutzer', slug: 'services/port-rules' },
					],
				},
				{
					label: 'Teil C: Abnahme und Betrieb',
					items: [
						{ label: 'Neustart-Test', slug: 'operations/reboot-test' },
						{ label: 'Prüfliste', slug: 'operations/checklist' },
						{ label: 'Updates durchführen', slug: 'operations/updates' },
						{ label: 'Geheimnisse und Backups', slug: 'operations/secrets' },
						{ label: 'Alltag', slug: 'operations/daily-use' },
						{ label: 'Notfall und Fehlersuche', slug: 'operations/emergency' },
					],
				},
					{
						label: 'Teil D: Optional',
						items: [
							{ label: 'Telegram-Benachrichtigungen', slug: 'optional/telegram' },
							{ label: 'Nächtliches Backup', slug: 'optional/backup' },
							{ label: 'Backups extern sichern', slug: 'optional/backup-external' },
							{ label: 'Backups in AWS sichern', slug: 'optional/backup-aws' },
							{ label: 'Externe Backups wiederherstellen', slug: 'optional/backup-restore' },
						],
					},
			],
		}),
	],
});
