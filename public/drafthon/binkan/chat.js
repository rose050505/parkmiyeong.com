// 빈칸 도우미 (챗봇) — 모든 화면 오른쪽 아래. 말로 물으면 맞는 화면으로 데려가고(길 안내), 바람 · 빈칸을 찾고, 지원사업 · 이용 방법을 답한다.
// AI(assist.js · /api/binkan-assist)가 답과 할 일을 고르면 run()이 사이트 데이터로 계산해 채팅 카드로 보여 준다. AI가 안 되면 규칙(understand · answer)으로.
(function () {
  const A = window.APP, { store, SP, M, SUP, esc, shortAddr } = A;
  const $ = s => document.querySelector(s);
  const log = [];   // { who: 'bot' | 'me', html }

  document.body.insertAdjacentHTML('beforeend', `
    <button class="chatfab" id="chatFab" aria-label="빈칸 도우미 열기"><span class="cf-i">💬</span><span class="cf-t">빈칸 도우미</span></button>
    <section class="chatbox" id="chatBox" hidden role="dialog" aria-label="빈칸 도우미">
      <header><b>빈칸 도우미</b><span class="caimode" id="chatMode"></span><button class="cx" data-c="close" aria-label="닫기">×</button></header>
      <div class="clog" id="chatLog" aria-live="polite"></div>
      <div class="cchips" id="chatChips"></div>
      <form class="cform" id="chatForm"><input id="chatIn" type="text" placeholder="편하게 물어보세요" autocomplete="off" aria-label="도우미에게 묻기"><button type="button" class="cmic" id="chatMic" aria-label="말로 묻기" hidden>🎤</button><button class="csend">보내기</button></form>
    </section>`);

  // ---------------- 알아듣기 (시연: 규칙) ----------------
  const GROUP_WORDS = [['디자인 · 공간', /디자인|건축|인테리어|공간/], ['마케팅 · 콘텐츠', /마케팅|홍보|광고|미디어|콘텐츠|sns/i], ['데이터 · IT', /데이터|통계|컴퓨터|개발|코딩|it/i], ['식품 · 메뉴', /식품|조리|요리|메뉴|영양/], ['경영 · 기획', /경영|기획|회계|창업/]];
  const itemOf = t => { const m = t.match(/([가-힣a-zA-Z]{1,10} ?(집|카페|식당|가게|샵|바|주점|베이커리|학원|사진관|스튜디오|점|방|관))/); const it = m ? m[1].replace(/^(우리|제|저희|동성로에?|여기에?)\s*/, '').trim() : ''; return /^(가게|집|카페|식당|샵|바)$/.test(it) ? '' : it; };
  function understand(text) {
    const t = text.replace(/\s/g, '');
    if (/^(안녕|하이|hi|hello|도움|도와)/i.test(t)) return { k: 'hello' };
    if (/학생|대학생|학점|장학|인턴|취업|포트폴리오|전공|과제있|경력쌓/.test(t)) return { k: 'student', g: (GROUP_WORDS.find(([, re]) => re.test(t)) || [])[0] };
    if (/지원금|지원사업|혜택|보조금|대출|받을수있|정부지원|지원받/.test(t)) return { k: 'support' };
    if (/운영중|하고있|장사|손님|매출|단골|재고|발주|리뷰|우리가게|저희가게|홍보가|안팔/.test(t)) {
      const trouble = /손님|단골|재방문|리뷰/.test(t) ? '고객 관리' : /홍보|알리|sns|인스타|모르/i.test(t) ? '홍보' : /매출|안팔|돈/.test(t) ? '매출' : /재고|발주|폐기|남아/.test(t) ? '재고' : '기타';
      return { k: 'open', trouble, item: itemOf(text) };
    }
    if (/창업|열고|열려|열어|오픈|차리|차려|개업|시작하고싶|시작해|가게를?내|해볼까|하고싶|하려고|할까/.test(t)) return { k: 'pre', item: itemOf(text) };
    if (/어디|찾아|보여/.test(t) && !/남기/.test(t)) return { k: 'find', q: text.trim() };
    if (/바람남|남기|있었으면|있으면좋|생기면좋|원하는가게|이벤트|기프티콘|상품권/.test(t)) return { k: 'wish' };
    if (/로그인|가입|본인인증|인증/.test(t)) return { k: 'auth' };
    if (/공실|데이터|어디서|출처|정확/.test(t)) return { k: 'data' };
    if (/뭐야|뭔가요|무엇|어떻게|이용|사용법|처음|설명/.test(t)) return { k: 'howto' };
    return { k: 'find', q: text.trim() };
  }

  // ---------------- 답하기 (동작은 실제 화면을 움직인다) ----------------
  const btn = (c, label, extra = '') => `<button class="cbtn" data-c="${c}"${extra}>${esc(label)}</button>`;
  function answer(text, u0) {
    const u = u0 || understand(text), v = A.view(), sp = v.space && SP[v.space];
    const ai = !!u.ai, R = s => ai ? '' : s;   // AI 답이면 정해 둔 문장 대신 AI 문장을 쓰고, 목록 · 버튼만 덧붙인다
    switch (u.k) {
      case 'other': return '';
      case 'hello': return `안녕하세요! 동성로 빈 점포에 <b>원하는 가게</b>를 남기거나, <b>창업 · 경영 상담</b>, <b>대학생 동행 프로젝트</b>로 안내해 드려요. 무엇이 궁금하세요?`;
      case 'student':
        window.STUDENT.startWith({ filter: u.g || null }); A.go('student');
        return R(`대학생 <b>동행 프로젝트</b>로 안내했어요. 장학금 · 전공 학점 · 실무 경력을 받으면서 동성로 가게의 창업부터 운영까지 한 학기 함께해요.${u.g ? ` <b>${esc(u.g)}</b> 과제만 골라 뒀어요.` : ''}`);
      case 'open':
        window.OWNER.startWith({ status: 'open', trouble: u.trouble || '기타', story: text, item: u.item }); A.go('owner');
        return R(`운영 중인 가게 고민으로 정리해 뒀어요 — 어려움: <b>${esc(u.trouble)}</b>${u.item ? `, 업종: <b>${esc(u.item)}</b>` : ''}. 화면에서 ${u.item ? '가게 위치만' : '업종 · 가게 위치를'} 확인하고 「AI와 문제 정리하기」를 눌러 주세요.`);
      case 'pre': {
        const known = u.item ? (sp ? 'both' : 'item') : (sp ? 'place' : null);
        window.OWNER.startWith({ status: 'pre', known, item: u.item, space: sp ? sp.id : null }); A.go('owner');
        return R(`창업 상담으로 안내했어요.${u.item ? ` 아이템 <b>${esc(u.item)}</b>` : ''}${sp ? ` · 자리 <b>${esc(shortAddr(sp))}</b>` : ''}${known ? '를 넣어 뒀어요.' : ' 정해 둔 것(아이템 · 자리)을 골라 주세요.'} 시민 바람이 많은 빈칸을 먼저 추천해 드려요.`);
      }
      case 'support': {
        const L = SUP.list.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>${x.closed ? ' <em>마감</em>' : ''} — ${esc(x.target)}</li>`).join('');
        return `${R('동성로 창업 · 가게 운영 때 볼 만한 지원이에요.')}<ul>${L}</ul>그리고 우리 시범 사업 <b>동행 프로젝트</b>는 사장님께 시범 지원금 + 대학생 팀을 연결해요. ${btn('owner', '사장님 상담 시작')}<small>최종 자격은 공고 기관이 판단해요. (${esc(SUP.checked)} 확인)</small>`;
      }
      case 'wish':
        if (sp) { A.needAuth(() => A.go('write', { space: sp.id })); return R(`지금 보고 있는 <b>${esc(shortAddr(sp))}</b> 빈칸에 바람을 남기는 화면을 열었어요. 공감을 많이 받은 바람에는 오픈 이벤트 경품(예시)도 있어요.`); }
        A.go('home'); A.pulse();
        return R(`지도에서 <b>초록 네모(빈칸)</b>를 눌러 「여기 있으면 좋겠는 가게」를 남겨 주세요. 지금 반짝이는 게 빈칸이에요. 남긴 바람은 공유 카드로 친구에게 보낼 수 있어요.`);
      case 'auth': return `${R('보기는 누구나 할 수 있고, <b>바람 · 공감 · 지원서</b>만 회원(휴대폰 본인인증)이 할 수 있어요. 한 사람이 한 계정이에요.')} ${btn('login', '로그인 · 가입')}`;
      case 'data': return `<small>출처</small>빈칸 ${M.meta.n_spaces}곳은 소상공인시장진흥공단 상가(상권)정보 ${esc(M.meta.q_prev)} → ${esc(M.meta.q_now)} 비교로 찾은 <b>1층 공실 후보</b>예요(같은 층에 새 업소 없음). 실제 공실인지는 현장 확인이 필요하고, 본 사업에서는 시가 상가 매물 플랫폼과 공실 정보를 연동하는 방안을 제안해요.`;
      case 'howto': A.go('howto'); return R(`<b>빈칸</b>(공실 후보)에 시민이 <b>바람</b>(여기 ○○ 있으면)을 남기고 <b>공감</b>을 모아요 → 준비된 사장님이 그 바람을 보고 창업 상담 → 시 + 지역 대학이 선정 → 대학생 4인 팀 + 지도교수가 한 학기 함께해요. 오른쪽에 이용 방법을 열어 뒀어요.`);
      case 'find': {
        if (ai && !u.q && u.item) u.q = u.item;
        const tk = (u.q || text).replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').split(/\s+/).map(w => w.replace(/(집|가게|있어요|어디|있나요|보여줘|찾아줘)$/g, '')).filter(w => w.length >= 2 && !/^(바람|어디|있어요|있나요|보여줘|찾아줘|빈칸)$/.test(w));
        const ws = tk.length ? store.wishes().filter(w => tk.some(k => (w.title + w.cat).includes(k))).sort((a, b) => store.likes(b) - store.likes(a)).slice(0, 4) : [];
        if (ws.length) return `이런 바람이 있어요.<div class="crow">${ws.map(w => btn('space', `${w.title} ♥${store.likes(w)} · ${shortAddr(SP[w.space])}`, ` data-id="${esc(w.space)}"`)).join('')}</div>누르면 지도에서 그 빈칸을 열어 드려요.`;
        const ss = tk.length ? M.spaces.filter(s => tk.some(k => (s.was + s.addr).includes(k))).slice(0, 4) : [];
        if (ss.length) return `직전 업종 · 주소로 찾은 빈칸이에요.<div class="crow">${ss.map(s => btn('space', `${shortAddr(s)} · 직전 ${s.was}`, ` data-id="${s.id}"`)).join('')}</div>`;
        if (ai) return '';
        return `잘 알아듣지 못했어요. 아래처럼 물어봐 주세요. <small>(지금은 인터넷 연결이 안 돼 정해진 말만 알아들어요.)</small>`;
      }
    }
  }

  // ---------------- 추천 질문: 지금 화면에 맞게 ----------------
  function chips() {
    const v = A.view(), sp = v.space && SP[v.space];
    const C = { owner: ['지원금은 어떤 게 있어요?', '과제는 누가 해요?', '대학생 팀은 어떻게 뽑아요?'],
      student: ['디자인 전공인데 할 수 있는 과제 있어요?', '장학금 · 학점은 어떻게 받아요?', '창업하고 싶어요'],
      space: [`이 자리에 창업하고 싶어요`, '여기 바람 남기고 싶어요', '받을 수 있는 지원은?'] }[v.mode]
      || ['동성로에 디저트 카페 열고 싶어요', '우리 가게 손님이 줄었어요', '대학생인데 경력 쌓고 싶어요', '파스타 바람 어디 있어요?'];
    $('#chatChips').innerHTML = C.map(c => `<button class="chip ex" data-c="say" data-v="${esc(c)}">${esc(c)}</button>`).join('');
  }
  const FAQ = { '과제는 누가 해요?': '선정된 가게마다 <b>대학생 4명 + 지도교수</b>가 한 팀이에요. 과제는 사장님 상담에서 AI가 초안을 내고 사장님이 1~4개를 골라요. 세무 · 공사 · 계약처럼 학생 몫이 아닌 일은 전문가 · 기관으로 안내해요.',
    '대학생 팀은 어떻게 뽑아요?': '학생은 관심 직무 · 가능 시간 · 질문 2개로 지원하고, <b>운영단(시 + 지역 대학)이 선발 → 사장님 면담</b> 순서로 정해요. 전공 · 학년 제한은 두지 않아요.',
    '장학금 · 학점은 어떻게 받아요?': '지역 대학 <b>연계 교과</b>로 전공 학점을 받고(대구 앵커사업 · 옛 RISE 연계), 참여 학생 장학금을 지원해요. 금액 · 학점 수는 대학별로 정해요 [가정]. 학기 끝에 <b>경력 카드</b>가 남아요.' };

  // ---------------- 실시간 AI (전용 창구 /api/binkan-assist: 지시문 서버 고정, { reply, do } JSON만 받음) ----------------
  const live = () => navigator.onLine !== false;
  const ENDPOINT = /(^|\.)parkmiyeong\.com$/.test(location.hostname) ? '/api/binkan-assist' : 'https://parkmiyeong.com/api/binkan-assist';
  let shown = [];   // 최근 채팅에 보여 준 빈칸 · 바람(번호로 가리킬 수 있게)
  const wishLabel = w => `바람 ${w.id} 「${w.title}」 @${w.space} ${shortAddr(SP[w.space])} ♥${store.likes(w)}`;
  const spaceLabel = sp => `빈칸 ${sp.id} ${shortAddr(sp)} (직전 ${sp.was})`;
  function context() {
    const v = A.view(), sp = v.space && SP[v.space], st = A.st;
    const screen = { home: '첫 화면(지도)', space: '빈칸 상세', write: '바람 남기기', owner: '사장님 상담', student: '대학생 동행 프로젝트', howto: '이용 방법', search: '검색 결과', mine: '내 페이지' }[v.mode] || v.mode;
    const o = st.owner;
    return {
      screen,
      space: sp ? { id: sp.id, addr: shortAddr(sp), was: sp.was, wishes: store.bySpace(sp.id).slice(0, 4).map(w => `${w.id} ${w.title}(♥${store.likes(w)})`) } : null,
      owner: v.mode === 'owner' && o ? `${o.step}단계 · ${o.status === 'open' ? '운영 중' : o.status === 'pre' ? '열 예정' : '상황 미정'}${o.item ? ' · 업종 ' + o.item : ''}${o.space ? ' · 자리 ' + o.space : ''}` : '',
      trending: store.wishes().sort((a, b) => store.likes(b) - store.likes(a)).slice(0, 8).map(wishLabel),
      shown: shown.map(x => x.label),
      user: st.user ? `로그인함 · ${A.roleName(st.user.role)}` : '로그인 안 함',
    };
  }
  async function aiTurn(text) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
    try {
      const history = log.filter(m => m.text).map(m => ({ who: m.who === 'me' ? 'me' : 'bot', text: m.text }));
      const r = await fetch(ENDPOINT, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ctx: context(), history, text }) });
      if (r.status === 429) throw new Error('잠시 뒤 다시');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.u || typeof j.u.reply !== 'string') throw new Error('AI 답 없음');
      return j.u;
    } finally { clearTimeout(tm); }
  }

  // ---------------- 할 일 실행: 사이트 데이터로 계산해 채팅 카드로 ----------------
  const T = () => window.OWNER.tools;
  const drafts = {};
  const spBtns = (id, item) => `<div class="cbrow">${btn('space', '지도에서 보기', ` data-id="${id}"`)}${item ? btn('card', '창업 카드', ` data-id="${id}" data-item="${esc(item)}"`) + btn('consult', '이 자리로 상담', ` data-id="${id}" data-item="${esc(item)}"`) : btn('consult', '이 자리로 상담', ` data-id="${id}"`)}</div>`;
  function cardRecommend(item) {
    const L = T().combos({ known: 'item', item });
    shown = L.map(c => ({ kind: 'space', id: c.space, label: spaceLabel(SP[c.space]) }));
    return `<div class="ccard2"><b>「${esc(item)}」에 맞는 빈칸</b>${L.map((c, i) => `<div class="citem"><span class="cn">${i + 1}</span><div><b>${esc(shortAddr(SP[c.space]))}</b> <small>직전 ${esc(SP[c.space].was)}</small><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>${spBtns(c.space, item)}</div></div>`).join('')}<small>시민 바람 · 100m 안 같은 업종대 수로 계산</small></div>`;
  }
  function cardSpace(id, item) {
    const sp = SP[id]; if (!sp) return '';
    shown = [{ kind: 'space', id, label: spaceLabel(sp) }];
    const it = item || sp.was, risk = T().riskList({ status: 'pre', item: it, space: id });
    const sup = SUP.list.filter(x => x.who.includes('pre')).map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>${x.needCheck ? ' <small>공고 확인 필요</small>' : ''}</li>`).join('');
    return `<div class="ccard2"><b>창업 카드 · ${esc(it)} @ ${esc(shortAddr(sp))}</b><ul class="risk">${risk.join('')}</ul><b class="sub">받을 수 있는 지원</b><ul>${sup}</ul>${spBtns(id, item)}<small>소진공 상가정보 ${esc(M.meta.q_now)} 기준 계산 · 경쟁 기준 [가정]</small></div>`;
  }
  function cardFind(q) {
    const tk = q.replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
    const ws = store.wishes().filter(w => tk.some(k => (w.title + w.cat + w.why).includes(k))).sort((a, b) => store.likes(b) - store.likes(a)).slice(0, 4);
    const ss = M.spaces.filter(s => tk.some(k => (s.was + s.addr).includes(k))).slice(0, 3);
    shown = ws.map(w => ({ kind: 'wish', id: w.id, label: wishLabel(w) })).concat(ss.map(s => ({ kind: 'space', id: s.id, label: spaceLabel(s) })));
    if (!ws.length && !ss.length) return `<div class="ccard2"><b>「${esc(q)}」</b> 바람 · 빈칸이 아직 없어요. 빈칸에 첫 바람을 남겨 보세요.</div>`;
    const wRow = (w, i) => {
      const likeLabel = A.st.liked[w.id] ? '♥ 공감함' : '♥ 공감';
      return '<div class="citem"><span class="cn">' + (i + 1) + '</span><div><b>' + esc(w.title) + '</b> <small>♥' + store.likes(w) + ' · ' + esc(shortAddr(SP[w.space])) + (w.seed ? ' · 예시' : '') + '</small><div class="cbrow">' + btn('like', likeLabel, ' data-id="' + w.id + '"') + btn('space', '지도에서 보기', ' data-id="' + w.space + '"') + '</div></div></div>';
    };
    const sRow = (s, i) => '<div class="citem"><span class="cn">' + (ws.length + i + 1) + '</span><div><b>' + esc(shortAddr(s)) + '</b> <small>직전 ' + esc(s.was) + '</small>' + spBtns(s.id) + '</div></div>';
    return '<div class="ccard2">' + (ws.length ? '<b>「' + esc(q) + '」 바람</b>' + ws.map(wRow).join('') : '') + (ss.length ? '<b class="sub">직전 업종 · 주소로 찾은 빈칸</b>' + ss.map(sRow).join('') : '') + '</div>';
  }
  function cardWish(a) {
    const sp = SP[a.space]; if (!sp) return '';
    const k = 'd' + Date.now(); drafts[k] = a;
    return `<div class="ccard2 draft"><b>바람 초안</b><p>📍 ${esc(shortAddr(sp))} <small>직전 ${esc(sp.was)}</small></p><p class="dt">「${esc(a.title)}」 <small>${esc(a.cat)}</small></p>${a.why ? `<p>${esc(a.why)}</p>` : ''}<div class="cbrow">${btn('wishpost', '이대로 올리기', ` data-k="${k}"`)}${btn('space', '지도에서 보기', ` data-id="${a.space}"`)}</div><small>올리기는 회원만 · 비방 · 광고는 걸러져요</small></div>`;
  }
  function cardSupports(who) {
    return `<div class="ccard2"><b>${who === 'open' ? '운영 중인 가게' : '창업 준비'}에 볼 만한 지원</b><ul>${SUP.list.map(x => { const ok = x.who.includes(who); return `<li class="${ok ? '' : 'no'}"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>${x.closed ? ' <em>마감</em>' : ''} — ${ok ? esc(x.target) : '해당 안 됨: ' + esc((x.whyNot || {})[who] || '대상이 다름')}</li>`; }).join('')}<li><b>동행 프로젝트(시범 사업)</b> — 시범 지원금 + 대학생 4인 팀 + 지도교수</li></ul>${btn('owner', '사장님 상담 시작')}<small>${esc(SUP.checked)} 공고 · 보도로 확인 · 최종 자격은 공고 기관 판단</small></div>`;
  }
  function run(a, text) {
    switch (a.act) {
      case 'recommend': return cardRecommend(a.item);
      case 'spacecard': return cardSpace(a.space, a.item);
      case 'find': return cardFind(a.query);
      case 'show': if (SP[a.space]) { A.go('space', { space: a.space }); shown = [{ kind: 'space', id: a.space, label: spaceLabel(SP[a.space]) }]; } return '';
      case 'wish': return cardWish(a);
      case 'like': return like(a.wish);
      case 'owner': {
        const known = a.status === 'pre' ? (a.item && a.space ? 'both' : a.item ? 'item' : a.space ? 'place' : null) : null;
        window.OWNER.startWith({ status: a.status, item: a.item, trouble: a.trouble, story: a.status === 'open' ? text : '', space: a.status === 'pre' ? (a.space || null) : null, known }); A.go('owner'); return '';
      }
      case 'student': window.STUDENT.startWith({ filter: a.group || null }); A.go('student'); return '';
      case 'supports': return cardSupports(a.who);
      case 'page': if (a.to === 'login' || (a.to === 'mine' && !A.st.user)) { A.needAuth(() => A.refresh()); return ''; } A.go(a.to); return '';
    }
    return '';
  }
  function like(id) {
    const w = store.wishes().find(x => x.id === id); if (!w) return '';
    if (!A.st.user) { A.needAuth(() => { if (!A.st.liked[id]) store.toggleLike(id); A.refresh(); push(`「${esc(w.title)}」에 공감했어요. ♥${store.likes(w)}`); }); return '<small>공감은 회원만 할 수 있어요 — 로그인 창을 열었어요.</small>'; }
    if (!A.st.liked[id]) store.toggleLike(id);
    A.refresh(); return `<div class="ccard2">「${esc(w.title)}」에 공감했어요. <b>♥${store.likes(w)}</b></div>`;
  }
  function push(html, text) { log.push({ who: 'bot', html, text: text || html.replace(/<[^>]+>/g, '').slice(0, 200) }); draw(); }

  function modeBtn() { const b = $('#chatMode'); b.textContent = live() ? 'AI' : '오프라인'; b.classList.toggle('on', live()); b.title = live() ? 'Claude가 문장을 읽고 안내 · 실행해요. 연결이 안 되면 정해 둔 말로 답해요' : '인터넷이 없어 정해 둔 말로 답해요'; }
  function draw() { $('#chatLog').innerHTML = log.map(m => `<div class="cm ${m.who}">${m.html}</div>`).join(''); $('#chatLog').scrollTop = 1e6; chips(); modeBtn(); }
  let busy = false;
  async function say(text) {
    if (!text.trim() || busy) return;
    log.push({ who: 'me', html: esc(text), text });
    if (FAQ[text]) { push(FAQ[text]); return; }
    let u = null, note = '';
    if (live()) {
      busy = true; log.push({ who: 'bot wait', html: '<span class="dots">AI가 읽는 중</span>' }); draw();
      try { u = await aiTurn(text); } catch (e) { note = `<small>실시간 AI 연결 실패(${esc(e.name === 'AbortError' ? '응답 시간 초과' : e instanceof TypeError ? '인터넷 · 서버 연결 안 됨' : e.message)}) — 정해 둔 말로 답했어요.</small>`; }
      log.pop(); busy = false;
    }
    if (u) {
      const cards = (u.do || []).map(a => run(a, text)).filter(Boolean).join('');
      push(esc(u.reply) + cards + '<small class="aimark">AI 답 · 숫자 · 목록은 사이트 데이터로 계산</small>', u.reply + (shown.length ? ' [보여 준 것: ' + shown.map(x => x.id).join(', ') + ']' : ''));
    } else push((answer(text, understand(text)) || '') + note);
  }
  function open() { $('#chatBox').hidden = false; $('#chatFab').hidden = true; if (!log.length) { log.push({ who: 'bot', html: answer('안녕') + '<br><small>예: 「새우깡 전문점 어때?」 「두 번째 자리 창업 카드 보여 줘」 「거기 셀프 사진관 바람 남겨 줘」</small>' }); } draw(); $('#chatIn').focus(); }
  function close() { $('#chatBox').hidden = true; $('#chatFab').hidden = false; }
  $('#chatFab').onclick = open;
  $('#chatForm').onsubmit = e => { e.preventDefault(); const v = $('#chatIn').value; $('#chatIn').value = ''; say(v); };

  $('#chatBox').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const c = b.dataset.c, id = b.dataset.id;
    if (c === 'close') return close();
    if (c === 'say') return say(b.dataset.v);
    if (c === 'space') { A.go('space', { space: id }); return; }
    if (c === 'card') { push(cardSpace(id, b.dataset.item)); return; }
    if (c === 'consult') { const item = b.dataset.item || ''; window.OWNER.startWith({ status: 'pre', known: item ? 'both' : 'place', item, space: id }); A.go('owner'); push(`<small>${esc(shortAddr(SP[id]))} 자리로 창업 상담을 열었어요${item ? ` (아이템 「${esc(item)}」)` : ''}.</small>`); return; }
    if (c === 'like') { push(like(id)); return; }
    if (c === 'wishpost') {
      const d = drafts[b.dataset.k]; if (!d) return;
      A.needAuth(() => {
        if (store.bySpace(d.space).some(w => w.title.replace(/\s/g, '') === d.title.replace(/\s/g, ''))) return push('이 빈칸에 같은 바람이 이미 있어요. 그 바람에 공감해 주세요.');
        if (/(망해|최악|쓰레기|광고|홍보|할인|010-?\d|카톡|https?:\/\/)/.test(d.title + d.why)) return push('비방 · 광고 · 연락처로 보이는 말이 있어 올리지 않았어요. 고쳐서 다시 말해 주세요.');
        const w = { id: 'u' + Date.now(), space: d.space, cat: d.cat, title: d.title, why: d.why || '—', who: A.roleName(A.st.user.role), likes: 0, ago: 0 };
        store.add(w); delete drafts[b.dataset.k]; A.go('space', { space: d.space });
        shown = [{ kind: 'wish', id: w.id, label: wishLabel(w) }];
        push(`바람을 올렸어요 — 「${esc(w.title)}」 @ ${esc(shortAddr(SP[w.space]))}. 오픈 이벤트에 자동 응모됐어요. 지도에서 그 빈칸을 열어 뒀어요.`);
      });
      return;
    }
    if (c === 'owner') { window.OWNER.start(null); A.go('owner'); return; }
    if (c === 'login') { A.needAuth(() => A.toast('가입 완료!')); return; }
  });
  // 음성 입력 (지원하는 브라우저만): 화면 글자 입력이 어려운 분도 말로 물을 수 있게
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = $('#chatMic'); mic.hidden = false;
    mic.onclick = () => {
      const r = new SR(); r.lang = 'ko-KR'; r.interimResults = false;
      mic.classList.add('on'); r.onresult = e => { const t = e.results[0][0].transcript; say(t); };
      r.onend = () => mic.classList.remove('on'); r.onerror = () => { mic.classList.remove('on'); A.toast('음성을 알아듣지 못했어요'); };
      r.start();
    };
  }
  window.CHAT = { open, say };
})();
