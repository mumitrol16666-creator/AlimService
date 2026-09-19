// Справочники демо: филиалы, мастера, прайс, тексты бота (RU/KZ).
// Все цены и цифры — демонстрационные.

export const BRANCHES = [
  { id: 'mir',    short: 'БЦ «Мир»',        name: 'БЦ «Мир»',        addr: 'пр. Абилкайыр-хана, 85',     phone: '+7 747 799 99 10' },
  { id: 'nektar', short: 'ТД «Нектар»',     name: 'ТД «Нектар»',     addr: 'ул. Нагашбай Шайкенова, 6',   phone: '+7 778 004 91 04' },
  { id: 'ah29',   short: 'Абилкайыр-хана',  name: 'Абилкайыр-хана',  addr: 'пр. Абилкайыр-хана, 29',     phone: '+7 705 180 33 95' },
  { id: 'sh4',    short: 'Шайкенова',       name: 'Шайкенова',       addr: 'ул. Нагашбай Шайкенова, 4',   phone: '+7 747 568 10 90' },
];

export const STAFF = [
  { id: 'erlan',   name: 'Ерлан',     branch: 'mir' },
  { id: 'aidos',   name: 'Айдос',     branch: 'mir' },
  { id: 'daniyar', name: 'Данияр',    branch: 'nektar' },
  { id: 'nursultan', name: 'Нурсултан', branch: 'nektar' },
  { id: 'baur',    name: 'Бауыржан',  branch: 'ah29' },
  { id: 'madiyar', name: 'Мадияр',    branch: 'sh4' },
];

// Дежурный по дням недели (0 = воскресенье) и запасной на эскалацию
export const DUTY = {
  0: ['madiyar', 'baur'], 1: ['erlan', 'daniyar'], 2: ['daniyar', 'erlan'], 3: ['baur', 'aidos'],
  4: ['erlan', 'madiyar'], 5: ['nursultan', 'baur'], 6: ['aidos', 'daniyar'],
};

export const SOURCES = {
  '2gis':  { label: '2ГИС',        color: '#19a34a' },
  'insta': { label: 'Instagram',   color: '#d6249f' },
  'site':  { label: 'Сайт',        color: '#4f46e5' },
  'walk':  { label: 'Пришёл сам',  color: '#9ca3af' },
};

export const STATUSES = [
  { id: 'accepted', label: 'Принят',       kz: 'Қабылданды',     color: '#64748b' },
  { id: 'waiting',  label: 'Ждём деталь',  kz: 'Бөлшек күтілуде', color: '#d97706' },
  { id: 'work',     label: 'В работе',     kz: 'Жөнделуде',      color: '#2563eb' },
  { id: 'ready',    label: 'Готов',        kz: 'Дайын',          color: '#16a34a' },
  { id: 'issued',   label: 'Выдан',        kz: 'Берілді',        color: '#111827' },
];

export const DEVICES = {
  iphone:  { label: 'iPhone',  models: ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16'] },
  samsung: { label: 'Samsung', models: ['Galaxy A-серия', 'Galaxy S-серия', 'Galaxy Note'] },
  xiaomi:  { label: 'Xiaomi / Redmi', models: ['Redmi Note', 'Redmi', 'Xiaomi / Poco'] },
  other:   { label: 'Другое',  kz: 'Басқа', models: ['iPad', 'MacBook', 'Apple Watch', 'Ноутбук', 'Другой телефон'] },
};

export const PROBLEMS = {
  screen:  { ru: 'Разбит экран',        kz: 'Экран сынған',            icon: 'smartphone' },
  battery: { ru: 'Садится батарея',     kz: 'Батарея тез отырады',     icon: 'battery-low' },
  charge:  { ru: 'Не заряжается',       kz: 'Зарядталмайды',           icon: 'plug-zap' },
  back:    { ru: 'Разбита крышка',      kz: 'Артқы қақпағы сынған',    icon: 'layers' },
  water:   { ru: 'Попала вода',         kz: 'Суға түсті',              icon: 'droplets' },
  camera:  { ru: 'Камера / Face ID',    kz: 'Камера / Face ID',        icon: 'scan-face' },
  power:   { ru: 'Не включается',       kz: 'Қосылмайды',              icon: 'power' },
  other:   { ru: 'Другое',              kz: 'Басқа',                   icon: 'help-circle' },
};

const R = n => Math.round(n / 500) * 500;

// Демо-прайс: вариант «копия / оригинал», срок, гарантия (мес)
export function priceFor(model = '', problem = 'other') {
  const m = /iPhone (\d+)/.exec(model);
  if (m) {
    const g = Math.max(0, Math.min(5, +m[1] - 11));
    switch (problem) {
      case 'screen':  return { copy: R(22000 + g * 6000), orig: R(42000 + g * 16000), time: '1–2 часа', timeKz: '1–2 сағат', warranty: 6 };
      case 'battery': return { orig: R(16000 + g * 2500), time: '40 минут', timeKz: '40 минут', warranty: 12 };
      case 'charge':  return { orig: R(12000 + g * 1500), time: '1 час', timeKz: '1 сағат', warranty: 6 };
      case 'back':    return { orig: R(20000 + g * 3500), time: '2–3 часа (лазер)', timeKz: '2–3 сағат (лазер)', warranty: 6 };
      case 'camera':  return { orig: R(22000 + g * 5000), time: '1–2 часа', timeKz: '1–2 сағат', warranty: 6 };
      case 'water':   return { from: 15000, time: 'после диагностики', timeKz: 'диагностикадан кейін', warranty: 3, diag: true };
      case 'power':   return { from: 20000, time: 'после диагностики', timeKz: 'диагностикадан кейін', warranty: 3, diag: true };
    }
  }
  if (/Galaxy|Redmi|Xiaomi/.test(model)) {
    const top = /S-серия|Note/.test(model);
    switch (problem) {
      case 'screen':  return { copy: top ? 45000 : 22000, orig: top ? 110000 : 38000, time: '1–2 часа', timeKz: '1–2 сағат', warranty: 6 };
      case 'battery': return { orig: top ? 22000 : 14000, time: '1 час', timeKz: '1 сағат', warranty: 12 };
      case 'charge':  return { orig: top ? 16000 : 10000, time: '1 час', timeKz: '1 сағат', warranty: 6 };
      case 'back':    return { orig: top ? 25000 : 12000, time: '1 час', timeKz: '1 сағат', warranty: 3 };
    }
  }
  return { from: 10000, time: 'после диагностики', timeKz: 'диагностикадан кейін', warranty: 3, diag: true };
}

export const fmt = n => (Math.round(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';

// Тексты бота
export const T = {
  ru: {
    hello: 'Здравствуйте! 👋 Я помощник Alim Service. Отвечаю сразу, а цену назовёт мастер.',
    lang: 'На каком языке удобнее?',
    device: 'Какое у вас устройство?',
    model: 'Какая модель?',
    modelType: 'Напишите модель',
    problem: 'Что случилось?',
    photo: 'Если можете — пришлите фото поломки. Мастеру так проще назвать точную цену.',
    photoBtn: '📷 Отправить фото', skip: 'Без фото',
    branch: 'В какой филиал удобнее подъехать?', near: '📍 Где ближе ко мне',
    nearAns: 'Ближе всего к вам — {b}. Записал его.',
    when: 'Когда сможете подъехать?', today: 'Сегодня', tomorrow: 'Завтра', later: 'Договоримся позже',
    name: 'Как к вам обращаться?',
    phone: 'Оставьте номер — пришлём цену и квитанцию сюда же.', share: '📱 Поделиться номером',
    done: 'Спасибо, {n}! Заявка №{no} принята ✅\nДежурный мастер {m} ответит с ценой в течение 15 минут.',
    doneOff: 'Спасибо, {n}! Заявка №{no} принята ✅\nСейчас мы закрыты — дежурный мастер ответит с ценой в 10:00. Писать можно в любое время.',
    book: 'Записаться на {t}', other: 'Другое время',
    booked: 'Готово! Вы записаны: {b}, {d} в {t}.\n📍 {a}\nЗа час до визита напомним. Возьмите с собой зарядку, если есть.',
    placeholder: 'Сообщение',
  },
  kz: {
    hello: 'Сәлеметсіз бе! 👋 Мен Alim Service көмекшісімін. Бірден жауап беремін, ал бағасын шебер айтады.',
    lang: 'Қай тілде ыңғайлы?',
    device: 'Құрылғыңыз қандай?',
    model: 'Қай модель?',
    modelType: 'Модельді жазыңыз',
    problem: 'Не болды?',
    photo: 'Мүмкін болса, ақаулықтың фотосын жіберіңіз. Шеберге нақты бағаны айту оңайырақ болады.',
    photoBtn: '📷 Фото жіберу', skip: 'Фотосыз',
    branch: 'Қай филиалға келу ыңғайлы?', near: '📍 Маған жақынырақ',
    nearAns: 'Сізге ең жақыны — {b}. Белгілеп қойдым.',
    when: 'Қашан келе аласыз?', today: 'Бүгін', tomorrow: 'Ертең', later: 'Кейін келісеміз',
    name: 'Сізге қалай жүгінейін?',
    phone: 'Нөміріңізді қалдырыңыз — бағасы мен түбіртекті осында жібереміз.', share: '📱 Нөмірмен бөлісу',
    done: 'Рақмет, {n}! №{no} өтінім қабылданды ✅\nКезекші шебер {m} 15 минут ішінде бағасын айтады.',
    doneOff: 'Рақмет, {n}! №{no} өтінім қабылданды ✅\nҚазір жабықпыз — кезекші шебер сағат 10:00-де бағасын айтады. Кез келген уақытта жаза аласыз.',
    book: '{t}-ге жазылу', other: 'Басқа уақыт',
    booked: 'Дайын! Сіз жазылдыңыз: {b}, {d} {t}.\n📍 {a}\nКелуден бір сағат бұрын еске саламыз.',
    placeholder: 'Хабарлама',
  },
};

export const CONDITIONS = ['Царапины на корпусе', 'Сколы', 'Трещина задней крышки', 'Вмятины', 'Следы влаги', 'Не включается', 'Без SIM-лотка', 'Отвязан от iCloud'];

export const FIRST_NAMES = ['Айгерим', 'Нурлан', 'Асель', 'Дмитрий', 'Жанна', 'Арман', 'Мадина', 'Олжас', 'Екатерина', 'Ерболат', 'Динара', 'Тимур', 'Алия', 'Сергей', 'Гульнара', 'Бекзат', 'Анна', 'Руслан', 'Сабина', 'Каната', 'Аружан', 'Максим', 'Томирис', 'Ильяс'];
