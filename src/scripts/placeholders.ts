import type { PlaceholderField } from '../config/placeholders';

/**
 * Client-Logik für „Meine Werte":
 * - ersetzt `__SCHLUESSEL__` in Text und Codeblöcken durch den Wert des Lesers,
 * - aktualisiert auch den Kopier-Knopf (data-code) der Codeblöcke,
 * - speichert die Werte nur im Browser (localStorage), nie auf einem Server.
 */

interface Config {
	fields: PlaceholderField[];
	groups: string[];
}

const STORAGE_KEY = 'phalnx-values-v1';
const TOKEN = /__([A-Z][A-Z0-9_]*)__/g;

let started = false;

function readStore(): Record<string, string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(values: Record<string, string>, fields: PlaceholderField[]) {
	try {
		const toSave: Record<string, string> = {};
		for (const f of fields) {
			if (f.persist === false) continue;
			if (values[f.key] !== f.default) toSave[f.key] = values[f.key];
		}
		if (Object.keys(toSave).length === 0) localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
	} catch {
		/* privater Modus o. Ä.: ohne Speicher weiterarbeiten */
	}
}

export function initPlaceholders() {
	if (started) return;
	started = true;

	const host = document.querySelector<HTMLElement>('phalnx-values[data-config]');
	if (!host) return;
	const config: Config = JSON.parse(host.dataset.config ?? '{}');
	const fields = config.fields;
	const byKey = new Map(fields.map((f) => [f.key, f]));
	const matchers = new Map(fields.map((f) => [f.key, new RegExp(`^(?:${f.pattern})$`)]));

	// Werte: Standard, überschrieben durch gespeicherte (nur gültige).
	const values: Record<string, string> = {};
	const stored = readStore();
	for (const f of fields) {
		const s = stored[f.key];
		values[f.key] = typeof s === 'string' && matchers.get(f.key)!.test(s) ? s : f.default;
	}

	const value = (key: string) => values[key] ?? `__${key}__`;
	const spans = new Map<string, HTMLElement[]>();
	const buttons: { el: HTMLElement; orig: string }[] = [];

	// 1. Text in der Seite: jedes Token wird zu <span class="phalnx-val">.
	const root = document.querySelector('main') ?? document.body;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const p = node.parentElement;
			if (!p || p.closest('script, style, textarea, input, dialog, phalnx-values')) {
				return NodeFilter.FILTER_REJECT;
			}
			return node.nodeValue && node.nodeValue.includes('__')
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_REJECT;
		},
	});
	const nodes: Text[] = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);

	for (const node of nodes) {
		const text = node.nodeValue ?? '';
		TOKEN.lastIndex = 0;
		if (![...text.matchAll(TOKEN)].some((m) => byKey.has(m[1]))) continue;
		const frag = document.createDocumentFragment();
		let last = 0;
		for (const m of text.matchAll(TOKEN)) {
			if (!byKey.has(m[1])) continue;
			const start = m.index ?? 0;
			if (start > last) frag.append(text.slice(last, start));
			const span = document.createElement('span');
			span.className = 'phalnx-val';
			span.dataset.key = m[1];
			span.textContent = value(m[1]);
			(spans.get(m[1]) ?? spans.set(m[1], []).get(m[1])!).push(span);
			frag.append(span);
			last = start + m[0].length;
		}
		if (last < text.length) frag.append(text.slice(last));
		node.replaceWith(frag);
	}

	// 2. Kopier-Knöpfe der Codeblöcke (Expressive Code liest data-code).
	document.querySelectorAll<HTMLElement>('main button[data-code]').forEach((el) => {
		const orig = el.dataset.code ?? '';
		if (/__[A-Z][A-Z0-9_]*__/.test(orig)) buttons.push({ el, orig });
	});

	const render = () => {
		for (const [key, list] of spans) for (const s of list) s.textContent = value(key);
		for (const b of buttons) {
			b.el.dataset.code = b.orig.replace(TOKEN, (all, key: string) =>
				byKey.has(key) ? value(key) : all,
			);
		}
	};
	render();

	// 3. Dialog
	let dialog: HTMLDialogElement | null = null;

	function buildDialog(): HTMLDialogElement {
		const d = document.createElement('dialog');
		d.className = 'phalnx-dialog';
		d.setAttribute('aria-labelledby', 'phalnx-dialog-title');

		const form = document.createElement('form');
		form.method = 'dialog';
		form.noValidate = true;

		const h = document.createElement('h2');
		h.id = 'phalnx-dialog-title';
		h.textContent = 'Meine Werte';
		const intro = document.createElement('p');
		intro.className = 'phalnx-intro';
		intro.textContent =
			'Passe die Werte an. Sie ersetzen die hervorgehobenen Stellen in allen Befehlen und im Kopier-Knopf. Gespeichert wird nur in deinem Browser, nichts geht an einen Server.';
		form.append(h, intro);

		for (const group of config.groups) {
			const gf = fields.filter((f) => f.group === group);
			if (gf.length === 0) continue;
			const fs = document.createElement('fieldset');
			const lg = document.createElement('legend');
			lg.textContent = group;
			fs.append(lg);
			for (const f of gf) {
				const wrap = document.createElement('div');
				wrap.className = 'phalnx-field';
				const id = `phalnx-f-${f.key}`;
				const label = document.createElement('label');
				label.htmlFor = id;
				label.textContent = f.label;
				const input = document.createElement('input');
				input.id = id;
				input.type = 'text';
				input.value = values[f.key];
				input.autocomplete = 'off';
				input.spellcheck = false;
				input.setAttribute('autocapitalize', 'off');
				input.dataset.key = f.key;
				const hint = document.createElement('small');
				hint.id = `${id}-hint`;
				hint.textContent = f.hint;
				const err = document.createElement('small');
				err.className = 'phalnx-error';
				err.id = `${id}-err`;
				err.hidden = true;
				input.setAttribute('aria-describedby', `${hint.id} ${err.id}`);
				input.addEventListener('input', () => {
					const v = input.value.trim();
					if (matchers.get(f.key)!.test(v)) {
						input.removeAttribute('aria-invalid');
						err.hidden = true;
						values[f.key] = v;
						writeStore(values, fields);
						render();
					} else {
						input.setAttribute('aria-invalid', 'true');
						err.textContent = f.error;
						err.hidden = false;
					}
				});
				wrap.append(label, input, hint, err);
				fs.append(wrap);
			}
			form.append(fs);
		}

		const actions = document.createElement('div');
		actions.className = 'phalnx-actions';
		const reset = document.createElement('button');
		reset.type = 'button';
		reset.textContent = 'Zurücksetzen';
		reset.addEventListener('click', () => {
			for (const f of fields) values[f.key] = f.default;
			writeStore(values, fields);
			d.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((i) => {
				i.value = values[i.dataset.key!];
				i.removeAttribute('aria-invalid');
				(i.parentElement?.querySelector('.phalnx-error') as HTMLElement).hidden = true;
			});
			render();
		});
		const close = document.createElement('button');
		close.type = 'submit';
		close.className = 'phalnx-primary';
		close.textContent = 'Schließen';
		actions.append(reset, close);
		form.append(actions);
		d.append(form);

		d.addEventListener('click', (e) => {
			if (e.target === d) d.close();
		});
		document.body.append(d);
		return d;
	}

	document.addEventListener('click', (e) => {
		const btn = (e.target as Element | null)?.closest('.phalnx-values-btn');
		if (!btn) return;
		dialog ??= buildDialog();
		dialog.showModal();
	});
}
