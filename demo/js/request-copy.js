// Client-facing request form. Internal language key stays `kz` for existing demo records.
import { BRAND } from './brand.js?v=202609201725';
const KEY = `${BRAND.storagePrefix}-request-language`;
export function requestLang() { try { return localStorage.getItem(KEY) === 'kz' ? 'kz' : 'ru'; } catch { return 'ru'; } }
export function saveRequestLang(lang) { try { localStorage.setItem(KEY, lang); } catch {} }
export const REQUEST_COPY = {
  ru: {
    title: 'Заявка на ремонт', subtitle: 'Расскажите, что случилось. Мастер свяжется с вами в WhatsApp.', language: 'Язык формы',
    deviceStep: 'Устройство и поломка', contactStep: 'Где и как с вами связаться', model: 'Модель устройства', modelHint: 'Например, iPhone 13 Pro', modelHelp: 'Выберите подсказку или впишите свою модель', unknown: 'Не знаю модель', otherDevice: 'Другое',
    problem: 'Что случилось?', otherProblem: 'Другое / не знаю', branch: 'Удобный филиал', helpBranch: 'Помогите выбрать', helpBranchNote: 'Мастер подскажет ближайшую точку',
    phone: 'Телефон WhatsApp', phoneHelp: 'На этот номер мастер напишет по заявке', name: 'Ваше имя', optional: 'необязательно', nameHint: 'Как к вам обращаться', source: 'Откуда узнали о нас', walk: 'Пришёл сам', site: 'Сайт',
    photo: 'Добавить фото поломки', photoHint: 'JPG, PNG или другое изображение · до 10 МБ', photoAlt: 'Фото поломки', removePhoto: 'Убрать фото', replacePhoto: 'Выбрать другое фото',
    demo: 'Демо: используйте вымышленные контакты. Заявка останется в этом браузере, сообщения не отправляются.', submit: 'Отправить заявку', create: 'Создать заявку', sending: 'Сохраняем…',
    modelError: 'Укажите модель или выберите «Не знаю модель».', problemError: 'Выберите, что случилось с устройством.', phoneError: 'Укажите телефон: +7 и ещё 10 цифр.', photoSize: 'Фото должно быть не больше 10 МБ.', photoError: 'Не удалось прочитать фото. Выберите другое изображение.',
    accepted: no => `Заявка №${no} принята`, reply: 'В рабочей версии мастер ответит в WhatsApp в течение 15 минут в рабочее время.', replyOff: 'Сейчас сервис закрыт. Мастер ответит после открытия, с 10:00.', saved: 'Это демо. Заявка сохранена только в этом браузере.', seeDuty: 'Посмотреть заявку у дежурного', another: 'Ещё одна заявка',
    skipTitle: 'Не хотите заполнять?', skipText: 'Напишите нам в WhatsApp — мастер сам всё спросит.', skipBtn: 'Сразу в WhatsApp', skipHint: 'Заполненная заявка отвечается быстрее: у мастера сразу есть модель и поломка.',
    waHello: 'Здравствуйте! Нужен ремонт.', waDevice: 'Устройство', waProblem: 'Поломка', waBranch: 'Филиал',
    next: 'После заявки', steps: ['Мастер получит модель, описание поломки и фото.', 'Уточнит детали и назовёт стоимость в WhatsApp.', 'Вы согласуете удобный филиал и время визита.'], hours: 'Ежедневно, 10:00–19:00', optionalNote: 'Фото и имя можно не указывать. Если не знаете модель или филиал — поможем разобраться.', deviceLabel: 'Устройство', branchLabel: 'Филиал', client: 'Клиент',
  },
  kz: {
    title: 'Жөндеуге өтінім', subtitle: 'Не болғанын айтыңыз. Шебер сізбен WhatsApp арқылы байланысады.', language: 'Өтінім тілі',
    deviceStep: 'Құрылғы және ақау', contactStep: 'Филиал және байланыс', model: 'Құрылғы моделі', modelHint: 'Мысалы, iPhone 13 Pro', modelHelp: 'Тізімнен таңдаңыз немесе өз моделіңізді жазыңыз', unknown: 'Моделін білмеймін', otherDevice: 'Басқа',
    problem: 'Не болды?', otherProblem: 'Басқа / білмеймін', branch: 'Ыңғайлы филиал', helpBranch: 'Таңдауға көмектесіңіз', helpBranchNote: 'Шебер жақын филиалды ұсынады',
    phone: 'WhatsApp нөмірі', phoneHelp: 'Шебер өтінім бойынша осы нөмірге жазады', name: 'Атыңыз', optional: 'міндетті емес', nameHint: 'Сізге қалай жүгінейік?', source: 'Біз туралы қайдан білдіңіз?', walk: 'Өзі келді', site: 'Сайт',
    photo: 'Ақаудың фотосын қосу', photoHint: 'JPG, PNG немесе басқа сурет · 10 МБ-қа дейін', photoAlt: 'Ақаудың фотосы', removePhoto: 'Фотоны алып тастау', replacePhoto: 'Басқа фото таңдау',
    demo: 'Демо: ойдан шығарылған деректерді пайдаланыңыз. Өтінім тек осы браузерде сақталады, хабарламалар жіберілмейді.', submit: 'Өтінімді жіберу', create: 'Өтінім жасау', sending: 'Сақталуда…',
    modelError: 'Модельді жазыңыз немесе «Моделін білмеймін» таңдаңыз.', problemError: 'Құрылғыда қандай ақау бар екенін таңдаңыз.', phoneError: 'Телефон нөмірін енгізіңіз: +7 және одан кейін 10 сан.', photoSize: 'Фото көлемі 10 МБ-тан аспауы керек.', photoError: 'Фотоны ашу мүмкін болмады. Басқа суретті таңдаңыз.',
    accepted: no => `№${no} өтінім қабылданды`, reply: 'Жұмыс нұсқасында шебер жұмыс уақытында 15 минут ішінде WhatsApp арқылы жауап береді.', replyOff: 'Қазір сервис жабық. Шебер ашылғаннан кейін, сағат 10:00-ден бастап жауап береді.', saved: 'Бұл — демо. Өтінім тек осы браузерде сақталды.', seeDuty: 'Кезекші шебердегі өтінімді көру', another: 'Тағы бір өтінім',
    skipTitle: 'Толтырғыңыз келмей ме?', skipText: 'WhatsApp арқылы жазыңыз — шебер өзі сұрайды.', skipBtn: 'Бірден WhatsApp-қа', skipHint: 'Толтырылған өтінімге жауап тезірек келеді: шеберде модель мен ақау бірден болады.',
    waHello: 'Сәлеметсіз бе! Жөндеу керек.', waDevice: 'Құрылғы', waProblem: 'Ақау', waBranch: 'Филиал',
    next: 'Өтінімнен кейін', steps: ['Шебер модельді, ақау сипаттамасын және фотоны алады.', 'Мән-жайды нақтылап, WhatsApp арқылы бағасын айтады.', 'Сіз ыңғайлы филиал мен келетін уақытты келісесіз.'], hours: 'Күн сайын, 10:00–19:00', optionalNote: 'Фото мен атыңызды көрсетпеуге болады. Модельді немесе филиалды білмесеңіз, таңдауға көмектесеміз.', deviceLabel: 'Құрылғы', branchLabel: 'Филиал', client: 'Клиент',
  },
};
const MODELS_KZ = { 'Не знаю модель': 'Моделін білмеймін', 'Ноутбук': 'Ноутбук', 'Другой телефон': 'Басқа телефон', 'Galaxy A-серия': 'Galaxy A сериясы', 'Galaxy S-серия': 'Galaxy S сериясы' };
export const modelLabel = (value, lang) => lang === 'kz' ? MODELS_KZ[value] || value : value;
export const modelValue = value => Object.entries(MODELS_KZ).find(([,label]) => label === value)?.[0] || value;
export function branchLabel(b, lang) { return lang === 'kz' ? b.short.replace('БЦ', 'БО').replace('ТД', 'СҮ').replace('Абилкайыр-хана', 'Әбілқайыр хан').replace('Шайкенова', 'Шайкенов') : b.short; }
export function branchAddress(b, lang) { return lang === 'kz' ? b.addr.replace('пр. Абилкайыр-хана,', 'Әбілқайыр хан даңғылы,').replace('ул. Нагашбай Шайкенова,', 'Нағашбай Шайкенов көшесі,') : b.addr; }
