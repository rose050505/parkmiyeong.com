// 동성로 빈칸 — 첫 화면(지도) · 빈칸 상세 · 바람 남기기 · 공감 · 본인인증(시연) · 검색 · 입구 · 지원 안내 띠 · 오픈 이벤트
// 저장은 이 브라우저(localStorage)에만. 백엔드가 붙으면 store.* 만 API로 바꾸면 된다(청사진 §7 API 표).
(function () {
  const M = window.MAPDATA, SEED = window.SEED, SUP = window.SUP;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SP = Object.fromEntries(M.spaces.map(s => [s.id, s]));

  // ---------------- 저장 ----------------
  const KEY = 'binkan.v1';
  const st = Object.assign({ user: null, wishes: [], liked: {}, entered: false }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const store = {
    wishes: () => SEED.wishes.map(w => Object.assign({ seed: true }, w)).concat(st.wishes),
    likes: w => w.likes + (st.liked[w.id] ? 1 : 0),
    bySpace: id => store.wishes().filter(w => w.space === id).sort((a, b) => store.likes(b) - store.likes(a)),
    add(w) { st.wishes.push(w); save(); },
    toggleLike(id) { st.liked[id] = !st.liked[id]; if (!st.liked[id]) delete st.liked[id]; save(); },
  };

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
      return {
        id: s.id, x: s.x, y: s.y, z: sel ? 9999 : (hot.has(s.id) ? 2000 : 1000) + n,
        cls: 'wish' + (hot.has(s.id) ? ' hot' : '') + (sel ? ' sel' : ''),
        html: `<span class="t">${esc(w.title)}</span><span class="n">♥ ${n}</span>${ws.length > 1 ? `<span class="more">+${ws.length - 1}</span>` : ''}`,
        label: `빈칸 ${shortAddr(s)} · 바람 ${ws.length}개 · 1위 ${w.title}`,
      };
    });
  }
  const redraw = () => map && map.draw(pins());

  // ---------------- 오른쪽 패널 ----------------
  const P = $('#panel');
  function render() {
    P.dataset.mode = view.mode;
    document.body.classList.toggle('panel-open', view.mode !== 'home');
    const work = { owner: window.OWNER, student: window.STUDENT }[view.mode];
    document.body.classList.toggle('work-open', !!work);
    if (work) { $('#work').innerHTML = work.render(); $('#work').scrollTop = 0; renderMe(); return; }
    const f = { home, space, write, howto, search, mine }[view.mode] || home;
    P.innerHTML = f();
    P.scrollTop = 0;
    renderMe(); mapAd();
  }
  function go(mode, extra) {
    const was = view.mode;
    view = Object.assign({ mode, space: null, q: '' }, extra || {});
    if (mode === 'space' && view.space) { history.replaceState(null, '', '#s=' + view.space); map && map.focus(SP[view.space]); }
    else if (mode === 'home') { history.replaceState(null, '', location.pathname); }
    render(); redraw();
    if ((was === 'owner' || was === 'student') && mode !== 'owner' && mode !== 'student' && map) setTimeout(() => { map.relayout(); if (view.space) map.focus(SP[view.space]); }, 0);
  }
  const back = (to = 'home', label = '지도 처음으로') => `<button class="back" data-act="${to}">← ${label}</button>`;

  function wishCard(w, withPlace) {
    const s = SP[w.space], on = !!st.liked[w.id];
    return `<article class="wcard" id="w-${esc(w.id)}">
      <div class="wh"><span class="cat">${esc(w.cat)}</span>${w.seed ? '<span class="tag ex" title="시연용으로 만든 예시 글">예시</span>' : '<span class="tag mine">내 바람</span>'}</div>
      <h4>${esc(w.title)}</h4>
      <p>${esc(w.why)}</p>
      ${withPlace ? `<button class="place" data-act="space" data-id="${esc(w.space)}">📍 ${esc(shortAddr(s))}</button>` : ''}
      <div class="wf"><span class="who">${esc(w.who)} · ${ago(w.ago || 0)}</span>
        <button class="like${on ? ' on' : ''}" data-act="like" data-id="${esc(w.id)}" aria-pressed="${on}">♥ 공감 ${store.likes(w)}</button>
        <button class="share" data-act="share" data-id="${esc(w.id)}">공유</button></div>
    </article>`;
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
    const role = (st.user && st.user.role) || 'citizen';
    const sp = view.space && SP[view.space], hasWish = sp && store.bySpace(sp.id).length;
    let best = null;
    for (const a of ADS) {
      if (a.id === exclude || (a.act && a.act === ctx)) continue;   // 지금 들어와 있는 곳의 모집은 다시 안 띄움
      let sc = 0; const why = [];
      if (a.who.includes(role) && st.user) { sc += 3; why.push(roleName(role) + ' 회원이라서'); }
      if (ctx === 'student' && a.id === 'prog-student') { sc += 6; why.push('대학생 입구를 보고 있어서'); }
      if (ctx === 'owner' && a.kind === 'sup' && a.who.includes('pre')) { sc += 4; why.push('사장님 입구를 보고 있어서'); }
      if (ctx === 'owner' && a.id === 'prog-owner') { sc += 3; }
      if (ctx === 'space' && a.id === 'prog-owner') { sc += hasWish ? 5 : 3; why.push(hasWish ? '시민 바람이 붙은 빈칸을 보고 있어서' : '빈칸을 보고 있어서'); }
      if (ctx === 'space' && a.kind === 'sup' && a.who.includes('pre')) { sc += 3; why.push('이 자리에서 창업할 때 받을 수 있어서'); }
      if (ctx === 'home' && a.kind === 'prog') { sc += 2; why.push('지금 모집 중이라서'); }
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
  // 지도 구석 자리: 패널과 다른 것 하나
  function mapAd() {
    const el = $('#mapAd'); if (!el || el.dataset.closed) return;
    el.innerHTML = adHTML(view.mode, 'map', lastAd.panel) + '<button class="adx" data-act="adclose" aria-label="이 안내 닫기">×</button>';
  }

  function home() {
    const top = store.wishes().sort((a, b) => store.likes(b) - store.likes(a)).slice(0, 5);
    return `<section class="hello">
        <h2>이 빈 가게에 뭐가 생기면 좋을까?</h2>
        <p>지도에서 빈칸을 누르고 「여기 ○○ 있으면」을 남겨 주세요. 공감이 모인 바람은 준비된 사장님의 창업 아이템이 되고, 대구 대학생 팀이 창업을 함께합니다.</p>
      </section>
      <section><h3>지금 뜨는 바람</h3><ol class="trend">${top.map((w, i) => `<li><button data-act="space" data-id="${esc(w.space)}" data-w="${esc(w.id)}"><span class="rk">${i + 1}</span><span class="tt">${esc(w.title)}<small>${esc(shortAddr(SP[w.space]))}</small></span><span class="lk">♥ ${store.likes(w)}</span></button></li>`).join('')}</ol>
      <p class="fine">「예시」 표시는 시연용으로 만든 글이에요.</p></section>
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
    const R = 100, kx = 88200, ky = 111000;  // 위도 35.87 부근 1도 ≈ 88.2km(경도) · 111km(위도)
    const near = M.bg.filter(([x, y]) => Math.hypot((x - s.x) * kx, (y - s.y) * ky) <= R);
    const byL = {}; near.forEach(([, , l]) => byL[l] = (byL[l] || 0) + 1);
    const top = Object.entries(byL).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const w1 = ws[0];
    return `<section class="scard">
      <h3>창업 카드 <span class="tag calc">계산 요약</span></h3>
      <dl>
        <dt>${R}m 안 업소</dt><dd><b>${near.length}곳</b> — ${top.map(([l, n]) => `${esc(l)} ${n}`).join(' · ')}</dd>
        <dt>시민 바람 1위</dt><dd>${w1 ? `<b>${esc(w1.title)}</b> (공감 ${store.likes(w1)})` : '아직 없음'}</dd>
        <dt>직전 업종</dt><dd>${esc(s.was)} <small>(같은 업종이 다시 들어와도 되는지는 상담에서)</small></dd>
      </dl>
      <p class="fine">소진공 상가(상권)정보 ${esc(M.meta.q_now)} 기준 계산. AI 해석(업종 궁합 · 위험 요인)은 실시간 연결 때 붙어요.</p>
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
        <dt>바람</dt><dd>빈칸에 남기는 「여기 ○○ 있으면」 한 줄. 본인인증한 회원만 남길 수 있어요.</dd>
        <dt>공감</dt><dd>마음에 드는 바람에 누르는 하트. 1인 1회.</dd>
        <dt>창업 카드</dt><dd>빈칸을 누르면 나오는 요약. 주변 업소 · 바람 1위 · 받을 수 있는 지원.</dd>
        <dt>동행 프로젝트</dt><dd>바람을 보고 창업하는 사장님과 대학생 4인 팀 + 지도교수가 한 학기를 함께하는 시범 사업.</dd>
      </dl>
      <p class="fine">빈칸 ${M.meta.n_spaces}곳: ${esc(M.meta.src)} ${esc(M.meta.q_prev)} → ${esc(M.meta.q_now)} 비교로 찾은 1층 공실 후보(같은 층에 새 업소 없음). 범위: ${esc(M.meta.scope)}.</p>`;
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
  function mine() {
    const ws = st.wishes.slice().reverse(), liked = store.wishes().filter(w => st.liked[w.id]);
    return `${back()}
      <section class="sphead"><p class="kick">내 페이지</p><h2>${esc(st.user.name)}</h2><p class="was">본인인증 완료 (시연) · 역할: ${esc(roleName(st.user.role))}</p></section>
      <section class="alert"><b>알림</b><p>내 바람과 같은 업종의 가게가 빈칸에 열리면 「내 바람이 가게로」 알림을 보내 드려요. <small>(제안 기능)</small></p></section>
      <section><h3>내 바람 <small>${ws.length}</small></h3>${ws.map(w => wishCard(w, true)).join('') || '<p class="emptyw">아직 없어요.</p>'}</section>
      <section><h3>공감한 바람 <small>${liked.length}</small></h3>${liked.map(w => wishCard(w, true)).join('') || '<p class="emptyw">아직 없어요.</p>'}</section>
      <button class="link" data-act="logout">로그아웃 (이 브라우저의 시연 기록은 남아요)</button>`;
  }
  const roleName = r => ({ citizen: '시민', pre: '예비 사장님', open: '기존 사장님', student: '대학생' }[r] || '시민');

  // ---------------- 머리띠 · 왼쪽 ----------------
  function renderMe() {
    $('#me').innerHTML = st.user
      ? `<button class="mebtn" data-act="mine"><span class="av">나</span>내 바람 ${st.wishes.length}</button>`
      : `<button class="mebtn ghost" data-act="login">로그인<span class="wide"> · 가입</span></button>`;
  }
  $('#facts').innerHTML = `<div class="fact"><b>${M.meta.n_spaces}</b><span>동성로 1층 빈칸 후보</span></div>
    <div class="fact"><b>${M.meta.n_gone.toLocaleString()}</b><span>지난 분기에 사라진 업소</span></div>
    <p class="fine">소진공 상가(상권)정보 ${esc(M.meta.q_prev)} → ${esc(M.meta.q_now)} 비교 · <span class="tag real">실제 데이터</span></p>`;

  // ---------------- 모달 · 알림 ----------------
  const modal = $('#modal'), mbox = $('#modalBox');
  function openModal(html) { mbox.innerHTML = html + '<button class="x" data-act="close" aria-label="닫기">×</button>'; modal.hidden = false; mbox.querySelector('button:not(.x), input')?.focus(); }
  const closeModal = () => { modal.hidden = true; };
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  let tt;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2600); }

  // 본인인증이 필요한 동작: 로그인 안 했으면 인증 창 → 끝나면 하려던 동작을 이어서
  let after = null;
  function needAuth(fn) {
    if (st.user) return fn();
    after = fn;
    openModal(`<h3>본인인증한 회원만 할 수 있어요</h3>
      <p>바람 · 공감 · 이벤트 응모는 한 사람이 한 번씩만 하도록 휴대폰 본인인증을 거쳐요. 보기는 누구나 할 수 있어요.</p>
      <div class="roles"><p>역할 더하기 <small>(나중에 해도 돼요)</small></p>
        ${['citizen', 'pre', 'open', 'student'].map((r, i) => `<label><input type="radio" name="role" value="${r}"${i === 0 ? ' checked' : ''}><span>${roleName(r)}</span></label>`).join('')}</div>
      <button class="cta" data-act="verify">휴대폰 본인인증 <small>(시연: 바로 통과)</small></button>`);
  }

  function share(w) {
    const s = SP[w.space], url = location.origin + location.pathname + '#s=' + w.space;
    const text = `동성로 ${shortAddr(s)} 빈칸에 「${w.title}」 있으면 좋겠다! 공감 눌러 줘 → ${url}`;
    openModal(`<h3>공유 카드</h3>
      <div class="sharecard"><p class="sk">동성로 빈칸</p><p class="sw">「${esc(w.title)}」</p><p class="sa">📍 ${esc(shortAddr(s))}</p><p class="sl">♥ ${store.likes(w)}명이 공감</p></div>
      <textarea readonly rows="3" id="shareText">${esc(text)}</textarea>
      <button class="cta" data-act="copy">문구 · 링크 복사</button>`);
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
      case 'howto': case 'mine': return go(a);
      case 'login': return needAuth(() => { toast('가입 완료! 지도에서 빈칸을 골라 바람을 남겨 보세요'); render(); });
      case 'logout': st.user = null; save(); return go('home');
      case 'like': return needAuth(() => { store.toggleLike(id); const on = st.liked[id]; render(); redraw(); toast(on ? '공감했어요' : '공감을 취소했어요'); });
      case 'share': return share(store.wishes().find(w => w.id === id));
      case 'copy': { const t = $('#shareText').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('복사했어요'), () => { $('#shareText').select(); toast('선택해 두었어요 — 복사해 주세요'); }); return; }
      case 'close': return closeModal();
      case 'adclose': { const el = $('#mapAd'); el.dataset.closed = 1; el.hidden = true; return; }
      case 'verify': {
        const role = (mbox.querySelector('input[name=role]:checked') || {}).value || 'citizen';
        st.user = { name: '회원 ' + Math.floor(1000 + Math.random() * 9000), verified: true, role }; save();
        closeModal(); toast('본인인증 완료 (시연)');
        const f = after; after = null; if (f) f(); else render();
        return;
      }
      case 'join': return needAuth(() => { st.entered = true; save(); toast('이벤트 참여! 빈칸을 골라 바람을 남기면 자동 응모돼요'); document.body.classList.add('pulse'); setTimeout(() => document.body.classList.remove('pulse'), 2400); render(); });
    }
  });

  // 바람 올리기
  P.addEventListener('input', e => { const c = P.querySelector(`.cnt[data-for="${e.target.name}"]`); if (c) c.textContent = `${e.target.value.length} / ${e.target.maxLength}`; if (e.target.closest('#wform')) $('#werr').hidden = true; });
  const BAD = /(망해|망했|최악|별로|쓰레기|광고|홍보|할인|010-?\d|카톡|오픈채팅|https?:\/\/)/;
  P.addEventListener('submit', e => {
    if (e.target.id !== 'wform') return;
    e.preventDefault();
    const f = new FormData(e.target), title = (f.get('title') || '').trim(), why = (f.get('why') || '').trim();
    const err = m => { const el = $('#werr'); el.textContent = m; el.hidden = false; };
    if (title.length < 2) return err('가게를 두 글자 이상 적어 주세요');
    if (BAD.test(title + why)) return err('비방 · 광고 · 연락처로 보이는 말이 있어요. 고쳐서 다시 올려 주세요');
    if (store.bySpace(view.space).some(w => w.title.replace(/\s/g, '') === title.replace(/\s/g, ''))) return err('이 빈칸에 같은 바람이 이미 있어요. 그 바람에 공감을 눌러 주세요');
    const w = { id: 'u' + Date.now(), space: view.space, cat: f.get('cat'), title, why: why || '—', who: roleName(st.user.role), likes: 0, ago: 0 };
    store.add(w);
    go('space', { space: view.space });
    toast('바람이 올라갔어요 · 오픈 이벤트 자동 응모');
    setTimeout(() => share(w), 300);
  });

  // 검색
  $('#search').addEventListener('submit', e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) go('search', { q }); });

  // ---------------- owner.js 등에 내보내기 ----------------
  window.APP = { st, save, store, SP, M, SUP, SEED, esc, shortAddr, roleName, go, needAuth, toast, adHTML, rerender: () => render(), refresh: () => { render(); redraw(); }, view: () => view, focus: id => map && map.focus(SP[id]), pulse: () => { document.body.classList.add('pulse'); setTimeout(() => document.body.classList.remove('pulse'), 2400); } };

  // ---------------- 시작 ----------------
  (async () => {
    map = await MapView.create($('#map'), M, { onPick: id => go('space', { space: id }) });
    if (map.why) { const m = $('#mapmsg'); m.textContent = map.why; m.hidden = false; }
    document.body.dataset.map = map.kind;
    const fromHash = () => { const h = location.hash.match(/^#s=(V\d+)/); if (h && SP[h[1]]) { go('space', { space: h[1] }); return true; } };
    if (!fromHash()) { render(); redraw(); map.fitTo(M.spaces.filter(s => store.bySpace(s.id).length)); }
    window.addEventListener('hashchange', () => { if (!fromHash() && !location.hash) go('home'); });
  })();
})();
