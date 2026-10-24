'use strict';

/* =========================================================
   NEXUS ARCADE — Contas e Ranking online (Firebase)

   • Login por NOME DE USUÁRIO + SENHA.
     Por baixo dos panos o Firebase Authentication recebe "usuario@arcade.example.com"
     e guarda a senha só como HASH (ninguém, nem você, consegue ler a senha).
   • Os recordes de cada conta ficam no Firestore (coleção "players").
   • Ranking geral e por jogo + comparação entre jogadores.
   • Se o Firebase não estiver configurado, o site funciona igual a antes (modo convidado).
   ========================================================= */
const Online = {
  EMAIL_DOMAIN: 'arcade.example.com',
  KEYS: ['space', 'jump', 'memory', 'snake', 'breaker', 'pong', 'tetris', 'g2048', 'flappy', 'simon'],
  MAX_SCORE: 1000000,          // mesmo teto das regras do Firestore

  enabled: false, ready: false, reason: '',
  auth: null, db: null,
  user: null, username: '',
  cloud: null,                 // últimos recordes conhecidos na nuvem
  mode: 'login', busy: false,
  inflight: false, again: false,
  rankKind: 'total', rows: [], selected: null,
  cache: {}, cacheTTL: 30000,
  tabsBuilt: false, toastTimer: null,

  /* ---------- utilidades ---------- */
  $(id) { return document.getElementById(id); },

  el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  },

  fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); },

  norm(scores) {
    const out = {};
    this.KEYS.forEach(k => {
      const v = Math.floor(Number(scores && scores[k]) || 0);
      out[k] = Math.min(this.MAX_SCORE, Math.max(0, v));
    });
    return out;
  },

  sum(s) { return this.KEYS.reduce((a, k) => a + (s[k] || 0), 0); },
  emailOf(username) { return `${username}@${this.EMAIL_DOMAIN}`; },
  stamp() { return firebase.firestore.FieldValue.serverTimestamp(); },

  /* ---------- início ---------- */
  init() {
    this.bindUi();

    const cfg = window.FIREBASE_CONFIG;
    const vazio = (v) => !v || /COLE_AQUI/i.test(String(v));
    if (!cfg || vazio(cfg.apiKey) || vazio(cfg.projectId)) {
      this.reason = 'config';
    } else if (typeof firebase === 'undefined') {
      this.reason = 'sdk';
    } else {
      try {
        firebase.initializeApp(cfg);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.enabled = true;
      } catch (e) {
        console.error(e);
        this.reason = 'init';
      }
    }

    this.renderAuth();
    if (this.enabled) this.auth.onAuthStateChanged((u) => this.onAuth(u));

    // tenta enviar recordes pendentes quando a aba some/fecha
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    window.addEventListener('pagehide', () => this.flush());
  },

  disabledMessage() {
    if (this.reason === 'config') return 'O modo online ainda não foi configurado. Preencha o arquivo firebase-config.js (veja o guia).';
    if (this.reason === 'sdk') return 'Não consegui carregar o Firebase. Verifique sua internet.';
    return 'Não foi possível iniciar o Firebase. Confira o firebase-config.js.';
  },

  bindUi() {
    const on = (id, ev, fn) => { const n = this.$(id); if (n) n.addEventListener(ev, fn); };

    on('auth-btn', 'click', () => { if (this.user) this.openRanking(); else this.openAuth('login'); });
    on('logout-btn', 'click', () => this.logout());
    on('auth-close', 'click', () => this.closeAuth());
    on('auth-modal', 'click', (e) => { if (e.target && e.target.id === 'auth-modal') this.closeAuth(); });
    on('tab-login', 'click', () => this.setMode('login'));
    on('tab-register', 'click', () => this.setMode('register'));
    on('auth-form', 'submit', (e) => this.submit(e));

    on('open-ranking-btn', 'click', () => this.openRanking());
    on('rank-login-btn', 'click', () => this.openAuth('login'));
    on('rank-refresh', 'click', () => {
      const b = this.$('rank-refresh');
      if (b.disabled) return;
      b.disabled = true;
      setTimeout(() => { b.disabled = false; }, 4000);   // evita gastar leituras à toa
      this.loadRanking(true);
    });

    document.addEventListener('keydown', (e) => {
      const m = this.$('auth-modal');
      if (e.key === 'Escape' && m && !m.classList.contains('hidden')) { e.stopPropagation(); this.closeAuth(); }
    });
  },

  /* ---------- aparência do topo ---------- */
  renderAuth() {
    const logged = !!this.user;
    const btn = this.$('auth-btn');
    if (!btn) return;
    this.$('auth-label').textContent = logged ? '@' + this.username : 'Entrar';
    this.$('auth-icon').className = logged ? 'fa-solid fa-user-check' : 'fa-solid fa-user';
    btn.classList.toggle('logged', logged);
    btn.title = logged ? 'Abrir ranking' : 'Entrar ou criar conta';
    this.$('logout-btn').classList.toggle('hidden', !logged);
    this.$('sync-badge').classList.toggle('hidden', !logged);
  },

  setSync(state, detail) {
    const icon = this.$('sync-icon'), badge = this.$('sync-badge');
    if (!icon || !badge) return;
    if (state === 'busy') { icon.className = 'fa-solid fa-cloud-arrow-up sync-busy'; badge.title = 'Sincronizando…'; }
    else if (state === 'error') { icon.className = 'fa-solid fa-triangle-exclamation sync-err'; badge.title = 'Erro ao sincronizar: ' + (detail || ''); }
    else { icon.className = 'fa-solid fa-cloud sync-ok'; badge.title = 'Recordes sincronizados'; }
  },

  toast(msg, ms = 5000) {
    const t = this.$('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },

  explain(e) {
    const c = (e && e.code) || '';
    const map = {
      'auth/email-already-in-use': 'Esse nome de usuário já existe. Escolha outro.',
      'auth/invalid-credential': 'Usuário ou senha incorretos.',
      'auth/invalid-login-credentials': 'Usuário ou senha incorretos.',
      'auth/wrong-password': 'Usuário ou senha incorretos.',
      'auth/user-not-found': 'Usuário ou senha incorretos.',
      'auth/weak-password': 'Senha fraca demais. Use pelo menos 6 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
      'auth/network-request-failed': 'Sem conexão com a internet (ou o Firebase está bloqueado nessa rede).',
      'auth/operation-not-allowed': 'O login por E-mail/Senha ainda não foi ativado no Firebase (Authentication → Sign-in method).',
      'auth/configuration-not-found': 'O Authentication ainda não foi ativado no Firebase (Build → Authentication → Começar).',
      'auth/operation-not-supported-in-this-environment': 'Abra o site por um endereço http (ex.: http://localhost:8000), não clicando duas vezes no arquivo.',
      'auth/invalid-api-key': 'A apiKey do firebase-config.js está errada.',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'A apiKey do firebase-config.js está errada.',
      'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase (Authentication → Settings → Authorized domains).',
      'permission-denied': 'O Firebase recusou a operação. Confira se as regras do Firestore foram publicadas.',
      'unavailable': 'Não consegui falar com o Firebase. Verifique a internet.',
      'failed-precondition': 'O Firestore ainda não foi criado no projeto (Build → Firestore Database).',
      'not-found': 'O Firestore ainda não foi criado no projeto (Build → Firestore Database).'
    };
    return map[c] || `Erro inesperado (${c || (e && e.message) || 'desconhecido'}).`;
  },

  /* ---------- janela de login / cadastro ---------- */
  openAuth(mode) {
    if (typeof App !== 'undefined' && App.state === 'running') App.togglePause();
    this.setMode(mode || 'login');
    this.$('auth-error').textContent = this.enabled ? '' : this.disabledMessage();
    this.$('auth-submit').disabled = !this.enabled;
    this.$('auth-modal').classList.remove('hidden');
    setTimeout(() => { const i = this.$('auth-user'); if (i && i.focus) i.focus(); }, 30);
  },

  closeAuth() { this.$('auth-modal').classList.add('hidden'); },

  setMode(mode) {
    this.mode = mode === 'register' ? 'register' : 'login';
    const reg = this.mode === 'register';
    this.$('tab-login').classList.toggle('active', !reg);
    this.$('tab-register').classList.toggle('active', reg);
    this.$('auth-pass2-wrap').classList.toggle('hidden', !reg);
    this.$('auth-note-register').classList.toggle('hidden', !reg);
    this.$('auth-title').textContent = reg ? 'Criar conta' : 'Entrar';
    this.$('auth-submit').textContent = reg ? 'CRIAR CONTA' : 'ENTRAR';
    this.$('auth-pass').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    this.$('auth-error').textContent = this.enabled ? '' : this.disabledMessage();
  },

  setBusy(b) {
    this.busy = b;
    const s = this.$('auth-submit');
    s.disabled = b || !this.enabled;
    s.textContent = b ? 'AGUARDE…' : (this.mode === 'register' ? 'CRIAR CONTA' : 'ENTRAR');
  },

  async submit(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!this.enabled || this.busy) return;
    const showErr = (m) => { this.$('auth-error').textContent = m; };

    const raw = this.$('auth-user').value.trim();
    const pass = this.$('auth-pass').value;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(raw)) return showErr('Nome de usuário: de 3 a 16 caracteres, só letras, números e _ (sem espaço ou acento).');
    if (pass.length < 6) return showErr('A senha precisa ter pelo menos 6 caracteres.');
    if (this.mode === 'register' && pass !== this.$('auth-pass2').value) return showErr('As duas senhas não são iguais.');

    const username = raw.toLowerCase();
    const registering = this.mode === 'register';
    this.setBusy(true);
    showErr('');
    try {
      if (registering) await this.auth.createUserWithEmailAndPassword(this.emailOf(username), pass);
      else await this.auth.signInWithEmailAndPassword(this.emailOf(username), pass);
      this.$('auth-pass').value = '';
      this.$('auth-pass2').value = '';
      this.closeAuth();
      if (!registering) this.toast(`Bem-vindo de volta, ${username}!`);
    } catch (e) {
      showErr(this.explain(e));
    } finally {
      this.setBusy(false);
    }
  },

  async logout() {
    try { await this.flush(); } catch (e) { /* tudo bem, segue */ }
    try {
      await this.auth.signOut();
      this.toast('Você saiu da conta. Voltou o modo convidado.');
    } catch (e) {
      this.toast(this.explain(e));
    }
  },

  /* ---------- quando o login muda ---------- */
  async onAuth(user) {
    if (!user) {                                   // saiu da conta (ou nunca entrou)
      this.user = null; this.username = ''; this.cloud = null; this.ready = false;
      this.cache = {}; this.rows = []; this.selected = null;
      App.useProfile('nexus_scores_v2');           // volta aos recordes de convidado
      this.renderAuth();
      this.updateRankGate();
      return;
    }

    this.user = user;
    this.username = String(user.email || '').split('@')[0];
    this.ready = false;
    this.renderAuth();
    this.setSync('busy');

    try {
      const ref = this.db.collection('players').doc(user.uid);
      const snap = await ref.get();
      if (this.auth.currentUser !== user) return;  // trocou/saiu enquanto carregava

      let cloud;
      if (snap.exists) {
        cloud = this.norm((snap.data() || {}).scores);
      } else {
        // conta nova: copia os recordes de convidado para ela
        cloud = this.norm(App.readStoredScores('nexus_scores_v2'));
        await ref.set({ username: this.username, scores: cloud, total: this.sum(cloud), updatedAt: this.stamp() });
        if (this.auth.currentUser !== user) return;
        this.toast(this.sum(cloud) > 0
          ? 'Conta criada! Seus recordes de convidado foram copiados para ela.'
          : 'Conta criada! Bem-vindo ao ranking.');
      }

      this.cloud = cloud;
      this.ready = true;
      App.useProfile('nexus_scores_user_' + user.uid, cloud);
      this.setSync('ok');
      this.flush();                                // se este aparelho tinha recordes maiores, envia
      this.updateRankGate();
      const rv = this.$('ranking-view');
      if (rv && !rv.classList.contains('hidden')) this.loadRanking(true);
    } catch (e) {
      console.error(e);
      this.setSync('error', this.explain(e));
      this.toast(this.explain(e), 9000);
    }
  },

  /* ---------- envio dos recordes ---------- */
  // Só envia se algum recorde subiu. Nunca diminui (as regras do Firestore também impedem).
  async flush() {
    if (!this.enabled || !this.user || !this.ready) return;
    if (this.inflight) { this.again = true; return; }

    const local = this.norm(App.scores), next = {};
    let changed = false;
    this.KEYS.forEach(k => {
      next[k] = Math.max(local[k], this.cloud[k]);
      if (next[k] > this.cloud[k]) changed = true;
    });
    if (!changed) return;

    const user = this.user;
    this.inflight = true;
    this.setSync('busy');
    try {
      await this.db.collection('players').doc(user.uid).update({ scores: next, total: this.sum(next), updatedAt: this.stamp() });
      if (this.user === user) { this.cloud = next; this.cache = {}; this.setSync('ok'); }
    } catch (e) {
      console.error(e);
      this.setSync('error', this.explain(e));
    } finally {
      this.inflight = false;
      if (this.again) { this.again = false; this.flush(); }
    }
  },

  /* ---------- ranking ---------- */
  canRank() { return this.enabled && !!this.user && this.ready; },

  openRanking() {
    if (typeof App !== 'undefined' && App.currentGame) App.closeGame();   // se estiver num jogo, volta ao menu
    this.$('hub-grid').classList.add('hidden');
    this.$('ranking-view').classList.remove('hidden');
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.$('open-ranking-btn').classList.add('active');
    this.buildRankTabs();
    this.updateRankGate();
    if (this.canRank()) this.loadRanking(false);
  },

  updateRankGate() {
    const gate = this.$('rank-gate'), body = this.$('rank-body');
    if (!gate || !body) return;
    let msg = '', showLogin = false;
    if (!this.enabled) msg = this.disabledMessage();
    else if (!this.user) { msg = 'Entre na sua conta para ver o ranking e comparar suas pontuações com as dos outros jogadores.'; showLogin = true; }
    gate.classList.toggle('hidden', !msg);
    body.classList.toggle('hidden', !!msg);
    this.$('rank-gate-msg').textContent = msg;
    this.$('rank-login-btn').classList.toggle('hidden', !showLogin);
  },

  buildRankTabs() {
    if (this.tabsBuilt) return;
    this.tabsBuilt = true;
    const box = this.$('rank-tabs');
    const tabs = [{ key: 'total', label: 'Geral' }, ...GAME_LIST.map(g => ({ key: g.id, label: g.title }))];
    tabs.forEach(t => {
      const b = this.el('button', 'rank-tab' + (t.key === this.rankKind ? ' active' : ''), t.label);
      b.type = 'button';
      b.dataset.key = t.key;
      b.addEventListener('click', () => {
        this.rankKind = t.key;
        box.querySelectorAll('.rank-tab').forEach(x => x.classList.toggle('active', x.dataset.key === t.key));
        this.loadRanking(false);
      });
      box.appendChild(b);
    });
  },

  setRankMsg(text) {
    const list = this.$('rank-list');
    list.textContent = '';
    list.appendChild(this.el('li', 'rank-msg', text));
  },

  async loadRanking(force) {
    if (!this.canRank()) return;
    const kind = this.rankKind, hit = this.cache[kind];
    if (!force && hit && Date.now() - hit.t < this.cacheTTL) { this.rows = hit.rows; this.renderRank(); return; }

    this.setRankMsg('Carregando…');
    try {
      const col = this.db.collection('players');
      const q = kind === 'total'
        ? col.orderBy('total', 'desc').limit(50)
        : col.orderBy('scores.' + kind, 'desc').limit(20);
      const snap = await q.get();
      const rows = [];
      snap.forEach(d => {
        const v = d.data() || {};
        const scores = this.norm(v.scores);
        const value = kind === 'total' ? this.sum(scores) : scores[kind];
        if (value > 0) rows.push({ uid: d.id, name: String(v.username || '?'), scores, value });
      });
      this.cache[kind] = { t: Date.now(), rows };
      if (kind !== this.rankKind) return;          // o jogador já trocou de aba
      this.rows = rows;
      this.renderRank();
    } catch (e) {
      console.error(e);
      if (kind === this.rankKind) this.setRankMsg(this.explain(e));
    }
  },

  renderRank() {
    const list = this.$('rank-list');
    list.textContent = '';
    const meId = this.user ? this.user.uid : null;

    if (this.selected) {
      const again = this.rows.find(r => r.uid === this.selected.uid);
      if (again) this.selected = again;
    }

    if (!this.rows.length) {
      list.appendChild(this.el('li', 'rank-msg', 'Ninguém pontuou ainda aqui. Seja o primeiro!'));
      this.$('rank-me').textContent = '';
      this.renderCompare();
      return;
    }

    this.rows.forEach((r, i) => {
      const cls = 'rank-row' + (i < 3 ? ' top' + (i + 1) : '') + (r.uid === meId ? ' me' : '') +
        (this.selected && this.selected.uid === r.uid ? ' selected' : '');
      const li = this.el('li', cls);
      li.tabIndex = 0;
      li.appendChild(this.el('span', 'rank-pos', '#' + (i + 1)));
      li.appendChild(this.el('span', 'rank-name', r.name + (r.uid === meId ? ' (você)' : '')));
      li.appendChild(this.el('span', 'rank-value', this.fmt(r.value)));
      li.addEventListener('click', () => this.select(r));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.select(r); } });
      list.appendChild(li);
    });

    const idx = this.rows.findIndex(r => r.uid === meId);
    this.$('rank-me').textContent = idx >= 0
      ? `Você está em #${idx + 1} de ${this.rows.length} jogadores listados.`
      : (this.rankKind === 'total' ? 'Você ainda não está no Top 50. Jogue mais!' : 'Você ainda não está no Top 20 deste jogo.');
    this.renderCompare();
  },

  select(row) {
    this.selected = row;
    this.renderRank();
  },

  renderCompare() {
    const box = this.$('compare-body');
    box.textContent = '';
    const s = this.selected;
    if (!s) { box.appendChild(this.el('p', 'rank-msg', 'Clique em um jogador da lista para comparar suas pontuações com as dele.')); return; }
    if (this.user && s.uid === this.user.uid) { box.appendChild(this.el('p', 'rank-msg', 'Esse é você! Escolha outro jogador para comparar.')); return; }

    const mine = this.norm(App.scores), theirs = s.scores;
    box.appendChild(this.el('p', 'cmp-title', `Você  ×  ${s.name}`));

    const table = this.el('table', 'cmp-table');
    const head = this.el('tr');
    ['Jogo', 'Você', s.name, 'Dif.'].forEach(t => head.appendChild(this.el('th', '', t)));
    table.appendChild(head);

    let win = 0, lose = 0, tie = 0;
    const addRow = (label, a, b, bold) => {
      const d = a - b;
      const tr = this.el('tr', bold ? 'cmp-total' : '');
      tr.appendChild(this.el('td', 'cmp-game', label));
      tr.appendChild(this.el('td', a > b ? 'cmp-win' : '', this.fmt(a)));
      tr.appendChild(this.el('td', b > a ? 'cmp-lose' : '', this.fmt(b)));
      tr.appendChild(this.el('td', d > 0 ? 'cmp-win' : (d < 0 ? 'cmp-lose' : 'cmp-tie'), d > 0 ? '+' + this.fmt(d) : (d < 0 ? '−' + this.fmt(-d) : '=')));
      table.appendChild(tr);
    };
    GAME_LIST.forEach(g => {
      const a = mine[g.id], b = theirs[g.id];
      if (a > b) win++; else if (a < b) lose++; else tie++;
      addRow(g.title, a, b, false);
    });
    addRow('TOTAL', this.sum(mine), this.sum(theirs), true);
    box.appendChild(table);
    box.appendChild(this.el('p', 'cmp-summary', `Você vence em ${win} jogo(s), perde em ${lose} e empata em ${tie}.`));
  }
};

window.Online = Online;

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => Online.init());
else Online.init();
