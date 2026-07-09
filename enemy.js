/**
 * enemy.js — The Darkness: a living, reactive enemy.
 *
 * Rather than a fixed-speed advancing wall, the Darkness now has an
 * `aggression` state (0-1) that the game feeds directly:
 *   - reactToWrong()   raises aggression and lunges forward
 *   - reactToCorrect() lowers aggression and recoils backward
 *
 * Aggression isn't just cosmetic — it drives real simulation parameters:
 * approach speed, particle spawn rate, ember frequency, swirl velocity,
 * and a color shift from smoky black toward angrier purple/red as it
 * grows stronger. A calm Darkness looks and moves differently than an
 * enraged one chasing a long wrong-answer streak.
 */

const Enemy = {
  x: 0,
  targetX: 0,
  aggression: 0.15,       // 0 = dormant, 1 = maximum fury
  height: 0,
  smokeTime: 0,
  smokeParticles: [],
  emberParticles: [],
  wallPuffs: [],

  reset(height) {
    this.x = 0;
    this.targetX = 0;
    this.aggression = 0.15;
    this.height = height;
    this.smokeTime = 0;
    this.smokeParticles = [];
    this.emberParticles = [];
    this.wallPuffs = [];
  },

  resize(height) {
    this.height = height;
    this.wallPuffs = []; // regenerate puff field for the new canvas size
  },

  /** Called on a correct answer: recede and calm down. Strength scales the effect. */
  reactToCorrect(strength) {
    const s = strength || 1;
    this.targetX -= 100 * s;
    this.aggression = Math.max(0.1, this.aggression - 0.18 * s);
  },

  /** Called on a wrong answer / timeout: lunge forward and grow angrier. */
  reactToWrong(strength) {
    const s = strength || 1;
    this.targetX += 120 * s;
    this.aggression = Math.min(1, this.aggression + 0.22 * s);
  },

  getProximityRatio(dycsonX) {
    return Math.min(1, this.x / Math.max(1, dycsonX));
  },

  update() {
    // Approach speed itself scales with aggression: an enraged Darkness
    // closes distance faster than a subdued one, even for the same targetX gap.
    const chaseRate = 0.035 + this.aggression * 0.05;
    this.x += (this.targetX - this.x) * chaseRate;
    this.x = Math.max(0, this.x);
    this.smokeTime += 0.04 + this.aggression * 0.03;

    this._updateSmokeParticles();
    this._updateEmbers();
  },

  _spawnSmokeParticle() {
    const isEdge = Math.random() < 0.32;
    this.smokeParticles.push({
      spawnX: this.x,
      spawnY: Math.random() * this.height,
      t: 0,
      speed: (0.006 + Math.random() * 0.006) * (0.7 + this.aggression * 0.6),
      maxSize: isEdge ? (12 + Math.random() * 16) : (20 + Math.random() * 34),
      baseOpacity: isEdge ? (0.7 + Math.random() * 0.2) : (0.35 + Math.random() * 0.15),
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (1.1 + Math.random() * 1.9) * (0.8 + this.aggression * 0.8),
      swirlRadius: (isEdge ? 8 : 24) + Math.random() * 18,
      purple: Math.random() < (0.12 + this.aggression * 0.35)
    });
  },

  _updateSmokeParticles() {
    const cap = 80;
    const spawnRate = 2 + Math.round(this.aggression * 3); // angrier = denser smoke
    for (let i = 0; i < spawnRate && this.smokeParticles.length < cap; i++) this._spawnSmokeParticle();
    for (const p of this.smokeParticles) p.t += p.speed;
    this.smokeParticles = this.smokeParticles.filter(p => p.t < 1);
  },

  _makeEmber() {
    return {
      life: 0,
      maxLife: 0.35 + Math.random() * 0.25,
      offX: 0, offY: 0,
      vx: -(1.6 + Math.random() * 2.6) * (0.8 + this.aggression * 0.7),
      vy: (Math.random() - 0.5) * 3,
      white: Math.random() < 0.5,
      size: 2 + Math.random() * 2
    };
  },

  _updateEmbers() {
    const emberTarget = 3 + Math.round(this.aggression * 4); // more sparks when enraged
    while (this.emberParticles.length < emberTarget) this.emberParticles.push(this._makeEmber());
    for (const e of this.emberParticles) {
      e.life += 0.03;
      e.offX += e.vx;
      e.offY += e.vy;
      if (e.life >= e.maxLife) Object.assign(e, this._makeEmber());
    }
  },

  _ensureWallPuffs() {
    if (this.wallPuffs.length) return;
    const count = 90;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const layer = r < 0.4 ? 0 : (r < 0.72 ? 1 : 2);
      this.wallPuffs.push({
        u: Math.random(), v: Math.random(),
        phase: Math.random() * Math.PI * 2, phase2: Math.random() * Math.PI * 2,
        speedX: 0.12 + Math.random() * 0.30, speedY: 0.10 + Math.random() * 0.26,
        ampX: 10 + Math.random() * 26, ampY: 12 + Math.random() * 30,
        sizeFrac: 0.5 + Math.random() * 0.9, alphaMul: 0.6 + Math.random() * 0.5,
        layer, purple: Math.random() < 0.12
      });
    }
  },

  _drawWallSmoke(ctx) {
    const w = this.x;
    if (w <= 1) return;
    this._ensureWallPuffs();
    const h = this.height;
    const t = this.smokeTime;
    const angerTint = this.aggression; // 0..1, shifts undercoat toward red/purple

    const under = ctx.createLinearGradient(0, 0, w, 0);
    under.addColorStop(0, `rgba(${Math.round(6 + angerTint * 35)},5,${Math.round(10 + angerTint * 10)},0.55)`);
    under.addColorStop(1, `rgba(${Math.round(10 + angerTint * 25)},9,${Math.round(15 + angerTint * 8)},0.42)`);
    ctx.fillStyle = under;
    ctx.fillRect(0, 0, w, h);

    for (let layer = 0; layer <= 2; layer++) {
      for (const p of this.wallPuffs) {
        if (p.layer !== layer) continue;
        const speedMul = 1 + this.aggression * 0.6;
        const baseX = p.u * w;
        const baseY = p.v * h;
        const driftX = Math.sin(t * p.speedX * speedMul + p.phase) * p.ampX
                     + Math.sin(t * p.speedX * 0.47 * speedMul + p.phase2) * p.ampX * 0.45;
        const driftY = Math.cos(t * p.speedY * speedMul + p.phase * 1.3) * p.ampY
                     + Math.sin(t * p.speedY * 0.6 * speedMul + p.phase2 * 1.7) * p.ampY * 0.5;
        const x = baseX + driftX;
        const y = baseY + driftY;
        if (x < -60 || x > w + 60) continue;

        const sizeBase = layer === 0 ? h * 0.5 : (layer === 1 ? h * 0.32 : h * 0.2);
        const pulse = 0.82 + 0.18 * Math.sin(t * p.speedX * 1.5 * speedMul + p.phase);
        const r = Math.max(1, sizeBase * p.sizeFrac * pulse);
        const alpha = (layer === 0 ? 0.5 : layer === 1 ? 0.48 : 0.5) * p.alphaMul;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        if (p.purple || angerTint > 0.6) {
          grad.addColorStop(0, `rgba(${Math.round(65 + angerTint * 40)},22,${Math.round(95 - angerTint * 20)},${alpha})`);
          grad.addColorStop(1, 'rgba(20,8,35,0)');
        } else {
          const tone = layer === 0 ? '9,8,14' : (layer === 1 ? '14,12,20' : '19,16,26');
          grad.addColorStop(0, `rgba(${tone},${alpha})`);
          grad.addColorStop(1, 'rgba(5,5,9,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  _drawEmbers(ctx, tipX, tipY) {
    for (const e of this.emberParticles) {
      const p = Math.min(1, e.life / e.maxLife);
      const alpha = 1 - p;
      if (alpha <= 0.02) continue;
      const x = tipX + e.offX;
      const y = tipY + e.offY;
      ctx.fillStyle = e.white ? `rgba(255,255,255,${alpha})` : `rgba(160,70,225,${alpha})`;
      ctx.fillRect(x - e.size / 2, y - e.size / 2, e.size, e.size);
    }
  },

  /** Draws the full Darkness — wall mass, churning vortex particles, and embers. */
  draw(ctx, dycsonX, dycsonY) {
    const reach = 60 + (this.x / Math.max(1, dycsonX)) * 140 + this.aggression * 40;
    const tipX = this.x + reach;
    const tipY = dycsonY;

    this._drawWallSmoke(ctx);

    for (const p of this.smokeParticles) {
      const t = p.t;
      const sizeScale = Math.sin(Math.min(1, t) * Math.PI);
      const swirlAmp = p.swirlRadius * (1 - t);
      const swirlAngle = this.smokeTime * p.angularSpeed + p.angle;
      const offsetX = Math.cos(swirlAngle) * swirlAmp * 0.5;
      const offsetY = Math.sin(swirlAngle) * swirlAmp;
      const x = p.spawnX + (tipX - p.spawnX) * t + offsetX;
      const y = p.spawnY + (tipY - p.spawnY) * t + offsetY;
      const r = p.maxSize * sizeScale;
      const alpha = p.baseOpacity * sizeScale;
      if (alpha <= 0.015 || r <= 0.5) continue;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (p.purple) {
        grad.addColorStop(0, `rgba(70,25,105,${alpha})`);
        grad.addColorStop(1, 'rgba(30,10,50,0)');
      } else {
        grad.addColorStop(0, `rgba(15,13,22,${alpha})`);
        grad.addColorStop(1, 'rgba(8,8,14,0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    this._drawEmbers(ctx, tipX, tipY);
  }
};