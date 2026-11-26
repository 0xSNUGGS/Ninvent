// Utilidades compartidas.
export const $ = (s, el = document) => el.querySelector(s);

// Crea elementos sin innerHTML: el contenido de los usuarios siempre va como texto.
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  return e;
}
export const svg = (s) => { const d = h('div', { class: 'wrapimg' }); d.innerHTML = s; return d; }; // solo SVG propios

export function setTheme(t) { document.documentElement.dataset.theme = t || 'clasico'; }

export function toast(msg) {
  let t = $('#toast');
  if (!t) document.body.append(t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }));
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2800);
}

export const local = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked: that’s fine */ } },
};

// ---------- Fechas (siempre 'AAAA-MM-DD' en la hora local) ----------
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const diasEntre = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 864e5);
const ymd = (s) => { const [y, m, d] = s.split('-').map(Number); return [y, m - 1, d]; };

// En modo demo se puede simular el día con ?hoy=AAAA-MM-DD (se recuerda en este navegador).
const hoyParam = new URLSearchParams(location.search).get('hoy');
if (hoyParam !== null) local.set('demo-hoy', /^\d{4}-\d{2}-\d{2}$/.test(hoyParam) ? hoyParam : null);
export const simulatedDay = () => local.get('demo-hoy');
export const today = () => simulatedDay() || iso(new Date());
export const now = () => (simulatedDay() ? parseIso(simulatedDay()).getTime() + 12 * 36e5 : Date.now());

export const doorCount = (cal) => diasEntre(cal.start, cal.end) + 1;
export const doorDate = (cal, n) => addDays(cal.start, n - 1);
export const openAt = (cal, n) => parseIso(doorDate(cal, n)); // a las 00:00 de su día
export const isOpen = (cal, n) => now() >= openAt(cal, n).getTime();

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fechaCorta = (s) => { const d = parseIso(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fechaLarga = (s) => `${DAYS[parseIso(s).getDay()]}, ${fechaCorta(s)}`;
export const isNochebuena = (s) => s.endsWith('-12-24');

// Dibujos del envoltorio (lo primero que ve quien lo recibe).
export const WRAPS = {
  sobre: `<svg viewBox="0 0 160 120" aria-hidden="true"><rect x="8" y="20" width="144" height="92" rx="8" fill="#efe1c6" stroke="#c9b089" stroke-width="2"/><path d="M8 28 L80 74 L152 28" fill="none" stroke="#c9b089" stroke-width="2"/><circle cx="80" cy="72" r="13" fill="var(--accent)"/><path d="M74 72 h12 M80 66 v12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  caja: `<svg viewBox="0 0 160 120" aria-hidden="true"><rect x="22" y="48" width="116" height="66" rx="4" fill="var(--accent)"/><rect x="16" y="34" width="128" height="20" rx="4" fill="var(--accent)" filter="brightness(.9)"/><rect x="72" y="34" width="16" height="80" fill="#e8c15a"/><path d="M80 34 C60 10 46 22 58 32 Z M80 34 C100 10 114 22 102 32 Z" fill="#e8c15a"/></svg>`,
  puerta: `<svg viewBox="0 0 160 120" aria-hidden="true"><path d="M44 116 V46 a36 36 0 0 1 72 0 V116 Z" fill="var(--accent)" stroke="#e8c15a" stroke-width="3"/><line x1="80" y1="14" x2="80" y2="116" stroke="#e8c15a" stroke-width="2"/><circle cx="80" cy="50" r="13" fill="none" stroke="#2f7a4b" stroke-width="5" stroke-dasharray="3 2"/><circle cx="73" cy="84" r="2.5" fill="#e8c15a"/><circle cx="87" cy="84" r="2.5" fill="#e8c15a"/></svg>`,
};

// Una idea por puerta para quien se queda en blanco (se repiten si hay más de 24).
export const IDEAS = [
  'The first thing I thought the day I met you was…', 'A photo of us that always makes me laugh', 'The song that reminds me of you',
  'Three things you do that I love', 'A voucher for breakfast in bed', 'The best trip we’ve taken together',
  'Something I’ve never told you', 'A voice note of me singing to you (yes, even if I’m terrible)', 'A plan I want to do with you this year',
  'The oldest photo I have with you', 'A voucher for a phone-free afternoon', 'What I admire most about you',
  'A memory from when we were little', 'A video saying good morning to you', 'Why you’re my favorite person',
  'The food that always reminds me of you', 'A voucher to pick the movie (no complaints)', 'Our inside joke',
  'The day I laughed the most with you', 'A letter to read with a coffee', 'A voucher for a massage',
  'What I wish for you next year', 'All of this year’s photos in one', 'Merry Christmas Eve: what you mean to me',
];
export const idea = (n) => IDEAS[(n - 1) % IDEAS.length];

// Confeti sin librerías
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let c = $('#confetti');
  if (!c) document.body.append(c = h('canvas', { id: 'confetti', class: 'no-print' }));
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const colors = ['#b3122e', '#d9a63a', '#2f7a4b', '#ffffff', '#e3b04b'];
  const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, r: Math.random() * 6, s: 4 + Math.random() * 5, col: colors[Math.floor(Math.random() * colors.length)] }));
  const end = performance.now() + 4500;
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (t < end) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
  })(performance.now());
}
