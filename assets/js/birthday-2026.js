/**
 * Birthday 2026 — "String a lei" intro, envelope → card sequence,
 * and petal shower.
 *
 * URL params for testing:
 *   ?skipIntro=1      jump straight to the envelope
 *   ?skipTo=card      envelope already opened, card on the table
 *   ?skipTo=open      card open
 *   ?debug=1          draw hit areas
 */
(function () {
  'use strict';

  const CONFIG = {
    flowersNeeded: 6,             
    spawnIntervalMs: [650, 1100],
    maxOnScreen: 4,
    fallSpeed: [90, 160],          // px / second (frame-rate independent); ~5–9s to cross a phone screen
    hitRadiusMin: 52,              // generous tap target for phones
    completeDelayMs: 2200,
    petalShowerMs: 2600,
    copy: {
      progress: (n, total) => `${n} of ${total} flowers`,
      doneTitle: 'Happy Birthday!',
      doneSub: '',
      envelopeHint: 'Tap the envelope to open it',
      cardHint: 'Tap the card to open it',
    },
    debug: false,
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => Math.random() * (b - a) + a;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ================================================================== */
  /* Drawing helpers                                                     */
  /* ================================================================== */

  const PALETTES = [
    { petal: '#ffffff', edge: '#fff2b0', center: '#ffcf3f' },  // classic white plumeria
    { petal: '#ffd1dc', edge: '#ff8fab', center: '#ffcf3f' },  // pink plumeria
    { petal: '#fff1a8', edge: '#ffd166', center: '#ff9a3c' },  // yellow plumeria
    { petal: '#ff8fa8', edge: '#ff4d6d', center: '#ffe066' },  // hibiscus-ish red
  ];

  function drawPlumeria(ctx, x, y, r, rot, pal, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      const g = ctx.createLinearGradient(0, 0, 0, -r);
      g.addColorStop(0, pal.center);
      g.addColorStop(0.45, pal.petal);
      g.addColorStop(1, pal.edge);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // asymmetric pinwheel petal, like a real plumeria
      ctx.bezierCurveTo(r * 0.62, -r * 0.12, r * 0.66, -r * 0.98, 0, -r);
      ctx.bezierCurveTo(-r * 0.36, -r * 0.92, -r * 0.3, -r * 0.3, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    // soft center glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
    cg.addColorStop(0, pal.center);
    cg.addColorStop(1, 'rgba(255,207,63,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPalm(ctx, x, baseY, h, flip) {
    ctx.save();
    ctx.translate(x, baseY);
    if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = '#1a0b2e';
    // trunk (leans right)
    ctx.beginPath();
    ctx.moveTo(-h * 0.05, 0);
    ctx.quadraticCurveTo(h * 0.05, -h * 0.55, h * 0.26, -h);
    ctx.lineTo(h * 0.31, -h * 0.98);
    ctx.quadraticCurveTo(h * 0.14, -h * 0.55, h * 0.07, 0);
    ctx.closePath();
    ctx.fill();
    // fronds
    const tx = h * 0.285, ty = -h * 0.99;
    const fronds = [-2.75, -2.3, -1.85, -1.4, -0.95, -0.5, -0.1];
    fronds.forEach((a, i) => {
      const len = h * (0.42 + 0.06 * Math.sin(i * 1.7));
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, len * 0.18);
      ctx.quadraticCurveTo(len * 0.5, -len * 0.02, 0, h * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    // coconuts
    ctx.beginPath();
    ctx.arc(tx - h * 0.02, ty + h * 0.03, h * 0.035, 0, Math.PI * 2);
    ctx.arc(tx + h * 0.03, ty + h * 0.04, h * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ================================================================== */
  /* Screen 1: Lei intro                                                 */
  /* ================================================================== */

  class LeiIntro {
    constructor(root, onComplete) {
      this.root = root;
      this.canvas = root.querySelector('#intro-canvas');
      this.progressEl = root.querySelector('#intro-progress');
      this.onComplete = onComplete;

      this.flowers = [];
      this.sparks = [];
      this.slots = [];
      this.placed = 0;
      this.spawnIn = 600;
      this.time = 0;
      this.last = 0;
      this.running = false;
      this.done = false;
      this.raf = null;

      this.resize = this.resize.bind(this);
      this.frame = this.frame.bind(this);
      this.onPointer = this.onPointer.bind(this);
      this.onVisibility = this.onVisibility.bind(this);
    }

    start() {
      this.resize();
      window.addEventListener('resize', this.resize);
      this.canvas.addEventListener('pointerdown', this.onPointer);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
      this.updateProgress();
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this.resize);
      this.canvas.removeEventListener('pointerdown', this.onPointer);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }

    onVisibility() {
      if (document.hidden) {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
      } else if (!this.done) {
        this.running = true;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    resize() {
      const { ctx, w, h } = fitCanvas(this.canvas);
      this.ctx = ctx; this.w = w; this.h = h;
      this.horizon = h * 0.70;

      // Lei slots: a necklace-shaped arc over the water
      this.slots = [];
      const n = CONFIG.flowersNeeded;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        this.slots.push({
          x: lerp(w * 0.14, w * 0.86, t),
          y: h * 0.775 + Math.sin(t * Math.PI) * h * 0.075,
        });
      }
      // placed flowers follow their slots
      this.flowers.forEach((f) => { if (f.slot != null) { f.x = this.slots[f.slot].x; f.y = this.slots[f.slot].y; } });

      // cache gradients
      const sky = ctx.createLinearGradient(0, 0, 0, this.horizon);
      sky.addColorStop(0, '#2b1055');
      sky.addColorStop(0.35, '#6a2c91');
      sky.addColorStop(0.65, '#e8547a');
      sky.addColorStop(0.88, '#ff9a5a');
      sky.addColorStop(1, '#ffd27f');
      this.skyGrad = sky;

      const sea = ctx.createLinearGradient(0, this.horizon, 0, h);
      sea.addColorStop(0, '#f08a6a');
      sea.addColorStop(0.12, '#2f8fae');
      sea.addColorStop(0.6, '#1b7f9e');
      sea.addColorStop(1, '#0d4f6b');
      this.seaGrad = sea;

      this.flowerR = Math.max(24, Math.min(36, w * 0.085));
    }

    spawn() {
      const r = this.flowerR * rand(0.9, 1.15);
      this.flowers.push({
        x: rand(this.w * 0.12, this.w * 0.88),
        y: -r * 2,
        baseX: 0,
        r,
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.6, 0.6),
        vy: rand(CONFIG.fallSpeed[0], CONFIG.fallSpeed[1]) * (reducedMotion ? 0.7 : 1),
        swayAmp: reducedMotion ? 0 : rand(18, 40),
        swayFreq: rand(0.7, 1.3),
        phase: rand(0, Math.PI * 2),
        pal: PALETTES[Math.floor(rand(0, PALETTES.length))],
        state: 'falling',       // falling | caught | placed
        slot: null,
        t: 0,
        from: null,
        scale: 1,
      });
      const f = this.flowers[this.flowers.length - 1];
      f.baseX = f.x;
    }

    onPointer(e) {
      if (this.done) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;

      // pick the closest falling flower within its hit radius
      let best = null, bestD = Infinity;
      for (const f of this.flowers) {
        if (f.state !== 'falling') continue;
        const d = Math.hypot(f.x - px, f.y - py);
        const hit = Math.max(CONFIG.hitRadiusMin, f.r * 1.6);
        if (d <= hit && d < bestD) { best = f; bestD = d; }
      }
      if (!best) return;

      best.state = 'caught';
      best.slot = this.placed;
      best.from = { x: best.x, y: best.y, rot: best.rot };
      best.t = 0;
      this.placed++;
      this.burst(best.x, best.y, best.pal.center);
      if (navigator.vibrate) navigator.vibrate(12);
      this.updateProgress();

      if (this.placed >= CONFIG.flowersNeeded) this.complete();
    }

    burst(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(60, 220);
        this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
      }
    }

    updateProgress() {
      this.progressEl.textContent = CONFIG.copy.progress(this.placed, CONFIG.flowersNeeded);
    }

    complete() {
      this.done = true;
      const msg = document.createElement('div');
      msg.className = 'intro-message';
      msg.setAttribute('role', 'status');
      msg.innerHTML = `<h2>${CONFIG.copy.doneTitle}</h2><p>${CONFIG.copy.doneSub}</p>`;
      this.root.appendChild(msg);
      this.root.querySelector('.intro-overlay').style.opacity = '0';
      this.root.querySelector('.intro-overlay').style.transition = 'opacity .4s';
      setTimeout(() => this.onComplete(), CONFIG.completeDelayMs);
    }

    frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(this.frame);
    }

    update(dt) {
      // spawning
      if (!this.done) {
        this.spawnIn -= dt * 1000;
        const falling = this.flowers.filter((f) => f.state === 'falling').length;
        const remaining = CONFIG.flowersNeeded - this.placed;
        if (this.spawnIn <= 0 && falling < Math.min(CONFIG.maxOnScreen, remaining + 1)) {
          this.spawn();
          this.spawnIn = rand(CONFIG.spawnIntervalMs[0], CONFIG.spawnIntervalMs[1]);
        }
      }

      for (const f of this.flowers) {
        if (f.state === 'falling') {
          f.y += f.vy * dt;
          f.phase += f.swayFreq * dt;
          f.x = f.baseX + Math.sin(f.phase) * f.swayAmp;
          f.rot += f.rotSpeed * dt;
        } else if (f.state === 'caught') {
          f.t = Math.min(1, f.t + dt / 0.7);
          const e = easeInOut(f.t);
          const slot = this.slots[f.slot];
          f.x = lerp(f.from.x, slot.x, e);
          // arc upward a little on the way
          f.y = lerp(f.from.y, slot.y, e) - Math.sin(f.t * Math.PI) * 60;
          f.rot = lerp(f.from.rot, 0, e);
          f.scale = 1 + Math.sin(f.t * Math.PI) * 0.35;
          if (f.t >= 1) { f.state = 'placed'; f.scale = 1; f.phase = rand(0, Math.PI * 2); }
        } else {
          // placed: tiny bob with the water
          f.phase += dt;
        }
      }
      this.flowers = this.flowers.filter((f) => !(f.state === 'falling' && f.y > this.h + f.r * 2));

      for (const s of this.sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vy += 300 * dt;
        s.life -= dt / 0.6;
      }
      this.sparks = this.sparks.filter((s) => s.life > 0);
    }

    draw() {
      const { ctx, w, h, horizon, time } = this;

      // sky
      ctx.fillStyle = this.skyGrad;
      ctx.fillRect(0, 0, w, horizon + 1);

      // stars fading in near the top
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 7919) % 1000) / 1000 * w;
        const sy = ((i * 104729) % 1000) / 1000 * horizon * 0.45;
        const tw = 0.5 + 0.5 * Math.sin(time * 1.5 + i);
        ctx.globalAlpha = tw * (1 - sy / (horizon * 0.5));
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;

      // sun on the horizon
      const sunX = w * 0.68, sunR = Math.min(w, h) * 0.11;
      const glow = ctx.createRadialGradient(sunX, horizon, sunR * 0.4, sunX, horizon, sunR * 3.2);
      glow.addColorStop(0, 'rgba(255, 230, 150, .55)');
      glow.addColorStop(1, 'rgba(255, 180, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, horizon + 1);
      ctx.fillStyle = '#ffe9a6';
      ctx.beginPath();
      ctx.arc(sunX, horizon, sunR, Math.PI, 0);
      ctx.fill();

      // sea
      ctx.fillStyle = this.seaGrad;
      ctx.fillRect(0, horizon, w, h - horizon);

      // sun shimmer on the water
      for (let i = 0; i < 9; i++) {
        const yy = horizon + 6 + i * (h - horizon) * 0.06;
        const wobble = Math.sin(time * 2.2 + i * 1.3) * 10;
        const len = sunR * (1.4 - i * 0.09) + wobble;
        ctx.fillStyle = `rgba(255, 220, 140, ${0.35 - i * 0.03})`;
        ctx.fillRect(sunX - len / 2 + wobble * 0.5, yy, len, 2);
      }

      // waves
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        const base = horizon + (h - horizon) * (0.18 + k * 0.2);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = base + Math.sin(x * 0.02 + time * (1.1 + k * 0.2) + k) * 4;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // palms (silhouettes) rooted at the bottom corners
      const palmH = Math.min(h * 0.26, w * 0.5);
      drawPalm(ctx, w * 0.03, h + 4, palmH, false);
      drawPalm(ctx, w * 0.97, h + 4, palmH * 0.85, true);

      // lei string + empty slots
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.slots.forEach((s, i) => { if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
      ctx.stroke();
      // ti-leaf knots between slots
      ctx.fillStyle = 'rgba(47, 158, 106, .9)';
      for (let i = 0; i < this.slots.length - 1; i++) {
        const a = this.slots[i], b = this.slots[i + 1];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this.slots.forEach((s, i) => {
        if (i < this.placed) return;
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, this.flowerR * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();

      // flowers: placed first, then in-flight, then falling (on top)
      const order = { placed: 0, caught: 1, falling: 2 };
      [...this.flowers].sort((a, b) => order[a.state] - order[b.state]).forEach((f) => {
        const bob = f.state === 'placed' ? Math.sin(f.phase * 1.4) * 2 : 0;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        drawPlumeria(ctx, f.x, f.y + bob, f.r * f.scale * (f.state === 'placed' ? 0.95 : 1), f.rot, f.pal);
        ctx.restore();
        if (CONFIG.debug && f.state === 'falling') {
          ctx.strokeStyle = 'rgba(255,0,0,.6)';
          ctx.beginPath();
          ctx.arc(f.x, f.y, Math.max(CONFIG.hitRadiusMin, f.r * 1.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // sparks
      for (const s of this.sparks) {
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // once complete, let the lei glow
      if (this.done) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.25 + 0.15 * Math.sin(time * 3);
        this.slots.forEach((s) => {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, this.flowerR * 2.2);
          g.addColorStop(0, `rgba(255, 220, 150, ${pulse})`);
          g.addColorStop(1, 'rgba(255, 220, 150, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(s.x - this.flowerR * 2.2, s.y - this.flowerR * 2.2, this.flowerR * 4.4, this.flowerR * 4.4);
        });
        ctx.restore();
      }
    }
  }

  /* ================================================================== */
  /* Petal shower                                                        */
  /* ================================================================== */

  class Petals {
    constructor(canvas) {
      this.canvas = canvas;
      this.petals = [];
      this.raf = null;
      this.last = 0;
      this.emitUntil = 0;
      this.frame = this.frame.bind(this);
      this.colors = ['#ff8fab', '#ffd166', '#ff7a59', '#ffffff', '#ffb3c6', '#ffe066', '#ff5e8a'];
    }

    burst(ms) {
      const { ctx, w, h } = fitCanvas(this.canvas);
      this.ctx = ctx; this.w = w; this.h = h;
      this.rate = Math.max(10, Math.min(22, w / 22));   // petals per second, scales a bit with width
      this.acc = 0;
      this.emitUntil = performance.now() + (reducedMotion ? Math.min(ms, 800) : ms);
      if (!this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    emit(n) {
      for (let i = 0; i < n; i++) {
        this.petals.push({
          x: rand(-20, this.w + 20),
          y: rand(-80, -10),
          vy: rand(70, 150),
          vx: rand(-25, 25),
          rx: rand(7, 12),
          ry: rand(4, 6.5),
          rot: rand(0, Math.PI * 2),
          rotV: rand(-3, 3),
          swayF: rand(1, 2.2),
          swayA: rand(15, 45),
          phase: rand(0, Math.PI * 2),
          color: this.colors[Math.floor(rand(0, this.colors.length))],
          alpha: 1,
        });
      }
    }

    frame(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (now < this.emitUntil) {
        this.acc += dt * this.rate * (reducedMotion ? 0.5 : 1);
        const n = Math.floor(this.acc);
        if (n > 0) { this.emit(n); this.acc -= n; }
      }

      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      for (const p of this.petals) {
        p.phase += p.swayF * dt;
        p.y += p.vy * dt;
        p.x += (p.vx + Math.cos(p.phase) * p.swayA) * dt;
        p.rot += p.rotV * dt;
        if (p.y > h * 0.85) p.alpha = Math.max(0, p.alpha - dt * 2);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this.petals = this.petals.filter((p) => p.alpha > 0 && p.y < h + 30);

      if (this.petals.length || now < this.emitUntil) {
        this.raf = requestAnimationFrame(this.frame);
      } else {
        this.raf = null;
        ctx.clearRect(0, 0, w, h);
      }
    }
  }

  /* ================================================================== */
  /* Stage: envelope → card                                              */
  /* ================================================================== */

  const $ = (id) => document.getElementById(id);

  const stage = {
    el: null, envGroup: null, card: null, cardWrap: null, cover: null, hint: null, actions: null,
    envelopeOpened: false,
    cardReady: false,
    petals: null,

    init() {
      this.el = $('stage');
      this.envGroup = $('env-group');
      this.card = $('card');
      this.cardWrap = $('card-wrap');
      this.cover = $('card-cover');
      this.hint = $('stage-hint');
      this.actions = $('bottom-actions');
      this.petals = new Petals($('petal-canvas'));

      this.fitCardInEnvelope();
      window.addEventListener('resize', () => this.fitCardInEnvelope());

      const env = $('envelope');
      env.addEventListener('click', () => this.openEnvelope());
      this.cover.addEventListener('click', () => this.toggleCard());
      this.card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleCard(); }
      });

      $('petals-button').addEventListener('click', () => this.petals.burst(CONFIG.petalShowerMs));
      present.init(this.petals);
    },

    fitCardInEnvelope() {
      // scale the card so it sits inside the envelope (layout sizes ignore transforms)
      const s = (this.envGroup.offsetHeight * 0.88) / this.card.offsetHeight;
      document.documentElement.style.setProperty('--mini-scale', Math.min(1, s).toFixed(3));
      // does the opened two-page spread fit on screen?
      this.el.classList.toggle('wide', window.innerWidth >= this.card.offsetWidth * 2 + 48);
    },

    show() {
      this.el.classList.add('show');
      this.el.removeAttribute('aria-hidden');
      this.setHint(CONFIG.copy.envelopeHint);
    },

    setHint(text) {
      if (!text) { this.hint.classList.remove('show'); return; }
      this.hint.textContent = text;
      this.hint.classList.add('show');
    },

    openEnvelope(instant = false) {
      if (this.envelopeOpened) return;
      this.envelopeOpened = true;
      this.setHint('');
      const t = instant || reducedMotion ? (ms) => ms * 0.15 : (ms) => ms;

      const el = this.el;
      el.classList.add('flap-open');
      setTimeout(() => el.classList.add('flap-behind'), t(380));
      setTimeout(() => el.classList.add('card-out'), t(650));
      setTimeout(() => el.classList.add('env-away', 'card-full'), t(1450));
      setTimeout(() => {
        this.cardReady = true;
        this.card.setAttribute('role', 'button');
        this.card.setAttribute('tabindex', '0');
        this.card.setAttribute('aria-label', 'Open the card');
        this.setHint(CONFIG.copy.cardHint);
      }, t(2400));
    },

    toggleCard(force) {
      if (!this.cardReady) return;
      const open = typeof force === 'boolean' ? force : !this.card.classList.contains('open');
      this.card.classList.toggle('open', open);
      this.el.classList.toggle('card-open', open);
      this.card.setAttribute('aria-expanded', String(open));
      this.card.setAttribute('aria-label', open ? 'Close the card' : 'Open the card');
      if (open) {
        this.setHint('');
        this.actions.classList.add('show');
        setTimeout(() => this.petals.burst(CONFIG.petalShowerMs), 500);
      }
    },
  };

  /* ================================================================== */
  /* The present inside the card → perks sheet                           */
  /* ================================================================== */

  const present = {
    gift: null, modal: null, petals: null, busy: false,
    init(petals) {
      this.gift = $('gift');
      this.modal = $('perks-modal');
      this.petals = petals;
      if (!this.gift || !this.modal) return;

      this.gift.addEventListener('click', () => this.unwrap());
      $('perks-close').addEventListener('click', () => this.close());
      this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.classList.contains('show')) this.close();
      });
    },
    unwrap() {
      if (this.busy) return;
      this.busy = true;
      const delay = reducedMotion ? 0 : 550;
      this.gift.classList.add('unwrapping');
      if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
      setTimeout(() => {
        this.open();
        this.gift.classList.remove('unwrapping');
        this.busy = false;
      }, delay);
    },
    open() {
      this.modal.hidden = false;
      // next frame so the opacity/translate transition runs
      requestAnimationFrame(() => requestAnimationFrame(() => this.modal.classList.add('show')));
      this.petals.burst(1500);
      setTimeout(() => $('perks-close').focus({ preventScroll: true }), 400);
    },
    close() {
      this.modal.classList.remove('show');
      setTimeout(() => { this.modal.hidden = true; }, 320);
      this.gift.focus({ preventScroll: true });
    },
  };

  /* ================================================================== */
  /* Boot                                                                */
  /* ================================================================== */

  function hideIntro(introEl, intro, instant) {
    if (intro) intro.stop();
    if (instant) {
      introEl.classList.add('hidden');
      stage.show();
      return;
    }
    introEl.classList.add('transitioning');
    setTimeout(() => {
      introEl.classList.add('hidden');
      introEl.setAttribute('aria-hidden', 'true');
      stage.show();
    }, 600);
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    CONFIG.debug = params.get('debug') === '1';
    const skipTo = params.get('skipTo');
    const skipIntro = params.get('skipIntro') === '1' || !!skipTo;

    stage.init();

    const introEl = $('intro');
    let intro = null;

    if (skipIntro) {
      hideIntro(introEl, null, true);
      if (skipTo === 'card' || skipTo === 'open') {
        // jump through the envelope sequence without animating
        stage.el.style.setProperty('--no-anim', '1');
        stage.el.querySelectorAll('.env-part, .card-wrap, .env-group, .env-seal').forEach((n) => (n.style.transition = 'none'));
        stage.openEnvelope(true);
        setTimeout(() => {
          stage.el.querySelectorAll('.env-part, .card-wrap, .env-group, .env-seal').forEach((n) => (n.style.transition = ''));
          if (skipTo === 'open') { stage.cardReady = true; stage.toggleCard(true); }
        }, 450);
      }
    } else {
      intro = new LeiIntro(introEl, () => hideIntro(introEl, intro, false));
      intro.start();
      if (CONFIG.debug) window.__intro = intro;
      $('skip-intro').addEventListener('click', () => hideIntro(introEl, intro, false));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
