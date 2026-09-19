import { PROBLEMS, SOURCES } from '../data.js';
import { store, branch, dutyToday, stats, slaStart, MIN } from '../store.js';
import { $, esc, ic, icons, hm, elapsed, dayLabel } from '../ui.js';
import { leadCard, bindLeadCard, tickTimers, slaOf } from './lead.js';

let root, sel = null, tab = 'new', timer;

function lists() {
  const L = store.s.leads, dayAgo = Date.now() - 24 * 60 * MIN;
  return {
    new: L.filter(l => l.status === 'new').sort((a, b) => a.createdAt - b.createdAt),
    answered: L.filter(l => l.status === 'answered' && l.createdAt > dayAgo).sort((a, b) => b.createdAt - a.createdAt),
    booked: L.filter(l => l.status === 'booked').sort((a, b) => a.booking.ts - b.booking.ts),
    lost: L.filter(l => l.status === 'lost').sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
  };
}

function row(l) {
  const sla = slaOf(l), src = SOURCES[l.source];
  return `<button class="lrow ${sel === l.id ? 'on' : ''}" data-sel="${l.id}">
    <span class="src" style="--c:${src.color}" title="${src.label}"></span>
    <span class="lrow-m"><b>${esc(l.device)} · ${esc(PROBLEMS[l.problem].ru)}</b><small>${esc(l.client.name)} · ${esc(branch(l.branch).short)} · ${src.label}</small></span>
    ${l.status === 'new' ? (sla.off ? `<span class="tm mute">до 10:00</span>` : `<span class="tm ${sla.cls}" data-timer="${slaStart(l)}">${elapsed(slaStart(l))}</span>`) : l.status === 'booked' ? `<span class="tm ok">${dayLabel(l.booking.ts)} ${hm(l.booking.ts)}</span>` : `<span class="tm mute">${hm(l.createdAt)}</span>`}
  </button>`;
}

function draw() {
  if (!root?.isConnected) return;
  const ls = lists(), d = dutyToday(), st = stats('today');
  const cur = ls[tab];
  if (!cur.find(l => l.id === sel)) sel = cur[0]?.id || null;
  const lead = sel && store.s.leads.find(l => l.id === sel);
  const answeredToday = st.leads.filter(l => l.firstResponseAt);
  root.innerHTML = `
  <header class="vh">
    <div><h1>Заявки</h1><p class="muted">Все каналы в одном месте: WhatsApp, Instagram, сайт. Переписка остаётся у компании, а не в личном телефоне.</p></div>
    <div class="duty-badge">${ic('user-check')}<div><small>Дежурный сегодня</small><b>${esc(d.main.name)}</b></div><div><small>Запасной</small><b>${esc(d.backup.name)}</b></div></div>
  </header>
  <div class="kpis small">
    <div class="kpi"><small>Ждут ответа</small><b class="${ls.new.length ? 'warn' : ''}">${ls.new.length}</b></div>
    <div class="kpi"><small>Заявок сегодня</small><b>${st.leads.length}</b></div>
    <div class="kpi"><small>Средний ответ сегодня</small><b>${answeredToday.length ? Math.round(st.avgResp) + ' мин' : '—'}</b></div>
    <div class="kpi"><small>Правило</small><b class="rule">15 мин → запасной · 30 мин → владелец</b></div>
  </div>
  <div class="split">
    <div class="list">
      <div class="tabs">${[['new', 'Новые'], ['answered', 'Ждём клиента'], ['booked', 'Записаны'], ['lost', 'Потеряны']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}<i>${ls[k].length}</i></button>`).join('')}</div>
      <div class="rows">${cur.length ? cur.map(row).join('') : `<div class="empty">${ic('inbox')}<p>${tab === 'new' ? 'Все заявки разобраны' : 'Пусто'}</p></div>`}</div>
    </div>
    <div class="detail">${lead ? leadCard(lead) : `<div class="empty big">${ic('mouse-pointer-click')}<p>Выберите заявку слева</p></div>`}</div>
  </div>`;
  icons();
}

export function mount(el) {
  root = el; draw();
  bindLeadCard(el, draw);
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-sel]'); if (r) { sel = r.dataset.sel; draw(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; sel = null; draw(); }
  });
  timer = setInterval(() => tickTimers(el), 1000);
  return () => clearInterval(timer);
}
