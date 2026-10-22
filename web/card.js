const params = new URLSearchParams(location.search);
const slot = Number(params.get('id')) || 0;
const resource = params.get('res') || '';
const texture = document.getElementById('texture');
const front = document.getElementById('front');
const back = document.getElementById('back');
const SVG = 'http://www.w3.org/2000/svg';

const post = (name, body) =>
  fetch(`https://${resource}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  }).catch(() => {});

const seeded = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
};

const svgEl = (tag, attrs) => {
  const node = document.createElementNS(SVG, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
};

const image = (className, src) => {
  const img = el('img', className);
  img.src = src;
  return img;
};

const star = () => {
  const svg = svgEl('svg', { viewBox: '0 0 100 100' });
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 46 : 19;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
  }
  svg.appendChild(svgEl('polygon', { points: points.join(' '), fill: 'currentColor' }));
  return svg;
};

const pixels = (rand) => {
  const box = el('div', 'pixels');
  for (let y = 0; y < 256; y += 16) {
    for (let x = 560; x < 1024; x += 16) {
      const fade = Math.max(0, (x - 560) / 464) * Math.max(0, 1 - y / 256);
      if (rand() < fade * fade * 0.55) {
        const i = el('i');
        i.style.left = `${x}px`;
        i.style.top = `${y}px`;
        i.style.opacity = (0.08 + rand() * 0.35 * fade).toFixed(3);
        box.appendChild(i);
      }
    }
  }
  return box;
};

const fibers = (seed) => {
  const svg = svgEl('svg', { class: 'fibers', viewBox: '0 0 1024 646', preserveAspectRatio: 'none' });
  const defs = svgEl('defs', {});
  const filter = svgEl('filter', { id: `fibers-${seed}` });
  filter.appendChild(svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.06 0.5', numOctaves: 3, seed }));
  filter.appendChild(svgEl('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.42  0 0 0 0 0.27  0 0 0 0 0.12  0 0 0 0.9 0' }));
  defs.appendChild(filter);
  svg.appendChild(defs);
  svg.appendChild(svgEl('rect', { width: 1024, height: 646, filter: `url(#fibers-${seed})` }));
  return svg;
};

const field = (label, value, extra) => {
  const node = el('div', `field ${extra || ''}`);
  node.appendChild(el('label', '', label));
  node.appendChild(el('b', '', value || '-'));
  return node;
};

const photoBox = (photo) => {
  const box = el('div', 'photo');
  if (photo) box.appendChild(image('', photo));
  else box.appendChild(el('div', 'silhouette'));
  return box;
};

const mrzDate = (text) => {
  const m = String(text || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3].slice(2)}${m[1]}${m[2]}` : '000000';
};

const mrzText = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '<');

const mrz = (card) => {
  const pad = (text) => (text + '<'.repeat(36)).slice(0, 36);
  const first = pad(`I<SAN${mrzText(card.lastname)}<<${mrzText(card.firstname)}`);
  const second = pad(`${mrzText(card.number)}<${mrzDate(card.birthdate)}${card.sex === 'F' ? 'F' : 'M'}${mrzDate(card.expires)}USA`);
  return `${first}\n${second}`;
};

const pdf417 = (canvas, rand) => {
  const w = (canvas.width = 960);
  const h = (canvas.height = 150);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141414';
  const rows = 18;
  const rowH = h / rows;
  const module = 4;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    const y = r * rowH;
    let black = true;
    for (const width of [8, 1, 1, 1, 1, 1, 1, 3]) {
      if (black) ctx.fillRect(x, y, width * module, rowH);
      x += width * module;
      black = !black;
    }
    while (x < w - 18 * module) {
      const width = 1 + Math.floor(rand() * 4);
      if (black) ctx.fillRect(x, y, width * module, rowH);
      x += width * module;
      black = !black;
    }
    x = w - 18 * module;
    black = true;
    for (const width of [7, 1, 1, 3, 1, 1, 1, 2, 1]) {
      if (black) ctx.fillRect(x, y, width * module, rowH);
      x += width * module;
      black = !black;
    }
  }
};

const linear = (canvas, rand) => {
  const w = (canvas.width = 440);
  const h = (canvas.height = 58);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a2410';
  let x = 0;
  let black = true;
  while (x < w) {
    const width = 1 + Math.floor(rand() * 4);
    if (black) ctx.fillRect(x, 0, width * 1.5, h);
    x += width * 1.5;
    black = !black;
  }
};

const thisSideUp = () => {
  const svg = svgEl('svg', { viewBox: '0 0 54 54' });
  for (const x of [8, 32]) {
    svg.appendChild(svgEl('path', { d: `M ${x + 7} 4 L ${x + 14} 16 L ${x + 10} 16 L ${x + 10} 30 L ${x + 4} 30 L ${x + 4} 16 L ${x} 16 Z`, fill: 'currentColor' }));
  }
  svg.appendChild(svgEl('rect', { x: 4, y: 40, width: 46, height: 5, fill: 'currentColor' }));
  return svg;
};

const renderFront = (card, photo, rand) => {
  front.replaceChildren();
  front.appendChild(el('div', 'grid'));
  front.appendChild(pixels(rand));
  if (card.emblem) front.appendChild(image('watermark', card.emblem));

  const header = el('div', 'header');
  const brand = el('div', 'brand');
  const badge = el('div', 'badge');
  badge.appendChild(card.emblem ? image('', card.emblem) : star());
  brand.appendChild(badge);
  const state = el('div', 'state', card.state.toUpperCase());
  state.appendChild(el('small', '', `STATE OF ${card.state} // ${card.country || 'USA'}`.toUpperCase()));
  brand.appendChild(state);
  header.appendChild(brand);
  const title = el('div', 'title');
  title.appendChild(el('b', '', card.title));
  title.appendChild(el('span', '', card.subtitle || ''));
  header.appendChild(title);
  front.appendChild(header);
  front.appendChild(el('div', 'bar'));

  front.appendChild(photoBox(photo));
  for (const corner of ['tl', 'tr', 'bl', 'br']) front.appendChild(el('div', `corner ${corner}`));

  const number = el('div', 'number');
  number.appendChild(el('label', '', `${card.numberLabel || 'ID'} no.`));
  number.appendChild(el('b', '', card.number));
  front.appendChild(number);

  const fields = el('div', 'fields');
  fields.appendChild(field('Last name', card.lastname, 'wide'));
  fields.appendChild(field('First name', card.firstname, 'wide'));
  fields.appendChild(field('Date of birth', card.birthdate, 'accent'));
  fields.appendChild(field('Expires', card.expires));
  fields.appendChild(field('Sex', card.sex));
  fields.appendChild(field(card.class ? 'Class' : 'Nationality', card.class || card.nationality, card.class ? 'accent' : ''));
  front.appendChild(fields);

  const foil = el('div', 'foil');
  if (photo) foil.appendChild(image('ghost', photo));
  if (card.emblem) foil.appendChild(image('mark', card.emblem));
  front.appendChild(foil);

  const signature = el('div', 'signature', `${card.firstname || ''} ${card.lastname || ''}`.trim());
  front.appendChild(signature);
  const fit = Math.min(1, 236 / Math.max(1, signature.scrollWidth));
  signature.style.transform = `rotate(-4deg) scale(${fit.toFixed(3)})`;

  front.appendChild(el('div', 'mrz', mrz(card)));
  front.appendChild(el('div', 'holo'));
};

const renderBack = (card, rand) => {
  back.replaceChildren();
  back.appendChild(fibers(Math.floor(rand() * 1000)));
  back.appendChild(el('div', 'crease'));

  const label = el('div', 'label');
  const head = el('header');
  head.appendChild(el('span', '', `${card.state} ${card.agency}`));
  head.appendChild(el('span', '', `No. ${card.number}`));
  label.appendChild(head);
  const canvas = el('canvas');
  pdf417(canvas, rand);
  label.appendChild(canvas);
  back.appendChild(label);
  back.appendChild(el('div', 'tape left'));
  back.appendChild(el('div', 'tape right'));

  const print = el('div', 'print');
  print.appendChild(el('h3', '', `${card.state} ${card.agency}`));
  const grid = el('div', 'grid3');
  for (const item of card.details || []) grid.appendChild(field(item.label, item.value || 'NONE'));
  grid.appendChild(field('Nationality', card.nationality));
  print.appendChild(grid);
  print.appendChild(el('div', 'legal', card.legal || ''));
  back.appendChild(print);

  const stamp = el('div', 'stamp');
  stamp.appendChild(el('b', '', 'QBOX'));
  stamp.appendChild(el('span', '', 'VERIFIED'));
  back.appendChild(stamp);

  const barcode = el('div', 'barcode');
  const bar = el('canvas');
  linear(bar, rand);
  barcode.appendChild(bar);
  barcode.appendChild(el('span', '', card.number));
  back.appendChild(barcode);

  const dd = el('div', 'dd', 'DOCUMENT');
  dd.appendChild(el('b', '', card.dd || ''));
  back.appendChild(dd);

  const arrows = el('div', 'arrows');
  arrows.appendChild(el('span', '', 'THIS SIDE UP'));
  arrows.appendChild(thisSideUp());
  back.appendChild(arrows);

  back.appendChild(el('div', 'holo'));
};

const fitText = (root) => {
  for (const node of root.querySelectorAll('.field b, .number b, .title b')) {
    let size = parseFloat(getComputedStyle(node).fontSize);
    const parent = node.parentElement.classList;
    const limit = parent.contains('title') ? 440 : parent.contains('number') ? 500 : 0;
    const tooWide = () => (limit ? node.scrollWidth > limit : node.scrollWidth > node.clientWidth);
    while (tooWide() && size > 14) {
      size -= 1;
      node.style.fontSize = `${size}px`;
    }
  }
};

const whenImagesLoad = () =>
  Promise.all(
    [...document.images].map((img) =>
      img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.onload = img.onerror = resolve;
      }),
    ),
  );

const render = async (card, photo) => {
  texture.dataset.theme = card.theme || 'id';
  renderFront(card, photo, seeded(`${card.number}:front`));
  renderBack(card, seeded(`${card.number}:back`));
  await document.fonts.ready;
  fitText(front);
  fitText(back);
  await whenImagesLoad();
  requestAnimationFrame(() => requestAnimationFrame(() => post('cardRendered', { id: slot })));
};

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.action === 'card' && data.card) {
    render(data.card, typeof data.photo === 'string' ? data.photo : null);
  } else if (data.action === 'tilt') {
    texture.style.setProperty('--tx', Math.max(-1, Math.min(1, Number(data.x) || 0)).toFixed(3));
    texture.style.setProperty('--ty', Math.max(-1, Math.min(1, Number(data.y) || 0)).toFixed(3));
    texture.style.setProperty('--glare', Math.max(0, Math.min(1, Number(data.glare) || 0)).toFixed(3));
  }
});

post('cardReady', { id: slot });
