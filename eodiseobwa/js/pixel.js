// 픽셀 스프라이트 → SVG
const BASE = { k: '#141414', W: '#FFFFFF', Y: '#FFE500', O: '#EF7C1C', G: '#2BAA4A', B: '#4FB6E8', R: '#E0283C', A: '#C9A227' };

export function sprite(rows, { scale = 4, palette = {}, label = '' } = {}) {
  const pal = { ...BASE, ...palette };
  const w = rows[0].length, h = rows.length;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const c = row[x];
      if (c === '.') { x++; continue; }
      let len = 1;
      while (x + len < w && row[x + len] === c) len++;
      rects += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${pal[c] || c}"/>`;
      x += len;
    }
  });
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg ${aria} width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
}

export const TRAIN = [
  '.......kk.......',
  '......k..k......',
  '.....kkkkkk.....',
  '.kkkkkkkkkkkkkk.',
  '.kGGGGGGGGGGGGk.',
  '.kGBBkGBBkGBBGk.',
  '.kGBBkGBBkGBBGk.',
  '.kGGGGGGGGGGGGk.',
  '.kOOOOOOOOOOOOk.',
  '.kYYYYYYYYYYYYk.',
  '.kGGGGGGGGGGGGk.',
  '.kkkkkkkkkkkkkk.',
  '...kk......kk...',
];

export const BUDDY = [
  '...kkkk...',
  '..kCCCCk..',
  '.kCCCCCCk.',
  '.kCkCCkCk.',
  '.kCCCCCCk.',
  '.kCCkkCCk.',
  '.kCCCCCCk.',
  '.kCCCCCCk.',
  '.kk.kk.kk.',
];

export const COIN = [
  '..kkkk..',
  '.kYYYYk.',
  'kYYWYYYk',
  'kYWYYYYk',
  'kYYYYYYk',
  'kYYYYOYk',
  '.kYYOOk.',
  '..kkkk..',
];

export const CHIP = [
  'kkkkkkkk',
  'kAAkkAAk',
  'kAAAAAAk',
  'kkAAAAkk',
  'kAAAAAAk',
  'kAAkkAAk',
  'kkkkkkkk',
];

export const SKULL = [
  '..kkkkkk..',
  '.kWWWWWWk.',
  'kWWWWWWWWk',
  'kWkkWWkkWk',
  'kWkkWWkkWk',
  'kWWWkkWWWk',
  '.kWWWWWWk.',
  '..kWkWkW..',
  '..kkkkkk..',
];

export const ENVELOPE = [
  'kkkkkkkkkkkk',
  'kWkWWWWWWkWk',
  'kWWkWWWWkWWk',
  'kWWWkWWkWWWk',
  'kWWWWkkWWWWk',
  'kWWWWWWWWWWk',
  'kWWWWWWWWWWk',
  'kkkkkkkkkkkk',
];

export const buddy = (color, scale = 4) => sprite(BUDDY, { scale, palette: { C: color } });
