export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icons = () => window.lucide && lucide.createIcons();
export const ic = n => `<i data-lucide="${n}"></i>`;

export const money = n => (Math.round(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
export const moneyShort = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' млн ₸' : n >= 1e4 ? Math.round(n / 1e3) + ' тыс ₸' : money(n);

const pad = n => String(n).padStart(2, '0');
export const hm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const dm = ts => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`; };
export const dmy = ts => `${dm(ts)}.${new Date(ts).getFullYear()}`;
export function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60e3);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}
export function elapsed(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1e3));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
export function dayLabel(ts) {
  const d = new Date(ts), t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t) / 864e5);
  return diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : dm(ts);
}

let toastT;
export function toast(text, icon = 'check-circle-2') {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.innerHTML = `${ic(icon)}<span>${esc(text)}</span>`; icons();
  el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

export function modal(html, { wide = false, onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><button class="modal-x" data-close aria-label="Закрыть">${ic('x')}</button>${html}</div>`;
  const close = () => { wrap.remove(); onClose && onClose(); };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  document.body.append(wrap); icons();
  return { el: wrap, close };
}

export function qrSvg(text, size = 132) {
  if (!window.qrcode) return '';
  const q = qrcode(0, 'L'); q.addData(text); q.make();
  const n = q.getModuleCount(), c = size / n;
  let p = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) p += `M${(x * c).toFixed(2)},${(y * c).toFixed(2)}h${c.toFixed(2)}v${c.toFixed(2)}h-${c.toFixed(2)}z`;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${p}" fill="#0e0e0e"/></svg>`;
}

export function shrinkImage(file, max = 420) {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

export function on(root, ev, sel, fn) {
  root.addEventListener(ev, e => { const t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); });
}
