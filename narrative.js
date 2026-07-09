/**
 * narrative.js — Cinematic sequencing: the title intro and era chapter cards.
 *
 * Two independent controllers, both built on the same simple timer-chain
 * pattern (queue a series of setTimeout-driven fades, track them so they
 * can be cancelled cleanly if skipped):
 *
 *   Intro          — plays once on page load. Void (scripture quote) ->
 *                     Awakening (key art + narrative lines) -> Menu.
 *   EraTransition   — plays before each new era's first question. A short
 *                     "chapter card" with 2-3 narrative lines fades in over
 *                     black, then fades into gameplay. Every era reads like
 *                     the start of a new chapter rather than a silent
 *                     counter increment.
 */

const Intro = {
  lines: [
    "Dycson is trapped in the Ruins of Death Valley...",
    "The world's deceit has taken form: a relentless vortex of Ignorance.",
    "His only escape is forward, the word of God. To save Dycson, you must renew his mind."
  ],
  timers: [],
  skipped: false,
  done: false,

  start() {
    this.overlay = document.getElementById('intro-overlay');
    this.voidEl = document.getElementById('intro-void');
    this.keyartWrap = document.getElementById('intro-keyart-wrap');
    this.textEl = document.getElementById('intro-narrative-text');
    this.buttonsEl = document.getElementById('intro-buttons');
    this.skipBtn = document.getElementById('intro-skip');

    this.skipBtn.onclick = () => this.skipToMenu();
    document.getElementById('intro-start').onclick = () => this.finish(() => Game.start());
    document.getElementById('intro-achievements').onclick = () => this.finish(() => Game.showPanel('achievements'));
    document.getElementById('intro-scoreboard').onclick = () => this.finish(() => Game.showPanel('scoreboard'));
    document.getElementById('intro-settings').onclick = () => this.finish(() => Game.showPanel('settings'));

    this.phase1();
  },

  after(fn, ms) { const id = setTimeout(fn, ms); this.timers.push(id); },
  clearTimers() { this.timers.forEach(id => clearTimeout(id)); this.timers = []; },

  phase1() {
    this.voidEl.classList.add('show');
    this.after(() => {
      this.voidEl.classList.remove('show');
      this.after(() => this.phase2(), 900);
    }, 3000);
  },

  phase2() {
    this.keyartWrap.classList.add('show');
    const showLine = (i) => {
      if (i >= this.lines.length) { this.after(() => this.phase3(), 900); return; }
      this.textEl.classList.remove('show');
      this.after(() => {
        this.textEl.innerText = this.lines[i];
        this.textEl.classList.add('show');
        this.after(() => showLine(i + 1), 3200);
      }, 350);
    };
    this.after(() => showLine(0), 1200);
  },

  phase3() {
    this.textEl.classList.remove('show');
    this.skipBtn.style.display = 'none';
    this.after(() => {
      this.buttonsEl.classList.add('show');
      if (window.AudioSystem) AudioSystem.playTheme('menu');
    }, 500);
  },

  skipToMenu() {
    if (this.skipped || this.done) return;
    this.skipped = true;
    this.clearTimers();
    this.voidEl.classList.remove('show');
    this.keyartWrap.classList.add('show');
    this.textEl.classList.remove('show');
    this.phase3();
  },

  finish(action) {
    if (this.done) return;
    this.done = true;
    if (window.AudioSystem) AudioSystem.playTheme('menu');
    this.clearTimers();
    this.overlay.classList.add('fade-out');
    this.after(() => {
      this.overlay.style.display = 'none';
      action();
    }, 700);
  }
};

const EraTransition = {
  timers: [],
  after(fn, ms) { const id = setTimeout(fn, ms); this.timers.push(id); },
  clearTimers() { this.timers.forEach(id => clearTimeout(id)); this.timers = []; },

  /** Shows a chapter card for the given era (1-indexed), then calls onDone(). */
  show(eraIndex, onDone) {
    this.clearTimers();
    const overlay = document.getElementById('chapter-overlay');
    const title = document.getElementById('chapter-title');
    const lineEls = Array.from(document.querySelectorAll('.chapter-line'));
    const lines = (typeof ERA_NARRATIVE !== 'undefined' && ERA_NARRATIVE[eraIndex - 1]) || [];

    title.innerText = (typeof ERA_NAMES !== 'undefined' && ERA_NAMES[eraIndex - 1]) || `Era ${eraIndex}`;
    lineEls.forEach(el => { el.innerText = ''; el.classList.remove('show'); });

    overlay.style.display = 'flex';
    // force reflow so the opacity transition reliably fires
    void overlay.offsetWidth;
    overlay.classList.add('show');

    const showLine = (i) => {
      if (i >= lines.length || i >= lineEls.length) {
        this.after(() => this._finish(overlay, onDone), 1400);
        return;
      }
      lineEls[i].innerText = lines[i];
      this.after(() => lineEls[i].classList.add('show'), 60);
      this.after(() => showLine(i + 1), 1900);
    };
    this.after(() => showLine(0), 500);
  },

  _finish(overlay, onDone) {
    overlay.classList.remove('show');
    this.after(() => {
      overlay.style.display = 'none';
      if (onDone) onDone();
    }, 900);
  }
};