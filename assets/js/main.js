/* Elite Fence: site interactions (each block only runs when its section is on the page) */
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Fences dropdown (click / keyboard support; hover handled in CSS)
  const ddBtn = $('.nav__item--dropdown .nav__link');
  if (ddBtn) {
    ddBtn.addEventListener('click', () => ddBtn.setAttribute('aria-expanded', ddBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav__item--dropdown')) ddBtn.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ddBtn.setAttribute('aria-expanded', 'false'); });
  }

  // Mobile menu
  const menuBtn = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  const setMenu = (open) => {
    mobileNav.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => setMenu(mobileNav.hidden));
    $$('a', mobileNav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }

  /* ---------- Hero video ---------- */
  const video = $('.hero__video');
  const videoToggle = $('.hero__video-toggle');
  const saveData = navigator.connection && navigator.connection.saveData;
  // Skip the video on small screens, data-saver or reduced motion; the poster image covers those cases.
  if (video && !reduceMotion && !saveData && window.innerWidth >= 768) {
    video.src = video.dataset.src;
    video.play().then(() => { videoToggle.hidden = false; }).catch(() => {});
    videoToggle.addEventListener('click', () => {
      const paused = video.paused;
      paused ? video.play() : video.pause();
      videoToggle.setAttribute('aria-label', paused ? 'Pause background video' : 'Play background video');
      videoToggle.querySelector('use').setAttribute('href', paused ? '#i-pause' : '#i-play');
    });
  }

  /* ---------- Headline word rotator ---------- */
  const words = $$('.rotator__word');
  if (words.length && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      const current = words[i];
      i = (i + 1) % words.length;
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      setTimeout(() => current.classList.remove('is-leaving'), 450);
      words[i].classList.add('is-active');
    }, 2600);
  }

  const validators = {
    name: (v) => v.trim().length > 1,
    phone: (v) => v.replace(/\D/g, '').length >= 10,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    zip: (v) => /^\d{5}$/.test(v.trim()),
  };

  /* ---------- Multi-step quote form ---------- */
  const form = $('#quote-form');
  let goTo = () => {};
  if (form) {
  const steps = $$('.quote__step', form);
  const barFill = $('.quote__bar-fill', form);
  const stepNum = $('.js-step-num', form);
  let current = 1;

  goTo = (n) => {
    current = n;
    steps.forEach((s) => s.classList.toggle('is-active', +s.dataset.step === n));
    barFill.style.width = `${(n / steps.length) * 100}%`;
    stepNum.textContent = n;
    if (n === 3) renderSummary();
  };

  const showError = (name, show) => {
    const el = $(`[data-error-for="${name}"]`, form);
    if (el) el.classList.toggle('is-visible', show);
    const input = form.elements[name];
    if (input && input.classList) input.classList.toggle('is-invalid', show);
  };

  // Step 1: picking a fence type advances automatically
  $$('input[name="fence_type"]', form).forEach((r) =>
    r.addEventListener('change', () => {
      showError('fence_type', false);
      setTimeout(() => goTo(2), 260);
    })
  );

  $$('[data-next]', form).forEach((b) => b.addEventListener('click', () => goTo(current + 1)));
  $$('[data-prev]', form).forEach((b) => b.addEventListener('click', () => goTo(current - 1)));

  // Length slider
  const range = $('#length');
  const rangeOut = $('#length-out');
  const updateRange = () => {
    const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
    range.style.setProperty('--fill', `${pct}%`);
    rangeOut.textContent = +range.value >= +range.max ? `${range.value}+ ft` : `${range.value} ft`;
  };
  range.addEventListener('input', updateRange);
  updateRange();

  function renderSummary() {
    const d = new FormData(form);
    const chips = [d.get('style'), d.get('fence_type'), d.get('property'), d.get('service'), rangeOut.textContent].filter(Boolean);
    $('.js-summary', form).innerHTML = chips.map((c) => `<span>${c}</span>`).join('');
  }

  Object.keys(validators).forEach((name) => {
    form.elements[name].addEventListener('blur', (e) => { if (e.target.value) showError(name, !validators[name](e.target.value)); });
    form.elements[name].addEventListener('input', (e) => { if (validators[name](e.target.value)) showError(name, false); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.elements.fence_type.value) { goTo(1); showError('fence_type', true); return; }
    let firstBad = null;
    Object.entries(validators).forEach(([name, ok]) => {
      const bad = !ok(form.elements[name].value);
      showError(name, bad);
      if (bad && !firstBad) firstBad = form.elements[name];
    });
    if (firstBad) { firstBad.focus(); return; }

    const lead = Object.fromEntries(new FormData(form));
    // TODO: send `lead` to the CRM / form endpoint (e.g. fetch('/api/leads', { method: 'POST', body: JSON.stringify(lead) })).
    console.info('Estimate request', lead);

    steps.forEach((s) => s.classList.remove('is-active'));
    $('.quote__head', form).hidden = true;
    $('.js-success-name', form).textContent = lead.name ? `, ${lead.name.split(' ')[0]}` : '';
    $('.quote__success', form).hidden = false;
  });
  }

  // Links that point at the estimate form: scroll + focus the first step
  const focusForm = (fenceType) => {
    if (!form) return;
    if (fenceType) {
      const radio = $(`input[name="fence_type"][value="${fenceType}"]`, form);
      if (radio) { radio.checked = true; goTo(2); }
    }
    $('#estimate').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    const quote = $('.quote__form');
    quote.animate([{ boxShadow: '0 0 0 0 rgba(82,145,25,.6)' }, { boxShadow: '0 0 0 14px rgba(82,145,25,0)' }], { duration: 900, delay: 350 });
  };
  $$('[data-focus-form]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); focusForm(); }));

  /* ---------- Count-up stats ---------- */
  const fmt = (n, comma) => (comma ? n.toLocaleString('en-US') : String(n));
  const countUp = (el) => {
    const target = +el.dataset.count;
    const comma = el.dataset.format === 'comma';
    if (reduceMotion) return;
    const start = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))), comma);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.dataset.count) countUp(el);
      else {
        // Stagger siblings in the same grid
        const sibs = $$('.reveal', el.parentElement);
        el.style.transitionDelay = `${Math.max(0, sibs.indexOf(el)) % 3 * 90}ms`;
        el.classList.add('is-visible');
      }
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, [data-count]').forEach((el) => io.observe(el));

  /* ---------- Materials explorer ---------- */
  const MATERIALS = {
    wood: {
      name: 'Wood Fencing', label: 'wood', fence: 'Wood', img: 'assets/img/wood-3.webp', alt: 'Cedar shadowbox fence around a suburban home',
      desc: 'A warm, traditional look that fits almost any home. We install cedar, western red cedar and pressure-treated pine in privacy, shadowbox, picket and split rail styles.',
      best: 'Privacy, natural look, budget-friendly projects', height: '4 ft – 8 ft',
      brands: 'Cedar, Western Red Cedar, Pressure-Treated Pine', level: 3, maint: 'Stain or seal every few years',
      link: '/wood-fence-columbus-ohio',
    },
    vinyl: {
      name: 'Vinyl Fencing', label: 'vinyl', fence: 'Vinyl', img: 'assets/img/vinyl-3.webp', alt: 'White vinyl picket fence on a stone wall',
      desc: "Clean, bright and practically maintenance-free. Our premium vinyl is engineered to handle Ohio's freeze-thaw cycles without cracking, warping or fading.",
      best: 'Privacy, pools, picket fences, low upkeep', height: '3 ft – 8 ft',
      brands: 'Bufftech, Catalyst', level: 1, maint: 'Rinse with a hose once in a while',
      link: '/vinyl-fence-columbus-ohio',
    },
    aluminum: {
      name: 'Aluminum Fencing', label: 'aluminum', fence: 'Aluminum', img: 'assets/img/aluminum-1.webp', alt: 'Black aluminum fence surrounding a community pool',
      desc: 'The look of wrought iron without the rust. Rust-resistant powder-coated systems keep sightlines open, ideal for front yards, pools and commercial frontage.',
      best: 'Pool code compliance, front yards, curb appeal', height: '4 ft – 6 ft',
      brands: 'Catalyst, Ameristar', level: 1, maint: 'Virtually none',
      link: '/aluminum-fence-columbus-ohio',
    },
    chain: {
      name: 'Chain Link Fencing', label: 'chain link', fence: 'Chain Link', img: 'assets/img/chainlink-2.webp', alt: 'Galvanized chain link fence at a commercial property',
      desc: 'Durable, economical and secure. Available galvanized or vinyl-coated, with privacy slats, barbed wire or anti-climb options for commercial security.',
      best: 'Pet containment, large areas, commercial security', height: '4 ft – 12 ft',
      brands: 'Galvanized, Vinyl-Coated (black & green)', level: 1, maint: 'Virtually none',
      link: '/chain-link-fence-columbus-ohio',
    },
    composite: {
      name: 'Composite Fencing', label: 'composite', fence: 'Composite', img: 'assets/img/composite-1.webp', alt: 'Composite shadowbox fence in a green backyard',
      desc: 'The rich look of wood with none of the rot, splinters or staining. An eco-friendly option built for long-term performance and a consistent finish.',
      best: 'Premium privacy, long-term value, eco-conscious', height: '6 ft – 8 ft',
      brands: 'Wood-alternative composite panels', level: 2, maint: 'Occasional wash, no staining',
      link: '/composite-fence-columbus-ohio',
    },
  };

  const tabs = $$('.materials__tab');
  const matImg = $('.js-mat-img');
  const matInfo = $('.materials__info');
  const matCta = $('.js-mat-cta');

  const setMaterial = (key, focus) => {
    const m = MATERIALS[key];
    tabs.forEach((t) => {
      const on = t.dataset.mat === key;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    matImg.classList.add('is-swapping');
    matInfo.classList.add('is-swapping');
    setTimeout(() => {
      matImg.src = m.img;
      matImg.alt = m.alt;
      $('.js-mat-name').textContent = m.name;
      $('.js-mat-desc').textContent = m.desc;
      $('.js-mat-best').textContent = m.best;
      $('.js-mat-height').textContent = m.height;
      $('.js-mat-brands').textContent = m.brands;
      $('.js-mat-maint').textContent = m.maint;
      $('.js-mat-meter').dataset.level = m.level;
      $('.js-mat-link').href = m.link;
      matCta.dataset.fence = m.fence;
      matCta.firstChild.textContent = `Get a ${m.label} fence estimate `;
      matImg.classList.remove('is-swapping');
      matInfo.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 220);
  };

  if (tabs.length) {
  tabs.forEach((t, idx) => {
    t.addEventListener('click', () => setMaterial(t.dataset.mat));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setMaterial(tabs[next].dataset.mat, true);
    });
  });
  matCta.addEventListener('click', () => focusForm(matCta.dataset.fence));
  // Preload material images so tab switches are instant
  Object.values(MATERIALS).forEach((m) => { const i = new Image(); i.src = m.img; });
  }

  /* ---------- Gallery filter + lightbox ---------- */
  const items = $$('.gallery__item');
  $$('.filter').forEach((btn) =>
    btn.addEventListener('click', () => {
      $$('.filter').forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      const f = btn.dataset.filter;
      items.forEach((it) => it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f));
    })
  );

  const lb = $('#lightbox');
  if (lb && items.length) {
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  let lbIndex = 0;
  const visibleItems = () => items.filter((it) => !it.classList.contains('is-hidden'));
  const showLb = (i) => {
    const list = visibleItems();
    lbIndex = (i + list.length) % list.length;
    const img = $('img', list[lbIndex]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = $('.gallery__cap', list[lbIndex]).textContent;
  };
  items.forEach((it) => it.addEventListener('click', () => { showLb(visibleItems().indexOf(it)); lb.showModal(); }));
  $('.lightbox__close', lb).addEventListener('click', () => lb.close());
  $('.lightbox__nav--prev', lb).addEventListener('click', () => showLb(lbIndex - 1));
  $('.lightbox__nav--next', lb).addEventListener('click', () => showLb(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
  });
  }

  /* ---------- Reviews carousel ---------- */
  const track = $('.carousel');
  if (track) {
  const prev = $('[data-carousel="prev"]');
  const next = $('[data-carousel="next"]');
  const step = () => track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24);
  const updateArrows = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step() }));
  next.addEventListener('click', () => track.scrollBy({ left: step() }));
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
  }

  /* ---------- Service area map (Leaflet) ---------- */
  // `pos` sets which side of the pin the label sits on, to keep nearby labels apart
  const CITIES = {
    columbus: { name: 'Columbus', at: [39.9581, -82.9988], pos: 'right', hq: true },
    dublin: { name: 'Dublin', at: [40.0992, -83.1141], pos: 'left' },
    powell: { name: 'Powell', at: [40.1578, -83.0752], pos: 'left' },
    westerville: { name: 'Westerville', at: [40.1262, -82.9291], pos: 'right' },
    newalbany: { name: 'New Albany', at: [40.0812, -82.8088], pos: 'bottom' },
    hilliard: { name: 'Hilliard', at: [40.0334, -83.1588], pos: 'bottom' },
    ua: { name: 'Upper Arlington', at: [40.0279, -83.0624], pos: 'top' },
    grovecity: { name: 'Grove City', at: [39.8815, -83.093], pos: 'left' },
    lewiscenter: { name: 'Lewis Center', at: [40.1984, -83.0102], pos: 'right' },
    delaware: { name: 'Delaware', at: [40.2987, -83.068], pos: 'top' },
    galena: { name: 'Galena', at: [40.2159, -82.8796], pos: 'top' },
  };
  // OpenStreetMap's public tiles suit a low-traffic site; switch to a keyed provider (MapTiler, Stadia) for heavy traffic.
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const mapEl = $('#service-map');
  const initMap = () => {
    const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: false, zoomSnap: 0.25, attributionControl: true });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(TILES, {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.circle([40.09, -82.99], {
      radius: 27000, color: '#529119', weight: 2, dashArray: '6 8', fillColor: '#529119', fillOpacity: 0.08, interactive: false,
    }).addTo(map);

    const markers = {};
    Object.entries(CITIES).forEach(([key, c]) => {
      const icon = c.hq
        ? L.divIcon({
          className: `hq-marker city-marker city-marker--${c.pos}`,
          html: `<span class="hq-marker__pulse"></span><span class="hq-marker__pin"><svg viewBox="0 0 40 40"><use href="#logo-mark"/></svg></span><span class="city-marker__label">${c.name}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
        : L.divIcon({
          className: `city-marker city-marker--${c.pos}`,
          html: `<span class="city-marker__dot"></span><span class="city-marker__label">${c.name}</span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
      const m = L.marker(c.at, { icon, keyboard: false, riseOnHover: true, zIndexOffset: c.hq ? 1000 : 0 }).addTo(map);
      const chip = $(`.cities a[data-city="${key}"]`);
      m.on('mouseover', () => { m.getElement().classList.add('is-hot'); chip && chip.classList.add('is-hot'); });
      m.on('mouseout', () => { m.getElement().classList.remove('is-hot'); chip && chip.classList.remove('is-hot'); });
      if (c.hq) m.bindPopup('<strong>Elite Fence</strong><br>175 South 3rd St, Suite 200<br>Columbus, OH 43215');
      else m.on('click', () => { if (chip) window.location.href = chip.href; });
      markers[key] = m;
    });

    const bounds = L.latLngBounds(Object.values(CITIES).map((c) => c.at));
    const fit = () => map.fitBounds(bounds, { padding: mapEl.clientWidth < 500 ? [36, 36] : [56, 48] });
    fit();

    $$('.cities a').forEach((a) => {
      const m = markers[a.dataset.city];
      if (!m) return;
      const base = CITIES[a.dataset.city].hq ? 1000 : 0;
      const on = () => { m.getElement().classList.add('is-hot'); m.setZIndexOffset(2000); };
      const off = () => { m.getElement().classList.remove('is-hot'); m.setZIndexOffset(base); };
      a.addEventListener('mouseenter', on);
      a.addEventListener('mouseleave', off);
      a.addEventListener('focus', on);
      a.addEventListener('blur', off);
    });

    // Container size changes between breakpoints; keep tiles and framing correct
    new ResizeObserver(() => { map.invalidateSize(); fit(); }).observe(mapEl);
  };

  // Initialise only when the section approaches the viewport, so tiles don't load up front
  if (mapEl && window.L) {
    const mapIo = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { mapIo.disconnect(); initMap(); }
    }, { rootMargin: '400px' });
    mapIo.observe(mapEl);
  } else if (mapEl) {
    mapEl.closest('.map').hidden = true;
  }

  /* ---------- Buttons that open the estimate form with a material preselected ---------- */
  $$('[data-quote-fence]').forEach((b) => b.addEventListener('click', () => focusForm(b.dataset.quoteFence)));

  /* ---------- Privacy style picker ---------- */
  const stylePicker = $('.style-picker');
  if (stylePicker) {
    const opts = $$('.style-picker__opt', stylePicker);
    const img = $('.js-style-img', stylePicker);
    const panel = $('.style-picker__panel', stylePicker);
    const setStyle = (opt, focus) => {
      opts.forEach((o) => {
        const on = o === opt;
        o.classList.toggle('is-active', on);
        o.setAttribute('aria-selected', on);
        o.tabIndex = on ? 0 : -1;
      });
      if (focus) opt.focus();
      const d = opt.dataset;
      panel.classList.add('is-swapping');
      setTimeout(() => {
        img.src = d.img;
        img.alt = d.alt;
        $('.js-style-name', stylePicker).textContent = $('.style-picker__name', opt).textContent;
        $('.js-style-desc', stylePicker).textContent = d.desc;
        $('.js-style-best', stylePicker).textContent = d.best;
        $('.js-style-level', stylePicker).dataset.level = d.level;
        $('.js-style-level-text', stylePicker).textContent = d.levelText;
        $('.js-style-mats', stylePicker).innerHTML = d.mats.split(',').map((m) => `<span>${m.trim()}</span>`).join('');
        panel.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    };
    opts.forEach((o, idx) => {
      o.addEventListener('click', () => setStyle(o));
      o.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        setStyle(opts[(idx + keys[e.key] + opts.length) % opts.length], true);
      });
      const pre = new Image();
      pre.src = o.dataset.img;
    });
  }

  /* ---------- Fence height guide ---------- */
  const heightGuide = $('.height-guide');
  if (heightGuide) {
    const PX_PER_FT = 36;
    const GROUND = 340;
    const clip = $('#hg-clip-rect', heightGuide);
    const cap = $('.js-hg-cap', heightGuide);
    const dim = $('.js-hg-dim', heightGuide);
    const dimLabel = $('.js-hg-dim-label', heightGuide);
    const btns = $$('.height-guide__btn', heightGuide);
    let shown = 6;

    const draw = (ft) => {
      const top = GROUND - ft * PX_PER_FT;
      clip.setAttribute('y', top);
      clip.setAttribute('height', ft * PX_PER_FT);
      cap.setAttribute('y', top - 6);
      dim.setAttribute('y1', top);
      dimLabel.setAttribute('y', top + (ft * PX_PER_FT) / 2 + 5);
      dimLabel.textContent = `${Math.round(ft * 10) / 10} ft`.replace('.0', '');
    };
    const animateTo = (ft) => {
      const from = shown;
      if (reduceMotion) { shown = ft; draw(ft); return; }
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min((t - start) / 500, 1);
        const e = 1 - Math.pow(1 - p, 3);
        shown = from + (ft - from) * e;
        draw(shown);
        if (p < 1) requestAnimationFrame(tick);
        else dimLabel.textContent = `${ft} ft`;
      };
      requestAnimationFrame(tick);
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', x === b); });
      $$('.height-guide__note', heightGuide).forEach((n) => { n.hidden = n.dataset.ft !== b.dataset.ft; });
      heightGuide.dataset.ft = b.dataset.ft;
      animateTo(+b.dataset.ft);
    }));
    draw(shown);
    dimLabel.textContent = '6 ft';
  }

  /* ---------- Material comparison helper ---------- */
  const compare = $('.compare');
  if (compare) {
    const picks = $$('.compare__pick', compare);
    picks.forEach((p) => p.addEventListener('click', () => {
      const on = !p.classList.contains('is-active');
      picks.forEach((x) => { x.classList.toggle('is-active', on && x === p); x.setAttribute('aria-pressed', on && x === p); });
      compare.dataset.highlight = on ? p.dataset.mat : '';
      const result = $('.js-compare-result', compare);
      result.textContent = on ? p.dataset.reason : '';
      result.hidden = !on;
    }));
  }

  /* ---------- Callback form ---------- */
  const mini = $('#mini-form');
  if (mini) mini.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = mini.elements.name;
    const phone = mini.elements.phone;
    const zip = mini.elements.zip;
    const checks = [[name, validators.name], [phone, validators.phone], [zip, validators.zip]];
    let ok = true;
    checks.forEach(([el, fn]) => { const bad = !fn(el.value); el.classList.toggle('is-invalid', bad); if (bad) ok = false; });
    const status = $('.mini-form__status', mini);
    if (!ok) { status.style.color = '#c23b3b'; status.textContent = 'Please check the highlighted fields.'; return; }
    // TODO: send to the same lead endpoint as the estimate form.
    console.info('Callback request', Object.fromEntries(new FormData(mini)));
    status.style.color = '';
    status.textContent = "Thanks! We'll call you shortly to schedule your free estimate.";
    mini.reset();
  });

  $('.js-year').textContent = new Date().getFullYear();
})();
