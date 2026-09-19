import { BRANCHES, DEVICES, PROBLEMS, SOURCES, T } from '../data.js';
import { store, newLeadFromChat, bookLead, dutyToday, isOpen, branch, HOUR } from '../store.js';
import { $, esc, ic, icons, hm, dayLabel, shrinkImage } from '../ui.js';
import { leadCard, bindLeadCard, tickTimers } from './lead.js';

const CHANNELS = {
  '2gis':  { label: 'WhatsApp', sub: 'переход из 2ГИС', cls: 'wa', icon: 'message-circle' },
  'insta': { label: 'Instagram', sub: 'директ', cls: 'ig', icon: 'instagram' },
  'site':  { label: 'Сайт', sub: 'виджет на сайте', cls: 'web', icon: 'globe' },
};
const PROFILE = { name: 'Владислав', phone: '+7 701 555 01 23' };

let typing = false, timer, root;

const chat = () => store.s.chat;
const t = k => T[chat().lang || 'ru'][k];
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

function fresh(channel = '2gis') {
  store.s.chat = { channel, lang: null, step: 'lang', msgs: [], data: {}, leadId: null, phone: null };
  store.save();
  say(`${T.ru.hello}\n\n${T.kz.hello}`, 300, () => say('На каком языке удобнее? / Қай тілде ыңғайлы?', 500));
}

function push(m) { chat().msgs.push({ ts: Date.now(), ...m }); store.save(); }

function say(text, delay = 600, then) {
  typing = true; draw();
  setTimeout(() => { typing = false; push({ from: 'bot', text }); draw(); then && then(); }, delay);
}

function chips() {
  const c = chat(), L = c.lang || 'ru';
  switch (c.step) {
    case 'lang': return [['ru', 'Русский'], ['kz', 'Қазақша']];
    case 'device': return Object.entries(DEVICES).map(([k, v]) => [k, L === 'kz' && v.kz ? v.kz : v.label]);
    case 'model': return DEVICES[c.data.deviceKey].models.map(m => [m, m]);
    case 'problem': return Object.entries(PROBLEMS).map(([k, v]) => [k, v[L]]);
    case 'photo': return [['photo', t('photoBtn')], ['skip', t('skip')]];
    case 'branch': return [...BRANCHES.map(b => [b.id, b.short]), ['near', t('near')]];
    case 'when': return [...(new Date().getHours() < 17 ? [['today', t('today')]] : []), ['tomorrow', t('tomorrow')], ['later', t('later')]];
    case 'phone': return [['share', t('share')]];
    case 'slots': {
      const last = [...c.msgs].reverse().find(m => m.slots);
      return [...(last?.slots || []).map(ts => ['slot:' + ts, `${dayLabel(ts)} ${hm(ts)}`]), ['other', t('other')]];
    }
    default: return [];
  }
}

function answer(key, label) {
  const c = chat(), d = c.data;
  if (typing) return;
  push({ from: 'client', text: label });
  switch (c.step) {
    case 'lang': c.lang = key; c.step = 'device'; say(t('device')); break;
    case 'device': d.deviceKey = key; c.step = 'model'; say(t('model')); break;
    case 'model': d.model = key; c.step = 'problem'; say(t('problem')); break;
    case 'problem': d.problem = key; c.step = 'photo'; say(t('photo')); break;
    case 'photo':
      if (key === 'photo') {
        d.photo = d.problem === 'back' ? 'img/broken2.jpg' : 'img/broken.jpg';
        c.msgs.pop(); push({ from: 'client', img: d.photo });
      }
      c.step = 'branch'; say(t('branch')); break;
    case 'branch':
      if (key === 'near') { d.branch = 'nektar'; c.step = 'when'; say(fill(t('nearAns'), { b: branch('nektar').name + ', ' + branch('nektar').addr }), 900, () => say(t('when'), 400)); }
      else { d.branch = key; c.step = 'when'; say(t('when')); }
      break;
    case 'when':
      d.when = key;
      if (c.channel === '2gis') { d.name = PROFILE.name; c.phone = PROFILE.phone; finish(); }
      else { c.step = 'name'; say(t('name')); }
      break;
    case 'name': d.name = label.trim().split(' ')[0] || 'Клиент'; c.step = 'phone'; say(t('phone')); break;
    case 'phone': c.phone = key === 'share' ? PROFILE.phone : label.trim(); if (key === 'share') { c.msgs.pop(); push({ from: 'client', text: PROFILE.phone }); } finish(); break;
    case 'slots':
      if (key === 'other') {
        const b = new Date(); b.setDate(b.getDate() + 1); b.setHours(11, 0, 0, 0);
        const lead = store.s.leads.find(l => l.id === c.leadId);
        const m = { from: 'bot', text: c.lang === 'kz' ? 'Ертеңге бос уақыттар:' : 'Свободное время на завтра:', slots: [0, 2, 4, 6].map(h => b.getTime() + h * HOUR) };
        typing = true; draw(); setTimeout(() => { typing = false; push(m); draw(); }, 500);
        if (lead) lead.when = 'tomorrow';
      } else {
        const ts = +key.split(':')[1];
        const lead = store.s.leads.find(l => l.id === c.leadId);
        bookLead(lead, ts);
        c.step = 'booked';
        const b = branch(lead.branch);
        say(fill(t('booked'), { b: b.name, d: dayLabel(ts), t: hm(ts), a: b.addr }), 700);
      }
      break;
  }
  store.save(); draw();
}

function finish() {
  const c = chat(), d = c.data;
  const lead = newLeadFromChat({ channel: c.channel, lang: c.lang, name: d.name, phone: c.phone, model: d.model, problem: d.problem, branch: d.branch, photo: d.photo, when: d.when });
  c.leadId = lead.id; c.step = 'wait';
  say(fill(t(isOpen() ? 'done' : 'doneOff'), { n: d.name, no: lead.no, m: dutyToday().main.name }), 700);
}

function onText(text) {
  const c = chat();
  if (!text.trim() || typing) return;
  if (['model', 'name', 'phone'].includes(c.step)) return answer(text.trim(), text.trim());
  push({ from: 'client', text });
  if (c.step === 'wait' || c.step === 'booked') say(c.lang === 'kz' ? 'Хабарламаңызды шеберге жібердім 👌' : 'Передал ваше сообщение мастеру 👌');
  else say(c.lang === 'kz' ? 'Төмендегі батырманы таңдаңыз 👇' : 'Выберите вариант кнопкой ниже 👇');
}

// ---------- render ----------
function bubble(m) {
  const who = m.from === 'client' ? 'me' : m.from;
  const label = m.from === 'master' ? `<small class="who">${ic('wrench')}Мастер ${esc(dutyToday().main.name)}</small>` : m.from === 'system' ? `<small class="who">${ic('bell')}Alim Service</small>` : '';
  const body = m.img ? `<img src="${esc(m.img)}" alt="">` : esc(m.text).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<u>$1</u>');
  const link = m.link ? `<a class="blink" href="${m.link}">${ic('receipt')}Открыть квитанцию</a>` : '';
  return `<div class="b ${who}">${label}${body}${link}<time>${hm(m.ts)}</time></div>`;
}

function checklist() {
  const c = chat(), d = c.data;
  const rows = [
    ['Канал', SOURCES[c.channel].label, true], ['Язык', c.lang ? (c.lang === 'kz' ? 'Қазақша' : 'Русский') : '', !!c.lang],
    ['Устройство', d.model || '', !!d.model], ['Поломка', d.problem ? PROBLEMS[d.problem].ru : '', !!d.problem],
    ['Фото', d.photo ? 'есть' : (['branch', 'when', 'name', 'phone'].includes(c.step) ? 'без фото' : ''), !!d.photo || ['branch', 'when', 'name', 'phone'].includes(c.step)],
    ['Филиал', d.branch ? branch(d.branch).short : '', !!d.branch], ['Когда удобно', d.when ? { today: 'сегодня', tomorrow: 'завтра', later: 'позже' }[d.when] : '', !!d.when],
    ['Клиент', d.name ? `${d.name} · ${c.phone || '…'}` : '', !!c.phone],
  ];
  return `<div class="panel">
    <div class="panel-h"><span class="pulse"></span>Бот собирает заявку</div>
    <p class="muted">Клиент получает ответ сразу, в любое время суток. Мастеру придёт готовая карточка — без переспрашиваний.</p>
    <ul class="check">${rows.map(([k, v, ok]) => `<li class="${ok ? 'ok' : ''}">${ic(ok ? 'check-circle-2' : 'circle')}<span>${k}</span><b>${esc(v)}</b></li>`).join('')}</ul>
  </div>`;
}

function side() {
  const c = chat();
  const lead = c.leadId && store.s.leads.find(l => l.id === c.leadId);
  if (!lead) return checklist();
  return `<div class="panel-h dark">${ic('monitor-smartphone')}Это видит дежурный мастер — ${esc(dutyToday().main.name)}</div>
    ${leadCard(lead, { compact: true })}
    ${lead.status === 'booked' ? `<a class="btn primary block" href="#/master">${ic('arrow-right')}Дальше: клиент пришёл в точку</a>` : ''}`;
}

function draw() {
  if (!root || !root.isConnected) return;
  const c = chat(), ch = CHANNELS[c.channel];
  const cs = typing ? [] : chips();
  const textStep = ['model', 'name', 'phone'].includes(c.step);
  root.innerHTML = `
  <div class="client-grid">
    <div class="phone-col">
      <div class="seg" role="tablist">${Object.entries(CHANNELS).map(([k, v]) => `<button class="${k === c.channel ? 'on' : ''}" data-ch="${k}">${ic(v.icon)}${v.label}</button>`).join('')}</div>
      <div class="device ${ch.cls}">
        <div class="chat-h"><img src="img/alim-mark.svg" alt=""><div><b>Alim Service</b><small>${ch.sub} · отвечает сразу</small></div><button class="icon-btn" data-new title="Новый диалог">${ic('rotate-ccw')}</button></div>
        <div class="chat-b" id="chat-b">${c.msgs.map(bubble).join('')}${typing ? `<div class="b bot typing"><i></i><i></i><i></i></div>` : ''}</div>
        ${cs.length ? `<div class="chips">${cs.map(([k, l]) => `<button data-chip="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
        <form class="chat-f" id="chat-f"><label class="icon-btn">${ic('paperclip')}<input type="file" accept="image/*" hidden id="chat-file"></label><input id="chat-i" autocomplete="off" placeholder="${esc(textStep ? (c.step === 'model' ? t('modelType') : c.step === 'phone' ? '+7 …' : t('name')) : t('placeholder'))}" ${c.step === 'phone' ? 'inputmode="tel"' : ''}><button class="send" aria-label="Отправить">${ic('send')}</button></form>
      </div>
    </div>
    <div class="side-col" id="side">${side()}</div>
  </div>`;
  icons();
  const b = $('#chat-b', root); b.scrollTop = b.scrollHeight;
}

export function mount(el) {
  root = el;
  if (!chat()) fresh(); else draw();
  bindLeadCard(el, draw);
  el.addEventListener('click', e => {
    const chip = e.target.closest('[data-chip]'); if (chip) return answer(chip.dataset.chip, chip.textContent);
    const ch = e.target.closest('[data-ch]'); if (ch) return fresh(ch.dataset.ch);
    if (e.target.closest('[data-new]')) return fresh(chat().channel);
  });
  el.addEventListener('submit', e => { e.preventDefault(); const i = $('#chat-i', el); const v = i.value; i.value = ''; onText(v); });
  el.addEventListener('change', async e => {
    if (e.target.id !== 'chat-file' || !e.target.files[0]) return;
    const img = await shrinkImage(e.target.files[0]);
    if (!img) return;
    const c = chat();
    if (c.step === 'photo') { c.data.photo = img; push({ from: 'client', img }); c.step = 'branch'; say(t('branch')); }
    else push({ from: 'client', img });
    draw();
  });
  timer = setInterval(() => tickTimers(el), 1000);
  return () => clearInterval(timer);
}
