import { formMarkup, bindRequestForm } from './client.js';
import { modal } from '../ui.js';
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
    <div><h1>Заявки</h1><p class="muted">Заявки с формы сайта и внесённые вручную. Переписка ведётся в обычном WhatsApp.</p></div>
    <div class="duty-badge">${ic('user-check')}<div><small>Дежурный сегодня</small><b>${esc(d.main.name)}</b></div><div><small>Запасной</small><b>${esc(d.backup.name)}</b></div></div>
  </header>
  <div class="kpis small">
    <div class="kpi"><small>Ждут ответа</small><b class="${ls.new.length ? 'warn' : ''}">${ls.new.length}</b></div>
    <div class="kpi"><small>Заявок сегодня</small><b>${st.leads.length}</b></div>
    <div class="kpi"><small>Ответ по отметке мастера</small><b>${answeredToday.length ? Math.round(st.avgResp) + ' мин' : '—'}</b></div>
    <div class="kpi"><small>Правило</small><b class="rule">15 мин → запасной · 30 мин → владелец</b></div>
  </div>
  <button class="btn ghost" data-manual>Создать заявку вручную</button>
  <section class="telegram-preview"><div class="panel-h">${ic('send')}Telegram · пример уведомлений</div><p class="muted">Имитация. Бот не подключён; реальных отправок нет. Телефон и фото доступны в карточке заявки.</p>${ls.new.slice(-4).map(l => `<button class="tg-message" data-sel="${l.id}"><b>№${l.no} · ${esc(l.device)}</b><span>${esc(PROBLEMS[l.problem].ru)} · ${esc(branch(l.branch).short)}</span><small data-sla-id="${l.id}">${esc(slaOf(l).label)}</small><span>Открыть заявку →</span></button>`).join('')}</section>
  <div class="split">
    <div class="list">
      <div class="tabs">${[['new', 'Новые'], ['answered', 'Ждём клиента'], ['booked', 'Записаны'], ['lost', 'Потеряны']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}<i>${ls[k].length}</i></button>`).join('')}</div>
      <div class="rows">${cur.length ? cur.map(row).join('') : `<div class="empty">${ic('inbox')}<p>${tab === 'new' ? 'Все заявки разобраны' : 'Пусто'}</p></div>`}</div>
    </div>
    <div class="detail">${lead ? leadCard(lead) : `<div class="empty big">${ic('mouse-pointer-click')}<p>Выберите заявку слева</p></div>`}</div>
  </div>`;
  icons();
}

export function mount(el, params = {}) {
  if (params.no) { sel = params.no; tab = store.s.leads.find(l => l.id === sel)?.status || 'new'; if (!['new', 'answered', 'booked', 'lost'].includes(tab)) tab = 'new'; }
  root = el; draw();
  bindLeadCard(el, draw);
  el.addEventListener('click', e => {
    if (e.target.closest('[data-manual]')) {
      const m = modal('<h2>Заявка из переписки или звонка</h2>' + formMarkup(true));
      bindRequestForm(m.el, lead => { m.close(); sel = lead.id; tab = 'new'; draw(); }, true); return;
    }
    const r = e.target.closest('[data-sel]'); if (r) { sel = r.dataset.sel; tab = store.s.leads.find(l => l.id === sel)?.status || 'new'; draw(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; sel = null; draw(); }
  });
  timer = setInterval(() => tickTimers(el), 1000);
  return () => clearInterval(timer);
}
