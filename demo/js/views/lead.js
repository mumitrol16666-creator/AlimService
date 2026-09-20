import { modelLabel, branchLabel, branchAddress } from '../request-copy.js?v=202609201835';
// Карточка заявки: используется и у дежурного, и рядом с клиентским чатом
import { PROBLEMS, SOURCES, BRANCHES, priceFor, fmt } from '../data.js?v=202609201835';
import { store, branch, takeLead, openLeadWhatsApp, confirmReply, bookLead, dutyToday, slaStart, respMin, MIN, HOUR } from '../store.js?v=202609201835';
import { esc, ic, hm, elapsed, dayLabel, toast, icons } from '../ui.js?v=202609201835';

export function slaOf(lead) {
  if (lead.firstResponseAt) return { cls: 'ok', label: 'Мастер подтвердил ответ за ' + Math.round(respMin(lead)) + ' мин' };
  const start = slaStart(lead);
  if (Date.now() < start) return { cls: 'ok', label: 'Пришла вне графика. Отсчёт 15 минут начнётся в 10:00', off: true };
  const m = (Date.now() - start) / MIN;
  const d = dutyToday();
  if (m < 15) return { cls: 'ok', label: lead.takenAt ? 'Взята · ждём подтверждения ответа' : 'Не взята · норма 15 минут', live: true };
  if (m < 30) return { cls: 'warn', label: `Демо · уведомление запасному: ${d.backup.name}`, live: true };
  return { cls: 'bad', label: 'Демо · уведомление владельцу', live: true };
}

export function slots(lead) {
  const base = new Date(); base.setSeconds(0, 0);
  if (lead.when === 'tomorrow') { base.setDate(base.getDate() + 1); base.setHours(11, 0); return [0, 3, 5].map(h => base.getTime() + h * HOUR); }
  let h = base.getHours() + 1;
  if (h < 10) h = 10;
  if (h > 17) { base.setDate(base.getDate() + 1); h = 10; }
  base.setHours(h, 0);
  return [0, 1.5, 3].map(x => base.getTime() + x * HOUR).filter(t => new Date(t).getHours() < 19);
}

export function leadCard(lead, { compact = false } = {}) {
  const p = priceFor(lead.device, lead.problem);
  const sla = slaOf(lead);
  const src = SOURCES[lead.source];
  const b = branch(lead.branch);
  const opts = [];
  if (p.copy) opts.push({ k: 'copy', label: 'Копия', price: p.copy });
  if (p.orig) opts.push({ k: 'orig', label: p.copy ? 'Оригинал' : 'Стоимость', price: p.orig });
  if (p.from) opts.push({ k: 'from', label: 'От', price: p.from });
  const booked = lead.booking;
  const canQuote = lead.status === 'new';

  return `
  <div class="lead-card" data-lead="${lead.id}">
    <div class="lead-top">
      <div>
        <div class="lead-no">Заявка №${lead.no}</div>
        <h3>${esc(lead.device)} · ${esc(PROBLEMS[lead.problem].ru)}</h3>
      </div>
      <div class="sla ${sla.cls}">
        ${sla.live ? `<b data-timer="${slaStart(lead)}">${elapsed(slaStart(lead))}</b>` : ic(sla.off ? 'moon' : 'check')}
        <span data-sla-id="${lead.id}">${esc(sla.label)}</span>
      </div>
    </div>

    <div class="lead-meta">
      <span class="chip" style="--c:${src.color}"><i class="dotc"></i>${src.label}</span>
      <span class="chip">${ic('map-pin')}${esc(b.short)}</span>
      <span class="chip">${ic('languages')}${lead.lang === 'kz' ? 'Қазақша' : 'Русский'}</span>
      <span class="chip">${ic('clock')}${lead.when === 'today' ? 'Хочет сегодня' : lead.when === 'tomorrow' ? 'Хочет завтра' : 'Время не выбрано'}</span>
    </div>

    <div class="lead-body">
      ${lead.photo ? `<img class="lead-photo" src="${esc(lead.photo)}" alt="Фото поломки">` : `<div class="lead-photo none">${ic('image-off')}<span>Без фото</span></div>`}
      <dl>
        <dt>Клиент</dt><dd>${esc(lead.client.name)} · <a href="tel:${esc(lead.client.phone)}">${esc(lead.client.phone)}</a></dd>
        <dt>Пришла</dt><dd>${hm(lead.createdAt)}, ${dayLabel(lead.createdAt)}</dd>
        <dt>Заявка</dt><dd>${lead.entry === 'manual' ? 'Внесена мастером' : 'С формы сайта'}: модель, поломка, филиал${lead.photo ? ', фото' : ''}</dd>
      </dl>
    </div>

    <div class="note">${lead.takenAt ? 'Взята в ' + hm(lead.takenAt) : 'Ещё не взята'}${lead.whatsappOpenedAt ? ' · WhatsApp открыт в ' + hm(lead.whatsappOpenedAt) : ''}${lead.firstResponseAt ? ' · отправка подтверждена мастером в ' + hm(lead.firstResponseAt) : ''}</div>
    ${canQuote && !lead.takenAt ? '<button class="btn ghost block" data-act="take">Взять заявку</button>' : ''}
    ${canQuote ? `
    <div class="quote">
      <div class="quote-h">${ic('tag')}Цена из прайса <small>демо-данные</small></div>
      <div class="quote-opts">
        ${opts.map((o, i) => `<label class="qopt"><input type="radio" name="q-${lead.id}" value="${o.k}" data-price="${o.price}" data-label="${o.label}" ${i === 0 ? 'checked' : ''}><span><em>${o.label}</em><b>${fmt(o.price)}</b></span></label>`).join('')}
        <label class="qopt custom"><input type="radio" name="q-${lead.id}" value="custom"><span><em>Своя цена</em><input type="number" inputmode="numeric" placeholder="₸" data-custom></span></label>
      </div>
      <div class="quote-f">${ic('timer')}${esc(p.time)} · гарантия ${p.warranty} мес${p.diag ? ' · диагностика бесплатно' : ''}</div>
      <button class="btn primary block" data-act="quote">${ic('send')}Открыть WhatsApp с ценой</button>
      ${lead.whatsappOpenedAt ? '<button class="btn primary block" data-act="confirm">Я отправил сообщение</button><p class="muted">Отметка мастера. Доставка не подтверждается.</p>' : ''}
      ${compact ? '' : `<button class="btn ghost block" data-act="call">${ic('phone')}Позвонить клиенту</button>`}
    </div>` : ''}

    ${lead.status === 'answered' && !booked ? `<div class="note">${ic('hourglass')}Мастер отметил отправку цены ${fmt(lead.quote || 0)} в ${hm(lead.firstResponseAt)}. Согласуйте время в WhatsApp и внесите запись ниже.</div>` : ''}
    ${lead.status === 'answered' && !booked ? `<div class="quote"><label class="fld"><span>Филиал записи</span><select data-book-branch>${BRANCHES.map(b => `<option value="${b.id}" ${b.id === lead.branch ? 'selected' : ''}>${esc(b.short)}</option>`).join('')}</select></label><div class="quick-times">${slots(lead).map(ts => `<button type="button" class="btn ghost sm" data-quick="${ts}">${dayLabel(ts)} ${hm(ts)}</button>`).join('')}</div><label class="fld"><span>Другое время</span><input type="datetime-local" data-book-time></label><button class="btn primary" data-act="book">Записать клиента</button></div>` : ''}
    ${booked ? `<div class="note ok">${ic('calendar-check')}Записан: ${esc(branch(booked.branch).short)}, ${dayLabel(booked.ts)} в ${hm(booked.ts)}. Заявка уже у мастера точки.</div>` : ''}
    ${lead.status === 'converted' ? `<div class="note ok">${ic('check-circle-2')}Стала заказом</div>` : ''}
    ${lead.status === 'lost' ? `<div class="note bad">${ic('user-x')}Потеряна: клиент не дождался ответа</div>` : ''}
  </div>`;
}

export function quoteText(lead, label, price) {
  const p = priceFor(lead.device, lead.problem);
  const b = branch(lead.branch);
  if (lead.lang === 'kz') {
    const priceLabel = { 'От': 'Бастапқы баға', 'Копия': 'Баламалы бөлшек', 'Оригинал': 'Түпнұсқа', 'Стоимость': 'Бағасы' }[label] || 'Бағасы';
    const place = lead.branch ? `${branchLabel(b, 'kz')}, ${branchAddress(b, 'kz')}` : 'Ыңғайлы филиалды бірге таңдаймыз.';
    return `${modelLabel(lead.device, 'kz')}, ${PROBLEMS[lead.problem].kz.toLowerCase()}.\n${priceLabel}: ${fmt(price)}\nУақыты: ${p.timeKz} · кепілдік ${p.warranty} ай\n${place}\nҚай уақытта келесіз?`;
  }
  return `${lead.device}, ${PROBLEMS[lead.problem].ru.toLowerCase()}.\n${label === 'От' ? 'Ориентировочно от' : label + ':'} ${fmt(price)}\nСрок: ${p.time} · гарантия ${p.warranty} мес${p.diag ? '\nДиагностика бесплатно, точную цену назовём после неё.' : ''}\n${b.name}, ${b.addr}\nНа какое время вас записать?`;
}

// Общая обработка кнопок карточки
export function bindLeadCard(root, rerender) {
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act], [data-quick]');
    if (!btn) return;
    const card = btn.closest('[data-lead]');
    if (!card) return;
    const lead = store.s.leads.find(l => l.id === card.dataset.lead);
    if (!lead) return;
    if (btn.dataset.quick) {   // быстрая кнопка времени: филиал уже выбран в заявке
      lead.branch = card.querySelector('[data-book-branch]')?.value || lead.branch;
      bookLead(lead, +btn.dataset.quick, lead.branch); toast('Клиент записан'); rerender(); return;
    }
    if (btn.dataset.act === 'take') { takeLead(lead); rerender(); }
    if (btn.dataset.act === 'confirm') { confirmReply(lead); toast('Ответ отмечен мастером'); rerender(); }
    if (btn.dataset.act === 'book') {
      const ts = new Date(card.querySelector('[data-book-time]').value).getTime();
      if (!Number.isFinite(ts) || ts < Date.now()) return toast('Выберите будущее время', 'alert-circle');
      lead.branch = card.querySelector('[data-book-branch]').value;
      bookLead(lead, ts, lead.branch); toast('Клиент записан'); rerender();
    }
    if (btn.dataset.act === 'quote' && !lead.takenAt) takeLead(lead);   // отдельная кнопка «Взять» больше не обязательна
    if (btn.dataset.act === 'quote') {
      const r = card.querySelector(`input[name="q-${lead.id}"]:checked`);
      let price = +r?.dataset.price, label = r?.dataset.label || 'Стоимость';
      if (r?.value === 'custom') { price = +card.querySelector('[data-custom]').value; label = 'Стоимость'; }
      if (!Number.isFinite(price) || price <= 0) { toast('Укажите цену', 'alert-circle'); return; }
      openLeadWhatsApp(lead, quoteText(lead, label, price), price);
      toast('Нажмите «Отправить» в WhatsApp, затем подтвердите здесь');
      rerender();
    }
    if (btn.dataset.act === 'call') window.location.href = 'tel:' + lead.client.phone;
  });
  root.addEventListener('focusin', e => { if (e.target.matches('[data-custom]')) e.target.closest('label').querySelector('input[type=radio]').checked = true; });
}

export function tickTimers(root) {
  root.querySelectorAll('[data-sla-id]').forEach(el => { const lead = store.s.leads.find(l => l.id === el.dataset.slaId); if (lead) { const sla = slaOf(lead); el.textContent = sla.label; if (el.parentElement.classList.contains('sla')) el.parentElement.className = 'sla ' + sla.cls; } });
  root.querySelectorAll('[data-timer]').forEach(el => { el.textContent = elapsed(+el.dataset.timer); });
}

export { bookLead, BRANCHES, icons };
