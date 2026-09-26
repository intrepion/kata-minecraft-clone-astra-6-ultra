type Panel = 'pause' | 'settings' | 'inventory' | 'help' | null;

const icons: Record<string, string> = {
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><path d="M9 4v6m6 4v6"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
  chevron: '<path d="m7 14 5-5 5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2M12 16h.01"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  tree: '<path d="m12 2-7 9h3l-5 6h18l-5-6h3l-7-9Zm0 15v5"/>',
  feather: '<path d="M20 4c-4-3-11 0-12 6l-1 7 7-1c6-1 9-8 6-12ZM4 20 17 7M8 12h5v5"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v7h10V3M7 21v-7h10v7"/>',
};

const icon = (name: string, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${icons[name] || icons.cube}</svg>`;

export const BLOCK_NAMES = ['Grass', 'Dirt', 'Stone', 'Oak log', 'Leaves', 'Sand', 'Oak planks', 'Brick', 'Glass'];
const BLOCK_INFO = ['A fresh start', 'Down to earth', 'Solid foundations', 'Naturally good', 'A little greenery', 'Sun-warmed shores', 'Make it a home', 'Built to last', 'Let the light in'];
const palette = [
  ['#84a757', '#78934b', '#657d3d'], ['#b18c6b', '#967357', '#7a5c45'], ['#b5b5ad', '#93968e', '#7a817a'],
  ['#bca074', '#826b47', '#68563b'], ['#8aa85d', '#70904b', '#547438'], ['#e6d4a2', '#d0bc87', '#b5a271'],
  ['#d5b380', '#b79260', '#967744'], ['#c68a75', '#aa725f', '#8b594d'], ['#c7e2dd', '#a6c9c5', '#8eb4b3'],
];

function blockIcon(index: number): string {
  const [top, left, right] = palette[index];
  const details = index === 0
    ? '<path d="m7 21 17 10v14L7 35Z" fill="#9a7d57"/><path d="m24 31 17-10v14L24 45Z" fill="#7e6548"/><path d="m7 21 17 10v5l-5-3v-2l-4-2v3l-8-5Zm17 10 17-10v6l-5 3v-2l-5 3v3l-7 4Z" fill="#76964c"/><path d="m13 35 3 2v3l-3-2m18-4 3-2v3l-3 2" fill="#b79a6c"/>'
    : index === 3
      ? '<path d="m12 21 12 7 12-7-12-7-12 7Zm5 0 7 4 7-4-7-4-7 4Z" fill="none" stroke="#907348" stroke-width="1.2"/><path d="m12 27 0 10m5-7 0 11m13-11 0 10m6-13v10" stroke="#5a492f" stroke-width="1.5"/>'
      : index === 6
        ? '<path d="m7 27 17 10 17-10M7 33l17 10 17-10M13 18l17 10M20 14l17 10m-21 8v6m16-11v6" fill="none" stroke="#8a6b3e" stroke-width="1.2" opacity=".7"/>'
        : index === 7
          ? '<path d="m7 28 17 10 17-10M7 35l17 10 17-10m-27-3v7m10-1v7m9-21v9m-18-6v6M12 18l17 10m-9-14 17 10" fill="none" stroke="#e0bba2" stroke-width="1.5"/>'
          : index === 8
            ? '<path d="m9 23 13 8v11L9 34Zm17 8 13-8v11l-13 8ZM11 20l13-7 13 7-13 8Z" fill="none" stroke="#ecfffb" stroke-width="1.6"/><path d="m12 28 6 9m12-3 6-7" stroke="#ecfffb" stroke-width="1.6" opacity=".75"/>'
            : '<path d="m14 17 4-2 4 2-4 2Zm11 6 4-2 4 2-4 2ZM11 27l4 2v3l-4-2m4 7 4 2v3l-4-2m16-7 4-2v3l-4 2" fill="white" opacity=".13"/>';
  return `<svg class="block-art" viewBox="0 0 48 48" aria-hidden="true"><path d="m7 22 17-10 17 10v16L24 48 7 38Z" fill="#172e23" opacity=".08"/><path d="m7 20 17 10v16L7 36Z" fill="${left}"/><path d="m24 30 17-10v16L24 46Z" fill="${right}"/><path d="M7 20 24 10l17 10-17 10Z" fill="${top}"/>${details}</svg>`;
}

export class GameUI {
  onAction: (action: string, value?: unknown) => void = () => {};
  private element: HTMLDivElement;
  private panel: Panel = null;
  private selected = 0;
  private muted = false;
  private daytime = true;
  private flying = false;
  private sensitivity = 1;
  private viewDistance = 70;
  private resetArmed = false;
  private toastTimeout: ReturnType<typeof setTimeout> | undefined;
  private saveTimeout: ReturnType<typeof setTimeout> | undefined;
  private abort = new AbortController();
  private focusBeforePanel: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'game-ui';
    this.element.innerHTML = `
      <div class="welcome-wash" aria-hidden="true"></div>
      <header class="game-header">
        <a class="brand" href="#" aria-label="Blockfield home" data-action="pause">
          <span class="brand-mark">${icon('cube')}</span>
          <span class="brand-copy"><span class="brand-name">BLOCKFIELD<span class="brand-dot">.</span></span><span class="brand-tagline">MAKE YOURSELF AT HOME</span></span>
        </a>
        <div class="header-actions"><span class="world-label"><span class="live-dot"></span> Meadowlands <span class="world-mode">CREATIVE</span></span><button class="icon-button sound-button" data-action="sound" aria-label="Turn sound off" title="Toggle sound">${icon('sound')}</button><button class="icon-button" data-action="settings" aria-label="Open settings" title="Settings">${icon('settings')}</button></div>
      </header>
      <section class="welcome" aria-label="Welcome to Blockfield">
        <div class="welcome-eyebrow"><span></span>A WORLD OF YOUR OWN</div>
        <h1>Small blocks.<br>Big possibilities<span class="headline-dot">.</span></h1>
        <p>A little room to wander. A whole world to create.<br class="wide-break"> Find your favorite spot, and make it yours.</p>
        <div class="welcome-buttons"><button class="button button-primary start-button" data-action="play" data-value="build">Let’s build ${icon('arrow')}</button><button class="button button-secondary" data-action="play" data-value="explore">Explore the world ${icon('compass')}</button></div>
        <div class="welcome-note"><span class="note-check">${icon('check')}</span> Your world saves as you go. Come back anytime.</div>
      </section>
      <div class="landscape-note"><span class="landscape-note-icon">${icon('tree')}</span><div><span class="note-overline">A FRESH LITTLE START</span><span>Somewhere in the Meadowlands</span></div><span class="note-coordinates">∞ POSSIBILITIES</span></div>
      <footer class="welcome-footer"><div class="footer-manifesto"><span class="tiny-star">${icon('sun')}</span> NO RULES. JUST A LITTLE IMAGINATION.</div><div class="welcome-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><span class="mouse-icon"></span> Look around</span><span><kbd>SPACE</kbd> Jump</span><button data-action="help" class="text-button">All controls ${icon('arrow')}</button></div><span class="mobile-note">Best explored with a keyboard & mouse. Touch controls also available.</span></footer>
      <div class="play-hud" aria-label="Game controls">
        <div class="position-display"><span class="position-label">YOUR LITTLE CORNER</span><span class="position-values">X <b>0</b><i></i> Y <b>0</b><i></i> Z <b>0</b></span></div>
        <div class="day-display">${icon('sun')}<span>A beautiful day</span></div>
        <div class="crosshair" aria-hidden="true"><i></i><i></i></div>
        <div class="target-name" aria-live="polite"></div>
        <div class="flight-label">${icon('feather')} FREE FLIGHT</div>
        <div class="hotbar-area"><div class="selected-block-name">Grass <span>READY TO BUILD</span></div><div class="hotbar" role="toolbar" aria-label="Building blocks">${BLOCK_NAMES.map((name, index) => `<button class="hotbar-slot ${index === 0 ? 'selected' : ''}" data-action="select" data-value="${index}" aria-label="${name}, key ${index + 1}" aria-pressed="${index === 0}"><span class="slot-number">${index + 1}</span>${blockIcon(index)}</button>`).join('')}<span class="hotbar-divider"></span><button class="inventory-button" data-action="inventory" aria-label="Open block inventory, E" title="All blocks (E)">${icon('grid')}<kbd>E</kbd></button></div></div>
        <div class="play-hint hint-left"><span class="mouse-icon left-click"></span> Break <span class="hint-divider"></span><span class="mouse-icon right-click"></span> Place</div><div class="play-hint hint-right"><button class="hud-help-button" data-action="help"><kbd>H</kbd> Controls</button><span class="hint-divider"></span><kbd>ESC</kbd> Pause</div>
        <div class="touch-controls"><div class="touch-dpad"><button class="touch-up" data-key="KeyW" aria-label="Move forward">${icon('chevron')}</button><button class="touch-left" data-key="KeyA" aria-label="Move left">${icon('chevron')}</button><button class="touch-down" data-key="KeyS" aria-label="Move backward">${icon('chevron')}</button><button class="touch-right" data-key="KeyD" aria-label="Move right">${icon('chevron')}</button></div><div class="touch-actions"><button data-action="break" aria-label="Break block">Break</button><button data-action="place" aria-label="Place block">Place</button><button data-key="Space" aria-label="Jump or fly up">↑</button><button data-key="ShiftLeft" aria-label="Fly down">↓</button><button data-action="pause" aria-label="Pause game">Pause</button><button data-action="fly" aria-label="Toggle flying">${icon('feather')}</button></div></div>
      </div>
      <div class="panel-overlay" hidden></div>
      <div class="game-toast" role="status" aria-live="polite"></div>
      <div class="save-status">${icon('check')} World saved</div>
      <div class="loading-indicator" hidden><span></span> Shaping your little world…</div>
    `;
    root.append(this.element);
    const options = { signal: this.abort.signal };
    this.element.addEventListener('click', (event) => this.handleClick(event), options);
    this.element.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.matches('input[data-setting]')) return;
      const name = target.dataset.setting!;
      const value = Number(target.value);
      if (name === 'sensitivity') this.sensitivity = value;
      else this.viewDistance = value;
      const output = target.parentElement?.querySelector('output');
      if (output) output.textContent = name === 'sensitivity' ? `${value.toFixed(1)}×` : `${value} blocks`;
      this.onAction(name, value);
    }, options);
    this.element.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('button,input,.panel-overlay,.welcome')) event.stopPropagation();
      const key = target.closest<HTMLElement>('[data-key]');
      if (key) {
        event.preventDefault();
        key.setPointerCapture(event.pointerId);
        this.onAction('touch-start', key.dataset.key);
      }
    }, options);
    for (const type of ['pointerup', 'pointercancel'] as const) {
      this.element.addEventListener(type, (event) => {
        const key = (event.target as HTMLElement).closest<HTMLElement>('[data-key]');
        if (key) this.onAction('touch-end', key.dataset.key);
      }, options);
    }
    this.element.addEventListener('keydown', (event) => {
      if (this.panel && event.key === 'Tab') {
        const focusable = this.element.querySelectorAll<HTMLElement>('.panel-overlay button:not([disabled]), .panel-overlay input');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }, options);
  }

  private handleClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!button) {
      if (event.target === this.element.querySelector('.panel-overlay')) this.onAction('close-panel');
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action!;
    if (action === 'confirm-new-world') {
      this.resetArmed = !this.resetArmed;
      this.renderPanel();
      return;
    }
    if (action === 'new-world') this.resetArmed = false;
    const raw = button.dataset.value;
    this.onAction(action, action === 'select' ? Number(raw) : raw);
  }

  setPlaying(playing: boolean): void {
    this.element.classList.toggle('is-playing', playing);
    this.element.querySelector('.welcome')?.setAttribute('aria-hidden', String(playing));
  }

  setSelected(index: number): void {
    if (index < 0 || index > 8) return;
    this.selected = index;
    this.element.querySelectorAll<HTMLElement>('[data-action="select"]').forEach((button) => {
      const selected = Number(button.dataset.value) === index;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.element.querySelector('.selected-block-name')!.innerHTML = `${BLOCK_NAMES[index]} <span>READY TO BUILD</span>`;
  }

  setPosition(x: number, y: number, z: number): void {
    const values = this.element.querySelectorAll('.position-values b');
    [x, y, z].forEach((value, i) => { values[i].textContent = String(Math.floor(value)); });
  }

  setTarget(name: string | null): void {
    const label = this.element.querySelector<HTMLElement>('.target-name')!;
    label.textContent = name || '';
    label.classList.toggle('visible', !!name);
  }

  setFlying(flying: boolean): void {
    this.flying = flying;
    this.element.querySelector('.flight-label')?.classList.toggle('visible', flying);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const button = this.element.querySelector('.sound-button')!;
    button.innerHTML = icon(muted ? 'mute' : 'sound');
    button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    if (this.panel === 'settings') this.renderPanel();
  }

  setSaved(): void {
    const status = this.element.querySelector('.save-status')!;
    status.classList.add('visible');
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => status.classList.remove('visible'), 2200);
  }

  toast(message: string): void {
    const toast = this.element.querySelector<HTMLElement>('.game-toast')!;
    toast.replaceChildren();
    const check = document.createElement('span');
    check.innerHTML = icon('check');
    toast.append(check, document.createTextNode(message));
    toast.classList.add('visible');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  showPanel(panel: Panel): void {
    if (panel && !this.panel) this.focusBeforePanel = document.activeElement as HTMLElement;
    this.panel = panel;
    this.resetArmed = false;
    this.renderPanel();
    if (panel) this.element.querySelector<HTMLElement>('.panel-overlay button')?.focus();
    else this.focusBeforePanel?.focus({ preventScroll: true });
  }

  setDaytime(isDay: boolean): void {
    this.daytime = isDay;
    this.element.classList.toggle('is-night', !isDay);
    this.element.querySelector('.day-display')!.innerHTML = `${icon(isDay ? 'sun' : 'moon')}<span>${isDay ? 'A beautiful day' : 'Under the stars'}</span>`;
    if (this.panel === 'settings') this.renderPanel();
  }

  setLoading(loading: boolean): void {
    this.element.querySelector<HTMLElement>('.loading-indicator')!.hidden = !loading;
    this.element.querySelectorAll<HTMLButtonElement>('[data-action="play"]').forEach((button) => { button.disabled = loading; });
  }

  private renderPanel(): void {
    const container = this.element.querySelector<HTMLDivElement>('.panel-overlay')!;
    container.hidden = !this.panel;
    if (!this.panel) { container.innerHTML = ''; return; }
    const title = { pause: 'Take a little breather.', settings: 'Make yourself comfortable.', inventory: 'Good things come in blocks.', help: 'A little nudge to get started.' }[this.panel];
    const label = { pause: 'WORLD PAUSED', settings: 'YOUR PREFERENCES', inventory: 'THE BUILDING BLOCKS', help: 'A FIELD GUIDE' }[this.panel];
    let body = '';
    if (this.panel === 'pause') {
      body = `<p class="panel-description">Your world will be right here.</p><div class="pause-buttons"><button class="button button-primary" data-action="resume">Back to the good stuff ${icon('arrow')}</button><button class="button button-secondary" data-action="settings">${icon('settings')} Settings</button><button class="button button-secondary" data-action="help">${icon('help')} How to play</button></div><div class="panel-footnote">${icon('save')} Built with care. Saved automatically.</div>`;
    } else if (this.panel === 'inventory') {
      body = `<p class="panel-description">Everything you need. An endless supply.</p><div class="inventory-grid">${BLOCK_NAMES.map((name, i) => `<button class="inventory-card ${i === this.selected ? 'selected' : ''}" data-action="select" data-value="${i}" aria-pressed="${i === this.selected}"><kbd>${i + 1}</kbd>${blockIcon(i)}<strong>${name}</strong><span>${BLOCK_INFO[i]}</span></button>`).join('')}</div><div class="panel-footnote">Choose a block, then return to your world to place it.</div>`;
    } else if (this.panel === 'settings') {
      body = `<p class="panel-description">A few small things to make this world feel like yours.</p><div class="settings-list"><div class="setting-row"><div><strong>Sounds of the world</strong><span>A little atmosphere as you build.</span></div><button class="toggle ${!this.muted ? 'on' : ''}" data-action="sound" role="switch" aria-checked="${!this.muted}" aria-label="World sounds"><span></span></button></div><div class="setting-row"><div><strong>Time of day</strong><span>Set the mood for your next creation.</span></div><button class="setting-pill" data-action="daytime">${icon(this.daytime ? 'sun' : 'moon')}${this.daytime ? 'Daylight' : 'Moonlight'}</button></div><label class="range-setting"><span><strong>Look sensitivity</strong><output>${this.sensitivity.toFixed(1)}×</output></span><input type="range" min="0.3" max="2" step="0.1" value="${this.sensitivity}" data-setting="sensitivity" aria-label="Look sensitivity"></label><label class="range-setting"><span><strong>View distance</strong><output>${this.viewDistance} blocks</output></span><input type="range" min="30" max="100" step="10" value="${this.viewDistance}" data-setting="view-distance" aria-label="View distance"></label></div><div class="reset-section">${this.resetArmed ? `<div class="reset-confirmation"><strong>Start fresh?</strong><p>This replaces your saved world and everything you’ve built. It can’t be undone.</p><div><button class="button button-danger" data-action="new-world">Yes, create a new world</button><button class="text-button" data-action="confirm-new-world">Keep my world</button></div></div>` : `<span>A blank canvas, a new beginning.</span><button class="text-button reset-button" data-action="confirm-new-world">Create a new world ${icon('arrow')}</button>`}</div>`;
    } else {
      body = `<p class="panel-description">Wander a while. Build something wonderful.</p><div class="control-grid"><div><span>Move around</span><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div><div><span>Look around</span><div><span class="mouse-icon"></span> Mouse</div></div><div><span>Jump / fly up</span><div><kbd>SPACE</kbd></div></div><div><span>Fly down</span><div><kbd>SHIFT</kbd></div></div><div><span>Break a block</span><div><span class="mouse-icon left-click"></span> Left click</div></div><div><span>Place a block</span><div><span class="mouse-icon right-click"></span> Right click</div></div><div><span>Choose a block</span><div><kbd>1</kbd>–<kbd>9</kbd> / Scroll</div></div><div><span>Free flight</span><div><kbd>F</kbd></div></div><div><span>All your blocks</span><div><kbd>E</kbd></div></div><div><span>Take a breather</span><div><kbd>ESC</kbd></div></div></div><div class="field-note">${icon('feather')} A builder’s tip: switch on free flight to see the bigger picture.</div>`;
    }
    container.innerHTML = `<section class="game-panel panel-${this.panel}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="panel-close icon-button" data-action="close-panel" aria-label="Close dialog">${icon('close')}</button><div class="panel-eyebrow">${label}</div><h2 id="panel-title">${title}</h2>${body}</section>`;
  }

  destroy(): void {
    this.abort.abort();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.element.remove();
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
  }
}
