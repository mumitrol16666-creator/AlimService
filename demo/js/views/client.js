import { BRANCHES, DEVICES, PROBLEMS, SOURCES } from '../data.js';
import { store, newLead, isOpen } from '../store.js';
import { esc, ic, icons, shrinkImage } from '../ui.js';
import { REQUEST_COPY, requestLang, saveRequestLang, modelLabel, modelValue, branchLabel, branchAddress } from '../request-copy.js';

const languageSwitch = lang => `<div class="request-language" role="group" aria-label="${REQUEST_COPY[lang].language}"><button type="button" data-request-lang="ru" aria-pressed="${lang === 'ru'}" lang="ru">RU</button><button type="button" data-request-lang="kz" aria-pressed="${lang === 'kz'}" lang="kk">ҚАЗ</button></div>`;
const sourceLabel = (key, lang) => key === 'walk' ? REQUEST_COPY[lang].walk : key === 'site' ? REQUEST_COPY[lang].site : SOURCES[key].label;
const checked = (a, b) => a === b ? 'checked' : '';
function modelsMarkup(brand, model, lang) {
  return [...DEVICES[brand].models, 'Не знаю модель'].map(m => `<button type="button" data-model="${esc(m)}" aria-pressed="${model === m}">${esc(modelLabel(m, lang))}</button>`).join('');
}

export function formMarkup(manual = false, lang = requestLang(), draft = {}) {
  const t = REQUEST_COPY[lang], d = { brand: 'iphone', model: '', problem: '', branch: '', phone: '', name: '', source: 'site', ...draft };
  return `<form id="request-form" class="request-form" data-lang="${lang}" lang="${lang === 'kz' ? 'kk' : 'ru'}" novalidate>
    <div class="request-form-top"><span class="request-eyebrow">ALIM SERVICE <span>· ${manual ? 'CRM' : 'АҚТӨБЕ / АКТОБЕ'}</span></span>${languageSwitch(lang)}</div>
    <section class="request-section" aria-labelledby="device-title">
      <h2 id="device-title"><span class="request-number">01</span>${t.deviceStep}</h2>
      <fieldset class="request-brands"><legend class="sr-only">${t.deviceLabel}</legend>${Object.entries(DEVICES).map(([key,v]) => `<label><input type="radio" name="brand" value="${key}" ${checked(d.brand,key)}><span>${key === 'other' ? t.otherDevice : esc(v.label)}</span></label>`).join('')}</fieldset>
      <label class="request-field"><span>${t.model} <em>*</em></span><input name="model" value="${esc(modelLabel(d.model,lang))}" placeholder="${t.modelHint}" maxlength="100" autocomplete="off" required aria-describedby="model-help"></label>
      <div class="model-suggestions" role="group" aria-label="${t.model}">${modelsMarkup(d.brand,d.model,lang)}</div>
      <p class="request-help" id="model-help">${t.modelHelp}</p>
      <fieldset class="problem-choices"><legend>${t.problem} <em>*</em></legend>${Object.entries(PROBLEMS).map(([key,v]) => `<label><input type="radio" name="problem" value="${key}" ${checked(d.problem,key)} required><span>${ic(v.icon)}${key === 'other' ? t.otherProblem : esc(v[lang])}</span></label>`).join('')}</fieldset>
      <div class="request-photo-area"><label class="request-photo"><input type="file" name="photo" accept="image/*" aria-label="${t.photo}"><span class="upload-symbol">${ic('camera')}</span><span><b>${t.photo}</b><small>${t.optional} · ${t.photoHint}</small></span>${ic('plus')}</label><div class="photo-preview" hidden></div></div>
    </section>
    <section class="request-section" aria-labelledby="contact-title">
      <h2 id="contact-title"><span class="request-number">02</span>${t.contactStep}</h2>
      <fieldset class="branch-choices"><legend>${t.branch}</legend>${[{id:'',short:t.helpBranch,addr:t.helpBranchNote}, ...BRANCHES].map(b => `<label><input type="radio" name="branch" value="${b.id}" ${checked(d.branch,b.id)}><span>${ic(b.id ? 'map-pin' : 'message-circle')}<span><b>${b.id ? esc(branchLabel(b,lang)) : t.helpBranch}</b><small>${b.id ? esc(branchAddress(b,lang)) : t.helpBranchNote}</small></span><i class="choice-dot"></i></span></label>`).join('')}</fieldset>
      <div class="request-contact-grid"><label class="request-field"><span>${t.phone} <em>*</em></span><input name="phone" type="tel" required autocomplete="tel" placeholder="+7 700 000 00 00" value="${esc(d.phone)}" maxlength="24"><small>${t.phoneHelp}</small></label><label class="request-field"><span>${t.name} <small>· ${t.optional}</small></span><input name="name" autocomplete="given-name" placeholder="${t.nameHint}" maxlength="80" value="${esc(d.name)}"></label></div>
      ${manual ? `<fieldset class="request-sources"><legend>${t.source}</legend>${Object.keys(SOURCES).map(key => `<label><input type="radio" name="source" value="${key}" ${checked(d.source,key)}><span>${sourceLabel(key,lang)}</span></label>`).join('')}</fieldset>` : `<input type="hidden" name="source" value="${esc(d.source)}">`}
    </section>
    <div class="request-submit"><p class="request-error" role="alert" data-form-status></p><button class="btn primary lg" type="submit">${manual ? t.create : t.submit}${ic('arrow-up-right')}</button><p class="request-demo">${ic('info')}<span>${t.demo}</span></p></div>
  </form>`;
}

function readDraft(form) {
  const data = new FormData(form);
  return Object.fromEntries(['brand','model','problem','branch','phone','name','source'].map(key => [key,key === 'model' ? modelValue(String(data.get(key) || '').trim()) : String(data.get(key) || '')]));
}

export function bindRequestForm(root, done, manual = false, onLanguage = () => {}) {
  let busy = false;
  const showError = (form, message, name) => {
    form.querySelector('[data-form-status]').textContent = message;
    const field = name && form.querySelector(`[name="${name}"]`);
    field?.setAttribute('aria-invalid','true'); field?.focus();
  };
  const refreshPhoto = form => {
    const input = form.querySelector('[name=photo]'), file = input.files[0], preview = form.querySelector('.photo-preview'), t = REQUEST_COPY[form.dataset.lang];
    preview.hidden = !file;
    preview.replaceChildren();
    if (!file) return;
    if (file.size > 10*1024*1024) { input.value=''; preview.hidden=true; showError(form,t.photoSize); return; }
    const img = document.createElement('img'), url = URL.createObjectURL(file);
    img.alt = t.photoAlt; img.onload = img.onerror = () => URL.revokeObjectURL(url); img.src = url;
    const name = document.createElement('span'); name.textContent = file.name;
    const remove = document.createElement('button'); remove.type='button'; remove.dataset.removePhoto=''; remove.textContent=t.removePhoto;
    preview.append(img,name,remove);
  };
  root.addEventListener('click', e => {
    const form = e.target.closest('#request-form'); if (!form || busy) return;
    const langButton = e.target.closest('[data-request-lang]');
    if (langButton) {
      const lang = langButton.dataset.requestLang;
      if (lang === form.dataset.lang) return;
      const draft = readDraft(form), photo = form.querySelector('[name=photo]');
      form.outerHTML = formMarkup(manual,lang,draft);
      const next = root.querySelector('#request-form');
      photo.setAttribute('aria-label',REQUEST_COPY[lang].photo);
      next.querySelector('[name=photo]').replaceWith(photo);
      saveRequestLang(lang); refreshPhoto(next); icons(); onLanguage(lang);
      next.querySelector(`[data-request-lang="${lang}"]`).focus(); return;
    }
    const model = e.target.closest('[data-model]');
    if (model) {
      form.elements.model.value = modelLabel(model.dataset.model,form.dataset.lang);
      form.elements.model.removeAttribute('aria-invalid');
      form.querySelectorAll('[data-model]').forEach(b => b.setAttribute('aria-pressed',String(b===model)));
    }
    if (e.target.closest('[data-remove-photo]')) { form.elements.photo.value=''; refreshPhoto(form); }
  });
  root.addEventListener('change', e => {
    const form = e.target.closest('#request-form'); if (!form || busy) return;
    if (e.target.name === 'brand') {
      form.elements.model.value=''; form.querySelector('.model-suggestions').innerHTML = modelsMarkup(e.target.value,'',form.dataset.lang);
    }
    if (e.target.name === 'photo') { form.querySelector('[data-form-status]').textContent=''; refreshPhoto(form); }
    e.target.removeAttribute('aria-invalid');
  });
  root.addEventListener('input', e => {
    const form = e.target.closest('#request-form'); if (!form) return;
    e.target.removeAttribute('aria-invalid');
    if (e.target.name === 'model') form.querySelectorAll('[data-model]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.model === modelValue(e.target.value))));
  });
  root.addEventListener('submit', async e => {
    if (e.target.id !== 'request-form') return;
    e.preventDefault(); if (busy) return;
    const form=e.target, d=readDraft(form), lang=form.dataset.lang, t=REQUEST_COPY[lang];
    const phone=d.phone.replace(/\D/g,'').replace(/^8(?=\d{10}$)/,'7');
    if (!d.model) return showError(form,t.modelError,'model');
    if (!d.problem) return showError(form,t.problemError,'problem');
    if (!/^7\d{10}$/.test(phone)) return showError(form,t.phoneError,'phone');
    busy=true; const button=form.querySelector('[type=submit]'), before=button.innerHTML;
    const controls = [...form.querySelectorAll('input,button')]; controls.forEach(c => c.disabled=true); button.textContent=t.sending;
    try {
      const file=form.elements.photo.files[0];
      if (file?.size > 10*1024*1024) throw new Error(t.photoSize);
      const photo=file?.size ? await shrinkImage(file) : null;
      if (file?.size && !photo) throw new Error(t.photoError);
      if (!form.isConnected) return;
      const lead=newLead({ channel:d.source, lang, name:d.name.trim() || t.client, phone:'+'+phone, model:d.model, problem:d.problem, branch:d.branch, photo, when:'later', entry:manual ? 'manual' : 'form' });
      done(lead);
    } catch (err) { showError(form,err.message); }
    finally { busy=false; controls.forEach(c => c.disabled=false); button.innerHTML=before; icons(); }
  });
}

export function mount(el) {
  let lang=requestLang();
  const lead = () => store.s.leads.find(l => l.id === store.s.lastFormLead);
  const surrounding = () => {
    const t=REQUEST_COPY[lang]; el.lang=lang === 'kz' ? 'kk' : 'ru';
    el.querySelector('[data-request-heading]').textContent=t.title;
    el.querySelector('[data-request-subtitle]').textContent=t.subtitle;
    el.querySelector('[data-request-aside]').innerHTML=`<div class="request-aside-icon">${ic('message-circle')}</div><h2>${t.next}</h2><ol>${t.steps.map((s,i) => `<li><span>${i+1}</span><p>${s}</p></li>`).join('')}</ol><div class="request-hours">${ic('clock')}<span>${t.hours}</span></div><p class="request-help">${t.optionalNote}</p>`;
    icons();
  };
  const draw = () => {
    const t=REQUEST_COPY[lang], l=lead();
    el.innerHTML=`<header class="vh request-header"><div><h1 data-request-heading></h1><p class="muted" data-request-subtitle></p></div></header><div class="request-layout"><section class="request-card">${l ? `<div class="request-form-top"><span class="request-eyebrow">ALIM SERVICE</span>${languageSwitch(lang)}</div><div class="request-success"><div class="ok-ic">${ic('check')}</div><h2 tabindex="-1">${t.accepted(l.no)}</h2><p>${esc(modelLabel(l.device,lang))} · ${esc(PROBLEMS[l.problem][lang])}</p><p>${isOpen() ? t.reply : t.replyOff}</p><div class="request-success-actions"><a class="btn primary" href="#/duty/${l.id}">${t.seeDuty}</a><button class="btn ghost" data-new>${t.another}</button></div><p class="request-help">${t.saved}</p></div>` : formMarkup(false,lang)}</section><aside class="request-aside" data-request-aside></aside></div>`;
    surrounding();
  };
  draw();
  bindRequestForm(el,l => {store.s.lastFormLead=l.id;store.save();draw();el.querySelector('.request-success h2').focus();},false,next => {lang=next;surrounding();});
  el.addEventListener('click',e => {
    const language=e.target.closest('[data-request-lang]');
    if (language && !e.target.closest('#request-form')) {lang=language.dataset.requestLang;saveRequestLang(lang);draw();}
    if (e.target.closest('[data-new]')) {store.s.lastFormLead=null;store.save();draw();}
  });
}
