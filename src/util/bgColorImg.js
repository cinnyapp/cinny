// Getting a dominant color from an IMG source,
// and darkening it a bit afterwards for contrast
export default function bgColorImg(img) {
  const size = 32;
  const darken = 0.8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;

  const counts = new Uint16Array(4096);
  const totals = new Uint32Array(4096 * 3);

  for (let i = 0, len = px.length; i < len; i += 4) {
    if (px[i + 3] >= 16) {
      const rq = Math.trunc(px[i] / 16);
      const gq = Math.trunc(px[i + 1] / 16);
      const bq = Math.trunc(px[i + 2] / 16);
      const key = rq * 256 + gq * 16 + bq;
      const j = key * 3;
      counts[key] += 1;
      totals[j] += px[i];
      totals[j + 1] += px[i + 1];
      totals[j + 2] += px[i + 2];
    }
  }

  let bestScore = -1;
  let bestKey = 0;

  for (let key = 0; key < 4096; key += 1) {
    const count = counts[key];
    if (count > 0) {
      const j = key * 3;
      const avgR = totals[j] / count;
      const avgG = totals[j + 1] / count;
      const avgB = totals[j + 2] / count;

      const max = Math.max(avgR, avgG, avgB);
      const min = Math.min(avgR, avgG, avgB);
      const chromaNorm = (max - min) / 255;
      const luma = (avgR * 0.2126 + avgG * 0.7152 + avgB * 0.0722) / 255;
      const midW = Math.max(0.2, 1 - Math.abs(luma - 0.5) * 1.2);
      const score = count * (1 + chromaNorm * 2) * midW;

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
  }

  const rRaw = Math.trunc(bestKey / 256) * 16 + 8;
  const gRaw = (Math.trunc(bestKey / 16) % 16) * 16 + 8;
  const bRaw = (bestKey % 16) * 16 + 8;

  // Convert to HSL, scale lightness, convert back
  const rN = rRaw / 255;
  const gN = gRaw / 255;
  const bN = bRaw / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta > 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rN) {
      h = ((gN - bN) / delta) % 6;
    } else if (max === gN) {
      h = (bN - rN) / delta + 2;
    } else {
      h = (rN - gN) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  // Darken: reduce lightness by 20%,
  // keep hue & saturation intact
  const lDark = l * darken;

  const c = (1 - Math.abs(2 * lDark - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDark - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return `rgb(${r}, ${g}, ${b})`;
}
