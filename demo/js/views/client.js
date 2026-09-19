import { BRANCHES, DEVICES, PROBLEMS, SOURCES } from '../data.js';
import { store, newLead, isOpen } from '../store.js';
import { esc, ic, icons, shrinkImage, toast } from '../ui.js';

export function formMarkup(manual = false) {
  return `<form id="request-form" class="request-form">
    <div class="cols2">
      <label class="fld"><span>Модель</span><select name="model">${Object.values(DEVICES).flatMap(d => d.models).map(m => `<option>${esc(m)}</option>`).join('')}<option>Не знаю модель</option></select></label>
      <label class="fld"><span>Что случилось</span><select name="problem">${Object.entries(PROBLEMS).map(([k,v]) => `<option value="${k}">${k === 'other' ? 'Другое / не знаю' : v.ru}</option>`).join('')}</select></label>
      <label class="fld"><span>Филиал</span><select name="branch"><option value="">Помогите выбрать</option>${BRANCHES.map(b => `<option value="${b.id}">${esc(b.short)}</option>`).join('')}</select></label>
      <label class="fld"><span>Телефон WhatsApp *</span><input name="phone" type="tel" required autocomplete="tel" placeholder="+7 700 000 00 00"></label>
      <label class="fld"><span>Как к вам обращаться</span><input name="name" autocomplete="given-name" placeholder="Имя, необязательно" maxlength="80"></label>
      <label class="fld"><span>${manual ? 'Откуда узнали о сервисе' : 'Переход на форму из'}</span><select name="source">${Object.entries(SOURCES).map(([k,v]) => `<option value="${k}" ${k === 'site' ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    </div>
    <label class="fld"><span>Фото поломки · необязательно</span><input name="photo" type="file" accept="image/*"></label>
    <p class="muted">Демонстрация: заявка сохранится только в этом браузере. Используйте вымышленные контакты. Telegram не подключён.</p>
    <button class="btn primary lg" type="submit">${ic('plus')}${manual ? 'Создать заявку' : 'Отправить заявку'}</button>
    <p role="status" data-form-status></p>
  </form>`;
}

export function bindRequestForm(root, done, manual = false) {
  let busy = false;
  root.addEventListener('submit', async e => {
    if (e.target.id !== 'request-form') return;
    e.preventDefault(); if (busy) return;
    const form = e.target, data = new FormData(form);
    const phone = String(data.get('phone')).replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7');
    if (!/^7\d{10}$/.test(phone)) { form.querySelector('[data-form-status]').textContent = 'Укажите телефон: +7 и ещё 10 цифр.'; return; }
    busy = true; const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const file = data.get('photo');
      if (file?.size > 10 * 1024 * 1024) throw new Error('Фото должно быть меньше 10 МБ.');
      const photo = file?.size ? await shrinkImage(file) : null;
      if (file?.size && !photo) throw new Error('Не удалось прочитать фото. Выберите другое.');
      if (!root.isConnected) return;
      const lead = newLead({ channel: data.get('source'), lang: 'ru', name: String(data.get('name')).trim() || 'Клиент', phone: '+' + phone, model: data.get('model'), problem: data.get('problem'), branch: data.get('branch'), photo, when: 'later', entry: manual ? 'manual' : 'form' });
      done(lead);
    } catch (err) { form.querySelector('[data-form-status]').textContent = err.message; }
    finally { busy = false; button.disabled = false; }
  });
}

export function mount(el) {
  const draw = () => {
    const lead = store.s.leads.find(l => l.id === store.s.lastFormLead);
    el.innerHTML = `<header class="vh"><div><h1>Заявка на ремонт</h1><p class="muted">Alim Service · форма на сайте</p></div><span class="demo-tag">демо</span></header>
      <div class="request-layout"><section class="card">${lead ? `<div class="ok-ic">${ic('check')}</div><h2>Заявка №${lead.no} принята</h2><p>${esc(lead.device)} · ${esc(PROBLEMS[lead.problem].ru)}</p><p>${isOpen() ? 'В рабочей версии мастер ответит в течение 15 минут в рабочее время.' : 'Сейчас сервис закрыт. Мастер ответит после открытия, с 10:00.'}</p><p class="muted">Демо: заявка сохранена в этом браузере. Сообщения не отправлены.</p><a class="btn primary" href="#/duty/${lead.id}">Посмотреть заявку у дежурного</a><button class="btn ghost" data-new>Ещё одна заявка</button>` : formMarkup()}</section>
      <aside class="panel"><div class="panel-h">${ic('send')}Что произойдёт дальше</div><ol class="request-steps"><li>Заявка появится у дежурного.</li><li>В рабочей версии Telegram уведомит мастера.</li><li>Мастер уточнит цену и напишет вам в WhatsApp.</li></ol><p class="muted">Заполнять чат с ботом не нужно. Фото и имя необязательны.</p></aside></div>`;
    icons();
  };
  draw();
  bindRequestForm(el, lead => { store.s.lastFormLead = lead.id; store.save(); draw(); });
  el.addEventListener('click', e => { if (e.target.closest('[data-new]')) { store.s.lastFormLead = null; store.save(); draw(); } });
}
