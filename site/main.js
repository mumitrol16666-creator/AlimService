// Alim Service — поведение сайта. Внешних библиотек нет.
(() => {
  const doc = document.documentElement;

  // Меню на телефоне
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    const toggle = open => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); };
    burger.addEventListener('click', () => toggle(!menu.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) toggle(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }

  // Появление блоков при прокрутке
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    doc.classList.add('js');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  // Видео: файл не грузится, пока не нужен.
  // На широком экране запускается само, когда попадает в поле зрения; на телефоне и при экономии трафика — по нажатию.
  const conn = navigator.connection || {};
  const auto = matchMedia('(min-width: 861px)').matches && !conn.saveData && !reduce;
  const start = box => {
    if (box.querySelector('video')) return;
    const v = document.createElement('video');
    Object.assign(v, { src: box.dataset.video, muted: true, loop: true, playsInline: true, autoplay: true });
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    v.setAttribute('aria-label', 'Видео: лазерный станок для ремонта дисплеев');
    box.append(v); box.classList.add('playing');
    v.play().catch(() => box.classList.remove('playing'));
  };
  document.querySelectorAll('.vid').forEach(box => {
    box.querySelector('.vid-play').addEventListener('click', () => start(box));
    if (!auto || !('IntersectionObserver' in window)) return;
    const vo = new IntersectionObserver(entries => entries.forEach(en => {
      const v = box.querySelector('video');
      const delay = box.closest('.phone') && !v ? 1900 : 0;   // в первом экране ждём, пока «затянется» трещина
      if (!en.isIntersecting) { if (v) v.pause(); return; }
      if (v) { v.play().catch(() => {}); return; }
      const go = () => setTimeout(() => start(box), delay);
      doc.classList.contains('ready') ? go() : document.addEventListener('alim:ready', go, { once: true });   // ждём конца заставки
    }), { threshold: 0.3 });
    vo.observe(box);
  });
})();
