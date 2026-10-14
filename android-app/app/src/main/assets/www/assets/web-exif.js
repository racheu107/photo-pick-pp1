/* JPEG APP1/Exif에서 촬영 시각(DateTimeOriginal)과 내장 썸네일(IFD1) 위치를 읽는다.
   파일 날짜로 대신하지 않는다. 앞부분 128KB만 읽는다(APP1은 최대 64KB). */
window.PhotoPickExif = async file => {
  const result = { jpeg: false, captureDate: '', capturedAt: '', thumb: null, orientation: 1 };
  try {
    const view = new DataView(await file.slice(0, 131072).arrayBuffer());
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return result;
    result.jpeg = true;
    for (let offset = 2; offset + 4 <= view.byteLength;) {
      if (view.getUint8(offset) !== 0xff) break;
      while (offset < view.byteLength && view.getUint8(offset) === 0xff) offset++;
      const marker = view.getUint8(offset++);
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = view.getUint16(offset), start = offset + 2, end = offset + size;
      if (size < 2 || end > view.byteLength) break;
      if (marker === 0xe1 && size >= 16 && view.getUint32(start) === 0x45786966 && view.getUint16(start + 4) === 0) {
        const tiff = start + 6, little = view.getUint16(tiff) === 0x4949;
        if (!little && view.getUint16(tiff) !== 0x4d4d) return result;
        const valid = (pos, n) => pos >= tiff && pos + n <= end;
        const u16 = pos => { if (!valid(pos, 2)) throw Error(); return view.getUint16(pos, little); };
        const u32 = pos => { if (!valid(pos, 4)) throw Error(); return view.getUint32(pos, little); };
        if (u16(tiff + 2) !== 42) return result;
        const entries = address => {
          const n = u16(address); if (n > 1024 || !valid(address + 2, n * 12)) throw Error();
          return Array.from({ length: n }, (_, i) => address + 2 + i * 12);
        };
        const value = pos => u16(pos + 2) === 3 ? u16(pos + 8) : u32(pos + 8);
        const ifd0 = tiff + u32(tiff + 4), ifd0Entries = entries(ifd0);
        const orient = ifd0Entries.find(pos => u16(pos) === 0x0112);
        if (orient) result.orientation = u16(orient + 8) || 1;
        // 촬영 시각
        try {
          const pointer = ifd0Entries.find(pos => u16(pos) === 0x8769 && u16(pos + 2) === 4 && u32(pos + 4) === 1);
          const original = pointer && entries(tiff + u32(pointer + 8)).find(pos => u16(pos) === 0x9003 && u16(pos + 2) === 2);
          if (original) {
            const count = u32(original + 4), address = count <= 4 ? original + 8 : tiff + u32(original + 8);
            if (count >= 19 && count <= 64 && valid(address, count)) {
              const text = String.fromCharCode(...new Uint8Array(view.buffer, address, count)).replace(/\0.*$/, '');
              const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
              if (match) {
                const [y, m, d, h, min, sec] = match.slice(1).map(Number), date = new Date(0);
                date.setUTCFullYear(y, m - 1, d); date.setUTCHours(h, min, sec, 0);
                if (!(m < 1 || m > 12 || d < 1 || h > 23 || min > 59 || sec > 59 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)) {
                  result.captureDate = `${match[1]}-${match[2]}-${match[3]}`; result.capturedAt = text;
                }
              }
            }
          }
        } catch (_) {}
        // 내장 썸네일 (IFD1: 0x0201 위치, 0x0202 길이)
        try {
          const next = u32(ifd0 + 2 + ifd0Entries.length * 12);
          if (next) {
            const ifd1 = entries(tiff + next);
            const off = ifd1.find(pos => u16(pos) === 0x0201), len = ifd1.find(pos => u16(pos) === 0x0202);
            if (off && len) {
              const o = tiff + value(off), l = value(len);
              if (l > 200 && l < 65536 && o > tiff && o + l <= view.byteLength && view.getUint16(o) === 0xffd8) result.thumb = file.slice(o, o + l, 'image/jpeg');
            }
          }
        } catch (_) {}
        return result;
      }
      offset = end;
    }
    return result;
  } catch (_) { result.jpeg = /\.jpe?g$/i.test(file.name); return result; }
};
