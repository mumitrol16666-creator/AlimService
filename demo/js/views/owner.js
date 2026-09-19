import { BRANCHES, SOURCES, STAFF, PROBLEMS } from '../data.js?v=202609200053';
import { store, stats, branch, staff, periodStart, slaStart, respMin, MIN, DAY } from '../store.js?v=202609200053';
import { $, esc, ic, icons, money, moneyShort, dm, ago } from '../ui.js?v=202609200053';

let root, period = 'month', bId = '', adSpend = 60000, charts = [];
const PAL = ['#ffc61a', '#f26a1b', '#0e0e0e', '#9ca3af'];

function draw() {
  if (!root?.isConnected) return;
  charts.forEach(c => c.destroy()); charts = [];
  const st = stats(period, bId || null);
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const convRate = st.leads.length ? st.converted.length / st.leads.length : 0;
  const lostMoney = st.lost.length * (st.avgCheck || 25000);
  const newLeads = store.s.leads.filter(l => (!bId || l.branch === bId) && l.status === 'new' && (Date.now() - slaStart(l)) > 15 * MIN);

  // Источники
  const bySrc = Object.keys(SOURCES).map(k => {
    const leads = k === 'walk' ? [] : st.leads.filter(l => l.source === k);
    const orders = st.orders.filter(o => o.source === k);
    const rev = orders.reduce((a, o) => a + o.total, 0);
    return { k, leads: leads.length, orders: orders.length, rev, lost: leads.filter(l => l.status === 'lost').length };
  });
  const gis = bySrc.find(x => x.k === '2gis');
  const spend = adSpend * days / 30;

  // Мастера: скорость ответа
  const byMaster = STAFF.map(m => {
    const a = st.leads.filter(l => l.answeredBy === m.id && l.firstResponseAt);
    const o = st.orders.filter(x => x.master === m.id);
    return { m, n: a.length, avg: a.length ? a.reduce((s, l) => s + respMin(l), 0) / a.length : 0, orders: o.length, rev: o.reduce((s, x) => s + x.total, 0) };
  }).filter(x => x.n || x.orders);

  root.innerHTML = `
  <header class="vh">
    <div><h1>Владелец</h1><p class="muted">Все филиалы на одном экране. Данные в демо — примерные.</p></div>
    <div class="vh-r">
      <div class="seg">${[['today', 'Сегодня'], ['week', '7 дней'], ['month', '30 дней']].map(([k, n]) => `<button class="${period === k ? 'on' : ''}" data-period="${k}">${n}</button>`).join('')}</div>
      <select id="ob" class="sel"><option value="">Все филиалы</option>${BRANCHES.map(b => `<option value="${b.id}" ${bId === b.id ? 'selected' : ''}>${esc(b.short)}</option>`).join('')}</select>
    </div>
  </header>

  <div class="kpis">
    <div class="kpi hero"><small>Выручка</small><b>${money(st.revenue)}</b><span>${st.paid.length} выдано · средний чек ${money(st.avgCheck)}</span></div>
    <div class="kpi"><small>Заказов принято</small><b>${st.orders.length}</b><span>${st.open.length} сейчас в работе</span></div>
    <div class="kpi"><small>Предоплаты на руках</small><b>${money(st.prepaidHeld)}</b><span>по ${st.open.filter(o => o.prepaid).length} открытым заказам</span></div>
    <div class="kpi"><small>Заявок из каналов</small><b>${st.leads.length}</b><span>${Math.round(convRate * 100)}% стали заказами</span></div>
    <div class="kpi"><small>Ответ по отметке мастера</small><b class="${st.avgResp > 15 ? 'warn' : 'good'}">${Math.round(st.avgResp)} мин</b><span>доставка не подтверждается</span></div>
    <div class="kpi"><small>Готовы, ждут клиента</small><b>${st.open.filter(o => o.status === 'ready').length}</b><span>к получению ${money(st.open.filter(o => o.status === 'ready').reduce((a, o) => a + o.total - o.prepaid, 0))}</span></div>
    <div class="kpi bad"><small>Потеряно заявок</small><b>${st.lost.length}</b><span>≈ ${moneyShort(lostMoney)} недополучено</span></div>
  </div>

  <section class="card attention">
    <h2>${ic('siren')}Требует внимания</h2>
    <div class="att">
      ${st.hanging.map(o => `<a class="att-i bad" href="#/r/${o.no}">${ic('notebook-pen')}<div><b>Предоплата ${money(o.prepaid)} лежит ${Math.floor((Date.now() - o.createdAt) / DAY)} дней, деталь не заказана</b><small>№${o.no} · ${esc(o.device)} · ${esc(o.client.name)} ${esc(o.client.phone)} · ${esc(branch(o.branch).short)}</small></div></a>`).join('')}
      ${newLeads.map(l => `<a class="att-i warn" href="#/duty">${ic('message-circle-warning')}<div><b>Нет отметки ответа ${Math.floor((Date.now() - slaStart(l)) / MIN)} минут</b><small>Заявка №${l.no} · ${esc(l.device)} · ${SOURCES[l.source].label} · ${esc(branch(l.branch).short)}</small></div></a>`).join('')}
      ${st.overdue.slice(0, 3).map(o => `<a class="att-i warn" href="#/r/${o.no}">${ic('alarm-clock')}<div><b>Срок ремонта прошёл ${ago(o.deadline)}</b><small>№${o.no} · ${esc(o.device)} · ${esc(staff(o.master)?.name || '')} · ${esc(branch(o.branch).short)}</small></div></a>`).join('')}
      ${!st.hanging.length && !newLeads.length && !st.overdue.length ? `<div class="empty"><p>Всё под контролем</p></div>` : ''}
    </div>
  </section>

  <div class="cols2 wide-l">
    <section class="card"><h2>${ic('bar-chart-3')}Выручка по филиалам</h2><div class="ch"><canvas id="c-rev"></canvas></div></section>
    <section class="card"><h2>${ic('store')}Филиалы</h2>
      <table class="tbl"><thead><tr><th>Филиал</th><th>Заказов</th><th>Выручка</th><th>В работе</th></tr></thead><tbody>
      ${BRANCHES.map((b, i) => { const s = stats(period, b.id); return `<tr><td><i class="dotc" style="--c:${PAL[i]}"></i>${esc(b.short)}</td><td>${s.orders.length}</td><td><b>${moneyShort(s.revenue)}</b></td><td>${s.open.length}</td></tr>`; }).join('')}
      </tbody></table>
    </section>
  </div>

  <div class="cols2">
    <section class="card">
      <h2>${ic('megaphone')}Откуда приходят клиенты</h2>
      <table class="tbl"><thead><tr><th>Канал</th><th>Заявок</th><th>Потеряно</th><th>Заказов</th><th>Выручка</th></tr></thead><tbody>
      ${bySrc.map(x => `<tr><td><i class="dotc" style="--c:${SOURCES[x.k].color}"></i>${SOURCES[x.k].label}</td><td>${x.k === 'walk' ? '—' : x.leads}</td><td class="${x.lost ? 'red' : ''}">${x.k === 'walk' ? '—' : x.lost}</td><td>${x.orders}</td><td><b>${moneyShort(x.rev)}</b></td></tr>`).join('')}
      </tbody></table>
      <div class="roi">
        <div class="roi-h">${ic('calculator')}Окупается ли реклама в 2ГИС</div>
        <label class="fld inline"><span>Расход на 2ГИС в месяц</span><input id="ad" inputmode="numeric" value="${adSpend}"><em>₸</em></label>
        <div class="roi-g">
          <div><small>Заявка стоит</small><b>${gis.leads ? money(spend / gis.leads) : '—'}</b></div>
          <div><small>Заказ стоит</small><b>${gis.orders ? money(spend / gis.orders) : '—'}</b></div>
          <div><small>Выручка на 1 ₸ рекламы</small><b>${spend ? (gis.rev / spend).toFixed(1).replace('.', ',') + ' ₸' : '—'}</b></div>
          <div class="red"><small>Пришли из 2ГИС, но не дождались ответа</small><b>${gis.lost} заявок ≈ ${moneyShort(gis.lost * (st.avgCheck || 25000))}</b></div>
        </div>
      </div>
    </section>
    <section class="card">
      <h2>${ic('timer')}Отметки ответа и мастера</h2>
      <table class="tbl"><thead><tr><th>Мастер</th><th>До отметки</th><th>Заказов</th><th>Выручка</th></tr></thead><tbody>
      ${byMaster.map(x => `<tr><td>${esc(x.m.name)}<small class="tsub">${esc(branch(x.m.branch).short)} · ${x.n} ответов</small></td><td class="${x.avg > 15 ? 'red' : ''}">${x.n ? Math.round(x.avg) + ' мин' : '—'}</td><td>${x.orders}</td><td><b>${moneyShort(x.rev)}</b></td></tr>`).join('')}
      </tbody></table>
      <div class="ch sm"><canvas id="c-prob"></canvas></div>
    </section>
  </div>`;
  icons();

  if (!window.Chart) return;
  Chart.defaults.font.family = 'Onest, system-ui, sans-serif'; Chart.defaults.color = '#6b6b6b';
  // Выручка по дням и филиалам
  const n = period === 'today' ? 1 : days, from = periodStart(period);
  const labels = Array.from({ length: n }, (_, i) => dm(from + i * DAY));
  const sets = BRANCHES.filter(b => !bId || b.id === bId).map(b => ({
    label: b.short, backgroundColor: PAL[BRANCHES.indexOf(b)], borderRadius: 4, borderSkipped: false,
    data: Array.from({ length: n }, (_, i) => store.s.orders.filter(o => o.branch === b.id && o.paidAt && o.paidAt >= from + i * DAY && o.paidAt < from + (i + 1) * DAY).reduce((a, o) => a + o.total, 0)),
  }));
  charts.push(new Chart($('#c-rev', root), { type: 'bar', data: { labels, datasets: sets }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${money(c.parsed.y)}` } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { stacked: true, ticks: { callback: v => v >= 1000 ? v / 1000 + ' тыс' : v }, grid: { color: 'rgba(0,0,0,.06)' } } } } }));
  // Что чинят
  const probs = Object.keys(PROBLEMS).map(k => [PROBLEMS[k].ru, st.orders.filter(o => o.problem === k).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  charts.push(new Chart($('#c-prob', root), { type: 'bar', data: { labels: probs.map(x => x[0]), datasets: [{ data: probs.map(x => x[1]), backgroundColor: '#0e0e0e', borderRadius: 4 }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Что чинят чаще всего', align: 'start', color: '#0e0e0e', font: { size: 14, weight: 600 } } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } } }));
}

export function mount(el) {
  root = el; draw();
  el.addEventListener('click', e => { const p = e.target.closest('[data-period]'); if (p) { period = p.dataset.period; draw(); } });
  el.addEventListener('change', e => {
    if (e.target.id === 'ob') { bId = e.target.value; draw(); }
    if (e.target.id === 'ad') { adSpend = +e.target.value.replace(/\D/g, '') || 0; draw(); }
  });
  return () => { charts.forEach(c => c.destroy()); charts = []; };
}
