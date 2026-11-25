// 사장님 흐름 (청사진 §4-3): 상담 → 창업 카드 → 과제 정리 → 동행 프로젝트 지원서 → 진행 상태
// 「AI 초안」 칸은 지금 규칙으로 만든 시연판. 실시간 AI가 붙으면 AI.* 세 함수만 바꾼다.
(function () {
  const A = window.APP, { st, save, store, SP, M, SUP, esc, shortAddr } = A;
  const STEPS = ['상담', '창업 카드', '과제 정리', '지원서', '진행 상태'];
  const blank = () => ({ step: 1, status: null, known: null, item: '', space: null, near: null, trouble: null, story: '', problem: null, tasks: null, app: null, result: null });
  if (!st.owner) st.owner = blank();
  const O = () => st.owner;
  const set = patch => { Object.assign(st.owner, patch); save(); A.rerender(); };

  // ---------------- 계산 도구 ----------------
  const KX = 88200, KY = 111000;   // 위도 35.87 부근 1도 ≈ 88.2km(경도) · 111km(위도)
  const dist = (a, b) => Math.hypot((a.x - b.x) * KX, (a.y - b.y) * KY);
  const LM = Object.entries(M.lm).map(([name, [x, y]]) => ({ name, x, y }));
  const CAT = [
    ['예술·스포츠', /보드게임|노래|코인|pc|피시|당구|볼링|헬스|요가|필라테스|클라이밍|게임/i],
    ['교육', /학원|스터디|공부|독서실|과외|공방/],
    ['수리·개인', /미용|헤어|네일|사진|세탁|수선|피부|왁싱|타투/],
    ['소매', /옷|의류|소품|굿즈|잡화|꽃|문구|서점|반찬|편의점|안경|신발|가방|화장품/],
    ['음식', /./],
  ];
  const bigCat = t => CAT.find(([, re]) => re.test(t))[0];
  const tokens = t => t.replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').split(/\s+/).map(w => w.replace(/(집|가게|전문점|매장)$/, '')).filter(w => w.length >= 2);
  const wishMatch = (item, w) => { const tk = tokens(item); return tk.some(k => w.title.includes(k) || w.why.includes(k)); };
  function around(pt, cat) {
    const near = M.bg.filter(([x, y]) => dist({ x, y }, pt) <= 100);
    return { all: near.length, same: near.filter(b => b[2] === cat).length, vacant: M.spaces.filter(s => s !== pt && dist(s, pt) <= 100).length };
  }
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
        L.push({ t: '매출 · 재고 장부 만들기', major: '회계 · 컴퓨터', out: '사장님이 계속 쓸 장부(경영 도우미 첫 설정)', wk: 3, on: !food });
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
        L.push({ t: '매출 · 손님 기록 정리', major: '회계 · 컴퓨터', out: '사장님이 계속 쓸 장부(경영 도우미 첫 설정)', wk: 3, on: true });
        L.push({ t: '가게 소개 · 메뉴판 다시 만들기', major: '시각디자인', out: '메뉴판 · 소개 카드', wk: 3, on: false });
      }
      const expert = o.status === 'pre'
        ? ['임대차 계약 검토 → 법률 상담', '인테리어 시공 · 설비 → 시공 업체', '사업자 등록 · 세무 → 세무서 · 세무사', food ? '영업 신고 · 위생 교육 → 구청' : '업종별 신고 → 구청']
        : ['세무 · 노무 → 세무사 · 노무사', '시설 수리 · 공사 → 시공 업체'];
      return { list: L.map((x, i) => Object.assign({ id: 't' + i }, x)), expert };
    },
  };

  // ---------------- 추천 (열 예정) ----------------
  function combos(o) {
    const W = store.wishes(), out = [];
    if (o.known === 'none') {
      const seen = new Set();
      W.sort((a, b) => store.likes(b) - store.likes(a)).forEach(w => { if (!seen.has(w.space) && out.length < 3) { seen.add(w.space); out.push({ space: w.space, item: w.title, why: [`시민 바람 1위 · 공감 ${store.likes(w)}`, `직전: ${SP[w.space].was}`] }); } });
    } else if (o.known === 'item') {
      const cat = bigCat(o.item);
      M.spaces.map(s => {
        const ws = W.filter(w => w.space === s.id && wishMatch(o.item, w)), likes = ws.reduce((a, w) => a + store.likes(w), 0), ar = around(s, cat);
        return { s, ws, likes, ar, sc: (ws.length ? 10 : 0) + likes / 8 - ar.same / 15 };
      }).sort((a, b) => b.sc - a.sc).slice(0, 3).forEach(r => out.push({ space: r.s.id, item: o.item, why: [r.ws.length ? `이 빈칸에 비슷한 바람 「${r.ws[0].title}」 공감 ${r.likes}` : '맞는 바람은 아직 없음', `100m 안 같은 업종대(${cat}) ${r.ar.same}곳`] }));
    } else if (o.known === 'place') {
      const s = SP[o.space], ws = W.filter(w => w.space === s.id).sort((a, b) => store.likes(b) - store.likes(a));
      ws.slice(0, 3).forEach(w => out.push({ space: s.id, item: w.title, why: [`이 빈칸 시민 바람 · 공감 ${store.likes(w)}`, `100m 안 같은 업종대 ${around(s, bigCat(w.title)).same}곳`] }));
      if (out.length < 3) {
        const near = M.bg.filter(([x, y]) => dist({ x, y }, s) <= 100), c = {};
        ['교육', '예술·스포츠', '수리·개인', '소매'].forEach(k => c[k] = near.filter(b => b[2] === k).length);
        const ex = { '교육': '스터디카페 · 공방', '예술·스포츠': '보드게임 카페 · 연습실', '수리·개인': '셀프 사진관 · 네일', '소매': '소품샵 · 편집숍' };
        const usedCat = new Set(out.map(x => bigCat(x.item)));
        Object.entries(c).filter(([k]) => !usedCat.has(k)).sort((a, b) => a[1] - b[1]).slice(0, 3 - out.length).forEach(([k, n]) => out.push({ space: s.id, item: ex[k], why: [`100m 안 ${k} ${n}곳 — 주변에 적은 업종대`, '시민 바람은 아직 없음'] }));
      }
    }
    return out;
  }

  // ---------------- 화면 조각 ----------------
  const stepper = n => `<ol class="ostep">${STEPS.map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}"><span>${i + 1}</span>${t}</li>`).join('')}</ol>`;
  const aiTag = '<span class="tag ai" title="지금은 규칙으로 만든 시연판. 실시간 연결 때 AI가 씁니다">AI 초안 · 시연판</span>';
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
      if (o.known === 'both' || o.known === 'place') h += `<label class="ofl">어느 빈칸인가요?<select data-o-in="space"><option value="">빈칸 고르기 (바람 많은 순)</option>${M.spaces.slice().sort((a, b) => store.bySpace(b.id).length - store.bySpace(a.id).length).map(s => `<option value="${s.id}"${o.space === s.id ? ' selected' : ''}>${esc(shortAddr(s))} — 직전 ${esc(s.was)}${store.bySpace(s.id).length ? ` · 바람 ${store.bySpace(s.id).length}` : ''}</option>`).join('')}</select></label>`;
      const ready = o.known && (o.known === 'none' || (o.known === 'item' && o.item.trim()) || (o.known === 'place' && o.space) || (o.known === 'both' && o.item.trim() && o.space));
      h += `<p class="err" id="oerr" hidden></p>`;
      if (o.known === 'both') h += `<button class="cta" data-o="go2"${ready ? '' : ' disabled'}>이 자리의 위험과 근거 보기 →</button>`;
      else if (o.known) h += `<button class="cta" data-o="reco"${ready ? '' : ' disabled'}>${o.known === 'item' ? '맞는 빈칸 추천 받기' : o.known === 'place' ? '이 빈칸에 맞는 업종 보기' : '바람 많은 빈칸 × 업종 조합 보기'}</button>`;
      if (o.reco) h += `<section class="oq"><h3>추천 <small>시민 바람 · 주변 업소 계산</small></h3>${o.reco.map((c, i) => `<div class="combo"><div><b>${esc(c.item)}</b> <span class="at">@ ${esc(shortAddr(SP[c.space]))}</span><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div><button class="cta2" data-o="pick" data-i="${i}">이 조합으로 →</button></div>`).join('') || '<p class="emptyw">조건에 맞는 추천이 없어요.</p>'}</section>`;
      h += `</section>`;
    }
    if (o.status === 'open') {
      h += `<section class="oq"><h3>가게 정보</h3><div class="orow">
        <label class="ofl">업종<input data-o-in="item" value="${esc(o.item)}" placeholder="예: 덮밥집" maxlength="30"></label>
        <label class="ofl">가게 위치<select data-o-in="near">${LM.map(l => `<option${o.near === l.name ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></div></section>
        <section class="oq"><h3>어떤 어려움이 있나요?</h3><div class="ochips">${['고객 관리', '홍보', '매출', '재고', '기타'].map(v => `<button class="${o.trouble === v ? 'on' : ''}" data-o="trouble" data-v="${v}">${v}</button>`).join('')}</div>
        <label class="ofl">상황을 편하게 적어 주세요<textarea data-o-in="story" rows="3" maxlength="300" placeholder="예: 처음 온 손님은 많은데 다시 오는 손님이 적어요">${esc(o.story)}</textarea></label>
        <p class="err" id="oerr" hidden></p>
        <button class="cta" data-o="problem"${o.trouble && o.item.trim() ? '' : ' disabled'}>AI와 문제 정리하기</button></section>`;
      if (o.problem) h += `<section class="oq aiout"><h3>정리한 문제 ${aiTag}</h3>
        <label class="ofl">문제 한 줄 <small>(고쳐도 돼요)</small><input data-o-in="problem.one" value="${esc(o.problem.one)}"></label>
        <div class="two"><div><b>원인 후보</b><ul>${o.problem.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div><div><b>먼저 확인할 숫자</b><ul>${o.problem.check.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div></div>
        <button class="cta" data-o="go2">이대로 확인 → 가게 카드</button></section>`;
    }
    return h;
  }

  // 위험과 근거 줄들 (창업 카드 · 챗봇이 같이 씀). o = { status, item, space, near }
  function riskList(o) {
    const pt = ptOf(o), cat = bigCat(o.item), ar = around(pt, cat), [lv, lc] = level(ar.same);
    const sp = o.space && SP[o.space], ws = sp ? store.bySpace(sp.id) : [], match = ws.filter(w => wishMatch(o.item, w));
    const risk = [];
    risk.push(`<li class="${lc}"><b>같은 업종대 경쟁 ${lv}</b> 100m 안 ${cat} ${ar.same}곳 (전체 ${ar.all}곳)</li>`);
    if (sp && sp.wasL === cat) risk.push(`<li class="mid"><b>같은 업종대가 나간 자리</b> 직전 ${esc(sp.was)} — 나간 이유(임대료 · 위치 · 운영) 확인</li>`);
    if (sp) risk.push(`<li class="${ar.vacant >= 4 ? 'mid' : 'lo'}"><b>주변 빈칸 ${ar.vacant}곳</b> ${ar.vacant >= 4 ? '골목 전체가 비고 있을 수 있음 — 현장 확인' : '골목 공실은 많지 않음'}</li>`);
    if (!sp) {
      const nearW = store.wishes().filter(w => dist(SP[w.space], pt) <= 150).sort((a, b) => store.likes(b) - store.likes(a));
      const mine = nearW.filter(w => wishMatch(o.item, w));
      risk.push(`<li class="${ar.vacant >= 4 ? 'mid' : 'lo'}"><b>주변 빈칸 ${ar.vacant}곳</b> ${ar.vacant >= 4 ? '골목 공실이 늘고 있을 수 있음' : '골목 공실은 많지 않음'}</li>`);
      risk.push(`<li class="lo"><b>가게 근처 시민 바람 ${nearW.length}개</b> ${nearW.length ? nearW.slice(0, 3).map(w => `「${esc(w.title)}」 ♥${store.likes(w)}`).join(' · ') + (mine.length ? ` — 우리 업종과 닿는 바람 ${mine.length}개: 메뉴 · 홍보 아이디어로` : '') : '150m 안에는 아직 없음'}</li>`);
    }
    if (sp) risk.push(`<li class="${match.length ? 'lo' : 'mid'}"><b>시민 바람 ${match.length ? '일치' : '없음'}</b> ${match.length ? match.map(w => `「${esc(w.title)}」 공감 ${store.likes(w)}`).join(' · ') : '이 업종을 바라는 바람은 아직 없음'}</li>`);
    return risk;
  }
  function s2() {
    const o = O(), risk = riskList(o), who = o.status === 'pre' ? 'pre' : 'open';
    const sup = SUP.list.map(x => { const ok = x.who.includes(who); return `<a class="sup${ok ? '' : ' no'}" href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.name)}</b>${x.closed ? ' <em>마감</em>' : ''}<small>${esc(x.org)} · ${esc(x.what)}</small><small>${ok ? '대상: ' + esc(x.target) : '해당 안 됨: ' + esc((x.whyNot || {})[who] || '대상이 다름')}</small></a>`; }).join('');
    return `<section class="ocard">
        <div class="ohead"><p class="kick">${o.status === 'pre' ? '창업 카드' : '가게 카드'}</p><h2>${esc(o.item)} <small>@ ${esc(placeName(o))}</small></h2></div>
        ${o.problem ? `<p class="oprob"><b>정리한 문제</b> ${esc(o.problem.one)}</p>` : ''}
        <div class="ogrid">
          <div><h3>위험과 근거 <span class="tag calc">계산</span></h3><ul class="risk">${risk.join('')}</ul><p class="fine">소진공 상가정보 ${esc(M.meta.q_now)} 기준. 높음 · 보통 · 낮음 기준(60 · 30곳)은 [가정].</p></div>
          <div><h3>받을 수 있는 지원</h3>${sup}<p class="fine">${esc(SUP.checked)} 공고 · 보도로 확인. 최종 자격은 공고 기관이 판단해요.</p></div>
        </div>
      </section>
      <div class="onav"><button class="cta2" data-o="step" data-v="1">← 상담으로</button><button class="cta" data-o="go3">학생 팀과 할 과제 정리 →</button></div>`;
  }

  function s3() {
    const o = O(), T = o.tasks, n = T.list.filter(t => t.on).length;
    return `<section class="ocard"><div class="ohead"><p class="kick">과제 정리</p><h2>대학생 4인 팀과 한 학기 동안 할 일 ${aiTag}</h2><p class="was">${esc(o.item)} @ ${esc(placeName(o))} · 고른 과제 <b>${n}</b>개 (1~4개)</p></div>
      <div class="tasks">${T.list.map(t => `<label class="task${t.on ? ' on' : ''}"><input type="checkbox" data-o="task" data-id="${t.id}"${t.on ? ' checked' : ''}><div><b>${esc(t.t)}</b><small>필요한 전공: ${esc(t.major)} · ${t.wk}주</small><small>결과물: ${esc(t.out)}</small></div></label>`).join('')}</div>
      <div class="expert"><b>학생 팀이 할 일이 아니에요 → 전문가 · 기관으로</b><ul>${T.expert.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <p class="err" id="oerr" hidden></p></section>
      <div class="onav"><button class="cta2" data-o="step" data-v="2">← 카드로</button><button class="cta" data-o="go4"${n >= 1 && n <= 4 ? '' : ' disabled'}>동행 프로젝트 지원서 →</button></div>`;
  }

  function s4() {
    const o = O(), a = o.app || {}, n = o.tasks.list.filter(t => t.on);
    const uses = ['인테리어 · 설비', '첫 재료 · 재고', '홍보', '학생 팀 활동비'];
    return `<section class="ocard"><div class="ohead"><p class="kick">동행 프로젝트 1기 · 사장님 지원서 <span class="tag">우리 정책안 · 시범</span></p><h2>${esc(o.item)} @ ${esc(placeName(o))}</h2></div>
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
    const o = O(), r = o.result, n = o.tasks.list.filter(t => t.on);
    const tl = [['접수', true], ['운영단 심사 (시 + 지역 대학)', !!r], [r === 'no' ? '다음 기회' : '선정 → 학생 모집', r === 'yes'], ['팀 구성 · 한 학기', false]];
    return `<section class="ocard"><div class="ohead"><p class="kick">진행 상태</p><h2>${esc(o.item)} @ ${esc(placeName(o))}</h2></div>
      <ol class="tl">${tl.map(([t, d], i) => `<li class="${d ? 'done' : i === tl.findIndex(x => !x[1]) ? 'now' : ''}">${esc(t)}</li>`).join('')}</ol>
      ${!r ? `<p class="was">지원서가 접수됐어요. 운영단이 준비 정도 · 시민 바람 · 과제 적합성을 봐요.</p><div class="onav"><button class="cta2" data-o="result" data-v="no">다음 기회 결과 보기 (시연)</button><button class="cta" data-o="result" data-v="yes">심사 결과 보기 (시연)</button></div>` : ''}
      ${r === 'yes' ? `<div class="okpost"><p class="kick">선정! 학생 모집 공고가 올라갔어요</p><h3>[동행 프로젝트 1기] ${esc(o.item)} @ ${esc(placeName(o))}</h3>
        <ul>${n.map(t => `<li><b>${esc(t.t)}</b> — ${esc(t.major)} · ${t.wk}주 · ${esc(t.out)}</li>`).join('')}</ul>
        <p class="fine">대학생 입구 「과제 둘러보기」에 뜨고, 관심 직무가 맞는 학생에게 알림이 가요. 선발은 운영단 → 사장님 면담 순서예요.</p>
        <p class="note2">학기가 끝나면 학생 팀이 만든 장부 · 기록을 사장님 「내 가게」 화면에서 계속 써요. 이 기록이 개업 뒤 추적 자료도 돼요 (경영 도우미 자리 · 설계 중).</p></div>` : ''}
      ${r === 'no' ? `<div class="okpost no"><p class="kick">이번 기수에는 선정되지 않았어요</p><p>다음 기수에 우선 검토해요. 그 사이 받을 수 있는 지원을 확인해 보세요. 같은 시기에 신청했지만 선정되지 않은 가게는 효과 비교군으로 함께 추적해요(동의한 경우).</p></div>` : ''}
      </section>
      <div class="onav"><button class="cta2" data-o="reset">새 상담 시작</button><button class="cta2" data-o="map">지도로</button></div>`;
  }

  function render() {
    const o = O();
    const body = [null, s1, s2, s3, s4, s5][o.step]();
    return `<div class="owrap"><div class="otop"><button class="back" data-o="map">← 지도로</button><p class="kick">사장님 · 창업 · 경영 상담</p>${stepper(o.step)}</div>${body}
      <div class="oad">${A.adHTML('owner', 'panel')}</div></div>`;
  }

  // ---------------- 동작 ----------------
  const err = m => { const e = document.getElementById('oerr'); if (e) { e.textContent = m; e.hidden = false; } };
  const W = document.getElementById('work');
  W.addEventListener('input', e => {
    const k = e.target.dataset.oIn; if (!k) return;
    if (k === 'problem.one') { st.owner.problem.one = e.target.value; save(); return; }
    st.owner[k] = e.target.value; if (k !== 'story') st.owner.reco = null; save();
    // 입력 중 다시 그리면 커서가 사라지므로, 버튼 상태만 갱신
    const o = O(), b = W.querySelector('[data-o="go2"],[data-o="reco"],[data-o="problem"]');
    if (b) b.disabled = !(o.status === 'open' ? o.trouble && o.item.trim() : (o.known === 'none' || (o.known === 'item' && o.item.trim()) || (o.known === 'place' && o.space) || (o.known === 'both' && o.item.trim() && o.space)));
    if (e.target.tagName === 'SELECT') A.rerender();
  });
  W.addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    const k = b.dataset.o, v = b.dataset.v, o = O();
    if (k === 'task') { const t = o.tasks.list.find(x => x.id === b.dataset.id); t.on = b.checked; save(); A.rerender(); return; }
    e.preventDefault();
    switch (k) {
      case 'map': return A.go(o.space ? 'space' : 'home', o.space ? { space: o.space } : {});
      case 'status': return set({ status: v, space: v === 'open' ? null : o.space, known: v === 'pre' ? (o.space ? 'place' : null) : null, reco: null, problem: null, near: o.near || LM[0].name });
      case 'known': return set({ known: v, reco: null });
      case 'trouble': return set({ trouble: v, problem: null });
      case 'reco': return set({ reco: combos(o) });
      case 'pick': { const c = o.reco[+b.dataset.i]; return set({ space: c.space, item: c.item, step: 2, tasks: null }); }
      case 'problem': if (!o.story.trim()) o.story = `${o.trouble} 때문에 고민이에요`; return set({ problem: AI.problem(o.trouble, o.story, o.item.trim()) });
      case 'go2': if (!o.item.trim()) return err('업종을 적어 주세요'); return set({ step: 2, tasks: null });
      case 'go3': return set({ step: 3, tasks: o.tasks || AI.tasks(o) });
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
    st.owner.app = app; save();
    if (!app.use.length) return err('지원금을 쓰고 싶은 곳을 하나 이상 골라 주세요');
    if (!app.track || !app.handover) return err('두 가지 동의가 있어야 지원할 수 있어요');
    A.needAuth(() => {
      const role = st.owner.status === 'pre' ? 'pre' : 'open';
      if (st.user.role !== role) { st.user.role = role; A.toast(`${A.roleName(role)} 역할을 더했어요`); }
      st.owner.step = 5; st.owner.result = null; st.owner.submittedAt = Date.now(); save(); A.rerender();
    });
  });

  window.OWNER = {
    render,
    // 빈칸에서 들어오면 그 자리를 고른 채로 시작. 진행 중인 상담이 있으면 이어서.
    // 챗봇이 대화로 채워서 시작: patch = { status, trouble, story, item, known }
    startWith(patch) { st.owner = Object.assign(blank(), patch); save(); },
    tools: { combos, riskList, bigCat, wishMatch },
    start(spaceId) {
      // 빈칸에서 들어왔는데 지금 상담이 다른 자리 것이면 새로 시작(같은 자리면 이어서)
      if (spaceId && O().space !== spaceId) { st.owner = Object.assign(blank(), { status: 'pre', known: 'place', space: spaceId }); save(); }
    },
  };
})();
