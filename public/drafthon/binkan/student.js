// 대학생 흐름 (청사진 §4-4): 과제 둘러보기 → 공고 → 지원서 → 진행 상태 → 경력 카드
// 공고는 시연용 예시 4건 + 이 브라우저에서 사장님 흐름으로 선정된 공고. 「AI」 칸은 규칙 기반 시연판(AI.* 만 바꾸면 됨).
(function () {
  const A = window.APP, { st, save, SP, esc, shortAddr } = A;
  const STEPS = ['과제 둘러보기', '공고', '지원서', '진행 상태', '경력 카드'];
  const GROUPS = ['경영 · 기획', '마케팅 · 콘텐츠', '디자인 · 공간', '데이터 · IT', '식품 · 메뉴'];
  const groupOf = majors => { const major = majors.split('·')[0]; return /식품|조리/.test(major) ? '식품 · 메뉴' : /디자인|건축|공간/.test(major) ? '디자인 · 공간' : /미디어|광고|홍보|마케팅/.test(major) ? '마케팅 · 콘텐츠' : /통계|데이터|컴퓨터|산업공학/.test(major) ? '데이터 · IT' : '경영 · 기획'; };
  const TIMES = ['평일 낮', '평일 저녁', '주말'];
  const blank = () => ({ step: 1, filter: null, sel: null, role: null, prof: { school: '', major: '', groups: [], time: [], link: '' }, ans: ['', ''], status: null });
  // st.stu = 지금 회원의 지원 진행(app.js가 회원마다 나눠 둠). 없으면 새로
  const S = () => st.stu || (st.stu = blank());
  S().recoBusy = null;
  const set = patch => { Object.assign(S(), patch); save(); if (A.view().mode === 'student') A.rerender(); };

  // ---------------- 공고 ----------------
  const R = (t, major, out, wk = 4) => ({ t, major, out, wk });
  const EXAMPLES = [
    { id: 'p1', ex: true, kind: 'pre', space: 'V004', item: '가성비 파스타집', owner: '예비 사장님 · 요식업 경력 5년', ask: '평일 저녁 회의 한 번', wish: '의견 1위 ♥41',
      roles: [R('상권 · 고객 조사', '경영 · 통계', '타깃 고객 정의서 · 경쟁 가게 표', 3), R('메뉴 · 가격 설계', '식품영양 · 경영', '메뉴판 초안 · 원가표'), R('브랜드 · 간판 · 메뉴판 디자인', '시각디자인', '로고 · 간판 시안 · 메뉴판'), R('오픈 홍보 · 지도 앱 등록', '미디어 · 광고홍보', 'SNS 계정 · 오픈 콘텐츠', 3)] },
    { id: 'p2', ex: true, kind: 'pre', space: 'V005', item: '밤늦게 여는 스터디카페', owner: '예비 사장님 · 첫 창업', ask: '주 1회 현장 방문', wish: '의견 ♥33',
      roles: [R('상권 · 이용자 조사', '경영 · 통계', '시험 기간 이용 수요 보고서', 3), R('좌석 · 동선 배치안', '실내건축', '배치 도면 2안'), R('예약 · 좌석 관리 화면', '컴퓨터', '예약 화면 시안 · 운영 규칙'), R('오픈 홍보', '미디어 · 광고홍보', '대학가 홍보 콘텐츠', 3)] },
    { id: 'p3', ex: true, kind: 'open', near: '교동시장', item: '덮밥집 (운영 3년)', owner: '기존 사장님 · 고민: 고객 관리', ask: '점심 장사 뒤 오후 3시 회의', wish: '근처 의견 「혼밥 덮밥집」 ♥24',
      roles: [R('단골 관리 방식 설계', '경영', '적립 · 알림 방식 · 단골 기록표'), R('근처 의견으로 메뉴 실험', '식품영양 · 경영 · 미디어', '근처 시민 의견에 답 1~2개 · 답한 메뉴 기록 양식'), R('리뷰 · 방문 데이터 분석', '통계 · 데이터', '재방문 분석 보고서', 3), R('가게 소개 · 메뉴판 다시 만들기', '시각디자인', '메뉴판 · 소개 카드', 3)] },
    { id: 'p4', ex: true, kind: 'pre', space: 'V113', item: '지역 작가 소품샵', owner: '예비 사장님 · 공예 작가', ask: '주말 작업 가능하면 좋음', wish: '의견 ♥14',
      roles: [R('브랜드 · 매장 디스플레이', '시각디자인 · 실내건축', '브랜드 가이드 · 진열 배치안'), R('입점 작가 모집 · 정산 방식', '경영', '입점 계약 초안 · 정산표'), R('온라인 판매 페이지', '컴퓨터 · 마케팅', '판매 페이지 · 상품 사진'), R('오픈 행사 기획', '미디어 · 광고홍보', '오픈 행사안 · 콘텐츠', 3)] },
  ];
  // 공고 = 예시 4건 + 운영단이 선정한 지원서(운영단 표 · st.ownerApps)
  function posts() {
    const o = st.owner, L = EXAMPLES.slice();
    (st.ownerApps || []).filter(a => a.result === 'yes' && a.tasks && a.tasks.length).forEach(a => L.unshift({ id: a.id, ex: false, kind: a.status, space: a.space, near: a.near, item: a.item, owner: (a.status === 'pre' ? '예비' : '기존') + ' 사장님 · 운영단이 선정한 공고', ask: '면담 때 정함', wish: '', roles: a.tasks.map(t => R(t.t, t.major, t.out, t.wk)), uid: a.uid }));
    if (o && o.result === 'yes' && o.tasks && !o.appId) L.unshift({ id: 'mine', ex: false, kind: o.status, space: o.space, near: o.near, item: o.item, owner: (o.status === 'pre' ? '예비' : '기존') + ' 사장님 · 이 브라우저에서 선정된 공고', ask: '면담 때 정함', wish: '', roles: o.tasks.list.filter(t => t.on).map(t => R(t.t, t.major, t.out, t.wk)) });
    return L;
  }
  const myApp = () => (st.stuApps || []).find(a => a.id === S().appId);
  const statusOf = () => { const a = myApp(); return a ? a.status : S().status; };
  // 운영단이 팀에서 정한 자리(지원한 자리와 다를 수 있음)
  const slotOf = () => { const a = myApp(); const tm = a && Object.values(st.teams || {}).find(t => t.at && t.members.some(m => m.sa === a.id)); const m = tm && tm.members.find(x => x.sa === a.id); return m ? m.slot : S().role; };
  // 운영단이 팀을 확정한 공고(다른 공고의 자리에 넣었을 수 있음) — 없으면 처음 지원한 공고
  const teamPost = () => { const a = myApp(); const e = a && Object.entries(st.teams || {}).find(([, t]) => t.at && t.members.some(m => m.sa === a.id)); return (e && P(e[0])) || null; };
  const setStatus = v => { const a = myApp(); if (a) a.status = v; set({ status: v }); };
  const P = id => posts().find(p => p.id === id);
  const where = p => p.space ? shortAddr(SP[p.space]) : (p.near || '') + ' 근처';
  const groupsOfPost = p => [...new Set(p.roles.map(r => groupOf(r.major)))];

  // ---------------- 「AI」 시연판 ----------------
  const AI = {
    // 프로필(관심 직무 · 가능 시간)과 공고 자리를 맞춰 점수 + 이유
    recommend(prof) {
      return posts().flatMap(p => p.roles.map((r, i) => ({ p, r, i, g: groupOf(r.major) })))
        .map(x => { const hit = prof.groups.includes(x.g), maj = prof.major && x.r.major.split(/\s*·\s*/).some(m => prof.major.includes(m.slice(0, 2)));
          return Object.assign(x, { sc: (hit ? 5 : 0) + (maj ? 3 : 0) + (x.p.id === 'mine' ? 1 : 0), why: [hit && `관심 직무 「${x.g}」`, maj && `학과 「${prof.major}」와 맞는 전공`].filter(Boolean) }); })
        .filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 3);
    },
    questions(p, r) {
      const g = groupOf(r.major);
      const Q = {
        '경영 · 기획': ['이 가게의 손님이 누구라고 생각해요? 한 학기 안에 어떻게 확인할래요?', '사장님께 학기 뒤에도 남길 결과물 하나를 고른다면 무엇이고, 왜인가요?'],
        '마케팅 · 콘텐츠': ['이 가게를 동성로 사람들이 처음 알게 되는 장면을 하나 그려 주세요.', '콘텐츠를 학기 뒤 사장님 혼자서도 이어 가게 하려면 무엇을 남길래요?'],
        '디자인 · 공간': ['이 가게의 첫인상을 세 단어로 정한다면? 그 이유는요?', '예산이 적을 때 가장 먼저 바꿀 한 곳은 어디인가요?'],
        '데이터 · IT': ['사장님이 매일 1분 안에 적을 수 있는 기록은 무엇일까요?', '그 기록으로 한 달 뒤 사장님께 보여 줄 숫자 하나는요?'],
        '식품 · 메뉴': ['이 가게의 대표 메뉴 하나를 정한다면? 가격은 어떻게 정할래요?', '원가가 오를 때 메뉴를 지키는 방법 하나를 적어 주세요.'],
      }[g];
      return Q.map(q => q.replace('이 가게', `「${p.item}」`));
    },
  };

  // ---------------- 화면 ----------------
  const stepper = n => `<ol class="ostep">${STEPS.map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}"><span>${i + 1}</span>${t}</li>`).join('')}</ol>`;
  const aiTag = ai => ai ? '<span class="tag ai" title="Claude가 이 내용을 보고 만들었어요">AI</span>' : '<span class="tag" title="AI 연결이 안 돼 정해 둔 규칙으로 만들었어요">기본 추천</span>';
  const slots = () => posts().flatMap(p => p.roles.map((r, i) => ({ id: p.id + ':' + i, item: p.item, t: r.t, major: r.major })));
  const recoKey = pf => JSON.stringify([pf.major, pf.groups, pf.time]);
  // AI 추천: 관심 직무가 바뀌면 다시 묻는다. 기다리는 동안은 기본 추천을 보여 준다.
  function fetchReco() {
    const s = S(), pf = s.prof, key = recoKey(pf);
    if (!pf.groups.length || (s.reco && s.reco.key === key) || s.recoBusy === key) return;
    s.recoBusy = key;
    window.ASSIST.call('reco', { major: pf.major, groups: pf.groups, time: pf.time, slots: slots() })
      .then(out => { if (S().recoBusy !== key) return; S().reco = { key, ai: true, pick: out.pick }; S().recoBusy = null; save(); if ((S().step === 3 || S().step === 1) && A.view().mode === 'student') A.rerender(); })
      .catch(() => { if (S().recoBusy === key) { S().reco = { key, ai: false, pick: null }; S().recoBusy = null; save(); if ((S().step === 3 || S().step === 1) && A.view().mode === 'student') A.rerender(); } });
  }
  // AI 질문: 지원서로 넘어갈 때 한 번 묻고(최대 몇 초), 안 되면 기본 질문
  async function loadQuestions() {
    const s = S(), p = P(s.sel), r = p.roles[s.role], key = s.sel + ':' + s.role;
    if (s.qs && s.qs.key === key) return;
    try { const out = await window.ASSIST.call('questions', { item: p.item, kind: p.kind, t: r.t, major: r.major, out: r.out }, 15000); s.qs = { key, ai: true, q: out.q }; }
    catch (e) { s.qs = { key, ai: false, q: AI.questions(p, r) }; }
    s.ans = ['', '']; save();
  }
  const postCard = p => `<button class="pcard" data-s="open" data-id="${p.id}">
      <span class="pk">${p.ex ? '<span class="tag">운영팀 공고</span> ' : '<span class="tag mine">새로 선정</span> '}${p.kind === 'pre' ? '창업 준비' : '운영 중 가게'}</span>
      <b>${esc(p.item)}</b><small>📍 ${esc(where(p))}${p.wish ? ' · ' + esc(p.wish) : ''}</small>
      <span class="roles">${p.roles.map(r => `<i>${esc(r.t)}</i>`).join('')}</span>
      <span class="pg">${groupsOfPost(p).map(g => `<em>${esc(g)}</em>`).join('')}</span></button>`;

  // 1단계 맨 위: 전공 · 관심 직무만 넣으면 AI가 올라온 과제의 자리 중 맞는 3개를 이유와 함께 고름(지원서 3단계와 같은 추천)
  function recoFirst(s) {
    const pf = s.prof, rk = recoKey(pf), rec = s.reco && s.reco.key === rk ? s.reco : null, busy = s.recoBusy === rk;
    const picks = rec && rec.ai && rec.pick ? rec.pick.map(x => { const [pid, ri] = String(x.id).split(':'), p = P(pid), r = p && p.roles[+ri]; return p ? `<li><button data-s="open" data-id="${esc(pid)}"><b>${esc(p.item)}${r ? ' · ' + esc(r.t) : ''}</b><small>${esc(x.why || '')}</small></button></li>` : ''; }).join('') : '';
    return `<section class="oq"><h3>내 전공으로 맞는 자리 찾기 ${picks ? aiTag(true) : ''}</h3>
        <div class="recoin"><input id="s1major" maxlength="30" placeholder="전공 (예: 시각디자인 · 경영 · 식품영양)" value="${esc(pf.major || '')}">
        <div class="ochips">${GROUPS.map(g => `<button class="${pf.groups.includes(g) ? 'on' : ''}" data-s="s1g" data-v="${g}">${g}</button>`).join('')}</div>
        <button class="cta sm" data-s="s1reco"${pf.groups.length && !busy ? '' : ' disabled'}>${busy ? 'AI가 고르는 중…' : pf.groups.length ? '맞는 자리 추천 받기' : '관심 직무를 하나 이상 골라 주세요'}</button></div>
        ${picks ? `<ol class="s1reco">${picks}</ol>` : rec && !rec.ai ? '<p class="fine">AI 연결이 안 돼요. 아래 직무 칩으로 과제를 골라 보세요.</p>' : ''}</section>`;
  }
  function s1() {
    const s = S(), L = posts().filter(p => !s.filter || groupsOfPost(p).includes(s.filter));
    return `<section class="oq hero"><h2>동성로 가게의 개업 준비와 첫 운영을, 한 학기 동안 돕기</h2>
        <div class="gets"><div><b>장학금</b><small>참여 학생 지원</small></div><div><b>전공 학점</b><small>지역 대학 연계 교과 · 대구 앵커사업(옛 RISE)</small></div><div><b>실무 경력</b><small>경력 카드로 남음</small></div></div>
        <p class="was">4인 팀 + 지도교수 · 16주 · 사장님 가게의 실제 과제. 알바가 아니라 내 직무 경력이 돼요.</p></section>
      ${recoFirst(s)}
      <section class="oq"><h3>올라온 과제 <small>로그인 없이 볼 수 있어요</small></h3>
        <div class="ochips"><button class="${!s.filter ? 'on' : ''}" data-s="filter" data-v="">전체</button>${GROUPS.map(g => `<button class="${s.filter === g ? 'on' : ''}" data-s="filter" data-v="${g}">${g}</button>`).join('')}</div>
        <div class="plist">${L.map(postCard).join('') || '<p class="emptyw">이 직무의 과제가 아직 없어요.</p>'}</div>
</section>`;
  }

  function s2() {
    const s = S(), p = P(s.sel); if (!p) return s1();
    return `<section class="ocard"><div class="ohead"><p class="kick">동행 프로젝트 1기</p><h2>${esc(p.item)} <small>@ ${esc(where(p))}</small></h2>
        <p class="was">${esc(p.owner)}${p.wish ? ' · ' + esc(p.wish) : ''}</p></div>
      <div class="sum"><div><b>기간</b>한 학기 16주 · 8주 중간 점검</div><div><b>팀</b>대학생 4명 + 지도교수</div><div><b>받는 것</b>장학금 · 전공 학점(연계 교과) · 경력 카드</div><div><b>사장님</b>${esc(p.ask)}</div></div>
      <h3 style="margin-top:16px">자리 4개 <small>하나를 골라 지원해요</small></h3>
      <div class="tasks">${p.roles.map((r, i) => `<label class="task${s.role === i ? ' on' : ''}"><input type="radio" name="role" data-s="role" data-v="${i}"${s.role === i ? ' checked' : ''}><div><b>${esc(r.t)}</b><small>필요한 전공: ${esc(r.major)}${r.wk ? ` · ${esc(r.wk)}주` : ''}</small><small>결과물: ${esc(r.out)}</small></div></label>`).join('')}</div>
      </section>
      <div class="onav"><button class="cta2" data-s="step" data-v="1">← 과제 목록</button><button class="cta" data-s="go3"${s.role == null ? ' disabled' : ''}>이 자리로 지원하기 →</button></div>`;
  }

  function s3() {
    const s = S(), p = P(s.sel), r = p.roles[s.role], pf = s.prof, key = s.sel + ':' + s.role;
    const qd = s.qs && s.qs.key === key ? s.qs : { ai: false, q: AI.questions(p, r) }, qs = qd.q;
    const rk = recoKey(pf), aiRec = s.reco && s.reco.key === rk && s.reco.ai ? s.reco : null;
    const rec = !pf.groups.length ? [] : aiRec ? aiRec.pick.map(x => { const [pid, ri] = x.id.split(':'), pp = P(pid); return pp && pp.roles[+ri] ? { p: pp, r: pp.roles[+ri], i: +ri, why: [x.why] } : null; }).filter(Boolean) : AI.recommend(pf);
    const recBusy = pf.groups.length && !aiRec && s.recoBusy === rk;
    return `<section class="ocard"><div class="ohead"><p class="kick">지원서</p><h2>${esc(r.t)} <small>@ ${esc(p.item)}</small></h2></div>
      <form id="sform" novalidate>
        <h3>내 정보 <small>처음 한 번 저장 · 재학 확인은 운영단이 재학증명서로 [제안]</small></h3>
        <div class="orow"><label class="ofl">학교<input name="school" value="${esc(pf.school)}" placeholder="예: ○○대학교" maxlength="30"></label><label class="ofl">학과<input name="major" value="${esc(pf.major)}" placeholder="예: 경영학과" maxlength="30"></label></div>
        <fieldset class="ofs"><legend>관심 직무 <small>(여러 개)</small></legend><div class="ochips">${GROUPS.map(g => `<label><input type="checkbox" name="groups" value="${g}"${pf.groups.includes(g) ? ' checked' : ''}><span>${g}</span></label>`).join('')}</div></fieldset>
        <fieldset class="ofs"><legend>가능 시간</legend><div class="ochips">${TIMES.map(t => `<label><input type="checkbox" name="time" value="${t}"${pf.time.includes(t) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
        <label class="ofl">포트폴리오 링크 <small>(선택)</small><input name="link" value="${esc(pf.link)}" placeholder="https://" maxlength="200"></label>
        ${rec.length ? `<div class="reco aiout"><b>내 정보로 맞는 자리 ${aiTag(!!aiRec)}</b>${recBusy ? '<small class="busy">AI 추천 받는 중…</small>' : ''}${rec.map(x => `<button type="button" class="rrow" data-s="pickrec" data-id="${x.p.id}" data-v="${x.i}"><span>${esc(x.r.t)} <small>@ ${esc(x.p.item)}</small></span><small>${esc(x.why.join(' · '))}</small></button>`).join('')}</div>` : ''}
        <h3 style="margin-top:18px">질문 2개 ${aiTag(qd.ai)} <small>내 말로 짧게</small> <button type="button" class="link newq" data-s="newq">다른 질문 받기</button></h3>
        ${qs.map((q, i) => `<label class="ofl qa"><span>Q${i + 1}. ${esc(q)}</span><textarea name="a${i}" rows="3" maxlength="400">${esc(s.ans[i] || '')}</textarea><small class="cnt2">${(s.ans[i] || '').length} / 400</small></label>`).join('')}
        <p class="err" id="serr" hidden></p>
        <div class="onav"><button type="button" class="cta2" data-s="step" data-v="2">← 공고로</button><button class="cta" type="submit">지원서 제출</button></div>
      </form></section>`;
  }

  function s4() {
    const s = S(), tp = teamPost(), p = tp || P(s.sel), r = (tp ? p.roles[slotOf()] : null) || P(s.sel).roles[s.role], k = statusOf(), ops = A.hasRole('ops');
    const MY = window.MYSTORE, ownerStore = p.uid && MY ? MY.storeOf(p.uid) : null;
    const order = ['접수', '운영단 선발', '사장님 면담', '팀 확정', '한 학기 진행'];
    const at = { sent: 1, pass: 2, met: 3, team: 4, run: 5 }[k] || 1;
    return `<section class="ocard"><div class="ohead"><p class="kick">진행 상태</p><h2>${esc(r.t)} <small>@ ${esc(p.item)}</small></h2></div>
      <ol class="tl">${order.map((t, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}">${t}</li>`).join('')}</ol>
      ${k === 'drop' ? `<div class="okpost no"><p class="kick">이번에는 선발되지 않았어요</p><p>같은 연계 교과 안의 공동 과제(동성로 상권 조사)로 참여할 수 있고, 다음 학기에 우선 검토해요.</p></div>` : ''}
      ${k === 'run' ? `<div class="okpost"><p class="kick">한 학기 진행 중</p><ul><li>1~4주: 현장 파악 · 사장님 인터뷰</li><li>5~8주: 결과물 1차 → <b>8주 중간 점검</b>(지도교수 · 운영단)</li><li>9~14주: 실행 · 고치기${p.kind === 'open' ? ' — 사장님 「내 가게」에서 <b>근처 의견에 답 1~2개</b> 올리기(초안은 학생 팀, 올리기는 사장님) · 답한 메뉴 기록 양식' : ' — 개업하면 「내 가게」에서 근처 의견에 답 1~2개'}</li><li>15~16주: 인수인계 — <b>체크 4개</b>(학생과 첫 답 올림 · 기록 2주 [가정] · 사장님 혼자 답 1개 · 사용법 한 장, 사장님 「내 가게 → 학생 팀」과 같은 값) · 평가</li></ul>
        ${ownerStore ? `<p class="fine">이 가게 인수인계 체크 ${ownerStore.team.checks.filter(Boolean).length} / 4${ownerStore.team.handedAt ? ' · 끝남' : ''} · <button class="link" data-act="mystore">내 가게 함께 쓰기 →</button></p>` : ''}</div>` : ''}
      ${k === 'sent' ? `<p class="was">운영단(대구시 + 지역 대학)이 선발해요. 결과가 나오면 여기 진행 상태가 바뀌어요.</p>` : ''}
      ${k === 'met' ? `<p class="was">운영단이 가게마다 4인 팀과 지도교수를 짜는 중이에요.</p>` : ''}
      <div class="onav">${{ sent: ops ? `<button class="cta2" data-s="ops" data-v="drop">운영단 처리: 이번엔 아님</button><button class="cta" data-s="ops" data-v="pass">운영단 처리: 선발</button>` : '', pass: `<span></span><button class="cta" data-s="st" data-v="met">면담 완료</button>`, met: ops ? `<span></span><button class="cta" data-act="ops">운영단 표에서 팀 짜기 →</button>` : '', team: `<span></span><button class="cta" data-s="st" data-v="run">학기 시작</button>`, run: `<span></span><button class="cta" data-s="go5">학기 끝 → 경력 카드</button>`, drop: `<button class="cta2" data-s="reset">다른 과제 보기</button><span></span>` }[k] || ''}</div>
      </section>`;
  }

  function s5() {
    const s = S(), tp = teamPost(), p = tp || P(s.sel), r = (tp ? p.roles[slotOf()] : null) || P(s.sel).roles[s.role], pf = s.prof;
    return `<section class="ccard">
        <p class="ck">같이가게 · 동행 프로젝트 1기 · 직무 경력 카드</p>
        <h2>${esc(r.t)}</h2>
        <p class="cw">${esc(p.item)} @ ${esc(where(p))} · 한 학기 16주 · 4인 팀 + 지도교수</p>
        <dl><dt>이름</dt><dd>${esc(st.user ? st.user.name : '')} · ${esc(pf.school)} ${esc(pf.major)}</dd>
          <dt>맡은 일</dt><dd>${esc(r.t)} (${esc(r.major)})</dd>
          <dt>결과물</dt><dd>${esc(r.out)} — 사장님께 인수인계 완료</dd>
          <dt>사장님 평</dt><dd class="ph">학기 말 평가에서 사장님이 직접 씀</dd>
          <dt>지도교수 평</dt><dd class="ph">학기 말 평가에서 지도교수가 직접 씀</dd>
          <dt>학점</dt><dd>연계 교과 이수 (대학별 [가정])</dd>
          ${(() => { const MY = window.MYSTORE, so = p.uid && MY ? MY.storeOf(p.uid) : null; if (!so || !so.team.handedAt) return ''; const n = MY.myAnswers(so).filter(a => a.at > so.team.handedAt).length; return `<dt>남긴 것</dt><dd>인수인계 뒤 사장님이 혼자 올린 답 ${n}개 <small>(사장님 「내 가게」 기록)</small></dd>`; })()}</dl>
        <p class="fine">사장님 · 지도교수 학기 말 평가가 끝나면 발급돼요.</p>
      </section>
      <div class="onav"><button class="cta2" data-s="reset">다음 학기 과제 보기</button><button class="cta" data-act="owner">창업이 꿈이라면 → 예비 사장님으로</button></div>`;
  }

  function render() {
    const s = S();
    return `<div class="owrap"><div class="otop"><button class="back" data-s="map">← 지도로</button><p class="kick">대학생 · 동행 프로젝트</p>${stepper(s.step)}</div>
      ${[null, s1, s2, s3, s4, s5][s.step]()}<div class="oad">${A.adHTML('student', 'panel')}</div></div>`;
  }

  // ---------------- 동작 ----------------
  const W = document.getElementById('work');
  const mine = () => document.body.classList.contains('work-open') && W.querySelector('[data-s]');
  const err = m => { const e = document.getElementById('serr'); if (e) { e.textContent = m; e.hidden = false; } };
  function readForm() {
    const f = document.getElementById('sform'); if (!f) return;
    const d = new FormData(f), s = S();
    s.prof = { school: (d.get('school') || '').trim(), major: (d.get('major') || '').trim(), groups: d.getAll('groups'), time: d.getAll('time'), link: (d.get('link') || '').trim() };
    s.ans = [(d.get('a0') || '').trim(), (d.get('a1') || '').trim()]; save();
  }
  W.addEventListener('input', e => {
    if (!mine() || !e.target.closest('#sform')) return;
    const c = e.target.parentElement.querySelector('.cnt2'); if (c) c.textContent = `${e.target.value.length} / 400`;
    readForm(); const er = document.getElementById('serr'); if (er) er.hidden = true;
  });
  W.addEventListener('change', e => { if (mine() && e.target.closest('#sform') && (e.target.name === 'groups' || e.target.name === 'time')) { readForm(); fetchReco(); A.rerender(); } });
  W.addEventListener('click', e => {
    if (!mine()) return;
    const b = e.target.closest('[data-s]'); if (!b) return;
    const k = b.dataset.s, v = b.dataset.v, s = S();
    if (k === 'role') { return set({ role: +v }); }
    e.preventDefault();
    switch (k) {
      case 'map': return A.go('home');
      case 'filter': return set({ filter: v || null });
      case 's1g': { const pf = S().prof, i = pf.groups.indexOf(v); if (i >= 0) pf.groups.splice(i, 1); else pf.groups.push(v); return set({}); }
      case 's1reco': { const m = document.getElementById('s1major'); S().prof.major = m ? m.value.trim() : S().prof.major; save(); fetchReco(); return A.rerender(); }
      case 'open': return set({ sel: b.dataset.id, role: null, step: 2 });
      case 'go3': if (b.disabled) return; b.disabled = true; b.textContent = '질문 준비 중…'; S().qs = null; loadQuestions().then(() => { set({ step: 3 }); fetchReco(); }); return;
      case 'pickrec': readForm(); S().sel = b.dataset.id; S().role = +v; S().qs = null; b.textContent = '질문 준비 중…'; loadQuestions().then(() => set({ step: 3 })); return;
      case 'newq': readForm(); if (b.disabled) return; b.disabled = true; b.textContent = '새 질문 받는 중…'; S().qs = null; loadQuestions().then(() => A.rerender()); return;
      case 'step': if (s.step === 3) readForm(); return set({ step: +v });
      case 'st': return setStatus(v);
      case 'ops': { if (!myApp()) { setStatus(v); return; } window.OPS.decideStudent(myApp().id, v); return A.rerender(); }
      case 'go5': return set({ step: 5 });
      case 'reset': { const prof = s.prof; st.stu = Object.assign(blank(), { prof }); save(); return A.rerender(); }
    }
  });
  W.addEventListener('submit', e => {
    if (e.target.id !== 'sform') return;
    e.preventDefault(); readForm();
    const s = S(), pf = s.prof;
    if (!pf.school || !pf.major) return err('학교와 학과를 적어 주세요');
    if (!pf.groups.length) return err('관심 직무를 하나 이상 골라 주세요');
    if (!pf.time.length) return err('가능 시간을 하나 이상 골라 주세요');
    if (s.ans.some(a => a.length < 10)) return err('질문 두 개에 10자 이상씩 답해 주세요');
    A.needAuth(() => {
      if (A.addRole('student')) A.toast('대학생 역할을 더했어요');
      const s2 = S(), p = P(s2.sel), r = p.roles[s2.role], L = st.stuApps || (st.stuApps = []);
      const qd = s2.qs && s2.qs.key === s2.sel + ':' + s2.role ? s2.qs.q : AI.questions(p, r);
      const ap = { id: 'sa' + Date.now().toString(36), uid: st.user.id, name: st.user.name, prof: JSON.parse(JSON.stringify(s2.prof)), post: s2.sel, role: s2.role, roleT: r.t, item: p.item, qs: qd, ans: s2.ans.slice(), status: 'sent', at: Date.now() };
      L.push(ap); s2.appId = ap.id; s2.step = 4; s2.status = 'sent'; save(); A.rerender();
    });
  });

  window.STUDENT = {
    render,
    ensure: () => { S(); },
    startWith(patch) {   // 쓰던 지원서(2단계 이상 · 아직 안 냄)가 있으면 지우지 않고 과제 필터만 바꿈
      const cur = S(); if (cur && cur.step >= 2) { if (patch.filter !== undefined) cur.filter = patch.filter; save(); window.APP.toast('쓰던 지원서를 이어서 보여 드려요'); return false; }
      const prof = cur.prof; st.stu = Object.assign(blank(), { prof }, patch); save(); return true; },
    start(postId) { if (postId && P(postId)) { S().sel = postId; S().role = null; S().step = 2; save(); } },
  };
})();
