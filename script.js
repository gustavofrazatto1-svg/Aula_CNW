document.addEventListener('DOMContentLoaded', () => {
  // Background Canvas Particles
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  let particles = [];

  function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeBg);
  resizeBg();

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      radius: Math.random() * 2 + 1,
      vy: Math.random() * 0.5 + 0.2,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function renderBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = '#00f0ff';
    particles.forEach(p => {
      bgCtx.globalAlpha = p.alpha;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      bgCtx.fill();
      p.y -= p.vy;
      if (p.y < 0) {
        p.y = bgCanvas.height;
        p.x = Math.random() * bgCanvas.width;
      }
    });
    requestAnimationFrame(renderBg);
  }
  renderBg();

  // Audio Context (Synthesizer Sounds)
  let soundEnabled = true;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playTone(freq, type = 'sine', duration = 0.1) {
    if (!soundEnabled) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  document.getElementById('sound-toggle-btn').addEventListener('click', (e) => {
    soundEnabled = !soundEnabled;
    e.currentTarget.querySelector('i').className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  });

  // State Management
  const scores = JSON.parse(localStorage.getItem('arcade_nexus_scores')) || {
    space: 0, jump: 0, memory: 0, snake: 0, breaker: 0,
    pong: 0, tetris: 0, g2048: 0, flappy: 0, simon: 0
  };

  function updateHighScoresDisplay() {
    let globalSum = 0;
    Object.keys(scores).forEach(key => {
      const el = document.getElementById(`hs-${key}`);
      if (el) el.textContent = scores[key];
      globalSum += scores[key];
    });
    document.getElementById('global-score').textContent = globalSum;
  }
  updateHighScoresDisplay();

  function saveScore(game, score) {
    if (score > (scores[game] || 0)) {
      scores[game] = score;
      localStorage.setItem('arcade_nexus_scores', JSON.stringify(scores));
      updateHighScoresDisplay();
    }
  }

  // Navigation and Filter Controls
  const filterBtns = document.querySelectorAll('.filter-btn');
  const gameCards = document.querySelectorAll('.game-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.dataset.category;
      gameCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // View Switching
  const hubView = document.getElementById('hub-view');
  const gameView = document.getElementById('game-view');
  const currentGameTitle = document.getElementById('current-game-title');
  const liveScoreEl = document.getElementById('live-score');
  const liveHighscoreEl = document.getElementById('live-highscore');
  const canvasContainer = document.getElementById('canvas-container');
  const customContainer = document.getElementById('custom-game-container');
  const gameCanvas = document.getElementById('game-canvas');
  const ctx = gameCanvas.getContext('2d');
  const gameOverlay = document.getElementById('game-overlay');
  const startBtn = document.getElementById('start-game-btn');
  const restartBtn = document.getElementById('restart-btn');
  const backBtn = document.getElementById('back-btn');

  let currentGameKey = '';
  let gameLoopReq = null;
  let liveScore = 0;
  let isPlaying = false;

  const gameTitles = {
    space: 'Space Blaster', jump: 'Pixel Jump', memory: 'Memory Match',
    snake: 'Cyber Snake', breaker: 'Neon Breaker', pong: 'Cyber Pong',
    tetris: 'Cyber Blocks', g2048: '2048 Neon', flappy: 'Neon Flappy', simon: 'Cyber Simon'
  };

  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.game-card');
      openGame(card.dataset.game);
    });
  });

  backBtn.addEventListener('click', () => {
    stopCurrentGame();
    gameView.classList.add('hidden');
    hubView.classList.remove('hidden');
  });

  restartBtn.addEventListener('click', () => {
    if (currentGameKey) startGame(currentGameKey);
  });

  startBtn.addEventListener('click', () => {
    gameOverlay.classList.add('hidden');
    if (currentGameKey) startGame(currentGameKey);
  });

  function openGame(gameKey) {
    currentGameKey = gameKey;
    hubView.classList.add('hidden');
    gameView.classList.remove('hidden');
    currentGameTitle.textContent = gameTitles[gameKey] || 'Jogo';
    liveScore = 0;
    liveScoreEl.textContent = '0';
    liveHighscoreEl.textContent = scores[gameKey] || 0;

    gameOverlay.classList.remove('hidden');
    document.getElementById('overlay-title').textContent = 'PRONTO?';
    document.getElementById('overlay-msg').textContent = 'Pressione Iniciar para Jogar';

    if (['memory', 'g2048', 'simon'].includes(gameKey)) {
      canvasContainer.classList.add('hidden');
      customContainer.classList.remove('hidden');
      setupCustomGameUI(gameKey);
    } else {
      canvasContainer.classList.remove('hidden');
      customContainer.classList.add('hidden');
    }
  }

  function stopCurrentGame() {
    isPlaying = false;
    if (gameLoopReq) cancelAnimationFrame(gameLoopReq);
    window.removeEventListener('keydown', currentKeyHandler);
  }

  let currentKeyHandler = () => {};

  function startGame(gameKey) {
    stopCurrentGame();
    isPlaying = true;
    liveScore = 0;
    liveScoreEl.textContent = '0';
    gameOverlay.classList.add('hidden');

    switch (gameKey) {
      case 'space': runSpace(); break;
      case 'jump': runJump(); break;
      case 'memory': runMemory(); break;
      case 'snake': runSnake(); break;
      case 'breaker': runBreaker(); break;
      case 'pong': runPong(); break;
      case 'tetris': runTetris(); break;
      case 'g2048': run2048(); break;
      case 'flappy': runFlappy(); break;
      case 'simon': runSimon(); break;
    }
  }

  function gameOver(msg = 'GAME OVER') {
    isPlaying = false;
    saveScore(currentGameKey, liveScore);
    playTone(150, 'sawtooth', 0.3);
    document.getElementById('overlay-title').textContent = msg;
    document.getElementById('overlay-msg').textContent = `Pontuação Final: ${liveScore}`;
    gameOverlay.classList.remove('hidden');
  }

  function addScore(pts) {
    liveScore += pts;
    liveScoreEl.textContent = liveScore;
    if (liveScore > (scores[currentGameKey] || 0)) {
      liveHighscoreEl.textContent = liveScore;
    }
  }

  // --- GAME 1: SPACE BLASTER ---
  function runSpace() {
    let player = { x: 280, y: 350, w: 40, h: 30, speed: 6 };
    let bullets = [];
    let enemies = [];
    let keys = {};

    currentKeyHandler = (e) => { keys[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', currentKeyHandler);
    window.addEventListener('keyup', currentKeyHandler);

    let spawnTimer = 0;

    function loop() {
      if (!isPlaying) return;
      if (keys['ArrowLeft'] || keys['KeyA']) player.x = Math.max(0, player.x - player.speed);
      if (keys['ArrowRight'] || keys['KeyD']) player.x = Math.min(600 - player.w, player.x + player.speed);

      if (keys['Space'] && spawnTimer % 10 === 0) {
        bullets.push({ x: player.x + 18, y: player.y, w: 4, h: 10 });
        playTone(600, 'square', 0.05);
      }

      spawnTimer++;
      if (spawnTimer % 40 === 0) {
        enemies.push({ x: Math.random() * 560, y: -30, w: 30, h: 30, speed: 2 + Math.random() * 2 });
      }

      bullets.forEach(b => b.y -= 8);
      enemies.forEach(e => e.y += e.speed);

      bullets = bullets.filter(b => b.y > -10);

      for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        let enemy = enemies[eIdx];
        if (enemy.y > 400) { gameOver(); return; }

        for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
          let bullet = bullets[bIdx];
          if (bullet.x < enemy.x + enemy.w && bullet.x + bullet.w > enemy.x &&
              bullet.y < enemy.y + enemy.h && bullet.y + bullet.h > enemy.y) {
            enemies.splice(eIdx, 1);
            bullets.splice(bIdx, 1);
            addScore(10);
            playTone(800, 'sine', 0.08);
            break;
          }
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(player.x, player.y, player.w, player.h);

      ctx.fillStyle = '#ff0055';
      bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

      ctx.fillStyle = '#ffb700';
      enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 2: PIXEL JUMP ---
  function runJump() {
    let runner = { x: 50, y: 320, w: 30, h: 40, vy: 0, jumping: false };
    let obstacles = [];
    let frame = 0;

    currentKeyHandler = (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !runner.jumping) {
        runner.vy = -12;
        runner.jumping = true;
        playTone(400, 'sine', 0.1);
      }
    };
    window.addEventListener('keydown', currentKeyHandler);

    function loop() {
      if (!isPlaying) return;
      frame++;
      runner.vy += 0.6;
      runner.y += runner.vy;

      if (runner.y >= 320) {
        runner.y = 320;
        runner.vy = 0;
        runner.jumping = false;
      }

      if (frame % 80 === 0) {
        obstacles.push({ x: 600, w: 20 + Math.random() * 15, h: 30 + Math.random() * 20 });
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, 360);
      ctx.lineTo(600, 360);
      ctx.stroke();

      ctx.fillStyle = '#00ff66';
      ctx.fillRect(runner.x, runner.y, runner.w, runner.h);

      ctx.fillStyle = '#ff0055';
      for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= 5;
        ctx.fillRect(obs.x, 360 - obs.h, obs.w, obs.h);

        if (runner.x < obs.x + obs.w && runner.x + runner.w > obs.x &&
            runner.y + runner.h > 360 - obs.h) {
          gameOver();
          return;
        }

        if (obs.x + obs.w < 0) {
          obstacles.splice(i, 1);
          addScore(10);
        }
      }

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // UI Setup for Memory, 2048, and Simon
  function setupCustomGameUI(key) {
    const memGrid = document.getElementById('memory-grid');
    const g2048Grid = document.getElementById('g2048-grid');
    const simonGrid = document.getElementById('simon-grid');

    memGrid.classList.add('hidden');
    g2048Grid.classList.add('hidden');
    simonGrid.classList.add('hidden');

    if (key === 'memory') memGrid.classList.remove('hidden');
    if (key === 'g2048') g2048Grid.classList.remove('hidden');
    if (key === 'simon') simonGrid.classList.remove('hidden');
  }

  // --- GAME 3: MEMORY MATCH ---
  function runMemory() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    const icons = ['fa-bolt', 'fa-ghost', 'fa-gem', 'fa-fire', 'fa-bomb', 'fa-rocket', 'fa-heart', 'fa-star'];
    let cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
    let flipped = [];
    let matchedCount = 0;

    cards.forEach((icon, idx) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.icon = icon;
      card.dataset.index = idx;
      card.innerHTML = `<i class="fa-solid ${icon}" style="display:none"></i>`;

      card.addEventListener('click', () => {
        if (!isPlaying || flipped.length >= 2 || card.classList.contains('flipped') || card.classList.contains('matched')) return;

        card.classList.add('flipped');
        card.querySelector('i').style.display = 'block';
        playTone(500, 'sine', 0.05);
        flipped.push(card);

        if (flipped.length === 2) {
          if (flipped[0].dataset.icon === flipped[1].dataset.icon) {
            flipped[0].classList.add('matched');
            flipped[1].classList.add('matched');
            flipped = [];
            matchedCount += 2;
            addScore(20);
            playTone(800, 'sine', 0.1);
            if (matchedCount === cards.length) gameOver('MUITO BEM!');
          } else {
            setTimeout(() => {
              flipped.forEach(c => {
                c.classList.remove('flipped');
                c.querySelector('i').style.display = 'none';
              });
              flipped = [];
            }, 800);
          }
        }
      });
      grid.appendChild(card);
    });
  }

  // --- GAME 4: CYBER SNAKE ---
  function runSnake() {
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 10 };
    let dx = 1, dy = 0;

    currentKeyHandler = (e) => {
      if ((e.code === 'ArrowUp' || e.code === 'KeyW') && dy === 0) { dx = 0; dy = -1; }
      if ((e.code === 'ArrowDown' || e.code === 'KeyS') && dy === 0) { dx = 0; dy = 1; }
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && dx === 0) { dx = -1; dy = 0; }
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && dx === 0) { dx = 1; dy = 0; }
    };
    window.addEventListener('keydown', currentKeyHandler);

    let speedCounter = 0;

    function loop() {
      if (!isPlaying) return;
      speedCounter++;
      if (speedCounter % 8 === 0) {
        let head = { x: snake[0].x + dx, y: snake[0].y + dy };

        if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 20) { gameOver(); return; }
        for (let s of snake) {
          if (s.x === head.x && s.y === head.y) { gameOver(); return; }
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          addScore(10);
          playTone(700, 'sine', 0.08);
          food = { Math_floor: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 20) };
          food.x = Math.floor(Math.random() * 30);
        } else {
          snake.pop();
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#ff0055';
      ctx.fillRect(food.x * 20, food.y * 20, 18, 18);

      ctx.fillStyle = '#00f0ff';
      snake.forEach(s => ctx.fillRect(s.x * 20, s.y * 20, 18, 18));

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 5: NEON BREAKER ---
  function runBreaker() {
    let paddle = { x: 250, w: 100, h: 12 };
    let ball = { x: 300, y: 300, dx: 4, dy: -4, r: 8 };
    let bricks = [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        bricks.push({ x: c * 80 + 20, y: r * 25 + 40, w: 70, h: 18, active: true });
      }
    }

    currentKeyHandler = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') paddle.x = Math.max(0, paddle.x - 20);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') paddle.x = Math.min(600 - paddle.w, paddle.x + 20);
    };
    window.addEventListener('keydown', currentKeyHandler);

    function loop() {
      if (!isPlaying) return;
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x < 0 || ball.x > 600) ball.dx *= -1;
      if (ball.y < 0) ball.dy *= -1;

      if (ball.y + ball.r >= 370 && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
        ball.dy = -Math.abs(ball.dy);
        playTone(450, 'sine', 0.05);
      }

      if (ball.y > 400) { gameOver(); return; }

      bricks.forEach(b => {
        if (b.active && ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.active = false;
          ball.dy *= -1;
          addScore(15);
          playTone(650, 'sine', 0.08);
        }
      });

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(paddle.x, 370, paddle.w, paddle.h);

      ctx.fillStyle = '#ffb700';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff0055';
      bricks.forEach(b => {
        if (b.active) ctx.fillRect(b.x, b.y, b.w, b.h);
      });

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 6: CYBER PONG ---
  function runPong() {
    let p1 = { y: 160, h: 80 };
    let ai = { y: 160, h: 80 };
    let ball = { x: 300, y: 200, dx: 4, dy: 3 };

    currentKeyHandler = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') p1.y = Math.max(0, p1.y - 15);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') p1.y = Math.min(320, p1.y + 15);
    };
    window.addEventListener('keydown', currentKeyHandler);

    function loop() {
      if (!isPlaying) return;
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.y <= 0 || ball.y >= 390) ball.dy *= -1;

      // AI Simple Logic
      if (ball.y > ai.y + 40) ai.y = Math.min(320, ai.y + 2.5);
      else ai.y = Math.max(0, ai.y - 2.5);

      if (ball.x <= 20 && ball.y >= p1.y && ball.y <= p1.y + p1.h) {
        ball.dx = Math.abs(ball.dx) + 0.2;
        addScore(5);
        playTone(500, 'sine', 0.05);
      }

      if (ball.x >= 570 && ball.y >= ai.y && ball.y <= ai.y + ai.h) {
        ball.dx = -Math.abs(ball.dx) - 0.2;
        playTone(400, 'sine', 0.05);
      }

      if (ball.x < 0) { gameOver(); return; }
      if (ball.x > 600) {
        addScore(50);
        ball = { x: 300, y: 200, dx: -4, dy: 3 };
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(10, p1.y, 10, p1.h);

      ctx.fillStyle = '#ff0055';
      ctx.fillRect(580, ai.y, 10, ai.h);

      ctx.fillStyle = '#fff';
      ctx.fillRect(ball.x, ball.y, 10, 10);

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 7: CYBER BLOCKS (TETRIS) ---
  function runTetris() {
    let board = Array(16).fill(null).map(() => Array(10).fill(0));
    let piece = { x: 3, y: 0, shape: [[1, 1], [1, 1]] };
    let timer = 0;

    currentKeyHandler = (e) => {
      if (e.code === 'ArrowLeft') piece.x = Math.max(0, piece.x - 1);
      if (e.code === 'ArrowRight') piece.x = Math.min(8, piece.x + 1);
    };
    window.addEventListener('keydown', currentKeyHandler);

    function loop() {
      if (!isPlaying) return;
      timer++;
      if (timer % 20 === 0) {
        piece.y++;
        if (piece.y > 14) {
          piece.shape.forEach((row, r) => {
            row.forEach((v, c) => {
              if (v && piece.y + r - 1 < 16) board[piece.y + r - 1][piece.x + c] = 1;
            });
          });
          piece = { x: 3, y: 0, shape: [[1, 1], [1, 1]] };
          addScore(10);
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 10; c++) {
          if (board[r][c]) {
            ctx.fillStyle = '#b000ff';
            ctx.fillRect(c * 25 + 175, r * 25, 23, 23);
          }
        }
      }

      ctx.fillStyle = '#00f0ff';
      piece.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) ctx.fillRect((piece.x + c) * 25 + 175, (piece.y + r) * 25, 23, 23);
        });
      });

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 8: 2048 NEON ---
  function run2048() {
    const grid = document.getElementById('g2048-grid');
    grid.innerHTML = '';
    let board = [
      [0, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 4, 0],
      [0, 0, 0, 0]
    ];

    function render2048() {
      grid.innerHTML = '';
      board.forEach(row => {
        row.forEach(val => {
          const tile = document.createElement('div');
          tile.className = `g2048-tile tile-${val}`;
          tile.textContent = val > 0 ? val : '';
          grid.appendChild(tile);
        });
      });
    }

    currentKeyHandler = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        addScore(2);
        playTone(300, 'sine', 0.05);
        render2048();
      }
    };
    window.addEventListener('keydown', currentKeyHandler);
    render2048();
  }

  // --- GAME 9: NEON FLAPPY ---
  function runFlappy() {
    let bird = { y: 200, vy: 0 };
    let pipes = [];
    let frame = 0;

    currentKeyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        bird.vy = -6;
        playTone(400, 'sine', 0.05);
      }
    };
    window.addEventListener('keydown', currentKeyHandler);

    function loop() {
      if (!isPlaying) return;
      frame++;
      bird.vy += 0.35;
      bird.y += bird.vy;

      if (frame % 90 === 0) {
        let gap = 120;
        let topH = Math.random() * 180 + 30;
        pipes.push({ x: 600, top: topH, bottom: topH + gap });
      }

      if (bird.y > 400 || bird.y < 0) { gameOver(); return; }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#ff0055';
      ctx.fillRect(100, bird.y, 20, 20);

      ctx.fillStyle = '#00ff66';
      pipes.forEach((p, idx) => {
        p.x -= 3;
        ctx.fillRect(p.x, 0, 40, p.top);
        ctx.fillRect(p.x, p.bottom, 40, 400 - p.bottom);

        if (p.x < 120 && p.x + 40 > 100 && (bird.y < p.top || bird.y + 20 > p.bottom)) {
          gameOver();
        }

        if (p.x === 99) addScore(10);
      });

      gameLoopReq = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- GAME 10: CYBER SIMON ---
  function runSimon() {
    const grid = document.getElementById('simon-grid');
    grid.innerHTML = '';
    const colors = ['btn-green', 'btn-red', 'btn-yellow', 'btn-blue'];
    const freqs = [300, 400, 500, 600];

    colors.forEach((col, idx) => {
      const btn = document.createElement('div');
      btn.className = `simon-btn ${col}`;
      btn.addEventListener('click', () => {
        if (!isPlaying) return;
        btn.classList.add('active');
        playTone(freqs[idx], 'sine', 0.15);
        setTimeout(() => btn.classList.remove('active'), 200);
        addScore(5);
      });
      grid.appendChild(btn);
    });
  }
});