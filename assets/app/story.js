/* 스토리 카드: 고른 사진으로 1080×1920 필름 스트립 이미지를 만든다 (이 기기 안에서만) */
function stamp7(x, date, right, base, size) {
  const digits = `${date.slice(2, 4)} ${date.slice(5, 7)} ${date.slice(8, 10)}`;
  x.save(); x.textAlign = 'right'; x.textBaseline = 'alphabetic';
  x.font = `400 ${size}px DSEG7, "JetBrains Mono", monospace`;
  const w = x.measureText(digits).width;
  const draw = () => { x.fillText(digits, right, base); x.font = `500 ${size}px "JetBrains Mono", monospace`; x.fillText("'", right - w - size * .12, base); x.font = `400 ${size}px DSEG7, "JetBrains Mono", monospace`; };
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = size * .2; x.fillStyle = '#FF7A1A'; draw();
  x.shadowColor = 'rgba(255,90,0,.75)'; x.shadowBlur = size * .5; draw();
  x.shadowBlur = size * .08; x.shadowColor = '#FFB070'; x.fillStyle = '#FF9440'; draw();
  x.restore();
}
window.PhotoPickStory = async ({ photos, total, folder, range }) => {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  try { await Promise.all(['600 120px "Hanken Grotesk"', '500 30px "JetBrains Mono"', '700 40px "Hanken Grotesk"', '400 30px DSEG7'].map(f => document.fonts.load(f))); } catch (_) {}
  const ko = '"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo",system-ui,sans-serif';
  // 바탕 + 그레인
  x.fillStyle = '#EDEDEB'; x.fillRect(0, 0, W, H);
  const grain = x.createImageData(W, H); for (let i = 0; i < grain.data.length; i += 4) { const v = Math.random() * 16; grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = 0; grain.data[i + 3] = v; }
  const g = document.createElement('canvas'); g.width = W; g.height = H; g.getContext('2d').putImageData(grain, 0, 0);
  // 머리
  x.fillStyle = '#FF5A1F'; x.beginPath(); x.arc(92, 118, 11, 0, 7); x.fill();
  x.fillStyle = '#141414'; x.font = '700 40px "Hanken Grotesk",sans-serif'; x.fillText('PP-1', 118, 132);
  x.font = '500 34px "JetBrains Mono",monospace'; x.fillStyle = '#5C5C5A'; x.textAlign = 'right'; x.fillText(range || '', W - 80, 132); x.textAlign = 'left';
  // 필름 스트립
  const n = Math.min(4, photos.length), sx = 150, sw = W - 300, top = 210, sh = 1230;
  x.save(); x.translate(W / 2, top + sh / 2); x.rotate(-0.035); x.translate(-W / 2, -(top + sh / 2));
  x.fillStyle = 'rgba(0,0,0,.25)'; x.filter = 'blur(30px)'; x.fillRect(sx + 20, top + 40, sw, sh); x.filter = 'none';
  x.fillStyle = '#121212'; x.beginPath(); x.roundRect(sx, top, sw, sh, 18); x.fill();
  for (let y = top + 26; y < top + sh - 20; y += 52) { x.fillStyle = '#EDEDEB'; x.beginPath(); x.roundRect(sx + 22, y, 30, 22, 5); x.roundRect(sx + sw - 52, y, 30, 22, 5); x.fill(); }
  const fx = sx + 84, fw = sw - 168, gap = 26, fh = (sh - 90 - gap * (n - 1)) / Math.max(n, 1);
  for (let i = 0; i < n; i++) {
    const p = photos[i], fy = top + 30 + i * (fh + gap);
    try {
      const src = p.file || await (await fetch(p.url)).blob();
      const bmp = await createImageBitmap(src, { resizeWidth: 1100, resizeQuality: 'high' });
      const r = Math.max(fw / bmp.width, fh / bmp.height), dw = bmp.width * r, dh = bmp.height * r;
      x.save(); x.beginPath(); x.roundRect(fx, fy, fw, fh, 6); x.clip(); x.drawImage(bmp, fx + (fw - dw) / 2, fy + (fh - dh) * (dh > fh * 1.2 ? 0.28 : 0.5), dw, dh); x.restore(); bmp.close();
    } catch (_) { x.fillStyle = '#2a2a28'; x.fillRect(fx, fy, fw, fh); }
    if (p.date && p.date !== 'unknown') stamp7(x, p.date, fx + fw - 26, fy + fh - 26, 34);
  }
  x.font = '500 30px "JetBrains Mono",monospace'; x.fillStyle = '#BDBDB9'; x.fillText(`BEST ${n} CUT${n > 1 ? 'S' : ''}`, sx + 84, top + sh - 8);
  x.restore();
  // 아래 큰 숫자
  const count = String(photos.length).padStart(2, '0');
  x.fillStyle = '#141414'; x.font = '600 260px "Hanken Grotesk",sans-serif'; x.fillText(count, 70, 1700);
  const cw = x.measureText(count).width;
  x.fillRect(80, 1738, 220, 16);
  x.font = `700 46px ${ko}`; x.fillText('장을 골랐어요', 100 + cw, 1620);
  x.font = `500 32px ${ko}`; x.fillStyle = '#5C5C5A'; x.fillText(`${total}장 중에서 · ${folder || ''}`.slice(0, 34), 100 + cw, 1672);
  x.font = '500 32px "JetBrains Mono",monospace'; x.fillText('PHOTO PICK · 사진은 많이, 선택은 가볍게', 80, 1830);
  x.fillStyle = '#FF5A1F'; [0, 1, 2].forEach(i => { x.beginPath(); x.arc(W - 150 + i * 36, 1822, 9, 0, 7); x.globalAlpha = i === 2 ? 1 : .25; x.fill(); }); x.globalAlpha = 1;
  x.drawImage(g, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
  return new File([blob], `PhotoPick-story-${Date.now().toString(36)}.jpg`, { type: 'image/jpeg' });
};
/* 날짜 각인 사본: 원본은 그대로 두고, 오른쪽 아래에 CCD식 주황 날짜를 넣은 새 JPEG를 만든다 */
window.PhotoPickImprint = async (p) => {
  // 기기 앱은 기본 사진이 화면용(1200px)이라 각인 사본은 고해상도로 받아 만든다
  const src = p.file || await (await fetch(window.PhotoPickAndroid && p.url ? p.url + (p.url.includes('?') ? '&' : '?') + 'detail=1' : p.url)).blob();
  const bmp = await createImageBitmap(src);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); bmp.close();
  try { await Promise.all([document.fonts.load('500 40px "JetBrains Mono"'), document.fonts.load('400 40px DSEG7')]); } catch (_) {}
  const md = p.mtime ? new Date(p.mtime) : null;
  const d = p.date && p.date !== 'unknown' ? p.date : md ? `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}-${String(md.getDate()).padStart(2, '0')}` : '';
  const size = Math.round(Math.min(c.width, c.height) * 0.05);
  if (d) stamp7(x, d, c.width - size * 1.1, c.height - size * 1.0, size);
  let blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
  c.width = c.height = 1;
  // 원본 EXIF(APP1)를 이어 붙여 촬영 정보와 날짜를 유지 (방향 값이 1일 때만: 캔버스가 이미 회전을 적용했으므로)
  try {
    if (p.file && (p.orient || 1) === 1) {
      const head = new Uint8Array(await p.file.slice(0, 131072).arrayBuffer());
      let o = 2, app1 = null;
      while (o + 4 < head.length && head[o] === 0xff) { const m = head[o + 1], len = (head[o + 2] << 8) | head[o + 3]; if (m === 0xe1 && head[o + 4] === 0x45 && head[o + 5] === 0x78) { app1 = head.slice(o, o + 2 + len); break; } if (m === 0xda) break; o += 2 + len; }
      if (app1 && app1.length === ((app1[2] << 8) | app1[3]) + 2) { const body = new Uint8Array(await blob.arrayBuffer()); blob = new Blob([body.slice(0, 2), app1, body.slice(2)], { type: 'image/jpeg' }); }
    }
  } catch (_) {}
  const at = p.at && /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(p.at);
  const lm = at ? new Date(+at[1], at[2] - 1, +at[3], +at[4], +at[5], +at[6]).getTime() : (p.mtime || Date.now());
  return new File([blob], p.name.replace(/\.jpe?g$/i, '') + '_date.jpg', { type: 'image/jpeg', lastModified: lm });
};
/* 줄 스토리 카드: 고른 사진 3~4장을 세로로 줄지어 놓은 1080×1920 카드.
   picks: [{ p, fx, fy }] — fx·fy는 0~1 크롭 위치(CSS object-position과 같은 뜻) */
const ROWS_LAYOUT = { W: 1080, H: 1920, x: 60, top: 196, bottom: 1636, gap: 16 };
window.PhotoPickRowsLayout = ROWS_LAYOUT;
window.PhotoPickRows = async ({ picks, total, folder, range }) => {
  const L = ROWS_LAYOUT, W = L.W, H = L.H, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  try { await Promise.all(['600 120px "Hanken Grotesk"', '500 30px "JetBrains Mono"', '700 40px "Hanken Grotesk"', '400 30px DSEG7'].map(f => document.fonts.load(f))); } catch (_) {}
  const ko = '"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo",system-ui,sans-serif';
  x.fillStyle = '#EDEDEB'; x.fillRect(0, 0, W, H);
  // 머리: 전원 LED + PP-1 + 기간
  x.fillStyle = '#FF5A1F'; x.beginPath(); x.arc(L.x + 12, 118, 11, 0, 7); x.fill();
  x.fillStyle = '#141414'; x.font = '700 40px "Hanken Grotesk",sans-serif'; x.textBaseline = 'alphabetic'; x.fillText('PP-1', L.x + 38, 132);
  x.font = '500 28px "JetBrains Mono",monospace'; x.fillStyle = '#5C5C5A'; x.textAlign = 'right'; x.fillText(range || '', W - L.x, 132); x.textAlign = 'left';
  // 줄 사진
  const n = picks.length, bw = W - L.x * 2, bh = (L.bottom - L.top - L.gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const { p, fx = .5, fy = .5 } = picks[i], by = L.top + i * (bh + L.gap);
    x.save(); x.beginPath(); x.roundRect(L.x, by, bw, bh, 14); x.clip();
    try {
      const src = p.file || await (await fetch(p.url)).blob();
      const bmp = await createImageBitmap(src);
      const r = Math.max(bw / bmp.width, bh / bmp.height), dw = bmp.width * r, dh = bmp.height * r;
      x.drawImage(bmp, L.x + (bw - dw) * fx, by + (bh - dh) * fy, dw, dh); bmp.close();
    } catch (_) { x.fillStyle = '#2a2a28'; x.fillRect(L.x, by, bw, bh); }
    x.restore();
    if (p.date && p.date !== 'unknown') stamp7(x, p.date, L.x + bw - 28, by + bh - 26, 32);
  }
  // 아래: 큰 숫자 + 문구 + 각인 눈금
  const count = String(n).padStart(2, '0');
  x.fillStyle = '#141414'; x.font = '600 190px "Hanken Grotesk",sans-serif'; x.fillText(count, L.x - 8, 1836);
  const cw = x.measureText(count).width;
  x.font = `700 44px ${ko}`; x.fillText('장을 골랐어요', L.x + cw + 18, 1772);
  x.font = `500 30px ${ko}`; x.fillStyle = '#5C5C5A'; x.fillText(`${total}장 중에서${folder ? ' · ' + folder : ''}`.slice(0, 30), L.x + cw + 18, 1822);
  x.fillStyle = '#9C9B96'; for (let t = 0; t <= bw; t += 12) x.fillRect(L.x + t, 1868, 2, t % 60 ? 8 : 18);
  x.fillStyle = '#141414'; x.fillRect(L.x, 1884, bw, 4);
  const g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d'), gd = gx.createImageData(W, H);
  for (let i = 0; i < gd.data.length; i += 4) gd.data[i + 3] = Math.random() * 14; gx.putImageData(gd, 0, 0); x.drawImage(g, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
  return new File([blob], `PhotoPick-story-${Date.now().toString(36)}.jpg`, { type: 'image/jpeg' });
};
