// 동성로 빈칸 — 첫 화면(지도) · 빈칸 상세 · 바람 남기기 · 공감 · 로그인 · 회원가입 · 검색 · 입구 · 지원 안내 띠 · 오픈 이벤트
// 저장은 이 브라우저(localStorage)에만. 백엔드가 붙으면 store.* 만 API로 바꾸면 된다(청사진 §7 API 표).
(function () {
  const M = window.MAPDATA, SEED = window.SEED, SUP = window.SUP;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SP = Object.fromEntries(M.spaces.map(s => [s.id, s]));
  // 거리(m): 위도 35.87°에서 경도 · 위도 1도 길이. 빈칸 데이터를 만든 demo_v3/tools/build_data.py와 같은 식
  const L0 = 35.87 * Math.PI / 180, KX = 111412.84 * Math.cos(L0) - 93.5 * Math.cos(3 * L0), KY = 111132.92 - 559.82 * Math.cos(2 * L0) + 1.175 * Math.cos(4 * L0);
  const dist = (a, b) => Math.hypot((a.x - b.x) * KX, (a.y - b.y) * KY);

  // ---------------- 저장 ----------------
  const KEY = 'binkan.v1';
  const st = Object.assign({ user: null, wishes: [], liked: {}, entered: false }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  // 역할은 더하는 방식(청사진 §4-2): roles[]에 쌓고, role은 가장 최근에 더한 역할(지원 안내 · 바람 「쓴 사람」 표시용)
  const rolesOf = u => !u ? [] : Array.isArray(u.roles) && u.roles.length ? u.roles : [u.role || 'citizen'];
  if (st.user && !Array.isArray(st.user.roles)) st.user.roles = rolesOf(st.user);
  const hasRole = r => rolesOf(st.user).includes(r);
  function addRole(r) {
    if (!st.user || hasRole(r)) return false;
    st.user.roles = rolesOf(st.user).concat(r); st.user.role = r;
    const a = st.accounts && st.accounts[st.user.id]; if (a) { a.roles = st.user.roles.slice(); a.role = r; }
    save(); return true;
  }
  const MY = () => window.MYSTORE;
  // 공감은 회원마다 1회: st.likedBy = { 회원 id: { 바람 id: true } }, st.liked = 지금 로그인한 회원의 것(같은 객체), 공감 수는 모든 회원 것을 더함
  if (!st.likedBy || typeof st.likedBy !== 'object') { st.likedBy = {}; if (st.liked && Object.keys(st.liked).length) st.likedBy[st.user ? st.user.id : '_old'] = st.liked; }
  const linkLikes = () => { st.liked = st.user ? (st.likedBy[st.user.id] || (st.likedBy[st.user.id] = {})) : {}; };
  linkLikes();
  // 사장님 상담 · 학생 지원 진행은 회원마다(로그인 전엔 '_guest'). st.owner · st.stu는 지금 회원 것을 가리키는 창(저장은 ownerBy · stuBy)
  const ukey = () => st.user ? st.user.id : '_guest';
  ['owner', 'stu'].forEach(k => {
    const by = st[k + 'By'] && typeof st[k + 'By'] === 'object' ? st[k + 'By'] : (st[k + 'By'] = {});
    if (st[k] && !Object.keys(by).length) by[ukey()] = st[k];   // 옛 상태: 하나뿐이던 진행을 지금 회원 것으로
    delete st[k];
    Object.defineProperty(st, k, { get: () => by[ukey()], set: v => { by[ukey()] = v; }, enumerable: false, configurable: true });
  });
  // 옛 상태 옮기기(처음 한 번): 주인 없는 공감 · 바람은 처음 로그인한 회원 것으로, 운영단 표가 없던 때 낸 지원서는 지원서 목록으로
  function migrate() {
    if (!st.user) return;
    const old = st.likedBy._old; if (old) { Object.assign(st.liked, old); delete st.likedBy._old; }
    st.wishes.forEach(w => { if (!w.uid) w.uid = st.user.id; });
    const o = st.owner;
    if (o && o.app && o.step >= 5 && !o.appId && o.tasks && o.tasks.list) {
      const L = st.ownerApps || (st.ownerApps = []), ap = { id: 'oa' + Date.now().toString(36), uid: st.user.id, name: st.user.name, status: o.status, item: o.item, space: o.space, near: o.near,
        place: o.space && SP[o.space] ? shortAddr(SP[o.space]) : (o.near || '') + ' 근처', trouble: o.trouble || '', problem: o.problem ? o.problem.one : '', tasks: o.tasks.list.filter(t => t.on).map(t => ({ t: t.t, major: t.major, out: t.out, wk: t.wk })),
        when: o.app.when, use: o.app.use || [], msg: o.app.msg || '', track: !!o.app.track, handover: !!o.app.handover, at: o.submittedAt || Date.now(), result: o.result || null, score: null };
      L.push(ap); o.appId = ap.id;
    }
    save();
  }
  // 바람 저장소: 팀 백엔드(backend.js, BK.on)가 살아 있으면 서버, 아니면 이 브라우저. 화면은 store.*만 부른다.
  const SV = () => !!(window.BK && window.BK.on);
  const myServer = () => (st.user && st.myOps && st.myOps[st.user.id]) || [];
  const store = {
    wishes: () => SV() ? window.BK.wishes.map(w => myServer().includes(w.op) ? Object.assign({}, w, { uid: st.user.id, who: roleName(st.user.role) }) : Object.assign({}, w)).concat(st.wishes.filter(w => w.pending))   // 서버가 깨어나기 전에 쓴 바람도 사라지지 않게
      : SEED.wishes.map(w => Object.assign({ seed: true }, w)).concat(st.wishes),
    likes: w => SV() ? w.likes : w.likes + Object.values(st.likedBy).filter(m => m && m[w.id]).length,
    liked: w => SV() ? !!w.liked : !!st.liked[w.id],
    bySpace: id => store.wishes().filter(w => w.space === id).sort((a, b) => store.likes(b) - store.likes(a)),
    // 둘 다 Promise. 서버 모드에서 실패하면 throw(401이면 로그인 만료)
    async add(w) {
      if (!SV()) { w.pending = !!window.BK; st.wishes.push(w); save(); return w; }   // 서버가 아직(깨어나는 중) → 이 기기에 두고 서버가 붙으면 올림(flushPending)
      const x = await window.BK.add(w); if (!x) return null;
      const m = st.myOps || (st.myOps = {}); (m[st.user.id] || (m[st.user.id] = [])).push(x.op); save();
      return Object.assign({}, x, { uid: st.user.id });
    },
    async toggleLike(id) {
      if (!SV()) { st.liked[id] = !st.liked[id]; if (!st.liked[id]) delete st.liked[id]; save(); return; }
      const w = await window.BK.toggleLike(id);
      if (w) { if (w.liked) st.liked[id] = true; else delete st.liked[id]; save(); }   // 내 가게 알림(공감한 사람) 계산용 거울
    },
  };
  // 서버 요청이 로그인 만료(401)로 막히면 다시 로그인하게
  function serverFail(e, retry) {
    if (e && e.status === 401) { st.user = null; linkLikes(); save(); render(); toast('로그인이 만료됐어요. 다시 로그인해 주세요'); return needAuth(retry); }
    toast('서버에 저장하지 못했어요 · 잠시 뒤 다시 해 주세요'); console.warn(e);
  }

  // ---------------- 화면 상태 ----------------
  let view = { mode: 'home', space: null, q: '' };
  let map = null;

  // 빈칸 이름: 도로명 주소의 끝부분만
  const shortAddr = s => (s.addr || '').replace(/^대구광역시 중구 /, '');
  const ago = d => d === 0 ? '오늘' : d + '일 전';

  // ---------------- 핀 ----------------
  function pins() {
    const all = store.wishes();
    const top = all.slice().sort((a, b) => store.likes(b) - store.likes(a));
    const hot = new Set(top.slice(0, 3).map(w => w.space));
    return M.spaces.map(s => {
      const ws = store.bySpace(s.id), sel = view.space === s.id;
      if (!ws.length) return { id: s.id, x: s.x, y: s.y, cls: 'empty' + (sel ? ' sel' : ''), html: '<i class="sq"></i>', label: '빈칸 ' + shortAddr(s), z: sel ? 9000 : 1 };
      const w = ws[0], n = store.likes(w);
      const na = MY() ? new Set(ws.flatMap(x => MY().answersFor(x.id)).map(a => a.sid)).size : 0;   // 이 빈칸 바람에 답한 근처 가게 수
      return {
        id: s.id, x: s.x, y: s.y, z: sel ? 9999 : (hot.has(s.id) ? 2000 : 1000) + n,
        cls: 'wish' + (hot.has(s.id) ? ' hot' : '') + (sel ? ' sel' : '') + (na ? ' answered' : ''),
        html: `<span class="t">${esc(w.title)}</span><span class="n">♥ ${n}</span>${ws.length > 1 ? `<span class="more">+${ws.length - 1}</span>` : ''}${na ? `<i class="adot" title="근처 가게 ${na}곳이 답했어요"></i>` : ''}`,
        label: `빈칸 ${shortAddr(s)} · 바람 ${ws.length}개 · 1위 ${w.title}${na ? ` · 근처 가게 ${na}곳이 답함` : ''}`,
      };
    }).concat(MY() ? MY().storePins() : []);   // 근처 바람에 답하고 지금 하는 가게(끝나지 않은 답) — 시민이 찾아갈 수 있게
  }
  const redraw = () => map && map.draw(pins());

  // ---------------- 오른쪽 패널 ----------------
  const P = $('#panel');
  function render() {
    P.dataset.mode = view.mode;
    document.body.classList.toggle('panel-open', view.mode !== 'home');
    const work = { owner: window.OWNER, student: window.STUDENT, mystore: window.MYSTORE, ops: window.OPS }[view.mode];
    document.body.classList.toggle('work-open', !!work);
    if (work) { $('#work').innerHTML = work.render(); $('#work').scrollTop = 0; work.mount && work.mount(); renderMe(); renderRail(); return; }
    const f = { home, space, write, howto, search, mine }[view.mode] || home;
    P.innerHTML = f();
    P.scrollTop = 0;
    renderMe(); renderRail();
  }
  // 화면을 옮길 때마다 방문 기록을 하나 쌓는다 → 폰의 「뒤로」가 사이트를 나가지 않고 앞 화면으로 감(popstate가 되돌림)
  let popping = false;
  const urlOf = v => location.pathname + location.search + (v.mode === 'space' && v.space ? '#s=' + v.space : v.mode === 'home' ? '' : location.hash);
  const jsonable = o => { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return { mode: o.mode, space: o.space || null }; } };
  function go(mode, extra) {
    const was = view.mode, wasSpace = view.space;
    view = Object.assign({ mode, space: null, q: '' }, extra || {});
    const url = urlOf(view);
    if (!popping && (mode !== was || view.space !== wasSpace)) history.pushState({ bk: jsonable(view) }, '', url);
    else if (!popping) history.replaceState({ bk: jsonable(view) }, '', url);
    if (mode === 'space' && view.space) map && map.focus(SP[view.space]);
    if ((mode === 'mine' || mode === 'mystore') && SV() && window.BK.refresh) window.BK.refresh();   // 새 답 · 내 알림(서버) 다시 받기
    render(); redraw();
    if (WORKS.includes(was) && !WORKS.includes(mode) && map) setTimeout(() => { map.relayout(); if (view.space) map.focus(SP[view.space]); }, 0);
  }
  const WORKS = ['owner', 'student', 'mystore', 'ops'];   // #work 영역을 쓰는 화면(지도 · 패널이 숨음)
  const back = (to = 'home', label = '지도 처음으로') => `<button class="back" data-act="${to}">← ${label}</button>`;

  function wishCard(w, withPlace) {
    const s = SP[w.space], on = store.liked(w);
    return `<article class="wcard" id="w-${esc(w.id)}">
      <div class="wh"><span class="cat">${esc(w.cat)}</span>${w.seed ? '' : '<span class="tag mine">내 바람</span>'}</div>
      <h4>${esc(w.title)}</h4>
      <p>${esc(w.why)}</p>
      ${withPlace ? `<button class="place" data-act="space" data-id="${esc(w.space)}">📍 ${esc(shortAddr(s))}</button>` : ''}
      <div class="wf"><span class="who">${w.seed ? '운영팀' : esc(w.who)} · ${ago(w.ago || 0)}</span>
        <button class="like${on ? ' on' : ''}" data-act="like" data-id="${esc(w.id)}" aria-pressed="${on}">♥ 공감 ${store.likes(w)}</button>
        <button class="share" data-act="share" data-id="${esc(w.id)}">공유</button></div>
      ${answersHTML(w)}
    </article>`;
  }
  // 바람 카드 아래 「근처 가게가 답했어요」(누구나 봄) + 가 봤어요 · 신고 (회원)
  function answersHTML(w) {
    const L = MY() ? MY().answersFor(w.id) : [];
    if (!L.length) return '';
    const uid = st.user && st.user.id;
    return `<div class="wans"><p class="wansh">근처 가게 ${L.length}곳이 답했어요 <small>바람은 그대로 열려 있어요</small></p>${L.map(a => {
      const end = a.state === '끝남', ready = a.state === '준비 중', went = MY().wentBy(a.id, uid), wanted = MY().wantBy(a.id, uid), rep = MY().reportedBy(a.id, uid), own = uid && a.uid === uid;
      const label = end ? '끝났어요' : a.outcome === '정식' ? '이제 늘 팔아요' : a.state, tl = MY().trialLabel(a), mineN = uid && MY().noteBy(a.id, uid), notes = MY().notesOf(a).slice(-3).reverse();
      // 「준비 중」이면 [먹어보고 싶어요](관심), 판매를 시작하면 [가 봤어요] + 가 본 시민 한 줄(모두에게 공개 · 신고는 운영단이 처리)
      const act = own ? '<small class="fine">내 가게가 올린 답</small>' : ready ? `<button class="want${wanted ? ' on' : ''}" data-act="want" data-id="${esc(a.id)}"${wanted ? ' aria-pressed="true"' : ''}>먹어보고 싶어요 ${a.wants || 0}</button>`
        : end ? '' : `<button class="went${went ? ' on' : ''}" data-act="went" data-id="${esc(a.id)}"${went ? ' aria-pressed="true"' : ''}>가 봤어요 ${a.went || 0}</button>`;
      return `<div class="wa${end ? ' end' : ''}" id="a-${esc(a.id)}"><p class="wah"><b>${esc(a.store)}</b> <small>${esc(a.item)} · 약 ${MY().roundDist(a.dist)}m</small><span class="tag st">${esc(label)}</span></p>
        ${a.menu ? `<p class="wam">${esc(a.menu)}</p>` : ''}${tl && !end ? `<p class="wtrial">${esc(tl)}</p>` : ''}<p class="war">${esc(a.reply)}</p>
        <div class="waf">${end ? '' : `<button data-act="storemap" data-id="${esc(a.id)}">지도에서 가게 보기</button>`}${act}${own ? '' : `<button class="rep" data-act="report" data-id="${esc(a.id)}"${rep ? ' disabled' : ''}>${rep ? '신고함' : '신고'}</button>`}</div>
        ${went && !own && !end ? `<div class="wnote"><input id="note-${esc(a.id)}" maxlength="60" value="${esc(mineN ? mineN.t : '')}" placeholder="가 봤어요 — 한 줄 남길래요? (선택, 60자 · 모두에게 보여요)"><button data-act="notego" data-id="${esc(a.id)}">${mineN ? '한 줄 바꾸기' : '남기기'}</button><p class="err" id="nerr-${esc(a.id)}" hidden></p></div>` : ''}
        ${notes.length ? `<ul class="wnotes"><li class="wnh">가 본 시민 한 줄</li>${notes.map(n => `<li>「${esc(n.t)}」${uid && n.uid === uid ? ' <small>(내 한 줄)</small>' : uid ? ` <button class="link" data-act="report" data-id="${esc(a.id)}" data-n="${esc(n.id)}">신고</button>` : ''}</li>`).join('')}</ul>` : ''}</div>`;
    }).join('')}</div>`;
  }

  // ---------------- 지원 안내 (구글 애즈처럼 자리마다 하나씩) ----------------
  // 후보 = 동행 프로젝트 모집 2 + 확인한 지원사업. 백엔드가 붙으면 pickAd()만 서버 추천으로 바꾼다(청사진 §5).
  const ADS = [
    { id: 'prog-owner', kind: 'prog', who: ['citizen', 'pre', 'open'], region: '동성로', act: 'owner', title: SEED.program.owner.title, sub: SEED.program.owner.sub, tag: SEED.program.owner.tag },
    { id: 'prog-student', kind: 'prog', who: ['student', 'citizen'], region: '동성로', act: 'student', title: SEED.program.student.title, sub: SEED.program.student.sub, tag: SEED.program.student.tag },
  ].concat(SUP.list.map(x => ({ id: x.id, kind: 'sup', who: x.who, region: x.region, closed: x.closed, needCheck: x.needCheck, url: x.url, title: x.name, sub: x.org + ' · ' + x.what })));
  const shown = {}, lastAd = {};
  // 점수: 지금 화면(ctx) · 역할 · 지역 · 마감 · 이번 방문에 몇 번 봤나. 이유도 같이 돌려준다.
  function pickAd(ctx, slot, exclude) {
    const roles = st.user ? rolesOf(st.user) : ['citizen'];
    const sp = view.space && SP[view.space], hasWish = sp && store.bySpace(sp.id).length;
    let best = null;
    for (const a of ADS) {
      if (a.id === exclude || (a.act && a.act === ctx)) continue;   // 지금 들어와 있는 곳의 모집은 다시 안 띄움
      let sc = 0; const why = [];
      const hitRole = st.user && roles.find(r => a.who.includes(r));
      if (hitRole) { sc += 3; why.push(roleName(hitRole) + ' 회원이라서'); }
      if (ctx === 'mystore' && a.who.includes('open')) { sc += 4; why.push('가게를 하는 사장님 화면이라서'); }   // [가정] 가중치
      if (ctx === 'student' && a.id === 'prog-student') { sc += 6; why.push('대학생 입구를 보고 있어서'); }
      if (ctx === 'owner' && a.kind === 'sup' && a.who.includes('pre')) { sc += 4; why.push('사장님 입구를 보고 있어서'); }
      if (ctx === 'owner' && a.id === 'prog-owner') { sc += 3; }
      if (ctx === 'space' && a.id === 'prog-owner') { sc += hasWish ? 5 : 3; why.push(hasWish ? '시민 바람이 붙은 빈칸을 보고 있어서' : '빈칸을 보고 있어서'); }
      if (ctx === 'space' && a.kind === 'sup' && a.who.includes('pre')) { sc += 3; why.push('이 자리에서 창업할 때 받을 수 있어서'); }
      if (ctx === 'home' && a.kind === 'prog') { sc += 2; why.push('1기 사전 신청을 받고 있어서'); }
      if (ctx === 'student' && a.id === 'sinsa') { sc += 4; why.push('창업을 꿈꾸는 학생이라면 볼 만해서'); }
      if (a.region === '대구 동성로' || a.region === '동성로') { sc += 2; why.push('동성로 지도를 보고 있어서'); }
      if (a.closed) sc -= 6;
      if (a.needCheck) sc -= 0.5;
      sc -= 1.6 * (shown[a.id] || 0);
      if (!best || sc > best.sc) best = { a, sc, why };
    }
    if (best && lastAd[slot] !== best.a.id) { shown[best.a.id] = (shown[best.a.id] || 0) + 1; lastAd[slot] = best.a.id; }
    return best;
  }
  function adHTML(ctx, slot, exclude) {
    const b = pickAd(ctx, slot, exclude); if (!b) return '';
    const a = b.a, why = [...new Set(b.why)].slice(0, 2).join(' · ') || '동성로 사람들이 많이 보는 안내라서';
    const body = `<span class="nk">${a.kind === 'prog' ? esc(a.tag) : '지원 안내'}${a.closed ? ' · <em>마감</em>' : ''}${a.needCheck ? ' · 공고 확인 필요' : ''}</span><b>${esc(a.title)}</b><small>${esc(a.sub)}</small>`;
    const main = a.url ? `<a class="adbody" href="${esc(a.url)}" target="_blank" rel="noopener">${body}</a>` : `<button class="adbody" data-act="${a.act}">${body}</button>`;
    return `<div class="ad ad-${a.kind}" data-ad="${esc(a.id)}">${main}<details class="adwhy"><summary aria-label="왜 이 안내가 보이나요">ⓘ</summary><p>${esc(why)} 보여요. 공공 지원사업과 동행 프로젝트만 띄우고 상업 광고는 받지 않아요.${a.kind === 'sup' ? ` (${esc(SUP.checked)} 확인 · 최종 자격은 공고 기관 판단)` : ''}</p></details></div>`;
  }
  const notices = ctx => adHTML(ctx, 'panel');
  // 왼쪽 아래 칸: 빈칸을 골랐으면 「이 근처 빈칸」, 그 아래 지원 안내 하나(패널과 다른 것)
  function renderRail() {
    const el = $('#railBox'); if (!el) return;
    let near = '';
    const sp = view.space && SP[view.space];
    if (sp && (view.mode === 'space' || view.mode === 'write')) {
      const d = s2 => dist(s2, sp);
      const L = M.spaces.filter(x => x.id !== sp.id).map(x => ({ x, m: d(x) })).filter(o => o.m <= 200).sort((a, b) => a.m - b.m).slice(0, 3);
      near = `<section class="near"><h3>이 근처 빈칸</h3>${L.length ? L.map(({ x, m }) => { const w = store.bySpace(x.id)[0]; return `<button class="nrow" data-act="space" data-id="${x.id}"><b>${esc(shortAddr(x))}</b><small>${Math.round(m / 10) * 10}m · ${w ? `「${esc(w.title)}」 ♥${store.likes(w)}` : '바람 아직 없음'}</small></button>`; }).join('') : '<p class="fine">200m 안에 다른 빈칸이 없어요.</p>'}</section>`;
    }
    const ctx = WORKS.includes(view.mode) ? view.mode : view.mode === 'space' ? 'space' : 'home';
    el.innerHTML = near + adHTML(ctx, 'rail', lastAd.panel);
  }

  function home() {
    const top = store.wishes().sort((a, b) => store.likes(b) - store.likes(a)).slice(0, 5);
    return `<section class="hello">
        <h2>이 빈 가게에 뭐가 생기면 좋을까?</h2>
        <p>지도에서 빈칸을 누르고 「여기 ○○ 있으면」을 남겨 주세요. 공감이 모인 바람은 준비된 사장님의 창업 아이템이 되고, 대구 대학생 팀이 개업 준비와 첫 운영을 돕습니다.</p>
        <p class="fine">대구시 + 지역 대학 운영단의 시범 사업 · AI가 시민 · 사장님 · 학생의 문장을 업종 · 과제 · 전공으로 바꿔 잇습니다. <button class="link" data-act="howto" data-to=".pilot">시범 사업 한 장 보기</button></p>
      </section>
      <section><h3>지금 뜨는 바람</h3><ol class="trend">${top.map((w, i) => `<li><button data-act="space" data-id="${esc(w.space)}" data-w="${esc(w.id)}"><span class="rk">${i + 1}</span><span class="tt">${esc(w.title)}<small>${esc(shortAddr(SP[w.space]))}</small></span><span class="lk">♥ ${store.likes(w)}</span></button></li>`).join('')}</ol>
      </section>
      ${notices('home')}`;
  }

  function space() {
    const s = SP[view.space]; if (!s) return home();
    const ws = store.bySpace(s.id);
    return `${back()}
      <section class="sphead">
        <p class="kick">빈칸 · 1층 공실 후보</p>
        <h2>${esc(shortAddr(s))}${s.bld ? ` <small>${esc(s.bld)}</small>` : ''}</h2>
        <p class="was">${esc(M.meta.q_prev)} 목록에 있던 <b>${esc(s.was)}</b> 자리가 ${esc(M.meta.q_now)}에 비었어요. <span class="tag">현장 확인 필요</span></p>
      </section>
      <button class="cta" data-act="write">＋ 여기 있으면 좋겠는 가게 남기기</button>
      <section><h3>이 빈칸의 바람 <small>${ws.length}개 · 공감순</small></h3>
        ${ws.length ? ws.map(w => wishCard(w)).join('') : '<p class="emptyw">아직 바람이 없어요. 첫 바람을 남겨 주세요!</p>'}
      </section>
      ${startCard(s, ws)}
      ${notices('space')}`;
  }

  // 창업 카드: 지금은 계산으로 만든 요약. 실시간 AI가 붙으면 업종 · 상권 해석 문장이 여기에 들어간다.
  function startCard(s, ws) {
    const R = 100;
    const near = M.bg.filter(([x, y]) => dist({ x, y }, s) <= R);
    const byL = {}; near.forEach(([, , l]) => byL[l] = (byL[l] || 0) + 1);
    const top = Object.entries(byL).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const w1 = ws[0], nA = MY() ? new Set(ws.flatMap(w => MY().answersFor(w.id)).map(a => a.sid)).size : 0;
    return `<section class="scard">
      <h3>창업 카드 <span class="tag calc">계산 요약</span></h3>
      <dl>
        <dt>${R}m 안 업소</dt><dd><b>${near.length}곳</b> — ${top.map(([l, n]) => `${esc(l)} ${n}`).join(' · ')}</dd>
        <dt>바람 1위</dt><dd>${w1 ? `<b>${esc(w1.title)}</b> (공감 ${store.likes(w1)})` : '아직 없음'}</dd>
        <dt>직전 업종</dt><dd>${esc(s.was)} <small>(같은 업종이 다시 들어와도 되는지는 상담에서)</small></dd>
        ${nA ? `<dt>근처 가게 답</dt><dd><b>${nA}곳</b>이 이 빈칸 바람에 답함 <small>(바람은 닫히지 않아요 · 상권 정보로 참고)</small></dd>` : ''}
      </dl>
      <p class="fine">소진공 상가(상권)정보 ${esc(M.meta.q_now)} 기준 계산. 더 자세한 해석은 오른쪽 아래 빈칸 도우미에게 물어보세요.</p>
      <button class="cta2" data-act="owner" data-id="${esc(s.id)}">이 자리로 창업 상담 →</button>
    </section>`;
  }

  function write() {
    const s = SP[view.space];
    return `${back('space', '빈칸으로')}
      <section class="sphead"><p class="kick">바람 남기기</p><h2>${esc(shortAddr(s))}</h2><p class="was">직전: ${esc(s.was)}</p></section>
      <form class="wform" id="wform" novalidate>
        <fieldset><legend>어떤 종류인가요?</legend><div class="chips">${SEED.cats.map((c, i) => `<label><input type="radio" name="cat" value="${esc(c)}"${i === 0 ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></fieldset>
        <label class="fl">여기 있으면 좋겠는 가게<input name="title" maxlength="30" placeholder="예: 가성비 파스타집" required><small class="cnt" data-for="title">0 / 30</small></label>
        <label class="fl">왜 있으면 좋겠어요?<textarea name="why" maxlength="120" rows="3" placeholder="예: 혼자 와도 부담 없는 가격이면 자주 올 것 같아요"></textarea><small class="cnt" data-for="why">0 / 120</small></label>
        <p class="err" id="werr" hidden></p>
        <p class="rule">영업 중인 가게를 깎아내리는 글 · 광고 · 같은 글 반복은 올라가지 않아요.</p>
        <button class="cta" type="submit">바람 올리기</button>
      </form>`;
  }

  function owner() {
    const s = view.space && SP[view.space];
    return `${back(s ? 'space' : 'home', s ? '빈칸으로' : '지도 처음으로')}
      <section class="sphead"><p class="kick">사장님 입구</p><h2>창업 · 경영 상담</h2>${s ? `<p class="was">고른 자리: <b>${esc(shortAddr(s))}</b></p>` : ''}</section>
      <ol class="steps">
        <li><b>상담</b> 열 예정이면 아이템 · 자리, 하고 있으면 어려움을 AI와 이야기해요</li>
        <li><b>창업 카드</b> 업종 · 상권 · 받을 수 있는 지원 · 이 자리의 시민 바람</li>
        <li><b>과제 정리</b> 대학생 팀과 함께할 일을 AI가 초안으로 정리</li>
        <li><b>동행 프로젝트 지원서</b> 시 + 지역 대학 운영단이 심사해 선정</li>
      </ol>
      <button class="cta" disabled>상담 시작 <small>(다음 단계에서 만듦)</small></button>
      ${notices('owner')}`;
  }
  function howto() {
    return `${back()}
      <section class="sphead"><p class="kick">이용 방법</p><h2>빈칸 · 바람 · 공감</h2></section>
      <dl class="terms">
        <dt>빈칸</dt><dd>동성로의 빈 1층 점포 후보. 공공데이터로 찾고 현장에서 확인해요.</dd>
        <dt>바람</dt><dd>빈칸에 남기는 「여기 ○○ 있으면」 한 줄. 회원만 남길 수 있어요(본 서비스는 휴대폰 본인인증으로 한 사람 한 계정 [제안]).</dd>
        <dt>공감</dt><dd>마음에 드는 바람에 누르는 하트. 한 계정에 1번.</dd>
        <dt>창업 카드</dt><dd>빈칸을 누르면 나오는 요약. 주변 업소 · 바람 1위 · 받을 수 있는 지원.</dd>
        <dt>동행 프로젝트</dt><dd>바람을 보고 창업하는 사장님과 대학생 4인 팀 + 지도교수가 한 학기를 함께하는 시범 사업.</dd>
      </dl>
      <p class="fine">빈칸 ${M.meta.n_spaces}곳: ${esc(M.meta.src)} ${esc(M.meta.q_prev)} → ${esc(M.meta.q_now)} 비교로 찾은 1층 공실 후보(같은 층에 새 업소 없음). 범위: ${esc(M.meta.scope)}.</p>
      <section class="pilot"><h3>시범 사업 한 장 <small>정책 초안 요약 · 숫자는 [가정] · [추정]</small></h3>
        <dl class="terms">
          <dt>누가</dt><dd>대구시 소상공인 · 상권 부서가 주관(동성로 상권활성화사업 2024~2028 위에 얹음). 대구시 대학인재혁신과 + 지역 대학이 운영단(심사 · 학생 선발 · 추적, 앵커사업 연계 교과로 학점 · 지도교수). 상인회 · 공인중개사가 빈칸 현장 확인 · 건물주 연결 [제안].</dd>
          <dt>자리</dt><dd>건물주가 동의한 빈칸과 상권활성화사업 빈 점포 팝업 자리에서만 골라요. 사이트는 임대 중개를 하지 않아요.</dd>
          <dt>규모</dt><dd>0단계: 빈칸 61곳 중 30곳 이상에 회원 바람이 모이면 → 1단계: 동성로 10곳 [가정] · 학생 40명(4인 × 10팀) · 한 학기 16주.</dd>
          <dt>비용</dt><dd>학생 장학금 월 30만 원 × 4개월 × 40명 = 4,800만 원 [추정]. 사장님 지원금 · 인테리어 · 임대료 일부 · 이벤트는 상권활성화사업 예산과 협의. 사장님 · 시민은 무료.</dd>
          <dt>성과</dt><dd>개업 6개월 영업 유지가 비교군(신청했지만 선정되지 않은 가게)보다 높은지 → 12개월 영업 유지 10곳 중 8곳 이상 [가정] 그리고 비교군보다 높으면 대구로 넓혀요.</dd>
          <dt>AI가 하는 일</dt><dd>시민 · 사장님 · 학생의 문장을 업종 · 과제 · 전공으로 바꿔 서로 잇는 일(상담 문제 정리 · 과제 초안 · 학생 추천 · 질문 · 바람 묶기 · 답글 초안 · 빈칸 도우미). 숫자 · 거리 · 목록은 사이트가 공공데이터로 계산하고, 선정은 사람(운영단)이 해요.</dd>
          <dt>운영단 화면</dt><dd>회원가입 때 「운영단」을 고르면 심사 표 · 추적 표를 볼 수 있어요(본 서비스에서는 초대받은 운영단만).</dd>
        </dl></section>
      <p class="fine">처음 화면의 바람 · 공감 수 · 공고 일부는 서비스 소개를 위해 운영팀이 넣어 둔 것이에요. 운영팀 바람에는 「운영팀」이라고 적혀 있어요.</p>`;
  }
  function search() {
    const q = view.q.trim(), t = q.replace(/\s/g, '');
    const ws = store.wishes().filter(w => (w.title + w.cat + w.why).replace(/\s/g, '').includes(t));
    const ss = M.spaces.filter(s => (s.was + s.addr + s.bld).replace(/\s/g, '').includes(t));
    const hint = /창업|사장|가게를?열|개업|운영|매출|손님/.test(t) ? `<button class="ntc prog" data-act="owner"><span class="nk">혹시</span><b>사장님 입구로 갈까요?</b><small>창업 · 경영 상담</small></button>`
      : /학생|대학생|학점|장학|경력|인턴/.test(t) ? `<button class="ntc prog" data-act="student"><span class="nk">혹시</span><b>대학생 입구로 갈까요?</b><small>동행 프로젝트</small></button>` : '';
    return `${back()}
      <section class="sphead"><p class="kick">검색</p><h2>「${esc(q)}」</h2></section>${hint}
      <section><h3>바람 <small>${ws.length}</small></h3>${ws.length ? ws.map(w => wishCard(w, true)).join('') : '<p class="emptyw">맞는 바람이 없어요. 빈칸을 골라 첫 바람을 남겨 보세요.</p>'}</section>
      <section><h3>빈칸 <small>직전 업종 · 주소 · ${ss.length}</small></h3>${ss.slice(0, 12).map(s => `<button class="srow" data-act="space" data-id="${esc(s.id)}"><b>${esc(shortAddr(s))}</b><small>직전 ${esc(s.was)}</small></button>`).join('') || '<p class="emptyw">없음</p>'}</section>`;
  }
  // 알림 문구(종류: 답 · 판매 시작 · 내일까지 · 정식 메뉴 · 끝남)
  function alertText(x) {
    const st0 = `<b>${esc(x.a.store)}</b>`, src = x.why === 'wrote' ? '내가 쓴 바람' : x.why === 'liked' ? '내가 공감한 바람' : '「먹어보고 싶어요」 누른 메뉴', t = MY().trialLabel(x.a);
    if (x.kind === 'start') return `${st0}에서 「${esc(x.a.menu)}」 판매를 시작했어요${t ? ` · ${esc(t)}` : ''} <small>(${src})</small>`;
    if (x.kind === 'endsoon') return `${st0}의 「${esc(x.a.menu)}」 시험 판매가 내일까지예요`;
    if (x.kind === 'regular') return `${st0}의 「${esc(x.a.menu)}」가 이제 늘 파는 메뉴가 됐어요 <small>(${src})</small>`;
    if (x.kind === 'end') return x.why === 'wanted' ? `${st0}의 「${esc(x.a.menu)}」가 끝났어요 <small>(${src})</small>` : `${src} 「${esc(x.w.title)}」에 답한 ${st0}이 「끝났어요」로 바꿨어요`;
    return `${src} 「${esc(x.w.title)}」에 근처 가게가 답했어요 — ${st0} <small>${esc(x.a.item)} · 약 ${MY().roundDist(x.a.dist)}m</small>`;
  }
  function mine() {
    const ws = myWishes().slice().reverse(), liked = store.wishes().filter(w => store.liked(w));
    const al = MY() ? MY().alertsFor(st.user) : [];
    const html = `${back()}
      <section class="sphead"><p class="kick">내 페이지</p><h2>${esc(st.user.name)}</h2><p class="was">@${esc(st.user.id || '')} · ${esc(rolesOf(st.user).map(roleName).join(' · '))}</p></section>
      <section class="alert"><b>알림</b><p>내가 쓰거나 공감한 바람에 <b>근처 가게가 답하면</b> 여기에 알려 드려요. 시범 운영이 시작되면 내 바람과 같은 업종의 가게가 빈칸에 열릴 때 「내 바람이 가게로」 알림과 첫 방문 쿠폰도 보낼 예정이에요 [제안].</p>
        ${al.length ? `<ul class="alist">${al.map(x => `<li class="${x.unread ? 'new' : ''}${x.kind === 'end' ? ' end' : ''}">
          <p>${x.unread ? '<span class="tag mine">새 알림</span> ' : ''}${alertText(x)}${x.self ? ' <small class="fine">(내 가게 답)</small>' : ''}</p>
          ${x.kind === 'end' ? '' : `<p class="am">${esc(x.a.menu)} — ${esc(x.a.reply)}</p>${x.a.state === '끝남' ? '<p class="fine">지금은 끝난 메뉴예요.</p>' : `<button class="cta2 sm" data-act="showcard" data-id="${esc(x.a.id)}">가게에서 이 화면 보여 주기</button> <button class="link" data-act="storemap" data-id="${esc(x.a.id)}">지도에서 가게 보기</button>`}`}</li>`).join('')}</ul>` : ''}</section>
      <section><h3>내 바람 <small>${ws.length}</small></h3>${ws.map(w => wishCard(w, true)).join('') || '<p class="emptyw">아직 없어요.</p>'}</section>
      <section><h3>공감한 바람 <small>${liked.length}</small></h3>${liked.map(w => wishCard(w, true)).join('') || '<p class="emptyw">아직 없어요.</p>'}</section>
      <button class="link" data-act="logout">로그아웃</button>`;
    if (MY()) MY().markSeen(st.user);   // 연 알림은 읽음으로(머리띠 숫자가 줄어듦)
    return html;
  }
  // 내 바람: 쓴 사람(uid)이 있는 바람은 그 사람 것만, 예전 바람(uid 없음)은 이 브라우저 것으로
  const myWishes = () => SV() ? store.wishes().filter(w => st.user && w.uid === st.user.id) : st.wishes.filter(w => !w.uid || (st.user && w.uid === st.user.id));
  const roleName = r => ({ citizen: '시민', pre: '예비 사장님', open: '기존 사장님', student: '대학생', ops: '운영단' }[r] || '시민');

  // ---------------- 머리띠 · 왼쪽 ----------------
  function renderMe() {
    const un = st.user && MY() ? MY().alertsFor(st.user).filter(x => x.unread).length : 0;
    $('#me').innerHTML = st.user
      ? `<button class="topbtn${view.mode === 'mystore' ? ' on' : ''}" data-act="mystore">내 가게</button>${hasRole('ops') ? `<button class="topbtn${view.mode === 'ops' ? ' on' : ''}" data-act="ops">운영단 표</button>` : ''}<button class="mebtn" data-act="mine"><span class="av">${esc((st.user.name || '나').slice(0, 1))}</span>${esc(st.user.name || '')} · 내 바람 ${myWishes().length}${un ? `<span class="badge" title="새 알림">${un}</span>` : ''}</button>`
      : `<button class="mebtn ghost" data-act="login">로그인<span class="wide"> · 가입</span></button>`;
  }


  // ---------------- 모달 · 알림 ----------------
  const modal = $('#modal'), mbox = $('#modalBox');
  function openModal(html, cls) { mbox.className = 'box' + (cls ? ' ' + cls : ''); mbox.innerHTML = html + '<button class="x" data-act="close" aria-label="닫기">×</button>'; modal.hidden = false; mbox.querySelector('button:not(.x), input')?.focus(); }
  function reportForm(id, nid) {
    openModal(`<h3>${nid ? '이 한 줄을' : '이 답을'} 신고할까요?</h3><p class="fine">운영단이 보고 숨길지 정해요. 신고한 사람은 사장님에게 보이지 않아요.</p>
      <div class="rlist">${['비방 · 깎아내림', '광고 · 연락처', '거짓 · 약속과 다름', '기타'].map((t, i) => `<label><input type="radio" name="rwhy" value="${t}"${i === 0 ? ' checked' : ''}> ${t}</label>`).join('')}</div>
      <button class="cta" data-act="reportgo" data-id="${esc(id)}" data-n="${esc(nid || '')}">신고하기</button>`);
  }
  const closeModal = () => { modal.hidden = true; };
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  let tt;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2600); }

  // 본인인증이 필요한 동작: 로그인 안 했으면 인증 창 → 끝나면 하려던 동작을 이어서
  // ---------------- 로그인 · 회원가입 ----------------
  // 계정은 이 브라우저(localStorage)에만. 비밀번호는 SHA-256 해시로만 저장. 백엔드가 붙으면 login() · signup()만 API로 바꾼다.
  let after = null;
  const ID_RE = /^[a-z0-9_]{4,20}$/;
  async function hash(pw) {
    if (!(window.crypto && crypto.subtle)) return 'x' + pw.length;   // 아주 오래된 브라우저
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('binkan:' + pw));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function needAuth(fn) {
    if (st.user) return fn();
    after = fn; authForm('login');
  }
  function authForm(tab, msg) {
    const roles = ['citizen', 'pre', 'open', 'student', 'ops'];
    openModal(`<div class="auth">
      <div class="atabs" role="tablist"><button class="${tab === 'login' ? 'on' : ''}" data-act="atab" data-v="login" role="tab">로그인</button><button class="${tab === 'signup' ? 'on' : ''}" data-act="atab" data-v="signup" role="tab">회원가입</button></div>
      ${msg ? `<p class="amsg">${esc(msg)}</p>` : `<p class="amsg">바람 · 공감 · 지원은 회원만 할 수 있어요. 보기는 누구나 할 수 있어요.</p>`}
      <button class="cta quick" data-act="aquick">바로 시작하기 <small>아이디 없이</small></button>
      ${SV() ? '<button class="cta2 quick" data-act="aowner">가게 사장님으로 바로 시작 <small>동성로 시범 가게 계정</small></button>' : ''}
      <p class="aor"><span>또는 아이디로</span></p>
      ${tab === 'login' ? `<form id="loginForm" class="aform" novalidate>
        <label>아이디<input name="uid" autocomplete="username" maxlength="20" required></label>
        <label>비밀번호<input name="pw" type="password" autocomplete="current-password" maxlength="64" required></label>
        <p class="err" id="aerr" hidden></p>
        <button class="cta">로그인</button>
        <p class="alink">처음이신가요? <button type="button" data-act="atab" data-v="signup">회원가입</button></p></form>`
      : `<form id="signupForm" class="aform" novalidate>
        <label>이름(닉네임)<input name="nick" autocomplete="nickname" maxlength="12" required></label>
        <label>아이디<input name="uid" autocomplete="username" maxlength="20" required></label>
        <label>비밀번호<input name="pw" type="password" autocomplete="new-password" maxlength="64" required></label>
        <label>비밀번호 확인<input name="pw2" type="password" autocomplete="new-password" maxlength="64" required></label>
        <p class="fine">본 서비스에서는 휴대폰 본인인증으로 한 사람이 한 계정을 써요(이벤트 중복 방지) [제안].</p>
        <fieldset class="aroles"><legend>어떤 분이세요? <small>나중에 바꿀 수 있어요</small></legend><div class="chips">${roles.map((r, i) => `<label><input type="radio" name="role" value="${r}"${i === 0 ? ' checked' : ''}><span>${roleName(r)}</span></label>`).join('')}</div></fieldset>
        <label class="agree2"><input type="checkbox" name="terms" checked> 이용약관 · 개인정보 수집 · 이용에 동의해요</label>
        <p class="err" id="aerr" hidden></p>
        <button class="cta">가입하기</button>
        <p class="alink">이미 계정이 있나요? <button type="button" data-act="atab" data-v="login">로그인</button></p></form>`}
    </div>`);
  }
  const aerr = m => { const e = $('#aerr'); e.textContent = m; e.hidden = false; };
  function signedIn(acc, hello) {
    const gO = st.ownerBy._guest, gS = st.stuBy._guest;   // 로그인 전에 하던 상담 · 지원은 로그인한 회원 것으로 이어 감
    st.user = { id: acc.id, name: acc.name, role: acc.role || 'citizen', roles: rolesOf(acc), verified: true, token: acc.token || null }; linkLikes();

    const fresh = x => !x || (!x.status && !x.sel && (x.step || 1) === 1);
    if (gO && !fresh(gO) && fresh(st.owner)) { st.owner = gO; delete st.ownerBy._guest; }
    if (gS && !fresh(gS) && fresh(st.stu)) { st.stu = gS; delete st.stuBy._guest; }
    migrate(); save();
    closeModal(); toast(hello);
    const f = after; after = null;
    const cont = () => { if (f) f(); else render(); };
    // 서버 모드: 내가 공감한 것(likedByMe)을 먼저 다시 받고 나서 하려던 일(공감 등)을 이어서 — 순서가 바뀌면 옛 숫자로 덮임
    if (SV() && acc.token) window.BK.reload().then(() => window.BK.refresh && window.BK.refresh(true)).then(cont, cont); else cont();
  }
  mbox.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target), acc = st.accounts || (st.accounts = {});
    const fid = e.target.getAttribute('id');
    if (fid === 'loginForm' && SV()) {
      const id = (f.get('uid') || '').trim().toLowerCase(), pw = f.get('pw') || '';
      if (!id || !pw) return aerr('아이디와 비밀번호를 넣어 주세요');
      try { const a = await window.BK.login(id, pw); return signedIn(Object.assign(a, { role: 'citizen' }), `${a.name}님, 반가워요`); }
      catch (e1) {
        if (e1.status !== 401) return aerr('서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요');
        if (!ID_RE.test(id)) return aerr('아이디 또는 비밀번호가 맞지 않아요');
        try { const a = await window.BK.signup(id, pw, id); return signedIn(Object.assign(a, { role: 'citizen' }), `가입을 환영해요, ${a.name}님`); }   // 처음 쓰는 아이디면 바로 가입
        catch (e2) { return aerr(e2.status === 409 ? '비밀번호가 맞지 않아요' : '서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요'); }
      }
    }
    if (fid === 'signupForm' && SV()) {
      const name = (f.get('nick') || '').trim(), id = (f.get('uid') || '').trim().toLowerCase(), pw = f.get('pw') || '', pw2 = f.get('pw2') || '';
      if (!name) return aerr('이름을 넣어 주세요');
      if (pw && pw2 && pw !== pw2) return aerr('비밀번호 확인이 맞지 않아요');
      const r0 = f.get('role') || 'citizen', extra = { role: r0, roles: r0 === 'citizen' ? ['citizen'] : ['citizen', r0] };
      let a = null;
      try { a = await window.BK.signup(ID_RE.test(id) ? id : null, pw, name); }
      catch (e1) { if (e1.status !== 409) return aerr('서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요'); try { a = await window.BK.signup(null, pw, name); } catch (e2) { return aerr('가입하지 못했어요. 잠시 뒤 다시 해 주세요'); } }
      return signedIn(Object.assign(a, extra), `가입을 환영해요, ${name}님`);
    }
    if (fid === 'loginForm') {
      const id = (f.get('uid') || '').trim().toLowerCase(), pw = f.get('pw') || '';
      if (!id || !pw) return aerr('아이디와 비밀번호를 넣어 주세요');
      const a = acc[id];
      if (!a) return aerr('없는 아이디예요. 회원가입하거나 「바로 시작하기」를 눌러 주세요');
      if (a.pw && a.pw !== await hash(pw)) return aerr('비밀번호가 맞지 않아요');
      return signedIn(Object.assign({ id }, a), `${a.name}님, 반가워요`);
    }
    if (fid === 'signupForm') {
      const name = (f.get('nick') || '').trim(), id = (f.get('uid') || '').trim().toLowerCase(), pw = f.get('pw') || '', pw2 = f.get('pw2') || '';
      if (!name) return aerr('이름을 넣어 주세요');
      if (pw && pw2 && pw !== pw2) return aerr('비밀번호 확인이 맞지 않아요');
      if (id && !ID_RE.test(id)) return aerr('아이디는 영문 소문자 · 숫자 · _ 4~20자로 넣어 주세요');
      if (id && acc[id]) return aerr('이미 있는 아이디예요. 다른 아이디를 넣거나 로그인해 주세요');
      const uid = id || 'u' + Date.now().toString(36);
      const r0 = f.get('role') || 'citizen', a = { name, role: r0, roles: r0 === 'citizen' ? ['citizen'] : ['citizen', r0], pw: pw ? await hash(pw) : '', at: Date.now() };
      acc[uid] = a; save();
      return signedIn(Object.assign({ id: uid }, a), `가입을 환영해요, ${name}님`);
      // (본 서비스: 아이디 형식 · 중복 · 비밀번호 길이 · 본인인증 · 약관 필수 검사)
    }
  });
  mbox.addEventListener('input', () => { const e = $('#aerr'); if (e) e.hidden = true; });

  const SHORT_BASE = 'https://parkmiyeong.com/b/';
  let lastShare = null;
  function share(w) {
    // 공유 주소는 늘 실제 사이트. /s/빈칸?w=…로 보내야 카톡 · 메신저가 이 바람 썸네일을 보여 준다(api/binkan-share · binkan-ogimg)
    // 짧은 주소: 처음부터 있던 바람은 번호(/b/w05), 새 바람은 빈칸.가게이름(base64url).공감수 — 서버(api/binkan-share)가 풀어서 썸네일을 그린다
    const b64 = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const s = SP[w.space], url = SHORT_BASE + (w.seed ? w.id : `${w.space}.${b64(w.title)}.${store.likes(w)}`);
    const place = /^동성로/.test(shortAddr(s)) ? shortAddr(s) : '동성로 ' + shortAddr(s);
    const text = `${place} 빈칸에 「${w.title}」 있으면 좋겠다! 공감 눌러 줘 → ${url}`;
    lastShare = { title: `「${w.title}」 있으면 좋겠다 — 동성로 빈칸`, text: `${place} 빈칸에 「${w.title}」 있으면 좋겠다! 공감 눌러 줘`, url };
    openModal(`<h3>공유 카드</h3>
      <div class="sharecard"><p class="sk">동성로 빈칸</p><p class="sw">「${esc(w.title)}」</p><p class="sa">📍 ${esc(shortAddr(s))}</p><p class="sl">♥ ${store.likes(w)}${w.seed ? ' · 운영팀 바람' : '명이 공감'}</p></div>
      <textarea readonly rows="3" id="shareText">${esc(text)}</textarea>
      <div class="sharebtns">${navigator.share ? '<button class="cta" data-act="nshare">공유하기 (카카오톡 등)</button>' : ''}<button class="${navigator.share ? 'cta2' : 'cta'}" data-act="copy">문구 · 링크 복사</button></div>`);
  }

  // ---------------- 클릭 한곳에서 ----------------
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    if (b.tagName === 'A' && a === 'home') e.preventDefault();
    switch (a) {
      case 'home': return go('home');
      case 'space': go('space', { space: id || view.space }); if (b.dataset.w) setTimeout(() => document.getElementById('w-' + b.dataset.w)?.scrollIntoView({ block: 'center' }), 50); return;
      case 'write': return needAuth(() => go('write', { space: view.space }));
      case 'owner': window.OWNER.start(id || null); return go('owner');
      case 'student': window.STUDENT.start(id || null); return go('student');
      case 'howto': case 'mine': go(a); if (b.dataset.to) setTimeout(() => { const el = document.querySelector(b.dataset.to); if (el) el.scrollIntoView({ block: 'start' }); }, 50); return;
      case 'mystore': return needAuth(() => { MY().start(); go('mystore'); });
      case 'ops': return needAuth(() => go('ops'));
      case 'went': return needAuth(() => { const r = MY().went(id); toast(r); render(); redraw(); });
      case 'report': return needAuth(() => reportForm(id, b.dataset.n));
      case 'want': return needAuth(() => { toast(MY().want(id)); render(); redraw(); });
      case 'notego': { const el = document.getElementById('note-' + id), r = MY().addNote(id, el ? el.value : ''); if (r.err) { const e2 = document.getElementById('nerr-' + id); if (e2) { e2.textContent = r.err; e2.hidden = false; } return; } toast(r.ok); return render(); }
      case 'reportgo': { const why = (mbox.querySelector('input[name="rwhy"]:checked') || {}).value; if (!why) return; closeModal(); toast(MY().report(b.dataset.id, why, b.dataset.n || '')); return render(); }
      case 'showcard': { const h = MY().showCard(b.dataset.id || id); if (h) openModal(h, 'showbig'); return; }
      case 'printguide': return window.print();
      case 'visitok': { const el = document.getElementById('vcode-' + id), r = MY().confirmVisit(id, el ? el.value : ''); if (r && r.err) { const e2 = document.getElementById('verr-' + id); if (e2) { e2.textContent = r.err; e2.hidden = false; } return; } toast(r); const h = MY().showCard(id); if (h) openModal(h, 'showbig'); return; }
      case 'storemap': { const p = MY().storePoint(id); if (!p) return; closeModal(); if (WORKS.includes(view.mode) || view.mode === 'mine') go('home'); setTimeout(() => map && map.focus(p), 60); return; }
      case 'login': return needAuth(() => render());
      case 'logout': st.user = null; linkLikes(); window.OWNER && window.OWNER.ensure(); window.STUDENT && window.STUDENT.ensure(); save(); toast('로그아웃했어요'); return go('home');
      case 'like': { const go1 = () => store.toggleLike(id).then(() => { const w = store.wishes().find(x => x.id === id); render(); redraw(); toast(w && store.liked(w) ? '공감했어요' : '공감을 취소했어요'); }, e => serverFail(e, go1)); return needAuth(go1); }
      case 'share': return share(store.wishes().find(w => w.id === id));
      case 'copy': { const t = $('#shareText').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('복사했어요'), () => { $('#shareText').select(); toast('선택해 두었어요 — 복사해 주세요'); }); return; }
      case 'nshare': if (lastShare && navigator.share) navigator.share(lastShare).catch(() => {}); return;
      case 'close': return closeModal();
      case 'atab': return authForm(b.dataset.v);
      case 'aowner': {   // 서버에 지정된 시범 가게 계정 — 비밀번호는 서버 함수(api/binkan-owner)에만 있음
        const url = /(^|\.)parkmiyeong\.com$/.test(location.hostname) ? '/api/binkan-owner' : 'https://parkmiyeong.com/api/binkan-owner';
        b.disabled = true; b.textContent = '가게 계정 여는 중…';
        fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
          .then(j => { after = after || (() => { MY().start(); go('mystore'); }); signedIn({ id: j.account.username || j.account.id, name: j.account.displayName || '시범 가게', token: j.token, role: 'open', roles: ['open'] }, `${j.account.displayName || '시범 가게'} 사장님, 반가워요`); },
            () => { b.disabled = false; b.textContent = '가게 사장님으로 바로 시작'; toast('가게 계정을 열지 못했어요. 잠시 뒤 다시 해 주세요'); });
        return;
      }
      case 'aquick': if (SV()) { const n = '회원' + String(Date.now()).slice(-4); b.disabled = true; b.textContent = '가입 중…'; window.BK.signup(null, null, n).then(a => signedIn(Object.assign(a, { role: 'citizen' }), `가입 완료 · ${n}님, 반가워요`), () => { b.disabled = false; b.textContent = '바로 시작하기'; toast('서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요'); }); return; } { const acc = st.accounts || (st.accounts = {}); const uid = 'p' + Date.now().toString(36), n = '회원' + String(Date.now()).slice(-4); acc[uid] = { name: n, role: 'citizen', pw: '', at: Date.now() }; save(); return signedIn(Object.assign({ id: uid }, acc[uid]), `가입 완료 · ${n}님, 반가워요`); }
      case 'averify': { b.classList.add('done'); b.textContent = '✓ 인증 완료'; b.disabled = true; const e = $('#aerr'); if (e) e.hidden = true; return; }
      case 'join': return needAuth(() => { st.entered = true; save(); toast('이벤트 참여 신청 완료! 이벤트가 열리면 남긴 바람이 자동 응모돼요'); document.body.classList.add('pulse'); setTimeout(() => document.body.classList.remove('pulse'), 2400); render(); });
    }
  });

  // 바람 올리기
  P.addEventListener('input', e => { const c = P.querySelector(`.cnt[data-for="${e.target.name}"]`); if (c) c.textContent = `${e.target.value.length} / ${e.target.maxLength}`; if (e.target.closest('#wform')) $('#werr').hidden = true; });
  const BAD = /(망해|망했|최악|쓰레기|꺼져|씨발|시발|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|개같|개새|좆|존나|지랄|fuck|010-?\d|카톡|오픈채팅|https?:\/\/)/i;   // 「학생 할인 되는 카페」 「이런 카페가 별로 없어서」 같은 평범한 말은 통과(연락처 · 링크 · 비방만 막음)
  P.addEventListener('submit', e => {
    if (e.target.id !== 'wform') return;
    e.preventDefault();
    const f = new FormData(e.target), title = (f.get('title') || '').trim(), why = (f.get('why') || '').trim();
    const err = m => { const el = $('#werr'); el.textContent = m; el.hidden = false; };
    if (title.length < 2) return err('가게를 두 글자 이상 적어 주세요');
    if (BAD.test(title + why)) return err('욕설 · 비방 · 연락처 · 링크로 보이는 말이 있어요. 고쳐서 다시 올려 주세요');
    if (store.bySpace(view.space).some(w => w.title.replace(/\s/g, '') === title.replace(/\s/g, ''))) return err('이 빈칸에 같은 바람이 이미 있어요. 그 바람에 공감을 눌러 주세요');
    const w = { id: 'u' + Date.now(), space: view.space, cat: f.get('cat'), title, why: why || '—', who: roleName(st.user.role), likes: 0, ago: 0, uid: st.user.id };
    const btn = e.target.querySelector('button[type=submit], .cta'); if (btn) { btn.disabled = true; btn.textContent = '올리는 중…'; }
    const sp0 = view.space;
    store.add(w).then(x => {
      go('space', { space: sp0 });
      toast('바람이 올라갔어요');
      setTimeout(() => share(x || w), 300);
    }, e2 => { if (btn) { btn.disabled = false; btn.textContent = '바람 올리기'; } serverFail(e2, () => {}); });
  });

  // 검색
  $('#search').addEventListener('submit', e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) go('search', { q }); });

  // ---------------- owner.js 등에 내보내기 ----------------
  window.APP = { BAD, st, save, store, dist, KX, KY, SP, M, SUP, SEED, esc, shortAddr, roleName, rolesOf, hasRole, addRole, myWishes, openModal, closeModal, go, needAuth, toast, adHTML, wishCard, rerender: () => render(), refresh: () => { render(); redraw(); }, view: () => view, focus: id => map && map.focus(SP[id]), pulse: () => { document.body.classList.add('pulse'); setTimeout(() => document.body.classList.remove('pulse'), 2400); } };

  // 팀 백엔드가 준비되면(늦게 깨어나도) 서버 바람으로 다시 그림
  // 서버가 붙으면: 그동안 이 기기에 둔 내 바람을 서버로(로그인 토큰이 있을 때). 토큰이 없으면(서버 전에 만든 계정) 이 기기에만 보임
  let flushing = false;
  async function flushPending() {
    if (flushing || !SV() || !st.user || !st.user.token) return; flushing = true;
    try {
      for (const w of st.wishes.filter(x => x.pending && x.uid === st.user.id)) {
        try { const x = await window.BK.add(w); if (x) { const mo = st.myOps || (st.myOps = {}); (mo[st.user.id] || (mo[st.user.id] = [])).push(x.op); st.wishes = st.wishes.filter(y => y !== w); save(); } } catch (e) { console.warn('기다리던 바람 올리기 실패:', e.message); }
      }
    } finally { flushing = false; }
    render(); redraw();
  }
  if (window.BK) window.BK.onChange(() => { render(); redraw(); flushPending(); });

  // ---------------- 시작 ----------------
  migrate();
  (async () => {
    map = await MapView.create($('#map'), M, { onPick: id => /^st:/.test(id) ? MY().pickStore(id.slice(3)) : go('space', { space: id }) });
    if (map.why) { const m = $('#mapmsg'); m.textContent = map.why; m.hidden = false; }
    document.body.dataset.map = map.kind;
    const fromHash = () => { const h = location.hash.match(/^#s=(V\d+)/); if (h && SP[h[1]]) { go('space', { space: h[1] }); return true; } };
    popping = true; let opened; try { opened = fromHash(); } finally { popping = false; }   // 처음 연 주소(공유 링크)는 기록을 하나 더 쌓지 않음 → 첫 「뒤로」가 제자리에 머물지 않게
    if (!opened) { render(); redraw(); map.fitTo(M.spaces.filter(s => store.bySpace(s.id).length)); }
    window.addEventListener('hashchange', () => { if (!fromHash() && !location.hash) go('home'); });
    history.replaceState({ bk: jsonable(view) }, '', location.href);
    let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!map || WORKS.includes(view.mode)) return; map.relayout(); if (view.space) map.focus(SP[view.space]); else if (view.mode === 'home') map.fitTo(M.spaces.filter(s => store.bySpace(s.id).length)); }, 250); });   // 창 크기를 바꾸면 핀이 다시 화면 안으로
    if (window.innerWidth <= 640) { const q = document.querySelector('input[type="search"]'); if (q) q.placeholder = '가게 · 업종 찾기'; }
    window.addEventListener('popstate', e => {   // 「뒤로」: 열린 창 · 도우미가 있으면 그것만 닫고, 아니면 쌓아 둔 화면으로(기록이 없으면 첫 화면)
      const cb = $('#chatBox');
      if (!modal.hidden || (cb && !cb.hidden)) { if (!modal.hidden) closeModal(); else { cb.hidden = true; const f = $('#chatFab'); if (f) f.hidden = false; } history.pushState({ bk: jsonable(view) }, '', urlOf(view)); return; }
      const v = e.state && e.state.bk; popping = true;
      try { if (v && v.mode && (v.mode !== 'space' || SP[v.space])) { const { mode, ...rest } = v; go(mode, rest); } else if (!fromHash()) go('home'); } finally { popping = false; }
    });
  })();
})();
