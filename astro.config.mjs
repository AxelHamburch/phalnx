// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Phalnx',
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
			},
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Einstieg',
					items: [
						{ label: 'Sicherheit und Vorteile', slug: 'start/sicherheit' },
						{ label: 'Überblick und Architektur', slug: 'start/ueberblick' },
						{ label: 'Vorbereitung und Bedienung', slug: 'start/vorbereitung' },
					],
				},
				{
					label: 'Teil A: Server-Grundlage',
					items: [
						{ label: 'Erste Anmeldung und Updates', slug: 'server/erste-anmeldung' },
						{ label: 'Swap und Tastaturlayout', slug: 'server/swap-tastatur' },
						{ label: 'Admin-Benutzer', slug: 'server/admin-benutzer' },
						{ label: 'SSH-Schlüssel', slug: 'server/ssh-schluessel' },
						{ label: 'SSH härten und Firewall', slug: 'server/ssh-haertung' },
						{ label: 'Fail2ban für SSH', slug: 'server/fail2ban-ssh' },
						{ label: 'Automatische Updates', slug: 'server/auto-updates' },
						{ label: 'Dienst-Benutzer', slug: 'server/dienst-benutzer' },
					],
				},
				{
					label: 'Teil B: Dienste',
					items: [
						{ label: 'SSH-Tunnel', slug: 'dienste/tunnel' },
						{ label: 'phoenixd', slug: 'dienste/phoenixd' },
						{ label: 'Alby Hub', slug: 'dienste/albyhub' },
						{ label: 'Lokaler Relay (strfry)', slug: 'dienste/relay' },
						{ label: 'LNbits', slug: 'dienste/lnbits' },
						{ label: 'Caddy', slug: 'dienste/caddy' },
						{ label: 'Fail2ban für LNbits', slug: 'dienste/fail2ban-web' },
						{ label: 'Port-Regeln pro Benutzer', slug: 'dienste/port-regeln' },
					],
				},
				{
					label: 'Teil C: Abnahme und Betrieb',
					items: [
						{ label: 'Neustart-Test', slug: 'betrieb/neustart-test' },
						{ label: 'Prüfliste', slug: 'betrieb/pruefliste' },
						{ label: 'Updates durchführen', slug: 'betrieb/updates' },
						{ label: 'Geheimnisse und Backups', slug: 'betrieb/geheimnisse' },
						{ label: 'Alltag', slug: 'betrieb/alltag' },
						{ label: 'Notfall und Fehlersuche', slug: 'betrieb/notfall' },
					],
				},
			],
		}),
	],
});
