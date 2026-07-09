/**
 * storage.js — All localStorage-backed persistent state.
 *
 * Every read/write to localStorage happens through this file. Other modules
 * should go through Settings / Achievements / Scoreboard / Stats rather than
 * touching localStorage directly, so persistence stays in one auditable
 * place and easy to change (e.g. swap to IndexedDB) later without touching
 * game logic.
 */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    console.warn(`[storage] failed to load "${key}", using fallback.`, e);
    return fallback;
  }
}

function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`[storage] failed to save "${key}".`, e);
  }
}

const DIFFICULTY_TIME = { easy: 20000, medium: 15000, hard: 10000 };

const Settings = {
  data: loadJSON('saveDycson_settings', { difficulty: 'medium', questionDifficulty: 'auto', bgmVolume: 0.6, sfxVolume: 0.8, textSize: 'normal' }),

  save() { saveJSON('saveDycson_settings', this.data); },

  /** Pushes current settings values into the DOM controls and live systems. */
  apply() {
    document.documentElement.style.setProperty('--text-scale', this.data.textSize === 'large' ? '1.18' : '1');
    document.querySelectorAll('#difficulty-seg button').forEach(b => b.classList.toggle('active', b.dataset.val === this.data.difficulty));
    document.querySelectorAll('#qdifficulty-seg button').forEach(b => b.classList.toggle('active', b.dataset.val === this.data.questionDifficulty));
    document.querySelectorAll('#textsize-seg button').forEach(b => b.classList.toggle('active', b.dataset.val === this.data.textSize));

    const bgmSlider = document.getElementById('bgm-slider');
    const sfxSlider = document.getElementById('sfx-slider');
    if (bgmSlider) bgmSlider.value = Math.round(this.data.bgmVolume * 100);
    if (sfxSlider) sfxSlider.value = Math.round(this.data.sfxVolume * 100);
    const bgmVal = document.getElementById('bgm-val');
    const sfxVal = document.getElementById('sfx-val');
    if (bgmVal) bgmVal.innerText = Math.round(this.data.bgmVolume * 100) + '%';
    if (sfxVal) sfxVal.innerText = Math.round(this.data.sfxVolume * 100) + '%';

    if (window.AudioSystem) AudioSystem.setVolumes(this.data.bgmVolume, this.data.sfxVolume);
  }
};

const Achievements = {
  meta: [
    { id: 'patriarch',       icon: '🪨', name: 'The Patriarch',       desc: 'Clear Stage 1 without a single wrong answer' },
    { id: 'unshakableFaith', icon: '🔥', name: 'Unshakable Faith',    desc: 'Reach a 10-question streak' },
    { id: 'swordOfSpirit',   icon: '⚔️', name: 'Sword of the Spirit', desc: 'Answer correctly with under 1s left' },
    { id: 'transformedMind', icon: '✨', name: 'Transformed Mind',    desc: 'Accumulate 500 correct answers total' },
    { id: 'radiantSurge',    icon: '🌟', name: 'Radiant Surge',       desc: 'Trigger the Radiant Surge power-up on a 7-streak' }
  ],
  data: loadJSON('saveDycson_achievements', { patriarch: false, unshakableFaith: false, swordOfSpirit: false, transformedMind: false, radiantSurge: false }),

  unlock(id) {
    if (!this.data[id]) {
      this.data[id] = true;
      saveJSON('saveDycson_achievements', this.data);
    }
  },

  render() {
    const grid = document.getElementById('achv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.meta.forEach(a => {
      const unlocked = !!this.data[a.id];
      const card = document.createElement('div');
      card.className = 'achv-card' + (unlocked ? ' unlocked' : '');
      card.innerHTML = `<div class="achv-icon">${unlocked ? a.icon : '🔒'}</div><div class="achv-name">${a.name}</div><div class="achv-desc">${a.desc}</div>`;
      grid.appendChild(card);
    });
  }
};

const Stats = { data: loadJSON('saveDycson_stats', { totalCorrect: 0 }) };

const Scoreboard = {
  data: loadJSON('saveDycson_scores', []),

  add(name, era, score) {
    this.data.push({ name: name || 'Anonymous', era, score });
    this.data.sort((a, b) => b.score - a.score);
    this.data = this.data.slice(0, 10);
    saveJSON('saveDycson_scores', this.data);
  },

  render() {
    const rows = document.getElementById('score-rows');
    if (!rows) return;
    rows.innerHTML = '';
    if (this.data.length === 0) {
      rows.innerHTML = '<tr><td colspan="4" style="color:#666; text-align:center; padding:16px 0;">No scores yet — be the first!</td></tr>';
      return;
    }
    this.data.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>#${i + 1}</td><td>${row.name}</td><td>${row.era}</td><td>${row.score}</td>`;
      rows.appendChild(tr);
    });
  }
};