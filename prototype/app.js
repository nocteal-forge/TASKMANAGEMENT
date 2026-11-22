'use strict';
/* ============================================================
   画面プロトタイプ(モック)
   - バックエンド・DB・認証処理には接続しない。データは画面内のダミーのみ。
   - 要件は docs/ の【確定】を正とする(画面設計: docs/screen-design.md)。
   - 「モック専用」と書いた部分(確認用パネル、保存失敗などの疑似的な再現)は、
     アプリの仕様ではない。
   ============================================================ */

/* ---------- 定数(仕様) ---------- */
const APP_NAME = 'タスク管理';                       // アプリ名は 1 か所で管理(4.1)
const CATS = ['今日', '明日', '今週', '完了'];
const PLACE = { '今日': 'top', '明日': 'bottom', '今週': 'bottom', '完了': 'top' }; // 配置ルール(7 章)
const TITLE_MAX = 100;
const MEMO_MAX = 1000;
const STACK_WIDTH = 1000;      // 横並び/縦積みの切り替え幅(目安)
const LONGPRESS_MS = 500;      // 長押し(約 0.5 秒。実機で調整)
const MOVE_TOL = 10;           // 指のわずかな動きの許容(px)
const DRAG_START = 5;          // PC でドラッグを始める移動量(px)
const MSG = {
  titleMax: 'タイトルは100文字までです。',
  memoMax: 'メモは1,000文字までです。',
  titleEmpty: 'タイトルを入力してください。',
  loginAuth: 'ID またはパスワードが正しくありません',
  loginNet: 'ログインできませんでした。通信状況を確認して、もう一度お試しください。',
  expiredOp: 'ログインの有効期限が切れました。直前の操作は保存されていません。もう一度ログインしてください。',
  expiredOpen: 'ログインの有効期限が切れました。もう一度ログインしてください。',
  saveFail: '保存できませんでした。変更を元に戻しました。もう一度お試しください。',
  dlgSaveFail: '保存できませんでした。もう一度お試しください。',
  dlgDeleteFail: '削除できませんでした。もう一度お試しください。',
  logoutFail: 'ログアウトできませんでした。もう一度お試しください。',
  loadFail: 'タスクを読み込めませんでした。',
  conflict: '他の端末で変更されています。最新の状態を読み込みました。もう一度操作してください。',
};

/* ---------- 日付・文字数の道具 ---------- */
const pad = (n) => String(n).padStart(2, '0');
const fmtYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmtYmd(new Date());                 // 端末の今日(期限切れの判定基準)
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return fmtYmd(new Date(y, m - 1, d + n));
}
function formatDue(ymd) {                                   // 今年: 11/20、今年以外: 2027/1/5
  const [y, m, d] = ymd.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}/${d}` : `${y}/${m}/${d}`;
}
const cpLen = (s) => [...s].length;                         // Unicode コードポイント単位
const cpCut = (s, n) => [...s].slice(0, n).join('');

/* ---------- ダミーデータ(今日を基準) ---------- */
function seed() {
  const t = todayStr();
  const d = (n) => addDays(t, n);
  const nextYear = `${new Date().getFullYear() + 1}-01-05`;
  return [
    { id: 1, title: '週次レポートを提出する', memo: '今日の17時までに提出する。', due: t, cat: '今日' },
    { id: 2, title: '請求書の内容を確認する', memo: '', due: d(-2), cat: '今日' },
    { id: 3, title: 'Spring Boot の講義動画を視聴する', memo: '第3章まで進める。', due: d(3), cat: '今日' },
    { id: 4, title: '歯医者の予約を取る', memo: '', due: '', cat: '今日' },
    { id: 5, title: 'とても長いタイトルのタスクの例です。一覧では2行までしか表示されず、それを超える部分は末尾が省略記号になります。全文は編集ダイアログで確認できます。', memo: '長いタイトルの確認用。', due: d(2), cat: '今週' },
    { id: 6, title: 'ドキュメントを見直す', memo: '', due: d(5), cat: '今週' },
    { id: 7, title: 'ジムに行く', memo: '', due: d(-1), cat: '今週' },
    { id: 8, title: '来年の旅行プランを考える', memo: '', due: nextYear, cat: '今週' },
    { id: 9, title: '買い物リストを作る', memo: '', due: d(-4), cat: '完了' },
    { id: 10, title: '要件定義書を分割する', memo: '完了済みのタスクは、期限が過ぎても強調しない。', due: d(-1), cat: '完了' },
  ];
}

/* ---------- 状態 ---------- */
const S = {
  screen: 'login',            // 'login' | 'main'
  tasks: seed(),
  nextId: 100,
  editMode: false,            // スマホの編集モード(画面全体で 1 つ)
  loading: false,
  loadError: false,
  loggingOut: false,
  adding: null,               // { cat, ids:[], draft, msg, focus }
  dialog: null,               // 編集ダイアログ
  menu: null,                 // { id } 移動先メニュー
  toast: null,                // { text, error }
  needsRender: false,
  login: { id: '', pw: '', msg: '', busy: false, showPw: false },
  /* モック専用の設定(アプリの仕様ではない) */
  proto: { open: false, sim: false, theme: 'auto', saveFail: false, logoutFail: false, loginResult: 'ok' },
};

const $ = (sel) => document.querySelector(sel);
const find = (id) => S.tasks.find((t) => t.id === id);
const snap = () => S.tasks.map((t) => ({ ...t }));
const isOverdue = (t) => !!t.due && t.due < todayStr() && t.cat !== '完了';
const isTouch = () => S.proto.sim || window.matchMedia('(pointer: coarse)').matches; // 操作は入力デバイスで決める
const isStacked = () => S.proto.sim || window.innerWidth < STACK_WIDTH;                // 表示は画面幅で決める

/* ---------- DOM を作る道具 ---------- */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
const memoIcon = () => {
  const s = h('span', { class: 'memo-icon', title: 'メモあり', 'aria-label': 'メモあり' });
  s.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2.5" y="1.5" width="11" height="13" rx="2"/><path d="M5 5.5h6M5 8h6M5 10.5h3.5"/></svg>';
  return s;
};

/* ============================================================
   描画
   ============================================================ */
function applyMode() {
  const b = document.body;
  b.classList.toggle('sim', S.proto.sim);
  b.classList.toggle('stacked', isStacked());
  b.classList.toggle('touch', isTouch());
  b.classList.toggle('lock', !!(S.dialog || S.menu));
  const r = document.documentElement;
  if (S.proto.theme === 'auto') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', S.proto.theme);
  document.title = APP_NAME;
}

function render() {
  applyMode();
  const y = window.scrollY;
  $('#app').replaceChildren(S.screen === 'login' ? viewLogin() : viewMain());
  window.scrollTo(0, y);
  renderLayer();
  renderToast();
  if (S.screen === 'main' && S.adding && S.adding.focus) {
    const inp = $('.add-input');
    if (inp) {
      S.adding.focus = false;
      inp.focus({ preventScroll: true });
      inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.scrollIntoView({ block: 'nearest' });      // 連続入力中の自動スクロール
    }
  }
}

/* ---------- ログイン画面 ---------- */
function viewLogin() {
  const L = S.login;
  const idIn = h('input', {
    type: 'text', id: 'login-id', name: 'username', autocomplete: 'username', autocapitalize: 'none',
    autocorrect: 'off', value: L.id, disabled: L.busy, enterkeyhint: 'next',
    oninput: () => { L.id = idIn.value; },
    onkeydown: (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); pwIn.focus(); }
    },
  });
  const pwIn = h('input', {
    type: L.showPw ? 'text' : 'password', id: 'login-pw', name: 'password', autocomplete: 'current-password',
    value: L.pw, disabled: L.busy, enterkeyhint: 'go',
    oninput: () => { L.pw = pwIn.value; },
  });
  const eye = h('button', {
    type: 'button', class: 'pw-eye', disabled: L.busy,
    'aria-label': L.showPw ? 'パスワードを非表示にする' : 'パスワードを表示する',
    text: L.showPw ? '🙈' : '👁',
    onclick: () => { L.showPw = !L.showPw; pwIn.type = L.showPw ? 'text' : 'password'; eye.textContent = L.showPw ? '🙈' : '👁'; },
  });
  const form = h('form', {
    class: 'login-card', novalidate: true,
    onsubmit: (e) => { e.preventDefault(); doLogin(); },
  },
    h('h1', { text: APP_NAME }),
    L.msg && h('div', { class: 'login-msg', role: 'alert', text: L.msg }),
    h('div', {}, h('label', { for: 'login-id', text: 'ID' }), idIn),
    h('div', {}, h('label', { for: 'login-pw', text: 'パスワード' }), h('div', { class: 'pw-wrap' }, pwIn, eye)),
    h('button', { type: 'submit', class: 'btn primary', disabled: L.busy, text: L.busy ? 'ログイン中…' : 'ログイン' }),
  );
  return h('div', { class: 'login-wrap' }, form);
}

function doLogin() {
  const L = S.login;
  if (L.busy) return;
  L.busy = true; L.msg = '';
  render();
  setTimeout(() => {
    const result = S.proto.loginResult;
    S.proto.loginResult = 'ok';
    renderProto();
    let fail = '';
    if (result === 'net') fail = MSG.loginNet;                               // モック専用: 通信エラーの再現
    else if (result === 'auth' || !L.id.trim() || !L.pw) fail = MSG.loginAuth; // 入力があれば成功(モック専用の簡易ルール)
    L.busy = false;
    if (fail) {                                                              // ID は維持、パスワードはクリア
      L.msg = fail; L.pw = ''; L.showPw = false;
      render();
      $('#login-pw') && $('#login-pw').focus();
      return;
    }
    L.msg = ''; L.pw = ''; L.showPw = false;
    S.screen = 'main';
    startLoad(600);
  }, 700);
}

/* ---------- メイン画面 ---------- */
function startLoad(ms) {
  S.loadError = false; S.loading = true; S.adding = null;
  render();
  setTimeout(() => { S.loading = false; render(); }, ms);
}

function viewMain() {
  const touch = isTouch();
  const busy = S.loading || S.loadError;
  const wrap = h('div', { class: 'main' });
  wrap.append(
    h('header', { class: 'app-header' },
      h('span', { class: 'app-name', text: APP_NAME }),
      h('button', { class: 'btn text', disabled: S.loggingOut, onclick: doLogout, text: S.loggingOut ? 'ログアウト中…' : 'ログアウト' }),
    ),
  );
  if (S.loadError) {
    wrap.append(h('div', { class: 'load-error', role: 'alert' },
      h('span', { text: MSG.loadFail }),
      h('button', { class: 'btn', text: '再読み込み', onclick: () => startLoad(600) }),
    ));
  }
  wrap.append(h('div', { class: 'board' }, CATS.map((cat) => viewColumn(cat, touch, busy))));
  if (S.adding && touch) wrap.append(viewAddBar());
  return wrap;
}

function viewColumn(cat, touch, busy) {
  const list = S.tasks.filter((t) => t.cat === cat);
  const A = S.adding && S.adding.cat === cat ? S.adding : null;
  const head = h('div', { class: 'col-head' },
    h('h2', {}, cat, h('span', { class: 'count', text: busy ? '-' : String(list.length) })),
    touch && !busy && h('button', {
      class: 'btn text accent-text',
      text: S.editMode ? '編集終了' : '編集',
      onclick: () => { S.editMode = !S.editMode; S.adding = null; render(); },
    }),
  );
  const body = h('div', { class: 'card-list', 'data-cat': cat });
  if (S.loading) body.append(h('div', { class: 'loading-text', text: '読み込み中…' }));
  else if (!S.loadError) {
    for (const t of list) {
      if (S.adding && S.adding.ids.includes(t.id)) body.append(h('div', { class: 'bullet-row' }, '・', h('span', { text: t.title })));
      else body.append(viewCard(t, touch));
    }
    if (A) body.append(viewAddRow(A));
  }
  const col = h('section', { class: 'column', 'data-cat': cat }, head, body);
  if (!busy && !S.editMode && !A) {
    if (touch) {
      col.append(h('button', { class: 'add-area', 'aria-label': `${cat}にタスクを追加`, onclick: () => startAdd(cat) },
        h('span', { class: 'plus', text: '＋' }), h('span', { class: 'hint', text: 'タップしてタスクを追加' })));
    } else {
      col.append(h('button', { class: 'add-btn', onclick: () => startAdd(cat), text: 'タスクを追加' }));
    }
  }
  return col;
}

function viewCard(t, touch) {
  const over = isOverdue(t);
  const meta = (t.due || t.memo) && h('div', { class: 'card-meta' },
    h('span', { class: 'due' + (over ? ' overdue' : '') },
      t.due && over && h('span', { class: 'warn', 'aria-label': '期限切れ', text: '!' }),
      t.due && formatDue(t.due)),
    t.memo && memoIcon());
  const el = h('div', {
    class: 'card' + (S.menu && S.menu.id === t.id ? ' menu-target' : ''),
    'data-id': t.id, tabindex: '0', role: 'button',
  },
    h('div', { class: 'card-main' }, h('div', { class: 'card-title', text: t.title }), meta),
    S.editMode && touch && h('div', { class: 'handle', 'aria-hidden': 'true', text: '≡' }),
  );
  el.addEventListener('pointerdown', (e) => onCardDown(e, t, el));
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !S.editMode) openEdit(t.id); });
  return el;
}

/* ---------- 追加(連続入力) ---------- */
function startAdd(cat) {
  if (S.loading || S.loadError || S.editMode) return;
  S.adding = { cat, ids: [], draft: '', msg: '', focus: true };
  render();
}

function viewAddRow(A) {
  const msg = h('div', { class: 'field-msg', text: A.msg });
  const inp = h('input', {
    type: 'text', class: 'add-input', value: A.draft, 'aria-label': 'タスク名', autocomplete: 'off', enterkeyhint: 'done',
    oninput: () => {
      let v = inp.value;
      if (cpLen(v) > TITLE_MAX) { v = cpCut(v, TITLE_MAX); inp.value = v; A.msg = MSG.titleMax; } else A.msg = '';
      A.draft = v; msg.textContent = A.msg;
    },
    onkeydown: (e) => {
      if (e.isComposing || e.keyCode === 229) return;             // 日本語入力の変換確定の Return は無視
      if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
      else if (e.key === 'Escape') { e.preventDefault(); S.adding = null; render(); } // Esc で破棄して終了
    },
  });
  return h('div', { class: 'add-row' }, h('div', { class: 'line' }, '・', inp), msg);
}

function viewAddBar() {
  const A = S.adding;
  const empty = !A.draft.trim();
  const keep = (e) => e.preventDefault();                        // 入力欄からフォーカスを外さない
  return h('div', { class: 'add-bar', onpointerdown: keep },
    h('button', { class: 'x', 'aria-label': '入力を破棄', text: '×', onclick: () => { S.adding = null; render(); } }),
    h('button', { class: 'go' + (empty ? ' empty' : ''), text: '新規追加', onclick: () => commitAdd() }),
  );
}

/* 入力中のタイトルをタスクにする(作った場合は task を返す) */
function takeDraft(A) {
  const title = A.draft.trim();                                  // 前後の空白は取り除く
  if (!title) return null;
  const before = snap();
  const t = { id: S.nextId++, title, memo: '', due: '', cat: A.cat };
  S.tasks.push(t);                                               // 列の末尾に追加(配置ルールは適用しない)
  A.ids.push(t.id); A.draft = ''; A.msg = '';
  persist(before);
  return t;
}
function commitAdd() {
  const A = S.adding;
  if (!A) return;
  if (!takeDraft(A)) { S.adding = null; render(); return; }      // 空欄なら入力終了
  A.focus = true;                                                // 次の入力欄
  render();
}

/* ---------- 保存(疑似) ---------- */
/* モック専用: 保存に失敗した場合の「元に戻す」を再現する。実際の通信は行わない。 */
function persist(before) {
  setTimeout(() => {
    if (!S.proto.saveFail) return;
    S.proto.saveFail = false; renderProto();
    S.tasks = before; S.adding = null;
    showToast(MSG.saveFail, true);
    render();
  }, 400);
}

/* ---------- ログアウト ---------- */
function doLogout() {
  if (S.loggingOut) return;
  S.loggingOut = true; S.adding = null; render();
  setTimeout(() => {
    S.loggingOut = false;
    if (S.proto.logoutFail) {                                    // モック専用: 失敗の再現
      S.proto.logoutFail = false; renderProto();
      showToast(MSG.logoutFail, true);
      render();
      return;
    }
    toLogin('');
  }, 500);
}
function toLogin(msg) {
  S.screen = 'login'; S.editMode = false; S.adding = null; S.dialog = null; S.menu = null;
  S.loading = false; S.loadError = false; S.toast = null;
  S.login.msg = msg; S.login.pw = ''; S.login.showPw = false; S.login.busy = false;
  render();
}

/* ============================================================
   カード操作(クリック / ドラッグ&ドロップ / 長押し)
   ============================================================ */
let P = null;   // 操作中のポインター { id, el, sx, sy, x, y, mode, timer, touch, pid, ... }

function onCardDown(e, t, el) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (P || S.loading || S.loadError) return;
  P = { id: t.id, el, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, mode: 'pending', timer: null, touch: isTouch(), pid: e.pointerId };
  if (P.touch) {
    P.timer = setTimeout(() => {                                 // 長押し(約 0.5 秒)
      if (!P || P.mode !== 'pending') return;
      P.timer = null;
      if (S.editMode) startDrag();                               // 編集モード: 同じ分類内の並び替え
      else { P.mode = 'done'; openMenu(P.id); }                  // 通常モード: 移動先メニュー
    }, LONGPRESS_MS);
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
}

function endPointer() {
  if (P && P.timer) clearTimeout(P.timer);
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onCancel);
  P = null;
}

function onMove(e) {
  if (!P || e.pointerId !== P.pid) return;
  P.x = e.clientX; P.y = e.clientY;
  const dist = Math.hypot(P.x - P.sx, P.y - P.sy);
  if (P.mode === 'pending') {
    if (!P.touch) { if (dist > DRAG_START) startDrag(); }
    else if (dist > MOVE_TOL) { clearTimeout(P.timer); P.timer = null; P.mode = 'scroll'; } // 大きく動いたらスクロール扱い
  } else if (P.mode === 'drag') {
    updateDrag();
  }
}

function onUp(e) {
  if (!P || e.pointerId !== P.pid) return;
  const mode = P.mode, id = P.id;
  if (mode === 'drag') { finishDrag(); endPointer(); return; }
  endPointer();
  if (mode === 'pending' && !S.editMode) openEdit(id);           // クリック/タップで編集ダイアログ(編集モード中は何も起きない)
}

function onCancel(e) {
  if (!P || e.pointerId !== P.pid) return;
  if (P.mode === 'drag') cancelDrag(); else endPointer();
}

/* --- ドラッグ --- */
function startDrag() {
  P.mode = 'drag';
  const rect = P.el.getBoundingClientRect();
  P.ox = P.sx - rect.left; P.oy = P.sy - rect.top;
  P.src = find(P.id);
  P.ghost = P.el.cloneNode(true);
  P.ghost.classList.add('ghost');                                // 半透明で浮いているように表示
  P.ghost.style.width = rect.width + 'px';
  document.body.append(P.ghost);
  P.el.classList.add('dragging-src');
  document.body.classList.add('is-dragging');
  P.line = h('div', { class: 'insert-line' });
  P.target = null;
  const loop = () => {                                           // ドラッグ中の自動スクロール
    if (!P || P.mode !== 'drag') return;
    const edge = 70, max = 18;
    if (P.y < edge) window.scrollBy(0, -Math.ceil(max * (edge - Math.max(P.y, 0)) / edge));
    else if (P.y > window.innerHeight - edge) window.scrollBy(0, Math.ceil(max * (P.y - (window.innerHeight - edge)) / edge));
    updateDrag();
    P.raf = requestAnimationFrame(loop);
  };
  P.raf = requestAnimationFrame(loop);
  updateDrag();
}

function updateDrag() {
  if (!P || P.mode !== 'drag') return;
  P.ghost.style.left = (P.x - P.ox) + 'px';
  P.ghost.style.top = (P.y - P.oy) + 'px';
  const under = document.elementFromPoint(P.x, P.y);
  const col = under && under.closest('.column');
  const cat = col ? col.dataset.cat : null;
  document.querySelectorAll('.column.drop-target').forEach((c) => c.classList.remove('drop-target'));
  P.line.remove();
  P.target = null;
  if (!cat) return;
  if (cat === P.src.cat) {                                       // 同じ分類内: 並び替え(挿入線を表示)
    const list = col.querySelector('.card-list');
    const cards = [...list.querySelectorAll('.card')].filter((c) => c !== P.el);
    let index = 0;
    cards.forEach((c) => { const r = c.getBoundingClientRect(); if (P.y > r.top + r.height / 2) index++; });
    list.insertBefore(P.line, cards[index] || null);
    P.target = { cat, index };
  } else if (!S.editMode) {                                      // 別の分類: 移動(移動先の列を強調。位置は配置ルール)
    col.classList.add('drop-target');
    P.target = { cat };
  }                                                              // 編集モード中は分類間の移動はできない
}

function cleanupDrag() {
  cancelAnimationFrame(P.raf);
  P.ghost && P.ghost.remove();
  P.line && P.line.remove();
  P.el.classList.remove('dragging-src');
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.column.drop-target').forEach((c) => c.classList.remove('drop-target'));
}
function cancelDrag() { cleanupDrag(); endPointer(); }
function finishDrag() {
  const target = P.target, id = P.id;
  cleanupDrag();
  if (!target) return;
  if (target.index != null) reorder(id, target.index);
  else moveTask(id, target.cat);
}

/* 同じ分類内の並び替え */
function reorder(id, index) {
  const t = find(id);
  const cur = S.tasks.filter((x) => x.cat === t.cat).indexOf(t);
  if (cur === index) return;
  const before = snap();
  const list = S.tasks.filter((x) => x.cat === t.cat && x.id !== id);
  list.splice(index, 0, t);
  const cat = t.cat, rest = S.tasks;
  S.tasks = CATS.flatMap((c) => (c === cat ? list : rest.filter((x) => x.cat === c)));
  persist(before);
  render();
}

/* 分類間の移動(配置ルール: 今日=先頭 / 明日=末尾 / 今週=末尾 / 完了=先頭) */
function moveTask(id, cat) {
  const t = find(id);
  if (!t || t.cat === cat) return;
  const before = snap();
  const willFail = S.proto.saveFail;
  const rest = S.tasks.filter((x) => x.id !== id);
  t.cat = cat;
  const list = rest.filter((x) => x.cat === cat);
  if (PLACE[cat] === 'top') list.unshift(t); else list.push(t);
  S.tasks = CATS.flatMap((c) => (c === cat ? list : rest.filter((x) => x.cat === c)));
  if (!willFail) showToast(`『${t.title}』を『${cat}』に移動しました`, false);
  persist(before);
  render();
}

/* ---------- 移動先メニュー(スマホ) ---------- */
function openMenu(id) { S.menu = { id }; render(); }
function viewMenu() {
  const t = find(S.menu.id);
  const close = () => { S.menu = null; render(); };
  const items = CATS.map((c) => {
    const cur = c === t.cat;
    return h('button', {
      class: 'menu-item', disabled: cur, text: cur ? `${c}(現在)` : c,
      onclick: () => { S.menu = null; moveTask(t.id, c); },
    });
  });
  return h('div', { class: 'overlay touch', onclick: (e) => { if (e.target === e.currentTarget) close(); } },
    h('div', { class: 'menu-sheet', role: 'dialog', 'aria-label': '移動先' },
      h('div', { class: 'title', text: '移動先' }), items,
      h('button', { class: 'menu-item menu-cancel', text: 'キャンセル', onclick: close })));
}

/* ============================================================
   編集ダイアログ(削除確認・破棄確認を含む)
   ============================================================ */
function openEdit(id) {
  const t = find(id);
  if (!t) return;
  const f = { title: t.title, memo: t.memo, due: t.due };
  S.dialog = { id, orig: { ...f }, form: { ...f }, err: '', busy: '', confirm: null, msgT: '', msgM: '' };
  render();
  if (!isTouch()) { const el = $('#f-title'); el && el.focus(); }
}
const dirty = () => { const D = S.dialog, a = D.orig, b = D.form; return a.title !== b.title || a.memo !== b.memo || a.due !== b.due; };
function closeDialog() { S.dialog = null; render(); }
function requestClose() {
  if (!S.dialog || S.dialog.busy) return;
  if (dirty()) { S.dialog.confirm = 'discard'; renderLayer(); } else closeDialog();
}

function saveDialog() {
  const D = S.dialog;
  if (D.busy) return;
  D.err = '';
  if (!dirty()) { closeDialog(); return; }                       // 変更がなければ通信せずに閉じる
  const title = D.form.title.trim(), memo = D.form.memo.trim();  // 前後の空白は取り除いて保存
  if (!title) { D.msgT = MSG.titleEmpty; renderLayer(); const el = $('#f-title'); el && el.focus(); return; }
  D.busy = '保存中…'; renderLayer();
  setTimeout(() => {
    if (S.proto.saveFail) {                                      // モック専用: 保存失敗の再現(ダイアログは開いたまま)
      S.proto.saveFail = false; renderProto();
      D.busy = ''; D.err = MSG.dlgSaveFail; renderLayer();
      return;
    }
    const t = find(D.id);
    if (t) { t.title = title; t.memo = memo; t.due = D.form.due; }
    closeDialog();                                               // 成功しても通知は出さない
  }, 600);
}

function deleteTask() {
  const D = S.dialog;
  if (D.busy) return;
  D.busy = '削除中…'; renderLayer();
  setTimeout(() => {
    if (S.proto.saveFail) {                                      // モック専用: 削除失敗の再現
      S.proto.saveFail = false; renderProto();
      D.busy = ''; D.confirm = null; D.err = MSG.dlgDeleteFail; renderLayer();
      return;
    }
    S.tasks = S.tasks.filter((x) => x.id !== D.id);
    closeDialog();
  }, 600);
}

function renderLayer() {
  const L = $('#layer');
  L.replaceChildren();
  if (S.dialog) L.append(viewDialog());
  if (S.dialog && S.dialog.confirm) L.append(viewConfirm());
  if (S.menu) L.append(viewMenu());
  document.body.classList.toggle('lock', !!(S.dialog || S.menu));
}

function viewDialog() {
  const D = S.dialog, touch = isTouch(), busy = !!D.busy;
  const mT = h('div', { class: 'field-msg', text: D.msgT });
  const mM = h('div', { class: 'field-msg', text: D.msgM });
  const titleIn = h('input', {
    type: 'text', id: 'f-title', value: D.form.title, disabled: busy, autocomplete: 'off',
    oninput: () => {
      let v = titleIn.value;
      if (cpLen(v) > TITLE_MAX) { v = cpCut(v, TITLE_MAX); titleIn.value = v; D.msgT = MSG.titleMax; } else D.msgT = '';
      D.form.title = v; mT.textContent = D.msgT;
    },
  });
  const dateIn = h('input', { type: 'date', id: 'f-due', value: D.form.due, disabled: busy, oninput: () => { D.form.due = dateIn.value; } });
  const memoIn = h('textarea', {
    id: 'f-memo', value: D.form.memo, disabled: busy,
    oninput: () => {
      let v = memoIn.value;
      if (cpLen(v) > MEMO_MAX) { v = cpCut(v, MEMO_MAX); memoIn.value = v; D.msgM = MSG.memoMax; } else D.msgM = '';
      D.form.memo = v; mM.textContent = D.msgM;
    },
  });
  const box = h('div', { class: touch ? 'sheet' : 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'タスクの編集' },
    h('div', { class: 'dlg-bar' },
      h('button', { class: 'btn text', disabled: busy, text: '閉じる', onclick: requestClose }),
      h('button', { class: 'btn primary', disabled: busy, text: D.busy === '保存中…' ? '保存中…' : '保存', onclick: saveDialog }),
    ),
    D.err && h('div', { class: 'dlg-err', role: 'alert', text: D.err }),
    h('div', { class: 'dlg-body' },
      h('div', {}, h('label', { for: 'f-title', text: 'タイトル' }), titleIn, mT),
      h('div', {}, h('label', { for: 'f-due', text: '期限日' }),
        h('div', { class: 'date-row' }, dateIn,
          h('button', { class: 'btn', type: 'button', disabled: busy, text: 'クリア', onclick: () => { D.form.due = ''; dateIn.value = ''; } }))),
      h('div', {}, h('label', { for: 'f-memo', text: 'メモ' }), memoIn, mM),
    ),
    h('div', { class: 'dlg-foot' },
      h('button', { class: 'btn danger-text', disabled: busy, text: '削除', onclick: () => { D.err = ''; D.confirm = 'delete'; renderLayer(); } })),
  );
  return h('div', { class: 'overlay ' + (touch ? 'touch' : 'pc'), onclick: (e) => { if (e.target === e.currentTarget) requestClose(); } }, box);
}

function viewConfirm() {
  const D = S.dialog;
  let body;
  if (D.confirm === 'discard') {
    body = [
      h('div', { class: 'msg', text: '変更を破棄しますか?' }),
      h('div', { class: 'btns' },
        h('button', { class: 'btn danger-text', text: '破棄する', onclick: closeDialog }),
        h('button', { class: 'btn primary', text: '編集を続ける', onclick: () => { D.confirm = null; renderLayer(); } })),
    ];
  } else {
    const busy = !!D.busy;
    body = [
      h('div', { class: 'msg', text: `『${D.orig.title}』を削除しますか?` }),
      h('div', { class: 'note', text: 'この操作は元に戻せません' }),
      h('div', { class: 'btns' },
        h('button', { class: 'btn danger', disabled: busy, text: busy ? '削除中…' : '削除する', onclick: deleteTask }),
        h('button', { class: 'btn gray-text', disabled: busy, text: 'キャンセル', onclick: () => { D.confirm = null; renderLayer(); } })),
    ];
  }
  return h('div', { class: 'overlay conf' }, h('div', { class: 'confirm', role: 'alertdialog', 'aria-modal': 'true' }, body));
}

/* ============================================================
   通知メッセージ(画面下)
   ============================================================ */
let toastTimer = null;
function showToast(text, error) {
  clearTimeout(toastTimer);
  S.toast = { text, error: !!error };
  renderToast();
  if (!error) toastTimer = setTimeout(hideToast, 3000);          // 通常は約 3 秒で消える。エラーは閉じるまで表示
}
function hideToast() { clearTimeout(toastTimer); S.toast = null; renderToast(); }
function renderToast() {
  const T = $('#toast');
  T.replaceChildren();
  if (!S.toast) return;
  T.append(h('div', { class: 'toast' + (S.toast.error ? ' error' : ''), role: S.toast.error ? 'alert' : 'status', onclick: hideToast },
    h('span', { class: 't-text', text: S.toast.text }),
    S.toast.error && h('button', { class: 't-x', 'aria-label': '閉じる', text: '×' })));
}

/* ============================================================
   モック専用: 確認用パネル(アプリの仕様ではない)
   ============================================================ */
function renderProto() {
  const X = S.proto, root = $('#proto');
  root.replaceChildren();
  if (X.open) {
    const chk = (label, key, onchange) => h('label', {},
      h('input', { type: 'checkbox', checked: X[key], onchange: (e) => { X[key] = e.target.checked; onchange && onchange(); } }), label);
    const btn = (label, fn) => h('button', { class: 'p-btn', text: label, onclick: fn });
    root.append(h('div', { class: 'p-panel' },
      h('h3', { text: '確認用パネル(モック専用)' }),
      h('p', { class: 'p-note', text: 'アプリの仕様ではありません。実際の通信は行いません。' }),
      h('div', { class: 'p-sec' }, h('h4', { text: '表示' }),
        chk('スマホ操作・スマホ画面で確認する', 'sim', () => { S.editMode = false; S.adding = null; render(); }),
        h('label', {}, '外観'),
        h('select', { onchange: (e) => { X.theme = e.target.value; render(); } },
          h('option', { value: 'auto', text: 'OS の設定に従う', selected: X.theme === 'auto' }),
          h('option', { value: 'light', text: 'ライト', selected: X.theme === 'light' }),
          h('option', { value: 'dark', text: 'ダーク', selected: X.theme === 'dark' }))),
      h('div', { class: 'p-sec' }, h('h4', { text: '失敗を再現する(次の 1 回だけ)' }),
        chk('追加・移動・並び替え・編集・削除の保存を失敗させる', 'saveFail'),
        chk('ログアウトを失敗させる', 'logoutFail'),
        h('label', {}, '次のログインの結果'),
        h('select', { onchange: (e) => { X.loginResult = e.target.value; } },
          h('option', { value: 'ok', text: '成功', selected: X.loginResult === 'ok' }),
          h('option', { value: 'auth', text: 'ID・パスワードの誤り', selected: X.loginResult === 'auth' }),
          h('option', { value: 'net', text: '通信エラー', selected: X.loginResult === 'net' }))),
      h('div', { class: 'p-sec' }, h('h4', { text: '状態を表示する(メイン画面)' }),
        btn('読み込み中を表示(3 秒)', () => { if (S.screen === 'main') startLoad(3000); }),
        btn('読み込み失敗を表示', () => { if (S.screen === 'main') { S.loading = false; S.loadError = true; S.adding = null; S.dialog = null; render(); } }),
        btn('他の端末との食い違いを表示', () => { if (S.screen === 'main') { S.dialog = null; S.menu = null; S.adding = null; showToast(MSG.conflict, true); render(); } }),
        btn('認証切れ(操作中)', () => toLogin(MSG.expiredOp)),
        btn('認証切れ(画面を開いたとき)', () => toLogin(MSG.expiredOpen))),
      h('div', { class: 'p-sec' }, btn('データを初期状態に戻す', () => { S.tasks = seed(); S.nextId = 100; S.editMode = false; S.adding = null; S.dialog = null; S.menu = null; render(); })),
    ));
  }
  root.append(h('button', { class: 'p-toggle', text: X.open ? '確認用パネルを閉じる' : '確認用(モック専用)', onclick: () => { X.open = !X.open; renderProto(); } }));
}

/* ============================================================
   全体のイベント
   ============================================================ */
// 入力欄の外を押したら、入力途中の内容を保存して入力を終了する(PC・スマホ共通)
document.addEventListener('pointerdown', (e) => {
  if (!S.adding || S.screen !== 'main') return;
  if (e.target.closest && e.target.closest('.add-row, .add-bar, #proto')) return;
  takeDraft(S.adding);
  S.adding = null;
  S.needsRender = true;                                          // クリックを妨げないよう、描画は指を離したあとに行う
}, true);
const flushRender = () => { if (S.needsRender) { S.needsRender = false; setTimeout(render, 0); } };
document.addEventListener('pointerup', flushRender, true);
document.addEventListener('pointercancel', flushRender, true);

// Esc キー
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (S.dialog) {
    if (S.dialog.busy) return;
    if (S.dialog.confirm) { S.dialog.confirm = null; renderLayer(); } else requestClose();
  } else if (S.menu) { S.menu = null; render(); }
  else if (P && P.mode === 'drag') cancelDrag();
});

// ドラッグ中は、ページのスクロールを止める(スマホの並び替え)
document.addEventListener('touchmove', (e) => { if (P && P.mode === 'drag') e.preventDefault(); }, { passive: false });

window.addEventListener('resize', () => { if (!(P && P.mode === 'drag')) render(); });

/* 起動 */
render();
renderProto();
const idField = $('#login-id');
if (idField && !isTouch()) idField.focus();
