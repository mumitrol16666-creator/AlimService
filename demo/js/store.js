import { BRANCHES, STAFF, DUTY, DEVICES, PROBLEMS, FIRST_NAMES, priceFor } from './data.js?v=202609201835';
import { BRAND } from './brand.js?v=202609201835';

const KEY = `${BRAND.storagePrefix}-demo-v2`;
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

let state;
const subs = new Set();

export const store = {
  get s() { return state; },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} subs.forEach(f => f(state)); },
  reset() { state = seed(); this.save(); },
};

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || state.v !== 1) { state = seed(); store.save(); }
  if (state.alwaysOpen === undefined) state.alwaysOpen = true;
  return state;
}

// ---------- helpers ----------
export const staff = id => STAFF.find(s => s.id === id);
export const branch = id => BRANCHES.find(b => b.id === id) || { short: 'Помочь выбрать', name: 'Филиал уточняется', addr: '' };
export function dutyToday(d = new Date()) { const [a, b] = DUTY[d.getDay()]; return { main: staff(a), backup: staff(b) }; }
export function isOpen(d = new Date()) { if (state?.alwaysOpen) return true; const h = d.getHours(); return h >= 10 && h < 19; }
// С какого момента считаем время ответа: заявки вне графика ждут открытия в 10:00
export function slaStart(lead) {
  const d = new Date(lead.createdAt), h = d.getHours();
  if (state?.alwaysOpen || (h >= 10 && h < 19)) return lead.createdAt;
  if (h >= 19) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}
export const respMin = l => Math.max(1, (l.firstResponseAt - Math.min(slaStart(l), l.firstResponseAt - MIN)) / MIN);

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const weighted = (r, pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let x = r() * t; for (const [v, w] of pairs) { if ((x -= w) < 0) return v; } return pairs[0][0]; };
const phoneOf = r => `+7 7${pick(r, ['00', '01', '02', '05', '07', '47', '71', '75', '77', '78'])} ${String(100 + Math.floor(r() * 899))} ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))}`;

export function workFor(model, problem) {
  const p = priceFor(model, problem);
  const name = { screen: 'Замена дисплея', battery: 'Замена аккумулятора', charge: 'Замена разъёма зарядки', back: 'Замена заднего стекла (лазер)', water: 'Чистка после влаги', camera: 'Ремонт камеры', power: 'Ремонт платы', other: 'Ремонт' }[problem];
  return { name, price: p.orig || p.from, warranty: p.warranty, part: { screen: 'Дисплей', battery: 'Аккумулятор', charge: 'Шлейф зарядки', back: 'Заднее стекло', camera: 'Модуль камеры' }[problem] };
}

// ---------- seed ----------
function seed() {
  const r = rng(20260918);
  const now = Date.now();
  const s = { v: 1, alwaysOpen: true, seq: { order: 1040, lead: 2310 }, orders: [], leads: [], chat: null, notes: [] };
  const models = [...DEVICES.iphone.models, ...DEVICES.iphone.models, 'Galaxy A-серия', 'Galaxy S-серия', 'Redmi Note', 'Redmi', 'iPad', 'Apple Watch'];
  const probs = [['screen', 40], ['battery', 20], ['charge', 12], ['back', 10], ['water', 6], ['camera', 6], ['power', 6]];
  const byBranch = [['mir', 34], ['nektar', 30], ['ah29', 20], ['sh4', 16]];

  for (let d = 29; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY); dayStart.setHours(10, 0, 0, 0);
    const n = 7 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const t = dayStart.getTime() + Math.floor(r() * 8.5 * HOUR);
      if (t > now - 20 * MIN) continue;
      const b = weighted(r, byBranch);
      const model = pick(r, models);
      const problem = weighted(r, probs);
      const src = weighted(r, [['2gis', 45], ['insta', 24], ['site', 11], ['walk', 20]]);
      const client = { name: pick(r, FIRST_NAMES), phone: phoneOf(r) };
      const w = workFor(model, problem);
      const masters = STAFF.filter(x => x.branch === b);
      const master = pick(r, masters).id;
      const ageH = (now - t) / HOUR;

      // заявка (кроме тех, кто пришёл сам)
      let leadId = null;
      if (src !== 'walk') {
        const resp = weighted(r, [[3, 30], [7, 30], [12, 20], [22, 12], [55, 8]]) * MIN * (0.6 + r() * 0.8);
        const lead = {
          id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: Math.max(t - 40 * MIN, dayStart.getTime() + 5 * MIN), source: src, lang: r() < 0.25 ? 'kz' : 'ru',
          client, device: model, problem, branch: b, firstResponseAt: Math.max(t - 40 * MIN, dayStart.getTime() + 5 * MIN) + resp,
          answeredBy: dutyToday(new Date(t)).main.id, status: 'converted', messages: [],
        };
        s.leads.push(lead); leadId = lead.id;
      }

      let status = 'issued';
      if (ageH < 3) status = pick(r, ['accepted', 'work', 'work']);
      else if (ageH < 26) status = pick(r, ['work', 'ready', 'waiting', 'issued', 'issued']);
      else if (ageH < 72) status = pick(r, ['issued', 'issued', 'issued', 'ready', 'waiting']);
      const needsPart = ['screen', 'back', 'camera'].includes(problem) && r() < 0.35;
      if (status === 'waiting' && !needsPart) status = 'work';
      const prepaid = needsPart ? Math.round(w.price * 0.5 / 1000) * 1000 : (r() < 0.3 ? 5000 : 0);
      const hist = [{ st: 'accepted', ts: t }];
      const order = {
        id: 'O' + (++s.seq.order), no: s.seq.order, createdAt: t, branch: b, master, source: src, leadId,
        client, device: model, imei: '35' + Math.floor(1e12 + r() * 9e12), defect: PROBLEMS[problem].ru, problem,
        condition: r() < 0.5 ? ['Царапины на корпусе'] : [], works: [{ name: w.name, price: w.price }],
        parts: needsPart ? [{ name: `${w.part} ${model}`, cost: Math.round(w.price * 0.45 / 500) * 500, status: status === 'waiting' ? pick(r, ['need', 'ordered']) : 'arrived', supplier: pick(r, ['Алматы, опт', 'Китай, Forward', 'Астана, склад']) }] : [],
        total: w.price, prepaid, payMethod: pick(r, ['kaspi', 'kaspi', 'cash', 'card']), deadline: t + (needsPart ? 3 * DAY : 3 * HOUR),
        warranty: w.warranty, status, history: hist, notified: [], paidAt: null,
      };
      const flow = ['accepted', 'waiting', 'work', 'ready', 'issued'];
      const upto = flow.indexOf(status);
      let ts = t;
      for (let k = 1; k <= upto; k++) {
        if (flow[k] === 'waiting' && !needsPart) continue;
        ts += (flow[k] === 'issued' ? 5 : flow[k] === 'work' && needsPart ? 40 : 1.2) * HOUR * (0.5 + r());
        order.history.push({ st: flow[k], ts: Math.min(ts, now - 5 * MIN) });
      }
      if (status === 'issued') order.paidAt = order.history.at(-1).ts;
      s.orders.push(order);
    }
  }

  // Потерянные заявки — не ответили вовремя
  for (let i = 0; i < 26; i++) {
    const t0 = new Date(now - (1 + Math.floor(r() * 28)) * DAY); t0.setHours(10, Math.floor(r() * 480), 0, 0);
    const t = t0.getTime();
    s.leads.push({
      answeredBy: dutyToday(t0).main.id,
      id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: t, source: weighted(r, [['2gis', 55], ['insta', 30], ['site', 15]]), lang: 'ru',
      client: { name: pick(r, FIRST_NAMES), phone: phoneOf(r) }, device: pick(r, models), problem: weighted(r, probs),
      branch: weighted(r, byBranch), firstResponseAt: r() < 0.5 ? t + (70 + r() * 300) * MIN : null, status: 'lost', messages: [],
    });
  }

  // Висящая предоплата: деталь не заказана 9 дней (случай «блокнота»)
  const hang = s.orders.find(o => o.parts.length && o.status === 'waiting') || s.orders.find(o => o.parts.length);
  if (hang) {
    hang.createdAt = now - 9 * DAY; hang.history = [{ st: 'accepted', ts: hang.createdAt }, { st: 'waiting', ts: hang.createdAt + HOUR }];
    hang.status = 'waiting'; hang.parts[0].status = 'need'; hang.prepaid = Math.max(hang.prepaid, 25000); hang.paidAt = null; hang.deadline = hang.createdAt + 3 * DAY;
  }

  // Текущие заявки у дежурного
  const live = [
    { m: 'iPhone 13', p: 'screen', src: '2gis', b: 'nektar', ago: 4, lang: 'ru', name: 'Асель', photo: 'img/broken.jpg', when: 'today' },
    { m: 'Galaxy S-серия', p: 'back', src: 'insta', b: 'mir', ago: 12, lang: 'kz', name: 'Ерболат', photo: 'img/broken2.jpg', when: 'tomorrow' },
    { m: 'iPhone 11', p: 'battery', src: 'site', b: 'ah29', ago: 19, lang: 'ru', name: 'Дмитрий', when: 'today' },
    { m: 'iPhone 15', p: 'charge', src: '2gis', b: 'sh4', ago: 41, lang: 'ru', name: 'Жанна', when: 'later' },
  ];
  for (const x of live) {
    const t = now - x.ago * MIN;
    s.leads.push({
      id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: t, source: x.src, lang: x.lang, client: { name: x.name, phone: phoneOf(r) },
      device: x.m, problem: x.p, branch: x.b, photo: x.photo || null, when: x.when, firstResponseAt: null, status: 'new',
      messages: [{ from: 'client', text: `${x.m} · ${PROBLEMS[x.p][x.lang]}`, ts: t }, { from: 'bot', text: x.lang === 'kz' ? 'Өтінім қабылданды ✅' : 'Заявка принята ✅', ts: t }],
    });
  }

  // Ответили, ждём выбора времени
  [['iPhone 12', 'screen', 'insta', 'mir', 35, 'Сабина'], ['Redmi Note', 'battery', '2gis', 'ah29', 55, 'Тимур']].forEach(([m, p, src, b, agoMin, n]) => {
    const t = now - agoMin * MIN, w = workFor(m, p);
    s.leads.push({
      id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: t, source: src, lang: 'ru', client: { name: n, phone: phoneOf(r) }, device: m, problem: p, branch: b,
      when: 'today', firstResponseAt: t + 6 * MIN, answeredBy: dutyToday().main.id, status: 'answered', quote: w.price, messages: [],
    });
  });

  // Записи на сегодня
  const today = new Date(); today.setHours(0, 0, 0, 0);
  [['mir', '14:30', 'iPhone 12', 'battery', 'Мадина'], ['nektar', '16:00', 'iPhone 14', 'screen', 'Олжас'], ['nektar', '17:30', 'Redmi Note', 'charge', 'Анна'], ['ah29', '15:00', 'iPhone 13', 'back', 'Арман'], ['sh4', '18:00', 'Apple Watch', 'screen', 'Томирис']].forEach(([b, tm, m, p, n]) => {
    const [h, mi] = tm.split(':').map(Number);
    const w = workFor(m, p);
    s.leads.push({
      id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: now - 3 * HOUR, source: pick(r, ['2gis', 'insta', 'site']), lang: 'ru',
      client: { name: n, phone: phoneOf(r) }, device: m, problem: p, branch: b, firstResponseAt: now - 3 * HOUR + 6 * MIN,
      answeredBy: dutyToday().main.id, status: 'booked', quote: w.price, booking: { ts: today.getTime() + h * HOUR + mi * MIN, branch: b }, messages: [],
    });
  });

  return s;
}

// ---------- actions ----------
export const now = () => Date.now();

export function newLead(c) {
  const s = state;
  const lead = {
    id: 'L' + (++s.seq.lead), no: s.seq.lead, createdAt: now(), source: c.channel, lang: c.lang,
    client: { name: c.name, phone: c.phone }, device: c.model, problem: c.problem, branch: c.branch,
    photo: c.photo || null, when: c.when, firstResponseAt: null, status: 'new', messages: [], entry: c.entry || 'form', takenAt: null, whatsappOpenedAt: null,
  };
  s.leads.push(lead); store.save(); return lead;
}

export function takeLead(lead) {
  if (!lead.takenAt) { lead.takenAt = now(); lead.takenBy = dutyToday().main.id; }
  store.save();
}
export const BRANCH_WHATSAPP = { default: '+7 778 004 91 04', nektar: '+7 778 004 91 04', mir: '+7 747 799 99 10', ah29: '+7 705 180 33 95', sh4: '+7 747 568 10 90' };
export function countWhatsAppSkip() { state.waSkips = (state.waSkips || 0) + 1; store.save(); }
export const whatsappUrl = (phone, text) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')}?text=${encodeURIComponent(text)}`;
export function openLeadWhatsApp(lead, text, price) {
  lead.quote = price; lead.draft = text; lead.whatsappOpenedAt = now(); store.save();
  window.open(whatsappUrl(lead.client.phone, text), '_blank', 'noopener,noreferrer');
}
export function confirmReply(lead) {
  if (!lead.whatsappOpenedAt || lead.firstResponseAt) return;
  lead.firstResponseAt = now(); lead.answeredBy = lead.takenBy || dutyToday().main.id;
  lead.status = 'answered'; lead.messages.push({ from: 'master', text: lead.draft, ts: now(), selfReported: true });
  store.save();
}

export function bookLead(lead, ts, branchId) {
  lead.booking = { ts, branch: branchId || lead.branch };
  lead.status = 'booked';
  store.save();
}

export function createOrder(o) {
  const s = state;
  const order = { id: 'O' + (++s.seq.order), no: s.seq.order, createdAt: now(), history: [{ st: o.parts?.some(p => p.status !== 'arrived') ? 'waiting' : 'accepted', ts: now() }], notified: [], paidAt: null, ...o };
  order.status = order.history[0].st;
  if (o.leadId) { const l = s.leads.find(x => x.id === o.leadId); if (l) l.status = 'converted'; }
  s.orders.push(order);
  notify(order, 'receipt');
  store.save();
  return order;
}

export function setStatus(order, st) {
  order.status = st;
  order.history.push({ st, ts: now() });
  if (st === 'issued') order.paidAt = now();
  if (st === 'ready' || st === 'issued') notify(order, st);   // промежуточные статусы клиенту не пишем
  store.save();
}

// Ссылка на квитанцию несёт данные заказа в себе: в демо нет сервера, а QR должен открываться на любом телефоне
const b64 = str => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function packOrder(o) {
  return b64(JSON.stringify({ no: o.no, c: o.createdAt, b: o.branch, m: o.master, d: o.device, f: o.defect, cn: o.condition, w: o.works.map(w => [w.name, w.price]), p: o.prepaid, dl: o.deadline, wr: o.warranty, s: o.status, h: o.history.map(h => [h.st, h.ts]), pt: o.parts.length, pa: o.paidAt }));
}
export function unpackOrder(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const x = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    return { no: x.no, createdAt: x.c, branch: x.b, master: x.m, device: x.d, defect: x.f, condition: x.cn || [], works: x.w.map(([name, price]) => ({ name, price })), total: x.w.reduce((a, w) => a + w[1], 0), prepaid: x.p, deadline: x.dl, warranty: x.wr, status: x.s, history: x.h.map(([st, ts]) => ({ st, ts })), parts: Array(x.pt).fill({}), paidAt: x.pa, imei: '', photos: [], shared: true };
  } catch { return null; }
}
export const receiptUrl = (o, full = true) => `${location.origin}${location.pathname}#/r/${o.no}${full ? '/' + packOrder(o) : ''}`;

export function notify(order, kind) {
  const url = receiptUrl(order);
  const b = branch(order.branch);
  const texts = {
    receipt: `Квитанция №${order.no} · ${order.device}\n${order.works.map(w => w.name).join(', ')}\nПредоплата: ${order.prepaid.toLocaleString('ru-RU')} ₸\nСтатус и гарантия: ${url}`,
    waiting: `Заказ №${order.no}: ждём деталь. Сообщим, как только придёт.`,
    work: `Заказ №${order.no}: мастер приступил к ремонту.`,
    ready: `Заказ №${order.no} готов ✅ Заберите в ${b.name}, ${b.addr}. Работаем до 19:00. Квитанция: ${url}`,
    issued: `Спасибо! Гарантия на ремонт №${order.no} — ${order.warranty} мес. Квитанция: ${url}`,
    part: `Заказ №${order.no}: деталь пришла, приступаем к ремонту.`,
  };
  const msg = { kind, text: texts[kind], ts: now(), via: 'WhatsApp', sentAt: null };
  order.notified.push(msg);
}

// ---------- analytics ----------
export function periodStart(p) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (p === 'week') return d.getTime() - 6 * DAY;
  if (p === 'month') return d.getTime() - 29 * DAY;
  return d.getTime();
}

export function stats(p, branchId) {
  const s = state, from = periodStart(p);
  const inB = x => !branchId || x.branch === branchId;
  const orders = s.orders.filter(o => o.createdAt >= from && inB(o));
  const paid = s.orders.filter(o => o.paidAt && o.paidAt >= from && inB(o));
  const revenue = paid.reduce((a, o) => a + o.total, 0) + orders.filter(o => !o.paidAt).reduce((a, o) => a + o.prepaid, 0);
  const leads = s.leads.filter(l => l.createdAt >= from && inB(l));
  const answered = leads.filter(l => l.firstResponseAt);
  const avgResp = answered.length ? answered.reduce((a, l) => a + respMin(l), 0) / answered.length : 0;
  const lost = leads.filter(l => l.status === 'lost');
  const converted = leads.filter(l => l.status === 'converted');
  const open = s.orders.filter(o => o.status !== 'issued' && inB(o));
  const prepaidHeld = open.reduce((a, o) => a + o.prepaid, 0);
  const overdue = open.filter(o => o.deadline < now() && o.status !== 'ready');
  const hanging = open.filter(o => o.parts.some(pt => pt.status === 'need') && now() - o.createdAt > 2 * DAY);
  return { orders, paid, revenue, leads, answered, avgResp, lost, converted, open, prepaidHeld, overdue, hanging, avgCheck: paid.length ? paid.reduce((a, o) => a + o.total, 0) / paid.length : 0 };
}

export { MIN, HOUR, DAY };
