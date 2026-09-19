import { requestLang, saveRequestLang } from '../request-copy.js?v=202609200053';
import { STATUSES } from '../data.js?v=202609200053';
import { store, branch, staff, unpackOrder, receiptUrl, DAY } from '../store.js?v=202609200053';
import { esc, ic, icons, money, hm, dm, dmy, qrSvg } from '../ui.js?v=202609200053';

let lang = requestLang();
const L = {
  ru: { title: 'Квитанция', status: 'Статус ремонта', dev: 'Устройство', defect: 'Неисправность', cond: 'Состояние при приёме', none: 'без замечаний', works: 'Работы', total: 'Итого', prepaid: 'Предоплата', due: 'К оплате при получении', paid: 'Оплачено полностью', deadline: 'Срок готовности', warranty: 'Гарантия', months: 'мес', until: 'до', where: 'Где забрать', master: 'Мастер', call: 'Позвонить', route: 'Маршрут', print: 'Печать', back: 'Вернуться в систему', notfound: 'Квитанция не найдена', terms: 'Гарантия действует на выполненные работы и установленные детали. Не распространяется на механические повреждения и попадание влаги после ремонта. Сохраняйте эту ссылку — она заменяет бумажную квитанцию.', demo: 'Демо-квитанция. Не является фискальным чеком.', hours: 'Ежедневно 10:00–19:00' },
  kz: { title: 'Түбіртек', status: 'Жөндеу күйі', dev: 'Құрылғы', defect: 'Ақаулық', cond: 'Қабылдау кезіндегі күйі', none: 'ескертусіз', works: 'Жұмыстар', total: 'Барлығы', prepaid: 'Алдын ала төлем', due: 'Алған кезде төленеді', paid: 'Толық төленді', deadline: 'Дайын болу мерзімі', warranty: 'Кепілдік', months: 'ай', until: 'дейін', where: 'Қайдан алуға болады', master: 'Шебер', call: 'Қоңырау шалу', route: 'Бағыт', print: 'Басып шығару', back: 'Жүйеге оралу', notfound: 'Түбіртек табылмады', terms: 'Кепілдік орындалған жұмыстар мен орнатылған бөлшектерге беріледі. Жөндеуден кейінгі механикалық зақымдар мен ылғал тиюге қолданылмайды. Осы сілтемені сақтаңыз — ол қағаз түбіртекті алмастырады.', demo: 'Демо-түбіртек. Фискалдық чек емес.', hours: 'Күн сайын 10:00–19:00' },
};

export function mount(el, params) {
  const draw = () => {
    const o = store.s.orders.find(x => String(x.no) === String(params.no)) || (params.data && unpackOrder(params.data));
    const t = L[lang];
    if (!o) { el.innerHTML = `<div class="rc-page"><div class="rc"><h1>${t.notfound}</h1><a class="btn ghost" href="#/client">${t.back}</a></div></div>`; return; }
    const b = branch(o.branch);
    const flow = ['accepted', ...(o.parts.length ? ['waiting'] : []), 'work', 'ready', 'issued'];
    const idx = flow.indexOf(o.status);
    const due = Math.max(0, o.total - o.prepaid);
    const wEnd = (o.paidAt || o.deadline) + o.warranty * 30 * DAY;
    el.innerHTML = `
    <div class="rc-page">
      <div class="rc-bar">${o.shared ? '<span></span>' : `<a class="btn ghost sm" href="#/master">${ic('arrow-left')}${t.back}</a>`}<div class="seg sm"><button class="${lang === 'ru' ? 'on' : ''}" data-lang="ru">RU</button><button class="${lang === 'kz' ? 'on' : ''}" data-lang="kz">ҚАЗ</button></div></div>
      <article class="rc">
        <header><img src="img/alim-mark.svg" alt=""><div><b>Alim Service</b><small>${esc(b.name)} · ${esc(b.addr)}</small></div><div class="rc-no"><small>${t.title}</small><b>№${o.no}</b><small>${dmy(o.createdAt)} ${hm(o.createdAt)}</small></div></header>

        <section class="rc-status"><h3>${t.status}</h3>
          <ol>${flow.map((s, i) => { const S = STATUSES.find(x => x.id === s), h = o.history.find(x => x.st === s); return `<li class="${i < idx || o.status === 'issued' ? 'done' : i === idx ? 'cur' : ''}"><i>${i < idx || o.status === 'issued' ? ic('check') : ''}</i><div><b>${lang === 'kz' ? S.kz : S.label}</b>${h ? `<small>${dm(h.ts)} ${hm(h.ts)}</small>` : ''}</div></li>`; }).join('')}</ol>
        </section>

        <section class="rc-grid">
          <div><small>${t.dev}</small><b>${esc(o.device)}</b>${o.imei ? `<em>IMEI ${esc(o.imei)}</em>` : ''}</div>
          <div><small>${t.defect}</small><b>${esc(o.defect)}</b></div>
          <div><small>${t.cond}</small><b>${esc(o.condition.join(', ') || t.none)}</b></div>
          <div><small>${t.deadline}</small><b>${dmy(o.deadline)}, ${hm(o.deadline)}</b></div>
        </section>
        ${o.photos?.length ? `<div class="photos ro">${o.photos.map(p => `<figure><img src="${esc(p)}" alt=""></figure>`).join('')}</div>` : ''}

        <section class="bill"><h3>${t.works}</h3>${o.works.map(w => `<div><span>${esc(w.name)}</span><b>${money(w.price)}</b></div>`).join('')}
          <div class="tot"><span>${t.total}</span><b>${money(o.total)}</b></div>
          <div><span>${t.prepaid}</span><b>${money(o.prepaid)}</b></div>
          <div class="tot due"><span>${o.status === 'issued' ? t.paid : t.due}</span><b>${money(o.status === 'issued' ? o.total : due)}</b></div>
        </section>

        <section class="rc-w">${ic('shield-check')}<div><b>${t.warranty}: ${o.warranty} ${t.months}</b><small>${o.status === 'issued' ? `${t.until} ${dmy(wEnd)}` : ''}</small></div></section>

        <section class="rc-where"><h3>${t.where}</h3><p><b>${esc(b.name)}</b>, ${esc(b.addr)}<br>${t.hours} · ${t.master}: ${esc(staff(o.master)?.name || '—')}</p>
          <div class="row"><a class="btn primary" href="tel:${esc(b.phone.replace(/\s/g, ''))}">${ic('phone')}${t.call}</a><a class="btn ghost" href="https://2gis.kz/aktobe/search/${encodeURIComponent(b.addr)}" target="_blank" rel="noopener">${ic('navigation')}${t.route}</a><button class="btn ghost" data-print>${ic('printer')}${t.print}</button></div>
        </section>

        <footer>${qrSvg(receiptUrl(o), 120)}<p>${t.terms}<br><em>${t.demo}</em></p></footer>
      </article>
    </div>`;
    icons();
  };
  draw();
  el.addEventListener('click', e => {
    const l = e.target.closest('[data-lang]'); if (l) { lang = l.dataset.lang; saveRequestLang(lang); draw(); }
    if (e.target.closest('[data-print]')) window.print();
  });
}
