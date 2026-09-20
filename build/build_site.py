#!/usr/bin/env python3
"""Собирает весь сайт Alim Service из одного шаблона: главная, страницы услуг, 404, sitemap.xml, robots.txt.
Запуск:  python3 build/build_site.py
Тексты и данные — в build/content.py. Стили — site/styles.css. Скрипты — site/main.js и site/analytics.js."""
import html, json, os, re, struct, sys
from datetime import date, datetime
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import *  # noqa

ROOT = os.path.join(os.path.dirname(HERE), "site")
PREVIEW = os.environ.get("PREVIEW") == "1"   # копия для показа: закрыта от поисковиков
VER = os.environ.get("SITE_VER") or datetime.now().strftime("%Y%m%d%H%M")   # меняется при каждой сборке, иначе браузер держит старый CSS
e = lambda s: html.escape(str(s), quote=True)
# путь до формы заявки: абсолютный адрес берём как есть, относительный считаем от страницы
def req_url(prefix, problem=None):
    """Ссылка на форму заявки. problem подставляется в форму, чтобы клиент не выбирал поломку заново."""
    base = REQUEST_URL if REQUEST_URL.startswith("http") else prefix + REQUEST_URL
    return base.replace("#", f"?p={problem}#") if problem else base
plain = lambda s: s.replace("&nbsp;", " ")
wa_url = lambda text: f"https://wa.me/{WA}?text={quote(text)}"
WA_DEFAULT = "Здравствуйте! Нужен ремонт телефона. Модель и что случилось: "


# ---------- кирпичи ----------
def icon(name, cls=""):
    svg = open(os.path.join(HERE, "icons", name + ".svg"), encoding="utf-8").read()
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    svg = re.sub(r'\s(width|height|class)="[^"]*"', "", svg, count=3)
    c = ("ic " + cls).strip()
    return svg.replace("<svg", f'<svg class="{c}" aria-hidden="true" focusable="false"', 1).replace("\n", "").strip()


def webp_size(path):
    d = open(path, "rb").read(32)
    if d[12:16] == b"VP8 ":
        w, h = struct.unpack("<HH", d[26:30]); return w & 0x3FFF, h & 0x3FFF
    if d[12:16] == b"VP8L":
        b = struct.unpack("<I", d[21:25])[0]; return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
    if d[12:16] == b"VP8X":
        return 1 + int.from_bytes(d[24:27], "little"), 1 + int.from_bytes(d[27:30], "little")
    raise ValueError(path)


def img(name, alt, prefix, sizes="(max-width: 860px) 100vw, 50vw", lazy=True, cls=""):
    w, h = webp_size(os.path.join(ROOT, "assets", "img", f"{name}-1100.webp"))
    base = f"{prefix}assets/img/{name}"
    return (f'<img{" class=" + chr(34) + cls + chr(34) if cls else ""} src="{base}-1100.webp" srcset="{base}-640.webp 640w, {base}-1100.webp 1100w" '
            f'sizes="{sizes}" width="{w}" height="{h}" alt="{e(alt)}"{" loading=" + chr(34) + "lazy" + chr(34) + " decoding=" + chr(34) + "async" + chr(34) if lazy else ""}>')


def video(prefix, caption=""):
    """Видео не грузится, пока его не видно; на телефоне — только по нажатию."""
    return (f'<div class="vid" data-video="{prefix}assets/lazernyy-stanok-remont-displeya.mp4">'
            f'<img src="{prefix}assets/img/lazernyy-stanok-poster.webp" width="480" height="854" alt="Лазерный станок для ремонта дисплеев в Alim Service" loading="lazy" decoding="async">'
            f'<button class="vid-play" type="button" aria-label="Смотреть видео">{icon("play")}</button>'
            + (f'<span class="vid-cap">{e(caption)}</span>' if caption else "") + "</div>")


def review(key, big=False):
    name, when, lang, text = REVIEWS[key]
    initials = "".join(w[0] for w in name.split()[:2]).upper()
    return (f'<blockquote class="review{" review-big" if big else ""} reveal"{" lang=" + chr(34) + "kk" + chr(34) if lang == "kk" else ""}>'
            f'<div class="stars" aria-label="Оценка 5 из 5">★★★★★</div><p>{e(text)}</p>'
            f'<footer><span class="ava" aria-hidden="true">{e(initials)}</span><b>{e(name)}</b><time>{e(when)} · 2ГИС</time></footer></blockquote>')


def branches(heading):
    cards = "".join(f'''
      <article class="branch reveal"><span class="b-num">0{i + 1}</span><h3>{e(n)}</h3><p>{e(addr)}</p>
        <div class="b-actions"><a class="btn btn-primary btn-sm" href="tel:{tel}" data-goal="call_branch">{icon("phone")}{e(shown)}</a>
        <a class="btn btn-ghost btn-sm" href="https://2gis.kz/aktobe/search/{quote(addr)}" target="_blank" rel="noopener" data-goal="route">{icon("navigation")}Маршрут</a></div>
      </article>''' for i, (n, addr, tel, shown) in enumerate(BRANCHES))
    return f'''<section class="section dark" id="branches">
  <div class="wrap">
    <div class="sec-head"><p class="kicker reveal">Филиалы</p><h2 class="reveal">{heading}</h2><p class="sec-sub reveal">Все филиалы работают ежедневно с 10:00 до 19:00.</p></div>
    <div class="branches">{cards}
    </div>
  </div>
</section>'''


def business_ld():
    return {
        "@context": "https://schema.org", "@type": "MobilePhoneStore", "@id": SITE_URL + "/#org", "name": "Alim Service", "url": SITE_URL + "/",
        "image": SITE_URL + "/assets/img/og-alim-service.jpg", "logo": SITE_URL + "/assets/logo-mark.svg",
        "description": "Сервисный центр в Актобе: ремонт iPhone, Android, iPad, MacBook и Apple Watch.",
        "email": "alimservicekz@gmail.com", "telephone": BRANCHES[0][2], "priceRange": "₸₸",
        "areaServed": {"@type": "City", "name": "Актобе"}, "sameAs": ["https://www.instagram.com/alim_service_aktobe/"],
        "department": [{"@type": "MobilePhoneStore", "name": f"Alim Service — {n}", "telephone": tel,
                        "address": {"@type": "PostalAddress", "streetAddress": addr, "addressLocality": "Актобе", "addressCountry": "KZ"},
                        "openingHoursSpecification": {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "10:00", "closes": "19:00"}}
                       for n, addr, tel, _ in BRANCHES],
    }



DEVICES = [
    ("iPhone", '<rect x="20" y="4" width="24" height="56" rx="6"/><path d="M28 9h8"/><path d="M29 55h6"/>'),
    ("iPad", '<rect x="11" y="6" width="42" height="52" rx="5"/><circle cx="32" cy="11" r=".8"/><path d="M28 53h8"/>'),
    ("MacBook", '<rect x="12" y="14" width="40" height="27" rx="3"/><path d="M5 46h54l-3 5H8z"/><path d="M28 46v1.5h8V46"/>'),
    ("Apple Watch", '<rect x="21" y="18" width="22" height="28" rx="7"/><path d="M25 18l1.5-10h11L39 18"/><path d="M25 46l1.5 10h11L39 46"/><path d="M43 28v6"/>'),
    ("AirPods", '<path d="M26 22a8 8 0 1 0-8 8h2v22a3 3 0 0 0 6 0z"/><path d="M38 22a8 8 0 1 1 8 8h-2v22a3 3 0 0 1-6 0z"/>'),
]


def device_strip():
    items = "".join(
        f'<li class="dev reveal" style="--d:{i * 0.18:.2f}s"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">'
        + re.sub(r"<(rect|path|circle) ", r'<\1 pathLength="1" ', shapes) + f"</svg><span>{name}</span></li>"
        for i, (name, shapes) in enumerate(DEVICES))
    return f'<section class="devices" aria-label="Техника Apple, которую мы ремонтируем"><div class="wrap"><p class="dev-h">Чиним технику Apple</p><ul>{items}</ul></div></section>'


CRACK = ('<svg class="crack" viewBox="0 0 90 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
         '<g pathLength="1">' + "".join(f'<path pathLength="1" d="{d}"/>' for d in [
             "M58 46 L30 0", "M58 46 L90 22", "M58 46 L84 78 L90 96", "M58 46 L44 92 L20 160", "M58 46 L0 58",
             "M58 46 L70 20 L66 0", "M44 92 L72 120 L80 160", "M30 52 L14 104 L0 120", "M71 62 L48 70 L36 50 L50 30 L70 34 Z"]) + "</g></svg>"
         '<span class="shine" aria-hidden="true"></span>')


# Заставка при первом открытии: человечек бьёт кувалдой по телефону. Стили и скрипт встроены в страницу,
# чтобы заставка появлялась мгновенно, до загрузки основного CSS.
PRELOADER_HEAD = """<script>try{if(sessionStorage.getItem('alimSeen'))document.documentElement.className+=' seen ready'}catch(e){}</script>
<style>
#preloader{position:fixed;inset:0;z-index:999;display:grid;place-items:center;background:#0e0e0e;color:#fff;font-family:system-ui,sans-serif;animation:pl-failsafe .3s 4s forwards}
.seen #preloader{display:none}
#preloader.done{opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s}
#preloader svg{width:min(300px,70vw);height:auto;overflow:visible}
#preloader p{margin-top:6px;text-align:center;font-size:15px;color:#bdbdbd;letter-spacing:.02em}
#preloader p b{color:#ffc61a;font-weight:600}
.pl-man{animation:pl-jump .9s cubic-bezier(.3,0,.4,1) infinite}
.pl-legs{transform-origin:80px 108px;animation:pl-legs .9s cubic-bezier(.3,0,.4,1) infinite}
.pl-arm{transform-origin:80px 82px;animation:pl-swing .9s cubic-bezier(.5,0,.3,1) infinite}
.pl-phone{transform-origin:141px 138px;animation:pl-shake .9s linear infinite}
.pl-crack,.pl-spark{opacity:0;animation:pl-flash .9s linear infinite}
.pl-spark{transform-origin:141px 128px}
.pl-shadow{transform-origin:80px 143px;animation:pl-shadow .9s cubic-bezier(.3,0,.4,1) infinite}
@keyframes pl-swing{0%{transform:rotate(-38deg)}30%{transform:rotate(-58deg)}48%,58%{transform:rotate(122deg)}100%{transform:rotate(-38deg)}}
@keyframes pl-jump{0%,50%{transform:translateY(0)}64%{transform:translateY(-14px)}80%,100%{transform:translateY(0)}}
@keyframes pl-legs{0%,50%{transform:scaleY(1)}64%{transform:scaleY(.62)}80%,100%{transform:scaleY(1)}}
@keyframes pl-shadow{0%,50%{transform:scaleX(1);opacity:.35}64%{transform:scaleX(.6);opacity:.18}80%,100%{transform:scaleX(1);opacity:.35}}
@keyframes pl-shake{0%,47%{transform:none}50%{transform:translateY(2px) rotate(-3deg)}54%{transform:translateY(-3px) rotate(4deg)}60%{transform:rotate(-2deg)}66%,100%{transform:none}}
@keyframes pl-flash{0%,47%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}70%{opacity:1;transform:scale(1.15)}85%,100%{opacity:0;transform:scale(1.3)}}
@keyframes pl-failsafe{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){#preloader{display:none}}
</style>"""

PRELOADER_BODY = """<div id="preloader" role="status" aria-label="Загрузка"><div>
<svg viewBox="0 0 200 160" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10 144h180" stroke="#2c2c2c" stroke-width="3"/>
  <ellipse class="pl-shadow" cx="80" cy="145" rx="24" ry="3.5" fill="#000"/>
  <g class="pl-phone">
    <rect x="118" y="131" width="46" height="9" rx="3.5" fill="#1d1d1f" stroke="#ffc61a" stroke-width="2.5"/>
    <path class="pl-crack" d="M141 131l-5 4 7 2-4 3M141 131l8 5-3 4M136 135l-9 1" stroke="#fff" stroke-width="1.6" style="transform-origin:141px 135px"/>
  </g>
  <g class="pl-spark" stroke="#ffc61a" stroke-width="3"><path d="M128 124l-9-8M141 120v-12M154 124l9-8M120 132l-11-1M162 132l11-1"/></g>
  <g class="pl-man">
    <g class="pl-legs" stroke="#f5f3ee" stroke-width="7"><path d="M76 108l-9 20 -2 14h-7M84 108l8 20 1 14h8"/></g>
    <path d="M80 80v30" stroke="#f26a1b" stroke-width="16"/>
    <circle cx="80" cy="58" r="13" fill="#f5f3ee"/>
    <path d="M68 53c4-9 20-9 24 0" stroke="#ffc61a" stroke-width="7"/>
    <circle cx="85" cy="58" r="1.8" fill="#0e0e0e"/><path d="M82 65c3 2 6 1 8-1" stroke="#0e0e0e" stroke-width="2"/>
    <g class="pl-arm">
      <path d="M80 82V22" stroke="#9a6b3f" stroke-width="5"/>
      <rect x="64" y="8" width="32" height="18" rx="4" fill="#8a8f98" stroke="#d6d9de" stroke-width="2"/>
      <path d="M80 82V58" stroke="#f5f3ee" stroke-width="8"/>
    </g>
  </g>
</svg>
<p>Так не надо. <b>Остальное починим.</b></p>
</div></div>
<script>(function(){var d=document.documentElement,p=document.getElementById('preloader');if(!p)return;
function ready(){d.className+=' ready';try{document.dispatchEvent(new Event('alim:ready'))}catch(e){}}
if(d.className.indexOf('seen')>-1||matchMedia('(prefers-reduced-motion: reduce)').matches){p.remove();if(d.className.indexOf('ready')<0)ready();return}
var t0=Date.now();function hide(){var w=Math.max(0,1300-(Date.now()-t0));setTimeout(function(){p.className='done';try{sessionStorage.setItem('alimSeen','1')}catch(e){}ready();setTimeout(function(){p.remove()},400)},w)}
if(document.readyState!=='loading')hide();else document.addEventListener('DOMContentLoaded',hide)})();</script>"""


ld = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + "</script>"


def layout(*, title, desc, path, prefix, body, lds, wa, noindex=False, body_cls=""):
    url = SITE_URL + path
    nav_links = f'<a href="{prefix}#repair">Ремонт</a><a href="{prefix}#reviews">Отзывы</a><a href="{prefix}#tech">Сложный ремонт</a><a href="#branches">Филиалы</a>'
    services = "".join(f'<a href="{prefix}{p["slug"]}/">{e(p["nav"])}</a>' for p in PAGES)
    return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{'<meta name="robots" content="noindex, nofollow">' if (noindex or PREVIEW) else f'<link rel="canonical" href="{url}">'}
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_KZ">
<meta property="og:site_name" content="Alim Service">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}/assets/img/og-alim-service.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefix}assets/logo-mark.svg" type="image/svg+xml">
<meta name="theme-color" content="#0e0e0e">
<link rel="preload" href="{prefix}assets/fonts/unbounded-cyrillic-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{prefix}assets/fonts/onest-cyrillic-400.woff2" as="font" type="font/woff2" crossorigin>
{PRELOADER_HEAD}
<link rel="stylesheet" href="{prefix}styles.css?v={VER}">
{chr(10).join(ld(x) for x in lds)}
</head>
<body{f' class="{body_cls}"' if body_cls else ""}>
{PRELOADER_BODY}
<a class="skip" href="#main">К содержанию</a>

<header class="nav" id="top">
  <a class="brand" href="{prefix or "./"}" aria-label="Alim Service — на главную">
    <img class="mark" src="{prefix}assets/logo-mark.svg" alt="" width="36" height="36">
    <span class="wordmark" aria-hidden="true"><span>Al<span class="acc">ı</span>m</span><small>SERVICE</small></span>
  </a>
  <nav class="links" id="menu" aria-label="Основное меню">{nav_links}</nav>
  <a class="btn btn-wa btn-sm" href="{wa}" target="_blank" rel="noopener" data-goal="wa_header" aria-label="Написать в WhatsApp">{icon("message-circle")}<span>WhatsApp</span></a>
  <button class="burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Меню">{icon("menu", "i-open")}{icon("x", "i-close")}</button>
</header>

<main id="main">
{body}
</main>

<footer class="foot">
  <div class="wrap"><nav class="svc-nav" aria-label="Услуги"><b>Услуги</b>{services}</nav></div>
  <div class="wrap foot-inner"><span>© Alim Service, Актобе</span><a href="https://www.instagram.com/alim_service_aktobe/" target="_blank" rel="noopener">Instagram</a><a href="mailto:alimservicekz@gmail.com">alimservicekz@gmail.com</a></div>
</footer>

<a class="wa-float" href="{wa}" target="_blank" rel="noopener" aria-label="Написать в WhatsApp" data-goal="wa_float">{icon("message-circle")}</a>

<script src="{prefix}analytics.js?v={VER}" defer></script>
<script src="{prefix}main.js?v={VER}" defer></script>
</body>
</html>
'''


# ---------- главная ----------
def home():
    prefix = ""
    wa = wa_url(WA_DEFAULT)
    cards = "".join(f'''
      <article class="card reveal">{icon(ic)}<h3>{e(t)}</h3><p>{e(d)}</p>
        <div class="card-f"><a class="go" href="{req_url(prefix, problem)}" data-goal="request_card">Оставить заявку {icon("arrow-up-right")}</a><a class="more" href="{wa_url(msg)}" target="_blank" rel="noopener" data-goal="wa_card">WhatsApp</a>{f'<a class="more" href="{slug}/">Подробнее</a>' if slug else ""}</div>
      </article>''' for ic, t, d, slug, msg, problem in CARDS)
    faq_ld = None
    body = f'''<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow"><span class="dot"></span><span>Актобе · 4 филиала</span><span class="nw">ежедневно 10:00–19:00</span></p>
      <h1>Ремонт iPhone и&nbsp;телефонов <span class="hl">в&nbsp;Актобе</span></h1>
      <p class="lead">«Помогли за секунду», «сделал всё чётко за 5 минут», «цены приемлемые» — так о нас пишут клиенты в 2ГИС. Чиним iPhone, Android, iPad, MacBook, Apple Watch и AirPods.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="{req_url(prefix)}" data-goal="request_hero">{icon("clipboard-list")}Оставить заявку</a>
        <a class="btn btn-wa" href="{wa}" target="_blank" rel="noopener" data-goal="wa_hero">{icon("message-circle")}Написать в WhatsApp</a>
      </div>
      <ul class="facts">
        <li><b>{RATING["value"]} ★</b><span>{RATING["count"]} оценок в 2ГИС</span></li>
        <li><b>4</b><span>филиала в Актобе</span></li>
        <li><b>до 1 года</b><span>гарантия на ремонт</span></li>
      </ul>
    </div>
    <div class="hero-media">
      <div class="phone">{video("", "Лазерный станок для ремонта дисплеев")}{CRACK}</div>
    </div>
  </div>
</section>

{device_strip()}

<section class="section" id="reviews">
  <div class="wrap">
    <div class="sec-head row">
      <div><p class="kicker reveal">Отзывы из 2ГИС</p><h2 class="reveal">Мастеров благодарят по&nbsp;именам</h2>
      <p class="sec-sub reveal">Алихан, Жандаулет, Мирас — этих имён нет в нашей рекламе, их называют сами клиенты. Оценка {RATING["value"]} по {RATING["count"]} оценкам ({e(RATING["where"])}).</p></div>
      <a class="btn btn-ghost reveal" href="{RATING["url"]}" target="_blank" rel="noopener">Все отзывы в 2ГИС {icon("arrow-up-right")}</a>
    </div>
    <div class="reviews">{"".join(review(k) for k in HOME_REVIEWS)}</div>
  </div>
</section>

<section class="section tint" id="repair">
  <div class="wrap">
    <div class="sec-head"><p class="kicker reveal">Что чиним</p><h2 class="reveal">Выберите поломку — ответим&nbsp;с&nbsp;ценой</h2>
    <p class="sec-sub reveal">Кнопка откроет WhatsApp с готовым сообщением. Останется дописать модель телефона.</p></div>
    <div class="cards">{cards}
    </div>
  </div>
</section>

<section class="section dark" id="tech">
  <div class="wrap two">
    <div>
      <p class="kicker reveal">Сложный ремонт</p>
      <h2 class="reveal">Чиним плату, а&nbsp;не&nbsp;только меняем детали</h2>
      <p class="sec-sub reveal">Телефон после воды, не включается, пропала сеть после падения — такие поломки решаются пайкой под микроскопом. Для дисплеев в сервисе стоит лазерный станок: его видно в ролике выше.</p>
      <div class="cta-row reveal"><a class="btn btn-primary" href="telefon-ne-vklyuchaetsya/">Телефон не включается</a><a class="btn btn-ghost" href="remont-telefona-posle-vody/">Попала вода</a></div>
    </div>
    <figure class="tech-photo reveal">{img("payka-platy-pod-mikroskopom", "Мастер Alim Service паяет плату телефона под микроскопом", "")}</figure>
  </div>
</section>

<section class="section" id="sourcing">
  <div class="wrap two">
    <div>
      <p class="kicker reveal">Оборудование</p>
      <h2 class="reveal">Знаем, на чём работаем</h2>
      <p class="sec-sub reveal">Команда Alim ездила к производителям ремонтного оборудования в Китай — Forward, Sunshine, Kaisi.</p>
      <p class="also reveal">Ещё в Alim Service: trade-in, продажа телефонов, аксессуары, доставка и выезд мастера.</p>
    </div>
    <div class="collage">
      {img("alim-service-u-proizvoditelya-forward", "Команда Alim Service у производителя Forward", "", "(max-width: 860px) 50vw, 25vw", cls="reveal")}
      {img("alim-service-u-proizvoditelya-sunshine", "Команда Alim Service у производителя Sunshine", "", "(max-width: 860px) 50vw, 25vw", cls="reveal")}
      {img("alim-service-u-proizvoditelya-kaisi", "Команда Alim Service у производителя Kaisi", "", "(max-width: 860px) 50vw, 25vw", cls="reveal")}
      {img("masterskaya-alim-service", "Мастерская Alim Service в Актобе", "", "(max-width: 860px) 50vw, 25vw", cls="reveal")}
    </div>
  </div>
</section>

{branches("4 точки в&nbsp;Актобе — выберите ближайшую")}

<section class="final">
  <div class="wrap final-inner">
    <h2 class="reveal">Сломался телефон?<br><span class="hl">Напишите — ответим с&nbsp;ценой</span></h2>
    <div class="cta-row reveal"><a class="btn btn-primary btn-lg" href="{req_url(prefix)}" data-goal="request_final">{icon("clipboard-list")}Оставить заявку</a><a class="btn btn-wa btn-lg" href="{wa}" target="_blank" rel="noopener" data-goal="wa_final">{icon("message-circle")}Написать в WhatsApp</a></div>
  </div>
</section>'''
    return layout(title="Ремонт iPhone и телефонов в Актобе — Alim Service", path="/", prefix="", body=body, wa=wa, lds=[business_ld()],
                  desc="Ремонт iPhone, Android, iPad, MacBook и Apple Watch в Актобе. 4 филиала, ежедневно 10:00–19:00, оценка 5,0 в 2ГИС. Цену назовём в WhatsApp до ремонта.")


# ---------- страница услуги ----------
def service(p):
    prefix, path, wa = "../", f'/{p["slug"]}/', wa_url(p["wa"])
    li = lambda xs: "".join(f"<li>{e(x)}</li>" for x in xs)
    media = {
        "video": f'<figure class="sub-media reveal">{video(prefix, "Лазерный станок для ремонта дисплеев")}</figure>',
        "solder": f'<figure class="sub-media reveal">{img("payka-platy-pod-mikroskopom", "Пайка платы телефона под микроскопом в Alim Service", prefix)}</figure>',
        "workshop": f'<figure class="sub-media reveal">{img("master-remont-telefona", "Мастер Alim Service ремонтирует телефон", prefix)}</figure>',
        "intake": f'<figure class="sub-media reveal">{img("priemka-telefona-v-servise", "Приёмка телефона в Alim Service", prefix)}</figure>',
    }[p["media"]]
    rv = f'<section class="section proof"><div class="wrap narrow"><p class="kicker reveal">Отзыв клиента</p>{review(p["review"], big=True)}</div></section>'
    lds = [business_ld(),
           {"@context": "https://schema.org", "@type": "Service", "name": plain(p["h1"]), "serviceType": p["nav"], "provider": {"@id": SITE_URL + "/#org"}, "areaServed": {"@type": "City", "name": "Актобе"}, "url": SITE_URL + path},
           {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]},
           {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Alim Service", "item": SITE_URL + "/"}, {"@type": "ListItem", "position": 2, "name": plain(p["h1"]), "item": SITE_URL + path}]}]
    body = f'''<section class="hero hero-sub">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="wrap">
    <nav class="crumbs" aria-label="Хлебные крошки"><a href="{prefix}">Главная</a><span>/</span><span>{e(p["nav"])}</span></nav>
    <p class="kicker">{e(p["kicker"])}</p>
    <h1>{p["h1"]}</h1>
    <p class="lead">{e(p["lead"])}</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="{req_url(prefix, p.get("problem"))}" data-goal="request_hero">{icon("clipboard-list")}Оставить заявку</a>
      <a class="btn btn-wa" href="{wa}" target="_blank" rel="noopener" data-goal="wa_hero">{icon("message-circle")}Написать в WhatsApp</a>
    </div>
    <ul class="facts">
      <li><b>{RATING["value"]} ★</b><span>{RATING["count"]} оценок в 2ГИС</span></li>
      <li><b>4</b><span>филиала в Актобе</span></li>
      <li><b>10:00–19:00</b><span>без выходных</span></li>
    </ul>
  </div>
</section>
{rv if p.get("review_top") else ""}
<section class="section">
  <div class="wrap two">
    <div class="box reveal"><p class="kicker">Признаки</p><h2>Когда пора в сервис</h2><ul class="ticks">{li(p["symptoms"])}</ul></div>
    <div class="box dark reveal"><p class="kicker">Что мы делаем</p><h2>Как проходит ремонт</h2><ol class="nums">{li(p["what"])}</ol></div>
  </div>
</section>

<section class="section tint">
  <div class="wrap two">
    <div class="reveal">
      <p class="kicker">Стоимость</p><h2>От чего зависит цена</h2>
      <ul class="ticks">{li(p["price"])}</ul>
      <p class="sec-sub">Точную сумму называем до начала работ.</p>
      <div class="cta-row"><a class="btn btn-primary" href="{req_url(prefix, p.get("problem"))}" data-goal="request_price">{icon("clipboard-list")}Оставить заявку</a><a class="btn btn-ghost" href="{wa}" target="_blank" rel="noopener" data-goal="wa_price">{icon("message-circle")}WhatsApp</a></div>
    </div>
    {media}
  </div>
</section>
{"" if p.get("review_top") else rv}
<section class="section">
  <div class="wrap">
    <div class="sec-head"><p class="kicker reveal">Порядок</p><h2 class="reveal">Четыре шага до готового телефона</h2></div>
    <div class="steps4">{"".join(f'<div class="step reveal"><span>{i + 1}</span><h3>{e(t)}</h3><p>{e(d)}</p></div>' for i, (t, d) in enumerate(STEPS))}</div>
  </div>
</section>

<section class="section tint" id="faq">
  <div class="wrap narrow">
    <div class="sec-head"><p class="kicker reveal">Вопросы</p><h2 class="reveal">Частые вопросы</h2></div>
    <div class="faq">{"".join(f'<details class="reveal"><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in p["faq"])}</div>
  </div>
</section>

{branches("Куда приехать в&nbsp;Актобе")}'''
    return layout(title=p["title"], desc=p["desc"], path=path, prefix=prefix, body=body, lds=lds, wa=wa, body_cls="sub")


def not_found():
    wa = wa_url(WA_DEFAULT)
    links = "".join(f'<li><a href="/{p["slug"]}/">{e(p["nav"])}</a></li>' for p in PAGES)
    body = f'''<section class="hero hero-sub"><div class="hero-bg" aria-hidden="true"></div><div class="wrap">
    <p class="kicker">Ошибка 404</p><h1>Такой страницы нет</h1>
    <p class="lead">Возможно, ссылка устарела. Вот что есть на сайте:</p>
    <ul class="list404">{links}</ul>
    <div class="cta-row"><a class="btn btn-primary" href="/">На главную</a><a class="btn btn-ghost" href="{wa}" target="_blank" rel="noopener">{icon("message-circle")}Написать в WhatsApp</a></div>
  </div></section>'''
    # на 404 пути абсолютные: страница отдаётся по любому адресу
    return layout(title="Страница не найдена — Alim Service", desc="Страница не найдена.", path="/404.html", prefix="/", body=body, lds=[], wa=wa, noindex=True, body_cls="sub")


def main():
    write = lambda rel, s: (os.makedirs(os.path.dirname(os.path.join(ROOT, rel)) or ROOT, exist_ok=True), open(os.path.join(ROOT, rel), "w", encoding="utf-8").write(s))
    write("index.html", home())
    for p in PAGES:
        write(f'{p["slug"]}/index.html', service(p))
    write("404.html", not_found())
    today = date.today().isoformat()
    urls = ["/"] + [f'/{p["slug"]}/' for p in PAGES if p["sitemap"]]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    write("robots.txt", "User-agent: *\nDisallow: /\n" if PREVIEW else f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")
    print(f"страниц: {len(PAGES) + 2}, в карте сайта: {len(urls)}, домен: {SITE_URL}")


if __name__ == "__main__":
    main()
