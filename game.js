/**
 * game.js — Main game engine.
 *
 * Owns: canvas rendering (parallax background, atmosphere particles, the
 * Dycson sprite, the Enemy), the question/stronghold flow (3-attempt retry
 * rule), era progression (punctuated by EraTransition chapter cards), and
 * all panel wiring for the bottom "Mind" UI. Reads reference data from
 * data.js, generates questions via questions.js, persists via storage.js,
 * scores audio via audio.js, and delegates the Darkness simulation to
 * enemy.js.
 *
 * Visual growth & power-ups:
 *   - `sizeLevel` grows by 1 on every correct answer/stronghold win (capped
 *     at `maxSizeLevel`) and shrinks by 1 on a miss, driving a subtle scale
 *     boost on Dycson's sprite — he visibly grows sturdier as the streak
 *     builds and shrinks back under repeated doubt.
 *   - `shields` (existing Armor of Light mechanic) now renders as rotating
 *     cyan rings around Dycson, not just a HUD badge.
 *   - Every 7th streak triggers a one-time "Radiant Surge": a expanding
 *     golden burst ring plus an extra shove against the Darkness.
 */

const Game = {
  canvas: null, ctx: null, width: 0, height: 0,
  state: 'menu', // menu, settings, achievements, scoreboard, howtoplay, playing, question, stronghold, gameover, victory
  era: 1, lightLevel: 40, streak: 0, shields: 0, sessionScore: 0, eraOneWrongCount: 0,
  questionsInEra: 0, questionsPerEra: 10,

  dycsonX: 0, dycsonY: 0, glow: 0, runPhase: 0, bgOffset: 0,
  parallax: { far: [], mid: [], near: [] },
  atmosphereParticles: [],

  // Sprite growth: 0..maxSizeLevel, translated into a scale multiplier in drawDycson().
  sizeLevel: 0, maxSizeLevel: 8,
  // Brief "pop" overshoot played on top of the steady-state growth scale whenever
  // sizeLevel changes, so growth is an obvious moment, not just a slow drift.
  growPulseTimer: 0, maxGrowPulse: 14,
  // Shield ring rotation angle (radians), advances every frame while shields > 0.
  shieldRotation: 0,
  // Radiant Surge burst: counts down from maxSurge to 0 while the effect plays.
  surgeTimer: 0, maxSurge: 45,
  // Brief DOM screen-edge flash on answer feedback (green/red), decremented each frame.
  flashTimer: 0, maxFlashTimer: 16,

  // NOTE: frameCount is set to a placeholder (1) here because this object literal
  // is evaluated as soon as game.js is parsed — before CONFIG is guaranteed to be
  // ready in some load orders. The real value is assigned from CONFIG.SPRITE_FRAME_COUNT
  // inside init(), which runs after all scripts (including the CONFIG-defining inline
  // script) have loaded.
  sprite: { img: new Image(), loaded: false, frameCount: 1, frameW: 0, frameH: 0 },

  timerInterval: null, timeLeft: 0, maxTime: 10000,
  currentQuestion: null, currentStronghold: null, selectedStack: [],
  questionWrongAttempts: 0, strongholdWrongAttempts: 0, resolvingStronghold: false,
  // Captures what to resume into ({panel, elementId, callback}) whenever the player pauses
  // mid-question or mid-Stronghold, so unpausing continues the same round instead of restarting.
  pausedState: null,
  // Bible Learning Mode: while a post-answer feedback panel is showing, `showingFeedback`
  // blocks pausing (nothing to resume mid-explanation), and `pendingContinue` holds the
  // function the Continue button should run once the player has read the explanation.
  showingFeedback: false, pendingContinue: null,

  // ---------------- Bootstrapping ----------------

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.setVH();
    window.addEventListener('resize', () => { this.setVH(); this.resize(); });
    window.addEventListener('orientationchange', () => { this.setVH(); this.resize(); });
    this.resize();

    this.sprite.frameCount = CONFIG.SPRITE_FRAME_COUNT;
    this.sprite.img.onload = () => {
      this.sprite.loaded = true;
      this.sprite.frameW = this.sprite.img.naturalWidth / this.sprite.frameCount;
      this.sprite.frameH = this.sprite.img.naturalHeight;
    };
    this.sprite.img.onerror = () => { this.sprite.loaded = false; };
    this.sprite.img.src = CONFIG.SPRITE_PATH;

    AudioSystem.init();
    this.bindUI();
    Settings.apply();
    Achievements.render();
    Scoreboard.render();
    this.generateParallaxLayers();
    this.generateAtmosphere();
    Enemy.reset(this.height);
    this.loop();
  },

  setVH() { document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`); },

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    this.canvas.width = this.width; this.canvas.height = this.height;
    this.dycsonX = this.width * 0.6;
    this.dycsonY = this.height * 0.68;
    this.generateParallaxLayers();
    this.generateAtmosphere();
    Enemy.resize(this.height);
  },

  bindUI() {
    document.getElementById('menu-start').onclick = () => this.start();
    document.getElementById('menu-howtoplay').onclick = () => this.showPanel('howtoplay');
    document.getElementById('howtoplay-back').onclick = () => this.showPanel('menu');
    document.getElementById('menu-achievements').onclick = () => this.showPanel('achievements');
    document.getElementById('menu-scoreboard').onclick = () => this.showPanel('scoreboard');
    document.getElementById('menu-settings').onclick = () => this.showPanel('settings');
    document.getElementById('settings-back').onclick = () => this.showPanel('menu');
    document.getElementById('achv-back').onclick = () => this.showPanel('menu');
    document.getElementById('score-back').onclick = () => this.showPanel('menu');
    document.getElementById('restart-btn').onclick = () => this.start();
    document.getElementById('gameover-menu-btn').onclick = () => this.showPanel('menu');
    document.getElementById('save-score-btn').onclick = () => this.saveScore();
    document.getElementById('victory-menu-btn').onclick = () => this.showPanel('menu');
    document.getElementById('victory-save-score-btn').onclick = () => this.saveScore(true);
    document.getElementById('submit-stronghold').onclick = () => this.checkStronghold();
    document.getElementById('pause-btn').onclick = () => this.togglePause();
    document.getElementById('paused-resume-btn').onclick = () => this.resumeGame();
    document.getElementById('paused-restart-btn').onclick = () => { this.pausedState = null; this.start(); };
    document.getElementById('paused-menu-btn').onclick = () => { this.pausedState = null; this.showPanel('menu'); };

    document.querySelectorAll('#difficulty-seg button').forEach(b => b.onclick = () => {
      Settings.data.difficulty = b.dataset.val; Settings.save(); Settings.apply();
    });
    document.querySelectorAll('#qdifficulty-seg button').forEach(b => b.onclick = () => {
      Settings.data.questionDifficulty = b.dataset.val; Settings.save(); Settings.apply();
    });
    document.querySelectorAll('#textsize-seg button').forEach(b => b.onclick = () => {
      Settings.data.textSize = b.dataset.val; Settings.save(); Settings.apply();
    });
    document.getElementById('bgm-slider').oninput = (e) => {
      Settings.data.bgmVolume = e.target.value / 100; Settings.save(); Settings.apply();
    };
    document.getElementById('sfx-slider').oninput = (e) => {
      Settings.data.sfxVolume = e.target.value / 100; Settings.save(); Settings.apply();
    };
    document.getElementById('question-continue-btn').onclick = () => this.runPendingContinue();
    document.getElementById('stronghold-continue-btn').onclick = () => this.runPendingContinue();
  },

  triggerFlash(kind) {
    const el = document.getElementById('screen-flash');
    if (!el) return;
    el.classList.remove('flash-correct', 'flash-wrong');
    // force reflow so re-triggering the same class restarts the CSS transition
    void el.offsetWidth;
    el.classList.add(kind === 'correct' ? 'flash-correct' : 'flash-wrong');
    this.flashTimer = this.maxFlashTimer;
  },

  runPendingContinue() {
    if (!this.pendingContinue) return;
    const cb = this.pendingContinue;
    this.pendingContinue = null;
    this.showingFeedback = false;
    document.getElementById('question-feedback').classList.remove('show');
    document.getElementById('stronghold-feedback').classList.remove('show');
    cb();
  },

  /** Bible Learning Mode — miss only: correct answers advance seamlessly with no
   *  interruption, but a wrong/out-of-attempts/timeout answer shows the correct
   *  answer's explanation plus its scripture reference, and waits for the player
   *  to tap Continue before advancing, so the reference actually gets read. */
  showMissFeedback(prefix, question, onContinue) {
    this.showingFeedback = true;
    this.pendingContinue = onContinue;
    const panel = document.getElementById(prefix + '-feedback');
    panel.classList.remove('feedback-correct');
    panel.classList.add('feedback-wrong', 'show');
    document.getElementById(prefix + '-feedback-headline').innerText = '📖 Here\'s the answer';
    document.getElementById(prefix + '-feedback-explanation').innerText = question.explanation || '';
    document.getElementById(prefix + '-feedback-reference').innerText = question.reference ? `📍 ${question.reference}` : '';
    document.getElementById(prefix + '-feedback-encourage').innerText = "Don't worry — every miss is a chance to learn. Keep going!";
  },

  showPanel(name) {
    this.state = name;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('panel-' + name);
    if (el) el.classList.add('active');
    document.getElementById('hud').style.display = (name === 'question' || name === 'stronghold') ? 'flex' : 'none';
    if (name === 'achievements') Achievements.render();
    if (name === 'scoreboard') Scoreboard.render();
    if (name === 'menu') AudioSystem.playTheme('menu');
  },

  togglePause() {
    if (this.showingFeedback) return; // nothing to pause mid-explanation; Continue still works
    if (this.state === 'question' || this.state === 'stronghold') {
      clearInterval(this.timerInterval);
      const elementId = this.state === 'question' ? 'timer-fill' : 'timer-fill-sh';
      const callback = this.state === 'question'
        ? () => this.answerQuestion(-1)
        : () => this.checkStronghold(true);
      // timeLeft/maxTime are already tracked live on Game, so we just remember which
      // panel and timer callback to hand back to resumeGame() — no round state is lost.
      this.pausedState = { panel: this.state, elementId, callback };
      this.showPanel('paused');
    }
  },

  /** Restores whichever round was in progress when the player paused, continuing
   *  the countdown from exactly where it left off rather than restarting it. */
  resumeGame() {
    if (!this.pausedState) { this.showPanel('menu'); return; }
    const { panel, elementId, callback } = this.pausedState;
    this.pausedState = null;
    this.showPanel(panel);
    this.startTimer(elementId, callback);
  },

  // ---------------- Parallax ----------------

  generateParallaxLayers() {
    const w = this.width || 300;
    const mk = (count, ySpread) => {
      const arr = [];
      for (let i = 0; i < count; i++) arr.push({ x: (i / count) * w * 2 + (Math.random() * 80 - 40), y: ySpread.min + Math.random() * (ySpread.max - ySpread.min), size: 24 + Math.random() * 40 });
      return arr;
    };
    this.parallax.far = mk(9, { min: this.height * 0.30, max: this.height * 0.5 });
    this.parallax.mid = mk(6, { min: this.height * 0.45, max: this.height * 0.62 });
    this.parallax.near = mk(12, { min: this.height * 0.68, max: this.height * 0.9 });
  },

  // ---------------- Atmosphere (per-era ambient particles) ----------------

  /** Rebuilds the ambient particle field to match the current era's ERA_ATMOSPHERE config. */
  generateAtmosphere() {
    const cfg = ERA_ATMOSPHERE[this.era - 1];
    if (!cfg) { this.atmosphereParticles = []; return; }
    const w = this.width || 300, h = this.height || 150;
    const arr = [];
    for (let i = 0; i < cfg.density; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
        speed: cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin),
        phase: Math.random() * Math.PI * 2,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
    this.atmosphereParticles = arr;
  },

  updateAtmosphere() {
    const cfg = ERA_ATMOSPHERE[this.era - 1];
    if (!cfg) return;
    const w = this.width || 300, h = this.height || 150;
    this.atmosphereParticles.forEach(p => {
      p.phase += 0.02;
      if (cfg.drift === 'up') {
        p.y -= p.speed;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      } else if (cfg.drift === 'down') {
        p.y += p.speed;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
      } else if (cfg.drift === 'side') {
        p.x -= p.speed * 2;
        if (p.x < -10) { p.x = w + 10; p.y = Math.random() * h; }
      } else if (cfg.drift === 'twinkle') {
        p.twinklePhase += 0.05;
      }
      if (cfg.drift !== 'side') p.x += Math.sin(p.phase) * 0.2; // gentle horizontal sway
    });
  },

  drawAtmosphere() {
    const ctx = this.ctx;
    const cfg = ERA_ATMOSPHERE[this.era - 1];
    if (!cfg) return;
    this.atmosphereParticles.forEach(p => {
      let alpha = 0.5;
      if (cfg.drift === 'twinkle') alpha = 0.3 + 0.5 * Math.abs(Math.sin(p.twinklePhase));
      ctx.fillStyle = `rgba(${cfg.color},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  // ---------------- Game flow ----------------

  start() {
    this.state = 'playing';
    this.era = 1; this.lightLevel = 40; this.streak = 0; this.shields = 0;
    this.sessionScore = 0; this.eraOneWrongCount = 0;
    this.questionsInEra = 0;
    this.sizeLevel = 0; this.surgeTimer = 0;
    this.generateParallaxLayers();
    this.generateAtmosphere();
    Enemy.reset(this.height);
    AudioSystem.startAmbient();
    document.getElementById('hud').style.display = 'flex';
    this.updateHUD();
    this.enterEra(1, () => this.nextRound());
  },

  /** Shows the chapter card for an era (skipped visually only on very rapid replays) and swaps the music theme. */
  enterEra(eraIndex, onDone) {
    AudioSystem.playTheme('era' + eraIndex, 2.2);
    EraTransition.show(eraIndex, onDone);
  },

  nextRound() {
    if (this.questionsInEra >= this.questionsPerEra) {
      if (this.era >= 7) { this.victory(); return; }
      this.era++;
      this.questionsInEra = 0;
      this.generateParallaxLayers();
      this.generateAtmosphere();
      this.updateHUD();
      this.enterEra(this.era, () => this._continueRound());
      return;
    }
    this._continueRound();
  },

  _continueRound() {
    if (this.questionsInEra > 0 && this.questionsInEra % 5 === 0) this.startStronghold();
    else this.startQuestion();
  },

  /** Triggers the Radiant Surge power-up: a visual burst plus an extra shove against the Darkness. */
  triggerRadiantSurge() {
    this.surgeTimer = this.maxSurge;
    Enemy.reactToCorrect(2.5);
    Achievements.unlock('radiantSurge');
  },

  // ---------------- Questions (3-attempt retry) ----------------

  startQuestion() {
    this.showPanel('question');
    this.currentQuestion = QuestionEngine.generateQuestion(this.era, this.streak);
    this.questionWrongAttempts = 0;
    this.maxTime = DIFFICULTY_TIME[Settings.data.difficulty];
    this.timeLeft = this.maxTime;

    document.getElementById('question-text').innerText = this.currentQuestion.text;
    document.getElementById('attempt-indicator').innerText = '';
    document.getElementById('question-feedback').classList.remove('show');
    const box = document.getElementById('choices-container');
    box.innerHTML = '';
    this.currentQuestion.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.innerText = choice;
      btn.onclick = () => this.answerQuestion(index);
      box.appendChild(btn);
    });
    this.startTimer('timer-fill', () => this.answerQuestion(-1));
  },

  answerQuestion(index) {
    const btns = Array.from(document.querySelectorAll('#choices-container .btn'));
    const timedOut = index === -1;
    const isCorrect = !timedOut && index === this.currentQuestion.correct;

    if (isCorrect) {
      clearInterval(this.timerInterval);
      btns[index].classList.add('correct');
      btns.forEach(b => b.disabled = true);
      AudioSystem.sfx.correct();
      this.triggerFlash('correct');
      if (this.timeLeft < 1000) Achievements.unlock('swordOfSpirit');
      Stats.data.totalCorrect++;
      saveJSON('saveDycson_stats', Stats.data);
      if (Stats.data.totalCorrect >= 500) Achievements.unlock('transformedMind');

      this.streak++;
      this.sessionScore += 10 + this.era * 2;
      this.lightLevel = Math.min(100, this.lightLevel + 15);
      this.sizeLevel = Math.min(this.maxSizeLevel, this.sizeLevel + 1);
      this.growPulseTimer = this.maxGrowPulse;
      Enemy.reactToCorrect(1);
      this.glow = 50;
      if (this.streak === 3) this.shields = 1;
      if (this.streak === 5) this.lightLevel = 100;
      if (this.streak === 10) { this.shields = 2; Achievements.unlock('unshakableFaith'); }
      if (this.streak > 0 && this.streak % 7 === 0) this.triggerRadiantSurge();
      this.questionsInEra++;
      this.updateHUD();
      setTimeout(() => this.checkGameOver(), 1000);
      return;
    }

    if (!timedOut) {
      this.questionWrongAttempts++;
      btns[index].classList.add('wrong');
      btns[index].disabled = true;
      if (this.era === 1) this.eraOneWrongCount++;
      AudioSystem.sfx.wrong();
      this.triggerFlash('wrong');
    } else {
      this.questionWrongAttempts = 2;
      if (this.era === 1) this.eraOneWrongCount++;
    }

    const outOfAttempts = this.questionWrongAttempts >= 2;
    if (!outOfAttempts) {
      document.getElementById('attempt-indicator').innerText = `Not quite — try again (attempt ${this.questionWrongAttempts}/2)`;
      Enemy.reactToWrong(0.35);
      return;
    }

    clearInterval(this.timerInterval);
    if (this.currentQuestion.correct >= 0) btns[this.currentQuestion.correct].classList.add('correct');
    btns.forEach(b => b.disabled = true);
    document.getElementById('attempt-indicator').innerText = timedOut ? "Time's up!" : "Out of attempts.";

    this.sizeLevel = Math.max(0, this.sizeLevel - 1);
    this.growPulseTimer = this.maxGrowPulse;
    if (this.shields > 0) { this.shields--; Enemy.reactToWrong(0.4); }
    else { this.streak = 0; this.lightLevel = Math.max(10, this.lightLevel - 30); Enemy.reactToWrong(1); }

    this.updateHUD();
    this.showMissFeedback('question', this.currentQuestion, () => this.checkGameOver());
  },

  // ---------------- Stronghold (boss-style puzzle, 3-attempt retry) ----------------

  startStronghold() {
    this.showPanel('stronghold');
    AudioSystem.playTheme('stronghold', 1.0);
    this.currentStronghold = QuestionEngine.generateStronghold(this.era);
    this.selectedStack = [];
    this.strongholdWrongAttempts = 0;
    this.resolvingStronghold = false;
    this.maxTime = DIFFICULTY_TIME[Settings.data.difficulty] + 5000;
    this.timeLeft = this.maxTime;
    document.getElementById('sh-attempt-indicator').innerText = '';
    document.getElementById('stronghold-feedback').classList.remove('show');
    this.renderStrongholdSlots();
    this.renderStrongholdBank();
    this.startTimer('timer-fill-sh', () => this.checkStronghold(true));
  },

  renderStrongholdSlots() {
    document.getElementById('stack-slots').innerHTML = `
      <div class="stronghold-grid">
        <div class="stronghold-slot-row"><span class="stronghold-slot-num">1</span><span class="stack-slot" id="slot-0"></span></div>
        <div class="stronghold-slot-row"><span class="stronghold-slot-num">2</span><span class="stack-slot" id="slot-1"></span></div>
        <div class="stronghold-slot-row"><span class="stronghold-slot-num">3</span><span class="stack-slot" id="slot-2"></span></div>
        <div class="stronghold-slot-row"><span class="stronghold-slot-num">4</span><span class="stack-slot" id="slot-3"></span></div>
      </div>`;
  },
  renderStrongholdBank() {
    const bank = document.getElementById('item-bank');
    bank.innerHTML = '';
    this.currentStronghold.display.forEach(item => {
      const btn = document.createElement('div');
      btn.className = 'bank-item';
      btn.innerText = item;
      btn.onclick = () => {
        if (this.resolvingStronghold) return;
        if (this.selectedStack.length < 4 && !this.selectedStack.includes(item)) {
          this.selectedStack.push(item);
          btn.style.visibility = 'hidden';
          document.getElementById(`slot-${this.selectedStack.length - 1}`).innerText = item;
        }
      };
      bank.appendChild(btn);
    });
  },

  checkStronghold(timeout) {
    if (timeout) { this.resolveStronghold(false, true); return; }
    const isCorrect = JSON.stringify(this.selectedStack) === JSON.stringify(this.currentStronghold.correctOrder);
    if (isCorrect) { this.resolveStronghold(true, false); return; }

    this.strongholdWrongAttempts++;
    if (this.era === 1) this.eraOneWrongCount++;
    if (this.strongholdWrongAttempts < 2) {
      document.getElementById('sh-attempt-indicator').innerText = `Wrong order — try again (attempt ${this.strongholdWrongAttempts}/2)`;
      Enemy.reactToWrong(0.4);
      AudioSystem.sfx.wrong();
      this.triggerFlash('wrong');
      this.selectedStack = [];
      this.renderStrongholdSlots(); this.renderStrongholdBank();
      return;
    }
    this.resolveStronghold(false, false);
  },

  resolveStronghold(success, timedOut) {
    clearInterval(this.timerInterval);
    this.resolvingStronghold = true;

    if (success) {
      AudioSystem.sfx.correct();
      this.triggerFlash('correct');
      this.streak++;
      this.sessionScore += 25 + this.era * 3;
      this.lightLevel = Math.min(100, this.lightLevel + 25);
      this.sizeLevel = Math.min(this.maxSizeLevel, this.sizeLevel + 1);
      this.growPulseTimer = this.maxGrowPulse;
      Enemy.reactToCorrect(2);
      this.glow = 80;
      this.questionsInEra++;
      if (this.streak === 10) Achievements.unlock('unshakableFaith');
      if (this.streak > 0 && this.streak % 7 === 0) this.triggerRadiantSurge();
    } else {
      this.triggerFlash('wrong');
      this.currentStronghold.correctOrder.forEach((ev, i) => {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerText = ev; slot.classList.add('revealed');
      });
      document.getElementById('sh-attempt-indicator').innerText = timedOut ? "Time's up!" : "Out of attempts.";
      this.sizeLevel = Math.max(0, this.sizeLevel - 1);
      this.growPulseTimer = this.maxGrowPulse;
      if (this.shields > 0) { this.shields--; Enemy.reactToWrong(0.6); }
      else { this.streak = 0; this.lightLevel = Math.max(10, this.lightLevel - 40); Enemy.reactToWrong(1.6); }
    }
    this.updateHUD();
    AudioSystem.playTheme('era' + this.era, 1.4);
    if (success) {
      setTimeout(() => this.checkGameOver(), 900);
    } else {
      this.showMissFeedback('stronghold', this.currentStronghold, () => this.checkGameOver());
    }
  },

  startTimer(elementId, callback) {
    clearInterval(this.timerInterval);
    const fillEl = document.getElementById(elementId);
    // Uses the current timeLeft/maxTime ratio rather than hard-resetting to 100%, so this
    // same method works both for a fresh question (timeLeft === maxTime → 100%) and for
    // resuming a paused one (timeLeft partially spent → picks up right where it left off).
    const startPercent = Math.max(0, (this.timeLeft / this.maxTime) * 100);
    fillEl.style.width = startPercent + '%';
    fillEl.style.background = startPercent < 30 ? '#ff5252' : '#4caf50';
    this.timerInterval = setInterval(() => {
      this.timeLeft -= 100;
      const percent = Math.max(0, (this.timeLeft / this.maxTime) * 100);
      fillEl.style.width = `${percent}%`;
      if (percent < 30) fillEl.style.background = '#ff5252';
      if (this.timeLeft <= 0) { clearInterval(this.timerInterval); callback(); }
    }, 100);
  },

  checkGameOver() {
    if (this.era === 1 && this.questionsInEra >= this.questionsPerEra && this.eraOneWrongCount === 0) {
      Achievements.unlock('patriarch');
    }
    if (Enemy.x >= this.dycsonX - 50) { this.gameOver(); return; }
    this.nextRound();
  },

  gameOver() {
    this.showPanel('gameover');
    AudioSystem.stop(0.6);
    AudioSystem.stopAmbient();
    AudioSystem.playGameOverStinger();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('gameover-stats').innerText = `You reached ${ERA_NAMES[this.era - 1]}. Streak: ${this.streak}. Mind Renewal Score: ${this.sessionScore}`;
    document.getElementById('score-name-input').value = '';
    document.getElementById('save-score-btn').disabled = false;
    document.getElementById('save-score-btn').innerText = 'Save Score';
  },

  victory() {
    this.showPanel('victory');
    AudioSystem.stop(0.6);
    AudioSystem.stopAmbient();
    AudioSystem.playVictoryStinger();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('victory-stats').innerText = `Dycson's mind was fully renewed! Final Streak: ${this.streak}. Mind Renewal Score: ${this.sessionScore}`;
    document.getElementById('victory-name-input').value = '';
    document.getElementById('victory-save-score-btn').disabled = false;
    document.getElementById('victory-save-score-btn').innerText = 'Save Score';
  },

  saveScore(isVictory) {
    const inputId = isVictory ? 'victory-name-input' : 'score-name-input';
    const btnId = isVictory ? 'victory-save-score-btn' : 'save-score-btn';
    const name = document.getElementById(inputId).value.trim();
    Scoreboard.add(name, ERA_NAMES[this.era - 1], this.sessionScore);
    document.getElementById(btnId).innerText = 'Saved ✓';
    document.getElementById(btnId).disabled = true;
  },

  updateHUD() {
    document.getElementById('era-display').innerText = ERA_NAMES[this.era - 1];
    document.getElementById('streak-display').innerText = `Streak: ${this.streak}`;
    const shd = document.getElementById('shield-display');
    shd.style.display = this.shields > 0 ? 'block' : 'none';
    shd.innerText = `🛡️ Armor x${this.shields}`;
    const ring = document.getElementById('era-ring-fg');
    if (ring) {
      const circumference = 62.8; // 2 * PI * r(10), matches the SVG circle in index.html
      const progress = Math.max(0, Math.min(1, this.questionsInEra / this.questionsPerEra));
      ring.style.strokeDashoffset = circumference * (1 - progress);
    }
  },

  // ---------------- Update / Draw ----------------

  update() {
    this.glow *= 0.95;
    this.runPhase += (this.state === 'question' || this.state === 'stronghold') ? 0.15 : 0.03;
    this.bgOffset -= 1.3;
    if (this.shields > 0) this.shieldRotation += 0.03;
    if (this.surgeTimer > 0) this.surgeTimer--;
    if (this.growPulseTimer > 0) this.growPulseTimer--;
    if (this.flashTimer > 0) {
      this.flashTimer--;
      if (this.flashTimer === 0) {
        const el = document.getElementById('screen-flash');
        if (el) el.classList.remove('flash-correct', 'flash-wrong');
      }
    }
    this.updateAtmosphere();
    Enemy.update();
  },

  drawShape(kind, x, y, s, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color; ctx.strokeStyle = color;
    switch (kind) {
      case 'hill': ctx.beginPath(); ctx.ellipse(x,y,s*1.4,s*0.7,0,Math.PI,0); ctx.fill(); break;
      case 'tent': ctx.beginPath(); ctx.moveTo(x-s,y); ctx.lineTo(x,y-s*1.3); ctx.lineTo(x+s,y); ctx.closePath(); ctx.fill(); break;
      case 'pyramid': ctx.beginPath(); ctx.moveTo(x-s*1.2,y); ctx.lineTo(x,y-s*1.5); ctx.lineTo(x+s*1.2,y); ctx.closePath(); ctx.fill(); break;
      case 'tower': ctx.fillRect(x-s*0.35,y-s*1.8,s*0.7,s*1.8); ctx.fillRect(x-s*0.5,y-s*2.0,s,s*0.25); break;
      case 'ruin': ctx.beginPath(); ctx.moveTo(x-s*0.8,y); ctx.lineTo(x-s*0.8,y-s*0.6); ctx.lineTo(x-s*0.3,y-s*1.1); ctx.lineTo(x+s*0.2,y-s*0.5); ctx.lineTo(x+s*0.8,y-s*0.9); ctx.lineTo(x+s*0.8,y); ctx.closePath(); ctx.fill(); break;
      case 'tree': ctx.beginPath(); ctx.arc(x,y-s*0.9,s*0.55,0,Math.PI*2); ctx.fill(); ctx.fillRect(x-s*0.08,y-s*0.5,s*0.16,s*0.5); break;
      case 'sail': ctx.beginPath(); ctx.moveTo(x,y-s*1.5); ctx.lineTo(x,y); ctx.lineTo(x+s*0.9,y); ctx.closePath(); ctx.fill(); ctx.fillRect(x-s*0.05,y-s*0.2,s*0.1,s*0.2); break;
      case 'ring': ctx.beginPath(); ctx.ellipse(x,y,s*1.1,s*0.35,0.4,0,Math.PI*2); ctx.globalAlpha=0.5; ctx.lineWidth=3; ctx.stroke(); ctx.globalAlpha=1; break;
      case 'rock': ctx.beginPath(); ctx.ellipse(x,y,s*0.5,s*0.3,0,0,Math.PI*2); ctx.fill(); break;
      case 'palm': ctx.fillRect(x-s*0.06,y-s*0.7,s*0.12,s*0.7); for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.ellipse(x+i*s*0.15,y-s*0.75,s*0.35,s*0.1,i*0.3,0,Math.PI*2); ctx.fill(); } break;
      case 'pillar': ctx.fillRect(x-s*0.15,y-s*1.4,s*0.3,s*1.4); ctx.fillRect(x-s*0.25,y-s*1.5,s*0.5,s*0.12); break;
      case 'cloud': ctx.globalAlpha=0.6; ctx.beginPath(); ctx.ellipse(x,y,s*0.6,s*0.3,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x+s*0.4,y-s*0.1,s*0.4,s*0.25,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; break;
      case 'stone': ctx.beginPath(); ctx.ellipse(x,y,s*0.3,s*0.18,0,0,Math.PI*2); ctx.fill(); break;
      case 'wave': ctx.lineWidth=2; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(x,y,s*0.5,Math.PI,0); ctx.stroke(); ctx.globalAlpha=1; break;
      case 'spire': ctx.beginPath(); ctx.moveTo(x,y-s*1.8); ctx.lineTo(x-s*0.25,y); ctx.lineTo(x+s*0.25,y); ctx.closePath(); ctx.fill(); break;
    }
  },

  shade(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + percent, g = ((num >> 8) & 0xff) + percent, b = (num & 0xff) + percent;
    r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
    return `rgb(${r},${g},${b})`;
  },

  drawParallax(theme) {
    const w = this.width;
    const ctx = this.ctx;
    const supportsFilter = 'filter' in ctx;

    if (supportsFilter) ctx.filter = 'blur(2.5px)';
    this.parallax.far.forEach(h => { const x = ((h.x + this.bgOffset*0.2) % (w*2+100) + (w*2+100)) % (w*2+100) - 100; this.drawShape('hill', x, h.y, h.size, this.shade(theme.sky[1], -10)); });

    if (supportsFilter) ctx.filter = 'blur(1px)';
    this.parallax.mid.forEach(h => { const x = ((h.x + this.bgOffset*0.5) % (w*2+100) + (w*2+100)) % (w*2+100) - 100; this.drawShape(theme.mid, x, h.y, h.size*0.6, this.shade(theme.sky[1], -25)); });

    if (supportsFilter) ctx.filter = 'none';
    this.parallax.near.forEach(h => { const x = ((h.x + this.bgOffset*1.1) % (w*2+100) + (w*2+100)) % (w*2+100) - 100; this.drawShape(theme.near, x, h.y, h.size*0.4, this.shade(theme.sky[1], -40)); });
  },

  draw() {
    const ctx = this.ctx;
    if (!this.width) return;
    const theme = ERA_THEMES[this.era - 1];

    let grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, theme.sky[0]); grad.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, this.width, this.height);

    this.drawParallax(theme);
    this.drawAtmosphere();

    const beaconX = this.width - 30;
    const beaconGrad = ctx.createRadialGradient(beaconX, this.height / 2, 8, beaconX, this.height / 2, this.width * 0.4);
    beaconGrad.addColorStop(0, `rgba(255,250,210,${0.35 + this.lightLevel / 200})`);
    beaconGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beaconGrad;
    ctx.fillRect(Math.max(0, this.width - this.width * 0.45), 0, this.width * 0.45, this.height);

    Enemy.draw(ctx, this.dycsonX, this.dycsonY);

    // Proximity color bleed: driven by how close the Darkness has gotten
    const ratio = Enemy.getProximityRatio(this.dycsonX);
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    const bleedEdge = Enemy.x + 150 + ratio * 200;
    const desatGrad = ctx.createLinearGradient(0, 0, bleedEdge, 0);
    desatGrad.addColorStop(0, `rgba(128,128,128,${0.5 + ratio * 0.5})`);
    desatGrad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = desatGrad;
    ctx.fillRect(0, 0, Math.max(0, bleedEdge), this.height);
    ctx.restore();

    this.drawDycson();
  },

  drawDycson() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.dycsonX, this.dycsonY);

    // Incremental growth: scales the whole figure (halo + sprite/fallback body) up to
    // ~80% larger at max streak-driven sizeLevel, with a brief overshoot "pop" layered on
    // top every time sizeLevel changes (grow OR shrink), so the moment reads clearly
    // instead of blending into a slow, hard-to-notice drift.
    const steadyGrowth = 1 + (this.sizeLevel / this.maxSizeLevel) * 0.8;
    const pulseBoost = this.growPulseTimer > 0 ? 0.22 * (this.growPulseTimer / this.maxGrowPulse) : 0;
    const growth = steadyGrowth + pulseBoost;
    ctx.scale(growth, growth);

    const radiusBase = 30 + this.lightLevel * 0.45;
    const radius = radiusBase + this.glow;
    const haloGrad = ctx.createRadialGradient(0, -10, 4, 0, -10, radius);
    haloGrad.addColorStop(0, `rgba(255,245,200,${0.35 + this.lightLevel / 250})`);
    haloGrad.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath(); ctx.arc(0, -10, radius, 0, Math.PI * 2); ctx.fill();

    if (this.sprite.loaded) {
      const frame = Math.floor(this.runPhase * 6) % this.sprite.frameCount;
      const scale = 70 / this.sprite.frameH;
      const dw = this.sprite.frameW * scale, dh = this.sprite.frameH * scale;
      if (this.glow > 5) { ctx.shadowColor = 'gold'; ctx.shadowBlur = this.glow; }
      if (CONFIG.SPRITE_FLIP_X) ctx.scale(-1, 1);
      ctx.drawImage(this.sprite.img, frame * this.sprite.frameW, 0, this.sprite.frameW, this.sprite.frameH, -dw / 2, -dh * 0.65, dw, dh);
      ctx.shadowBlur = 0;
    } else {
      if (this.glow > 5) { ctx.shadowColor = 'gold'; ctx.shadowBlur = this.glow; }
      ctx.fillStyle = '#fff2d6';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath(); ctx.moveTo(-12, 15); ctx.lineTo(12, 15); ctx.lineTo(9, 46); ctx.lineTo(-9, 46); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      const legOffset = Math.sin(this.runPhase * 6) * 7;
      ctx.fillStyle = '#d8cba8';
      ctx.fillRect(-9, 45, 7, 14 + legOffset);
      ctx.fillRect(2, 45, 7, 14 - legOffset);
    }

    // Armor of Light: rotating dashed shield rings, one per stacked shield charge.
    if (this.shields > 0) {
      for (let i = 0; i < this.shields; i++) {
        const ringRadius = 46 + i * 10;
        ctx.save();
        ctx.rotate(this.shieldRotation * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(0,220,255,${0.55 - i * 0.1})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, -6, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Radiant Surge: an expanding, fading golden burst ring on a 7-streak power-up.
    if (this.surgeTimer > 0) {
      const p = 1 - (this.surgeTimer / this.maxSurge);
      const r = 20 + p * 90;
      const alpha = (1 - p) * 0.8;
      ctx.save();
      ctx.strokeStyle = `rgba(255,215,120,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  },

  loop() { this.update(); this.draw(); requestAnimationFrame(() => this.loop()); }
};