/**
 * Macht Mermaid-Diagramme per Klick vergrößerbar (Dialog mit Zoom und Scrollen).
 * Mermaid rendert erst im Browser. Deshalb wird auf das <svg> in `pre.mermaid` gewartet.
 */

let dialog: HTMLDialogElement | null = null;
let stage: HTMLDivElement | null = null;
let zoom = 1;

function applyZoom() {
	const svg = stage?.querySelector('svg');
	if (svg) svg.style.width = `${Math.round(zoom * 100)}%`;
}

function buildDialog() {
	dialog = document.createElement('dialog');
	dialog.className = 'phalnx-zoom';
	dialog.setAttribute('aria-label', 'Diagramm vergrößert');
	dialog.innerHTML = `
		<div class="phalnx-zoom-bar">
			<button type="button" data-act="out" aria-label="Verkleinern">−</button>
			<button type="button" data-act="reset" aria-label="Zurücksetzen">100 %</button>
			<button type="button" data-act="in" aria-label="Vergrößern">+</button>
			<button type="button" data-act="close" aria-label="Schließen">Schließen</button>
		</div>
		<div class="phalnx-zoom-stage"></div>`;
	stage = dialog.querySelector('.phalnx-zoom-stage');
	dialog.addEventListener('click', (e) => {
		const act = (e.target as HTMLElement).closest('button')?.dataset.act;
		if (act === 'close' || e.target === dialog) dialog!.close();
		if (act === 'in') zoom = Math.min(zoom * 1.25, 4);
		if (act === 'out') zoom = Math.max(zoom / 1.25, 0.5);
		if (act === 'reset') zoom = 1;
		if (act === 'in' || act === 'out' || act === 'reset') applyZoom();
	});
	document.body.appendChild(dialog);
}

function open(svg: SVGElement) {
	if (!dialog) buildDialog();
	const clone = svg.cloneNode(true) as SVGElement;
	clone.removeAttribute('height');
	clone.style.maxWidth = 'none';
	clone.style.height = 'auto';
	stage!.replaceChildren(clone);
	zoom = 1;
	applyZoom();
	dialog!.showModal();
}

function enhance(pre: HTMLElement) {
	const svg = pre.querySelector('svg');
	if (!svg || pre.dataset.zoomReady) return;
	pre.dataset.zoomReady = '1';
	pre.classList.add('phalnx-zoomable');
	pre.tabIndex = 0;
	pre.setAttribute('role', 'button');
	pre.setAttribute('aria-label', 'Diagramm vergrößern');
	const hint = document.createElement('span');
	hint.className = 'phalnx-zoom-hint';
	hint.textContent = 'Zum Vergrößern klicken';
	pre.appendChild(hint);
	const go = () => open(pre.querySelector('svg')!);
	pre.addEventListener('click', go);
	pre.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			go();
		}
	});
}

export function initDiagramZoom() {
	const scan = () => document.querySelectorAll<HTMLElement>('pre.mermaid').forEach(enhance);
	scan();
	if (document.querySelector('pre.mermaid')) {
		new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
	}
}
