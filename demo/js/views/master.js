import { BRANCHES, STAFF, PROBLEMS, STATUSES, SOURCES, CONDITIONS, DEVICES, priceFor } from '../data.js?v=202609201834';
import { store, branch, staff, workFor, createOrder, setStatus, notify, receiptUrl, whatsappUrl, MIN, HOUR, DAY } from '../store.js?v=202609201834';
import { $, $$, esc, ic, icons, hm, dm, dayLabel, ago, money, toast, modal, qrSvg, shrinkImage } from '../ui.js?v=202609201834';

let root, tab = 'today', bId = null, form = null, filter = 'active', q = '';

const stOf = id => STATUSES.find(s => s.id === id);
const badge = id => { const s = stOf(id); return `<span class="st" style="--c:${s.color}">${s.label}</span>`; };
const remaining = o => Math.max(0, o.total - o.prepaid);

function blankForm(lead) {
  const f = {
    leadId: lead?.id || null, source: lead?.source || 'walk', phone: lead?.client.phone || '', name: lead?.client.name || '',
    device: lead?.device || '', imei: '', problem: lead?.problem || '', defect: lead ? PROBLEMS[lead.problem].ru : '',
    condition: [], photos: lead?.photo ? [lead.photo] : [], works: [], needPart: false, part: { name: '', supplier: '', cost: '' },
    prepaid: 0, payMethod: 'kaspi', deadline: 'h3', master: STAFF.find(s => s.branch === bId)?.id,
  };
  if (lead) applyProblem(f, lead.problem, lead.quote);
  return f;
}
function applyProblem(f, p, quoted) {
  f.problem = p; f.defect = PROBLEMS[p].ru;
  const w = workFor(f.device, p);
  f.works = [{ name: w.name, price: quoted || w.price || 0 }];
  f.warranty = w.warranty;
  f.part.name = w.part ? `${w.part} ${f.device}`.trim() : '';
}
const total = f => f.works.reduce((a, w) => a + (+w.price || 0), 0);
const soon = () => { const n = new Date(), h = n.getHours(); if (h >= 17 || h < 9) { if (h >= 17) n.setDate(n.getDate() + 1); n.setHours(12, 0, 0, 0); return n.getTime(); } return Date.now() + 3 * HOUR; };
const deadlineTs = k => ({ h3: soon(), tomorrow: new Date().setHours(18, 0, 0, 0) + DAY, d3: new Date().setHours(18, 0, 0, 0) + 3 * DAY, d7: new Date().setHours(18, 0, 0, 0) + 7 * DAY }[k]);

// ---------- tabs ----------
function today() {
  const s = store.s, t0 = new Date().setHours(0, 0, 0, 0), t1 = t0 + DAY;
  const books = s.leads.filter(l => l.status === 'booked' && l.booking.branch === bId && l.booking.ts >= t0 - DAY && l.booking.ts < t1 + DAY).sort((a, b) => a.booking.ts - b.booking.ts);
  const mine = s.orders.filter(o => o.branch === bId && o.status !== 'issued');
  const ready = mine.filter(o => o.status === 'ready'), work = mine.filter(o => ['accepted', 'work'].includes(o.status)), wait = mine.filter(o => o.status === 'waiting');
  return `
  <div class="cols2">
    <section class="card">
      <h2>${ic('calendar-clock')}Записи <i>${books.length}</i></h2>
      ${books.length ? books.map(l => `<div class="bk">
        <time><b>${hm(l.booking.ts)}</b><small>${dayLabel(l.booking.ts)}</small></time>
        <div><b>${esc(l.device)} · ${esc(PROBLEMS[l.problem].ru)}</b><small>${esc(l.client.name)} · ${esc(l.client.phone)} · ${SOURCES[l.source].label}${l.quote ? ' · назвали ' + money(l.quote) : ''}</small></div>
        <button class="btn primary sm" data-accept="${l.id}">${ic('clipboard-check')}Принять</button>
      </div>`).join('') : `<div class="empty">${ic('calendar-x')}<p>Записей нет</p></div>`}
      <button class="btn ghost block" data-newintake>${ic('plus')}Клиент без записи</button>
    </section>
    <section class="card">
      <h2>${ic('package-check')}Готовы к выдаче <i>${ready.length}</i></h2>
      ${ready.length ? ready.map(o => orow(o)).join('') : `<div class="empty">${ic('package')}<p>Нет готовых заказов</p></div>`}
    </section>
  </div>
  <div class="cols2">
    <section class="card"><h2>${ic('wrench')}В работе <i>${work.length}</i></h2>${work.length ? work.map(o => orow(o)).join('') : `<div class="empty"><p>Пусто</p></div>`}</section>
    <section class="card"><h2>${ic('truck')}Ждут деталь <i>${wait.length}</i></h2>${wait.length ? wait.map(o => orow(o)).join('') : `<div class="empty"><p>Пусто</p></div>`}</section>
  </div>`;
}

function orow(o, extra = '') {
  const late = o.deadline < Date.now() && !['ready', 'issued'].includes(o.status);
  return `<button class="orow" data-order="${o.id}">
    <span class="ono">№${o.no}</span>
    <span class="orow-m"><b>${esc(o.device)} · ${esc(o.works[0]?.name || o.defect)}</b><small>${esc(o.client.name)} · ${esc(o.client.phone)}${extra}${late ? ' · <em class="late">срок прошёл</em>' : ''}</small></span>
    <span class="orow-r">${badge(o.status)}<small>${remaining(o) ? 'к оплате ' + money(remaining(o)) : 'оплачен'}</small></span>
  </button>`;
}

function orders() {
  const all = store.s.orders.filter(o => o.branch === bId || filter === 'allb');
  let list = filter === 'active' ? all.filter(o => o.status !== 'issued') : filter === 'issued' ? all.filter(o => o.status === 'issued') : store.s.orders;
  if (q) { const n = q.replace(/\D/g, ''); list = store.s.orders.filter(o => (n && o.client.phone.replace(/\D/g, '').includes(n)) || String(o.no).includes(q) || o.client.name.toLowerCase().includes(q.toLowerCase())); }
  list = list.sort((a, b) => b.createdAt - a.createdAt).slice(0, 60);
  return `<section class="card">
    <div class="toolbar">
      <div class="search">${ic('search')}<input id="oq" placeholder="Телефон, имя или № заказа — поиск по всем филиалам" value="${esc(q)}" inputmode="search"></div>
      <div class="seg sm">${[['active', 'Активные'], ['issued', 'Выданные'], ['allb', 'Все филиалы']].map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div>
    </div>
    ${list.length ? list.map(o => orow(o, ` · ${esc(branch(o.branch).short)} · ${dm(o.createdAt)}`)).join('') : `<div class="empty">${ic('search-x')}<p>Ничего не найдено</p></div>`}
  </section>`;
}

function parts() {
  const rows = store.s.orders.filter(o => o.status !== 'issued').flatMap(o => o.parts.map((p, i) => ({ o, p, i }))).filter(x => x.p.status !== 'arrived').sort((a, b) => a.o.createdAt - b.o.createdAt);
  const need = rows.filter(x => x.p.status === 'need'), ordered = rows.filter(x => x.p.status === 'ordered');
  const prow = ({ o, p, i }) => {
    const days = Math.floor((Date.now() - o.createdAt) / DAY);
    return `<div class="prow ${p.status === 'need' && days >= 2 ? 'alert' : ''}">
      <div><b>${esc(p.name)}</b><small>№${o.no} · ${esc(branch(o.branch).short)} · ${esc(o.client.name)} · предоплата ${money(o.prepaid)} · ${days ? days + ' дн назад' : 'сегодня'}</small></div>
      ${p.status === 'need' ? `<button class="btn primary sm" data-part="${o.id}:${i}:ordered">${ic('shopping-cart')}Заказано</button>` : `<button class="btn ok sm" data-part="${o.id}:${i}:arrived">${ic('package-check')}Пришла</button>`}
    </div>`;
  };
  return `<div class="cols2">
    <section class="card"><h2>${ic('shopping-cart')}Нужно заказать <i>${need.length}</i></h2><p class="muted">Общий список по всем филиалам — одна закупка вместо блокнота в каждой точке.</p>${need.length ? need.map(prow).join('') : `<div class="empty"><p>Всё заказано</p></div>`}</section>
    <section class="card"><h2>${ic('truck')}В пути <i>${ordered.length}</i></h2><p class="muted">Когда деталь пришла, система готовит текст для ручной отправки в WhatsApp.</p>${ordered.length ? ordered.map(prow).join('') : `<div class="empty"><p>Пусто</p></div>`}</section>
  </div>`;
}

function intake() {
  const f = form || (form = blankForm());
  const digits = f.phone.replace(/\D/g, '');
  const hist = digits.length >= 10 ? store.s.orders.filter(o => o.client.phone.replace(/\D/g, '') === digits) : [];
  const lead = f.leadId && store.s.leads.find(l => l.id === f.leadId);
  const tot = total(f);
  const models = [...DEVICES.iphone.models, 'Galaxy A-серия', 'Galaxy S-серия', 'Redmi Note'];
  return `<form class="intake" id="intake" autocomplete="off">
    ${lead ? `<div class="note ok">${ic('sparkles')}Заявка №${lead.no} · ${SOURCES[lead.source].label}. Данные перенесены из заявки. Проверьте и нажмите «Оформить».</div>` : ''}
    <div class="cols2">
      <section class="card">
        <h2>${ic('user')}Клиент</h2>
        <label class="fld"><span>Телефон</span><input name="phone" inputmode="tel" placeholder="+7 7__ ___ __ __" value="${esc(f.phone)}"></label>
        ${hist.length ? `<div class="note">${ic('history')}Уже был у нас: ${hist.length} ${hist.length === 1 ? 'заказ' : 'заказа'}, последний — ${esc(hist.at(-1).device)}, ${dm(hist.at(-1).createdAt)}${hist.some(o => o.status === 'issued' && Date.now() - o.paidAt < o.warranty * 30 * DAY) ? ' · <b>есть действующая гарантия</b>' : ''}</div>` : ''}
        <label class="fld"><span>Имя</span><input name="name" placeholder="Как обращаться" value="${esc(f.name)}"></label>
        <h2 class="mt">${ic('smartphone')}Устройство</h2>
        <div class="pick">${models.map(m => `<button type="button" class="${f.device === m ? 'on' : ''}" data-device="${esc(m)}">${esc(m)}</button>`).join('')}</div>
        <label class="fld"><span>Модель</span><input name="device" placeholder="Например: iPhone 13 Pro" value="${esc(f.device)}"></label>
        <label class="fld"><span>IMEI / серийный номер</span><input name="imei" inputmode="numeric" placeholder="необязательно" value="${esc(f.imei)}"></label>
        <h2 class="mt">${ic('scan-eye')}Состояние при приёме</h2>
        <div class="pick multi"><button type="button" class="${f.noIssues ? 'on' : ''}" data-cond-none>Без замечаний</button>${CONDITIONS.map(c => `<button type="button" class="${f.condition.includes(c) ? 'on' : ''}" data-cond="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="photos">${f.photos.map((p, i) => `<figure><img src="${esc(p)}" alt=""><button type="button" data-delphoto="${i}">${ic('x')}</button></figure>`).join('')}<label class="addphoto">${ic('camera')}<span>Фото</span><input type="file" accept="image/*" capture="environment" hidden id="ph"></label></div>
      </section>
      <section class="card">
        <h2>${ic('stethoscope')}Поломка и работы</h2>
        <div class="pick">${Object.entries(PROBLEMS).map(([k, v]) => `<button type="button" class="${f.problem === k ? 'on' : ''}" data-problem="${k}">${ic(v.icon)}${v.ru}</button>`).join('')}</div>
        ${f.problem && f.problem !== 'other' ? `<input type="hidden" name="defect" value="${esc(f.defect)}">` : `<label class="fld"><span>Со слов клиента</span><input name="defect" value="${esc(f.defect)}" placeholder="Что случилось"></label>`}
        <div class="works">${f.works.map((w, i) => `<div class="work"><input data-wname="${i}" value="${esc(w.name)}" placeholder="Работа"><input data-wprice="${i}" inputmode="numeric" value="${esc(w.price)}" placeholder="₸"><button type="button" class="icon-btn" data-delwork="${i}">${ic('trash-2')}</button></div>`).join('')}
          <button type="button" class="btn ghost sm" data-addwork>${ic('plus')}Добавить работу</button></div>
        <label class="switch"><input type="checkbox" name="needPart" ${f.needPart ? 'checked' : ''}><i></i><span>Деталь нужно заказать</span></label>
        ${f.needPart ? `<div class="sub"><label class="fld"><span>Деталь</span><input name="partName" value="${esc(f.part.name)}"></label><div class="cols2 tight"><label class="fld"><span>Поставщик</span><input name="partSupplier" value="${esc(f.part.supplier)}" placeholder="Алматы, опт"></label><label class="fld"><span>Закупка, ₸</span><input name="partCost" inputmode="numeric" value="${esc(f.part.cost)}"></label></div></div>` : ''}
        <h2 class="mt">${ic('wallet')}Оплата</h2>
        <div class="sumline"><span>Итого</span><b>${money(tot)}</b></div>
        <div class="pick">${[[0, 'Без предоплаты'], [5000, '5 000 ₸'], [Math.round(tot / 2 / 500) * 500, '50%'], [tot, 'Полностью']].map(([v, n]) => `<button type="button" class="${+f.prepaid === v ? 'on' : ''}" data-prepaid="${v}">${n}</button>`).join('')}</div>
        <div class="cols2 tight"><label class="fld"><span>Предоплата, ₸</span><input name="prepaid" inputmode="numeric" value="${esc(f.prepaid)}"></label>
        ${+f.prepaid > 0 ? `<div class="fld"><span>Способ</span><div class="seg sm">${[['kaspi', 'Kaspi'], ['cash', 'Наличные'], ['card', 'Карта']].map(([k, n]) => `<button type="button" class="${f.payMethod === k ? 'on' : ''}" data-pay="${k}">${n}</button>`).join('')}</div></div>` : ''}</div>
        <div class="sumline"><span>Останется к оплате</span><b>${money(Math.max(0, tot - f.prepaid))}</b></div>
        <h2 class="mt">${ic('calendar')}Срок и мастер</h2>
        <div class="pick">${[['h3', 'Через 3 часа'], ['tomorrow', 'Завтра'], ['d3', '3 дня'], ['d7', 'Неделя']].map(([k, n]) => `<button type="button" class="${f.deadline === k ? 'on' : ''}" data-deadline="${k}">${n}</button>`).join('')}</div>
        <div class="pick">${STAFF.filter(s => s.branch === bId).map(s => `<button type="button" class="${f.master === s.id ? 'on' : ''}" data-master="${s.id}">${ic('user')}${esc(s.name)}</button>`).join('')}</div>
      </section>
    </div>
    <div class="intake-bar"><div><small>${esc(f.device || 'Устройство не выбрано')}</small><b>${money(tot)} · предоплата ${money(f.prepaid)}</b></div><button class="btn primary lg">${ic('receipt')}Оформить квитанцию</button></div>
  </form>`;
}

// ---------- order modal ----------
function orderModal(o) {
  const flow = ['accepted', ...(o.parts.length ? ['waiting'] : []), 'work', 'ready', 'issued'];
  const idx = flow.indexOf(o.status);
  const next = flow[idx + 1];
  const nextLabel = { waiting: 'Ждём деталь', work: 'Взять в работу', ready: 'Отметить готовность', issued: remaining(o) ? `Выдать и принять ${money(remaining(o))}` : 'Выдать клиенту' }[next];
  const m = modal(`
    <div class="om">
      <div class="om-h"><div><small>Заказ №${o.no} · ${esc(branch(o.branch).name)} · ${dm(o.createdAt)} ${hm(o.createdAt)}</small><h2>${esc(o.device)}</h2><p>${esc(o.defect)}</p></div>${badge(o.status)}</div>
      <div class="stepper">${flow.map((s, i) => `<div class="${i <= idx ? 'done' : ''}"><i>${i < idx || o.status === 'issued' ? ic('check') : i + 1}</i><span>${stOf(s).label}</span><small>${o.history.find(h => h.st === s) ? hm(o.history.find(h => h.st === s).ts) + ', ' + dm(o.history.find(h => h.st === s).ts) : ''}</small></div>`).join('')}</div>
      <div class="cols2">
        <div>
          <dl class="kv"><dt>Клиент</dt><dd>${esc(o.client.name)} · ${esc(o.client.phone)}</dd><dt>Мастер</dt><dd>${esc(staff(o.master)?.name || '—')}</dd><dt>Источник</dt><dd>${SOURCES[o.source].label}</dd>${o.imei ? `<dt>IMEI</dt><dd>${esc(o.imei)}</dd>` : ''}<dt>Состояние</dt><dd>${esc(o.condition.join(', ') || 'без замечаний')}</dd><dt>Срок</dt><dd>${dayLabel(o.deadline)} ${hm(o.deadline)}</dd><dt>Гарантия</dt><dd>${o.warranty} мес</dd></dl>
          ${o.photos?.length ? `<div class="photos ro">${o.photos.map(p => `<figure><img src="${esc(p)}" alt=""></figure>`).join('')}</div>` : ''}
          ${o.parts.map(p => `<div class="note ${p.status === 'need' ? 'bad' : p.status === 'ordered' ? '' : 'ok'}">${ic('package')}${esc(p.name)} — ${{ need: 'не заказана', ordered: 'в пути', arrived: 'на месте' }[p.status]}</div>`).join('')}
        </div>
        <div>
          <div class="bill">${o.works.map(w => `<div><span>${esc(w.name)}</span><b>${money(w.price)}</b></div>`).join('')}<div class="tot"><span>Итого</span><b>${money(o.total)}</b></div><div><span>Предоплата (${{ kaspi: 'Kaspi', cash: 'наличные', card: 'карта' }[o.payMethod]})</span><b>${money(o.prepaid)}</b></div><div class="tot"><span>${o.status === 'issued' ? 'Оплачено полностью' : 'К оплате'}</span><b>${o.status === 'issued' ? money(o.total) : money(remaining(o))}</b></div></div>
          <h3 class="mt">${ic('message-circle')}Сообщения для WhatsApp</h3>
          <div class="log">${o.notified.length ? o.notified.map((n, i) => `<div><time>${hm(n.ts)}</time><p>${esc(n.text).replace(/\n/g, '<br>')}</p><small>${n.sentAt ? 'Отправка отмечена мастером в ' + hm(n.sentAt) : n.openedAt ? 'WhatsApp открыт · отправка не подтверждена' : 'Черновик · не отправлено'}</small><button class="btn ghost" data-msg-open="${i}">Открыть WhatsApp</button>${n.openedAt && !n.sentAt ? `<button class="btn primary" data-msg-confirm="${i}">Я отправил сообщение</button>` : ''}</div>`).join('') : '<p class="muted">Сообщений ещё не было</p>'}</div>
        </div>
      </div>
      <div class="om-f">
        <a class="btn ghost" href="#/r/${o.no}" data-close>${ic('receipt')}Квитанция клиента</a>
        ${next ? `<button class="btn primary lg" data-next="${next}">${ic(next === 'issued' ? 'hand-coins' : 'arrow-right')}${nextLabel}</button>` : `<span class="note ok">${ic('shield-check')}Гарантия до ${dm(o.paidAt + o.warranty * 30 * DAY)}.${new Date(o.paidAt + o.warranty * 30 * DAY).getFullYear()}</span>`}
      </div>
    </div>`, { wide: true });
  m.el.addEventListener('click', e => {
    const open = e.target.closest('[data-msg-open]'), confirm = e.target.closest('[data-msg-confirm]');
    if (open || confirm) {
      const n = o.notified[+(open ? open.dataset.msgOpen : confirm.dataset.msgConfirm)];
      if (open) { n.openedAt = Date.now(); window.open(whatsappUrl(o.client.phone, n.text), '_blank', 'noopener,noreferrer'); }
      else if (n.openedAt) n.sentAt = Date.now();
      store.save(); m.close(); orderModal(o); return;
    }
    const b = e.target.closest('[data-next]'); if (!b) return;
    if (b.dataset.next === 'waiting') o.parts.forEach(p => { if (p.status === 'arrived') p.status = 'need'; });
    setStatus(o, b.dataset.next);
    toast('Статус обновлён. Текст для WhatsApp подготовлен', 'send');
    m.close(); draw(); orderModal(o);
  });
}

function receiptModal(o) {
  const m = modal(`<div class="rc-done">
    <div class="ok-ic">${ic('check')}</div>
    <h2>Заказ №${o.no} оформлен</h2>
    <p class="muted">Квитанция готова. Откройте WhatsApp для ${esc(o.client.phone)} и отправьте сообщение вручную. В демо ссылка содержит снимок заказа; на другом устройстве статус не обновляется.</p>
    <div class="rc-qr">${qrSvg(receiptUrl(o), 190)}<div><b>Или покажите QR</b><small>Клиент откроет квитанцию камерой телефона</small></div></div>
    <div class="msg-preview"><small>${ic('message-circle')}WhatsApp · ${hm(Date.now())}</small><p>${esc(o.notified[0]?.text || '').replace(/\n/g, '<br>')}</p></div>
    <div class="row"><button class="btn primary" data-receipt-send>Открыть WhatsApp</button><a class="btn ghost" href="#/r/${o.no}" data-close>${ic('eye')}Открыть глазами клиента</a><button class="btn ghost" data-close>Готово</button></div>
  </div>`);
  m.el.addEventListener('click', e => {
    if (!e.target.closest('[data-receipt-send]')) return;
    const n = o.notified.find(n => n.kind === 'receipt');
    if (n) { n.openedAt = Date.now(); store.save(); }
    window.open(whatsappUrl(o.client.phone, n?.text || receiptUrl(o)), '_blank', 'noopener,noreferrer');
    m.close(); orderModal(o);
  });
}

// ---------- draw ----------
function draw() {
  if (!root?.isConnected) return;
  const s = store.s, b = branch(bId);
  const nParts = s.orders.filter(o => o.status !== 'issued').flatMap(o => o.parts).filter(p => p.status === 'need').length;
  root.innerHTML = `
  <header class="vh">
    <div><h1>Точка · ${esc(b.name)}</h1><p class="muted">${esc(b.addr)} · работает с телефона и планшета мастера</p></div>
    <div class="seg scroll">${BRANCHES.map(x => `<button class="${x.id === bId ? 'on' : ''}" data-branch="${x.id}">${esc(x.short)}</button>`).join('')}</div>
  </header>
  <div class="tabs big">${[['today', 'Сегодня', 'sun'], ['intake', 'Приёмка', 'clipboard-plus'], ['orders', 'Заказы', 'list'], ['parts', 'Детали', 'package']].map(([k, n, i]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${ic(i)}${n}${k === 'parts' && nParts ? `<i class="red">${nParts}</i>` : ''}</button>`).join('')}</div>
  <div class="tabbody">${{ today, intake, orders, parts }[tab]()}</div>`;
  icons();
}

function readForm() {
  const el = $('#intake', root); if (!el || !form) return;
  const v = n => el.elements[n]?.value ?? '';
  Object.assign(form, { phone: v('phone'), name: v('name'), device: v('device'), imei: v('imei'), defect: v('defect'), prepaid: +v('prepaid') || 0, needPart: el.elements.needPart.checked });
  if (form.needPart && el.elements.partName) form.part = { name: v('partName'), supplier: v('partSupplier'), cost: v('partCost') };
  $$('[data-wname]', el).forEach(i => { form.works[+i.dataset.wname].name = i.value; });
  $$('[data-wprice]', el).forEach(i => { form.works[+i.dataset.wprice].price = +i.value || 0; });
}

export function mount(el, params) {
  root = el;
  if (!bId) { const l = store.s.leads.find(x => x.id === store.s.lastFormLead); bId = l?.booking?.branch || l?.branch || 'nektar'; }
  draw();

  el.addEventListener('click', e => {
    const T = s => e.target.closest(s);
    let t;
    if ((t = T('[data-branch]'))) {
      if (tab === 'intake' && form) readForm();
      bId = t.dataset.branch;
      if (form && !STAFF.some(s => s.id === form.master && s.branch === bId)) form.master = STAFF.find(s => s.branch === bId)?.id;
      return draw();
    }
    if ((t = T('[data-tab]'))) { readForm(); tab = t.dataset.tab; return draw(); }
    if ((t = T('[data-accept]'))) { const l = store.s.leads.find(x => x.id === t.dataset.accept); form = blankForm(l); tab = 'intake'; draw(); return window.scrollTo(0, 0); }
    if (T('[data-newintake]')) { form = blankForm(); tab = 'intake'; return draw(); }
    if ((t = T('[data-order]'))) return orderModal(store.s.orders.find(o => o.id === t.dataset.order));
    if ((t = T('[data-filter]'))) { filter = t.dataset.filter; q = ''; return draw(); }
    if ((t = T('[data-part]'))) {
      const [oid, i, st] = t.dataset.part.split(':'); const o = store.s.orders.find(x => x.id === oid);
      o.parts[+i].status = st;
      if (st === 'arrived') { notify(o, 'part'); if (o.status === 'waiting') setStatus(o, 'work'); toast('Подготовлен текст: деталь пришла', 'send'); } else toast('Отмечено: заказано у поставщика');
      store.save(); return draw();
    }
    if (tab !== 'intake' || !form) return;
    readForm();
    if ((t = T('[data-device]'))) { form.device = t.dataset.device; if (form.problem) applyProblem(form, form.problem); }
    else if ((t = T('[data-problem]'))) applyProblem(form, t.dataset.problem);
    else if (T('[data-cond-none]')) { form.noIssues = !form.noIssues; if (form.noIssues) form.condition = []; }
    else if ((t = T('[data-cond]'))) { const c = t.dataset.cond; form.condition = form.condition.includes(c) ? form.condition.filter(x => x !== c) : [...form.condition, c]; form.noIssues = false; }
    else if ((t = T('[data-prepaid]'))) form.prepaid = +t.dataset.prepaid;
    else if ((t = T('[data-pay]'))) form.payMethod = t.dataset.pay;
    else if ((t = T('[data-deadline]'))) form.deadline = t.dataset.deadline;
    else if ((t = T('[data-master]'))) form.master = t.dataset.master;
    else if (T('[data-addwork]')) form.works.push({ name: '', price: '' });
    else if ((t = T('[data-delwork]'))) form.works.splice(+t.dataset.delwork, 1);
    else if ((t = T('[data-delphoto]'))) form.photos.splice(+t.dataset.delphoto, 1);
    else return;
    draw();
  });

  el.addEventListener('change', async e => {
    if (e.target.id === 'ph' && e.target.files[0]) { readForm(); const img = await shrinkImage(e.target.files[0]); if (img) form.photos.push(img); draw(); }
    if (e.target.name === 'needPart') { readForm(); if (form.needPart && form.deadline === 'h3') form.deadline = 'd3'; if (form.needPart && !form.prepaid) form.prepaid = Math.round(total(form) / 2 / 500) * 500; draw(); }
    if (['phone', 'device'].includes(e.target.name) || e.target.dataset.wprice !== undefined || e.target.name === 'prepaid') { readForm(); draw(); }
  });
  el.addEventListener('input', e => { if (e.target.id === 'oq') { q = e.target.value; const pos = e.target.selectionStart; draw(); const i = $('#oq', el); i.focus(); i.setSelectionRange(pos, pos); } });

  el.addEventListener('submit', e => {
    if (e.target.id !== 'intake') return;
    e.preventDefault(); readForm();
    const f = form;
    if (f.phone.replace(/\D/g, '').length < 10) return toast('Укажите телефон клиента', 'alert-circle');
    if (!f.device) return toast('Укажите устройство', 'alert-circle');
    if (!f.works.length || !total(f)) return toast('Добавьте работу и цену', 'alert-circle');
    const o = createOrder({
      branch: bId, master: f.master, source: f.source, leadId: f.leadId, client: { name: f.name || 'Клиент', phone: f.phone }, device: f.device, imei: f.imei,
      defect: f.defect, problem: f.problem || 'other', condition: f.condition, photos: f.photos, works: f.works.filter(w => w.name), total: total(f), prepaid: Math.min(f.prepaid, total(f)),
      payMethod: f.payMethod, deadline: deadlineTs(f.deadline), warranty: f.warranty || 3,
      parts: f.needPart ? [{ name: f.part.name || 'Деталь', supplier: f.part.supplier, cost: +f.part.cost || 0, status: 'need' }] : [],
    });
    form = null; tab = 'today'; draw(); receiptModal(o);
  });
}
