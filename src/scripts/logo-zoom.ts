/**
 * Das Logo auf der Startseite lässt sich per Klick in voller Auflösung ansehen.
 * Es passt sich zuerst dem Bildschirm an, ein Klick auf „100 %" zeigt die volle Größe zum Scrollen.
 * Die Vollbild-Datei liegt in `public/`, denn Astro verkleinert das eingebundene Bild auf die Anzeigegröße.
 */
const FULL_SRC = '/phalnx-logo-full.webp';

let dialog: HTMLDialogElement | null = null;
let img: HTMLImageElement | null = null;

function setFit(fit: boolean) {
	if (!dialog || !img) return;
	dialog.classList.toggle('is-fit', fit);
	dialog.querySelector<HTMLElement>('[data-act="toggle"]')!.textContent = fit ? '100 %' : 'Einpassen';
	img.style.cursor = fit ? 'zoom-in' : 'zoom-out';
}

function build(alt: string) {
	dialog = document.createElement('dialog');
	dialog.className = 'phalnx-zoom phalnx-logo-zoom is-fit';
	dialog.setAttribute('aria-label', 'Logo vergrößert');
	dialog.innerHTML = `
		<div class="phalnx-zoom-bar">
			<button type="button" data-act="toggle">100 %</button>
			<button type="button" data-act="close">Schließen</button>
		</div>
		<div class="phalnx-zoom-stage"><img src="${FULL_SRC}" alt=""></div>`;
	img = dialog.querySelector('img');
	img!.alt = alt;
	dialog.addEventListener('click', (e) => {
		const t = e.target as HTMLElement;
		const act = t.closest('button')?.dataset.act;
		if (act === 'close' || t === dialog || t.classList.contains('phalnx-zoom-stage')) dialog!.close();
		else if (act === 'toggle' || t === img) setFit(!dialog!.classList.contains('is-fit'));
	});
	document.body.appendChild(dialog);
}

export function initLogoZoom() {
	const logo = document.querySelector<HTMLImageElement>('.hero > img');
	if (!logo) return;
	logo.style.cursor = 'zoom-in';
	logo.tabIndex = 0;
	logo.setAttribute('role', 'button');
	logo.title = 'Zum Vergrößern klicken';
	const open = () => {
		if (!dialog) build(logo.alt);
		setFit(true);
		dialog!.showModal();
	};
	logo.addEventListener('click', open);
	logo.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open();
		}
	});
}
