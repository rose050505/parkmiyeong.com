// 사장님 흐름 (청사진 §4-3): 상담 → 자리 분석 → 과제 정리 → 동행 프로젝트 지원서 → 진행 상태
// 「AI 초안」 칸은 지금 규칙으로 만든 시연판. 실시간 AI가 붙으면 AI.* 세 함수만 바꾼다.
(function () {
  const A = window.APP, { st, save, store, SP, M, SUP, esc, shortAddr } = A;
  const STEPS = ['상담', '자리 분석', '과제 정리', '지원서', '진행 상태'];
  const blank = () => ({ step: 1, status: null, known: null, item: '', space: null, near: null, trouble: null, story: '', problem: null, tasks: null, app: null, result: null });
  // st.owner = 지금 회원의 상담(app.js가 회원마다 나눠 둠). 없으면 새로
  const O = () => st.owner || (st.owner = blank());
  O().busy = null;
  // 늦게 온 AI 응답이 다른 화면(내 가게 등)을 다시 그리지 않게, 사장님 화면일 때만 다시 그림
  const set = patch => { Object.assign(O(), patch); save(); if (A.view().mode === 'owner') A.rerender(); };
  const startupRisks = new WeakMap();
  const startupRiskKey = o => o.status === 'pre' && SP[o.space] && o.item.trim()
    ? JSON.stringify([o.space, o.item.trim()]) : null;
  const currentStartupRisk = o => {
    const current = startupRisks.get(o);
    return current?.key === startupRiskKey(o) ? current : null;
  };

  function analyzeStartup(o) {
    const key = startupRiskKey(o);
    if (!key) return;
    const space = SP[o.space];
    const vacancy = window.BK?.spaces[o.space] || {};
    const body = JSON.stringify({ spaceId: o.space, businessIdea: o.item.trim(), latitude: space.y, longitude: space.x,
      depositKrw: vacancy.depositKrw, monthlyRentKrw: vacancy.monthlyRentKrw, areaM2: vacancy.areaM2 });
    const previous = startupRisks.get(o);
    if (previous?.body === body && !previous.error) return previous.result;
    const state = { key, body };
    startupRisks.set(o, state);
    const refresh = () => { if (st.owner === o && o.step === 2 && A.view().mode === 'owner') A.rerender(); };
    refresh();
    state.result = (async () => {
      try {
        const response = await fetch('/api/binkan-startup-risk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
          signal: AbortSignal.timeout(63000),
        });
        const report = await response.json();
        if (!response.ok) state.error = report.error || 'AI 분석을 불러오지 못했어요.';
        else state.report = report;
      } catch {
        state.error = 'AI 분석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
      }
      if (startupRisks.get(o) === state) refresh();
      return state.report;
    })();
    return state.result;
  }

  function showRisk(o, patch = {}) {
    set({ ...patch, step: 2, tasks: null });
    return analyzeStartup(o);
  }

  // ---------------- 계산 도구 ----------------
  const dist = A.dist;   // 위도 35.87° 기준 거리(m) — app.js와 같은 식
  const LM = Object.entries(M.lm).map(([name, [x, y]]) => ({ name, x, y }));
  const CAT = [
    ['예술·스포츠', /보드게임|노래|코인|pc|피시|당구|볼링|헬스|요가|필라테스|클라이밍|게임/i],
    ['교육', /학원|스터디|공부|독서실|과외|공방/],
    ['수리·개인', /미용|헤어|네일|사진|세탁|수선|피부|왁싱|타투/],
    ['소매', /옷|의류|소품|굿즈|잡화|꽃|문구|서점|반찬|편의점|안경|신발|가방|화장품|판매|과자|스낵|편집숍|마트|상회/],
    ['음식', /./],
  ];
  const bigCat = t => CAT.find(([, re]) => re.test(t))[0];
  const tokens = t => t.replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').split(/\s+/).map(w => w.replace(/(집|가게|전문점|매장)$/, '')).filter(w => w.length >= 2);
  // 흔한 말(카페 · 1인 · 전문 …)만 겹친 것은 같은 의견으로 보지 않는다(「디저트 카페」가 「보드게임 카페」에 붙던 문제). 흔한 말뿐이면 그대로 씀
  const COMMON = new Set(['카페', '1인', '전문', '가게', '맛집', '작은', '조용한', '동성로', '대구', '바', '샵', '숍', '하우스', '스토어', '느낌', '분위기', '가성비', '저렴한', '혼자']);
  const split = k => { for (const c of COMMON) if (k.length > c.length + 1 && k.endsWith(c)) return [k.slice(0, -c.length), c]; return [k]; };   // 「디저트카페」 → 디저트 + 카페
  const wishMatch = (item, w) => { const all = tokens(item).flatMap(split), tk = all.filter(k => !COMMON.has(k)), hay = (w.title + ' ' + w.why).replace(/\s+/g, ''); return (tk.length ? tk : all).some(k => hay.includes(k)); };
  function around(pt, cat) {
    const near = M.bg.filter(([x, y]) => dist({ x, y }, pt) <= 100);
    return { all: near.length, same: near.filter(b => b[2] === cat).length, vacant: M.spaces.filter(s => s !== pt && dist(s, pt) <= 100).length };
  }
  // 근처 의견: 150m 안(업종과 닿는 것 먼저 · 공감순). 150m 안에 없으면 max(300m) 안에서 가까운 3개(설계서 §2-①). 「내 가게」도 같은 계산을 씀
  function nearWishes(pt, item, max = 300) {
    const L = store.wishes().map(w => ({ w, m: dist(SP[w.space], pt), hit: !!item && wishMatch(item, w) }));
    const in150 = L.filter(x => x.m <= 150).sort((a, b) => (b.hit - a.hit) || (store.likes(b.w) - store.likes(a.w)));
    if (in150.length) return { list: in150, near: true };
    return { list: L.filter(x => x.m <= max).sort((a, b) => a.m - b.m).slice(0, 3), near: false };
  }
  const answeredBy = ws => window.MYSTORE ? new Set(ws.flatMap(w => window.MYSTORE.answersFor(w.id)).map(a => a.sid)).size : 0;
  const level = n => n >= 60 ? ['높음', 'hi'] : n >= 30 ? ['보통', 'mid'] : ['낮음', 'lo'];   // 기준 [가정]

  // ---------------- 「AI 초안」 시연판 ----------------
  const AI = {
    // 기존 사장님: 어려움 → 문제 한 줄 · 원인 후보 · 확인할 숫자
    problem(trouble, story, item) {
      const T = {
        '고객 관리': { one: '처음 온 손님이 다시 오지 않는다', why: ['다시 올 이유(적립 · 신메뉴 알림)가 없음', '첫 방문 경험(대기 · 응대)이 기억에 안 남음', '단골이 누구인지 기록이 없음'], check: ['한 달 재방문 손님 비율', '요일 · 시간대별 손님 수'] },
        '홍보': { one: '가게가 있는 걸 동성로 사람들이 모른다', why: ['지도 앱 · SNS 정보가 비어 있거나 오래됨', '간판 · 입구에서 무엇을 파는지 안 보임', '주변 가게와 다른 점이 말로 정리 안 됨'], check: ['지도 앱 조회 · 길찾기 수', '처음 온 손님이 어떻게 알고 왔는지'] },
        '매출': { one: '손님 수에 비해 매출이 오르지 않는다', why: ['잘 팔리는 메뉴와 남는 메뉴가 다름', '객단가를 올릴 세트 · 추가 메뉴가 없음', '한가한 시간대가 길다'], check: ['메뉴별 판매량 · 원가율', '시간대별 매출'] },
        '재고': { one: '재료가 남거나 모자라서 버리는 게 많다', why: ['발주를 감으로 함', '요일별 판매 차이를 반영 못 함', '유통기한 관리 기록이 없음'], check: ['주간 폐기량', '요일별 판매량'] },
        '기타': { one: '가게 운영에서 반복되는 어려움을 정리해야 한다', why: ['문제가 여러 개 섞여 있음', '기록이 없어 원인을 고르기 어려움', '도움받을 곳을 모름'], check: ['가장 자주 생기는 상황', '그때 잃는 시간 · 돈'] },
      }[trouble] || {};
      return { one: `${item ? item + ' — ' : ''}${T.one}`, why: T.why, check: T.check, from: story.slice(0, 60) };
    },
    // 과제 초안: 학생 팀이 할 일(전공 · 결과물 · 주) + 학생 몫이 아닌 일
    tasks(o) {
      const food = bigCat(o.item || '') === '음식', L = [];
      if (o.status === 'pre') {
        L.push({ t: '상권 · 고객 조사', major: '경영 · 통계', out: '타깃 고객 정의서 · 주변 경쟁 가게 표', wk: 3, on: true });
        if (food) L.push({ t: '메뉴 · 가격 설계', major: '식품영양 · 경영', out: '메뉴판 초안 · 원가표', wk: 4, on: true });
        L.push({ t: '브랜드 · 간판 · 메뉴판 디자인', major: '시각디자인', out: '로고 · 간판 시안 · 메뉴판', wk: 4, on: true });
        L.push({ t: '오픈 홍보 · 지도 앱 등록', major: '미디어 · 광고홍보', out: 'SNS 계정 · 오픈 콘텐츠 · 지도 등록', wk: 3, on: true });
        L.push({ t: '근처 의견으로 메뉴 실험', major: '식품영양 · 경영 · 미디어', out: '개업 뒤 근처 시민 의견에 답 1~2개 · 답한 메뉴 기록 양식', wk: 3, on: !food });
        L.push({ t: '매장 동선 · 공간 배치안', major: '실내건축', out: '배치 도면 2안', wk: 3, on: false });
      } else {
        const by = {
          '고객 관리': [['단골 관리 방식 설계', '경영', '적립 · 알림 방식 · 단골 기록표'], ['리뷰 · 방문 데이터 분석', '통계 · 데이터', '재방문 분석 보고서']],
          '홍보': [['SNS · 지도 앱 콘텐츠', '미디어 · 광고홍보', '한 학기 콘텐츠 · 운영 가이드'], ['입구 · 간판 개선안', '시각디자인', '간판 · 입간판 시안']],
          '매출': [['메뉴별 판매 분석', '통계 · 경영', '메뉴 정리안 · 세트 구성'], ['한가한 시간대 상품', '경영 · 마케팅', '시간대 상품 실험 결과']],
          '재고': [['재고 장부 · 발주표', '산업공학 · 경영', '요일별 발주표 · 폐기 기록'], ['판매 예측 표', '통계 · 컴퓨터', '다음 주 발주량 계산 표']],
          '기타': [['운영 문제 기록 · 정리', '경영', '문제 목록 · 우선순위']],
        }[o.trouble] || [];
        by.forEach(([t, major, out]) => L.push({ t, major, out, wk: 4, on: true }));
        L.push({ t: '근처 의견으로 메뉴 실험', major: '식품영양 · 경영 · 미디어', out: '근처 시민 의견에 답 1~2개 · 답한 메뉴 기록 양식', wk: 4, on: true });
        L.push({ t: '가게 소개 · 메뉴판 다시 만들기', major: '시각디자인', out: '메뉴판 · 소개 카드', wk: 3, on: false });
      }
      const expert = o.status === 'pre'
        ? ['임대차 계약 검토 → 법률 상담', '인테리어 시공 · 설비 → 시공 업체', '사업자 등록 · 세무 → 세무서 · 세무사', food ? '영업 신고 · 위생 교육 → 구청' : '업종별 신고 → 구청']
        : ['세무 · 노무 → 세무사 · 노무사', '시설 수리 · 공사 → 시공 업체'];
      return { list: L.map((x, i) => Object.assign({ id: 't' + i }, x)), expert };
    },
  };

  function tasksFromRisk(report) {
    if (!Array.isArray(report?.studentProjects) || report.analysisStatus === 'outside_coverage') return [];
    return report.studentProjects.flatMap(project => {
      if (!project?.task || !project.deliverable || !Array.isArray(project.suggested_majors) || !project.suggested_majors.length) return [];
      return [{ t: project.task, major: project.suggested_majors.join(' · '), out: project.deliverable, wk: null }];
    });
  }

  async function showStudentTasks(o) {
    if (o.busy) return;
    if (o.tasks) return set({ step: 3 });
    const status = o.status, key = startupRiskKey(o);
    const stillHere = () => st.owner === o && o.step === 2 && o.status === status && startupRiskKey(o) === key;
    set({ busy: 'tasks' });
    try {
      const report = await (currentStartupRisk(o)?.result ?? analyzeStartup(o));
      if (!stillHere()) return;
      const fallback = AI.tasks(o);
      const riskTasks = tasksFromRisk(report);
      let tasks;
      if (riskTasks.length) {
        tasks = { ai: false, fromRisk: true, expert: fallback.expert, list: riskTasks };
      } else {
        const input = { status: o.status, item: o.item, place: placeName(o), trouble: o.trouble || '', problem: o.problem ? o.problem.one : '', risks: riskList(o).map(strip) };
        try {
          const out = await window.ASSIST.call('tasks', input, 25000);
          tasks = { ai: true, expert: out.expert.length ? out.expert : fallback.expert, list: out.list };
        } catch {
          tasks = { ...fallback, ai: false };
        }
      }
      if (stillHere()) {
        tasks.list = tasks.list.map((task, i) => ({ id: 't' + i, on: i < 4, ...task }));
        set({ step: 3, tasks, busy: null });
      }
    } finally {
      if (o.busy === 'tasks') {
        if (st.owner === o) set({ busy: null });
        else o.busy = null;
      }
    }
  }

  // ---------------- 추천 (열 예정) ----------------
  function combos(o) {
    const W = store.wishes(), out = [];
    if (o.known === 'none') {
      const seen = new Set();
      W.sort((a, b) => store.likes(b) - store.likes(a)).forEach(w => { if (!seen.has(w.space) && out.length < 3) { seen.add(w.space); out.push({ space: w.space, item: w.title, why: [`의견 1위 · 공감 ${store.likes(w)}`, `직전: ${SP[w.space].was}`] }); } });
    } else if (o.known === 'item') {
      const cat = bigCat(o.item);
      M.spaces.map(s => {
        const ws = W.filter(w => w.space === s.id && wishMatch(o.item, w)), likes = ws.reduce((a, w) => a + store.likes(w), 0), ar = around(s, cat);
        return { s, ws, likes, ar, sc: (ws.length ? 10 : 0) + likes / 8 - ar.same / 15 };
      }).sort((a, b) => b.sc - a.sc).slice(0, 3).forEach(r => out.push({ space: r.s.id, item: o.item, why: [r.ws.length ? (r.ws.length > 1 ? `이 빈칸에 비슷한 의견 ${r.ws.length}개(「${r.ws[0].title}」 외) · 공감 합 ${r.likes}` : `이 빈칸에 비슷한 의견 「${r.ws[0].title}」 · 공감 ${r.likes}`) : '맞는 의견은 아직 없음', `100m 안 같은 업종대(${cat}) ${r.ar.same}곳`] }));
    } else if (o.known === 'place') {
      const s = SP[o.space], ws = W.filter(w => w.space === s.id).sort((a, b) => store.likes(b) - store.likes(a));
      ws.slice(0, 3).forEach(w => out.push({ space: s.id, item: w.title, why: [`이 빈칸 의견 · 공감 ${store.likes(w)}`, `100m 안 같은 업종대 ${around(s, bigCat(w.title)).same}곳`] }));
      if (out.length < 3) {
        const near = M.bg.filter(([x, y]) => dist({ x, y }, s) <= 100), c = {};
        ['교육', '예술·스포츠', '수리·개인', '소매'].forEach(k => c[k] = near.filter(b => b[2] === k).length);
        const ex = { '교육': '스터디카페 · 공방', '예술·스포츠': '보드게임 카페 · 연습실', '수리·개인': '셀프 사진관 · 네일', '소매': '소품샵 · 편집숍' };
        const usedCat = new Set(out.map(x => bigCat(x.item)));
        Object.entries(c).filter(([k]) => !usedCat.has(k)).sort((a, b) => a[1] - b[1]).slice(0, 3 - out.length).forEach(([k, n]) => out.push({ space: s.id, item: ex[k], why: [`100m 안 ${k} ${n}곳 — 주변에 적은 업종대`, '시민 의견은 아직 없음'] }));
      }
    }
    return out;
  }

  // ---------------- 화면 조각 ----------------
  const stepper = n => `<ol class="ostep">${STEPS.map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}"><span>${i + 1}</span>${t}</li>`).join('')}</ol>`;
  const aiTag = ai => ai ? '<span class="tag ai" title="Claude가 이 내용을 보고 만들었어요">AI 초안</span>' : '<span class="tag" title="AI 연결이 안 돼 정해 둔 규칙으로 만들었어요">기본 정리</span>';
  const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const placeName = o => o.space ? shortAddr(SP[o.space]) : o.near ? o.near + ' 근처' : '';
  const ptOf = o => o.space ? SP[o.space] : LM.find(l => l.name === o.near) || LM[0];

  function s1() {
    const o = O();
    let h = `<section class="oq"><h3>지금 어떤 상황이세요?</h3><div class="obig">
      <button class="opick${o.status === 'pre' ? ' on' : ''}" data-o="status" data-v="pre"><b>가게를 열 예정이에요</b><small>아이템 · 자리 고르기부터</small></button>
      <button class="opick${o.status === 'open' ? ' on' : ''}" data-o="status" data-v="open"><b>가게를 하고 있어요</b><small>경영 고민 정리부터</small></button></div></section>`;
    if (o.status === 'pre') {
      h += `<section class="oq"><h3>정해 둔 것이 있나요?</h3><div class="ochips">${[['both', '아이템 · 자리 둘 다'], ['item', '아이템만'], ['place', '자리만'], ['none', '아직 없음']].map(([v, t]) => `<button class="${o.known === v ? 'on' : ''}" data-o="known" data-v="${v}">${t}</button>`).join('')}</div>`;
      if (o.known === 'both' || o.known === 'item') h += `<label class="ofl">어떤 가게인가요?<input data-o-in="item" value="${esc(o.item)}" placeholder="예: 파스타집, 스터디카페, 소품샵" maxlength="30"></label>`;
      if (o.known === 'both' || o.known === 'place') h += `<label class="ofl">어느 빈칸인가요?<select data-o-in="space"><option value="">빈칸 고르기 (의견 많은 순)</option>${M.spaces.slice().sort((a, b) => store.bySpace(b.id).length - store.bySpace(a.id).length).map(s => `<option value="${s.id}"${o.space === s.id ? ' selected' : ''}>${esc(shortAddr(s))} — 직전 ${esc(s.was)}${store.bySpace(s.id).length ? ` · 의견 ${store.bySpace(s.id).length}` : ''}</option>`).join('')}</select></label>`;
      const ready = o.known && (o.known === 'none' || (o.known === 'item' && o.item.trim()) || (o.known === 'place' && o.space) || (o.known === 'both' && o.item.trim() && o.space));
      h += `<p class="err" id="oerr" hidden></p>`;
      if (o.known === 'both') h += `<button class="cta" data-o="go2"${ready ? '' : ' disabled'}>이 자리의 위험과 근거 보기 →</button>`;
      else if (o.known) h += `<button class="cta" data-o="reco"${ready ? '' : ' disabled'}>${o.known === 'item' ? '맞는 빈칸 추천 받기' : o.known === 'place' ? '이 빈칸에 맞는 업종 보기' : '의견 많은 빈칸 × 업종 조합 보기'}</button>`;
      if (o.reco) h += `<section class="oq"><h3>추천 <small>시민 의견 · 주변 업소 계산</small></h3>${o.reco.map((c, i) => `<div class="combo"><div><b>${esc(c.item)}</b> <span class="at">@ ${esc(shortAddr(SP[c.space]))}</span><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div><button class="cta2" data-o="pick" data-i="${i}">이 조합으로 →</button></div>`).join('') || '<p class="emptyw">조건에 맞는 추천이 없어요.</p>'}</section>`;
      h += `</section>`;
    }
    if (o.status === 'open') {
      h += `<section class="oq"><h3>가게 정보</h3><div class="orow">
        <label class="ofl">업종<input data-o-in="item" value="${esc(o.item)}" placeholder="예: 덮밥집" maxlength="30"></label>
        <label class="ofl">가게 위치<select data-o-in="near"><option value="">가게 위치 고르기</option>${LM.map(l => `<option${o.near === l.name ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></div></section>
        <section class="oq"><h3>어떤 어려움이 있나요?</h3><div class="ochips">${['고객 관리', '홍보', '매출', '재고', '기타'].map(v => `<button class="${o.trouble === v ? 'on' : ''}" data-o="trouble" data-v="${v}">${v}</button>`).join('')}</div>
        <label class="ofl">상황을 편하게 적어 주세요<textarea data-o-in="story" rows="3" maxlength="300" placeholder="예: 처음 온 손님은 많은데 다시 오는 손님이 적어요">${esc(o.story)}</textarea></label>
        <p class="err" id="oerr" hidden></p>
        <button class="cta" data-o="problem"${o.trouble && o.item.trim() && o.near && !o.busy ? '' : ' disabled'}>${o.busy === 'problem' ? 'AI가 정리하는 중…' : 'AI와 문제 정리하기'}</button></section>`;
      if (o.problem) h += `<section class="oq aiout"><h3>정리한 문제 ${aiTag(o.problem.ai)}</h3>
        <label class="ofl">문제 한 줄 <small>(고쳐도 돼요)</small><input data-o-in="problem.one" value="${esc(o.problem.one)}"></label>
        <div class="two"><div><b>원인 후보</b><ul>${o.problem.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div><div><b>먼저 확인할 숫자</b><ul>${o.problem.check.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div></div>
        <button class="cta" data-o="go2">이대로 확인 → 가게 분석</button></section>`;
    }
    return h;
  }

  // 위험과 근거 줄들 (자리 분석 · 챗봇이 같이 씀). o = { status, item, space, near }
  function riskList(o) {
    const pt = ptOf(o), cat = bigCat(o.item), ar = around(pt, cat), [lv, lc] = level(ar.same);
    const sp = o.space && SP[o.space], ws = sp ? store.bySpace(sp.id) : [], match = ws.filter(w => wishMatch(o.item, w));
    const risk = [];
    risk.push(`<li class="${lc}"><b>같은 업종대 경쟁 ${lv}</b> 100m 안 ${cat} ${ar.same}곳 (전체 ${ar.all}곳)</li>`);
    if (sp && sp.wasL === cat) risk.push(`<li class="mid"><b>같은 업종대가 나간 자리</b> 직전 ${esc(sp.was)} — 나간 이유(임대료 · 위치 · 운영) 확인</li>`);
    if (sp) risk.push(`<li class="${ar.vacant >= 4 ? 'mid' : 'lo'}"><b>주변 빈칸 ${ar.vacant}곳</b> ${ar.vacant >= 4 ? '골목 전체가 비고 있을 수 있음 — 현장 확인' : '이번 분기 새로 빈 1층 후보 기준(오래된 공실 · 위층은 안 셈) — 현장 확인'}</li>`);
    if (!sp) {
      const nb = nearWishes(pt, o.item), mine = nb.list.filter(x => x.hit);
      risk.push(`<li class="${ar.vacant >= 4 ? 'mid' : 'lo'}"><b>주변 빈칸 ${ar.vacant}곳</b> ${ar.vacant >= 4 ? '골목 공실이 늘고 있을 수 있음' : '이번 분기 새로 빈 1층 후보 기준(오래된 공실 · 위층은 안 셈)'}</li>`);
      risk.push(nb.near
        ? `<li class="lo"><b>가게 근처(150m) 의견 ${nb.list.length}개</b> ${nb.list.slice(0, 3).map(x => `「${esc(x.w.title)}」 ♥${store.likes(x.w)}`).join(' · ')}${mine.length ? ` — 우리 업종과 닿는 의견 ${mine.length}개` : ''}</li>`
        : `<li class="lo"><b>가게 150m 안 의견 없음</b> ${nb.list.length ? '300m 안 가까운 의견: ' + nb.list.map(x => `「${esc(x.w.title)}」 약 ${Math.round(x.m / 10) * 10}m`).join(' · ') : '300m 안에도 아직 없음'}</li>`);
    }
    if (sp) risk.push(`<li class="${match.length ? 'lo' : 'mid'}"><b>의견 ${match.length ? '일치' : '없음'}</b> ${match.length ? match.map(w => `「${esc(w.title)}」 공감 ${store.likes(w)}`).join(' · ') : '이 업종을 바라는 의견은 아직 없음'}</li>`);
    const nA = sp ? answeredBy(ws) : 0;
    if (nA) risk.push(`<li class="lo"><b>근처 가게 ${nA}곳이 이 빈칸 의견에 일부 답함</b> 의견은 그대로 열려 있음 — 같은 의견을 노린다면 그 가게 메뉴도 확인</li>`);
    return risk;
  }
  // 가게 분석의 「근처 의견에 답하기」 줄 — riskList 밖에 둔다(riskList 글은 AI tasks 입력으로 감)
  function ansRow(o) {
    if (o.status !== 'open' || !o.near) return '';
    const nb = nearWishes(ptOf(o), o.item);
    return `<div class="nearans"><b>근처 의견에 답하기</b> <small>${nb.near ? '가게 150m 안' : '150m 안에 없어 300m 안 가까운 순'}</small>
      ${nb.list.slice(0, 3).map(x => `<div class="narow"><span>「${esc(x.w.title)}」 <small>♥${store.likes(x.w)} · 약 ${Math.max(10, Math.round(x.m / 10) * 10)}m</small></span><button class="cta2 sm" data-o="answer" data-w="${esc(x.w.id)}">이 의견에 답하기</button></div>`).join('') || '<p class="fine">300m 안에도 아직 의견이 없어요.</p>'}</div>`;
  }
  function ansBand(o) {
    if (o.status !== 'open' || !o.near || !['홍보', '고객 관리', '매출'].includes(o.trouble)) return '';
    const n = nearWishes(ptOf(o), o.item).list.length; if (!n) return '';
    return `<div class="mband"><div><b>근처 의견 ${n}개 — 답해 보기</b><small>아직 손님이 아닌 근처 사람들이 바라는 것에 「우리 가게에서 해 볼게요」라고 답하면, 그 의견을 남기고 공감한 사람에게 알림이 가요. 지원서를 내기 전에도, 선정되지 않아도 쓸 수 있어요.</small></div><button class="cta" data-o="mystore">내 가게에서 답해 보기 →</button></div>`;
  }
  function riskPanel(o, risk) {
    const baseline = `<ul class="risk">${risk.join('')}</ul><p class="fine">소진공 상가정보 ${esc(M.meta.q_now)} 기준. 높음 · 보통 · 낮음 기준(60 · 30곳)은 [가정].</p>`;
    const key = startupRiskKey(o);
    if (!key) return `<h3>위험과 근거 <span class="tag calc">계산</span></h3>${baseline}`;
    const state = currentStartupRisk(o);
    const title = '<h3>위험과 근거</h3>';
    const retry = state?.error ? 'AI 분석 다시 시도' : 'AI 분석 보기';
    const local = `<h4>기존 100m 상권 현황</h4>${baseline}`;
    if (!state || state.error) return `${title}${state?.error ? `<p role="status">${esc(state.error)}</p>` : ''}<button class="cta2" data-o="retry-risk">${retry}</button>${local}`;
    if (!state.report) return `${title}<p role="status">AI가 주변 상권과 창업 아이템을 비교하고 있어요…</p>${local}`;

    const { analysisStatus, summary, comparison, findings, model } = state.report;
    if (analysisStatus === 'outside_coverage') return `${title}<p role="status">${esc(summary)}</p>${local}`;
    const peers = comparison ? `<p class="fine">반경 ${esc(comparison.radius)}m · 주변 점포 ${esc(comparison.nearby)}곳${comparison.industry ? ` · 동일 업종(${esc(comparison.industry)}) ${esc(comparison.same)}곳` : ''}${comparison.observedOn ? ` · ${esc(comparison.observedOn)} 기준` : ''}</p>` : '';
    let modelInfo = '';
    if (model?.status === 'estimated' && Number.isFinite(model.closureProbability)) {
      modelInfo = `<p class="fine">학습 모델 · ${esc(model.horizonDays)}일 이내 폐업 위험 추정치 ${(model.closureProbability * 100).toFixed(1)}%</p>`;
    } else if (model?.status === 'unavailable' && model.reason) {
      modelInfo = `<p class="fine">학습 모델 추정 보류 · ${esc(model.reason)}</p>`;
    }
    const checks = findings.map(f => `<li class="${f.status === 'high' ? 'hi' : f.status === 'clear' ? 'lo' : 'mid'}"><b>${esc(f.label)}${f.status_label ? ` · ${esc(f.status_label)}` : ''}</b>${esc(f.evidence)}${f.action ? `<div>할 일 · ${esc(f.action)}</div>` : ''}</li>`).join('');
    return `${title}<p role="status"><b>${esc(summary)}</b></p>${peers}${modelInfo}<ul class="risk">${checks}</ul>
      <details><summary>기존 100m 상권 현황</summary>${baseline}</details>`;
  }

  function s2() {
    const o = O(), risk = riskList(o), who = o.status === 'pre' ? 'pre' : 'open';
    const sup = SUP.list.map(x => { const ok = x.who.includes(who); return `<a class="sup${ok ? '' : ' no'}" href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.name)}</b>${x.closed ? ' <em>마감</em>' : ''}<small>${esc(x.org)} · ${esc(x.what)}</small><small>${ok ? '대상: ' + esc(x.target) : '해당 안 됨: ' + esc((x.whyNot || {})[who] || '대상이 다름')}</small></a>`; }).join('');
    return `<section class="ocard">
        <div class="ohead"><p class="kick">${o.status === 'pre' ? '자리 분석' : '가게 분석'}</p><h2>${esc(o.item)} <small>@ ${esc(placeName(o))}</small></h2></div>
        ${o.problem ? `<p class="oprob"><b>정리한 문제</b> ${esc(o.problem.one)}</p>` : ''}
        <div class="ogrid">
          <div>${riskPanel(o, risk)}${ansRow(o)}</div>
          <div><h3>받을 수 있는 지원</h3>${sup}<p class="fine">${esc(SUP.checked)} 공고 · 보도로 확인. 최종 자격은 공고 기관이 판단해요.</p></div>
        </div>
      </section>${ansBand(o)}
      <div class="onav"><button class="cta2" data-o="step" data-v="1">← 상담으로</button><button class="cta" data-o="go3"${o.busy ? ' disabled' : ''}>${o.busy === 'tasks' ? 'AI가 과제를 짜는 중…' : '학생 팀과 할 과제 정리 →'}</button></div>`;
  }

  function s3() {
    const o = O(), T = o.tasks, n = T.list.filter(t => t.on).length;
    const tag = T.fromRisk ? '<span class="tag ai">상권 분석</span>' : aiTag(T.ai);
    return `<section class="ocard"><div class="ohead"><p class="kick">과제 정리</p><h2>대학생 4인 팀과 한 학기 동안 할 일 ${tag}</h2><p class="was">${esc(o.item)} @ ${esc(placeName(o))} · 고른 과제 <b>${n}</b>개 (1~4개)</p></div>
      <div class="tasks">${T.list.map(t => `<label class="task${t.on ? ' on' : ''}"><input type="checkbox" data-o="task" data-id="${t.id}"${t.on ? ' checked' : ''}><div><b>${esc(t.t)}</b><small>필요한 전공: ${esc(t.major)}${t.wk ? ` · ${esc(t.wk)}주` : ''}</small><small>결과물: ${esc(t.out)}</small></div></label>`).join('')}</div>
      <div class="expert"><b>학생 팀이 할 일이 아니에요 → 전문가 · 기관으로</b><ul>${T.expert.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <p class="err" id="oerr" hidden></p></section>
      <div class="onav"><button class="cta2" data-o="step" data-v="2">← 분석으로</button><button class="cta" data-o="go4"${n >= 1 && n <= 4 ? '' : ' disabled'}>동행 프로젝트 지원서 →</button></div>`;
  }

  function s4() {
    const o = O(), a = o.app || {}, n = o.tasks.list.filter(t => t.on);
    const uses = ['인테리어 · 설비', '첫 재료 · 재고', '홍보', '학생 팀 활동비'];
    return `<section class="ocard"><div class="ohead"><p class="kick">동행 프로젝트 1기 · 사장님 지원서 <span class="tag">시범 사업</span></p><h2>${esc(o.item)} @ ${esc(placeName(o))}</h2></div>
      <div class="sum"><div><b>상황</b>${o.status === 'pre' ? '가게를 열 예정' : '가게를 하고 있음'}</div><div><b>과제</b>${n.map(t => esc(t.t)).join(' · ')}</div>${o.problem ? `<div><b>문제</b>${esc(o.problem.one)}</div>` : ''}</div>
      <form id="oform" novalidate>
        <label class="ofl">${o.status === 'pre' ? '개업 예정 시기' : '가게를 연 지'}<select name="when">${(o.status === 'pre' ? ['3개월 안', '6개월 안', '1년 안'] : ['1년 미만', '1~3년', '3년 이상']).map(v => `<option${a.when === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        <fieldset class="ofs"><legend>시범 지원금을 쓰고 싶은 곳 <small>(여러 개)</small></legend><div class="ochips">${uses.map(u => `<label><input type="checkbox" name="use" value="${u}"${(a.use || []).includes(u) ? ' checked' : ''}><span>${u}</span></label>`).join('')}</div></fieldset>
        <label class="ofl">학생 팀에게 한마디<textarea name="msg" rows="2" maxlength="200" placeholder="예: 동성로에 학생들이 편하게 오는 가게를 같이 만들고 싶어요">${esc(a.msg || '')}</textarea></label>
        <label class="agree"><input type="checkbox" name="track"${a.track ? ' checked' : ''}> 개업 뒤 6 · 12개월 [가정] 영업 여부와 매출 범위를 운영단과 공유해요 <small>(효과 비교에 씀 · 필수)</small></label>
        <label class="agree"><input type="checkbox" name="handover"${a.handover ? ' checked' : ''}> 학생 팀 결과물(원본 파일 · 사용법)을 인수인계 받아 계속 써요 <small>(필수)</small></label>
        <p class="err" id="oerr" hidden></p>
        <div class="onav"><button type="button" class="cta2" data-o="step" data-v="3">← 과제로</button><button class="cta" type="submit">지원서 제출</button></div>
      </form></section>`;
  }

  function s5() {
    const o = O(), ap = (st.ownerApps || []).find(a => a.id === o.appId), r = ap ? ap.result : o.result, n = o.tasks.list.filter(t => t.on);
    const tl = [['접수', true], ['운영단 심사 (시 + 지역 대학)', !!r], [r === 'no' ? '다음 기회' : '선정 → 학생 모집', r === 'yes'], ['팀 구성 · 한 학기', false]];
    return `<section class="ocard"><div class="ohead"><p class="kick">진행 상태</p><h2>${esc(o.item)} @ ${esc(placeName(o))}</h2></div>
      <ol class="tl">${tl.map(([t, d], i) => `<li class="${d ? 'done' : i === tl.findIndex(x => !x[1]) ? 'now' : ''}">${esc(t)}</li>`).join('')}</ol>
      ${!r ? `<p class="was">지원서가 접수됐어요. 운영단(대구시 + 지역 대학)이 준비 정도 · 이 자리 시민 의견 수(공감 포함) · 과제 적합성을 봐요.</p>${A.hasRole('ops') ? `<div class="onav"><button class="cta2" data-o="opsres" data-v="no">운영단 처리: 다음 기회</button><button class="cta2" data-o="opsgo">운영단 표에서 점수 매기기</button><button class="cta" data-o="opsres" data-v="yes">운영단 처리: 선정</button></div>` : '<p class="fine">운영단 심사 중이에요 — 운영단 표에서 처리되면 여기 진행 상태가 바뀌어요.</p>'}` : ''}
      ${r === 'yes' ? `<div class="okpost"><p class="kick">선정! 학생 모집 공고가 올라갔어요</p><h3>[동행 프로젝트 1기] ${esc(o.item)} @ ${esc(placeName(o))}</h3>
        <ul>${n.map(t => `<li><b>${esc(t.t)}</b> — ${esc(t.major)}${t.wk ? ` · ${esc(t.wk)}주` : ''} · ${esc(t.out)}</li>`).join('')}</ul>
        <p class="fine">대학생 입구 「과제 둘러보기」에 뜨고, 관심 직무가 맞는 학생에게 알림이 가요 [제안]. 선발은 운영단 → 사장님 면담 순서예요.</p>
        <p class="note2">「내 가게」에서 근처 의견에 답하고, 답한 메뉴를 기록해요. 학기 중엔 학생 팀이 같이 쓰고, 학기가 끝나면 사장님 혼자 다음 의견에 답해요. 이 기록이 개업 뒤 추적 자료도 돼요. <button class="link" data-o="mystore">내 가게 →</button></p></div>` : ''}
      ${r === 'no' ? `<div class="okpost no"><p class="kick">이번 기수에는 선정되지 않았어요</p><p>다음 기수에 우선 검토해요. 그 사이 받을 수 있는 지원을 확인해 보세요. 같은 시기에 신청했지만 선정되지 않은 가게도 같은 기록으로 함께 살펴봐요(동의한 경우). 「내 가게」(근처 의견에 답하기 · 상권 변화)는 똑같이 쓸 수 있어요. <button class="link" data-o="mystore">내 가게 →</button></p></div>` : ''}
      </section>
      <div class="onav"><button class="cta2" data-o="reset">새 상담 시작</button><button class="cta2" data-o="map">지도로</button></div>`;
  }

  function render() {
    const o = O();
    const body = [null, s1, s2, s3, s4, s5][o.step]();
    // 이미 낸 지원서(지금 상담과 다른 것): 새 상담을 열어도 결과를 볼 수 있게
    const mine = (st.ownerApps || []).filter(a => st.user && a.uid === st.user.id && a.id !== o.appId);
    const apps = mine.length ? `<div class="mban">이미 낸 지원서 ${mine.map(a => `<b>${esc(a.item)} @ ${esc(a.place)}</b> — ${a.result === 'yes' ? '선정 · 학생 모집' : a.result === 'no' ? '이번엔 선정 안 됨' : '운영단 심사 중'}`).join(' · ')}</div>` : '';
    return `<div class="owrap"><div class="otop"><button class="back" data-o="map">← 지도로</button><p class="kick">사장님 · 창업 · 경영 상담</p>${stepper(o.step)}</div>${apps}${body}
      <div class="oad">${A.adHTML('owner', 'panel')}</div></div>`;
  }

  // ---------------- 동작 ----------------
  const err = m => { const e = document.getElementById('oerr'); if (e) { e.textContent = m; e.hidden = false; } };
  const W = document.getElementById('work');
  W.addEventListener('input', e => {
    const k = e.target.dataset.oIn; if (!k) return;
    if (k === 'problem.one') { O().problem.one = e.target.value; save(); return; }
    O()[k] = e.target.value; if (k !== 'story') O().reco = null; save();
    // 입력 중 다시 그리면 커서가 사라지므로, 버튼 상태만 갱신
    const o = O(), b = W.querySelector('[data-o="go2"],[data-o="reco"],[data-o="problem"]');
    if (b) b.disabled = !(o.status === 'open' ? o.trouble && o.item.trim() && o.near : (o.known === 'none' || (o.known === 'item' && o.item.trim()) || (o.known === 'place' && o.space) || (o.known === 'both' && o.item.trim() && o.space)));
    if (e.target.tagName === 'SELECT') A.rerender();
  });
  W.addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    const k = b.dataset.o, v = b.dataset.v, o = O();
    if (k === 'task') { const t = o.tasks.list.find(x => x.id === b.dataset.id); t.on = b.checked; save(); A.rerender(); return; }
    e.preventDefault();
    switch (k) {
      case 'map': return A.go(o.space ? 'space' : 'home', o.space ? { space: o.space } : {});
      case 'status': return set({ status: v, space: v === 'open' ? null : o.space, known: v === 'pre' ? (o.space ? 'place' : null) : null, reco: null, problem: null, near: o.near || null });
      case 'known': return set({ known: v, reco: null });
      case 'trouble': return set({ trouble: v, problem: null });
      case 'reco': return set({ reco: combos(o) });
      case 'pick': { const c = o.reco[+b.dataset.i]; return showRisk(o, { space: c.space, item: c.item }); }
      case 'problem': {
        if (o.busy) return;
        if (!o.story.trim()) o.story = `${o.trouble} 때문에 고민이에요`;
        set({ busy: 'problem' });
        window.ASSIST.call('problem', { item: o.item.trim(), trouble: o.trouble, story: o.story })
          .then(out => { set({ busy: null, problem: Object.assign(out, { ai: true }) }); setTimeout(() => { const el = W.querySelector('.oprob'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); })
          .catch(() => { set({ busy: null, problem: Object.assign(AI.problem(o.trouble, o.story, o.item.trim()), { ai: false }) }); setTimeout(() => { const el = W.querySelector('.oprob'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); });
        return;
      }
      case 'go2':
        if (!o.item.trim()) return err('업종을 적어 주세요');
        if (o.status === 'open' && !o.near) return err('가게 위치를 골라 주세요');
        if (o.status === 'pre' && !SP[o.space]) return err('빈칸을 골라 주세요');
        return showRisk(o);
      case 'retry-risk': return analyzeStartup(o);
      case 'answer': return A.needAuth(() => { window.MYSTORE.start({ wish: b.dataset.w }); A.go('mystore'); });
      case 'mystore': return A.needAuth(() => { window.MYSTORE.start(); A.go('mystore'); });
      case 'opsres': { const ap = window.OPS && window.OPS.decideOwner(o.appId, v); if (!ap) A.toast('운영단 표에서 처리해 주세요'); return A.rerender(); }
      case 'opsgo': return A.go('ops');
      case 'go3': return showStudentTasks(o);
      case 'go4': return set({ step: 4 });
      case 'step': return set({ step: +v });
      case 'result': return set({ result: v });
      case 'reset': st.owner = blank(); save(); return A.rerender();
    }
  });
  W.addEventListener('submit', e => {
    if (e.target.id !== 'oform') return;
    e.preventDefault();
    const f = new FormData(e.target), app = { when: f.get('when'), use: f.getAll('use'), msg: (f.get('msg') || '').trim(), track: !!f.get('track'), handover: !!f.get('handover') };
    O().app = app; save();
    if (!app.use.length) return err('지원금을 쓰고 싶은 곳을 하나 이상 골라 주세요');
    if (!app.track || !app.handover) return err('두 가지 동의가 있어야 지원할 수 있어요');
    A.needAuth(() => {
      const role = O().status === 'pre' ? 'pre' : 'open';
      if (A.addRole(role)) A.toast(`${A.roleName(role)} 역할을 더했어요`);
      // 지원서마다 보관(운영단 표가 심사 · 추적에 씀). 같은 상담에서 다시 내면 고침
      const o = O(), L = st.ownerApps || (st.ownerApps = []);
      const ap = Object.assign(L.find(a => a.id === o.appId && !a.result) || { id: 'oa' + Date.now().toString(36), result: null, score: null }, {
        uid: st.user.id, name: st.user.name, status: o.status, item: o.item, space: o.space, near: o.near, place: placeName(o), trouble: o.trouble || '', problem: o.problem ? o.problem.one : '',
        tasks: o.tasks.list.filter(t => t.on).map(t => ({ t: t.t, major: t.major, out: t.out, wk: t.wk })), when: app.when, use: app.use, msg: app.msg, track: app.track, handover: app.handover, at: Date.now() });
      if (!L.includes(ap)) L.push(ap);
      o.appId = ap.id; o.step = 5; o.result = null; o.submittedAt = Date.now(); save(); A.rerender();
    });
  });

  window.OWNER = {
    render,
    ensure: () => { O(); },
    // 빈칸에서 들어오면 그 자리를 고른 채로 시작. 진행 중인 상담이 있으면 이어서.
    // 챗봇이 대화로 채워서 시작: patch = { status, trouble, story, item, known }
    startWith(patch) {   // 하던 상담(2단계 이상 · 지원서 전)이 있으면 지우지 않고 이어서 보여 줌
      const cur = st.owner; if (cur && (cur.step || 1) >= 2 && !confirm(`하던 상담${cur.item ? `(「${cur.item}」)` : ''}이 있어요. 새 상담으로 시작할까요?\n(취소하면 하던 상담을 이어서 봐요)`)) { window.APP.toast('하던 상담을 이어서 보여 드려요'); return false; }
      st.owner = Object.assign(blank(), patch); save(); return true; },
    tools: { combos, riskList, bigCat, wishMatch, nearWishes, aiTag, tokens },
    start(spaceId) {
      // 빈칸에서 들어왔는데 지금 상담이 다른 자리 것이면 새로 시작(같은 자리면 이어서)
      if (spaceId && O().space !== spaceId) {
        if ((O().step || 1) >= 2 && !confirm(`하던 상담${O().item ? `(「${O().item}」)` : ''}이 있어요. 이 자리로 새 상담을 시작할까요?\n(취소하면 하던 상담을 이어서 봐요)`)) return;
        st.owner = Object.assign(blank(), { status: 'pre', known: 'place', space: spaceId }); save();
      }
    },
  };
})();
