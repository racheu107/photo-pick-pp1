/* Photo Pick PP-1 — 웹앱 (단일 상태 + 화면 렌더)
   기기 연결: window.PhotoPickAndroid 가 있으면 안드로이드 기기 입출력, 없으면 브라우저 입출력.
   안드로이드 콜백(onNativeReading, onNativeReadingProgress, onNativePhotos, onNativeError, onNativeCancel,
   onNativeSaveProgress, onNativeSaveComplete, nativeBack)은 이전 버전과 같은 이름과 인자를 받는다. */
(() => {
'use strict';
const VERSION = 'PP-1 0.4.0';
const NATIVE = window.PhotoPickAndroid || null;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const G = ['skip', 'keep', 'best'];
const LABEL = { skip: '별로', keep: '좋음', best: '매우 좋음' }, RO = { skip: '별로로', keep: '좋음으로', best: '매우 좋음으로' };
const STORE = 'photopick.pp1.v1', GUIDE = 'photopick.pp1.guide';
const APK = 'https://github.com/racheu107/photo-pick-pp1/releases/latest';
const DEMO = Array.from({ length: 13 }, (_, i) => `DSCF${2401 + i}.JPG`);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const wait = ms => new Promise(r => setTimeout(r, ms));
const motion = () => !REDUCED.matches;

/* ── 아이콘 ───────────────────────────── */
const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', menu: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  skip: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', keep: '<circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/>',
  best: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  feed: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M9.3 9v11.5M14.7 9v11.5M4 14.7h16"/><circle cx="7" cy="6.2" r=".9"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  one: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 16l5-4.5 4 3.5 3-2.5 5 4"/><circle cx="15.5" cy="9.5" r="1.5"/>', undo: '<path d="M9 13L4 8l5-5"/><path d="M4 8h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  folder: '<path d="M3.5 7.5V5h6l2 2.5h9V19h-17z"/>', file: '<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>', play: '<path d="M8 5l11 7-11 7z"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2"/>', trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  android: '<path d="M7 10h10v8H7zM9 18v3M15 18v3M4.5 11v5M19.5 11v5M8 9.5a4 4 0 0 1 8 0"/>', share: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>',
  down: '<path d="M12 4v12M6.5 11L12 16.5 17.5 11M5 20h14"/>', lr: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>', dn: '<path d="M12 4v15M7 14l5 5 5-5"/>', up: '<path d="M12 20V5M7 10l5-5 5 5"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M8.5 11h5M11 8.5v5"/>', shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  check2: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.5l3 3 5.5-6"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'
};
const ic = (n, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${P[n] || ''}</svg>`;

/* ── 상태 ─────────────────────────────── */
const S = {
  screen: 'home', dataset: '', folder: '', photos: [], groups: [], dates: [], view: 'one', cur: 0, filter: 'all',
  scope: 'combined', picksView: 'grid', history: [], msg: '', save: null, reading: null, layer: null, doneShown: false
};
let store = { ratings: {}, last: null, scope: 'combined' };
try { const raw = JSON.parse(localStorage.getItem(STORE) || 'null'); if (raw && raw.ratings) store = { ...store, ...raw }; } catch (_) {}
S.scope = store.scope === 'best' ? 'best' : 'combined';
let guideSeen = false; try { guideSeen = !!localStorage.getItem(GUIDE); } catch (_) {}
const R = store.ratings; // key -> grade
let persistTimer = null;
const persist = () => { clearTimeout(persistTimer); persistTimer = setTimeout(persistNow, 300); };
addEventListener('pagehide', () => persistNow()); document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
const persistNow = () => {
  if (S.photos.length) store.last = { dataset: S.dataset, folder: S.folder, count: S.photos.length, rated: S.photos.filter(p => R[p.key]).length, selCount: selIds().length, selRated: selIds().filter(id => R[S.photos[id].key]).length, selLabel: S.dates.length === 1 ? dateTitle(S.dates[0], 1) : S.dates.length === S.groups.length ? '' : `날짜 ${S.dates.length}개`, dates: S.dates, cur: S.photos[S.cur]?.key || '', at: Date.now(), keys: S.photos.slice(0, 400).map(p => p.key) };
  store.scope = S.scope;
  const keys = Object.keys(R); if (keys.length > 6000) keys.slice(0, keys.length - 6000).forEach(k => delete R[k]);
  try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (_) {}
};

/* 선택한 날짜 안의 사진 id 목록 */
const selIds = () => S.photos.filter(p => S.dates.includes(p.date)).map(p => p.id);
const counts = (ids = selIds()) => { const c = { skip: 0, keep: 0, best: 0, unrated: 0 }; ids.forEach(id => c[R[S.photos[id].key] || 'unrated']++); return c; };
const picks = () => selIds().map(id => S.photos[id]).filter(p => R[p.key] === 'best' || (S.scope === 'combined' && R[p.key] === 'keep'));
const dateTitle = (d, short) => {
  if (d === 'unknown') return '촬영일 정보 없음';
  const [y, m, dd] = d.split('-').map(Number), w = '일월화수목금토'[new Date(y, m - 1, dd).getDay()];
  return short ? `${m}.${dd}` : `${m}월 ${dd}일 (${w})`;
};

/* ── 이미지: 원본 URL(최근 것만 유지) / 썸네일 ── */
const fullCache = new Map();
function fullUrl(p) {
  if (p.url) return p.url;
  if (!p.file) return p.thumbUrl || '';
  if (fullCache.has(p.id)) { const u = fullCache.get(p.id); fullCache.delete(p.id); fullCache.set(p.id, u); return u; }
  const u = URL.createObjectURL(p.file); fullCache.set(p.id, u);
  while (fullCache.size > 12) { const [id, old] = fullCache.entries().next().value; fullCache.delete(id); URL.revokeObjectURL(old); }
  return u;
}
const thumbQ = []; let thumbBusy = 0;
function thumb(p, img) {
  if (p.thumb) return Promise.resolve(p.thumb);
  if (p.thumbUrl) return Promise.resolve(p.thumbUrl);
  if (!p._tp) p._tp = new Promise(res => { thumbQ.push({ p, res, img }); pumpThumbs(); });
  return p._tp;
}
async function drawThumb(src, orient, width) {
  const bmp = await createImageBitmap(src, width ? { resizeWidth: width, resizeQuality: 'medium' } : undefined);
  const rot = orient >= 5 && orient <= 8, c = document.createElement('canvas');
  c.width = rot ? bmp.height : bmp.width; c.height = rot ? bmp.width : bmp.height;
  const x = c.getContext('2d');
  const w = bmp.width, h = bmp.height;
  const M = { 2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h], 5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w], 8: [0, -1, 1, 0, 0, w] }[orient];
  if (M) x.setTransform(...M);
  x.drawImage(bmp, 0, 0); bmp.close();
  return URL.createObjectURL(await new Promise(r => c.toBlob(r, 'image/jpeg', .8)));
}
function pumpThumbs() {
  while (thumbBusy < 3 && thumbQ.length) {
    const job = thumbQ.pop(); // 최근 요청 먼저 (빠르게 스크롤할 때 지금 보이는 칸부터)
    if (job.img && !job.img.isConnected && thumbQ.length) { delete job.p._tp; job.res(''); continue; }
    const { p, res } = job; thumbBusy++;
    (async () => {
      const big = S.photos.length > 300;
      try {
        if (p.exifThumb && (big || !p.file)) p.thumb = await drawThumb(p.exifThumb, p.orient || 1);
        else p.thumb = await drawThumb(p.file, 1, 280); // 브라우저가 원본 방향을 적용
      } catch (_) {
        try { p.thumb = p.exifThumb ? await drawThumb(p.exifThumb, p.orient || 1) : URL.createObjectURL(p.file); } catch (__) { p.thumb = ''; }
      }
      res(p.thumb);
    })().finally(() => { thumbBusy--; pumpThumbs(); });
  }
}
const tImg = (p, cls = '') => `<img class="${cls}" data-t="${p.id}" alt="" decoding="async">`;
let thumbObs = null;
function hydrateThumbs(root = document) {
  thumbObs?.disconnect();
  thumbObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return; const img = e.target; thumbObs.unobserve(img);
    const p = S.photos[+img.dataset.t]; if (!p) return;
    thumb(p, img).then(u => { if (!u) { thumbObs?.observe(img); return; } img.src = u; img.decode?.().then(() => img.classList.add('ok'), () => img.classList.add('ok')); });
  }), { rootMargin: '300px' });
  $$('img[data-t]', root).forEach(i => thumbObs.observe(i));
}

/* ── 렌더 공통 ────────────────────────── */
const root = $('#root');
const live = $('#live');
const say = t => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };
let lastFocus = null, lastView = '', lastScreen = '', lastScreenFocus = 0, refocus = null, focusAfterRender = true;
function render() {
  const enter = lastScreen !== S.screen; lastScreen = S.screen;
  const viewChanged = lastView !== S.view; lastView = S.view;
  const keepScroll = !enter && !viewChanged ? { sheet: $('#sheet')?.scrollTop, picks: $('#picks')?.scrollTop, dates: $('#date-list')?.scrollTop } : null;
  if (enter) { Z.s = 1; Z.x = 0; Z.y = 0; $('.toast')?.remove(); }
  const html = ({ home, reading, dates, rate, results, saving, done })[S.screen]();
  root.innerHTML = `<section class="scr scr-${S.screen}${S.screen === 'rate' && S.view === 'one' ? ' vf' : ''}${enter && motion() ? ' is-enter' : ''}" data-screen="${S.screen}">${html}</section>`;
  const dark = S.screen === 'rate' && S.view === 'one'; document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#121212' : '#EDEDEB'); $('.app').classList.toggle('dark', dark); if (NATIVE?.setPhotoFocus && dark !== lastFocus) { lastFocus = dark; try { NATIVE.setPhotoFocus(dark); } catch (_) {} }
  if (keepScroll) { if (keepScroll.sheet && $('#sheet')) $('#sheet').scrollTop = keepScroll.sheet; if (keepScroll.picks && $('#picks')) $('#picks').scrollTop = keepScroll.picks; if (keepScroll.dates && $('#date-list')) $('#date-list').scrollTop = keepScroll.dates; }
  S._keep = !!keepScroll;
  hydrateThumbs(root); after[S.screen]?.(); fitCheck(); renderLayer(); syncHistory();
  if (enter) { if (focusAfterRender !== false) { const h = $('h1, .pp-oled, .top-title', root); if (h && lastScreenFocus++) { h.tabIndex = -1; h.focus({ preventScroll: true }); } } }
  else if (refocus) { const el = $(refocus, root); el?.focus({ preventScroll: true }); }
  refocus = null;
}
const after = {};
/* 큰 글씨·작은 화면: 핵심 영역이 너무 작아지면 덜 중요한 요소를 접는다 */
function fitCheck() {
  const scr = $('.scr'); if (!scr) return;
  const g = $('.grow', scr); if (!g) return;
  const min = { home: 190, results: 130, rate: 220, dates: 160, done: 110 }[S.screen];
  if (min && g.getBoundingClientRect().height < min) scr.classList.add('tight');
}
addEventListener('resize', () => { const scr = $('.scr'); if (!scr) return; scr.classList.remove('tight'); fitCheck(); });

/* ── 시작 ─────────────────────────────── */
function home() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; persistNow(); }
  const last = store.last, canResume = last && last.count;
  const rated = canResume ? (last.selCount ? last.selRated : last.rated) : 0, totalN = canResume ? (last.selCount || last.count) : 0;
  return `
  <div class="brandbar"><span class="mark"><span class="pp-led is-on"></span>PP-1</span><button class="icon-btn" data-act="menu" aria-label="메뉴">${ic('menu')}</button></div>
  <div class="home-hero grow" aria-hidden="true"><div class="device">
    <div class="device-head"><span>PP-1</span><span class="ready">${canResume ? `READY<br><i>${pad(last.count)}</i> jpg` : 'SD<br><i class="blink">WAIT</i>'}</span></div>
    <div class="device-lens"><div class="ring"><div><img id="lens" src="../assets/demo/${DEMO[0]}" alt=""></div></div></div>
    <div class="device-leds"><span class="pp-led"></span><span class="pp-led is-on"></span><span class="pp-led"></span></div>
    <div class="device-keys"><span>${ic('skip')}</span><span class="on">${ic('keep')}</span><span>${ic('best')}</span></div>
  </div></div>
  <div class="home-copy"><h1>누르고, 고르고,<br>옮기면 끝</h1><p>SD카드 사진을 찍은 날짜별로 꺼내 보고, 키 세 개로 평가해 원본만 휴대폰에 옮겨요.</p></div>
  ${canResume ? `<button class="resume" data-act="resume"><div><b>이어서 고르기</b><small>${esc(last.folder)}${last.selLabel ? ' · ' + esc(last.selLabel) : ''} · ${rated} / ${totalN}장 평가</small><span class="meter-mini"><i style="width:${Math.round(rated / totalN * 100)}%"></i></span></div>${ic('next')}</button>` : ''}
  ${S.msg ? `<p class="msg" role="status">${esc(S.msg)}</p>` : ''}
  <button class="pp-btn" data-act="folder"><span class="pp-led"></span>SD카드 폴더 열기</button>
  <div class="row2"><button class="pp-btn pp-btn--key" data-act="files">사진 파일 선택</button><button class="pp-btn pp-btn--key" data-act="demo">예시로 해보기</button></div>
  <p class="note">사진은 이 기기 안에서만 열려요. 어디에도 올라가지 않아요.</p>`;
}
let lensTimer = null;
after.home = () => {
  clearInterval(lensTimer);
  const lens = $('#lens'); let i = 0;
  if (!motion() || !lens) return;
  lensTimer = setInterval(() => {
    if (S.screen !== 'home' || !document.body.contains(lens)) return clearInterval(lensTimer);
    i = (i + 1) % DEMO.length;
    const next = new Image(); next.src = `../assets/demo/${DEMO[i]}`;
    next.decode().then(() => { lens.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: .35, transform: 'scale(1.04)' }], { duration: 260, easing: 'ease-in' }).finished.then(() => { lens.src = next.src; lens.animate([{ opacity: .35, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.4,.64,1)' }); }); }, () => {});
    const keys = $$('.device-keys span'), leds = $$('.device-leds .pp-led'), k = [1, 2, 1, 0][i % 4];
    keys.forEach((s, j) => s.classList.toggle('on', j === k)); leds.forEach((s, j) => s.classList.toggle('is-on', j === k));
  }, 2600);
};

/* ── 읽는 중 ──────────────────────────── */
function segs(done, total, n = 20) {
  const on = total ? Math.floor(done / total * n) : 0;
  return Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : i === on && done < total ? 'head' : ''}"></i>`).join('');
}
function reading() {
  const r = S.reading || { done: 0, total: 0 };
  return `<div class="top"><span class="top-side"></span><div class="pp-oled solo"><span class="ko">사진 읽기</span><span class="pp-mono pp-oled-sub">SD</span></div><span class="top-side"></span></div>
  <div class="reading grow"><div class="pp-poster"><div class="label"><span>SD → PP-1</span><span>${r.total ? 'reading' : 'scan'}</span></div>
  <div class="bignum" data-digits="${String(r.done).length > 2 ? String(r.done).length : 2}" id="rd-num" style="font-size:min(6.5rem,26cqw)">${pad(r.done)}</div>
  <h2>사진 불러오는 중</h2><div class="segs" id="rd-segs" role="progressbar" aria-label="사진 읽기" aria-valuemin="0" aria-valuemax="${r.total}" aria-valuenow="${r.done}">${segs(r.done, r.total)}</div>
  <div class="file-oled"><span id="rd-count">${r.total ? `불러온 ${r.done}장 / 전체 ${r.total}장` : '사진 목록 확인 중'}</span><em>jpeg</em></div></div>
  <p class="note">촬영 날짜와 사진 정보를 확인하고 있어요.<br>사진은 복사하거나 옮기지 않아요.</p></div>
  <button class="pp-btn pp-btn--key" data-act="cancel-read">취소</button>`;
}
function readProgress(done, total) {
  S.reading = { done, total };
  if (S.screen !== 'reading') return;
  const n = $('#rd-num'), s = $('#rd-segs'), c = $('#rd-count');
  if (n) { n.textContent = pad(done); n.dataset.digits = Math.max(2, String(done).length); }
  if (s) { s.innerHTML = segs(done, total); s.setAttribute('aria-valuenow', done); s.setAttribute('aria-valuemax', total); }
  if (c) c.textContent = total ? `불러온 ${done}장 / 전체 ${total}장` : '사진 목록 확인 중';
}

/* ── 날짜 고르기 ──────────────────────── */
function dates() {
  const n = S.photos.filter(p => S.dates.includes(p.date)).length, all = S.dates.length === S.groups.length;
  return `<div class="top"><button class="icon-btn" data-act="back" aria-label="처음 화면으로">${ic('back')}</button>
  <div class="pp-oled"><span class="pp-mono">${esc(S.folder)}</span><span class="oled-count"><i>${S.photos.length}</i> jpg</span></div>
  <button class="icon-btn" data-act="menu" aria-label="메뉴">${ic('menu')}</button></div>
  <div class="dates-head"><h1>어느 날 사진부터 볼까요?</h1><p>${(() => { const ys = [...new Set(S.groups.filter(g => g.key !== 'unknown').map(g => g.key.slice(0, 4)))]; return ys.length ? `<span class="pp-mono">${ys.join('·')}</span> · ` : ''; })()}찍은 날짜별로 나눴어요. 고를 날짜를 켜 주세요.</p></div>
  <button class="selall" role="checkbox" aria-checked="${all ? 'true' : S.dates.length ? 'mixed' : 'false'}" data-act="sel-all"><span class="pp-check"></span><span>전체 선택</span><small>${S.groups.filter(g => g.key !== 'unknown').length ? `날짜 ${S.groups.filter(g => g.key !== 'unknown').length}개` : ''}${S.groups.some(g => g.key === 'unknown') ? (S.groups.length > 1 ? ' + 날짜 없음' : '날짜 없음') : ''} · ${S.photos.length}장</small></button>
  <div class="list grow" id="date-list" role="group" aria-label="촬영일 목록">${S.groups.map(g => {
    const on = S.dates.includes(g.key), rated = g.ids.filter(id => R[S.photos[id].key]).length, show = g.ids.slice(0, g.ids.length > 5 ? 4 : 5);
    const day = g.key === 'unknown' ? '—' : pad(+g.key.slice(8));
    return `<button class="datecard" role="checkbox" aria-checked="${on}" data-act="date" data-k="${g.key}">
      <span class="day">${day}</span><span class="meta"><b>${dateTitle(g.key)}</b><small>${g.ids.length}장${S.places?.[g.key] ? ` · ${esc(S.places[g.key])}` : ''}${rated ? ` · <em>${rated}장 평가함</em>` : ''}</small></span><span class="pp-check"></span>
      <span class="thumbs">${show.map(id => `<span>${tImg(S.photos[id])}</span>`).join('')}${g.ids.length > 5 ? `<span class="more">${tImg(S.photos[g.ids[4]])}<b>+${g.ids.length - 4}</b></span>` : ''}</span></button>`;
  }).join('')}</div>
  <div class="foot"><div class="countbox"><b id="sel-n">${n}</b><small>장</small></div><button class="pp-btn" data-act="start" ${n ? '' : 'disabled'}><span class="pp-led"></span>${n ? '고르기 시작' : '날짜를 골라 주세요'}</button></div>`;
}

/* ── 평가 ─────────────────────────────── */
function rate() {
  const ids = selIds(), p = S.photos[S.cur], i = ids.indexOf(S.cur), c = counts(ids);
  if (S.view === 'sheet') return sheetView(ids, c);
  const g = R[p.key];
  return `<div class="top"><button class="icon-btn" data-act="back" aria-label="날짜 고르기로">${ic('back')}</button>
  <div class="pp-oled" id="oled"><span class="pp-mono o-name" id="o-name"><span class="o-file">${esc(p.name)}</span><span class="o-time">${p.time ? `<span class="o-dot">&nbsp;·&nbsp;</span>${p.time}` : ''}</span></span><span class="oled-count" id="o-count"><i>${pad(i + 1)}</i>/${pad(ids.length)}</span></div>
  <button class="text-btn res-key" data-act="results">결과</button></div>
  <div class="frame grow"><div class="view" id="view" role="group" aria-label="${esc(p.name)} 사진. 옆으로 밀면 이동, 아래로 내리면 좋음, 위로 올리면 매우 좋음">
    <div class="ph" id="ph"><img id="photo" src="${fullUrl(p)}" alt="${esc(p.name)}" draggable="false"></div>
    <span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>
    ${gradeTag(g)}<span class="zoom-chip" id="zoomchip" hidden>100%</span><div class="stamp" id="stamp"></div>
  </div></div>
  <div class="navrow"><button class="key" data-act="sheet" aria-label="모아보기">${ic('grid')}</button><button class="key" data-act="prev" aria-label="이전 사진" ${i <= 0 ? 'disabled' : ''}>${ic('back')}</button>
    <div class="meter" role="progressbar" aria-label="평가 진행" aria-valuemin="0" aria-valuemax="${ids.length}" aria-valuenow="${ids.length - c.unrated}">${meter(ids)}<span class="lbl" id="m-lbl">${ids.length - c.unrated}<span class="pre">장 평가</span></span></div>
    <button class="key" data-act="next" aria-label="다음 사진" ${i >= ids.length - 1 ? 'disabled' : ''}>${ic('next')}</button><button class="key undo-key" data-act="undo" aria-label="마지막 평가 되돌리기" ${S.history.length ? '' : 'disabled'}>${ic('undo')}<span>되돌리기</span></button></div>
  <div class="ratekeys" role="group" aria-label="평가">${G.map((k, n) => `<button class="rk" data-act="rate" data-g="${k}" aria-pressed="${g === k}"><span class="pp-led"></span>${ic(k)}<span>${LABEL[k]}</span><kbd>${n + 1}</kbd></button>`).join('')}</div>
  <p class="hintline">${HINT}</p>`;
}
const HINT = '<span>← → 넘기기</span><span>↓ 좋음</span><span>↑ 매우 좋음</span><span>두 번 탭 확대</span>';
const gradeTag = g => g ? `<button class="grade-tag ${g}" id="gtag" data-act="clear-grade" aria-label="${LABEL[g]} 평가 취소">${ic(g)}${LABEL[g]}${g === 'skip' ? '<small>저장 안 함 · 사진은 그대로</small>' : ''}<span class="x">${ic('skip')}</span></button>` : '<span id="gtag" hidden></span>';
function meter(ids) {
  const n = Math.min(ids.length, 32), per = ids.length / n, i = ids.indexOf(S.cur);
  let bars = '';
  for (let b = 0; b < n; b++) {
    const slice = ids.slice(Math.floor(b * per), Math.floor((b + 1) * per) || Math.floor(b * per) + 1);
    const rated = slice.filter(id => R[S.photos[id].key]);
    bars += `<i class="${rated.length === slice.length ? (rated.some(id => R[S.photos[id].key] !== 'skip') ? 'k' : 'r') : ''}"></i>`;
  }
  return `<div class="track" id="track">${bars}<span class="head" style="left:${ids.length ? (i + .5) / ids.length * 100 : 0}%"></span></div>`;
}
const rateTimes = [];
const eta = n => { if (rateTimes.length < 5) return ''; const avg = rateTimes.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, rateTimes.length), sec = n * avg / 1000; return ` · 약 ${Math.max(1, Math.round(sec / 60))}분`; };
let lastRateAt = 0;
function sheetView(ids, c) {
  const list = ids.map(id => S.photos[id]).filter(p => S.filter === 'all' || (S.filter === 'unrated' ? !R[p.key] : R[p.key] === S.filter));
  const f = [['all', '전체', ids.length], ['unrated', '미평가', c.unrated], ['best', '매우 좋음', c.best], ['keep', '좋음', c.keep], ['skip', '별로', c.skip]];
  return `<div class="top"><button class="icon-btn" data-act="back" aria-label="날짜 고르기로">${ic('back')}</button>
  <div class="pp-oled"><span class="ko">${c.unrated ? `모아보기${eta(c.unrated)}` : '모두 평가했어요'}</span><span class="oled-count"><i>${ids.length - c.unrated}</i>/${ids.length}</span></div>
  <button class="text-btn res-key" data-act="results">결과</button></div>
  <div class="filters" role="radiogroup" aria-label="평가로 거르기">${f.map(([k, l, n]) => `<button class="chip" role="radio" aria-checked="${S.filter === k}" data-act="filter" data-f="${k}"><b>${n}</b><span class="chip-l">${S.filter === k ? '<span class="pp-led is-on"></span>' : ''}${l}</span></button>`).join('')}</div>
  <div class="sheetgrid grow${S.multi ? ' is-multi' : ''}" id="sheet">${list.length ? list.map(p => tile(p, p.id === S.cur)).join('') : '<p class="empty">이 평가의 사진이 없어요.</p>'}</div>
  ${S.multi ? `<div class="batchbar"><div class="batch-top"><b><span class="pp-num" id="multi-n">${S.multi.size}</span>장 선택</b><button class="text-btn" data-act="multi-all">${list.length && list.every(p => S.multi.has(p.id)) ? '모두 해제' : '보이는 사진 모두'}</button><button class="text-btn" data-act="multi-off">취소</button></div>
    <div class="ratekeys">${G.map(k => `<button class="rk" data-act="batch" data-g="${k}" ${S.multi.size ? '' : 'disabled'}><span class="pp-led"></span>${ic(k)}<span>${LABEL[k]}</span></button>`).join('')}</div></div>`
  : `<div class="row3"><button class="pp-btn pp-btn--key" data-act="one">${ic('one')}<span>한 장씩</span></button><button class="pp-btn pp-btn--key" data-act="multi-on" aria-label="여러 장 선택">${ic('check2')}<span class="lbl-opt">여러 장</span></button><button class="pp-btn" data-act="results"><span class="pp-led"></span>결과 보기</button></div>`}`;
}
const tile = (p, cur) => { const g = R[p.key]; const sel = S.multi?.has(p.id); return `<button class="tile${g === 'skip' ? ' is-skip' : g ? '' : ' is-un'}${cur && !S.multi ? ' is-cur' : ''}${sel ? ' is-sel' : ''}" data-act="open" data-id="${p.id}" aria-label="${esc(p.name)} · ${g ? LABEL[g] : '미평가'}"${S.multi ? ` aria-pressed="${!!sel}"` : ''}>${S.multi ? '<span class="selbox"></span>' : ''}${tImg(p)}${g ? `<span class="b ${g}">${ic(g)}</span>` : ''}</button>`; };

/* ── 결과 ─────────────────────────────── */
function results() {
  const ids = selIds(), c = counts(ids), pk = picks(), done = ids.length - c.unrated;
  const range = S.dates.filter(d => d !== 'unknown').sort(); const rtxt = range.length ? (range.length > 1 ? `${dateTitle(range[0], 1)}–${dateTitle(range.at(-1), 1)}` : dateTitle(range[0], 1)) : '';
  const st = (k, l) => { const inc = k === 'best' || (k === 'keep' && S.scope === 'combined'); return `<div class="stat${c[k] ? '' : ' is-zero'}${inc ? (k === 'best' ? ' inc' : ' inc2') : ''}"><span><span class="pp-led${inc ? ' is-on' : ''}"></span>${l}</span><strong class="cnt" data-n="${c[k]}">${pad(c[k])}</strong></div>`; };
  const bars = Array.from({ length: 24 }, (_, i) => `<i class="${i < Math.round(done / ids.length * 24) ? 'on' : ''}"></i>`).join('');
  const leg = (k, l) => { const inc = k === 'best' || (k === 'keep' && S.scope === 'combined'); return `<span class="lg-row ${k}${inc ? ' on' : ''}${c[k] ? '' : ' zero'}"><span class="lg-l"><span class="pp-led${inc ? ' is-on' : ''}"></span>${l}</span><b>${pad(c[k])}</b></span>`; };
  return `<div class="top"><button class="icon-btn" data-act="back" aria-label="평가로 돌아가기">${ic('back')}</button>
  <div class="pp-oled res-o"><span class="ko">평가 결과</span><span class="pp-mono pp-oled-sub">${rtxt || `${done}/${ids.length}`}</span></div>
  <button class="icon-btn" data-act="menu" aria-label="메뉴">${ic('menu')}</button></div>
  <div class="res-hero"><div class="res-num"><div class="bignum" id="res-n" data-n="${pk.length}" data-digits="${Math.max(2, String(pk.length).length)}">${pad(pk.length)}</div><span class="res-cap">장 ${NATIVE ? '저장' : '내보내기'}</span></div></div>
  <div class="legend" aria-label="평가별 장수">${leg('best', '매우 좋음')}${leg('keep', '좋음')}${leg('skip', '별로')}</div>
  <div class="seg-row"><div class="seg" role="radiogroup" aria-label="저장할 사진"><button class="opt" role="radio" aria-checked="${S.scope === 'best'}" data-act="scope" data-s="best"><span class="pp-led${S.scope === 'best' ? ' is-on' : ''}"></span>매우 좋음만 <b>${c.best}</b></button><button class="opt" role="radio" aria-checked="${S.scope === 'combined'}" data-act="scope" data-s="combined"><span class="pp-led${S.scope === 'combined' ? ' is-on' : ''}"></span>좋음 이상 <b>${c.best + c.keep}</b></button></div>${pk.length ? `<button class="key pv-key" data-act="pv" data-v="${S.picksView === 'feed' ? 'grid' : 'feed'}" aria-pressed="${S.picksView === 'feed'}" aria-label="피드 미리보기">${ic('feed')}</button>` : ''}</div>
  <div class="picks-wrap grow">${pk.length ? (S.picksView === 'feed' ? feed(pk) : `<div class="sheetgrid" style="--cols:${pk.length <= 4 ? 2 : pk.length <= 9 ? 3 : 4}" id="picks">${pk.map(p => tile(p)).join('')}</div>`) : `<div class="sheetgrid"><p class="empty">${ids.length - c.unrated ? '저장할 사진이 없어요.<br>위에서 범위를 바꾸거나 사진을 더 평가해 주세요.' : '아직 평가한 사진이 없어요.'}</p></div>`}
  </div>
  <button class="pp-btn" data-act="save" ${pk.length ? '' : 'disabled'}><span class="pp-led"></span>${pk.length ? `${S.scope === 'best' ? '매우 좋음' : '좋음 이상'} ${pk.length}장 ${NATIVE ? '저장' : '내보내기'}` : '저장할 사진 없음'}</button>
  ${c.unrated ? `<p class="note warn res-note"><span>평가 <b>${done}/${ids.length}</b> · 남은 ${c.unrated}장은 저장 안 돼요</span><button class="rp-btn" data-act="unrated">미평가 보기 ${ic('next')}</button></p>` : '<p class="note">별로 사진은 저장하지 않을 뿐, SD카드에 그대로 남아요.</p>'}`;
}
function feed(pk) {
  return `<div class="sheetgrid feed" id="picks"><div class="feed-head"><span class="av"><span id="feed-av"></span></span><div><b>내 피드</b><small>4:5 격자 미리보기</small></div><div class="stats3"><span><b>${pk.length}</b>게시물</span><span><b>${pk.filter(p => R[p.key] === 'best').length}</b>매우 좋음</span></div></div>${pk.map(p => tile(p)).join('')}${'<span class="ph-slot"></span>'.repeat((3 - pk.length % 3) % 3)}</div>`;
}
after.results = () => {
  const av = $('#feed-av'); const first = picks()[0]; if (av && first) thumb(first).then(u => { av.style.backgroundImage = `url('${u}')`; });
  if (!motion()) return;
  const rn = $('#res-n'); if (rn) odometer(rn, +rn.dataset.n, Math.max(2, String(rn.dataset.n).length));
};

/* ── 저장 중 / 완료 ───────────────────── */
function saving() {
  const s = S.save, done = s.done, total = s.items.length, cur = s.items[Math.min(done, total - 1)];
  return `<div class="top"><span class="top-side"></span><div class="pp-oled solo"><span class="ko">${NATIVE ? '원본 저장 중' : '파일 준비 중'}</span><span class="pp-mono pp-oled-sub">${NATIVE ? 'SD→PHONE' : 'LOCAL'}</span></div><span class="top-side"></span></div>
  <div class="saving grow" style="display:flex;flex-direction:column;min-height:0"><div class="pp-poster"><div class="poster-label"><span>${NATIVE ? '저장한 사진' : '준비한 사진'}</span><span>${NATIVE ? 'SD → 휴대폰' : '이 기기 안에서'}</span></div>
  <div class="stack" id="sv-stack" aria-hidden="true"></div>
  <div class="bignum" id="sv-num" data-digits="${Math.max(2, String(total).length)}">${pad(done, String(total).length > 2 ? String(total).length : 2)}<small>/${pad(total)}</small></div>
  <div class="segs" id="sv-segs" style="--n:${Math.min(total, 20)}" role="progressbar" aria-label="저장 진행" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">${segs(done, total, Math.min(total, 20))}</div>
  <div class="file-oled"><span id="sv-file">${esc(cur?.name || '')}</span><em>${NATIVE ? '저장 중' : '준비 중'}</em></div></div></div>
  <div class="strip" id="sv-strip" aria-hidden="true">${s.items.map((p, i) => `<span class="${i < done ? 'on' : ''}">${tImg(p)}</span>`).join('')}</div>
  <p class="note">${NATIVE ? 'SD카드의 사진은 지우거나 옮기지 않아요.<br>끝날 때까지 SD카드를 빼지 마세요.' : '사진은 서버로 올라가지 않아요.<br>원본 그대로 묶고 있어요.'}</p>
  <button class="pp-btn pp-btn--key" data-act="stop-save">${NATIVE ? '저장 멈추기' : '멈추기'}</button>`;
}
function saveProgress(done, total) {
  if (!S.save) return; S.save.done = done;
  if (S.screen !== 'saving') return;
  const w = Math.max(2, String(total).length);
  const n = $('#sv-num'); if (n) n.innerHTML = `${pad(done, w)}<small>/${pad(total)}</small>`;
  const sg = $('#sv-segs'); if (sg) { sg.innerHTML = segs(done, total, Math.min(total, 20)); sg.setAttribute('aria-valuenow', done); }
  const f = $('#sv-file'); if (f) f.textContent = done >= total ? `${total}장 모두 ${NATIVE ? '저장' : '준비'}했어요` : S.save.items[Math.min(done, total - 1)]?.name || '';
  const fe = $('.saving .file-oled em'); if (fe && done >= total) fe.textContent = '완료';
  $$('#sv-strip span').forEach((s, i) => { const on = i < done; if (on && !s.classList.contains('on') && motion()) s.animate([{ transform: 'translateY(-10px) scale(1.25)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.4)' }); s.classList.toggle('on', on); });
  const st = $('#sv-stack'), p = S.save.items[done - 1];
  if (st && p && st.dataset.n != done) { st.dataset.n = done; const el = document.createElement('span'); el.style.setProperty('--r', ((done * 37) % 15 - 7) + 'deg'); st.appendChild(el); thumb(p, null).then(u => { if (u) el.style.backgroundImage = `url('${u}')`; }); while (st.children.length > 4) st.firstChild.remove(); }
  const seg = Math.floor(done / total * 20); if (seg !== S.save.seg) { S.save.seg = seg; haptic(6); }
  const strip = $('#sv-strip'), cur = strip?.children[done]; if (cur) strip.scrollTo({ left: cur.offsetLeft - strip.clientWidth / 2, behavior: motion() ? 'smooth' : 'auto' });
}
function done() {
  const s = S.save, r = s.result || { saved: 0, skipped: 0, failed: 0 }, f = s.file;
  const n = NATIVE ? r.saved + r.skipped : s.items.length, warn = NATIVE && r.failed;
  const now = new Date(), stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const cols = s.items.length <= 1 ? 1 : s.items.length <= 4 ? 2 : s.items.length <= 9 ? 3 : 4, cap = cols * 3, shown = s.items.slice(0, s.items.length > cap ? cap - 1 : cap), more = s.items.length - shown.length;
  const title = NATIVE ? (r.failed ? (r.saved + r.skipped ? '일부 사진을 저장하지 못했어요' : '사진을 저장하지 못했어요') : `원본 ${n}장을 휴대폰에 옮겼어요`) : `${n}장을 내보낼 준비가 됐어요`;
  const sub = NATIVE ? `${r.saved}장 새로 저장${r.skipped ? ` · ${r.skipped}장은 이미 있어요` : ''}${r.failed ? ` · ${r.failed}장 실패` : ''}. SD카드의 원본은 그대로예요.` : `${canShare(s) ? '공유 창에서 갤러리에 저장하거나 인스타그램에 바로 올릴 수 있어요.' : s.items.length > 1 && s.items.length <= 20 ? '따로 받으면 갤러리에서 바로 보여요. 원본 JPEG 그대로예요.' : f?.zip ? 'ZIP을 풀면 원본 사진이 그대로 들어 있어요.' : '원본 JPEG 그대로 받아요.'}`;
  return `<div class="top"><span class="top-side"></span><div class="pp-oled solo"><span class="ko">${warn ? '확인 필요' : '완료'}</span><span class="pp-mono pp-oled-sub">${stamp}</span></div><span class="top-side"></span></div>
  <div class="done-num${warn ? ' is-warn' : ''}"><div class="dn-row"><div class="bignum" id="dn-num" data-digits="${Math.max(2, String(n).length)}" data-n="${n}">${pad(n)}</div><div class="dn-meta"><b>장 ${NATIVE ? '저장' : '준비'}</b><span>${mb(s.items)}</span>${s.items.some(p => R[p.key] === 'best') ? `<span>매우 좋음 ${s.items.filter(p => R[p.key] === 'best').length}</span>` : ''}</div></div><span class="rule"></span></div>
  <div class="collage-wrap grow"><div class="collage" id="collage" aria-hidden="true" style="--cols:${cols};--rows:${Math.ceil(Math.min(s.items.length, cols * 3) / cols)}">${shown.map(p => `<span>${tImg(p)}</span>`).join('')}${more > 0 ? `<span class="more">+${more}</span>` : ''}</div></div>
  <div class="oledbar"><span>→ ${NATIVE ? '갤러리 · Photo Pick 앨범' : esc(f?.name || '')}</span><em>${warn ? 'check' : NATIVE ? 'done' : 'ready'}</em></div>
  <div class="done-copy"><h1>${title}</h1><p>${sub}</p></div>
  ${NATIVE ? (r.failed ? `<button class="pp-btn" data-act="save"><span class="pp-led"></span>실패한 사진 다시 저장</button>` : '') + `<div class="row2"><button class="pp-btn pp-btn--key" data-act="to-dates">다른 날짜 고르기</button><button class="pp-btn ${r.failed ? 'pp-btn--key' : ''}" data-act="to-home">${r.failed ? '' : '<span class="pp-led"></span>'}처음으로</button></div>` :
    `${canShare(s) ? `<button class="pp-btn" data-act="share"><span class="pp-led"></span>${ic('share')}공유 · 갤러리에 저장</button>` : s.items.length > 1 && s.items.length <= 20 ? `<button class="pp-btn" data-act="each"><span class="pp-led"></span>${ic('down')}사진 ${s.items.length}장 따로 받기</button>` : ''}
    <div class="row3 even"><a class="pp-btn ${canShare(s) || (s.items.length > 1 && s.items.length <= 20) ? 'pp-btn--key' : ''}" href="${f?.url || '#'}" download="${esc(f?.name || 'photos')}" data-act="dl">${canShare(s) || (s.items.length > 1 && s.items.length <= 20) ? '' : '<span class="pp-led"></span>'}${f?.zip ? 'ZIP 받기' : 'JPEG 받기'}</a><button class="pp-btn pp-btn--key story-key" data-act="extras">${ic('best')}꾸미기</button><button class="pp-btn pp-btn--key" data-act="to-home">처음으로</button></div>
    <button class="text-btn link" data-act="to-dates">다른 날짜 고르기 ${ic('next')}</button>`}`;
}
const mb = items => { const t = items.reduce((n, p) => n + (p.size || 0), 0); return t ? (t > 1e9 ? (t / 1e9).toFixed(2) + ' GB' : (t / 1e6).toFixed(1) + ' MB') : ''; };
async function each() {
  const s = S.save; if (!s || s.eachBusy) return; s.eachBusy = true;
  for (const p of s.items) { const a = document.createElement('a'), u = URL.createObjectURL(p.file); a.href = u; a.download = p.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); await wait(350); }
  s.eachBusy = false; toast(`${s.items.length}장 다운로드를 시작했어요`);
}
const canShare = s => !NATIVE && !!navigator.canShare && s.items.length <= 60 && (() => { try { return navigator.canShare({ files: s.items.slice(0, 1).map(p => p.file) }); } catch (_) { return false; } })();
after.done = () => {
  if (!motion()) return;
  const n = $('#dn-num'); if (n) odometer(n, +n.dataset.n, Math.max(2, String(n.dataset.n).length));
  $$('#collage > span').forEach((s, i) => s.animate([{ opacity: 0, transform: 'scale(.6) rotate(-4deg)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 40 + i * 35, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' }));
};
function odometer(el, to, w = 2) {
  const str = pad(to, w); el.innerHTML = '';
  el.classList.add('odo'); const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = String(to); el.appendChild(sr);
  [...str].forEach((ch, i) => {
    const col = document.createElement('span'); col.className = 'odo-col'; col.setAttribute('aria-hidden', 'true');
    const n = +ch, reel = document.createElement('span'); reel.className = 'odo-reel';
    reel.innerHTML = Array.from({ length: n + 11 }, (_, k) => `<b>${k % 10}</b>`).join('');
    col.appendChild(reel); el.appendChild(col);
    const end = -(n + 10) / (n + 11) * 100;
    reel.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${end}%)` }], { duration: 520 + i * 80, delay: 40, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'forwards' });
  });
}
function countUp(el, to, w = 2, ms = 600) {
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = pad(v, w); if (k < 1) requestAnimationFrame(step); };
  el.textContent = pad(0, w); requestAnimationFrame(step);
}

/* ── 시트(아래 창) ─────────────────────── */
function renderLayer() {
  let el = $('#layer'); if (!S.layer) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'layer'; el.className = 'layer'; $('.app').appendChild(el); }
  el.innerHTML = `<div class="pp-scrim" data-act="close-layer"></div><section class="pp-sheet ${S.layer.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(S.layer.label || '')}">${S.layer.html}</section>`;
  root.inert = true;
  queueMicrotask(() => ($('[data-autofocus]', el) || $('button', $('.pp-sheet', el)))?.focus());
}
let layerOpener = null;
function openLayer(html, label, cls) { if (!S.layer) layerOpener = document.activeElement; S.layer = { html, label, cls }; renderLayer(); syncHistory(); }
function closeLayer() { const cb = S.layer?.onClose; S.layer = null; root.inert = false; renderLayer(); syncHistory(); cb?.(); if (layerOpener?.isConnected) layerOpener.focus({ preventScroll: true }); layerOpener = null; }
function confirmSheet(title, body, ok, cancel, onOk) {
  openLayer(`<h2>${title}</h2><p>${body}</p><button class="pp-btn" data-act="sheet-ok" data-autofocus><span class="pp-led"></span>${ok}</button><button class="pp-btn pp-btn--key" data-act="close-layer">${cancel}</button>`, title);
  S.layer.onOk = onOk;
}
function menu() {
  const inSet = S.photos.length && S.dataset;
  openLayer(`<h2>Photo Pick</h2><div class="menu-list">
    <button class="menu-item" data-act="guide">${ic('help')}사용 방법 보기</button>
    <button class="menu-item" data-act="folder" data-another="1">${ic('folder')}다른 폴더 열기</button>
    ${inSet ? `<button class="menu-item" data-act="to-dates">${ic('cal')}날짜 다시 고르기</button><button class="menu-item danger" data-act="clear">${ic('trash')}이 폴더 평가 지우기<small>${S.photos.filter(p => R[p.key]).length}장</small></button>` : ''}
    ${NATIVE?.checkUpdates ? `<button class="menu-item" data-act="updates">${ic('down')}앱 업데이트 확인</button>` : ''}
    ${NATIVE ? '' : `<a class="menu-item" href="${APK}" target="_blank" rel="noopener">${ic('android')}<span>Android 앱 받기<br><small style="margin:0">갤러리에 바로 저장돼요</small></span></a>`}
  </div><button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button><p class="ver">${VERSION} · 별로로 평가해도 사진은 지워지지 않아요</p>`, '메뉴');
}
function guide() {
  openLayer(`<h2 tabindex="-1" data-autofocus>밀고, 내리고, 누르면<br>골라져요</h2><div class="guide-rows">
    <div class="guide-row"><span class="gi anim">${ic('lr')}</span><div><b>옆으로 밀기</b><small>다음 · 이전 사진으로 넘겨요</small></div></div>
    <div class="guide-row"><span class="gi anim">${ic('dn')}</span><div><b>아래로 내리기</b><small>좋음으로 표시하고 다음 사진</small></div></div>
    <div class="guide-row"><span class="gi anim">${ic('up')}</span><div><b>위로 올리기</b><small>매우 좋음으로 표시하고 다음 사진</small></div></div>
    <div class="guide-row"><span class="gi">${ic('zoom')}</span><div><b>두 번 탭</b><small>100%로 확대해 초점을 확인해요</small></div></div>
    <div class="guide-row"><span class="gi">${ic('skip')}</span><div><b>별로는 × 키로</b><small>저장하지 않을 사진이에요. 지워지지 않아요</small></div></div>
  </div>
  <button class="pp-btn" data-act="close-layer"><span class="pp-led"></span>시작하기</button>`, '사용 방법', 'guide-sheet');
  S.layer.onClose = () => { guideSeen = true; try { localStorage.setItem(GUIDE, '1'); } catch (_) {} };
}
let toastTimer = null;
function toast(text, action, fn) {
  $('.toast')?.remove(); clearTimeout(toastTimer);
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(text)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.remove(); fn(); };
  $('.app').appendChild(t); toastTimer = setTimeout(() => t.remove(), action ? 4200 : 2600);
}

/* ── 사진 읽기 (브라우저 / 기기 / 예시) ─── */
let readToken = 0;
async function readFiles(files, folder, dataset = 'real') {
  const list = [...files].filter(f => /\.jpe?g$/i.test(f.name) || f.type === 'image/jpeg');
  if (!list.length) { S.msg = 'JPEG 사진이 없어요. DCIM처럼 사진이 든 폴더를 골라 주세요.'; S.screen = 'home'; render(); return; }
  const token = ++readToken; S.screen = 'reading'; S.reading = { done: 0, total: list.length }; render();
  const out = new Array(list.length); let next = 0, doneN = 0;
  const worker = async () => {
    while (next < list.length && token === readToken) {
      const i = next++, f = list[i], meta = await PhotoPickExif(f);
      if (token !== readToken) return;
      if (meta.jpeg) out[i] = { file: f, name: f.name, path: f.webkitRelativePath || f.name, size: f.size, mtime: f.lastModified, date: meta.captureDate || 'unknown', at: meta.capturedAt || '', exifThumb: meta.thumb, orient: meta.orientation };
      if (++doneN % 8 === 0 || doneN === list.length) { readProgress(doneN, list.length); await wait(0); }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  const items = out.filter(Boolean);
  if (token !== readToken) return;
  if (!folder) { const rel = list[0].webkitRelativePath; folder = rel ? rel.split('/')[0] : '선택한 사진'; }
  if (motion()) await wait(250);
  load(items, folder, dataset);
}
function load(items, folder, dataset) {
  if (!items.length) { S.msg = 'JPEG 사진을 읽지 못했어요. 다른 폴더를 골라 주세요.'; S.screen = 'home'; render(); return; }
  fullCache.forEach(u => URL.revokeObjectURL(u)); fullCache.clear(); thumbQ.length = 0;
  S.photos.forEach(p => { if (p.thumb) URL.revokeObjectURL(p.thumb); });
  items.sort((a, b) => (a.at || '9999').localeCompare(b.at || '9999') || a.path.localeCompare(b.path));
  S.photos = items.map((x, id) => ({ ...x, id, key: x.key || `${dataset === 'demo' ? 'demo:' : ''}${x.name}|${x.size}|${x.mtime}`, time: x.at ? x.at.slice(11, 16) : '' }));
  const map = new Map(); S.photos.forEach(p => { if (!map.has(p.date)) map.set(p.date, { key: p.date, ids: [] }); map.get(p.date).ids.push(p.id); });
  S.groups = [...map.values()].sort((a, b) => a.key === 'unknown' ? 1 : b.key === 'unknown' ? -1 : a.key.localeCompare(b.key));
  S.dataset = dataset; S.folder = folder; S.msg = ''; S.history = []; S.filter = 'all'; S.view = 'one'; S.save = null; S.reading = null;
  const last = store.last, same = last && last.folder === folder && last.dataset === dataset && last.count === S.photos.length;
  S.dates = same && last.dates?.length ? last.dates.filter(d => map.has(d)) : S.groups.map(g => g.key);
  if (!S.dates.length) S.dates = S.groups.map(g => g.key);
  const ck = same ? S.photos.findIndex(p => p.key === last.cur) : -1;
  S.cur = selIds().find(id => !R[S.photos[id].key]) ?? (ck >= 0 ? ck : selIds()[0] ?? 0);
  const restored = S.photos.filter(p => R[p.key]).length;
  S.screen = 'dates'; persist(); render();
  if (restored) toast(`지난번 평가 ${restored}장을 불러왔어요`);
}
async function startDemo() {
  const token = ++readToken; S.screen = 'reading'; S.reading = { done: 0, total: DEMO.length }; render();
  try {
    const files = [];
    for (let i = 0; i < DEMO.length; i++) {
      const res = await fetch(`../assets/demo/${DEMO[i]}`); if (!res.ok) throw Error();
      files.push(new File([await res.blob()], DEMO[i], { type: 'image/jpeg', lastModified: 1791700000000 + i * 60000 }));
      readProgress(i + 1, DEMO.length);
    }
    if (token !== readToken) return;
    readToken--; await readFiles(files, '주말 기록', 'demo');
  } catch (_) { S.msg = '예시 사진을 불러오지 못했어요. 다시 시도해 주세요.'; S.screen = 'home'; render(); }
}
const input = id => { const el = $(id); el.value = ''; el.click(); };
function chooseFolder(another) { closeLayerSilently(); if (NATIVE) (another && NATIVE.chooseAnotherFolder) ? NATIVE.chooseAnotherFolder() : NATIVE.chooseFolder(); else input('#dir-input'); }
function chooseFiles() { if (NATIVE) NATIVE.chooseFiles(); else input('#file-input'); }
function closeLayerSilently() { if (S.layer) { S.layer = null; root.inert = false; renderLayer(); } }
$('#dir-input').addEventListener('change', e => readFiles(e.target.files));
$('#file-input').addEventListener('change', e => readFiles(e.target.files, '선택한 사진'));

/* 안드로이드 콜백 */
window.onNativeReading = () => { S.screen = 'reading'; S.reading = { done: 0, total: 0 }; render(); };
window.onNativeReadingProgress = p => readProgress(p.completed || 0, Number.isFinite(p.total) ? p.total : 0);
window.onNativeCancel = () => { S.screen = S.photos.length ? 'dates' : 'home'; render(); };
window.onNativePhotos = r => S.screen !== 'reading' ? null : load((r.photos || []).map(p => ({ key: p.key, nativeKey: p.key, name: p.name, path: p.path, size: p.size, mtime: p.mtime, url: p.url, thumbUrl: p.thumbUrl || p.url, date: p.captureDate || 'unknown', at: p.capturedAt || '', loc: !!p.hasLocation })), r.folderName || 'SD카드', 'real') || askPlaces();
/* 촬영 장소: 날짜마다 위치가 있는 사진 한 장만 기기에 물어본다 */
function askPlaces() {
  S.places = {}; if (!NATIVE?.describePlaces) return;
  const keys = {}; S.photos.forEach(p => { if (p.loc && p.date !== 'unknown' && !keys[p.date]) keys[p.date] = p.key; });
  S.placeAsk = keys; const list = Object.values(keys); if (list.length) try { NATIVE.describePlaces(JSON.stringify(list)); } catch (_) {}
}
window.onNativePlaces = r => {
  const pl = r?.places || {}, ask = S.placeAsk || {}; S.places = S.places || {};
  Object.entries(ask).forEach(([d, k]) => { if (pl[k]) S.places[d] = pl[k]; });
  if (S.screen === 'dates' && !S.layer) render();
};
/* 앱 업데이트 안내를 띄워도 되는 순간인지 (기기 쪽에서 확인) */
window.photoPickIdle = () => S.screen === 'home' && !S.layer && !S.save;
window.onNativeError = r => { if (S.save) { S.save = null; S.screen = 'results'; } else if (S.screen === 'reading') S.screen = S.photos.length ? 'dates' : 'home'; render(); openLayer(`<h2>Photo Pick</h2><p>${esc(r?.message || '문제가 생겼어요. 다시 시도해 주세요.')}</p><button class="pp-btn" data-act="close-layer" data-autofocus>확인</button>`, '안내'); };
window.onNativeSaveProgress = p => saveProgress(p.completed, p.total);
window.onNativeSaveComplete = r => {
  if (!S.save) return;
  if (S.layer) closeLayerSilently();
  if (r.cancelled) { const s = S.save; S.save = null; S.screen = 'results'; render(); toast(`저장을 멈췄어요. ${r.saved}장은 저장됐어요`); return; }
  S.save.result = r; S.screen = 'done'; render(); haptic(20);
};

/* ── 저장 ─────────────────────────────── */
async function save() {
  const items = picks(); if (!items.length) return;
  if (NATIVE && items.some(p => !p.nativeKey)) { openLayer(`<h2>예시 사진은 저장하지 않아요</h2><p>예시는 평가와 결과 화면까지만 체험할 수 있어요. SD카드 폴더를 열면 원본을 갤러리에 저장해요.</p><button class="pp-btn" data-act="folder" data-autofocus><span class="pp-led"></span>SD카드 폴더 열기</button><button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button>`, '안내'); return; }
  S.save = { items, done: 0, cancelled: false }; S.screen = 'saving'; render();
  if (NATIVE) { NATIVE.savePhotos(JSON.stringify(items.map(p => p.nativeKey))); return; }
  const s = S.save;
  try {
    const files = items.map(p => p.file);
    if (motion()) await wait(300);
    const ds = [...new Set(items.map(p => p.date).filter(d => d !== 'unknown'))].sort(), rng = ds.length ? ds[0].slice(5).replace('-', '') + (ds.length > 1 ? '-' + ds.at(-1).slice(5).replace('-', '') : '') : 'photos';
    const t0 = performance.now();
    const f = await PhotoPickWebDownload.prepare(files, () => s.cancelled || S.save !== s, (d, t) => { if (!motion()) saveProgress(d, t); }, `PhotoPick_${rng}_${items.length}.zip`);
    if (motion()) { const n = items.length, span = Math.max(0, 1400 - (performance.now() - t0)); for (let i = 1; i <= n; i++) { if (S.save !== s || s.cancelled) break; saveProgress(i, n); await wait(Math.min(260, span / n)); } }
    if (S.save !== s) return;
    if (motion()) { saveProgress(items.length, items.length); await wait(450); }
    if (s.cancelled || S.save !== s) throw Error('cancelled');
    if (S.layer) closeLayerSilently();
    s.file = f; S.screen = 'done'; render(); haptic(20);
  } catch (e) {
    if (S.save !== s) return;
    S.save = null; S.screen = 'results'; render();
    if (e.message === 'cancelled') toast('멈췄어요. 다시 저장할 수 있어요');
    else openLayer(`<h2>파일을 준비하지 못했어요</h2><p>${e.message === 'large' ? '사진이 너무 많아요. 날짜를 나눠서 저장해 주세요.' : '같은 폴더를 다시 열고 시도해 주세요.'}</p><button class="pp-btn" data-act="close-layer" data-autofocus>확인</button>`, '안내');
  }
}
function stopSave() {
  confirmSheet(NATIVE ? '사진 저장을 멈출까요?' : '준비를 멈출까요?', NATIVE ? '이미 저장한 사진은 그대로 있어요.<br>다시 저장하면 저장된 사진은 건너뛰어요.' : '지금까지 준비한 내용은 사라져요.', '멈추기', '계속하기', () => {
    if (!S.save) return; S.save.cancelled = true;
    if (NATIVE) NATIVE.cancelSave();
  });
}
async function imprint() {
  const s = S.save; if (!s || S.storyBusy) return; S.storyBusy = true;
  openLayer(`<h2 tabindex="-1" data-autofocus>날짜 각인 사진 만드는 중</h2><div class="segs dark" id="im-segs" role="progressbar" aria-label="각인 진행" aria-valuemin="0" aria-valuemax="${s.items.length}" aria-valuenow="0">${segs(0, s.items.length)}</div><p id="im-n" aria-live="polite">0 / ${s.items.length}장</p><button class="pp-btn pp-btn--key" data-act="close-layer">그만 만들기</button>`, '날짜 각인');
  const tok = S.layer, alive = () => S.layer === tok && S.save === s;
  const out = [];
  try {
    for (let i = 0; i < s.items.length; i++) {
      const f = await PhotoPickImprint(s.items[i]); if (!alive()) return; out.push(f);
      const sg = $('#im-segs'); if (sg) { sg.innerHTML = segs(i + 1, s.items.length); sg.setAttribute('aria-valuenow', i + 1); } const n = $('#im-n'); if (n) n.textContent = `${i + 1} / ${s.items.length}장`;
    }
    if (!alive()) return;
    S.imprintFiles = out; const url = URL.createObjectURL(out[0]); const share = !!navigator.canShare?.({ files: out });
    openLayer(`<h2>날짜를 새긴 사진 ${out.length}장</h2><div class="story-prev"><img src="${url}" alt="날짜 각인 사진 미리보기"></div><p>원본 파일은 바뀌지 않았어요.</p>
      ${share ? `<button class="pp-btn" data-act="imprint-share" data-autofocus><span class="pp-led"></span>${ic('share')}공유 · 갤러리에 저장</button>` : ''}
      <div class="row2"><button class="pp-btn ${share ? 'pp-btn--key' : ''}" data-act="imprint-each" ${share ? '' : 'data-autofocus'}>${ic('down')}${out.length}장 받기</button><button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button></div>`, '날짜 각인 사진', 'story-sheet');
  } catch (_) { if (alive()) { closeLayer(); toast('각인 사진을 만들지 못했어요'); } }
  finally { S.storyBusy = false; }
}
function click(freq = 2200, ms = 40) {
  try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const a = click.ctx || (click.ctx = new A());
    const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = freq; g.gain.setValueAtTime(.06, a.currentTime); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + ms / 1000);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + ms / 1000); } catch (_) {}
}
function ejectCard() {
  const box = $('.eject'); if (!box) return;
  const card = $('.card-out', box), dev = $('.dev', box), hint = $('.dev-hint');
  const done = () => { dev.style.opacity = 0; hint?.remove(); $$('.story-sheet .pp-btn').forEach(b => b.classList.add('lit')); haptic(20); removeEventListener('devicemotion', shake); };
  if (!motion()) { done(); return; }
  for (let i = 0; i < 6; i++) setTimeout(() => { click(1800 + i * 90, 25); haptic(5); }, 100 + i * 190);
  card.animate([{ transform: 'translateY(-102%)' }, { transform: 'translateY(0)', offset: .93 }, { transform: 'translateY(4px)', offset: .96 }, { transform: 'translateY(0)' }], { duration: 1240, easing: 'steps(7, end)', fill: 'both' });
  const img = $('img', card);
  img.animate([{ filter: 'sepia(.6) brightness(.7) contrast(.85) blur(1.5px)' }, { filter: 'sepia(0) brightness(1.02) contrast(1.04) blur(0) saturate(1.3)', offset: .88 }, { filter: 'none' }], { duration: 2000, delay: 1200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  const a = dev.animate([{ opacity: .7 }, { opacity: 0, offset: .88 }, { opacity: 0 }], { duration: 2000, delay: 1200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  let last = 0;
  function shake(e) { const g = e.accelerationIncludingGravity || e.acceleration; if (!g) return; const m = Math.hypot(g.x || 0, g.y || 0, g.z || 0); if (Math.abs(m - last) > 12) { a.playbackRate = Math.min(6, a.playbackRate + 1.5); haptic(8); } last = m; }
  addEventListener('devicemotion', shake);
  card.addEventListener('click', () => { a.playbackRate = Math.min(6, a.playbackRate + 1); });
  a.finished.then(done, () => {});
}
async function story() {
  const s = S.save; if (!s || S.storyBusy) return; S.storyBusy = true;
  openLayer(`<h2 tabindex="-1" data-autofocus>스토리 카드 만드는 중</h2><p aria-live="polite">베스트 사진을 필름에 담고 있어요</p><div class="segs dark pulse" aria-hidden="true">${segs(0, 10)}</div>`, '스토리 카드');
  const tok = S.layer;
  try {
    const best = [...s.items].sort((a, b) => (R[b.key] === 'best') - (R[a.key] === 'best'));
    const ds = S.dates.filter(d => d !== 'unknown').sort(), range = ds.length ? `${ds[0].replace(/-/g, '.')}${ds.length > 1 ? ' – ' + ds.at(-1).slice(5).replace('-', '.') : ''}` : '';
    const file = await PhotoPickStory({ photos: best, total: selIds().length, folder: S.folder, range });
    if (S.layer !== tok || S.save !== s) return;
    if (S.storyUrl) URL.revokeObjectURL(S.storyUrl);
    S.storyFile = file; S.storyUrl = URL.createObjectURL(file);
    const share = !!navigator.canShare?.({ files: [file] });
    openLayer(`<h2>스토리 카드가 나왔어요</h2><div class="story-prev eject"><span class="slot"><i></i></span><div class="card-out"><span class="cw"><img src="${S.storyUrl}" alt="고른 사진으로 만든 스토리 카드"><span class="dev" aria-hidden="true"></span></span></div></div><p class="dev-hint" aria-hidden="true">흔들면 더 빨리 나타나요</p>
      ${share ? `<button class="pp-btn" data-act="story-share" data-autofocus><span class="pp-led"></span>${ic('share')}인스타 스토리로 공유</button>` : ''}
      <div class="row2"><a class="pp-btn ${share ? 'pp-btn--key' : ''}" href="${S.storyUrl}" download="${file.name}" data-act="saved-toast" ${share ? '' : 'data-autofocus'}>이미지 저장</a><button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button></div>`, '스토리 카드', 'story-sheet');
    ejectCard();
  } catch (_) { if (S.layer === tok) { closeLayer(); toast('카드를 만들지 못했어요'); } }
  finally { S.storyBusy = false; }
}
async function share() {
  const s = S.save; if (!s) return;
  try { await navigator.share({ files: s.items.map(p => p.file), title: 'Photo Pick' }); toast('공유 창을 열었어요'); }
  catch (e) { if (e.name !== 'AbortError') toast('공유할 수 없어요. 아래에서 파일로 받아 주세요'); }
}

/* ── 평가 동작 ────────────────────────── */
const haptic = (ms = 10) => { try { NATIVE?.ratingHaptic ? NATIVE.ratingHaptic() : navigator.vibrate?.(ms); } catch (_) {} };
let busy = false, busyAnim = null, pendingNav = null, navSeq = 0, completeTimer = null;
function setRating(p, g) { if (g) R[p.key] = g; else delete R[p.key]; }
function doRate(g, via = 'key') {
  if (S.screen !== 'rate' || S.view !== 'one' || !S.photos[S.cur]) return;
  if (busy) { const t = pendingNav; navSeq++; busyAnim?.cancel(); busyAnim = null; busy = false; pendingNav = null; if (t != null) go(t, 1, true, navSeq); }
  const ids = selIds(), p = S.photos[S.cur], before = R[p.key] || null, next = g;
  const nowT = performance.now(); if (lastRateAt && nowT - lastRateAt < 20000) rateTimes.push(nowT - lastRateAt); lastRateAt = nowT;
  const lastSame = before === g && ids.indexOf(p.id) === ids.length - 1;
  setRating(p, next); if (!lastSame) S.history.push({ id: p.id, before, after: next }); if (S.history.length > 200) S.history.shift();
  persist(); haptic(); updateRateUI(); $('.toast')?.remove();
  say(`${RO[next]} 평가했어요`);
  stamp(next, p);
  const i = ids.indexOf(p.id);
  let target = before ? ids[i + 1] : ids.slice(i + 1).find(id => !R[S.photos[id].key]) ?? ids.slice(0, i).find(id => !R[S.photos[id].key]);
  if (target === undefined && !before && !ids.some(id => !R[S.photos[id].key])) { clearTimeout(completeTimer); completeTimer = setTimeout(showComplete, motion() ? 420 : 0); return; }
  if (target === undefined) return;
  flyOut(next, target, via);
}
function stamp(g, p) {
  if (g === 'best' && p) ccd(p);
  const t = $('#gtag'); if (t && motion()) t.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .6 }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
  return;
  const s = $('#stamp'); if (!s) return;
  s.className = `stamp ${g}`; s.innerHTML = `${ic(g)}<span>${LABEL[g]}</span>`;
  void s.offsetWidth; s.classList.add('show');
}
function ccd(p) {
  const v = $('#view'); if (!v) return; v.querySelector('.ccd')?.remove();
  if (motion()) { const f = document.createElement('span'); f.className = 'flash'; v.appendChild(f); f.animate([{ opacity: 0 }, { opacity: .85, offset: .3 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => f.remove()); } haptic(14);
  const d = p.date !== 'unknown' ? `'${p.date.slice(2, 4)} ${p.date.slice(5, 7)} ${p.date.slice(8, 10)}` : `'${String(new Date().getFullYear()).slice(2)} ${pad(new Date().getMonth() + 1)} ${pad(new Date().getDate())}`;
  const im = $('#photo'), iw = im?.offsetWidth || v.clientWidth, ih = im?.offsetHeight || v.clientHeight;
  const right = Math.max(0, (v.clientWidth - iw) / 2) + 12, bottom = Math.max(0, (v.clientHeight - ih) / 2) + 12;
  v.insertAdjacentHTML('beforeend', `<span class="ccd" aria-hidden="true" style="right:${right}px;bottom:${bottom}px"><i>'</i>${d.slice(1)}</span>`);
  setTimeout(() => v.querySelector('.ccd')?.remove(), 1100);
}
function flyOut(g, target, via) {
  const img = $('#photo');
  if (!motion() || !img) { if (target != null) go(target, 1, true); return; }
  busy = true;
  const frames = { skip: [{ transform: 'translateX(-120%) rotate(-9deg)', opacity: .2, filter: 'grayscale(1)' }], keep: [{ transform: 'translateY(40%) scale(.78) rotate(3deg)', opacity: 0 }], best: [{ transform: 'translateY(-60%) scale(1.06) rotate(-2deg)', opacity: 0 }] }[g];
  const cur = img.style.transform || 'none';
  const seq = ++navSeq; pendingNav = target;
  const a = busyAnim = g === 'best'
    ? img.animate([{ transform: cur, opacity: 1 }, { transform: `${cur === 'none' ? '' : cur} scale(1.025)`, opacity: 1, offset: .25 }, { transform: cur, opacity: 1, offset: .55 }, { transform: cur, opacity: 1, offset: .78 }, { transform: `translateY(-40px) ${cur === 'none' ? '' : cur}`, opacity: 0 }], { duration: 640, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
    : img.animate([{ transform: cur, opacity: 1, filter: 'none' }, ...frames], { duration: 220, delay: 40, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
  if (g !== 'skip') $('.frame')?.animate([{ boxShadow: 'var(--pp-shadow-card)' }, { boxShadow: '0 0 0 3px var(--pp-signal), var(--pp-shadow-card)' }, { boxShadow: 'var(--pp-shadow-card)' }], { duration: 520 });
  a.finished.then(() => { if (busyAnim !== a) return; busy = false; busyAnim = null; pendingNav = null; if (target != null && seq === navSeq) go(target, 1, true, seq); }, () => { if (busyAnim === a) { busy = false; busyAnim = null; } });
}
function go(id, dir = 1, fromRate = false, seq) {
  if (id == null || !S.photos[id]) return;
  if (seq === undefined) { navSeq++; if (busyAnim) { busyAnim.cancel(); busyAnim = null; busy = false; } }
  S.cur = id; resetZoom(); persist(); $$('#view .ccd, #view .flash').forEach(n => n.remove());
  if (S.screen !== 'rate' || S.view !== 'one') { render(); return; }
  const p = S.photos[id], img = $('#photo');
  img.style.transform = ''; img.getAnimations().forEach(a => a.cancel());
  img.src = fullUrl(p); img.alt = p.name;
  if (motion()) {
    if (fromRate) {
      img.animate([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else img.animate([{ transform: `translateX(${dir * 22}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const oc = $('#o-count i'); if (oc) oc.animate([{ transform: `translateY(${dir * 60}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  updateRateUI(); preload();
}
function preload() { const ids = selIds(), i = ids.indexOf(S.cur);[ids[i + 1], ids[i - 1], ids[i + 2]].forEach(id => { if (id != null) { const im = new Image(); im.decoding = 'async'; im.src = fullUrl(S.photos[id]); } }); }
function updateRateUI() {
  const ids = selIds(), p = S.photos[S.cur], i = ids.indexOf(S.cur), g = R[p.key], c = counts(ids);
  $('#o-name') && ($('#o-name').innerHTML = `<span class="o-file">${esc(p.name)}</span><span class="o-time">${p.time ? `<span class="o-dot">&nbsp;·&nbsp;</span>${p.time}` : ''}</span>`);
  const oc = $('#o-count'); if (oc) { oc.innerHTML = `<i class="oled-roll">${pad(i + 1)}</i>/${pad(ids.length)}`; }
  $$('.rk').forEach(b => { const on = b.dataset.g === g; if (b.getAttribute('aria-pressed') !== String(on) && on && motion()) b.querySelector('.pp-led').animate([{ transform: 'scale(2.4)' }, { transform: 'scale(1)' }], { duration: 320 }); b.setAttribute('aria-pressed', on); });
  const t = $('#gtag'); if (t) t.outerHTML = gradeTag(g);
  $('[data-act="prev"]').disabled = i <= 0; $('[data-act="next"]').disabled = i >= ids.length - 1; $('[data-act="undo"]').disabled = !S.history.length;
  const m = $('.meter'); if (m) { const tmp = document.createElement('div'); tmp.innerHTML = meter(ids); const nt = tmp.firstChild, ot = m.querySelector('.track'); ot.querySelectorAll('i').forEach((b, j) => { b.className = nt.children[j]?.className || ''; }); ot.querySelector('.head').style.left = nt.querySelector('.head').style.left; m.setAttribute('aria-valuenow', ids.length - c.unrated); $('#m-lbl').innerHTML = `${ids.length - c.unrated}<span class="pre">장 평가</span>`; }
  $('#view')?.setAttribute('aria-label', `${p.name} 사진${g ? ', ' + LABEL[g] : ''}`);
}
function undoEntry(h) {
  if (S.history.at(-1) === h) { undo(); return; }
  const i = S.history.indexOf(h); if (i >= 0) S.history.splice(i, 1);
  (h.batch || [h]).forEach(x => setRating(S.photos[x.id], x.before)); persist(); if (S.screen === 'rate' && S.view === 'one') updateRateUI(); else render(); toast('되돌렸어요');
}
function updateMulti() { const n = $('#multi-n'); if (n) n.textContent = S.multi.size; $$('[data-act="batch"]').forEach(k => { k.disabled = !S.multi.size; }); }
function batchRate(g) {
  const ids = [...(S.multi || [])]; if (!ids.length) return;
  const batch = ids.map(id => ({ id, before: R[S.photos[id].key] || null, after: g }));
  batch.forEach(x => setRating(S.photos[x.id], g)); S.history.push({ id: ids[0], batch }); persist(); haptic(16);
  S.multi = null; render();
  if (motion()) ids.forEach((id, i) => $(`#sheet .tile[data-id="${id}"]`)?.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 360, delay: Math.min(i, 20) * 25, easing: 'cubic-bezier(.2,.9,.3,1.3)' }));
  const hb = S.history.at(-1); toast(`${ids.length}장을 ${RO[g]} 평가했어요`, '되돌리기', () => undoEntry(hb));
}
let lpFired = false;
document.addEventListener('pointerdown', e => {
  lpFired = false;
  const t = e.target.closest('#sheet .tile'); if (!t || S.multi) return;
  const x0 = e.clientX, y0 = e.clientY;
  const timer = setTimeout(() => { S.multi = new Set([+t.dataset.id]); lpFired = true; haptic(18); render(); }, 480);
  const cancel = ev => { if (ev.type === 'pointermove' && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return; clearTimeout(timer); off(); };
  const off = () => { removeEventListener('pointermove', cancel); removeEventListener('pointerup', cancel); removeEventListener('pointercancel', cancel); };
  addEventListener('pointermove', cancel); addEventListener('pointerup', cancel); addEventListener('pointercancel', cancel);
});
document.addEventListener('contextmenu', e => { if (e.target.closest('#sheet .tile')) e.preventDefault(); });
function undo() {
  const h = S.history.pop(); if (!h) return;
  if (h.batch) { h.batch.forEach(x => setRating(S.photos[x.id], x.before)); persist(); haptic(); render(); toast(`${h.batch.length}장 평가를 되돌렸어요`); return; }
  navSeq++; clearTimeout(completeTimer); if (busyAnim) { busyAnim.cancel(); busyAnim = null; busy = false; }
  if (!S.dates.includes(S.photos[h.id].date)) S.dates.push(S.photos[h.id].date);
  const p = S.photos[h.id]; setRating(p, h.before); persist(); haptic();
  $('.view-done')?.remove(); $('.scr')?.classList.remove('all-done');
  if (S.screen === 'rate' && S.view === 'one') { const dir = selIds().indexOf(h.id) < selIds().indexOf(S.cur) ? -1 : 1; S.cur === h.id ? updateRateUI() : go(h.id, dir); }
  else { S.cur = h.id; render(); }
  toast(`${p.name} 평가를 되돌렸어요`);
}
function showComplete() {
  const v = $('#view'); if (!v || $('.view-done') || counts().unrated) return;
  const ids = selIds(), c = counts(ids);
  $('.scr').classList.add('all-done');
  v.insertAdjacentHTML('beforeend', `<div class="view-done" role="status"><div class="big" id="vd-n">${pad(ids.length)}</div><b>모두 평가했어요</b><p>매우 좋음 ${c.best} · 좋음 ${c.keep} · 별로 ${c.skip}</p><button class="pp-btn" data-act="results"><span class="pp-led"></span>결과 보기</button><button class="text-btn" data-act="close-done" style="color:var(--pp-oled-muted)">계속 둘러보기</button></div>`);
  if (motion()) { $('.view-done').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); countUp($('#vd-n'), ids.length, Math.max(2, String(ids.length).length), 700); ledChase(); }
  haptic(25);
}
function ledChase() { $$('.rk .pp-led').forEach((l, i) => l.animate([{ background: 'var(--pp-faint)' }, { background: 'var(--pp-signal)', boxShadow: 'var(--pp-signal-glow)' }, { background: 'var(--pp-faint)' }], { duration: 420, delay: i * 110, iterations: 2 })); }

/* ── 사진 확대 / 몸짓 ─────────────────── */
const Z = { s: 1, x: 0, y: 0 };
function applyZoom(anim) {
  const img = $('#photo'); if (!img) return;
  // 기기 앱: 확대하면 고해상도로 다시 받아 선명하게
  if (NATIVE && Z.s > 1.01 && img.src && !/[?&]detail=1/.test(img.src)) img.src = img.src + (img.src.includes('?') ? '&' : '?') + 'detail=1';
  const t = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
  img.style.transformOrigin = 'center center';
  if (anim && motion()) img.animate([{ transform: img.style.transform || 'none' }, { transform: t }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
  img.style.transform = Z.s === 1 && !Z.x && !Z.y ? '' : t;
  const hl = $('.hintline'); if (hl) hl.innerHTML = Z.s > 1.01 ? '<span>끌어서 이동</span><span>두 번 탭하면 원래대로</span>' : HINT;
  const chip = $('#zoomchip'); if (chip) { chip.hidden = Z.s <= 1.01; chip.textContent = `${Math.round(Z.s * img.offsetWidth / (img.naturalWidth || img.offsetWidth) * 100)}%`; }
}
function clampZoom() {
  const img = $('#photo'), v = $('#view'); if (!img || !v) return;
  const mx = Math.max(0, (img.offsetWidth * Z.s - v.clientWidth) / 2), my = Math.max(0, (img.offsetHeight * Z.s - v.clientHeight) / 2);
  Z.x = Math.max(-mx, Math.min(mx, Z.x)); Z.y = Math.max(-my, Math.min(my, Z.y));
}
function maxZoom() { const img = $('#photo'); return img ? Math.max(4, (img.naturalWidth || 0) / (img.offsetWidth || 1) * 1.5) : 4; }
function resetZoom() { Z.s = 1; Z.x = 0; Z.y = 0; const hl = $('.hintline'); if (hl) hl.innerHTML = HINT; const img = $('#photo'); if (img) img.style.transform = ''; const c = $('#zoomchip'); if (c) c.hidden = true; }
function toggleZoom(cx, cy) {
  const img = $('#photo'), v = $('#view'); if (!img || !v) return;
  if (Z.s > 1.01) { Z.s = 1; Z.x = 0; Z.y = 0; applyZoom(true); return; }
  const full = Math.max(1.6, (img.naturalWidth || img.offsetWidth * 2) / img.offsetWidth);
  const r = v.getBoundingClientRect(), px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
  Z.s = full; Z.x = -px * (full - 1); Z.y = -py * (full - 1); clampZoom(); applyZoom(true); haptic(6);
}
function bindGestures() {
  const v = $('#view'); if (!v) return;
  const pts = new Map(); let start = null, lastTap = 0, pinch = null, moved = false;
  v.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    v.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: Z.s }; start = null; return; }
    start = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y, t: performance.now() }; moved = false;
  });
  v.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const img = $('#photo'); if (!img || busy) return;
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; Z.s = Math.max(1, Math.min(maxZoom(), pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); clampZoom(); applyZoom(); return; }
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; if (Math.hypot(dx, dy) > 8) moved = true;
    if (Z.s > 1.01) { Z.x = start.zx + dx; Z.y = start.zy + dy; clampZoom(); applyZoom(); return; }
    if (!moved) return;
    const horiz = Math.abs(dx) > Math.abs(dy);
    img.style.transform = horiz ? `translateX(${dx}px) rotate(${dx / 40}deg)` : `translateY(${dy * .6}px) scale(${1 - Math.min(.12, Math.abs(dy) / 1200)})`;
    v.dataset.hint = horiz ? '' : dy > 40 ? 'keep' : dy < -40 ? 'best' : '';
    hintKey(v.dataset.hint);
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) { pinch = null; if (Z.s < 1.05) resetZoom(); start = null; } return; }
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, img = $('#photo'), s0 = start; start = null; hintKey('');
    if (e.type === 'pointercancel') { if (Z.s <= 1.01 && img) img.style.transform = ''; return; }
    if (!moved) { const now = performance.now(); if (now - lastTap < 300) { lastTap = 0; toggleZoom(e.clientX, e.clientY); } else lastTap = now; return; }
    if (Z.s > 1.01) return;
    const ids = selIds(), i = ids.indexOf(S.cur), horiz = Math.abs(dx) > Math.abs(dy);
    if (horiz && Math.abs(dx) > 60) { const t = ids[i + (dx < 0 ? 1 : -1)]; if (t != null) { go(t, dx < 0 ? 1 : -1); return; } }
    else if (!horiz && dy > 70) { doRate('keep', 'swipe'); return; }
    else if (!horiz && dy < -70) { doRate('best', 'swipe'); return; }
    if (img) { const from = img.style.transform; img.style.transform = ''; if (motion() && from) img.animate([{ transform: from }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.3,1.2)' }); }
  };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); Z.s = Math.max(1, Math.min(maxZoom(), Z.s * (e.deltaY < 0 ? 1.1 : .9))); clampZoom(); applyZoom(); }, { passive: false });
  $('#photo')?.addEventListener('load', () => { if (Z.s > 1) applyZoom(); });
}
function hintKey(g) { $$('.rk').forEach(b => b.classList.toggle('is-down', b.dataset.g === g)); }
after.rate = () => {
  resetZoom();
  if (S.view === 'one') { bindGestures(); preload(); if (!guideSeen && !S.layer) guide(); }
  else { if (!S._keep) $('.tile.is-cur')?.scrollIntoView({ block: 'center' }); if (!S._keep) scrollReveal($('#sheet')); }
};
after.dates = () => scrollReveal($('#date-list'));
const prevResults = after.results;
after.results = () => { prevResults(); const pk = $('#picks'); if (pk && motion()) { pk.classList.add('develop'); [...pk.querySelectorAll('.tile')].forEach((t, i) => t.style.setProperty('--d', Math.min(i, 16))); } scrollReveal(pk); };

/* 스크롤 연동 등장: 지원 브라우저는 CSS(animation-timeline), 아니면 IntersectionObserver */
const SCROLL_TL = CSS.supports?.('animation-timeline: view()');
function scrollReveal(box) {
  if (!box || !motion() || box.children.length > 200) return;
  if (SCROLL_TL) { box.classList.add('sd'); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: box, threshold: .1 });
  [...box.children].forEach(c => { c.classList.add('rv'); io.observe(c); });
}

/* ── 화면 이동 ────────────────────────── */
function to(screen) { if (screen !== 'rate') S.multi = null; S.screen = screen; S.msg = ''; render(); }
function back() {
  if (S.layer) { closeLayer(); return true; }
  if (S.screen === 'rate' && S.view === 'one' && Z.s > 1.01) { resetZoom(); return true; }
  switch (S.screen) {
    case 'reading': cancelRead(); return true;
    case 'dates': to('home'); return true;
    case 'rate': if (S.multi) { S.multi = null; refocus = '[data-act="multi-on"]'; render(); } else if (S.view === 'sheet') { S.view = 'one'; render(); } else to(S.groups.length > 1 ? 'dates' : 'home'); return true;
    case 'results': S.view = 'one'; to('rate'); return true;
    case 'saving': stopSave(); return true;
    case 'done': S.save = null; to('results'); return true;
  }
  return false;
}
function cancelRead() { readToken++; if (NATIVE?.cancelRead) NATIVE.cancelRead(); S.reading = null; to(S.photos.length ? 'dates' : 'home'); }
window.nativeBack = () => { if (!back() && S.screen === 'home') NATIVE?.closeApp?.(); };
/* 브라우저 뒤로가기(안드로이드 크롬 뒤로 버튼 포함)를 앱 안의 뒤로가기로 */
let guard = false, skipPop = false, pendingPush = false;
function syncHistory() {
  if (NATIVE) return;
  const deep = S.screen !== 'home' || !!S.layer;
  if (skipPop) { pendingPush = deep; return; }
  if (deep && !guard) { history.pushState({ pp: 1 }, ''); guard = true; }
  else if (!deep && guard) { guard = false; skipPop = true; history.back(); }
}
addEventListener('popstate', () => {
  if (skipPop) { skipPop = false; if (pendingPush) { pendingPush = false; syncHistory(); } return; }
  if (guard) { guard = false; back(); syncHistory(); }
});

/* ── 클릭 처리 ────────────────────────── */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  refocus = `[data-act="${a}"]` + (['f', 's', 'v', 'g', 'k'].map(k => b.dataset[k] ? `[data-${k}="${b.dataset[k]}"]` : '').join(''));
  switch (a) {
    case 'menu': menu(); break;
    case 'guide': closeLayerSilently(); guide(); break;
    case 'close-layer': closeLayer(); break;
    case 'sheet-ok': { const fn = S.layer?.onOk; S.layer = null; root.inert = false; renderLayer(); syncHistory(); fn?.(); break; }
    case 'folder': chooseFolder(!!b.dataset.another); break;
    case 'updates': closeLayerSilently(); try { NATIVE?.checkUpdates?.(); } catch (_) {} break;
    case 'files': chooseFiles(); break;
    case 'demo': startDemo(); break;
    case 'resume': {
      const last = store.last;
      if (S.photos.length && last && S.folder === last.folder && last.keys?.[0] === S.photos[0]?.key) { const ids = selIds(); if (!ids.length) { to('dates'); break; } S.cur = ids.find(id => !R[S.photos[id].key]) ?? (ids.includes(S.cur) ? S.cur : ids[0]); S.view = 'one'; to('rate'); break; }
      if (last?.dataset === 'demo') { startDemo(); break; }
      openLayer(`<h2>같은 폴더를 다시 열어 주세요</h2><p>${esc(last?.folder || '')} 폴더를 열면 평가한 ${last?.rated || 0}장이 그대로 이어져요.<br>브라우저는 보안 때문에 폴더를 기억하지 못해요.</p><button class="pp-btn" data-act="folder" data-autofocus><span class="pp-led"></span>폴더 열기</button><button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button>`, '이어서 고르기');
      break;
    }
    case 'cancel-read': cancelRead(); break;
    case 'back': back(); break;
    case 'sel-all': S.dates = S.dates.length === S.groups.length ? [] : S.groups.map(g => g.key); persist(); refreshDates(); break;
    case 'date': { const k = b.dataset.k; S.dates = S.dates.includes(k) ? S.dates.filter(d => d !== k) : [...S.dates, k]; persist(); refreshDates(); if (motion()) b.animate([{ transform: 'scale(.98)' }, { transform: 'none' }], { duration: 180 }); break; }
    case 'start': { const ids = selIds(); if (!ids.length) break; S.view = 'one'; S.history = []; if (!ids.includes(S.cur)) S.cur = ids.find(id => !R[S.photos[id].key]) ?? ids[0]; else if (R[S.photos[S.cur].key]) S.cur = ids.find(id => !R[S.photos[id].key]) ?? S.cur; persist(); to('rate'); break; }
    case 'rate': doRate(b.dataset.g); if (motion()) b.animate([{ transform: 'translateY(3px) scale(.97)' }, { transform: 'translateY(2px)' }], { duration: 160 }); break;
    case 'prev': case 'next': { const ids = selIds(), i = ids.indexOf(S.cur), d = a === 'next' ? 1 : -1; if (ids[i + d] != null) go(ids[i + d], d); break; }
    case 'undo': undo(); break;
    case 'sheet': S.view = 'sheet'; render(); break;
    case 'one': S.view = 'one'; S.multi = null; render(); break;
    case 'filter': S.filter = b.dataset.f; if (S.multi) { render(); const vis = new Set($$('#sheet .tile').map(t => +t.dataset.id)); S.multi = new Set([...S.multi].filter(id => vis.has(id))); } render(); break;
    case 'open': {
      if (lpFired && e.detail !== 0) { lpFired = false; break; }
      const id = +b.dataset.id;
      if (S.multi && S.screen === 'rate') { S.multi.has(id) ? S.multi.delete(id) : S.multi.add(id); b.classList.toggle('is-sel'); b.setAttribute('aria-pressed', S.multi.has(id)); updateMulti(); break; }
      S.cur = id; S.view = 'one'; S.screen = 'rate'; render(); break;
    }
    case 'multi-on': S.multi = new Set(); refocus = '#sheet .tile'; render(); toast('사진을 눌러 고르고, 아래 키로 한꺼번에 평가해요'); break;
    case 'multi-off': S.multi = null; refocus = '[data-act="multi-on"]'; render(); break;
    case 'multi-all': { const ids = $$('#sheet .tile').map(t => +t.dataset.id); S.multi = ids.every(id => S.multi.has(id)) ? new Set() : new Set(ids); render(); break; }
    case 'batch': batchRate(b.dataset.g); break;
    case 'results': to('results'); break;
    case 'clear-grade': { const p = S.photos[S.cur]; if (!R[p.key]) break; const h = { id: p.id, before: R[p.key], after: null }; S.history.push(h); setRating(p, null); persist(); updateRateUI(); haptic(); toast('평가를 취소했어요', '되돌리기', () => undoEntry(h)); break; }
    case 'close-done': $('.view-done')?.remove(); $('.scr')?.classList.remove('all-done'); break;
    case 'unrated': { const ids = selIds(); S.cur = ids.find(id => !R[S.photos[id].key]) ?? S.cur; S.view = 'one'; to('rate'); break; }
    case 'scope': S.scope = b.dataset.s; persist(); render(); break;
    case 'pv': S.picksView = b.dataset.v; render(); break;
    case 'save': save(); break;
    case 'stop-save': stopSave(); break;
    case 'share': share(); break;
    case 'each': each().then(() => { const k = $('[data-act="each"]'); if (k) { k.innerHTML = `${ic('check2')}${S.save?.items.length || ''}장 받았어요`; k.classList.add('done-mark'); } }); break;
    case 'story': story(); break;
    case 'extras': openLayer(`<h2>사진 꾸미기</h2><p>원본은 그대로 두고, 공유하기 좋은 이미지를 새로 만들어요.</p>
      <div class="menu-list"><button class="menu-item" data-act="story" ${S.storyBusy ? 'disabled' : ''}>${ic('best')}<span>스토리 카드<br><small style="margin:0">베스트 4컷 필름 · 1080×1920</small></span></button>
      <button class="menu-item" data-act="imprint" ${S.save.items.length > 30 || S.storyBusy ? 'disabled' : ''}>${ic('cal')}<span>날짜 각인 사진 ${S.save.items.length}장<br><small style="margin:0">${S.save.items.length > 30 ? '30장 이하일 때 만들 수 있어요' : "디카처럼 '26 10 11 주황 날짜"}</small></span></button></div>
      <button class="pp-btn pp-btn--key" data-act="close-layer">닫기</button>`, '사진 꾸미기'); break;
    case 'imprint': imprint(); break;
    case 'imprint-share': { const fs = S.imprintFiles; if (fs) navigator.share({ files: fs }).catch(() => {}); break; }
    case 'imprint-each': { const fs = S.imprintFiles || []; (async () => { for (const f of fs) { const a = document.createElement('a'), u = URL.createObjectURL(f); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); await wait(350); } })(); break; }
    case 'saved-toast': toast('이미지를 저장했어요'); break;
    case 'story-share': { const f = S.storyFile; if (f) navigator.share({ files: [f] }).catch(() => {}); break; }
    case 'dl': if (!S.save?.file) e.preventDefault(); else { toast('다운로드를 시작했어요'); setTimeout(() => { b.classList.add('done-mark'); b.innerHTML = `${ic('check2')}받았어요`; }, 50); } break;
    case 'to-dates': closeLayerSilently(); S.save = null; to('dates'); break;
    case 'to-home': S.save = null; to('home'); break;
    case 'clear': confirmSheet('이 폴더 평가를 지울까요?', `${esc(S.folder)}의 평가 ${S.photos.filter(p => R[p.key]).length}장이 지워져요.<br>사진 파일은 그대로예요.`, '평가 지우기', '취소', () => { const snap = {}; S.photos.forEach(p => { if (R[p.key]) snap[p.key] = R[p.key]; delete R[p.key]; }); S.history = []; persist(); render(); toast(`평가 ${Object.keys(snap).length}장을 지웠어요`, '되돌리기', () => { Object.assign(R, snap); persist(); render(); toast('평가를 되돌렸어요'); }); }); break;
  }
});
function refreshDates() {
  const n = S.photos.filter(p => S.dates.includes(p.date)).length, all = S.dates.length === S.groups.length;
  $$('.datecard').forEach(c => c.setAttribute('aria-checked', S.dates.includes(c.dataset.k)));
  const sa = $('.selall'); sa.setAttribute('aria-checked', all ? 'true' : S.dates.length ? 'mixed' : 'false'); 
  const sn = $('#sel-n'); if (motion() && sn.textContent !== String(n)) sn.animate([{ transform: 'translateY(-40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200 }); sn.textContent = n;
  const st = $('[data-act="start"]'); st.disabled = !n; st.innerHTML = `<span class="pp-led"></span>${n ? '고르기 시작' : '날짜를 골라 주세요'}`;
}

/* 키보드 */
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') { if (back()) e.preventDefault(); return; }
  if (S.layer || S.screen !== 'rate') return;
  const k = e.key.toLowerCase();
  if (S.view === 'one') {
    const map = { '1': 'skip', '2': 'keep', '3': 'best', x: 'skip', arrowdown: 'keep', arrowup: 'best' };
    if (map[k]) { e.preventDefault(); doRate(map[k]); const b = $(`.rk[data-g="${map[k]}"]`); b?.classList.add('is-down'); setTimeout(() => b?.classList.remove('is-down'), 120); return; }
    if (k === 'arrowleft' || k === 'arrowright') { e.preventDefault(); $(`[data-act="${k === 'arrowleft' ? 'prev' : 'next'}"]`)?.click(); return; }
    if (k === ' ') { e.preventDefault(); const r = $('#view').getBoundingClientRect(); toggleZoom(r.left + r.width / 2, r.top + r.height / 2); return; }
  }
  if (k === 'z' || k === 'backspace') { e.preventDefault(); undo(); }
  if (k === 'g') { S.view = S.view === 'one' ? 'sheet' : 'one'; S.multi = null; render(); }
});
addEventListener('resize', () => { if (Z.s > 1) { clampZoom(); applyZoom(); } });

/* ── 오프닝 ───────────────────────────── */
function opening() {
  let seen = false; try { seen = !!sessionStorage.getItem('pp1.open'); sessionStorage.setItem('pp1.open', '1'); } catch (_) {}
  if (seen) return;
  const el = document.createElement('div'); el.className = 'opening'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="op-stage"><div class="op-ring r1"></div><div class="op-ring r2"></div><div class="op-ring r3"></div>
    ${[0, 4, 8].map((n, i) => `<span class="op-card c${i}" style="background-image:url('../assets/demo/${DEMO[n]}')"></span>`).join('')}
    <span class="op-dot"></span></div>
    <div class="op-keys"><span>×</span><span>●</span><span>★</span></div>
    <div class="op-oled"><span class="op-type">PP-1 · BOOT</span><em>READY</em></div>
    <div class="op-brand"><b>${'Photo Pick'.split('').map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i>`).join('')}</b><span>사진은 많이, 선택은 가볍게</span></div>
    <span class="op-skip">탭해서 건너뛰기</span>`;
  $('.app').appendChild(el); root.inert = true;
  let closed = false;
  const close = () => {
    if (closed) return; closed = true; root.inert = !!S.layer;
    const lens = $('.device-lens .ring'), app = $('.app').getBoundingClientRect();
    if (motion() && lens && el.animate) {
      const r = lens.getBoundingClientRect(), x = r.left + r.width / 2 - app.left, y = r.top + r.height / 2 - app.top;
      el.animate([{ clipPath: `circle(150% at ${x}px ${y}px)` }, { clipPath: `circle(${r.width / 2}px at ${x}px ${y}px)`, offset: .8 }, { clipPath: `circle(0px at ${x}px ${y}px)` }], { duration: 520, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished.then(() => el.remove());
      lens.animate([{ transform: 'scale(.92) rotate(-25deg)' }, { transform: 'none' }], { duration: 700, delay: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    } else { el.classList.add('out'); setTimeout(() => el.remove(), 420); }
  };
  el.addEventListener('click', close);
  if (!motion()) el.classList.add('still');
  setTimeout(close, motion() ? 1950 : 900);
}

render(); opening();
window.PhotoPickApp = { state: S, ratings: R, version: VERSION };
})();
