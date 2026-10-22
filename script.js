'use strict';

/* =========================================================
   NEXUS ARCADE
   Tamanho lógico dos jogos de canvas: 600 x 400
   ========================================================= */
const W = 600, H = 400;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const CATEGORIES = { arcade: 'Arcade', puzzle: 'Puzzle', reflex: 'Reflexo' };

const GAME_LIST = [
  { id: 'space',   title: 'Space Blaster', icon: 'fa-rocket',    cat: 'arcade', color: '#00f0ff', extra: 'VIDAS',
    desc: 'Destrua as naves inimigas antes que elas passem por você.',
    controls: 'W/S frente e trás · A/D lados (ou setas) · ESPAÇO atira (segure) · P pausa · Celular: arraste para mover (atira sozinho)' },
  { id: 'jump',    title: 'Pixel Jump',    icon: 'fa-person-running', cat: 'reflex', color: '#00ff66', extra: 'VELOCIDADE',
    desc: 'Corra, pule os espinhos e agache sob os drones.',
    controls: 'ESPAÇO / ↑ pula (segure = pulo maior) · ↓ agacha · Celular: toque para pular, deslize p/ baixo para agachar' },
  { id: 'memory',  title: 'Memory Match',  icon: 'fa-clone',     cat: 'puzzle', color: '#d400ff', extra: 'JOGADAS',
    desc: 'Encontre todos os pares com o menor número de jogadas.',
    controls: 'Clique ou toque nas cartas para virar. Menos jogadas e menos tempo = mais pontos.' },
  { id: 'snake',   title: 'Cyber Snake',   icon: 'fa-staff-snake', cat: 'arcade', color: '#ffb700', extra: 'TAMANHO',
    desc: 'Coma, cresça e fuja de bater nas paredes e em você mesma.',
    controls: 'Setas ou WASD · P pausa · Celular: deslize na tela · Frutas douradas valem 50!' },
  { id: 'breaker', title: 'Neon Breaker',  icon: 'fa-table-cells', cat: 'arcade', color: '#ff0055', extra: 'VIDAS',
    desc: 'Quebre todos os blocos e colete bônus que caem.',
    controls: 'Setas/A/D ou mouse movem · ESPAÇO ou clique lança a bola · P pausa' },
  { id: 'pong',    title: 'Cyber Pong',    icon: 'fa-table-tennis-paddle-ball', cat: 'arcade', color: '#b000ff', extra: 'PLACAR',
    desc: 'Duelo contra a IA. O primeiro a fazer 7 pontos vence.',
    controls: 'W/S ou ↑/↓ ou mouse/dedo movem a raquete · P pausa' },
  { id: 'tetris',  title: 'Cyber Blocks',  icon: 'fa-cubes',     cat: 'puzzle', color: '#7b00ff', extra: 'LINHAS',
    desc: 'Encaixe as peças, complete linhas e suba de nível.',
    controls: '← → move · ↑ gira · ↓ desce · ESPAÇO queda total · C guarda peça · Celular: arraste, toque gira, deslize p/ baixo = queda' },
  { id: 'g2048',   title: '2048 Neon',     icon: 'fa-hashtag',   cat: 'puzzle', color: '#ff6600', extra: 'MAIOR',
    desc: 'Junte números iguais até chegar ao famoso 2048.',
    controls: 'Setas ou WASD (ou deslize) movem todos os blocos.' },
  { id: 'flappy',  title: 'Neon Flappy',   icon: 'fa-dove',      cat: 'reflex', color: '#00e1ff', extra: 'CANOS',
    desc: 'Bata as asas e passe pelos canos sem encostar.',
    controls: 'ESPAÇO, ↑ ou toque/clique para bater as asas · P pausa' },
  { id: 'simon',   title: 'Cyber Simon',   icon: 'fa-brain',     cat: 'puzzle', color: '#ff4d88', extra: 'RODADA',
    desc: 'Memorize a sequência de luzes e repita sem errar.',
    controls: 'Clique nas cores ou use Q W A S (ou 1 2 3 4).' }
];

const RANKS = [
  { min: 0, name: 'Novato' }, { min: 300, name: 'Jogador' }, { min: 1000, name: 'Veterano' },
  { min: 3000, name: 'Elite' }, { min: 8000, name: 'Lenda' }
];

/* =========================================================
   APP: hub, loop, entrada, áudio, efeitos
   ========================================================= */
const App = {
  soundEnabled: true,
  audioCtx: null,
  scores: { space: 0, jump: 0, memory: 0, snake: 0, breaker: 0, pong: 0, tetris: 0, g2048: 0, flappy: 0, simon: 0 },
  currentGame: null,
  state: 'hub',            // hub | ready | running | paused | over
  keys: {},
  particles: [],
  shake: 0,
  stars: [],
  timers: new Set(),
  raf: null, lastTs: 0, acc: 0,
  score: 0, bestAtStart: 0,
  canvas: null, ctx: null, dpr: 1,

  init() {
    this.buildHub();
    this.loadScores();
    this.loadSoundPref();
    this.stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: Math.random() < 0.2 ? 2 : 1,
      v: 0.2 + Math.random() * 0.8, a: 0.25 + Math.random() * 0.6
    }));
    this.setupBackgroundCanvas();
    this.setupGameCanvas();
    this.bindEvents();
    this.setupInput();
    this.setupPointer();
  },

  game() { return this.currentGame ? Games[this.currentGame] : null; },

  /* ---------- Hub ---------- */
  buildHub() {
    document.getElementById('hub-grid').innerHTML = GAME_LIST.map((g, i) => `
      <article class="game-card" data-game="${g.id}" data-category="${g.cat}" style="--c:${g.color};--i:${i}">
        <div class="card-media"><span class="card-tag">${CATEGORIES[g.cat]}</span><i class="fa-solid ${g.icon}"></i></div>
        <div class="card-body">
          <h3>${g.title}</h3>
          <p>${g.desc}</p>
          <div class="card-footer">
            <span class="high-score-tag"><i class="fa-solid fa-crown"></i><b id="hs-${g.id}">0</b></span>
            <button class="play-btn" type="button"><i class="fa-solid fa-play"></i> <span>JOGAR</span></button>
          </div>
        </div>
      </article>`).join('');
  },

  /* ---------- Placar ---------- */
  loadScores() {
    try {
      const saved = localStorage.getItem('nexus_scores_v2');
      if (saved) this.scores = { ...this.scores, ...JSON.parse(saved) };
    } catch (e) {}
    this.updateScoreDisplays();
  },

  saveScore(game, score) {
    if (score > (this.scores[game] || 0)) {
      this.scores[game] = score;
      try { localStorage.setItem('nexus_scores_v2', JSON.stringify(this.scores)); } catch (e) {}
      this.updateScoreDisplays();
    }
  },

  resetScores() {
    Object.keys(this.scores).forEach(k => this.scores[k] = 0);
    try { localStorage.setItem('nexus_scores_v2', JSON.stringify(this.scores)); } catch (e) {}
    this.updateScoreDisplays();
  },

  updateScoreDisplays() {
    let total = 0;
    Object.keys(this.scores).forEach(key => {
      total += this.scores[key];
      const el = document.getElementById(`hs-${key}`);
      if (el) el.textContent = this.scores[key];
    });
    document.getElementById('global-score').textContent = total;
    let rank = RANKS[0].name;
    RANKS.forEach(r => { if (total >= r.min) rank = r.name; });
    document.getElementById('rank-name').textContent = rank;
  },

  setScore(n) {
    this.score = n;
    document.getElementById('live-score').textContent = n;
    document.getElementById('live-highscore').textContent = Math.max(this.bestAtStart, n);
    if (this.currentGame && n > 0) this.saveScore(this.currentGame, n);
  },

  addScore(n) { this.setScore(this.score + n); },
  setExtra(text) { document.getElementById('live-extra').textContent = text; },

  /* ---------- Áudio ---------- */
  initAudio() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  },

  playSound(freq = 440, type = 'sine', duration = 0.1, vol = 0.07, slideTo = null) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {}
  },

  sfxWin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playSound(f, 'triangle', 0.18, 0.08), i * 110)); },
  sfxLose() { [330, 262, 196, 130].forEach((f, i) => setTimeout(() => this.playSound(f, 'sawtooth', 0.2, 0.06), i * 130)); },

  loadSoundPref() {
    try { if (localStorage.getItem('nexus_sound') === 'off') this.soundEnabled = false; } catch (e) {}
    this.updateSoundIcons();
  },

  updateSoundIcons() {
    document.querySelectorAll('.sound-toggle i').forEach(i => {
      i.className = this.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    });
  },

  /* ---------- Timers que são limpos ao trocar de jogo ---------- */
  later(fn, ms) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
    return id;
  },
  every(fn, ms) {
    const id = setInterval(fn, ms);
    this.timers.add(id);
    return id;
  },
  clearTimers() {
    this.timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    this.timers.clear();
  },

  /* ---------- Efeitos visuais ---------- */
  burst(x, y, color, n = 14, speed = 3, life = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.9);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: 1.5 + Math.random() * 2.5 });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  },
  addShake(n) { this.shake = Math.max(this.shake, n); },
  updateParticles() {
    for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life--; }
    this.particles = this.particles.filter(p => p.life > 0);
    this.shake *= 0.86;
    if (this.shake < 0.2) this.shake = 0;
  },
  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },
  // Desenha uma vez numa tela escondida e devolve a imagem pronta (para fundos pesados)
  makeCache(drawFn) {
    const c = document.createElement('canvas');
    c.width = W * this.dpr; c.height = H * this.dpr;
    const x = c.getContext('2d');
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawFn(x);
    return c;
  },
  glow(ctx, color, blur = 12) { ctx.shadowColor = color; ctx.shadowBlur = blur; },
  noGlow(ctx) { ctx.shadowBlur = 0; },
  rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  text(ctx, str, x, y, size = 16, color = '#fff', align = 'center', weight = 700) {
    ctx.font = `${weight} ${size}px Orbitron, Rajdhani, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  },
  drawBg(ctx, c1 = '#060a16', c2 = '#0b1230', speed = 0.5) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) {
      s.y += s.v * speed;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      ctx.globalAlpha = s.a;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  },

  setupBackgroundCanvas() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0;
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: 46 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 1, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35
    }));

    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.12 * (1 - d / 130)})`;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    };

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(); return; }
    const animate = () => { frame(); requestAnimationFrame(animate); };
    animate();
  },

  setupGameCanvas() {
    this.canvas = document.getElementById('game-canvas');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = W * this.dpr;
    this.canvas.height = H * this.dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  /* ---------- Eventos de interface ---------- */
  bindEvents() {
    document.querySelectorAll('.sound-toggle').forEach(btn => btn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      try { localStorage.setItem('nexus_sound', this.soundEnabled ? 'on' : 'off'); } catch (e) {}
      this.updateSoundIcons();
      if (this.soundEnabled) this.playSound(660, 'sine', 0.1);
    }));

    document.getElementById('reset-scores-btn').addEventListener('click', () => {
      if (confirm('Zerar todos os recordes? Isso não pode ser desfeito.')) this.resetScores();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.category;
        document.querySelectorAll('.game-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
        });
      });
    });

    document.getElementById('hub-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      if (card) this.openGame(card.dataset.game);
    });

    document.getElementById('back-btn').addEventListener('click', () => this.closeGame());
    document.getElementById('restart-btn').addEventListener('click', () => { if (this.currentGame) this.startGame(); });
    document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('start-game-btn').addEventListener('click', () => this.primaryAction());

    // tira o foco dos botões depois do clique (evita que ESPAÇO "clique" no botão sem querer)
    document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.blur(); });

    // pausa sozinho se a aba ficar escondida
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'running') this.togglePause(); });
  },

  normKey(k) { return k.length === 1 ? k.toLowerCase() : k; },

  setupInput() {
    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);
    window.addEventListener('keydown', (e) => {
      if (!this.currentGame || e.ctrlKey || e.metaKey || e.altKey) return;
      if (block.has(e.key)) e.preventDefault();
      const k = this.normKey(e.key);

      if (k === 'p' || e.key === 'Escape') { if (!e.repeat) this.togglePause(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && (this.state === 'ready' || this.state === 'over' || this.state === 'paused')) {
        if (!e.repeat) this.primaryAction();
        return;
      }
      this.keys[k] = true;
      const g = this.game();
      if (g && g.onKey && this.state === 'running') g.onKey(k, true, e.repeat);
    });
    window.addEventListener('keyup', (e) => {
      const k = this.normKey(e.key);
      this.keys[k] = false;
      const g = this.game();
      if (g && g.onKey && this.state === 'running') g.onKey(k, false, false);
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  },

  setupPointer() {
    const stage = document.getElementById('stage');
    let down = false, sx = 0, sy = 0;
    const pos = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };

    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || this.state !== 'running') return;
      const g = this.game(); if (!g) return;
      // Jogos de clique (memória, simon) NÃO podem capturar o ponteiro, senão o clique não chega nas cartas/botões
      if (g.type !== 'canvas' && !g.swipe) return;
      down = true; sx = e.clientX; sy = e.clientY;
      if (g.type === 'canvas') { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
      if (g.onPointer) { const p = pos(e); g.onPointer('down', p.x, p.y, true); }
    });

    stage.addEventListener('pointermove', (e) => {
      if (this.state !== 'running') return;
      const g = this.game(); if (!g || !g.onPointer) return;
      if (!down && !(g.hoverMove && e.pointerType === 'mouse')) return;
      const p = pos(e);
      g.onPointer('move', p.x, p.y, down);
    });

    const end = (e) => {
      if (!down) return;
      down = false;
      const g = this.game();
      if (!g || this.state !== 'running') return;
      const p = pos(e);
      if (g.onPointer) g.onPointer('up', p.x, p.y, false);
      const dx = e.clientX - sx, dy = e.clientY - sy, dist = Math.hypot(dx, dy);
      if (dist < 14 && g.tap) g.tap(p.x, p.y);
      else if (dist >= 28 && g.swipe && g.onKey) {
        const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
        g.onKey(key, true, false);
        g.onKey(key, false, false);
      }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', () => { down = false; });
  },

  /* ---------- Fluxo do jogo ---------- */
  showCustom(id) {
    ['memory-grid', 'g2048-wrap', 'simon-wrap'].forEach(x => document.getElementById(x).classList.toggle('hidden', x !== id));
  },

  showOverlay({ icon = 'fa-play', tone = '', title, msg = '', best = '', btn = 'INICIAR', controls = '' }) {
    const ic = document.getElementById('overlay-icon');
    ic.className = `fa-solid ${icon}`;
    ic.parentElement.className = `overlay-icon ${tone}`;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent = msg;
    document.getElementById('overlay-best').textContent = best;
    document.getElementById('start-game-btn').textContent = btn;
    document.getElementById('overlay-controls').textContent = controls;
    document.getElementById('game-overlay').classList.remove('hidden');
  },
  hideOverlay() { document.getElementById('game-overlay').classList.add('hidden'); },

  openGame(id) {
    const meta = GAME_LIST.find(g => g.id === id);
    if (!meta || !Games[id]) return;
    this.clearTimers();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.currentGame = id;
    this.state = 'ready';
    this.particles = []; this.shake = 0; this.keys = {};
    this.score = 0;
    this.bestAtStart = this.scores[id] || 0;

    document.getElementById('hub-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');
    document.getElementById('current-game-title').textContent = meta.title;
    document.getElementById('live-score').textContent = 0;
    document.getElementById('live-highscore').textContent = this.bestAtStart;
    document.getElementById('extra-label').textContent = meta.extra;
    document.getElementById('live-extra').textContent = '-';
    document.getElementById('controls-hint').textContent = meta.controls;

    const g = Games[id];
    const isCanvas = g.type === 'canvas';
    document.getElementById('canvas-container').classList.toggle('hidden', !isCanvas);
    document.getElementById('custom-game-container').classList.toggle('hidden', isCanvas);
    document.getElementById('pause-btn').classList.toggle('hidden', !isCanvas);

    if (g.init) g.init();
    if (isCanvas) this.renderIdle();

    this.showOverlay({
      icon: meta.icon, title: 'PRONTO?', msg: meta.desc,
      best: this.bestAtStart ? `RECORDE: ${this.bestAtStart}` : 'Seja o primeiro a marcar pontos!',
      btn: 'INICIAR', controls: meta.controls
    });
    window.scrollTo(0, 0);
  },

  closeGame() {
    this.clearTimers();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.currentGame = null;
    this.state = 'hub';
    this.keys = {};
    document.getElementById('game-view').classList.add('hidden');
    document.getElementById('hub-view').classList.remove('hidden');
  },

  primaryAction() {
    if (this.state === 'ready' || this.state === 'over') this.startGame();
    else if (this.state === 'paused') this.togglePause();
  },

  startGame() {
    const g = this.game(); if (!g) return;
    this.clearTimers();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.particles = []; this.shake = 0;
    this.bestAtStart = this.scores[this.currentGame] || 0;
    this.setScore(0);
    this.setExtra('-');
    this.hideOverlay();
    this.state = 'running';
    g.start();
    if (g.type === 'canvas') {
      this.lastTs = 0; this.acc = 0;
      this.render();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }
  },

  togglePause() {
    const g = this.game();
    if (!g || g.type !== 'canvas') return;
    if (this.state === 'running') {
      this.state = 'paused';
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.keys = {};
      this.showOverlay({ icon: 'fa-pause', title: 'PAUSADO', msg: 'Respire fundo e volte quando quiser.', best: '', btn: 'CONTINUAR', controls: 'P ou ESC também continuam o jogo' });
    } else if (this.state === 'paused') {
      this.hideOverlay();
      this.state = 'running';
      this.lastTs = 0; this.acc = 0;
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }
  },

  endGame(title = 'GAME OVER', msg = '', win = false) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.clearTimers();
    const s = this.score;
    this.saveScore(this.currentGame, s);
    const record = s > this.bestAtStart && s > 0;
    if (win) this.sfxWin(); else this.sfxLose();
    const id = this.currentGame;
    this.later(() => {
      if (this.currentGame !== id) return;
      this.showOverlay({
        icon: record ? 'fa-trophy' : (win ? 'fa-star' : 'fa-skull'),
        tone: record || win ? 'good' : 'bad',
        title,
        msg: `${msg ? msg + ' · ' : ''}Pontuação: ${s}`,
        best: record ? '★ NOVO RECORDE! ★' : `RECORDE: ${Math.max(this.bestAtStart, s)}`,
        btn: 'JOGAR DE NOVO',
        controls: ''
      });
    }, 450);
  },

  /* ---------- Loop de canvas (passo fixo de 60 Hz) ---------- */
  loop(ts) {
    if (this.state !== 'running') { this.raf = null; return; }
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (!this.lastTs) this.lastTs = ts;
    this.acc += Math.min(100, ts - this.lastTs);
    this.lastTs = ts;
    const STEP = 1000 / 60;
    let n = 0;
    while (this.acc >= STEP && n < 5) {
      this.tick();
      this.acc -= STEP;
      n++;
      if (this.state !== 'running') break;
    }
    if (n >= 5) this.acc = 0;
    this.render();
  },

  tick() {
    const g = this.game();
    if (!g) return;
    g.update();
    this.updateParticles();
  },

  render() {
    const g = this.game();
    if (!g || !this.ctx) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    g.draw(ctx);
    this.drawParticles(ctx);
    ctx.restore();
  },

  renderIdle() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBg(ctx, '#060a16', '#0b1230', 0);
  }
};

const Games = {};

/* =========================================================
   1. SPACE BLASTER
   ========================================================= */
Games.space = {
  type: 'canvas',

  start() {
    this.p = { x: W / 2, y: H - 60, w: 34, h: 26, speed: 7.5, cool: 0, inv: 0, lives: 3 };
    this.bullets = []; this.enemies = [];
    this.t = 0; this.level = 1; this.kills = 0;
    this.ptr = null; this.firing = false; this.over = false;
    App.setExtra('♥♥♥');
  },

  spawn() {
    const lv = this.level, r = Math.random();
    let e;
    if (lv >= 3 && r < 0.18) e = { kind: 'tank', w: 34, h: 30, hp: 3, vy: 0.9 + lv * 0.05, color: '#b000ff', pts: 30 };
    else if (lv >= 2 && r < 0.45) e = { kind: 'zig', w: 26, h: 24, hp: 1, vy: 1.4 + lv * 0.1, color: '#00ff66', pts: 15, amp: 35 + Math.random() * 30 };
    else e = { kind: 'basic', w: 26, h: 24, hp: 1, vy: 1.6 + Math.random() + lv * 0.12, color: '#ffb700', pts: 10 };
    e.x = e.x0 = 80 + Math.random() * (W - 160);
    e.y = -30; e.age = 0;
    this.enemies.push(e);
  },

  hurt() {
    const p = this.p;
    if (this.over || p.inv > 0) return;
    p.lives--;
    p.inv = 90;
    App.addShake(10);
    App.playSound(120, 'sawtooth', 0.25, 0.1, 40);
    App.setExtra(p.lives > 0 ? '♥'.repeat(p.lives) : '—');
    if (p.lives <= 0) {
      this.over = true;
      App.burst(p.x, p.y, '#00f0ff', 32, 4, 45);
      App.endGame('GAME OVER', 'Sua nave foi destruída');
    }
  },

  update() {
    if (this.over) return;
    const p = this.p, k = App.keys;
    // W/S = frente/trás, A/D = lados (setas também). Resposta instantânea, sem aceleração.
    const dx = ((k['ArrowRight'] || k['d']) ? 1 : 0) - ((k['ArrowLeft'] || k['a']) ? 1 : 0);
    const dy = ((k['ArrowDown'] || k['s']) ? 1 : 0) - ((k['ArrowUp'] || k['w']) ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);           // diagonal não fica mais rápida
      p.x += dx / len * p.speed;
      p.y += dy / len * p.speed;
      this.ptr = null;
    } else if (this.ptr) {                      // celular: nave segue o dedo (um pouco acima dele)
      const tx = this.ptr.x, ty = this.ptr.y - 36, d = Math.hypot(tx - p.x, ty - p.y);
      if (d > 0.5) { const m = Math.min(d, 13); p.x += (tx - p.x) / d * m; p.y += (ty - p.y) / d * m; }
    }
    // a nave nunca sai da tela
    p.x = clamp(p.x, p.w / 2, W - p.w / 2);
    p.y = clamp(p.y, p.h / 2 + 2, H - p.h / 2 - 8);
    if (p.cool > 0) p.cool--;
    if (p.inv > 0) p.inv--;

    if ((k[' '] || this.firing) && p.cool === 0) {
      this.bullets.push({ x: p.x, y: p.y - p.h / 2, w: 4, h: 12 });
      p.cool = 9;
      App.playSound(720, 'square', 0.06, 0.035, 360);
    }

    this.t++;
    if (this.t >= Math.max(16, 52 - this.level * 4)) { this.t = 0; this.spawn(); }

    this.bullets.forEach(b => b.y -= 9);
    this.bullets = this.bullets.filter(b => b.y > -20);

    for (const e of this.enemies) {
      e.y += e.vy; e.age++;
      if (e.kind === 'zig') e.x = e.x0 + Math.sin(e.age * 0.06) * e.amp;
      // inimigo que passa da tela some SEM dar dano
      if (e.y - e.h / 2 > H + 10) { e.dead = true; continue; }
      // dano só quando o inimigo realmente encosta no corpo da nave (hitbox justa, menor que o desenho)
      const hx = e.w * 0.38 + p.w * 0.28, hy = e.h * 0.38 + p.h * 0.32;
      if (p.inv === 0 && Math.abs(e.x - p.x) < hx && Math.abs(e.y - p.y) < hy) {
        e.dead = true;
        App.burst(e.x, e.y, e.color, 16);
        this.hurt();
      }
    }

    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (b.dead || e.dead) continue;
        if (Math.abs(b.x - e.x) < (e.w + b.w) / 2 && Math.abs(b.y - e.y) < (e.h + b.h) / 2) {
          b.dead = true; e.hp--;
          App.burst(b.x, b.y, '#fff', 4, 2, 14);
          if (e.hp <= 0) {
            e.dead = true;
            App.addScore(e.pts);
            App.burst(e.x, e.y, e.color, 18, 3.5, 34);
            App.playSound(180, 'sawtooth', 0.12, 0.06, 60);
            this.kills++;
            this.level = 1 + Math.floor(this.kills / 10);
          } else App.playSound(300, 'square', 0.04, 0.04);
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => !e.dead);
  },

  onPointer(t, x, y, down) {
    if (t === 'down') { this.firing = true; this.ptr = { x, y }; }
    else if (t === 'move' && down) this.ptr = { x, y };
    else if (t === 'up') { this.firing = false; this.ptr = null; }
  },

  drawEnemy(ctx, e) {
    App.glow(ctx, e.color, 12);
    ctx.fillStyle = e.color;
    ctx.beginPath();
    if (e.kind === 'tank') {
      App.rrect(ctx, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 6);
      ctx.fill();
      App.noGlow(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(e.x - 8, e.y - 4, 16, 8);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < e.hp; i++) ctx.fillRect(e.x - 9 + i * 7, e.y + e.h / 2 - 6, 5, 3);
    } else if (e.kind === 'zig') {
      ctx.moveTo(e.x, e.y + e.h / 2); ctx.lineTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x, e.y - e.h / 2); ctx.lineTo(e.x - e.w / 2, e.y);
      ctx.closePath(); ctx.fill();
      App.noGlow(ctx);
      ctx.fillStyle = '#021a0c'; ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
    } else {
      ctx.moveTo(e.x, e.y + e.h / 2); ctx.lineTo(e.x - e.w / 2, e.y - e.h / 2); ctx.lineTo(e.x, e.y - e.h / 4); ctx.lineTo(e.x + e.w / 2, e.y - e.h / 2);
      ctx.closePath(); ctx.fill();
      App.noGlow(ctx);
    }
  },

  draw(ctx) {
    App.drawBg(ctx, '#050814', '#0a1030', 1.4);
    this.enemies.forEach(e => this.drawEnemy(ctx, e));

    App.glow(ctx, '#ff0055', 10);
    ctx.fillStyle = '#ff6b9a';
    this.bullets.forEach(b => ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h));
    App.noGlow(ctx);

    const p = this.p;
    if (!this.over && (p.inv === 0 || Math.floor(p.inv / 5) % 2 === 0)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      App.glow(ctx, '#00f0ff', 16);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -p.h / 2); ctx.lineTo(p.w / 2, p.h / 2); ctx.lineTo(0, p.h / 4); ctx.lineTo(-p.w / 2, p.h / 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      App.glow(ctx, '#ff6600', 12);
      ctx.fillStyle = '#ffb700';
      const f = 6 + Math.random() * 6;
      ctx.beginPath(); ctx.moveTo(-5, p.h / 4 + 2); ctx.lineTo(0, p.h / 4 + 2 + f); ctx.lineTo(5, p.h / 4 + 2); ctx.fill();
      ctx.restore();
    }
    App.text(ctx, `NÍVEL ${this.level}`, W - 12, 16, 12, 'rgba(255,255,255,0.55)', 'right');
  }
};

/* =========================================================
   2. PIXEL JUMP (corrida infinita)
   ========================================================= */
Games.jump = {
  type: 'canvas', swipe: true,

  mkLayer(speed, color, minH, maxH) {
    const items = [];
    let x = 0;
    while (x < W + 140) {
      const w = 30 + Math.random() * 50, h = minH + Math.random() * (maxH - minH);
      items.push({ x, w, h });
      x += w + Math.random() * 10;
    }
    return { speed, color, items, total: x };
  },

  start() {
    this.gy = H - 60;
    this.p = { x: 70, y: this.gy, w: 26, hStand: 36, hDuck: 20, h: 36, vy: 0, ground: true, duck: 0 };
    this.obs = []; this.speed = 5; this.dist = 0; this.t = 0; this.gap = 240; this.scroll = 0;
    this.hold = 0; this.buf = 0; this.over = false;
    this.layers = [this.mkLayer(0.15, '#10142a', 60, 140), this.mkLayer(0.35, '#161c3d', 40, 100)];
    App.setExtra('x1.0');
  },

  jump() {
    const p = this.p;
    if (this.over) return;
    // apertou um pouco antes de pousar? guarda o pulo por ~9 frames e executa assim que tocar o chão
    if (!p.ground) { this.buf = 9; return; }
    p.vy = -12.2; p.ground = false; this.hold = 14;
    App.playSound(420, 'sine', 0.12, 0.06, 760);
    App.burst(p.x, this.gy, '#00f0ff', 6, 2, 16);
  },

  onKey(k, down, repeat) {
    if (!down || repeat) return;
    if (k === ' ' || k === 'ArrowUp' || k === 'w') this.jump();
    if (k === 'ArrowDown' || k === 's') this.p.duck = 22;
  },

  tap() { this.jump(); },

  update() {
    if (this.over) return;
    const p = this.p, k = App.keys;
    this.t++;
    if (this.buf > 0) this.buf--;
    this.speed = Math.min(13, 5 + this.t / 600);
    this.dist += this.speed * 0.1;
    this.scroll += this.speed;

    const wantDuck = k['ArrowDown'] || k['s'] || p.duck > 0;
    if (p.duck > 0) p.duck--;
    p.h = (wantDuck && p.ground) ? p.hDuck : p.hStand;

    const held = k[' '] || k['ArrowUp'] || k['w'] || this.hold > 0;
    if (this.hold > 0) this.hold--;
    p.vy += 0.62;
    if (!p.ground && wantDuck) p.vy += 0.9;                         // queda rápida
    if (!p.ground && p.vy < -3 && !held) p.vy += 0.9;               // soltou = pulo mais curto
    p.y += p.vy;
    if (p.y >= this.gy) {
      p.y = this.gy; p.vy = 0;
      if (!p.ground) { p.ground = true; App.burst(p.x, this.gy, '#00f0ff', 6, 2, 16); }
      if (this.buf > 0) { this.buf = 0; this.jump(); }   // pulo guardado
    }

    this.gap -= this.speed;
    if (this.gap <= 0) {
      this.spawnObs();
      this.gap = 260 + Math.random() * 240 + this.speed * 18;
    }
    for (const o of this.obs) o.x -= this.speed;
    this.obs = this.obs.filter(o => o.x + o.w > -20);

    const px = p.x + 4, pw = p.w - 8, py = p.y - p.h + 3, ph = p.h - 3;
    for (const o of this.obs) {
      const ox = o.x + 5, ow = o.w - 10, oy = o.top + 4, oh = o.h - 4;
      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
        this.over = true;
        App.burst(p.x + p.w / 2, p.y - p.h / 2, '#00f0ff', 30, 4, 40);
        App.addShake(12);
        App.endGame('GAME OVER', `Você correu ${Math.floor(this.dist)} m`);
        return;
      }
    }

    App.setScore(Math.floor(this.dist));
    if (this.t % 15 === 0) App.setExtra('x' + (this.speed / 5).toFixed(1));
  },

  spawnObs() {
    if (this.dist > 120 && Math.random() < 0.28) {
      this.obs.push({ type: 'fly', x: W + 20, w: 34, h: 18, top: this.gy - 44 });
    } else {
      const n = 1 + Math.floor(Math.random() * 3), h = 26 + Math.random() * 14;
      this.obs.push({ type: 'spike', n, x: W + 20, w: 22 * n, h, top: this.gy - h });
    }
  },

  draw(ctx) {
    // Céu + sol e chão com brilho (shadowBlur) são PESADOS de desenhar: fazemos uma vez só e reaproveitamos.
    // Isso evita queda de frames, que era a causa do "atraso" nos botões.
    if (!this.bgCache) {
      this.bgCache = App.makeCache((c) => {
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#1a0a3a'); sky.addColorStop(0.6, '#0b1030'); sky.addColorStop(1, '#070a18');
        c.fillStyle = sky; c.fillRect(0, 0, W, H);
        App.glow(c, '#ff0055', 40);
        c.fillStyle = '#ff2f7a';
        c.beginPath(); c.arc(470, 120, 46, 0, Math.PI * 2); c.fill();
        App.noGlow(c);
      });
      this.groundCache = App.makeCache((c) => {
        c.fillStyle = '#06210f'; c.fillRect(0, this.gy, W, H - this.gy);
        App.glow(c, '#00ff66', 10);
        c.fillStyle = '#00ff66'; c.fillRect(0, this.gy, W, 3);
        App.noGlow(c);
      });
    }
    ctx.drawImage(this.bgCache, 0, 0, W, H);

    for (const L of this.layers) {
      const off = (this.scroll * L.speed) % L.total;
      ctx.fillStyle = L.color;
      for (const it of L.items) {
        let x = it.x - off;
        if (x < -it.w) x += L.total;
        ctx.fillRect(x, this.gy - it.h, it.w, it.h);
        if (L.speed > 0.3) {
          ctx.fillStyle = 'rgba(0,240,255,0.25)';
          for (let wy = this.gy - it.h + 8; wy < this.gy - 6; wy += 14) ctx.fillRect(x + 6, wy, 4, 4);
          ctx.fillStyle = L.color;
        }
      }
    }

    // chão (imagem pronta + tracinhos que andam)
    ctx.drawImage(this.groundCache, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,255,102,0.35)';
    for (let x = -((this.scroll) % 60); x < W; x += 60) ctx.fillRect(x, this.gy + 18, 30, 2);

    // obstáculos
    for (const o of this.obs) {
      if (o.type === 'spike') {
        App.glow(ctx, '#ff0055', 10); ctx.fillStyle = '#ff0055';
        const sw = o.w / o.n;
        for (let i = 0; i < o.n; i++) {
          ctx.beginPath();
          ctx.moveTo(o.x + i * sw, this.gy); ctx.lineTo(o.x + i * sw + sw / 2, this.gy - o.h); ctx.lineTo(o.x + (i + 1) * sw, this.gy);
          ctx.closePath(); ctx.fill();
        }
      } else {
        App.glow(ctx, '#ffb700', 12); ctx.fillStyle = '#ffb700';
        App.rrect(ctx, o.x, o.top, o.w, o.h, 8); ctx.fill();
        App.noGlow(ctx);
        ctx.fillStyle = '#2a1a00'; ctx.fillRect(o.x + 6, o.top + 7, 22, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const wing = Math.sin(this.t * 0.5) * 5;
        ctx.fillRect(o.x + 8, o.top - 3 + wing, 18, 2);
      }
      App.noGlow(ctx);
    }

    // jogador
    const p = this.p;
    if (!this.over) {
      App.glow(ctx, '#00f0ff', 14);
      ctx.fillStyle = '#00f0ff';
      App.rrect(ctx, p.x, p.y - p.h, p.w, p.h, 6); ctx.fill();
      App.noGlow(ctx);
      ctx.fillStyle = '#031a1f'; ctx.fillRect(p.x + p.w - 12, p.y - p.h + 6, 10, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x + p.w - 6, p.y - p.h + 7, 3, 3);
      if (p.ground && p.h === p.hStand) {
        ctx.fillStyle = '#00a6b3';
        const step = Math.floor(this.t / 6) % 2;
        ctx.fillRect(p.x + 4 + step * 10, p.y - 5, 8, 5);
      }
    }
    App.text(ctx, `${Math.floor(this.dist)} m`, W - 12, 18, 14, 'rgba(255,255,255,0.7)', 'right');
  }
};

/* =========================================================
   3. MEMORY MATCH
   ========================================================= */
Games.memory = {
  type: 'dom',
  icons: ['fa-bolt', 'fa-ghost', 'fa-dragon', 'fa-bomb', 'fa-gem', 'fa-gamepad', 'fa-skull', 'fa-rocket'],
  colors: ['#ffb700', '#d400ff', '#ff0055', '#ff6600', '#00f0ff', '#00ff66', '#e8eef5', '#ff4d88'],

  init() {
    App.showCustom('memory-grid');
    this.grid = document.getElementById('memory-grid');
    this.build();
  },

  build() {
    this.grid.innerHTML = '';
    this.flipped = []; this.lock = false;
    const deck = shuffle([...this.icons.keys(), ...this.icons.keys()]);
    deck.forEach(idx => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.idx = idx;
      card.style.setProperty('--ic', this.colors[idx]);
      card.innerHTML = `<div class="mc-inner">
        <div class="mc-face mc-back"><i class="fa-solid fa-question"></i></div>
        <div class="mc-face mc-front"><i class="fa-solid ${this.icons[idx]}"></i></div></div>`;
      card.addEventListener('click', () => this.flip(card));
      this.grid.appendChild(card);
    });
  },

  start() {
    this.moves = 0; this.pairs = 0; this.secs = 0;
    this.build();
    this.updateExtra();
    App.every(() => { this.secs++; this.updateExtra(); }, 1000);
  },

  updateExtra() { App.setExtra(`${this.moves} · ${this.secs}s`); },

  flip(card) {
    if (App.state !== 'running' || this.lock) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    this.flipped.push(card);
    App.playSound(500, 'sine', 0.06, 0.05);
    if (this.flipped.length < 2) return;

    this.moves++;
    this.updateExtra();
    const [a, b] = this.flipped;
    if (a.dataset.idx === b.dataset.idx) {
      a.classList.add('matched'); b.classList.add('matched');
      this.flipped = [];
      this.pairs++;
      App.setScore(this.pairs * 50);
      App.playSound(800, 'triangle', 0.14, 0.07);
      if (this.pairs === this.icons.length) {
        const bonus = Math.max(0, 600 - this.moves * 15 - this.secs * 2);
        App.setScore(this.pairs * 50 + bonus);
        App.clearTimers();
        App.endGame('VITÓRIA!', `${this.moves} jogadas em ${this.secs}s`, true);
      }
    } else {
      this.lock = true;
      a.classList.add('wrong'); b.classList.add('wrong');
      App.playSound(180, 'sawtooth', 0.12, 0.04);
      App.later(() => {
        [a, b].forEach(c => c.classList.remove('flipped', 'wrong'));
        this.flipped = []; this.lock = false;
      }, 750);
    }
  }
};

/* =========================================================
   4. CYBER SNAKE
   ========================================================= */
Games.snake = {
  type: 'canvas', swipe: true,

  start() {
    this.cols = 30; this.rows = 20; this.cs = 20;
    this.body = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 }; this.queue = [];
    this.f = 0; this.eaten = 0; this.over = false; this.bonus = null; this.t = 0;
    this.placeFood();
    App.setExtra('3');
  },

  freeCell() {
    for (let i = 0; i < 400; i++) {
      const c = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
      const used = this.body.some(s => s.x === c.x && s.y === c.y) || (this.food && this.food.x === c.x && this.food.y === c.y) || (this.bonus && this.bonus.x === c.x && this.bonus.y === c.y);
      if (!used) return c;
    }
    return { x: 0, y: 0 };
  },
  placeFood() { this.food = null; this.food = this.freeCell(); },

  onKey(k, down) {
    if (!down) return;
    const map = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    const d = map[k];
    if (!d) return;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if ((d[0] === -last.x && d[1] === -last.y) || (d[0] === last.x && d[1] === last.y)) return;
    if (this.queue.length < 2) this.queue.push({ x: d[0], y: d[1] });
  },

  update() {
    if (this.over) return;
    this.t++;
    this.f++;
    const every = Math.max(3, 8 - Math.floor(this.eaten / 5));
    if (this.f < every) return;
    this.f = 0;

    if (this.queue.length) this.dir = this.queue.shift();
    const head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y };
    if (this.bonus) { this.bonus.t--; if (this.bonus.t <= 0) this.bonus = null; }

    const eatFood = head.x === this.food.x && head.y === this.food.y;
    const eatBonus = this.bonus && head.x === this.bonus.x && head.y === this.bonus.y;
    const check = (eatFood || eatBonus) ? this.body : this.body.slice(0, -1);
    const hit = head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows || check.some(s => s.x === head.x && s.y === head.y);
    if (hit) {
      this.over = true;
      App.burst(this.body[0].x * this.cs + 10, this.body[0].y * this.cs + 10, '#00f0ff', 30, 4, 40);
      App.addShake(10);
      App.endGame('GAME OVER', `Tamanho ${this.body.length}`);
      return;
    }

    this.body.unshift(head);
    const cx = head.x * this.cs + this.cs / 2, cy = head.y * this.cs + this.cs / 2;
    if (eatFood) {
      this.eaten++;
      App.addScore(10);
      App.burst(cx, cy, '#ff0055', 14, 3, 26);
      App.playSound(700, 'sine', 0.08, 0.07, 1000);
      this.placeFood();
      if (this.eaten % 5 === 0 && !this.bonus) { const c = this.freeCell(); this.bonus = { x: c.x, y: c.y, t: 45 }; }
    } else if (eatBonus) {
      App.addScore(50);
      App.burst(cx, cy, '#ffb700', 24, 4, 34);
      App.playSound(900, 'triangle', 0.18, 0.08, 1400);
      this.bonus = null;
    } else {
      this.body.pop();
    }
    App.setExtra(String(this.body.length));
  },

  draw(ctx) {
    App.drawBg(ctx, '#050912', '#08101c', 0.1);
    ctx.fillStyle = 'rgba(0,240,255,0.06)';
    for (let x = 0; x < this.cols; x++) for (let y = 0; y < this.rows; y++) ctx.fillRect(x * this.cs + 9, y * this.cs + 9, 2, 2);

    const cs = this.cs, pulse = 1 + Math.sin(this.t * 0.15) * 0.12;
    if (this.food) {
      App.glow(ctx, '#ff0055', 16);
      ctx.fillStyle = '#ff0055';
      ctx.beginPath(); ctx.arc(this.food.x * cs + cs / 2, this.food.y * cs + cs / 2, (cs / 2 - 3) * pulse, 0, Math.PI * 2); ctx.fill();
      App.noGlow(ctx);
    }
    if (this.bonus) {
      const bx = this.bonus.x * cs + cs / 2, by = this.bonus.y * cs + cs / 2;
      App.glow(ctx, '#ffb700', 20);
      ctx.fillStyle = '#ffb700';
      ctx.beginPath(); ctx.moveTo(bx, by - 9 * pulse); ctx.lineTo(bx + 8 * pulse, by); ctx.lineTo(bx, by + 9 * pulse); ctx.lineTo(bx - 8 * pulse, by); ctx.closePath(); ctx.fill();
      App.noGlow(ctx);
      ctx.strokeStyle = 'rgba(255,183,0,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, 12, -Math.PI / 2, -Math.PI / 2 + (this.bonus.t / 45) * Math.PI * 2); ctx.stroke();
    }

    const n = this.body.length;
    for (let i = n - 1; i >= 0; i--) {
      const s = this.body[i];
      const hue = 185 + (i / Math.max(1, n)) * 75;
      ctx.fillStyle = `hsl(${hue}, 100%, ${i === 0 ? 60 : 52}%)`;
      if (i === 0) App.glow(ctx, '#00f0ff', 14); else App.noGlow(ctx);
      App.rrect(ctx, s.x * cs + 1, s.y * cs + 1, cs - 2, cs - 2, i === 0 ? 7 : 5);
      ctx.fill();
    }
    App.noGlow(ctx);
    const h = this.body[0];
    // olhos: um pouco à frente e um de cada lado da cabeça
    const hx = h.x * cs + cs / 2, hy = h.y * cs + cs / 2;
    const fx = this.dir.x * 3, fy = this.dir.y * 3;
    const sx = -this.dir.y * 4, sy = this.dir.x * 4;
    ctx.fillStyle = '#02131a';
    ctx.fillRect(hx + fx + sx - 1.5, hy + fy + sy - 1.5, 3, 3);
    ctx.fillRect(hx + fx - sx - 1.5, hy + fy - sy - 1.5, 3, 3);
  }
};

/* =========================================================
   5. NEON BREAKER
   ========================================================= */
Games.breaker = {
  type: 'canvas', hoverMove: true,
  rowColors: ['#ff0055', '#ff6600', '#ffb700', '#00ff66', '#00f0ff'],

  start() {
    this.cols = 10; this.rows = 5; this.bw = 52; this.bh = 18; this.gap = 6; this.ox = 13; this.oy = 44;
    this.level = 1; this.lives = 3; this.over = false; this.banner = 0; this.tx = null;
    this.paddle = { x: W / 2, y: H - 24, w: 90, h: 10, base: 90, wide: 0 };
    this.drops = [];
    this.buildBricks();
    this.resetBall();
    this.updateExtra();
  },

  updateExtra() { App.setExtra('♥'.repeat(this.lives)); },

  buildBricks() {
    const pat = (this.level - 1) % 3;
    this.bricks = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let has = true;
        if (pat === 1) has = (r + c) % 2 === 0;
        if (pat === 2) has = c >= r && c <= this.cols - 1 - r;
        if (!has) continue;
        const hp = 1 + (r === 0 ? 1 : 0) + (this.level >= 3 && r === 1 ? 1 : 0);
        this.bricks.push({ r, c, hp, max: hp, flash: 0 });
      }
    }
  },

  speedNow() { return Math.min(7.5, 4.2 + (this.level - 1) * 0.35); },

  resetBall() {
    this.balls = [{ x: this.paddle.x, y: this.paddle.y - 12, vx: 0, vy: 0, r: 6, stuck: true, trail: [] }];
  },

  launch() {
    for (const b of this.balls) {
      if (!b.stuck) continue;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6, sp = this.speedNow();
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.stuck = false;
      App.playSound(400, 'square', 0.08, 0.05, 700);
    }
  },

  onKey(k, down) {
    if (!down) return;
    if (k === ' ' || k === 'ArrowUp') this.launch();
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd') this.tx = null;
  },

  onPointer(t, x) {
    if (t === 'move') this.tx = x;
    else if (t === 'down') { this.tx = x; this.launch(); }
  },

  brickRect(b) { return { x: this.ox + b.c * (this.bw + this.gap), y: this.oy + b.r * (this.bh + this.gap) }; },

  update() {
    if (this.over) return;
    const p = this.paddle, k = App.keys;
    const dir = ((k['ArrowRight'] || k['d']) ? 1 : 0) - ((k['ArrowLeft'] || k['a']) ? 1 : 0);
    if (dir) { p.x += dir * 7; this.tx = null; }
    else if (this.tx !== null) p.x += clamp(this.tx - p.x, -14, 14);
    if (p.wide > 0) { p.wide--; p.w = Math.min(150, p.w + 3); } else p.w = Math.max(p.base, p.w - 3);
    p.x = clamp(p.x, p.w / 2, W - p.w / 2);
    if (this.banner > 0) this.banner--;

    for (const ball of this.balls) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 7) ball.trail.shift();
      if (ball.stuck) { ball.x = p.x; ball.y = p.y - p.h / 2 - ball.r - 1; continue; }
      ball.x += ball.vx; ball.y += ball.vy;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 && ball.y + ball.r >= p.y - p.h / 2 && ball.y - ball.r <= p.y + p.h / 2 &&
          ball.x >= p.x - p.w / 2 - ball.r && ball.x <= p.x + p.w / 2 + ball.r) {
        const rel = clamp((ball.x - p.x) / (p.w / 2), -1, 1), th = rel * (Math.PI / 3), sp = this.speedNow();
        ball.vx = Math.sin(th) * sp; ball.vy = -Math.cos(th) * sp;
        ball.y = p.y - p.h / 2 - ball.r;
        App.playSound(300, 'square', 0.05, 0.05);
      }

      for (const b of this.bricks) {
        if (b.hp <= 0) continue;
        const rc = this.brickRect(b);
        const cx = clamp(ball.x, rc.x, rc.x + this.bw), cy = clamp(ball.y, rc.y, rc.y + this.bh);
        const dx = ball.x - cx, dy = ball.y - cy;
        if (dx * dx + dy * dy <= ball.r * ball.r) {
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = (dx > 0 ? 1 : -1) * Math.abs(ball.vx);
          else ball.vy = (dy > 0 ? 1 : -1) * Math.abs(ball.vy);
          b.hp--; b.flash = 6;
          const col = this.rowColors[b.r % 5];
          if (b.hp <= 0) {
            App.addScore(20 * b.max);
            App.burst(rc.x + this.bw / 2, rc.y + this.bh / 2, col, 12, 3, 28);
            App.playSound(600 + Math.random() * 200, 'sine', 0.07, 0.06);
            if (Math.random() < 0.14) this.drops.push({ x: rc.x + this.bw / 2, y: rc.y, type: ['W', 'M', 'L'][Math.floor(Math.random() * 3)] });
          } else App.playSound(420, 'triangle', 0.05, 0.05);
          break;
        }
      }
    }

    this.balls = this.balls.filter(b => b.y - b.r <= H);
    if (this.balls.length === 0) {
      this.lives--;
      App.addShake(8);
      App.playSound(140, 'sawtooth', 0.25, 0.09, 50);
      this.updateExtra();
      this.drops = [];
      if (this.lives <= 0) { this.over = true; App.endGame('GAME OVER', `Nível ${this.level}`); return; }
      this.resetBall();
    }

    for (const d of this.drops) {
      d.y += 2.2;
      if (d.y > p.y - p.h / 2 && d.y < p.y + p.h && Math.abs(d.x - p.x) < p.w / 2 + 10) {
        d.dead = true;
        App.playSound(900, 'triangle', 0.15, 0.08, 1300);
        if (d.type === 'W') p.wide = 600;
        else if (d.type === 'L') { this.lives = Math.min(5, this.lives + 1); this.updateExtra(); }
        else if (d.type === 'M') {
          const extra = [];
          for (const b of this.balls) {
            if (b.stuck) continue;
            for (const a of [-0.4, 0.4]) {
              if (this.balls.length + extra.length >= 6) break;
              const c = Math.cos(a), s = Math.sin(a);
              extra.push({ x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c, r: 6, stuck: false, trail: [] });
            }
          }
          this.balls.push(...extra);
        }
      } else if (d.y > H + 10) d.dead = true;
    }
    this.drops = this.drops.filter(d => !d.dead);

    if (this.bricks.every(b => b.hp <= 0)) {
      this.level++;
      this.banner = 100;
      App.addScore(100);
      App.playSound(880, 'triangle', 0.3, 0.08, 1320);
      this.buildBricks();
      this.drops = [];
      this.resetBall();
    }
  },

  draw(ctx) {
    App.drawBg(ctx, '#0a0612', '#120a1c', 0.3);
    for (const b of this.bricks) {
      if (b.hp <= 0) continue;
      const rc = this.brickRect(b), col = this.rowColors[b.r % 5];
      App.glow(ctx, col, 8);
      ctx.globalAlpha = b.hp < b.max ? 0.65 : 1;
      ctx.fillStyle = b.flash > 0 ? '#fff' : col;
      if (b.flash > 0) b.flash--;
      App.rrect(ctx, rc.x, rc.y, this.bw, this.bh, 4); ctx.fill();
      ctx.globalAlpha = 1;
      App.noGlow(ctx);
      if (b.max > 1) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; App.rrect(ctx, rc.x + 2, rc.y + 2, this.bw - 4, this.bh - 4, 3); ctx.stroke(); }
    }

    const p = this.paddle;
    const pg = ctx.createLinearGradient(0, p.y - p.h / 2, 0, p.y + p.h / 2);
    pg.addColorStop(0, p.wide > 0 ? '#ffe27a' : '#7df9ff'); pg.addColorStop(1, p.wide > 0 ? '#ff9d00' : '#0090ff');
    App.glow(ctx, p.wide > 0 ? '#ffb700' : '#00f0ff', 14);
    ctx.fillStyle = pg;
    App.rrect(ctx, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 5); ctx.fill();
    App.noGlow(ctx);

    for (const ball of this.balls) {
      ball.trail.forEach((t, i) => {
        ctx.globalAlpha = (i / ball.trail.length) * 0.35;
        ctx.fillStyle = '#ff6b9a';
        ctx.beginPath(); ctx.arc(t.x, t.y, ball.r * (i / ball.trail.length), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      App.glow(ctx, '#ff0055', 14);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      App.noGlow(ctx);
    }

    for (const d of this.drops) {
      const col = d.type === 'W' ? '#ffb700' : d.type === 'M' ? '#00f0ff' : '#ff0055';
      App.glow(ctx, col, 12);
      ctx.fillStyle = col;
      App.rrect(ctx, d.x - 11, d.y - 9, 22, 18, 5); ctx.fill();
      App.noGlow(ctx);
      App.text(ctx, d.type === 'L' ? '+' : d.type, d.x, d.y + 1, 12, '#000');
    }

    App.text(ctx, `NÍVEL ${this.level}`, 12, 16, 12, 'rgba(255,255,255,0.55)', 'left');
    if (this.balls.some(b => b.stuck) && !this.over) App.text(ctx, 'ESPAÇO / CLIQUE PARA LANÇAR', W / 2, H - 60, 13, 'rgba(255,255,255,0.75)');
    if (this.banner > 0) { ctx.globalAlpha = Math.min(1, this.banner / 30); App.text(ctx, `NÍVEL ${this.level}!`, W / 2, H / 2 + 40, 30, '#00ff66'); ctx.globalAlpha = 1; }
  }
};

/* =========================================================
   6. CYBER PONG
   ========================================================= */
Games.pong = {
  type: 'canvas', hoverMove: true,

  start() {
    this.pl = { x: 18, y: H / 2, w: 10, h: 70 };
    this.ai = { x: W - 28, y: H / 2, w: 10, h: 70, target: H / 2, tick: 0 };
    this.ps = 0; this.as = 0; this.hits = 0; this.target = 7; this.over = false; this.ty = null;
    this.serve(1);
    App.setExtra('0 x 0');
  },

  serve(dir) {
    this.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7, trail: [] };
    this.wait = 90; this.serveDir = dir;
  },

  onPointer(t, x, y) { if (t === 'move' || t === 'down') this.ty = y; },

  calc(win) { return this.ps * 100 + this.hits * 5 + (win ? 200 : 0); },

  update() {
    if (this.over) return;
    const k = App.keys, pl = this.pl, ai = this.ai, b = this.ball;
    const dir = ((k['ArrowDown'] || k['s']) ? 1 : 0) - ((k['ArrowUp'] || k['w']) ? 1 : 0);
    if (dir) { pl.y += dir * 6; this.ty = null; }
    else if (this.ty !== null) pl.y += clamp(this.ty - pl.y, -9, 9);
    pl.y = clamp(pl.y, pl.h / 2, H - pl.h / 2);

    // IA com reação limitada
    ai.tick++;
    if (ai.tick % 10 === 0) ai.target = (b.vx > 0 ? b.y : H / 2) + (Math.random() - 0.5) * 36;
    const aiSpeed = 3.2 + this.ps * 0.22;
    const diff = ai.target - ai.y;
    if (Math.abs(diff) > 5) ai.y += clamp(diff, -aiSpeed, aiSpeed);
    ai.y = clamp(ai.y, ai.h / 2, H - ai.h / 2);

    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 8) b.trail.shift();

    if (this.wait > 0) {
      this.wait--;
      if (this.wait === 0) { b.vx = this.serveDir * 5; b.vy = (Math.random() - 0.5) * 5; }
      return;
    }

    b.x += b.vx; b.y += b.vy;
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); App.playSound(250, 'sine', 0.04, 0.04); }
    if (b.y + b.r > H) { b.y = H - b.r; b.vy = -Math.abs(b.vy); App.playSound(250, 'sine', 0.04, 0.04); }

    const sp = Math.min(11, Math.hypot(b.vx, b.vy) + 0.35);
    if (b.vx < 0 && b.x - b.r <= pl.x + pl.w && b.x + b.r >= pl.x && Math.abs(b.y - pl.y) <= pl.h / 2 + b.r) {
      const rel = clamp((b.y - pl.y) / (pl.h / 2), -1, 1), a = rel * Math.PI / 4;
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      b.x = pl.x + pl.w + b.r;
      this.hits++;
      App.burst(b.x, b.y, '#d400ff', 8, 3, 18);
      App.playSound(450, 'sine', 0.06, 0.06, 600);
      App.setScore(this.calc(false));
    } else if (b.vx > 0 && b.x + b.r >= ai.x && b.x - b.r <= ai.x + ai.w && Math.abs(b.y - ai.y) <= ai.h / 2 + b.r) {
      const rel = clamp((b.y - ai.y) / (ai.h / 2), -1, 1), a = rel * Math.PI / 4;
      b.vx = -Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      b.x = ai.x - b.r;
      App.burst(b.x, b.y, '#ff0055', 8, 3, 18);
      App.playSound(380, 'sine', 0.06, 0.06, 520);
    }

    if (b.x < -b.r) this.point(false);
    else if (b.x > W + b.r) this.point(true);
  },

  point(player) {
    if (player) this.ps++; else this.as++;
    App.addShake(6);
    App.playSound(player ? 880 : 150, player ? 'triangle' : 'sawtooth', 0.25, 0.08);
    App.setExtra(`${this.ps} x ${this.as}`);
    App.setScore(this.calc(false));
    if (this.ps >= this.target) { this.over = true; App.setScore(this.calc(true)); App.endGame('VITÓRIA!', `Placar ${this.ps} x ${this.as}`, true); }
    else if (this.as >= this.target) { this.over = true; App.endGame('DERROTA', `Placar ${this.ps} x ${this.as}`); }
    else this.serve(player ? 1 : -1);
  },

  draw(ctx) {
    App.drawBg(ctx, '#05080e', '#0a0f1c', 0.15);
    ctx.setLineDash([8, 12]); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    App.text(ctx, String(this.ps), W / 2 - 60, 50, 44, 'rgba(212,0,255,0.28)');
    App.text(ctx, String(this.as), W / 2 + 60, 50, 44, 'rgba(255,0,85,0.28)');

    const b = this.ball;
    b.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / b.trail.length) * 0.35;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.arc(t.x, t.y, b.r * (i / b.trail.length), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    App.glow(ctx, '#d400ff', 14); ctx.fillStyle = '#d400ff';
    App.rrect(ctx, this.pl.x, this.pl.y - this.pl.h / 2, this.pl.w, this.pl.h, 4); ctx.fill();
    App.glow(ctx, '#ff0055', 14); ctx.fillStyle = '#ff0055';
    App.rrect(ctx, this.ai.x, this.ai.y - this.ai.h / 2, this.ai.w, this.ai.h, 4); ctx.fill();
    App.glow(ctx, '#00f0ff', 16); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    App.noGlow(ctx);

    if (this.wait > 0 && !this.over) App.text(ctx, String(Math.ceil(this.wait / 30)), W / 2, H / 2 - 50, 36, 'rgba(255,255,255,0.8)');
  }
};

/* =========================================================
   7. CYBER BLOCKS (Tetris)
   ========================================================= */
Games.tetris = {
  type: 'canvas',
  defs: {
    I: { s: [[1, 1, 1, 1]], c: '#00f0ff' },
    O: { s: [[1, 1], [1, 1]], c: '#ffb700' },
    T: { s: [[0, 1, 0], [1, 1, 1]], c: '#b000ff' },
    S: { s: [[0, 1, 1], [1, 1, 0]], c: '#00ff66' },
    Z: { s: [[1, 1, 0], [0, 1, 1]], c: '#ff0055' },
    J: { s: [[1, 0, 0], [1, 1, 1]], c: '#3a7bff' },
    L: { s: [[0, 0, 1], [1, 1, 1]], c: '#ff6600' }
  },

  start() {
    this.ox = (W - 200) / 2;
    this.board = Array.from({ length: 20 }, () => Array(10).fill(0));
    this.queue = []; this.hold = null; this.canHold = true;
    this.lines = 0; this.level = 1; this.gT = 0; this.lockT = 0; this.resets = 0;
    this.over = false; this.px = null;
    this.spawn();
    App.setExtra('0');
  },

  newPiece(t) {
    const d = this.defs[t];
    return { t, shape: d.s.map(r => [...r]), color: d.c, x: Math.floor((10 - d.s[0].length) / 2), y: 0 };
  },

  refill() { while (this.queue.length < 5) this.queue.push(...shuffle(Object.keys(this.defs))); },

  spawn() {
    this.refill();
    this.cur = this.newPiece(this.queue.shift());
    this.refill();
    this.canHold = true; this.gT = 0; this.lockT = 0; this.resets = 0;
    if (this.collide(this.cur.shape, this.cur.x, this.cur.y)) this.finish();
  },

  finish() {
    if (this.over) return;
    this.over = true;
    App.addShake(10);
    App.endGame('GAME OVER', `${this.lines} linhas · nível ${this.level}`);
  },

  collide(shape, x, y) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const bx = x + c, by = y + r;
        if (bx < 0 || bx >= 10 || by >= 20) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    }
    return false;
  },

  grounded() { return this.collide(this.cur.shape, this.cur.x, this.cur.y + 1); },
  touched() { if (this.grounded() && this.resets < 12) { this.lockT = 0; this.resets++; } },

  move(dx) {
    const p = this.cur;
    if (!this.collide(p.shape, p.x + dx, p.y)) { p.x += dx; this.touched(); App.playSound(220, 'square', 0.03, 0.03); }
  },

  rotate() {
    const p = this.cur;
    const ns = p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!this.collide(ns, p.x + kick, p.y)) {
        p.shape = ns; p.x += kick; this.touched();
        App.playSound(330, 'triangle', 0.05, 0.04);
        return;
      }
    }
  },

  softDrop() {
    const p = this.cur;
    if (!this.collide(p.shape, p.x, p.y + 1)) { p.y++; App.addScore(1); this.gT = 0; }
  },

  hardDrop() {
    const p = this.cur;
    let n = 0;
    while (!this.collide(p.shape, p.x, p.y + 1)) { p.y++; n++; }
    App.addScore(n * 2);
    App.addShake(3);
    this.lock();
  },

  doHold() {
    if (!this.canHold) return;
    const t = this.cur.t;
    if (this.hold === null) { this.hold = t; this.spawn(); }
    else {
      const prev = this.hold; this.hold = t;
      this.cur = this.newPiece(prev);
      this.gT = 0; this.lockT = 0; this.resets = 0;
      if (this.collide(this.cur.shape, this.cur.x, this.cur.y)) this.finish();
    }
    this.canHold = false;
    App.playSound(500, 'sine', 0.06, 0.04);
  },

  lock() {
    const p = this.cur;
    let top = false;
    p.shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (!v) return;
      const by = p.y + dy;
      if (by < 0) { top = true; return; }
      this.board[by][p.x + dx] = p.color;
    }));
    if (top) { this.finish(); return; }

    let cleared = 0;
    for (let r = 19; r >= 0; r--) {
      if (this.board[r].every(c => c)) {
        cleared++;
        for (let c = 0; c < 10; c++) App.burst(this.ox + c * 20 + 10, r * 20 + 10, this.board[r][c], 2, 3, 28);
        this.board.splice(r, 1);
        this.board.unshift(Array(10).fill(0));
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / 10);
      App.addScore([0, 100, 300, 500, 800][cleared] * this.level);
      App.addShake(cleared * 3);
      App.playSound(520 + cleared * 120, 'square', 0.2, 0.07, 1000);
      App.setExtra(String(this.lines));
    } else App.playSound(160, 'square', 0.05, 0.05);
    this.spawn();
  },

  onKey(k, down, repeat) {
    if (!down || this.over) return;
    if (k === 'ArrowLeft' || k === 'a') this.move(-1);
    else if (k === 'ArrowRight' || k === 'd') this.move(1);
    else if (k === 'ArrowDown' || k === 's') this.softDrop();
    else if (!repeat && (k === 'ArrowUp' || k === 'w' || k === 'x')) this.rotate();
    else if (!repeat && k === ' ') this.hardDrop();
    else if (!repeat && (k === 'c' || k === 'Shift')) this.doHold();
  },

  onPointer(t, x, y) {
    if (t === 'down') { this.px = x; this.p0x = x; this.p0y = y; this.moved = false; }
    else if (t === 'move' && this.px !== null) {
      while (x - this.px >= 26) { this.move(1); this.px += 26; this.moved = true; }
      while (this.px - x >= 26) { this.move(-1); this.px -= 26; this.moved = true; }
    } else if (t === 'up' && this.px !== null) {
      const dx = x - this.p0x, dy = y - this.p0y;
      if (!this.moved && Math.hypot(dx, dy) < 12) this.rotate();
      else if (dy > 50 && dy > Math.abs(dx) * 1.5) this.hardDrop();
      this.px = null;
    }
  },

  update() {
    if (this.over) return;
    const p = this.cur;
    if (this.grounded()) {
      this.lockT++;
      if (this.lockT >= 30) this.lock();
    } else {
      this.lockT = 0;
      this.gT++;
      if (this.gT >= Math.max(2, Math.round(40 * Math.pow(0.85, this.level - 1)))) { this.gT = 0; p.y++; }
    }
  },

  cell(ctx, x, y, s, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 1, y + 1, s - 2, 3); ctx.fillRect(x + 1, y + 1, 3, s - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + s - 4, s - 2, 3);
    ctx.globalAlpha = 1;
  },

  mini(ctx, t, cx, cy, s) {
    const d = this.defs[t], w = d.s[0].length * s, h = d.s.length * s;
    d.s.forEach((row, r) => row.forEach((v, c) => { if (v) this.cell(ctx, cx - w / 2 + c * s, cy - h / 2 + r * s, s, d.c); }));
  },

  draw(ctx) {
    App.drawBg(ctx, '#07060f', '#0d0a1f', 0.25);
    const ox = this.ox;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ox, 0, 200, 400);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(ox + i * 20, 0); ctx.lineTo(ox + i * 20, 400); ctx.stroke(); }
    for (let i = 1; i < 20; i++) { ctx.beginPath(); ctx.moveTo(ox, i * 20); ctx.lineTo(ox + 200, i * 20); ctx.stroke(); }
    App.glow(ctx, '#7b00ff', 12);
    ctx.strokeStyle = 'rgba(0,240,255,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(ox - 1, 0, 202, 400);
    App.noGlow(ctx);

    for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) if (this.board[r][c]) this.cell(ctx, ox + c * 20, r * 20, 20, this.board[r][c]);

    const p = this.cur;
    if (p && !this.over) {
      let gy = p.y;
      while (!this.collide(p.shape, p.x, gy + 1)) gy++;
      p.shape.forEach((row, dy) => row.forEach((v, dx) => {
        if (!v) return;
        ctx.strokeStyle = p.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
        ctx.strokeRect(ox + (p.x + dx) * 20 + 2, (gy + dy) * 20 + 2, 16, 16);
        ctx.globalAlpha = 1;
      }));
      p.shape.forEach((row, dy) => row.forEach((v, dx) => {
        if (v && p.y + dy >= 0) this.cell(ctx, ox + (p.x + dx) * 20, (p.y + dy) * 20, 20, p.color);
      }));
    }

    // painéis laterais
    const box = (x, y, w, h, label) => {
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; App.rrect(ctx, x, y, w, h, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(0,240,255,0.25)'; ctx.lineWidth = 1; App.rrect(ctx, x, y, w, h, 8); ctx.stroke();
      App.text(ctx, label, x + w / 2, y + 14, 10, 'rgba(255,255,255,0.6)');
    };
    box(24, 20, 150, 80, 'GUARDAR (C)');
    if (this.hold) this.mini(ctx, this.hold, 99, 64, 16);
    box(24, 120, 150, 60, 'NÍVEL');
    App.text(ctx, String(this.level), 99, 156, 24, '#ffb700');
    box(24, 196, 150, 60, 'LINHAS');
    App.text(ctx, String(this.lines), 99, 232, 24, '#00f0ff');

    box(426, 20, 150, 200, 'PRÓXIMAS');
    for (let i = 0; i < 3; i++) this.mini(ctx, this.queue[i], 501, 62 + i * 56, 14);
  }
};

/* =========================================================
   8. 2048 NEON
   ========================================================= */
Games.g2048 = {
  type: 'dom', swipe: true,

  init() {
    App.showCustom('g2048-wrap');
    this.gridEl = document.getElementById('g2048-grid');
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.newCell = null; this.merged = new Set();
    this.render();
  },

  start() {
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.won = false; this.over = false; this.merged = new Set(); this.newCell = null;
    this.addTile(); this.addTile();
    this.render();
    App.setExtra('2');
  },

  addTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!this.grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    this.newCell = `${r},${c}`;
  },

  move(dir) { // 0 esquerda, 1 cima, 2 direita, 3 baixo
    let moved = false;
    this.merged = new Set();
    for (let i = 0; i < 4; i++) {
      const coords = [0, 1, 2, 3].map(j => dir === 0 ? [i, j] : dir === 2 ? [i, 3 - j] : dir === 1 ? [j, i] : [3 - j, i]);
      const vals = coords.map(([r, c]) => this.grid[r][c]).filter(Boolean);
      const out = [], mergedAt = [];
      for (let k = 0; k < vals.length; k++) {
        if (vals[k] === vals[k + 1]) { out.push(vals[k] * 2); mergedAt.push(out.length - 1); App.addScore(vals[k] * 2); k++; }
        else out.push(vals[k]);
      }
      while (out.length < 4) out.push(0);
      coords.forEach(([r, c], idx) => {
        if (this.grid[r][c] !== out[idx]) moved = true;
        this.grid[r][c] = out[idx];
      });
      mergedAt.forEach(idx => this.merged.add(coords[idx].join(',')));
    }
    return moved;
  },

  canMove() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (!this.grid[r][c]) return true;
      if (c < 3 && this.grid[r][c] === this.grid[r][c + 1]) return true;
      if (r < 3 && this.grid[r][c] === this.grid[r + 1][c]) return true;
    }
    return false;
  },

  onKey(k, down) {
    if (!down || this.over) return;
    const dir = { ArrowLeft: 0, a: 0, ArrowUp: 1, w: 1, ArrowRight: 2, d: 2, ArrowDown: 3, s: 3 }[k];
    if (dir === undefined) return;
    if (!this.move(dir)) return;
    this.addTile();
    this.render();
    App.playSound(this.merged.size ? 520 : 350, 'sine', 0.06, 0.06);
    const max = Math.max(...this.grid.flat());
    App.setExtra(String(max));
    if (max >= 2048 && !this.won) {
      this.won = true; this.over = true;
      App.endGame('2048!', 'Você chegou lá!', true);
    } else if (!this.canMove()) {
      this.over = true;
      App.endGame('SEM MOVIMENTOS', `Maior bloco: ${max}`);
    }
  },

  render() {
    this.gridEl.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = this.grid[r][c], key = `${r},${c}`, tile = document.createElement('div');
        let cls = 'g2048-tile';
        if (v) cls += v > 2048 ? ' tile-super' : ` tile-${v}`;
        if (key === this.newCell) cls += ' pop';
        else if (this.merged.has(key)) cls += ' merge';
        tile.className = cls;
        tile.textContent = v || '';
        this.gridEl.appendChild(tile);
      }
    }
  }
};

/* =========================================================
   9. NEON FLAPPY
   ========================================================= */
Games.flappy = {
  type: 'canvas',

  start() {
    this.bird = { x: 110, y: H / 2, vy: 0, r: 12, rot: 0 };
    this.pipes = []; this.t = 0; this.passed = 0; this.since = 150; this.scroll = 0;
    this.started = false; this.over = false;
    App.setExtra('0');
  },

  flap() {
    if (this.over) return;
    this.started = true;
    this.bird.vy = -6.4;
    App.playSound(500, 'sine', 0.08, 0.06, 800);
    App.burst(this.bird.x - 8, this.bird.y + 6, '#00e1ff', 4, 1.5, 16);
  },

  onKey(k, down, repeat) { if (down && !repeat && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.flap(); },
  onPointer(t) { if (t === 'down') this.flap(); },

  die() {
    if (this.over) return;
    this.over = true;
    App.burst(this.bird.x, this.bird.y, '#00e1ff', 26, 4, 40);
    App.addShake(12);
    App.endGame('GAME OVER', `${this.passed} canos`);
  },

  update() {
    if (this.over) return;
    const b = this.bird;
    this.t++;
    if (!this.started) { b.y = H / 2 + Math.sin(this.t * 0.08) * 8; this.scroll += 1; return; }

    const speed = 2.6 + Math.min(1.6, this.passed * 0.04);
    this.scroll += speed;
    b.vy += 0.38; b.y += b.vy;
    b.rot = clamp(b.vy * 0.08, -0.5, 1.2);
    if (b.y - b.r < 0) { b.y = b.r; b.vy = 0; }
    if (b.y + b.r > H - 30) { b.y = H - 30 - b.r; this.die(); return; }

    const gap = Math.max(104, 138 - this.passed * 1.2);
    this.since += speed;
    if (this.since >= 210) {
      this.since = 0;
      const gy = 60 + gap / 2 + Math.random() * (H - 30 - 120 - gap);
      this.pipes.push({ x: W + 10, w: 54, gy, gap, passed: false });
    }

    for (const p of this.pipes) {
      p.x -= speed;
      const tops = [[p.x, 0, p.w, p.gy - p.gap / 2], [p.x, p.gy + p.gap / 2, p.w, H]];
      for (const [rx, ry, rw, rh] of tops) {
        const cx = clamp(b.x, rx, rx + rw), cy = clamp(b.y, ry, ry + rh);
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy < (b.r - 1) * (b.r - 1)) { this.die(); return; }
      }
      if (!p.passed && p.x + p.w < b.x) {
        p.passed = true; this.passed++;
        App.addScore(10);
        App.setExtra(String(this.passed));
        App.playSound(700, 'square', 0.08, 0.05, 1000);
      }
    }
    this.pipes = this.pipes.filter(p => p.x + p.w > -10);
  },

  draw(ctx) {
    App.drawBg(ctx, '#0a0716', '#1a0b2e', 0.6);
    // skyline distante
    ctx.fillStyle = 'rgba(176,0,255,0.12)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 70 - this.scroll * 0.25) % (W + 70) + (W + 70)) % (W + 70) - 40;
      ctx.fillRect(x, H - 30 - (40 + (i * 37) % 80), 44, 40 + (i * 37) % 80);
    }

    for (const p of this.pipes) {
      const top = p.gy - p.gap / 2, bot = p.gy + p.gap / 2;
      App.glow(ctx, '#00ff66', 12);
      const g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
      g.addColorStop(0, '#00a64a'); g.addColorStop(0.5, '#00ff66'); g.addColorStop(1, '#00a64a');
      ctx.fillStyle = g;
      ctx.fillRect(p.x + 4, 0, p.w - 8, top - 14);
      App.rrect(ctx, p.x, top - 16, p.w, 16, 4); ctx.fill();
      ctx.fillRect(p.x + 4, bot + 14, p.w - 8, H - bot);
      App.rrect(ctx, p.x, bot, p.w, 16, 4); ctx.fill();
      App.noGlow(ctx);
    }

    // chão
    ctx.fillStyle = '#10062a'; ctx.fillRect(0, H - 30, W, 30);
    App.glow(ctx, '#ff0055', 10); ctx.fillStyle = '#ff0055'; ctx.fillRect(0, H - 30, W, 3); App.noGlow(ctx);
    ctx.fillStyle = 'rgba(255,0,85,0.35)';
    for (let x = -(this.scroll % 40); x < W; x += 40) ctx.fillRect(x, H - 16, 20, 3);

    // pássaro
    const b = this.bird;
    if (!this.over) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      App.glow(ctx, '#00e1ff', 16);
      ctx.fillStyle = '#00e1ff';
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      App.noGlow(ctx);
      ctx.fillStyle = '#ffb700';
      ctx.beginPath(); ctx.moveTo(b.r - 2, -2); ctx.lineTo(b.r + 8, 2); ctx.lineTo(b.r - 2, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, -4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -4, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0090b0';
      const wing = Math.sin(this.t * 0.4) * 4;
      ctx.beginPath(); ctx.ellipse(-4, 3, 7, 4 + wing * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    App.text(ctx, String(this.passed), W / 2, 40, 40, 'rgba(255,255,255,0.85)');
    if (!this.started && !this.over) App.text(ctx, 'TOQUE OU APERTE ESPAÇO', W / 2, H / 2 + 70, 14, 'rgba(255,255,255,0.75)');
  }
};

/* =========================================================
   10. CYBER SIMON
   ========================================================= */
Games.simon = {
  type: 'dom',
  colors: ['btn-green', 'btn-red', 'btn-yellow', 'btn-blue'],
  freqs: [330, 262, 220, 165],
  keymap: { q: 0, w: 1, a: 2, s: 3, '1': 0, '2': 1, '3': 2, '4': 3 },

  init() {
    App.showCustom('simon-wrap');
    this.grid = document.getElementById('simon-grid');
    this.status = document.getElementById('simon-status');
    this.accept = false;
    this.grid.innerHTML = '';
    this.colors.forEach((c, i) => {
      const btn = document.createElement('div');
      btn.className = `simon-btn ${c}`;
      btn.addEventListener('click', () => this.press(i));
      this.grid.appendChild(btn);
    });
    this.grid.classList.add('locked');
    this.status.textContent = 'PRONTO?';
  },

  clearActive() {
    [...this.grid.children].forEach(b => b.classList.remove('active'));
  },

  start() {
    this.clearActive();
    this.grid.classList.remove('wrong');
    this.seq = []; this.step = 0; this.round = 0; this.accept = false;
    this.next();
  },

  delay() { return Math.max(300, 620 - this.round * 22); },

  next() {
    this.round++;
    this.seq.push(Math.floor(Math.random() * 4));
    this.step = 0; this.accept = false;
    App.setExtra(String(this.round));
    this.status.textContent = 'OBSERVE…';
    this.grid.classList.add('locked');
    const d = this.delay();
    let i = 0;
    const tick = () => {
      if (i >= this.seq.length) {
        this.accept = true;
        this.status.textContent = 'SUA VEZ!';
        this.grid.classList.remove('locked');
        return;
      }
      this.flash(this.seq[i], d * 0.7);
      i++;
      App.later(tick, d);
    };
    App.later(tick, 800);
  },

  flash(i, ms) {
    const btn = this.grid.children[i];
    btn.classList.add('active');
    App.playSound(this.freqs[i], 'sine', Math.max(0.15, ms / 1000), 0.1);
    App.later(() => btn.classList.remove('active'), Math.min(350, ms));
  },

  press(i) {
    if (App.state !== 'running' || !this.accept) return;
    this.flash(i, 260);
    if (i === this.seq[this.step]) {
      this.step++;
      App.addScore(5);
      if (this.step === this.seq.length) {
        this.accept = false;
        App.addScore(50);
        this.status.textContent = 'CERTO!';
        this.grid.classList.add('locked');
        App.later(() => this.next(), 900);
      }
    } else {
      this.accept = false;
      this.status.textContent = 'ERROU!';
      this.grid.classList.add('wrong', 'locked');
      App.endGame('SEQUÊNCIA ERRADA', `Rodada ${this.round}`);
      this.clearActive();
    }
  },

  onKey(k, down, repeat) {
    if (!down || repeat) return;
    const i = this.keymap[k];
    if (i !== undefined) this.press(i);
  }
};

/* =========================================================
   Start
   ========================================================= */
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => App.init());
else App.init();
