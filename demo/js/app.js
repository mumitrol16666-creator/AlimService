import { load, store, stats, dutyToday } from './store.js?v=202609201835';
import { $, ic, icons, toast, modal } from './ui.js?v=202609201835';
import * as client from './views/client.js?v=202609201835';
import * as duty from './views/duty.js?v=202609201835';
import * as master from './views/master.js?v=202609201835';
import * as owner from './views/owner.js?v=202609201835';
import * as receipt from './views/receipt.js?v=202609201835';
import { BRAND } from './brand.js?v=202609201835';

const NAV = [
  ['home', 'Сценарий', 'play-circle'],
  ['client', 'Клиент', 'message-circle'],
  ['duty', 'Дежурный', 'headset'],
  ['master', 'Точка', 'store'],
  ['owner', 'Владелец', 'line-chart'],
];

const home = {
  mount(el) {
    const st = stats('month');
    const steps = [
      ['client', 'message-circle', 'Клиент заполняет форму', 'Переход с сайта, 2ГИС или Instagram. Модель, поломка, телефон и филиал — в короткой форме. Номер заявки появляется сразу.', 'Сейчас: ответ по полдня'],
      ['duty', 'headset', 'Дежурный называет цену', 'Уведомление в Telegram → взять заявку → открыть WhatsApp с ценой → отправить вручную → подтвердить ответ. Через 15 и 30 минут без ответа — напоминания запасному и владельцу.', 'Сейчас: каждый отвечает со своего телефона'],
      ['master', 'clipboard-check', 'Приёмка в точке', 'Клиент пришёл — заявка уже заполнена. Мастер добавляет состояние, предоплату, деталь под заказ и нажимает одну кнопку.', 'Сейчас: номер и деталь в блокноте'],
      ['master', 'receipt', 'Квитанция и статусы', 'Клиент получает квитанцию по ссылке: что делают, сколько внёс, сколько осталось, гарантия. Мастер отправляет готовый текст в WhatsApp вручную.', 'Сейчас: «позвоните, узнайте»'],
      ['owner', 'line-chart', 'Владелец видит всё', 'Выручка по филиалам, предоплаты на руках, потерянные заявки, скорость ответа каждого мастера и окупаемость рекламы в 2ГИС.', 'Сейчас: цифры только на словах'],
    ];
    el.innerHTML = `
    <div class="home">
      <div class="home-h">
        <div class="logo-xl"><img class="brand-mark" src="${BRAND.mark}" alt=""><div><b>${BRAND.title}</b><small>${BRAND.tagline}</small></div></div>
        <div class="for">${ic('monitor-smartphone')}Демонстрация · ${BRAND.subtitle}</div>
      </div>
      <h1>От заявки клиента до&nbsp;выданного телефона — в&nbsp;одной системе</h1>
      <p class="lead">Пройдите путь одного клиента. Демо работает в этом браузере: Telegram имитируется, WhatsApp открывается с текстом, отправляете вы.</p>
      <ol class="steps">${steps.map(([r, i, t, d, was], n) => `<li><a href="#/${r}"><span class="n">${n + 1}</span>${ic(i)}<div><b>${t}</b><p>${d}</p><em>${was}</em></div>${ic('chevron-right')}</a></li>`).join('')}</ol>
      <div class="home-f">
        <a class="btn primary lg" href="#/client">${ic('play')}Начать показ</a>
        <button class="btn ghost" id="reset">${ic('rotate-ccw')}Сбросить демо-данные</button>
        <label class="switch"><input type="checkbox" id="ao" ${store.s.alwaysOpen ? 'checked' : ''}><i></i><span>Режим показа: считать, что сейчас рабочее время</span></label>
        ${BRAND.showPlatform ? `<span class="by">by ${BRAND.platform}</span>` : ''}
        <span class="muted">В демо загружено ${st.orders.length} заказов и ${st.leads.length} заявок за 30 дней — данные примерные.</span>
      </div>
    </div>`;
    icons();
    el.addEventListener('change', e => { if (e.target.id === 'ao') { store.s.alwaysOpen = e.target.checked; store.save(); toast(e.target.checked ? 'Таймеры работают как днём' : 'Вне графика форма сообщает об ответе после открытия', 'clock'); } });
    el.addEventListener('click', e => {
      if (!e.target.closest('#reset')) return;
      store.reset(); toast('Демо-данные сброшены', 'rotate-ccw'); route();
    });
  },
};

const VIEWS = { home, client, duty, master, owner, r: receipt };
let unmount = null;

function shell() {
  $('#app').innerHTML = `
  <nav class="rail" id="rail">
    <a class="rail-logo" href="#/home" title="${BRAND.title}"><img class="brand-mark" src="${BRAND.mark}" alt=""></a>
    <div class="rail-nav">${NAV.map(([k, n, i]) => `<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${n}</span><i class="bdg" data-bdg="${k}" hidden></i></a>`).join('')}</div>
    <div class="rail-f"><span class="demo-tag">демо</span>${BRAND.showPlatform ? `<span class="rail-by">by ${BRAND.platform}</span>` : ''}</div>
  </nav>
  <main id="view"></main>`;
  icons();
}

function badges() {
  const n = store.s.leads.filter(l => l.status === 'new').length;
  const b = $('[data-bdg="duty"]'); if (b) { b.hidden = !n; b.textContent = n; }
  const t0 = new Date().setHours(0, 0, 0, 0);
  const m = store.s.leads.filter(l => l.status === 'booked' && l.booking.ts >= t0 && l.booking.ts < t0 + 2 * 864e5).length;
  const bm = $('[data-bdg="master"]'); if (bm) { bm.hidden = !m; bm.textContent = m; }
}

function route() {
  const [name = 'home', arg, data] = location.hash.replace(/^#\/?/, '').split('/');
  const key = VIEWS[name] ? name : 'home';
  if (unmount) { try { unmount(); } catch {} unmount = null; }
  document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
  document.body.classList.toggle('public', key === 'r');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === key));
  const old = $('#view'), el = old.cloneNode(false); old.replaceWith(el); // сбрасываем старые обработчики
  el.className = 'view v-' + key;
  unmount = VIEWS[key].mount(el, { no: arg, data }) || null;
  badges();
  window.scrollTo(0, 0);
}

load();
shell();
store.subscribe(badges);
addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
