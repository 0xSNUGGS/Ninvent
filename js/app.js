import { store } from './store.js';
import { PEOPLE } from './config.js';
import * as U from './util.js';
const { $, h, toast, setTheme, local } = U;

const app = $('#app');
let role = local.get('rol'); // 'creadora' (creator) | 'destinataria' (recipient)
let data = null;             // { cal, doors } exactly as stored in data/adviento.json
let leaveView = null;        // the editor saves pending changes before switching screens

async function route() {
  if (leaveView) { const l = leaveView; leaveView = null; await l(); }
  document.querySelectorAll('dialog').forEach((d) => d.remove());
  const [name] = location.hash.replace(/^#\/?/, '').split('/');
  setTheme('clasico');
  scrollTo(0, 0);
  try {
    if (!PEOPLE_ROLES.includes(role)) return viewGate();
    if (role === 'creadora' && store.needsToken()) return viewToken();
    render(h('p', { class: 'center muted', style: 'padding:60px' }, 'Loading…'));
    data = await store.load();
    if (role === 'destinataria' || name === 'ver') return viewVer();
    if (!data) return viewCrear();
    return viewEditar();
  } catch (e) {
    console.error(e);
    fatal(`Something went wrong: ${e.message}`);
  }
}
const PEOPLE_ROLES = Object.values(PEOPLE);
const goTo = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

// ---------- Shared pieces ----------
const simBar = () => (store.demo || U.simulatedDay())
  ? h('div', { class: 'topbar no-print' }, store.demo ? '🧪 Demo mode: everything is saved in this browser only.' : '', U.simulatedDay() ? ` Simulated day: ${U.fechaCorta(U.simulatedDay())}.` : '')
  : null;
const salir = () => { role = null; local.set('rol', null); goTo('#/'); };
function nav() {
  return h('nav', { class: 'wrap nav no-print' },
    h('a', { class: 'logo', href: '#/' }, 'Our ', h('b', {}, 'Advent')),
    h('button', { class: 'link-btn', onclick: salir }, 'Log out'));
}
function render(...kids) { app.replaceChildren(...kids.flat().filter(Boolean)); }
function fatal(msg) {
  render(simBar(), nav(), h('div', { class: 'narrow center', style: 'padding:60px 16px' },
    h('h2', {}, 'Oops…'), h('p', {}, msg), h('button', { class: 'btn', onclick: () => route() }, 'Try again')));
}
function modal(...kids) {
  const d = h('dialog', {}, h('button', { class: 'close no-print', 'aria-label': 'Close', onclick: () => d.close() }, '×'), ...kids);
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}
const doorNums = (cal) => Array.from({ length: U.doorCount(cal) }, (_, i) => i + 1);
const EMPTY = () => ({ text: '', media: [], link: '', vale: '', ready: false });
const filled = (d) => !!d && !!((d.text || '').trim() || d.media?.length || d.link || (d.vale || '').trim());
const siteUrl = () => location.origin + location.pathname;
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Repo file: if Pages hasn't published it yet, load it straight from GitHub.
function srcAttrs(path) {
  return { src: store.src(path), onerror: (e) => { const el = e.currentTarget; if (!el.dataset.fb) { el.dataset.fb = '1'; el.src = store.fallback(path); } } };
}
function mediaEl(m, cal) {
  if (m.type === 'photo') return h('img', { ...srcAttrs(m.path), alt: '', loading: 'lazy' });
  if (m.type === 'video') return h('video', { ...srcAttrs(m.path), controls: true, playsinline: true, preload: 'metadata' });
  return h('div', {}, h('div', { class: 'muted', style: 'font-size:.9rem;margin-bottom:4px' }, `🎙 A voice message from ${cal.from}`),
    h('audio', { ...srcAttrs(m.path), controls: true, preload: 'metadata', style: 'width:100%' }));
}

// ---------- Email gate ----------
function viewGate() {
  const inp = h('input', { type: 'email', required: true, placeholder: 'you@email.com', 'aria-label': 'Your email', autocomplete: 'email' });
  const btn = h('button', { class: 'btn block', style: 'margin-top:10px' }, 'Enter');
  const form = h('form', { class: 'narrow' },
    h('div', { style: 'font-size:3.2rem' }, '🎄'),
    h('h1', {}, 'Our Advent'),
    h('p', { class: 'muted' }, 'Type your email to come in.'),
    inp, btn);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const r = PEOPLE[await sha256(inp.value.trim().toLowerCase())];
    if (!r) return toast("That email isn't on the guest list 🙈");
    role = r;
    local.set('rol', r);
    route();
  };
  render(simBar(), h('div', { class: 'gift' }, form));
  inp.focus();
}

// ---------- GitHub token (creator only, once per device) ----------
function viewToken() {
  const inp = h('input', { type: 'password', required: true, placeholder: 'github_pat_…', 'aria-label': 'GitHub token', autocomplete: 'off' });
  const btn = h('button', { class: 'btn block', style: 'margin-top:10px' }, 'Connect');
  const form = h('form', {}, inp, btn);
  form.onsubmit = async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try { await store.setToken(inp.value.trim()); route(); }
    catch (err) { toast(err.message); btn.disabled = false; }
  };
  render(simBar(), nav(), h('div', { class: 'narrow', style: 'padding:24px 16px 60px' },
    h('h2', {}, 'Connect GitHub so you can save'),
    h('p', { class: 'muted' }, 'Your messages, photos, voice notes and videos are saved in this site\'s repository. This device needs a token to write there (you only do this once).'),
    h('ol', {},
      h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'create a GitHub token'), '.'),
      h('li', {}, 'Expiration: a date after Advent is over.'),
      h('li', {}, 'Repository access: “Only select repositories” → this site\'s repository.'),
      h('li', {}, 'Permissions → Repository → Contents: “Read and write”.'),
      h('li', {}, 'Generate the token, copy it and paste it here.')),
    form));
}

// ---------- Create ----------
function viewCrear() {
  const y = Number(U.today().slice(0, 4));
  const start = `${y}-12-01`;
  const s = { to: '', from: '', wrap: 'sobre', theme: 'clasico', end: `${y}-12-24` };
  const ENDS = [
    [`${y}-12-24`, 'December 24', 'Christmas Eve · the classic 24 doors ⭐'],
    [`${y}-12-25`, 'December 25', 'Christmas Day'],
    [`${y}-12-31`, 'December 31', 'New Year\'s Eve'],
    [`${y + 1}-01-06`, 'January 6', 'Three Kings\' Day'],
  ];
  const wrapper = h('div', { class: 'narrow wizard' });
  render(simBar(), nav(), wrapper);

  const choiceGroup = (key, options, cls = '') => {
    const el = h('div', { class: 'choices ' + cls });
    const draw = () => el.replaceChildren(...options.map(([value, ...content]) => {
      const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': String(s[key] === value) }, ...content);
      b.onclick = () => { s[key] = value; if (key === 'theme') setTheme(value); draw(); if (key === 'end') drawCount(); };
      return b;
    }));
    draw();
    return el;
  };
  const count = h('p', { class: 'muted' });
  const drawCount = () => (count.textContent = `${U.diasEntre(start, s.end) + 1} doors: from December 1 to ${U.fechaCorta(s.end)}.`);

  const steps = [
    () => {
      const f = h('form', {},
        h('div', { class: 'stepper' }, 'STEP 1 OF 3'), h('h1', {}, 'Who is it for?'),
        h('label', { class: 'field' }, h('span', {}, 'Their name'), h('input', { type: 'text', name: 'to', maxlength: 40, required: true, autocomplete: 'off', placeholder: 'Their name or what you call them' })),
        h('label', { class: 'field' }, h('span', {}, 'Your name (how you\'ll sign it)'), h('input', { type: 'text', name: 'from', maxlength: 40, required: true })),
        h('button', { class: 'btn block' }, 'Next'));
      f.to.value = s.to; f.from.value = s.from;
      f.onsubmit = (e) => {
        e.preventDefault();
        Object.assign(s, { to: f.to.value.trim(), from: f.from.value.trim() });
        if (!s.to || !s.from) return toast('Write both names');
        go(1);
      };
      return f;
    },
    () => h('div', {},
      h('div', { class: 'stepper' }, 'STEP 2 OF 3'), h('h1', {}, 'How will you wrap it?'),
      h('p', { class: 'muted' }, 'It\'s the first thing they\'ll see.'),
      choiceGroup('wrap', [['sobre', U.svg(U.WRAPS.sobre), 'Envelope'], ['caja', U.svg(U.WRAPS.caja), 'Gift box'], ['puerta', U.svg(U.WRAPS.puerta), 'Door']]),
      h('button', { class: 'btn block', onclick: () => go(2) }, 'Next'),
      h('p', { class: 'center' }, h('button', { class: 'link-btn', onclick: () => go(0) }, 'Back'))),
    () => {
      const custom = h('input', { type: 'date', min: `${y}-12-02`, max: `${y + 1}-02-28`, 'aria-label': 'Another end date' });
      custom.onchange = () => { if (custom.value >= custom.min && custom.value <= custom.max) { s.end = custom.value; drawCount(); endGroup.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-pressed', 'false')); } };
      const sw = (...c) => h('span', { class: 'swatch' }, c.map((x) => h('i', { style: `background:${x}` })));
      const endGroup = choiceGroup('end', ENDS.map(([v, a, b]) => [v, h('b', {}, a), h('span', { class: 'muted', style: 'font-size:.85rem' }, b)]), 'list');
      drawCount();
      const startBtn = h('button', { class: 'btn block' }, 'Start filling it in');
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        try {
          data = { cal: { to: s.to, from: s.from, wrap: s.wrap, theme: s.theme, start, end: s.end, sent: false }, doors: {} };
          await store.save(data);
          goTo('#/editar');
        } catch (e) { toast(e.message); startBtn.disabled = false; }
      };
      return h('div', {},
        h('div', { class: 'stepper' }, 'STEP 3 OF 3'), h('h1', {}, 'Look and length'),
        h('h3', { style: 'margin-top:10px' }, 'Look'),
        choiceGroup('theme', [['clasico', sw('#fbf6ee', '#b3122e', '#d9a63a'), 'Classic'], ['noche', sw('#0f1a2e', '#e3b04b', '#f5ecd9'), 'Night'], ['papel', sw('#1f6b45', '#b3122e', '#f3eee2'), 'Wrapping paper']], 'list'),
        h('h3', {}, 'Until which day?'),
        h('p', { class: 'muted', style: 'font-size:.92rem' }, 'It starts on December 1. The classic is 24 doors until Christmas Eve, but you can make it longer.'),
        endGroup,
        h('label', { class: 'field' }, h('span', { style: 'font-weight:400' }, 'Another date:'), custom),
        count,
        h('div', { class: 'hint' }, '⏳ You don\'t have to do it all now: share it once a few days are ready and keep adding the rest as December goes by.'),
        startBtn,
        h('p', { class: 'center' }, h('button', { class: 'link-btn', onclick: () => go(1) }, 'Back')));
    },
  ];
  const go = (i) => { wrapper.replaceChildren(steps[i]()); scrollTo(0, 0); };
  go(0);
}

// ---------- Editor ----------
function viewEditar() {
  const cal = data.cal, doors = data.doors;
  let cur = 1, uploads = 0, rec = null;
  setTheme(cal.theme);

  const door = (n) => doors[n] || (doors[n] = EMPTY());
  // A door is only frozen once it's marked ready and its day has come (the recipient may have seen it).
  const editable = (n) => !(doors[n]?.ready && U.isOpen(cal, n));
  const count = () => doorNums(cal).filter((n) => doors[n]?.ready).length;

  // Autosave: every save is a commit, so changes are batched for a few seconds.
  let dirty = false, timer, saving = Promise.resolve();
  const setStatus = (t) => { const el = $('#status'); if (el) el.textContent = t; };
  function changed() {
    dirty = true;
    setStatus('Saving…');
    clearTimeout(timer);
    timer = setTimeout(flush, 2500);
    drawTabs(); drawCount();
  }
  function flush() {
    clearTimeout(timer);
    saving = saving.then(async () => {
      if (!dirty) return;
      dirty = false;
      try {
        await store.save(data);
        setStatus('✓ Saved');
      } catch (e) {
        dirty = true;
        setStatus('⚠️ Not saved: retrying…');
        toast(e.message);
        timer = setTimeout(flush, 8000);
      }
    });
    return saving;
  }
  const onUnload = (e) => { if (dirty || uploads) { flush(); e.preventDefault(); } };
  const onHide = () => { if (document.hidden) flush(); };
  addEventListener('beforeunload', onUnload);
  document.addEventListener('visibilitychange', onHide);
  leaveView = () => { removeEventListener('beforeunload', onUnload); document.removeEventListener('visibilitychange', onHide); return flush(); };

  cur = doorNums(cal).find((n) => !doors[n]?.ready) || 1;

  function drawShell() {
    render(simBar(),
      h('header', { class: 'ed-head no-print' }, h('div', { class: 'wrap row' },
        h('div', {}, h('small', {}, 'Advent for'),
          h('h1', {}, cal.to, ' ', h('button', { class: 'link-btn', style: 'font-size:.8rem', onclick: openSettings }, 'Edit'))),
        h('div', { style: 'display:flex;gap:8px;align-items:center' },
          h('a', { class: 'btn ghost small', href: '#/ver', onclick: () => flush() }, 'Preview'),
          h('button', { class: 'btn small', onclick: openShare }, cal.sent ? 'Share' : 'Send it')))),
      h('main', { class: 'wrap no-print', style: 'padding-top:12px' },
        h('p', { class: 'muted', style: 'font-size:.9rem;margin:0;display:flex;justify-content:space-between' },
          h('span', {}, h('span', { id: 'count' }), ' · ', h('span', { id: 'status' }, '✓ Saved')),
          h('button', { class: 'link-btn', style: 'padding:0', onclick: salir }, 'Log out')),
        h('div', { class: 'hint' }, cal.sent
          ? `🎁 ${cal.to} can already see it: each day you mark as ready opens on its date. Keep adding the rest as the days go by.`
          : `⏳ ${cal.to} can't see it yet. You don't need to finish everything: mark a few days as ready, press “Send it”, and keep going as December goes by.`),
        h('nav', { class: 'tabs', id: 'tabs', 'aria-label': 'Doors' }),
        h('div', { class: 'card', id: 'door' }),
        h('div', { class: 'ed-foot' },
          h('button', { class: 'btn ghost', id: 'prev', onclick: () => go(cur - 1) }, 'Previous'),
          h('button', { class: 'btn', id: 'next', onclick: () => go(cur + 1) }, 'Next door'))));
    drawTabs(); drawCount(); drawDoor();
  }
  const drawCount = () => { const el = $('#count'); if (el) el.textContent = `${count()} of ${U.doorCount(cal)} days ready`; };
  function drawTabs() {
    const tabs = $('#tabs');
    if (!tabs) return;
    tabs.replaceChildren(...doorNums(cal).map((n) => {
      const date = U.doorDate(cal, n), d = doors[n];
      const state = d?.ready ? ' filled' : filled(d) ? ' draft' : '';
      return h('button', {
        class: `tab${state}${n === cur ? ' active' : ''}${editable(n) ? '' : ' past'}${n > 24 ? ' extra' : ''}${U.isNochebuena(date) ? ' star' : ''}`,
        'aria-current': n === cur ? 'true' : false, 'aria-label': `Door ${n}, ${U.fechaCorta(date)}${d?.ready ? ', ready' : filled(d) ? ', draft' : ''}`, title: U.fechaCorta(date), onclick: () => go(n),
      }, String(n));
    }));
    tabs.children[cur - 1]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function go(n) {
    if (n < 1 || n > U.doorCount(cal)) return;
    cur = n;
    drawTabs(); drawDoor();
  }

  function readyBox(n, d, canEdit) {
    if (!canEdit) return h('div', { class: 'lockmsg' }, `🔓 This door has already opened for ${cal.to}, so it can't be changed anymore.`);
    const setReady = (v) => { d.ready = v; changed(); flush(); drawDoor(); }; // saved right away
    if (d.ready) {
      return h('div', { class: 'ready-row ok' },
        h('span', {}, `✅ Ready: ${cal.to} will see it on ${U.fechaCorta(U.doorDate(cal, n))}.`),
        h('button', { class: 'link-btn', onclick: () => setReady(false) }, 'Back to draft'));
    }
    return h('div', { class: 'ready-row' },
      U.isOpen(cal, n) ? h('span', {}, `⏰ This day is here and ${cal.to} is waiting for it.`) : h('span', { class: 'muted' }, `Only you can see this door until you mark it ready.`),
      h('button', { class: 'btn small', onclick: () => (filled(d) ? setReady(true) : toast('Add something to this door first')) }, `✓ Day ${n} is ready`));
  }

  function drawDoor() {
    const n = cur, d = door(n), canEdit = editable(n), date = U.doorDate(cal, n), last = n === U.doorCount(cal);
    $('#prev').disabled = n === 1;
    $('#next').disabled = last;
    const ta = h('textarea', { 'aria-label': `Message for door ${n}`, maxlength: 5000, disabled: !canEdit, placeholder: `Write something for ${cal.to}…\n\nIdea: ${U.idea(n)}` });
    ta.value = d.text;
    ta.oninput = () => { d.text = ta.value; changed(); };

    const mediaList = h('div', { class: 'media-list' }, d.media.map((m, i) => h('div', { class: 'media-item' },
      mediaEl(m, cal),
      canEdit && h('button', { class: 'x', 'aria-label': 'Remove', onclick: () => { d.media.splice(i, 1); changed(); drawDoor(); } }, '×'))));

    const linkInput = h('input', { type: 'url', placeholder: 'https://open.spotify.com/…', disabled: !canEdit });
    linkInput.value = d.link;
    linkInput.onchange = () => {
      let v = linkInput.value.trim();
      if (v && !/^https?:\/\//i.test(v) && v.includes('.')) v = 'https://' + v;
      if (v && !/^https?:\/\/\S+$/i.test(v)) return toast('That link doesn\'t look right');
      linkInput.value = d.link = v;
      changed();
    };
    const valeInput = h('input', { type: 'text', maxlength: 300, placeholder: 'Breakfast in bed, a dinner date, a movie night…', disabled: !canEdit });
    valeInput.value = d.vale;
    valeInput.oninput = () => { d.vale = valeInput.value; changed(); };
    const linkBox = h('div', { class: 'extra' + (d.link ? '' : ' hidden') }, h('label', { class: 'field' }, h('span', {}, '🔗 Link (your song, a video, a booking…)'), linkInput));
    const valeBox = h('div', { class: 'extra' + (d.vale ? '' : ' hidden') }, h('label', { class: 'field' }, h('span', {}, '🎟 Voucher for…'), valeInput));
    const recBox = h('div', { class: 'recorder hidden' });

    const pick = (accept, type, multiple) => {
      const inp = h('input', { type: 'file', accept, multiple });
      inp.onchange = () => upload([...inp.files], type, n);
      inp.click();
    };
    const tool = (icon, label, fn) => h('button', { class: 'tool', type: 'button', onclick: fn }, h('span', { 'aria-hidden': 'true' }, icon), label);
    const special = U.isNochebuena(date) ? '⭐ Christmas Eve' : last ? '🎉 The last door: the grand finale' : '';

    $('#door').replaceChildren(...[
      h('div', { class: 'door-title' }, h('div', { class: 'num' }, String(n)),
        h('div', {}, h('div', { class: 'stepper' }, `DOOR ${n}${special ? ' · ' + special : ''}`), h('div', { class: 'muted' }, `Opens on ${U.fechaLarga(date)}`))),
      ta,
      canEdit && !d.text ? h('button', { class: 'link-btn', style: 'padding-left:0', onclick: () => { ta.value = d.text = U.idea(n); changed(); drawDoor(); } }, 'Use this idea') : null,
      mediaList,
      uploads ? h('p', { class: 'uploading' }, `Uploading ${uploads} file(s)…`) : null,
      canEdit ? h('div', { class: 'tools' },
        tool('📷', 'Photo', () => pick('image/*', 'photo', true)),
        tool('🎙', 'Voice', () => { recBox.classList.toggle('hidden'); drawRecorder(recBox, n); }),
        tool('🎬', 'Video', () => pick('video/*', 'video', false)),
        tool('🔗', 'Link', () => { linkBox.classList.remove('hidden'); linkInput.focus(); }),
        tool('🎟', 'Voucher', () => { valeBox.classList.remove('hidden'); valeInput.focus(); })) : null,
      recBox, linkBox, valeBox,
      readyBox(n, d, canEdit),
    ].filter(Boolean));
  }

  // Uploads: phone photos are shrunk to ~1600px before uploading.
  async function shrinkPhoto(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size < 1.5e6) return file;
      const c = h('canvas', { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.86));
    } catch { return file; }
  }
  async function upload(files, type, n) {
    for (const f of files) {
      uploads++; if (cur === n) drawDoor();
      try {
        const blob = type === 'photo' ? await shrinkPhoto(f) : f;
        const path = await store.upload(blob);
        door(n).media.push({ type, path });
        changed();
      } catch (e) { toast(e.message || 'Couldn\'t upload it'); }
      uploads--; if (cur === n) drawDoor();
    }
  }

  // Voice recorder
  function drawRecorder(box, n) {
    const file = h('button', { class: 'btn ghost small', onclick: () => { const i = h('input', { type: 'file', accept: 'audio/*' }); i.onchange = () => upload([...i.files], 'voice', n); i.click(); } }, 'Upload an audio file');
    if (rec && rec.state === 'recording') {
      box.replaceChildren(h('span', { class: 'rec-dot' }), h('span', {}, 'Recording…'), h('button', { class: 'btn small', onclick: () => rec.stop() }, '■ Stop and save'));
      return;
    }
    box.replaceChildren(h('button', { class: 'btn small', onclick: () => startRec(box, n) }, '● Record a voice note'), file);
  }
  async function startRec(box, n) {
    if (!window.MediaRecorder) return toast('Your browser can\'t record. Upload an audio file instead.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm').split(';')[0] });
        rec = null;
        upload([blob], 'voice', n);
      };
      rec.start();
      drawRecorder(box, n);
    } catch { toast('Couldn\'t use the microphone. You can upload an audio file.'); }
  }

  // Settings
  function openSettings() {
    const y = Number(cal.start.slice(0, 4));
    const f = h('form', {},
      h('h3', {}, 'Advent settings'),
      h('label', { class: 'field' }, h('span', {}, 'Their name'), h('input', { type: 'text', name: 'to', maxlength: 40, required: true })),
      h('label', { class: 'field' }, h('span', {}, 'Your name (signature)'), h('input', { type: 'text', name: 'from', maxlength: 40, required: true })),
      h('label', { class: 'field' }, h('span', {}, 'Last day'), h('input', { type: 'date', name: 'end', min: `${y}-12-02`, max: `${y + 1}-02-28`, required: true }),
        h('small', { class: 'muted', style: 'font-weight:400' }, 'The classic: December 24. If you shorten it, the doors left out are hidden (not deleted).')),
      h('label', { class: 'field' }, h('span', {}, 'Wrapping'), h('select', { name: 'wrap' }, h('option', { value: 'sobre' }, 'Envelope'), h('option', { value: 'caja' }, 'Gift box'), h('option', { value: 'puerta' }, 'Door'))),
      h('label', { class: 'field' }, h('span', {}, 'Look'), h('select', { name: 'theme' }, h('option', { value: 'clasico' }, 'Classic'), h('option', { value: 'noche' }, 'Night'), h('option', { value: 'papel' }, 'Wrapping paper'))),
      h('button', { class: 'btn block' }, 'Save'));
    for (const k of ['to', 'from', 'end', 'wrap', 'theme']) f[k].value = cal[k] || '';
    const d = modal(f);
    f.onsubmit = (e) => {
      e.preventDefault();
      const patch = Object.fromEntries(['to', 'from', 'end', 'wrap', 'theme'].map((k) => [k, f[k].value.trim()]));
      if (!patch.to || !patch.from) return toast('Both names are needed');
      if (patch.end < f.end.min || patch.end > f.end.max) return toast('Pick a last day between December 2 and the end of February');
      Object.assign(cal, patch);
      cur = Math.min(cur, U.doorCount(cal));
      setTheme(cal.theme);
      d.close();
      drawShell();
      changed();
    };
  }

  // Send / share
  function openShare() {
    const body = h('div');
    const d = modal(body);
    const draw = () => {
      if (!cal.sent) {
        const n = count();
        return body.replaceChildren(
          h('h3', {}, `Send it to ${cal.to}?`),
          h('p', { class: 'muted' }, `${n} of ${U.doorCount(cal)} days are ready.${n < U.doorCount(cal) ? ' That\'s fine: they\'ll only see the ready days, each on its date, and you can keep adding the rest later.' : ' All done!'}`),
          h('p', { class: 'muted' }, 'From now on, when they come in with their email, they\'ll see the advent.'),
          h('button', { class: 'btn block', onclick: async () => { cal.sent = true; dirty = true; await flush(); drawShell(); draw(); } }, 'Yes, let them see it'));
      }
      const link = siteUrl();
      const msg = `🎁 ${cal.to}, I've made you a surprise for every day of December. Come in here with your email: ${link}`;
      const inp = h('input', { type: 'text', readonly: true, value: link });
      body.replaceChildren(
        h('h3', {}, '🎉 Ready to give!'),
        h('p', { class: 'muted' }, 'Send them the link. They\'ll need to type their email to come in.'),
        h('div', { class: 'share' },
          h('div', { class: 'copy-row' }, inp, h('button', { class: 'btn small', onclick: async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { inp.select(); } } }, 'Copy')),
          h('a', { class: 'btn block', style: 'background:#1f9d55;color:#fff', href: 'https://wa.me/?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' }, 'Send on WhatsApp'),
          navigator.share ? h('button', { class: 'btn ghost block', onclick: () => navigator.share({ title: 'Your advent', text: msg }).catch(() => {}) }, 'Share another way') : null,
          h('button', { class: 'btn ghost block', onclick: () => { d.close(); openCard(); } }, '🖨 Card with a QR code to hand over'),
          h('button', { class: 'link-btn', onclick: async () => { cal.sent = false; dirty = true; await flush(); drawShell(); draw(); } }, 'Hide it from them again')));
    };
    draw();
  }
  function openCard() {
    const qr = h('div', { id: 'qr' });
    const d = modal(
      h('div', { class: 'qr-card' },
        h('div', { style: 'font-size:2rem' }, '🎁'),
        h('h2', {}, `For ${cal.to}`),
        h('p', {}, `You have ${U.doorCount(cal)} surprises waiting for you.`, h('br'), 'Scan the code and come in with your email.'),
        qr,
        h('p', { class: 'serif' }, `With love, ${cal.from}`)),
      h('button', { class: 'btn block no-print', style: 'margin-top:14px', onclick: () => print() }, 'Print card'));
    d.classList.add('print-me');
    app.classList.add('no-print');
    d.addEventListener('close', () => app.classList.remove('no-print'));
    loadQr().then(() => new QRCode(qr, { text: siteUrl(), width: 200, height: 200 })).catch(() => (qr.textContent = siteUrl()));
  }

  drawShell();
}

let qrLib;
const loadQr = () => (qrLib ||= new Promise((res, rej) => document.head.append(h('script', { src: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', onload: res, onerror: rej }))));

// ---------- View (recipient, or the creator's preview) ----------
function viewVer() {
  const preview = role === 'creadora';
  if (!data || (!preview && !data.cal.sent)) {
    return render(simBar(), h('div', { class: 'gift' }, h('div', { class: 'narrow' },
      h('div', { style: 'font-size:3rem' }, '🤫'),
      h('h2', {}, 'Your advent is still being prepared'),
      h('p', { class: 'muted' }, 'Someone is wrapping something for you. Come back soon.'),
      h('button', { class: 'link-btn', onclick: salir }, 'Log out'))));
  }
  const { cal, doors } = data;
  const N = U.doorCount(cal);
  const ready = (n) => !!doors[n]?.ready;
  const opened = (n) => preview || (U.isOpen(cal, n) && ready(n));
  const pending = (n) => !preview && U.isOpen(cal, n) && !ready(n); // its day came but it isn't ready yet
  const seenKey = `vistas-${role}`;
  const seen = new Set(local.get(seenKey) || []);
  setTheme(cal.theme);
  const back = preview ? h('p', { class: 'no-print' }, h('a', { href: '#/editar' }, '← Back to editing'), h('span', { class: 'muted' }, ' · preview: you see every door open')) : null;

  // Shuffled but stable order, like a cardboard calendar.
  const order = doorNums(cal);
  let seed = [...cal.start + cal.to].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = order.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }

  function headline() {
    const t = U.today();
    if (t < cal.start) { const k = U.diasEntre(t, cal.start); return k === 1 ? 'The first door opens tomorrow ✨' : `The first door opens in ${k} days ✨`; }
    if (t <= cal.end) {
      const n = U.diasEntre(cal.start, t) + 1;
      if (!ready(n)) return `Today's door (${n}) is still being wrapped 🎀 Check back later.`;
      if (U.isNochebuena(t)) return `Merry Christmas Eve! Open door ${n} 🎄`;
      return t === cal.end ? 'Last day: open the final door 🎉' : `Today it's door ${n} 🎁`;
    }
    return 'All your doors, forever 💛';
  }

  function drawWrap() {
    const box = h('div', { class: 'gift' }, h('div', {}, back,
      h('p', { class: 'muted' }, 'Someone has made something for you'),
      U.svg(U.WRAPS[cal.wrap] || U.WRAPS.sobre),
      h('h1', { style: 'margin-top:.4em' }, `For ${cal.to}`),
      h('p', { class: 'serif', style: 'font-size:1.2rem' }, `From ${cal.from}`),
      h('button', { class: 'btn', onclick: () => { box.classList.add('opening'); setTimeout(() => { local.set(`abierto-${role}`, true); drawCalendar(); }, 650); } }, 'Open my gift')));
    render(simBar(), box);
  }

  function drawCalendar() {
    const t = U.today();
    const grid = h('div', { class: 'grid24' }, order.map((n) => {
      const date = U.doorDate(cal, n);
      const cls = pending(n) ? ' pending' : !opened(n) ? ' locked' : seen.has(n) ? ' seen' : date === t ? ' today' : '';
      return h('button', { class: `door${cls}${n > 24 ? ' extra' : ''}${U.isNochebuena(date) ? ' star' : ''}`, 'aria-label': `Door ${n}${pending(n) ? ', still being wrapped' : opened(n) ? '' : ', locked'}`, onclick: () => openDoor(n) }, String(n));
    }));
    render(simBar(), h('div', { class: 'wrap no-print' },
      h('header', { class: 'cal-head' }, back, h('h1', {}, `For ${cal.to}`), h('p', { class: 'muted' }, preview ? 'Preview: this is how they\'ll see it' : headline()),
        h('p', { class: 'muted', style: 'font-size:.85rem' }, `${N} doors · from ${U.fechaCorta(cal.start)} to ${U.fechaCorta(cal.end)}`)),
      grid,
      opened(N) ? h('p', { class: 'center', style: 'margin:26px 0' }, h('button', { class: 'btn ghost', onclick: drawMemory }, '📖 See your keepsake and save it as a PDF')) : null,
      h('p', { class: 'center muted', style: 'margin:30px 0;font-size:.9rem' }, `With love, ${cal.from}`),
      preview ? null : h('p', { class: 'center' }, h('button', { class: 'link-btn', onclick: salir }, 'Log out'))));
  }

  function content(d) {
    if (!d) return [];
    return [
      (d.text || '').trim() ? h('div', { class: 'letter' }, d.text) : null,
      (d.media || []).map((m) => mediaEl(m, cal)),
      (d.vale || '').trim() ? h('div', { class: 'vale' }, h('b', {}, 'VOUCHER FOR'), h('span', {}, d.vale)) : null,
      d.link ? h('a', { class: 'btn block', href: d.link, target: '_blank', rel: 'noopener noreferrer' }, /spotify|youtu|music\.apple|soundcloud/i.test(d.link) ? '🎵 Listen' : '🔗 Open link') : null,
    ].flat().filter(Boolean);
  }
  const photosOf = () => doorNums(cal).filter(opened).flatMap((k) => (doors[k]?.media || []).filter((m) => m.type === 'photo'));

  function openDoor(n) {
    const date = U.doorDate(cal, n);
    if (pending(n)) return toast(`Door ${n} is still being wrapped 🎀 Check back soon!`);
    if (!opened(n)) {
      const k = Math.max(1, U.diasEntre(U.today(), date));
      return toast(`Door ${n} opens ${k === 1 ? 'tomorrow' : `in ${k} days`}. No peeking! 😉`);
    }
    seen.add(n); local.set(seenKey, [...seen]);
    let c = content(doors[n]);
    if (!c.length) c = [h('p', { class: 'muted center' }, 'This door is empty… for now! 🤫')];
    const extra = [];
    if (n === N && photosOf().length) {
      extra.push(h('h3', { style: 'margin-top:10px' }, 'All our moments'), h('div', { class: 'gallery' }, photosOf().map((m) => h('img', { ...srcAttrs(m.path), alt: '', loading: 'lazy' }))));
    }
    if (n === N || U.isNochebuena(date)) U.confetti();
    const title = U.isNochebuena(date) ? ' · ⭐ Merry Christmas Eve!' : n === N ? ' · 🎉 The grand finale' : '';
    const d = modal(h('div', { class: 'stepper' }, `DOOR ${n} · ${U.fechaLarga(date)}${title}`), h('div', { class: 'door-content', style: 'margin-top:12px' }, c, extra));
    d.addEventListener('close', () => { d.querySelectorAll('video,audio').forEach((m) => m.pause()); drawCalendar(); });
  }

  function drawMemory() {
    render(h('div', { class: 'narrow memory' },
      h('p', { class: 'no-print', style: 'padding-top:16px;display:flex;justify-content:space-between' },
        h('button', { class: 'link-btn', onclick: drawCalendar }, '← Back'),
        h('button', { class: 'btn small', onclick: () => print() }, 'Save as PDF')),
      h('header', { class: 'center', style: 'padding:20px 0' }, h('div', { style: 'font-size:2.4rem' }, '🎄'), h('h1', {}, `${cal.to}'s Advent`),
        h('p', { class: 'muted' }, `${N} days of gifts from ${cal.from} · from ${U.fechaCorta(cal.start)} to ${U.fechaCorta(cal.end)}`)),
      doorNums(cal).filter(opened).map((n) => {
        const d = doors[n] || EMPTY(), media = d.media || [];
        // Paper has no video or audio: just note what was there.
        const notes = [media.some((m) => m.type === 'voice') && '🎙 voice note', media.some((m) => m.type === 'video') && '🎬 video', d.link && '🔗 ' + d.link].filter(Boolean);
        return h('div', { class: 'entry' },
          h('div', { class: 'stepper' }, U.fechaCorta(U.doorDate(cal, n)).toUpperCase()),
          (d.text || '').trim() ? h('div', { class: 'serif', style: 'white-space:pre-wrap;font-size:1.05rem' }, d.text) : null,
          media.filter((m) => m.type === 'photo').map((m) => h('img', { ...srcAttrs(m.path), alt: '' })),
          (d.vale || '').trim() ? h('p', {}, h('b', {}, 'Voucher for: '), d.vale) : null,
          notes.length ? h('p', { class: 'muted', style: 'font-size:.9rem' }, notes.join(' · ')) : null);
      })));
    scrollTo(0, 0);
  }

  if (preview || !local.get(`abierto-${role}`)) drawWrap(); else drawCalendar();
}

addEventListener('hashchange', route);
route();
