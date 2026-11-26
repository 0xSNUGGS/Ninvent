// Capa de datos: todo vive en el repositorio de GitHub (sin base de datos).
//   data/adviento.json  -> { cal, doors }
//   media/<id>.<ext>    -> fotos, audios y vídeos
// Leer no necesita nada (repo público). Escribir necesita el token de GitHub de quien lo crea.
import { GITHUB } from './config.js';
import { local } from './util.js';

const MAX_UPLOAD = 25 * 1024 * 1024; // GitHub avisa a partir de 50 MB y la subida va en base64
const EXT = { 'image/jpeg': 'jpg', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/x-m4a': 'm4a', 'audio/mp4': 'm4a' };
const extOf = (type) => EXT[type] || (type.split('/')[1] || 'bin').split(';')[0];
const dataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
function checkSize(blob) { if (blob.size > MAX_UPLOAD) throw new Error('That file is over 25 MB. Try a shorter video.'); }

function githubStore({ owner, repo, branch }) {
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  const FILE = 'data/adviento.json';
  const token = () => local.get('gh-token');
  let sha;
  let queue = Promise.resolve(); // un commit detrás de otro: en paralelo GitHub los rechaza
  const serial = (fn) => (queue = queue.then(fn, fn));

  async function req(path, opts = {}) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    if (opts.body) headers['Content-Type'] = 'application/json';
    let r;
    try { r = await fetch(api + path, { cache: 'no-store', ...opts, headers }); }
    catch { throw new Error('Can’t reach GitHub. Check your internet connection.'); }
    if (r.status === 404 && !opts.method) return null;
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const msg = r.status === 401 ? 'The GitHub token is invalid or has expired' : `GitHub: ${j.message || r.status}`;
      if (r.status === 401) local.set('gh-token', null);
      throw Object.assign(new Error(msg), { status: r.status });
    }
    return r.json();
  }
  const getFile = () => req(`/contents/${FILE}?ref=${encodeURIComponent(branch)}`);
  const put = (path, content, message, fileSha) => req(`/contents/${path}`, {
    method: 'PUT', body: JSON.stringify({ message, content, branch, ...(fileSha ? { sha: fileSha } : {}) }),
  });

  return {
    demo: false,
    needsToken: () => !token(),
    async setToken(t) {
      const r = await fetch(api, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${t}` } }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) throw new Error('That token doesn’t give access to the repository');
      if (j.permissions && !j.permissions.push) throw new Error('That token can’t write to the repository');
      local.set('gh-token', t);
    },
    async load() {
      const j = await getFile();
      sha = j?.sha;
      return j ? JSON.parse(fromB64(j.content)) : null;
    },
    save: (data) => serial(async () => {
      const content = (await dataUrl(new Blob([JSON.stringify(data, null, 1)]))).split(',')[1];
      try {
        sha = (await put(FILE, content, 'Update advent', sha)).content.sha;
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        // Se guardó desde otro dispositivo: gana lo último que se guarda.
        sha = (await getFile())?.sha;
        sha = (await put(FILE, content, 'Update advent', sha)).content.sha;
      }
    }),
    async upload(blob) {
      checkSize(blob);
      const content = (await dataUrl(blob)).split(',')[1];
      const path = `media/${crypto.randomUUID()}.${extOf(blob.type)}`;
      await serial(() => put(path, content, 'Upload file'));
      return path;
    },
    src: (path) => path, // lo sirve GitHub Pages con su tipo correcto
    // Recién subido, Pages tarda un par de minutos en publicarlo: mientras, se lee directo del repo.
    fallback: (path) => `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
  };
}

function demoStore() {
  return {
    demo: true,
    needsToken: () => false,
    load: async () => local.get('demo-adviento'),
    async save(data) {
      try { localStorage.setItem('demo-adviento', JSON.stringify(data)); }
      catch { throw new Error('Demo mode can’t fit that much in the browser. On GitHub there’s no such limit.'); }
    },
    async upload(blob) { checkSize(blob); return dataUrl(blob); },
    src: (p) => p,
    fallback: (p) => p,
  };
}

export const store = GITHUB.owner ? githubStore(GITHUB) : demoStore();
