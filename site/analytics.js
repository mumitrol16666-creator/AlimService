// Счётчики и цели. Впишите номера счётчиков — без них скрипт ничего не загружает.
// Цели в Метрике создать как «JavaScript-событие» с теми же идентификаторами:
// wa_click (все нажатия WhatsApp), call_click (звонки), route_click (маршрут), insta_click.
window.ALIM_ANALYTICS = { metrika: '', ga4: '' };   // пример: { metrika: '12345678', ga4: 'G-XXXXXXX' }

(() => {
  const { metrika, ga4 } = window.ALIM_ANALYTICS;
  if (metrika) {
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(+metrika, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  if (ga4) {
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga4; document.head.append(s);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', ga4);
  }

  const kind = a => {
    const h = a.getAttribute('href') || '';
    if (h.includes('wa.me')) return 'wa_click';
    if (h.startsWith('tel:')) return 'call_click';
    if (h.includes('2gis.')) return 'route_click';
    if (h.includes('instagram.com')) return 'insta_click';
    return null;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const goal = kind(a); if (!goal) return;
    const params = { place: a.dataset.goal || a.closest('section')?.id || 'page', page: location.pathname };
    if (metrika && window.ym) ym(+metrika, 'reachGoal', goal, params);
    if (ga4 && window.gtag) gtag('event', goal, params);
    (window.__goals = window.__goals || []).push([goal, params]);   // для проверки без счётчиков
  }, true);
})();
