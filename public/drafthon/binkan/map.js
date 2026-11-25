// 지도 한 겹: 카카오 지도(JavaScript 키가 있을 때) 또는 임시 지도(실제 업소 좌표로 그린 점 지도, 인터넷 없이도 돎)
// 쓰는 법: const m = await MapView.create(el, MAPDATA, { onPick(id) }); m.draw(pins); m.focus(id)
// pins: [{ id, x, y, html, cls }] — 핀 모양은 app.js가 정하고 지도는 자리만 잡는다.
// h.onSpot(x, y): 핀이 아닌 빈 곳을 (끌지 않고) 누르면 그 경위도를 알려 준다(「내 가게」 위치 찍기).
(function () {
  let kakaoP = null;
  const FORCE_PLAIN = /[?&]map=plain\b/.test(location.search);   // 임시 지도 시험용(첫 주소에서 한 번만 읽음)   // SDK는 한 번만 불러온다(작은 지도를 여러 번 만들어도)
  const loadKakao = key => kakaoP || (kakaoP = new Promise((ok, no) => {
    if (!key) return no(new Error('no key'));
    const s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=' + encodeURIComponent(key);
    const t = setTimeout(() => no(new Error('timeout')), 7000);
    s.onload = () => { clearTimeout(t); try { kakao.maps.load(() => ok()); } catch (e) { no(e); } };
    s.onerror = () => { clearTimeout(t); no(new Error('sdk load fail')); };
    document.head.appendChild(s);
  }));

  // 바람 핀이 겹치면 우선순위(z) 낮은 쪽을 하트만 남은 작은 핀으로, 그래도 겹치면 숨김(확대하면 다시 보임)
  function declutter(list) {
    const taken = [];
    for (const p of list.filter(p => p._el.classList.contains('wish')).sort((a, b) => (b.z || 0) - (a.z || 0))) {
      p._el.classList.remove('compact', 'hide');
      const hit = r => taken.some(t => r.left < t.right + 2 && r.right > t.left - 2 && r.top < t.bottom + 2 && r.bottom > t.top - 2);
      let r = p._el.getBoundingClientRect();
      if (hit(r)) { p._el.classList.add('compact'); r = p._el.getBoundingClientRect(); if (hit(r)) { p._el.classList.add('hide'); continue; } }
      taken.push(r);
    }
  }

  function pinEl(p, onPick) {
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'pin ' + (p.cls || ''); d.innerHTML = p.html; d.dataset.id = p.id;
    d.setAttribute('aria-label', p.label || p.id);
    d.addEventListener('click', e => { e.stopPropagation(); onPick(p.id); });
    return d;
  }

  // ---------- 카카오 ----------
  function kakaoView(el, data, h) {
    const [x0, y0, x1, y1] = data.meta.box;
    const map = new kakao.maps.Map(el, { center: new kakao.maps.LatLng((y0 + y1) / 2, (x0 + x1) / 2), level: 3 });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    let ovs = [], cur = [];
    const tidy = () => requestAnimationFrame(() => declutter(cur));
    kakao.maps.event.addListener(map, 'idle', tidy);
    if (h.onSpot) kakao.maps.event.addListener(map, 'click', e => h.onSpot(e.latLng.getLng(), e.latLng.getLat()));
    return {
      kind: 'kakao',
      draw(pins) {
        ovs.forEach(o => o.setMap(null));
        cur = pins.map(p => Object.assign({}, p, { _el: pinEl(p, h.onPick) }));
        ovs = cur.map(p => new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(p.y, p.x), content: p._el, yAnchor: 1, zIndex: p.z || 1, clickable: true }));
        ovs.forEach(o => o.setMap(map));
        tidy();
      },
      focus(p) { map.panTo(new kakao.maps.LatLng(p.y, p.x)); },
      relayout() { map.relayout(); },
      fitTo(list) {
        if (!list.length) return;
        const bd = new kakao.maps.LatLngBounds(); list.forEach(p => bd.extend(new kakao.maps.LatLng(p.y, p.x))); const phone = window.innerWidth <= 640; map.setBounds(bd, 70, phone ? 30 : 60, phone ? Math.round(window.innerHeight * 0.45) : 40, phone ? 30 : 40);   // 폰은 아래 패널, 큰 화면은 오른쪽 안내 자리만큼 비움
      },
    };
  }

  // ---------- 임시 지도 ----------
  function plainView(el, data, h) {
    const [x0, y0, x1, y1] = data.meta.box;
    const k = Math.cos(((y0 + y1) / 2) * Math.PI / 180);           // 경도 → 거리 보정
    const W = 1000, H = Math.round(W * (y1 - y0) / ((x1 - x0) * k));
    const px = (x, y) => [(x - x0) / (x1 - x0) * W, (y1 - y) / (y1 - y0) * H];
    el.classList.add('plain');
    el.innerHTML = `<div class="stage"><svg class="base" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg><div class="pins"></div></div>
      <div class="zoom"><button type="button" data-z="1" aria-label="확대">+</button><button type="button" data-z="-1" aria-label="축소">−</button></div>
      <p class="mapnote">임시 지도 · 점 하나가 영업 중인 업소 하나 (소진공 상가정보 ${data.meta.q_now})</p>`;
    const stage = el.querySelector('.stage'), svg = el.querySelector('svg'), layer = el.querySelector('.pins');
    // 배경: 업소 점 → 길 모양이 드러남
    let dots = '';
    for (const [x, y] of data.bg) { const [a, b] = px(x, y); dots += `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="1.6"/>`; }
    let lms = '';
    for (const [name, [x, y]] of Object.entries(data.lm || {})) { const [a, b] = px(x, y); lms += `<g class="lm"><rect x="${a - 4}" y="${b - 4}" width="8" height="8" rx="2"/><text x="${a + 8}" y="${b + 4}">${name}</text></g>`; }
    svg.innerHTML = `<rect width="${W}" height="${H}" class="ground"/><g class="dots">${dots}</g>${lms}`;

    let s = 1, tx = 0, ty = 0, pins = [];
    const fit = () => { const r = el.getBoundingClientRect(); s = Math.min(r.width / W, r.height / H) * 1.02; tx = (r.width - W * s) / 2; ty = (r.height - H * s) / 2; apply(); };
    function apply() {
      stage.style.transform = `translate(${tx}px,${ty}px)`;
      svg.style.transform = `scale(${s})`;
      for (const p of pins) { const [a, b] = p._xy; p._el.style.left = a * s + 'px'; p._el.style.top = b * s + 'px'; }
      declutter(pins);
    }
    // 바람 핀이 겹치면 우선순위(z) 낮은 쪽을 하트만 남은 작은 핀으로

    function zoomAt(f, cx, cy) { const ns = Math.max(0.4, Math.min(6, s * f)); tx = cx - (cx - tx) * ns / s; ty = cy - (cy - ty) * ns / s; s = ns; apply(); }
    el.addEventListener('wheel', e => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    el.querySelectorAll('.zoom button').forEach(b => b.onclick = () => { const r = el.getBoundingClientRect(); zoomAt(b.dataset.z > 0 ? 1.3 : 1 / 1.3, r.width / 2, r.height / 2); });
    let drag = null;
    el.addEventListener('pointerdown', e => { if (e.target.closest('.pin,.zoom')) return; drag = { x: e.clientX - tx, y: e.clientY - ty, sx: e.clientX, sy: e.clientY }; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); });
    el.addEventListener('pointermove', e => { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); });
    // 움직임 없는 클릭만 「찍기」로: 화면 좌표 → 경위도 (px의 역)
    const end = e => {
      const d = drag; drag = null; el.classList.remove('dragging');
      if (!d || !h.onSpot || !e || e.type !== 'pointerup' || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) return;
      const r = el.getBoundingClientRect(), a = (e.clientX - r.left - tx) / s, b = (e.clientY - r.top - ty) / s;
      if (a < 0 || b < 0 || a > W || b > H) return;
      h.onSpot(+(x0 + a / W * (x1 - x0)).toFixed(6), +(y1 - b / H * (y1 - y0)).toFixed(6));
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    new ResizeObserver(() => { if (!pins.length || !s) fit(); }).observe(el);
    fit();
    return {
      kind: 'plain',
      draw(list) {
        layer.innerHTML = '';
        pins = list.map(p => { const e = pinEl(p, h.onPick); e.style.zIndex = p.z || 1; layer.appendChild(e); return Object.assign({}, p, { _el: e, _xy: px(p.x, p.y) }); });
        apply();
      },
      focus(p) {
        const r = el.getBoundingClientRect(), [a, b] = px(p.x, p.y);
        if (s < 1.6) s = 1.6;
        // 좁은 화면은 아래 패널이 지도를 덮으므로 위쪽 30% 지점에 맞춤
        const cy = window.innerWidth <= 640 ? r.height * 0.3 : r.height / 2;
        tx = r.width / 2 - a * s; ty = cy - b * s; apply();
      },
      relayout() { fit(); },
      // 주어진 점들이 화면에 꽉 차게 (첫 화면: 바람이 모인 곳)
      fitTo(list, padPx = 90) {
        if (!list.length) return;
        const r = el.getBoundingClientRect(), xy = list.map(p => px(p.x, p.y));
        const a0 = Math.min(...xy.map(v => v[0])), a1 = Math.max(...xy.map(v => v[0])), b0 = Math.min(...xy.map(v => v[1])), b1 = Math.max(...xy.map(v => v[1]));
        s = Math.max(0.4, Math.min(3, (r.width - padPx * 2) / Math.max(1, a1 - a0), (r.height - padPx * 2) / Math.max(1, b1 - b0)));
        const phone = window.innerWidth <= 640, vh = phone ? r.height * 0.55 : r.height;
        if (phone) s = Math.min(s, (vh - padPx) / Math.max(1, b1 - b0));
        tx = r.width / 2 - (a0 + a1) / 2 * s; ty = vh / 2 - (b0 + b1) / 2 * s; apply();
      },
    };
  }

  window.MapView = {
    async create(el, data, h) {
      try { if (FORCE_PLAIN) throw new Error('plain'); await loadKakao(window.KAKAO_JS_KEY); return kakaoView(el, data, h); }   // ?map=plain: 임시 지도 시험용
      catch (e) { const v = plainView(el, data, h); console.warn('카카오 지도 실패:', e.message); v.why = window.KAKAO_JS_KEY && !FORCE_PLAIN ? '카카오 지도를 아직 쓸 수 없어 임시 지도로 보여요 (도메인 등록 확인)' : ''; return v; }
    },
  };
})();
