const App = {
  soundEnabled: true,
  audioCtx: null,
  scores: {
    space: 0, jump: 0, memory: 0, snake: 0, breaker: 0,
    pong: 0, tetris: 0, g2048: 0, flappy: 0, simon: 0
  },
  currentGame: null,
  activeLoop: null,

  init() {
    this.loadScores();
    this.setupBackgroundCanvas();
    this.bindEvents();
  },

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playSound(freq = 440, type = 'sine', duration = 0.1) {
    if (!this.soundEnabled) return;
    this.initAudio();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  },

  loadScores() {
    const saved = localStorage.getItem('nexus_scores_v2');
    if (saved) {
      this.scores = { ...this.scores, ...JSON.parse(saved) };
    }
    this.updateScoreDisplays();
  },

  saveScore(game, score) {
    if (score > (this.scores[game] || 0)) {
      this.scores[game] = score;
      localStorage.setItem('nexus_scores_v2', JSON.stringify(this.scores));
      this.updateScoreDisplays();
    }
  },

  updateScoreDisplays() {
    let total = 0;
    Object.keys(this.scores).forEach(key => {
      total += this.scores[key];
      const el = document.getElementById(`hs-${key}`);
      if (el) el.textContent = this.scores[key];
    });
    const globalEl = document.getElementById('global-score');
    if (globalEl) globalEl.textContent = total;
  },

  setupBackgroundCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      size: Math.random() * 2 + 1, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  },

  bindEvents() {
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        this.soundEnabled = !this.soundEnabled;
        e.currentTarget.querySelector('i').className = this.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const cat = e.target.dataset.category;
        document.querySelectorAll('.game-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
        });
      });
    });

    document.querySelectorAll('.game-card').forEach(card => {
      const btn = card.querySelector('.play-btn');
      if (btn) {
        btn.addEventListener('click', () => this.openGame(card.dataset.game));
      }
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => this.closeGame());

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this.currentGame && Games[this.currentGame]) Games[this.currentGame].start();
      });
    }

    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.currentGame && Games[this.currentGame]) {
          document.getElementById('game-overlay').classList.add('hidden');
          Games[this.currentGame].start();
        }
      });
    }
  },

  openGame(gameKey) {
    this.currentGame = gameKey;
    document.getElementById('hub-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');

    const titles = {
      space: 'Space Blaster', jump: 'Pixel Jump', memory: 'Memory Match', snake: 'Cyber Snake',
      breaker: 'Neon Breaker', pong: 'Cyber Pong', tetris: 'Cyber Blocks', g2048: '2048 Neon',
      flappy: 'Neon Flappy', simon: 'Cyber Simon'
    };
    document.getElementById('current-game-title').textContent = titles[gameKey] || 'Mini Game';
    document.getElementById('live-highscore').textContent = this.scores[gameKey] || 0;
    document.getElementById('live-score').textContent = 0;

    const isCanvas = !['memory', 'g2048', 'simon'].includes(gameKey);
    document.getElementById('canvas-container').classList.toggle('hidden', !isCanvas);
    document.getElementById('custom-game-container').classList.toggle('hidden', isCanvas);

    document.getElementById('overlay-title').textContent = 'PRONTO?';
    document.getElementById('overlay-msg').textContent = 'Pressione Iniciar para Jogar';
    document.getElementById('game-overlay').classList.remove('hidden');

    if (Games[gameKey] && Games[gameKey].init) Games[gameKey].init();
  },

  closeGame() {
    if (this.activeLoop) cancelAnimationFrame(this.activeLoop);
    this.currentGame = null;
    document.getElementById('game-view').classList.add('hidden');
    document.getElementById('hub-view').classList.remove('hidden');
  }
};

const Games = {};

// Função para simular o pressionar de uma tecla do teclado
function simularTecla(codigoTecla, tipoEvento) {
    const evento = new KeyboardEvent(tipoEvento, {
        key: codigoTecla,
        code: codigoTecla,
        bubbles: true
    });
    document.dispatchEvent(evento);
}

// Mapear botão do ecrã com a tecla equivalente
function ligarBotao(idBotao, tecla) {
    const btn = document.getElementById(idBotao);

    // Quando o utilizador toca no botão
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Evita comportamentos padrão do navegador
        simularTecla(tecla, 'keydown');
    });

    // Quando o utilizador tira o dedo do botão
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        simularTecla(tecla, 'keyup');
    });
}

// Configurar os botões (Ajusta 'ArrowLeft', 'Space', etc. para as tuas teclas)
ligarBotao('btn-esquerda', 'ArrowLeft');
ligarBotao('btn-direita', 'ArrowRight');
ligarBotao('btn-cima', 'ArrowUp');
ligarBotao('btn-baixo', 'ArrowDown');
ligarBotao('btn-acao', 'Space'); // Ex: Barra de espaço para saltar/atirar

// 1. Space Blaster
Games.space = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    this.keys = {};
    window.onkeydown = e => this.keys[e.key] = true;
    window.onkeyup = e => this.keys[e.key] = false;
  },
  start() {
    this.score = 0;
    this.player = { x: this.width / 2 - 15, y: this.height - 40, w: 30, h: 20, speed: 5 };
    this.bullets = []; this.enemies = []; this.frame = 0; this.gameOver = false;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'space') return;
    this.update(); this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('space', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  update() {
    this.frame++;
    if (this.keys['ArrowLeft'] || this.keys['a']) this.player.x = Math.max(0, this.player.x - this.player.speed);
    if (this.keys['ArrowRight'] || this.keys['d']) this.player.x = Math.min(this.width - this.player.w, this.player.x + this.player.speed);
    if (this.keys[' '] && this.frame % 10 === 0) {
      this.bullets.push({ x: this.player.x + this.player.w / 2 - 2, y: this.player.y, w: 4, h: 10 });
      App.playSound(600, 'square', 0.05);
    }
    if (this.frame % 40 === 0) {
      this.enemies.push({ x: Math.random() * (this.width - 25), y: -25, w: 25, h: 25, speed: 2 + Math.random() * 2 });
    }
    this.bullets.forEach((b, bi) => { b.y -= 7; if (b.y < 0) this.bullets.splice(bi, 1); });
    this.enemies.forEach((e, ei) => {
      e.y += e.speed;
      if (e.y > this.height) this.gameOver = true;
      if (e.x < this.player.x + this.player.w && e.x + e.w > this.player.x && e.y < this.player.y + this.player.h && e.y + e.h > this.player.y) this.gameOver = true;
      this.bullets.forEach((b, bi) => {
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
          this.enemies.splice(ei, 1); this.bullets.splice(bi, 1);
          this.score += 10; document.getElementById('live-score').textContent = this.score;
          App.playSound(200, 'sawtooth', 0.1);
        }
      });
    });
  },
  draw() {
    this.ctx.fillStyle = '#05070f'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.beginPath(); this.ctx.moveTo(this.player.x + this.player.w / 2, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + this.player.h); this.ctx.lineTo(this.player.x + this.player.w, this.player.y + this.player.h);
    this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = '#ff0055'; this.bullets.forEach(b => this.ctx.fillRect(b.x, b.y, b.w, b.h));
    this.ctx.fillStyle = '#ffb700'; this.enemies.forEach(e => this.ctx.fillRect(e.x, e.y, e.w, e.h));
  }
};

// 2. Pixel Jump
Games.jump = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    window.onkeydown = (e) => {
      if ((e.key === ' ' || e.key === 'ArrowUp') && this.player && !this.player.isJumping) {
        this.player.vy = -12; this.player.isJumping = true;
        App.playSound(400, 'sine', 0.1);
      }
    };
  },
  start() {
    this.score = 0;
    this.player = { x: 50, y: this.height - 40, w: 25, h: 30, vy: 0, isJumping: false };
    this.obstacles = []; this.frame = 0; this.gameOver = false;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'jump') return;
    this.update(); this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('jump', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  update() {
    this.frame++; this.score++;
    document.getElementById('live-score').textContent = Math.floor(this.score / 5);
    this.player.vy += 0.6; this.player.y += this.player.vy;
    const ground = this.height - 40;
    if (this.player.y >= ground) { this.player.y = ground; this.player.vy = 0; this.player.isJumping = false; }
    if (this.frame % 90 === 0) this.obstacles.push({ x: this.width, y: ground + 5, w: 20, h: 25 });
    this.obstacles.forEach((o, i) => {
      o.x -= 5; if (o.x + o.w < 0) this.obstacles.splice(i, 1);
      if (this.player.x < o.x + o.w && this.player.x + this.player.w > o.x && this.player.y < o.y + o.h && this.player.y + this.player.h > o.y) this.gameOver = true;
    });
  },
  draw() {
    this.ctx.fillStyle = '#09121d'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#00ff66'; this.ctx.fillRect(0, this.height - 10, this.width, 10);
    this.ctx.fillStyle = '#00f0ff'; this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
    this.ctx.fillStyle = '#ff0055'; this.obstacles.forEach(o => this.ctx.fillRect(o.x, o.y, o.w, o.h));
  }
};

// 3. Memory Match
Games.memory = {
  init() { this.grid = document.getElementById('memory-grid'); },
  start() {
    this.score = 0; this.flippedCards = []; this.matchedPairs = 0;
    this.icons = ['fa-bolt', 'fa-ghost', 'fa-dragon', 'fa-bomb', 'fa-gem', 'fa-gamepad', 'fa-skull', 'fa-rocket'];
    this.cards = [...this.icons, ...this.icons].sort(() => Math.random() - 0.5);
    this.grid.innerHTML = ''; this.grid.classList.remove('hidden');
    document.getElementById('g2048-grid').classList.add('hidden');
    document.getElementById('simon-grid').classList.add('hidden');

    this.cards.forEach((iconClass, index) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.innerHTML = `<i class="fa-solid ${iconClass} hidden"></i>`;
      card.addEventListener('click', () => {
        if (this.flippedCards.length === 2 || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped'); card.querySelector('i').classList.remove('hidden');
        this.flippedCards.push(card); App.playSound(500, 'sine', 0.05);
        if (this.flippedCards.length === 2) {
          const [c1, c2] = this.flippedCards;
          if (c1.innerHTML === c2.innerHTML) {
            c1.classList.add('matched'); c2.classList.add('matched');
            this.matchedPairs++; this.score += 50;
            document.getElementById('live-score').textContent = this.score;
            App.playSound(800, 'triangle', 0.1); this.flippedCards = [];
            if (this.matchedPairs === this.icons.length) {
              App.saveScore('memory', this.score);
              document.getElementById('overlay-title').textContent = 'VITÓRIA!';
              document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
              document.getElementById('game-overlay').classList.remove('hidden');
            }
          } else {
            setTimeout(() => {
              c1.classList.remove('flipped'); c2.classList.remove('flipped');
              c1.querySelector('i').classList.add('hidden'); c2.querySelector('i').classList.add('hidden');
              this.flippedCards = [];
            }, 800);
          }
        }
      });
      this.grid.appendChild(card);
    });
  }
};

// 4. Cyber Snake
Games.snake = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height; this.gridSize = 20;
    window.onkeydown = (e) => {
      if (e.key === 'ArrowUp' && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
    };
  },
  start() {
    this.score = 0; this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }];
    this.dir = { x: 1, y: 0 }; this.nextDir = { x: 1, y: 0 };
    this.food = { x: 5, y: 5 }; this.gameOver = false; this.acc = 0;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'snake') return;
    this.acc++;
    if (this.acc % 6 === 0) {
      this.dir = this.nextDir;
      const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
      if (head.x < 0 || head.x >= this.width / this.gridSize || head.y < 0 || head.y >= this.height / this.gridSize || this.snake.some(s => s.x === head.x && s.y === head.y)) {
        this.gameOver = true;
      } else {
        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) {
          this.score += 10; document.getElementById('live-score').textContent = this.score;
          App.playSound(700, 'sine', 0.08);
          this.food = { x: Math.floor(Math.random() * (this.width / this.gridSize)), y: Math.floor(Math.random() * (this.height / this.gridSize)) };
        } else {
          this.snake.pop();
        }
      }
    }
    this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('snake', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  draw() {
    this.ctx.fillStyle = '#060a12'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#ff0055'; this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
    this.snake.forEach((s, i) => {
      this.ctx.fillStyle = i === 0 ? '#00f0ff' : '#ffb700';
      this.ctx.fillRect(s.x * this.gridSize, s.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
    });
  }
};

// 5. Neon Breaker
Games.breaker = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    this.keys = {};
    window.onkeydown = e => this.keys[e.key] = true;
    window.onkeyup = e => this.keys[e.key] = false;
  },
  start() {
    this.score = 0;
    this.paddle = { x: this.width / 2 - 40, y: this.height - 20, w: 80, h: 10 };
    this.ball = { x: this.width / 2, y: this.height - 35, vx: 3, vy: -3, r: 6 };
    this.bricks = Array.from({ length: 28 }, () => ({ status: 1 }));
    this.gameOver = false;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'breaker') return;
    this.update(); this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('breaker', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  update() {
    if (this.keys['ArrowLeft'] || this.keys['a']) this.paddle.x = Math.max(0, this.paddle.x - 6);
    if (this.keys['ArrowRight'] || this.keys['d']) this.paddle.x = Math.min(this.width - this.paddle.w, this.paddle.x + 6);
    this.ball.x += this.ball.vx; this.ball.y += this.ball.vy;
    if (this.ball.x + this.ball.r > this.width || this.ball.x - this.ball.r < 0) this.ball.vx *= -1;
    if (this.ball.y - this.ball.r < 0) this.ball.vy *= -1;
    if (this.ball.y + this.ball.r >= this.paddle.y && this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.w) {
      this.ball.vy = -Math.abs(this.ball.vy);
      App.playSound(300, 'square', 0.05);
    }
    if (this.ball.y + this.ball.r > this.height) this.gameOver = true;

    this.bricks.forEach((b, i) => {
      if (b.status === 1) {
        let r = Math.floor(i / 7), c = i % 7;
        let bx = c * (75 + 8) + 12, by = r * (18 + 8) + 30;
        if (this.ball.x > bx && this.ball.x < bx + 75 && this.ball.y > by && this.ball.y < by + 18) {
          this.ball.vy *= -1; b.status = 0; this.score += 20;
          document.getElementById('live-score').textContent = this.score;
          App.playSound(600, 'sine', 0.05);
        }
      }
    });
  },
  draw() {
    this.ctx.fillStyle = '#0a0d14'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#00f0ff'; this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    this.ctx.fillStyle = '#ff0055'; this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); this.ctx.fill();
    this.bricks.forEach((b, i) => {
      if (b.status === 1) {
        let r = Math.floor(i / 7), c = i % 7;
        this.ctx.fillStyle = ['#00e1ff', '#d400ff', '#ffb700', '#00ff66'][r % 4];
        this.ctx.fillRect(c * 83 + 12, r * 26 + 30, 75, 18);
      }
    });
  }
};

// 6. Cyber Pong
Games.pong = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    this.keys = {};
    window.onkeydown = e => this.keys[e.key] = true;
    window.onkeyup = e => this.keys[e.key] = false;
  },
  start() {
    this.score = 0;
    this.p1 = { x: 10, y: this.height / 2 - 30, w: 10, h: 60 };
    this.p2 = { x: this.width - 20, y: this.height / 2 - 30, w: 10, h: 60 };
    this.ball = { x: this.width / 2, y: this.height / 2, vx: 4, vy: 3, r: 6 };
    this.gameOver = false;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'pong') return;
    this.update(); this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('pong', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  update() {
    if ((this.keys['ArrowUp'] || this.keys['w']) && this.p1.y > 0) this.p1.y -= 5;
    if ((this.keys['ArrowDown'] || this.keys['s']) && this.p1.y < this.height - this.p1.h) this.p1.y += 5;
    if (this.ball.y > this.p2.y + this.p2.h / 2) this.p2.y += 3.5; else this.p2.y -= 3.5;
    this.ball.x += this.ball.vx; this.ball.y += this.ball.vy;
    if (this.ball.y - this.ball.r < 0 || this.ball.y + this.ball.r > this.height) this.ball.vy *= -1;
    if (this.ball.x - this.ball.r <= this.p1.x + this.p1.w && this.ball.y >= this.p1.y && this.ball.y <= this.p1.y + this.p1.h) {
      this.ball.vx = Math.abs(this.ball.vx) + 0.2; this.score += 10;
      document.getElementById('live-score').textContent = this.score;
      App.playSound(450, 'sine', 0.05);
    }
    if (this.ball.x + this.ball.r >= this.p2.x && this.ball.y >= this.p2.y && this.ball.y <= this.p2.y + this.p2.h) {
      this.ball.vx = -Math.abs(this.ball.vx) - 0.2;
      App.playSound(450, 'sine', 0.05);
    }
    if (this.ball.x < 0 || this.ball.x > this.width) this.gameOver = true;
  },
  draw() {
    this.ctx.fillStyle = '#050a0e'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#d400ff'; this.ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h);
    this.ctx.fillStyle = '#ff0055'; this.ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h);
    this.ctx.fillStyle = '#00f0ff'; this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); this.ctx.fill();
  }
};

// 7. Cyber Blocks (Tetris)
Games.tetris = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    window.onkeydown = (e) => {
      if (!this.piece || this.gameOver) return;
      if (e.key === 'ArrowLeft') { this.piece.x--; if (this.collide()) this.piece.x++; }
      if (e.key === 'ArrowRight') { this.piece.x++; if (this.collide()) this.piece.x--; }
      if (e.key === 'ArrowDown') this.drop();
      if (e.key === 'ArrowUp') {
        const prev = this.piece.shape;
        this.piece.shape = this.piece.shape[0].map((_, i) => this.piece.shape.map(row => row[i]).reverse());
        if (this.collide()) this.piece.shape = prev;
      }
    };
  },
  start() {
    this.score = 0;
    this.board = Array.from({ length: 20 }, () => Array(10).fill(0));
    this.shapes = [[[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]]];
    this.spawn(); this.gameOver = false; this.acc = 0;
    this.loop();
  },
  spawn() {
    this.piece = { shape: this.shapes[Math.floor(Math.random() * this.shapes.length)], x: 3, y: 0 };
    if (this.collide()) this.gameOver = true;
  },
  collide() {
    return this.piece.shape.some((row, dy) => row.some((val, dx) => {
      let x = this.piece.x + dx, y = this.piece.y + dy;
      return val && (x < 0 || x >= 10 || y >= 20 || (y >= 0 && this.board[y][x]));
    }));
  },
  drop() {
    this.piece.y++;
    if (this.collide()) {
      this.piece.y--;
      this.piece.shape.forEach((row, dy) => row.forEach((val, dx) => { if (val) this.board[this.piece.y + dy][this.piece.x + dx] = 1; }));
      let cleared = 0;
      this.board = this.board.filter(row => { if (row.every(c => c === 1)) { cleared++; return false; } return true; });
      while (this.board.length < 20) this.board.unshift(Array(10).fill(0));
      if (cleared > 0) {
        this.score += cleared * 100; document.getElementById('live-score').textContent = this.score;
        App.playSound(700, 'square', 0.1);
      }
      this.spawn();
    }
  },
  loop() {
    if (App.currentGame !== 'tetris') return;
    this.acc++; if (this.acc % 20 === 0) this.drop();
    this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('tetris', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  draw() {
    this.ctx.fillStyle = '#0a0914'; this.ctx.fillRect(0, 0, this.width, this.height);
    const ox = (this.width - 200) / 2;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        if (this.board[r][c]) { this.ctx.fillStyle = '#7b00ff'; this.ctx.fillRect(ox + c * 20, r * 20, 19, 19); }
      }
    }
    if (this.piece) {
      this.ctx.fillStyle = '#00f0ff';
      this.piece.shape.forEach((row, dy) => row.forEach((val, dx) => {
        if (val) this.ctx.fillRect(ox + (this.piece.x + dx) * 20, (this.piece.y + dy) * 20, 19, 19);
      }));
    }
  }
};

// 8. 2048 Neon
Games.g2048 = {
  init() { this.gridEl = document.getElementById('g2048-grid'); },
  start() {
    this.score = 0; this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.gridEl.innerHTML = ''; this.gridEl.classList.remove('hidden');
    document.getElementById('memory-grid').classList.add('hidden');
    document.getElementById('simon-grid').classList.add('hidden');
    this.addTile(); this.addTile(); this.render();
    window.onkeydown = (e) => {
      if (App.currentGame !== 'g2048') return;
      let moved = false;
      if (e.key === 'ArrowLeft') moved = this.slide(false);
      if (e.key === 'ArrowRight') { this.reverseGrid(); moved = this.slide(false); this.reverseGrid(); }
      if (e.key === 'ArrowUp') { this.transpose(); moved = this.slide(false); this.transpose(); }
      if (e.key === 'ArrowDown') { this.transpose(); this.reverseGrid(); moved = this.slide(false); this.reverseGrid(); this.transpose(); }
      if (moved) { this.addTile(); this.render(); App.playSound(350, 'sine', 0.05); }
    };
  },
  addTile() {
    let empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (this.grid[r][c] === 0) empty.push({ r, c });
    if (empty.length > 0) { let { r, c } = empty[Math.floor(Math.random() * empty.length)]; this.grid[r][c] = Math.random() < 0.9 ? 2 : 4; }
  },
  slide() {
    let changed = false;
    for (let r = 0; r < 4; r++) {
      let row = this.grid[r].filter(v => v);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) { row[i] *= 2; this.score += row[i]; row[i + 1] = 0; }
      }
      row = row.filter(v => v); while (row.length < 4) row.push(0);
      if (JSON.stringify(row) !== JSON.stringify(this.grid[r])) changed = true;
      this.grid[r] = row;
    }
    document.getElementById('live-score').textContent = this.score;
    return changed;
  },
  reverseGrid() { this.grid.forEach(row => row.reverse()); },
  transpose() {
    let t = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) t[r][c] = this.grid[c][r];
    this.grid = t;
  },
  render() {
    this.gridEl.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let val = this.grid[r][c], tile = document.createElement('div');
        tile.className = `g2048-tile ${val ? 'tile-' + val : ''}`;
        tile.textContent = val || '';
        this.gridEl.appendChild(tile);
      }
    }
    App.saveScore('g2048', this.score);
  }
};

// 9. Neon Flappy
Games.flappy = {
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width; this.height = this.canvas.height;
    window.onkeydown = (e) => { if (e.key === ' ' && this.bird) { this.bird.vy = -6; App.playSound(500, 'sine', 0.05); } };
  },
  start() {
    this.score = 0; this.bird = { x: 80, y: this.height / 2, size: 12, vy: 0 };
    this.pipes = []; this.frame = 0; this.gameOver = false;
    this.loop();
  },
  loop() {
    if (App.currentGame !== 'flappy') return;
    this.frame++; this.bird.vy += 0.35; this.bird.y += this.bird.vy;
    if (this.bird.y < 0 || this.bird.y > this.height) this.gameOver = true;
    if (this.frame % 90 === 0) {
      let gap = 110, top = Math.random() * (this.height - gap - 60) + 30;
      this.pipes.push({ x: this.width, top, bottom: this.height - top - gap, passed: false });
    }
    this.pipes.forEach((p, i) => {
      p.x -= 2.5;
      if (this.bird.x + this.bird.size > p.x && this.bird.x - this.bird.size < p.x + 40 && (this.bird.y - this.bird.size < p.top || this.bird.y + this.bird.size > this.height - p.bottom)) this.gameOver = true;
      if (!p.passed && p.x < this.bird.x) { p.passed = true; this.score += 10; document.getElementById('live-score').textContent = this.score; App.playSound(700, 'square', 0.08); }
      if (p.x + 40 < 0) this.pipes.splice(i, 1);
    });
    this.draw();
    if (!this.gameOver) App.activeLoop = requestAnimationFrame(() => this.loop());
    else {
      App.saveScore('flappy', this.score);
      document.getElementById('overlay-title').textContent = 'GAME OVER';
      document.getElementById('overlay-msg').textContent = `Pontuação: ${this.score}`;
      document.getElementById('game-overlay').classList.remove('hidden');
    }
  },
  draw() {
    this.ctx.fillStyle = '#080a10'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#00f0ff'; this.ctx.beginPath(); this.ctx.arc(this.bird.x, this.bird.y, this.bird.size, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = '#ff0055'; this.pipes.forEach(p => {
      this.ctx.fillRect(p.x, 0, 40, p.top);
      this.ctx.fillRect(p.x, this.height - p.bottom, 40, p.bottom);
    });
  }
};

// 10. Cyber Simon
Games.simon = {
  init() { this.grid = document.getElementById('simon-grid'); },
  start() {
    this.score = 0; this.sequence = []; this.playerStep = 0;
    this.grid.innerHTML = ''; this.grid.classList.remove('hidden');
    document.getElementById('memory-grid').classList.add('hidden');
    document.getElementById('g2048-grid').classList.add('hidden');

    ['btn-green', 'btn-red', 'btn-yellow', 'btn-blue'].forEach((c, i) => {
      const btn = document.createElement('div');
      btn.className = `simon-btn ${c}`;
      btn.addEventListener('click', () => {
        btn.classList.add('active'); App.playSound(300 + i * 150, 'sine', 0.2);
        setTimeout(() => btn.classList.remove('active'), 300);
        if (i === this.sequence[this.playerStep]) {
          this.playerStep++;
          if (this.playerStep === this.sequence.length) {
            this.score += 50; document.getElementById('live-score').textContent = this.score;
            setTimeout(() => this.nextRound(), 1000);
          }
        } else {
          App.saveScore('simon', this.score);
          document.getElementById('overlay-title').textContent = 'GAME OVER';
          document.getElementById('overlay-msg').textContent = `Sequência errada! Pontos: ${this.score}`;
          document.getElementById('game-overlay').classList.remove('hidden');
        }
      });
      this.grid.appendChild(btn);
    });
    this.nextRound();
  },
  nextRound() {
    this.playerStep = 0; this.sequence.push(Math.floor(Math.random() * 4));
    let i = 0, btns = this.grid.children;
    let interval = setInterval(() => {
      if (i >= this.sequence.length) { clearInterval(interval); return; }
      let b = btns[this.sequence[i]];
      if (b) {
        b.classList.add('active'); App.playSound(300 + this.sequence[i] * 150, 'sine', 0.2);
        setTimeout(() => b.classList.remove('active'), 300);
      }
      i++;
    }, 600);
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
