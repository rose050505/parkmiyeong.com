// 시연 화면. 숫자는 calc.js(공공데이터 자동 집계), 글은 AI(실시간 또는 시연용 미리 생성 결과).
(function () {
  const D = window.DATA, C = window.CALC, EX = window.EX, PRE = window.PREGEN || {};
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const sg = n => n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0';
  const pid = c => `${String(c.addr || '').replace('대구광역시 중구 ', '')}|${c.f}|${c.s}`;
  const short = a => String(a || '').replace('대구광역시 중구 ', '');
  const COL = { '소매': '#4C78A8', '음식': '#E8871E', '수리·개인': '#54A24B', '과학·기술': '#B279A2', '교육': '#3FA7A0',
    '시설관리·임대': '#9D755D', '보건의료': '#D64B57', '예술·스포츠': '#C9A400', '숙박': '#FF8FA0', '부동산': '#8C8C8C' };
  const S = {
    step: 'home', cand: null, chats: {}, stuSel: null, stuRec: {}, R: 150, filt: { f1: true, dsr: false, hideFilled: true },
    rec: {}, entry: 'new', item: null, prep: {}, diag: {}, diagPoint: null, prof: EX.newOwner.profile, worry: EX.oldOwner.worry,
    post: {}, approved: [], lastPrompt: {}, students: EX.students.slice(), match: {}, confirmed: {}, postSel: null, postSrc: null
  };
  const featured = EX.featured.map(a => D.cands.find(c => c.addr === a)).filter(Boolean);
  S.diagPoint = featured[1] || featured[0];

  // ---------- AI 연결 ----------
  const COMMON = '너는 대구시 동성로 상권 지원 담당자를 돕는 AI다. 사장님 · 대학생이 읽을 쉬운 한국어로 쓴다. ' +
    '반드시 JSON 객체 하나만 출력한다(앞뒤 설명 · 코드블록 표시 금지). ' +
    '숫자는 입력의 [계산값]에 있는 숫자만 그대로 인용한다. 매출 · 임대료 · 비율 · 인구 같은 새 숫자를 만들지 않는다. ' +
    '손님 나이 · 시간대 · 유동 인구처럼 계산값에 없는 내용은 단정하지 말고 「현장 확인 필요」라고 쓴다. ' +
    '한 분기 증감은 추세가 아니다: 「줄어드는 · 늘고 있는 업종」 대신 「지난 분기 ○곳 → ○곳」으로 쓴다. ' +
    '단정하지 말고 후보와 근거를 제시한다. 결정은 사람(사장님 · 담당자)이 한다.';
  // 실시간: ① 내 API 키(브라우저에서 바로) ② 팀 코드(parkmiyeong.com 서버 중계 — 키는 서버에만)
  const viaProxy = () => !localStorage.getItem('dsr_key') && !!localStorage.getItem('dsr_code') && location.protocol.startsWith('http');
  const live = () => !!localStorage.getItem('dsr_key') || viaProxy();
  const modelName = () => localStorage.getItem('dsr_model') || 'claude-opus-5-5';
  function setMode() {
    const b = $('#modeBtn');
    if (live()) { b.className = 'mode live'; b.textContent = 'AI: 실시간 연결 (' + (viaProxy() ? '팀 서버 · ' : '') + modelName() + ')'; }
    else { b.className = 'mode pre'; b.textContent = '시연 · 미리 만들어 둔 AI 답, 실제 발송 없음'; }
  }
  function parseJSON(t) {
    t = t.replace(/```json|```/g, '');
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    return JSON.parse(t.slice(a, b + 1));
  }
  async function callClaude(system, user, maxTokens, timeoutMs, keyOverride, modelOverride) {
    const proxy = !keyOverride && viaProxy();
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeoutMs || (proxy ? 45000 : 20000));
    try {
      const r = await fetch(proxy ? '/api/drafthon-ai' : 'https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctl.signal,
        headers: proxy ? { 'content-type': 'application/json', 'x-demo-code': localStorage.getItem('dsr_code') } : {
          'content-type': 'application/json', 'x-api-key': keyOverride || localStorage.getItem('dsr_key'),
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'server-side-fallback-2026-07-01'
        },
        body: JSON.stringify({
          model: modelOverride || modelName(), max_tokens: maxTokens || 8000,
          output_config: { effort: 'low' }, fallbacks: 'default',
          system: system || undefined, messages: [{ role: 'user', content: user }]
        })
      });
      let j; try { j = await r.json(); } catch (e) { throw new Error('응답이 AI 답 형식이 아님(HTTP ' + r.status + ') — 와이파이 로그인 화면일 수 있음'); }
      if (!r.ok) throw new Error(r.status === 401 ? (proxy ? '팀 코드가 틀림' : 'API 키가 틀림') : r.status === 429 ? '요청이 너무 많음(잠시 뒤 다시)' : r.status >= 500 ? 'AI 서버 혼잡' : '요청 오류(HTTP ' + r.status + ')');
      if (j.stop_reason === 'refusal') throw new Error('AI가 답하지 않음');
      if (j.stop_reason === 'max_tokens') throw new Error('답이 길어 잘림');
      const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      let out = text;
      if (system) { try { out = parseJSON(text); } catch (e) { throw new Error('AI 답 형식 오류'); } }
      return { out, model: j.model };
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('응답 시간 초과');
      if (e instanceof TypeError) throw new Error('인터넷 연결 끊김');
      throw e;
    } finally { clearTimeout(tm); }
  }
  // 실시간 → 실패 시 미리 생성 결과. preKey 가 null 이면 미리 생성 결과를 쓰지 않음(입력이 바뀐 경우)
  const isArr = a => Array.isArray(a);
  const SHAPE = {
    rec: o => isArr(o.candidates) && o.candidates.every(k => k && typeof k.biz === 'string'),
    prep: o => isArr(o.stages) && o.stages.every(x => isArr(x.items)) && isArr(o.helpers) && isArr(o.consider || []),
    diag: o => isArr(o.issues) && isArr(o.helpers),
    post: o => typeof o.title === 'string' && isArr(o.tasks) && isArr(o.majors) && isArr(o.keywords || []),
    match: o => isArr(o.ranked) && o.ranked.some(r => S.students.some(s => s.id === r.id)),
    classA: o => typeof o.code === 'string' && typeof o.field === 'string',
    designA: o => o.area && typeof o.area.pick === 'string' && isArr(o.stages) && isArr(o.helpers),
    stu: o => isArr(o.picks),
    supStruct: o => isArr(o.rows) && o.forPre && o.forOpen
  };
  async function getAI(preKey, system, user, kind) {
    if (live()) {
      const t0 = Date.now();
      try {
        const r = await callClaude(system, user);
        if (kind && !(r.out && SHAPE[kind](r.out))) throw new Error('AI 답 형식 오류');
        if (kind === 'match') r.out.ranked = r.out.ranked.filter(x => S.students.some(s => s.id === x.id));
        return { out: r.out, src: 'live', model: r.model, sec: Math.round((Date.now() - t0) / 1000) };
      }
      catch (e) { if (preKey && PRE[preKey]) return { out: PRE[preKey], src: 'pre', err: String(e.message || e) }; return { err: String(e.message || e), src: 'none' }; }
    }
    if (preKey && PRE[preKey]) { await new Promise(r => setTimeout(r, 300)); return { out: PRE[preKey], src: 'pre' }; }
    return { src: 'none' };
  }
  const hasPre = k => !!PRE[k];
  function badge(res) {
    if (res.src === 'live') return `<span class="badge live">AI 실시간 생성 · ${esc(res.model || modelName())} · ${res.sec}초</span>`;
    let t = '<span class="badge pre" title="Claude가 같은 숫자 · 같은 지시를 받아 미리 작성한 답입니다. 실시간 연결 때는 새로 생성합니다.">AI 답 · 미리 만들어 둠 (Claude, 같은 입력)</span>';
    if (res.err) t += `<div class="note">실시간 연결 실패(${esc(res.err)}) → 미리 만들어 둔 답으로 대신 표시</div>`;
    return t;
  }
  function noneMsg(res, why) {
    const head = res && res.err ? `실시간 AI 호출 실패: ${esc(res.err)}<br>` : '';
    const tail = live() ? '인터넷 연결과 API 키를 확인하세요.' : '오른쪽 위 「AI」 단추에서 API 키를 넣으면 실시간으로 생성합니다.';
    return `<div class="warn">${head}${why} — 미리 만들어 둔 답이 없습니다. ${tail}<br>미리 만들어 둔 경로: 처음 화면의 예시 질문 · 예시 답, 상권 지도의 「먼저 볼 점포 3곳」 → 반경 150m → 첫 번째 사업.</div>`;
  }
  // 답이 늦게 와도 화면이 바뀌었으면 그리지 않는다
  let ticket = 0;
  const still = (t, step, sel) => t === ticket && S.step === step && $(sel);

  // ---------- 지도 (오프라인 SVG) ----------
  const INS = D.active.filter(p => p.in);
  const ALL = INS.map(p => C.xy(p));
  function pct(arr, q) { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; }
  const BX = [pct(ALL.map(p => p[0]), 0.005) - 60, pct(ALL.map(p => p[0]), 0.995) + 60];
  const BY = [pct(ALL.map(p => p[1]), 0.005) - 60, pct(ALL.map(p => p[1]), 0.995) + 60];
  function scaleBar(x, y, m, k) {
    return `<g font-size="${16 * k}" fill="#333"><line x1="${x}" y1="${y}" x2="${x + m}" y2="${y}" stroke="#333" stroke-width="${3 * k}"/>` +
      `<text x="${x + m / 2}" y="${y - 7 * k}" text-anchor="middle">${m}m</text></g>`;
  }
  function label(x, y, t, k, size) {
    return `<text x="${x}" y="${y}" font-size="${size * k}" fill="#14284b" font-weight="800" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="${6 * k}" stroke-linejoin="round" pointer-events="none">${esc(t)}</text>`;
  }
  function fullMap() {
    const w = BX[1] - BX[0], h = BY[1] - BY[0], k = Math.max(w / 900, h / 820);
    const vis = visibleCands();
    let s = `<svg id="map" viewBox="${BX[0]} ${BY[0]} ${w} ${h}" role="img" aria-label="동성로 업소 분포 지도">`;
    s += INS.map(p => { const [x, y] = C.xy(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${2.3 * k}" fill="${p.dsr ? '#7d8796' : '#b5bcc6'}"/>`; }).join('');
    s += vis.map(c => {
      const [x, y] = C.xy(c); const on = S.cand && S.cand.id === c.id, fi = featured.indexOf(c);
      if (fi >= 0) return '';
      return `<circle class="cd" data-id="${c.id}" cx="${x}" cy="${y}" r="${(on ? 7 : 4.2) * k}" fill="${on ? '#a85a06' : 'rgba(168,90,6,.6)'}" stroke="#6b3a03" stroke-width="${1 * k}" style="cursor:pointer"><title>${esc(short(c.addr))} · ${c.f ? c.f + '층' : '층 정보 없음'} · 직전 ${esc(c.s)}</title></circle>`;
    }).join('');
    for (const [n, v] of Object.entries(D.lm)) { const [x, y] = C.xy({ x: v[0], y: v[1] }); s += label(x, y, n, k, 17); }
    s += featured.map((c, fi) => {
      const [x, y] = C.xy(c);
      return `<circle class="cd" data-id="${c.id}" cx="${x}" cy="${y}" r="${9 * k}" fill="#a85a06" stroke="#fff" stroke-width="${2.5 * k}" style="cursor:pointer"><title>${esc(short(c.addr))}</title></circle>` +
        `<text x="${x + 12 * k}" y="${y + 9 * k}" font-size="${28 * k}" font-weight="900" fill="#6b3a03" paint-order="stroke" stroke="#fff" stroke-width="${6 * k}" pointer-events="none">${'①②③'[fi]}</text>`;
    }).join('');
    s += scaleBar(BX[0] + 30 * k, BY[1] - 30 * k, 200, k);
    s += `<text x="${BX[1] - 30 * k}" y="${BY[0] + 40 * k}" font-size="${20 * k}" text-anchor="middle" font-weight="700">↑북</text></svg>`;
    return s;
  }
  function zoomMap(c, R) {
    const [cx, cy] = C.xy(c), half = R * 1.45, k = half * 2 / 470;
    let s = `<svg class="zm" viewBox="${cx - half} ${cy - half} ${half * 2} ${half * 2}" role="img" aria-label="반경 지도">`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(31,95,191,.06)" stroke="#1f5fbf" stroke-width="${2 * k}" stroke-dasharray="${8 * k} ${6 * k}"/>`;
    for (const p of D.active) {
      const [x, y] = C.xy(p); if (Math.abs(x - cx) > half || Math.abs(y - cy) > half) continue;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${4 * k}" fill="${COL[p.l] || '#888'}" opacity=".85"/>`;
    }
    for (const g of D.cands) {
      const [x, y] = C.xy(g); if (Math.abs(x - cx) > half || Math.abs(y - cy) > half || g.id === c.id) continue;
      s += `<circle cx="${x}" cy="${y}" r="${5 * k}" fill="none" stroke="#a85a06" stroke-width="${2 * k}"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${11 * k}" fill="#a85a06" stroke="#fff" stroke-width="${3 * k}"/>`;
    s += scaleBar(cx - half + 20 * k, cy + half - 22 * k, R >= 300 ? 100 : 50, k);
    s += `<rect x="${cx + half - 62 * k}" y="${cy - half + 10 * k}" width="${52 * k}" height="${34 * k}" fill="#fff" opacity=".85"/><text x="${cx + half - 36 * k}" y="${cy - half + 34 * k}" font-size="${18 * k}" text-anchor="middle" font-weight="700">↑북</text></svg>`;
    return s;
  }
  function legend(withCand) {
    return `<div class="legend">${Object.entries(COL).map(([k, v]) => `<span><i style="background:${v}"></i>${k}</span>`).join('')}` +
      (withCand ? `<span><i style="background:none;border:2px solid #a85a06"></i>다른 사라진 업소</span>` : '') + '</div>';
  }
  function visibleCands() {
    return D.cands.filter(c => c.in && (!S.filt.f1 || c.f === '1') && (!S.filt.dsr || c.dsr) && (!S.filt.hideFilled || !c.filled.length));
  }

  // ---------- 화면 ----------
  // ---------- 화면 이동 ----------
  const VIEW = {};
  function go(v, fromPop) {
    if (!VIEW[v]) v = 'home';
    ticket++; S.busyA = false; S.busyOld = false; S.step = v; document.body.dataset.view = v; VIEW[v](); window.scrollTo(0, 0);
    if (!fromPop) history.pushState({ v }, '', '#' + v);
  }
  window.addEventListener('popstate', e => go(e.state && e.state.v ? e.state.v : 'home', true));
  // 갈래별 단계 띠
  const FLOW = {
    newA: ['질의응답', '창업 분야 분류', 'C 창업 설계', 'A 공고 작성', 'B 검토 · 게시', '지원자 · 학생 연결'],
    newB: ['상권 지도', '자리 분석 · 사업 후보', 'C 창업 설계', 'A 공고 작성', 'B 검토 · 게시', '지원자 · 학생 연결'],
    old: ['질의응답', '문제 분석 · 개선안', '구체 질의응답', 'A 공고 작성', 'B 검토 · 게시', '지원자 · 학생 연결']
  };
  const FLOWNAME = { newA: '신규 · 창업 아이템 보유', newB: '신규 · 창업 희망 상권 기반', old: '기존 사장님' };
  const SAY = {
    newA: ['정해진 질문에 답하면 AI가 아이템을 읽습니다.', 'AI가 상가정보 업종으로 분류하고, 빠진 것을 되묻습니다.', '동성로 세 자리를 자동 집계로 비교해 AI가 자리 · 준비 목록 · 필요한 일손을 냅니다.', 'AI가 필요한 일손을 학생용 공고로 씁니다. 사장님이 검토합니다.', '사장님이 승인한 공고만 게시됩니다.', 'AI가 지원자를 추천하고, 최종 확인은 담당자가 합니다.'],
    newB: ['상가정보 두 분기를 비교해 사라진 업소 = 빈 점포 후보를 찾습니다(현장 확인 필요).', '반경 업종을 자동 집계하고, AI가 맞는 사업 후보와 위험을 냅니다.', 'AI가 개업 준비 목록 · 필요한 일손 · 받을 수 있는 지원을 정리합니다.', 'AI가 필요한 일손을 학생용 공고로 씁니다. 사장님이 검토합니다.', '사장님이 승인한 공고만 게시됩니다.', 'AI가 지원자를 추천하고, 최종 확인은 담당자가 합니다.'],
    old: ['정해진 질문에 답하면 AI가 가게 고민을 읽습니다.', 'AI가 고민을 과제 · 개선안 · 필요한 일손으로 바꾸고, 사장님 느낌과 데이터를 대조합니다.', '급한 일과 만날 수 있는 때를 정하면 공고로 넘어갑니다.', 'AI가 필요한 일손을 학생용 공고로 씁니다. 사장님이 검토합니다.', '사장님이 승인한 공고만 게시됩니다.', 'AI가 지원자를 추천하고, 최종 확인은 담당자가 합니다.']
  };
  function bar(flow, idx) {
    return `<div class="flow"><button class="crumb" data-go="home">← 처음 화면</button><span class="fname">${esc(FLOWNAME[flow])}</span><ol>${FLOW[flow].map((t, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${esc(t)}</li>`).join('')}</ol><div class="say"><b>${idx + 1}/${FLOW[flow].length}</b>${esc(SAY[flow][idx] || '')}</div></div>`;
  }
  function wireCrumbs() { document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go)); }
  function page(html) { $('#main').innerHTML = html; wireCrumbs(); }
  const srcTag = () => `<div class="srcband"><span class="tag real">실제 데이터</span> 상가(상권)정보 ${esc(D.meta.q_prev)} · ${esc(D.meta.q_now)} 비교 · ${esc(D.meta.scope)}</div>`;
  const srcLine = () => `<div class="src">출처: ${esc(D.meta.src)}. 같은 업소가 ${esc(D.meta.q_now)} 상가정보에 없으면 「사라진 업소」로 셈(같은 건물에 이름이 같은 업소가 남아 있으면 이름 변경 · 중복으로 보고 뺌).</div>`;

  VIEW.nbMap = function step1() {
    const m = D.meta, vis = visibleCands();
    page(bar('newB', 0) + `<div class="grid g1">
      <div class="card"><h2>동성로 상권 지도 — 회색 점: 영업 중 ${fmt(m.n_now)}곳 · 주황 점: 빈 점포 후보(확인 필요)</h2>
        <div id="mapWrap">${fullMap()}</div>
        <div class="legend"><span><i style="background:#7d8796"></i>「동성로」 길 주소 업소</span><span><i style="background:#b5bcc6"></i>그 밖의 성내1동 업소</span><span><i style="background:rgba(168,90,6,.85)"></i>빈 점포 후보 (점을 누르면 선택)</span></div>
      </div>
      <div class="card">
        <h2>지난 분기에 있다가 이번 분기에 사라진 업소</h2>${srcTag()}
        <div class="big">
          <div><b>${fmt(m.n_prev)} → ${fmt(m.n_now)}</b><span>영업 중 업소 (2분기 → 3분기)</span></div>
          <div><b>${fmt(m.n_gone)}곳</b><span>사라진 업소 (새로 생김 ${fmt(m.n_new)}곳)</span></div>
          <div><b class="red">${fmt(m.n_floor1_open)}곳</b><span>그중 1층 · 같은 층에 새 업소 없음<br>= 먼저 볼 빈 점포 후보</span></div>
        </div>
        <p class="note">${fmt(m.n_prev)} − 사라짐 ${fmt(m.n_gone)} − 중복 기록 정리 ${fmt(m.n_dup)} + 새로 생김 ${fmt(m.n_new)} = ${fmt(m.n_now)}. 이름 · 번호만 바뀐 같은 업소 ${fmt(m.n_kept)}곳은 사라짐에서 뺐습니다. 사라진 업소 비율: 동성로 범위 ${m.rate_scope.toFixed(1)}% · 대구 전체 ${m.rate_daegu.toFixed(1)}% (같은 규칙).</p>
        <p class="note">참고(공식 통계): 동성로 중대형 상가 공실률 26.2% — 면적 기준, 2026년 3분기(한국부동산원, 경북매일 26-11-17 보도). 이 화면은 그 빈 곳이 <b>어디일 수 있는지</b>를 업소 기록으로 찾습니다. 정책 문서의 표(사라짐 119 · 새로 89)는 도로명 「동성로」 업소만 본 값이고, 이 화면은 범위를 성내1동까지 넓히고 중복 기록을 더 엄격히 정리한 값입니다.</p>
        <div class="warn">「사라진 업소」는 실제 공실이 아니라 빈 점포 <b>후보</b>입니다. 비었는지는 현장 · 건물주 확인이 필요합니다(층 정보 없는 곳 ${m.n_floor_unknown}곳 포함).</div>
        <div class="row" style="margin:.4rem 0">
          <label class="chk"><input type="checkbox" id="f1" ${S.filt.f1 ? 'checked' : ''}>1층만</label>
          <label class="chk"><input type="checkbox" id="fHide" ${S.filt.hideFilled ? 'checked' : ''}>같은 층에 새 업소 들어온 곳 빼기</label>
          <label class="chk"><input type="checkbox" id="fDsr" ${S.filt.dsr ? 'checked' : ''}>「동성로」 길 주소만</label>
        </div>
        <p style="margin:.2rem 0 .6rem;font-size:1.05rem">지도에 보이는 후보: <b>${fmt(vis.length)}곳</b></p>
        <h3>먼저 볼 점포 3곳 (1층 · 동성로 길 · 같은 건물에 새 업소 없음)</h3>
        <div class="pick">${featured.map((c, i) => `<button data-id="${c.id}" class="${S.cand && S.cand.id === c.id ? 'on' : ''}"><b>${'①②③'[i]} ${esc(short(c.addr))}</b><small>${c.f}층 · 직전 업종: ${esc(c.s)}</small></button>`).join('')}</div>
        <div id="sel"></div>
        <h3>사라진 ${fmt(m.n_gone)}곳의 직전 업종 (많은 순)</h3>
        <table><tr><th>직전 업종</th><th>2분기</th><th>사라짐</th><th>새로</th><th>기록 정리*</th><th>3분기</th></tr>${Object.entries(D.sub).sort((a, b) => b[1][2] - a[1][2] || b[1][0] - a[1][0]).slice(0, 5).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v[0]}</td><td>${v[2] ? '−' + v[2] : 0}</td><td>${v[3] ? '+' + v[3] : 0}</td><td>${sg(v[4])}</td><td>${v[1]}</td></tr>`).join('')}</table>
        <p class="note">* 기록 정리 = 같은 업소의 중복 기록 정리 · 업종 분류 변경 (2분기 − 사라짐 + 새로 + 기록 정리 = 3분기)</p>
        ${srcLine()}
      </div></div>`);
    $('#fHide').onchange = e => { S.filt.hideFilled = e.target.checked; VIEW.nbMap(); };
    $('#f1').onchange = e => { S.filt.f1 = e.target.checked; VIEW.nbMap(); };
    $('#fDsr').onchange = e => { S.filt.dsr = e.target.checked; VIEW.nbMap(); };
    document.querySelectorAll('.pick button').forEach(b => b.onclick = () => { pickCand(b.dataset.id); go('nbArea'); });
    document.querySelectorAll('#map .cd').forEach(el => el.onclick = () => { pickCand(el.dataset.id); VIEW.nbMap(); });
    if (S.cand) {
      const c = S.cand, pre = hasPre(`rec:${pid(c)}:150`);
      $('#sel').innerHTML = `<div class="rec" style="margin-top:.8rem"><h4>선택한 점포: ${esc(short(c.addr))}</h4>
        <p>${c.f ? c.f + '층' : '층 정보 없음'} · 직전 업종: <b>${esc(c.s)}</b>${c.bld ? ' · ' + esc(c.bld) : ''}</p>
        ${c.filled.length ? `<p class="numbad">같은 층에 3분기 새 업소 있음: ${esc(c.filled.join(', '))} — 이미 채워졌을 수 있음</p>` : ''}
        ${!c.f && c.bnew ? `<p class="numbad">층 정보 없음 · 같은 건물에 3분기 새 업소 ${c.bnew}곳 — 이미 채워졌을 수 있음</p>` : ''}
        ${c.moved ? `<p class="note">같은 이름 업소가 3분기에 근처(${esc(short(c.moved))})에 새로 생김 — 이 자리에서 옮겨 갔을 수 있음</p>` : ''}
        ${!pre && !live() ? '<p class="note">이 점포는 반경 숫자는 바로 나오고, AI 답은 실시간 연결 때만 나옵니다.</p>' : ''}
        <button class="btn" id="toS2">이 자리 분석하기 →</button></div>`;
      $('#toS2').onclick = () => go('nbArea');
    }
  }
  function pickCand(id) { const c = D.cands.find(c => c.id === id); if (!S.cand || S.cand.id !== c.id) { S.cand = c; S.item = null; } }

  function needCand() {
    page(bar('newB', 1) + `<div class="card"><h2>먼저 상권 지도에서 점포를 고르세요</h2><button class="btn" id="b">상권 지도로</button></div>`);
    $('#b').onclick = () => go('nbMap');
  }

  // ---------- ② ----------
  const recKey = () => `rec:${pid(S.cand)}:${S.R}`;
  VIEW.nbArea = function step2() {
    const c = S.cand; if (!c) return needCand();
    const f = C.facts(c, S.R), maxL = f.대분류별[0] ? f.대분류별[0].업소수 : 1, key = recKey();
    page(bar('newB', 1) + `<div class="grid g2">
      <div class="card"><h2>${esc(short(c.addr))} · 반경 ${S.R}m</h2>
        ${zoomMap(c, S.R)}${legend(true)}
        <div class="row" style="margin-top:.6rem">반경 <button class="btn ${S.R === 150 ? '' : 'ghost'}" data-r="150">150m</button><button class="btn ${S.R === 300 ? '' : 'ghost'}" data-r="300">300m</button></div>
      </div>
      <div class="card"><h2><span class="src2">자동 집계</span>공공데이터로 집계한 숫자</h2>${srcTag()}
        <p style="margin:.3rem 0 .5rem">${c.f ? c.f + '층' : '층 정보 없음'} · 직전 업종 <b>${esc(c.s)}</b> (2분기에 있다가 3분기에 사라짐)</p>
        <div class="big">
          <div><b>${fmt(f.반경안_영업중_업소수)}곳</b><span>반경 안 영업 중 (지난 분기 ${fmt(f.반경안_지난분기_업소수)})</span></div>
          <div><b class="red">${fmt(f.반경안_사라진업소수)}곳</b><span>사라짐(이 점포 포함) · 새로 ${fmt(f.반경안_새로생긴업소수)}곳 · 기록 정리 ${sg(f.반경안_기록정리)}</span></div>
        </div>
        <h3>업종 큰 분류별 업소 수</h3>
        <div class="bars">${f.대분류별.map(r => `<div class="bar"><span>${esc(r.대분류)}</span><div style="width:${Math.max(2, 100 * r.업소수 / maxL)}%;background:${COL[r.대분류]}"></div><span>${r.업소수}</span></div>`).join('')}</div>
        <h3>반경 안 많은 업종 (같은 업종 밀도)</h3>
        <table><tr><th>업종</th><th>지난 분기</th><th>사라짐</th><th>새로</th><th>기록 정리*</th><th>지금</th></tr>
        ${f.많은업종_상위12.map(r => `<tr class="${r.업종 === c.s ? 'hl' : ''}"><td>${esc(r.업종)}</td><td>${r.지난분기}</td><td>${r.사라짐 ? '−' + r.사라짐 : 0}</td><td>${r.새로생김 ? '+' + r.새로생김 : 0}</td><td>${sg(r.기록정리)}</td><td><b>${r.지금}</b></td></tr>`).join('')}</table>
        <p class="note">직전 업종(${esc(c.s)}) — 반경 안 지금 ${f.직전업종_반경안_지금}곳 · 동성로 범위 전체 ${f.직전업종_동성로범위.지난분기}곳 → ${f.직전업종_동성로범위.지금}곳 (사라짐 ${f.직전업종_동성로범위.사라짐}, 새로 ${f.직전업종_동성로범위.새로생김}, 기록 정리 ${sg(f.직전업종_동성로범위.기록정리)}). * 기록 정리 = 같은 업소의 중복 기록 정리 · 업종 분류 변경. 업소 수는 상가정보 기록 기준.</p>
        ${supBox('pre', 'area')}
        ${srcLine()}
      </div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>이 자리에 맞는 사업 후보 3개</h2>
        <p class="note"><b>자동 집계</b>는 업종 개수 · 증감만 셉니다. <b>AI</b>는 그 숫자를 읽고 자리 성격 · 직전 가게의 매장 구조 · 위험을 판단해 말로 설명합니다. AI는 근거 숫자를 항목 이름과 함께 내고, 화면이 그 항목의 집계값과 하나씩 대조합니다.<br>이 판단에 쓰지 않은 자료: 임대료 · 유동 인구 · 카드 매출 → 본 사업에서 연결할 자료.</p>
        <div id="recOut">${S.rec[key] ? '' : `<button class="btn" id="askRec">AI에게 사업 후보 묻기</button>${!live() && !hasPre(key) ? '<p class="note">이 점포 · 반경은 미리 만들어 둔 답이 없어 실시간 연결 때만 AI 답이 나옵니다.</p>' : ''}`}</div>
      </div></div>`);
    document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.R = +b.dataset.r; S.item = null; VIEW.nbArea(); });
    if (S.rec[key]) showRec(c, f, S.rec[key]);
    else $('#askRec').onclick = e => { e.target.disabled = true; askRec(c, f, key); };
  }
  function scopeSubTable() {
    return Object.entries(D.sub).filter(([k, v]) => v[1] >= 5 || v[2] >= 2).sort((a, b) => b[1][1] - a[1][1])
      .map(([k, v]) => `${k}: 지난분기 ${v[0]} / 지금 ${v[1]} / 사라짐 ${v[2]} / 새로생김 ${v[3]}`).join('\n');
  }
  async function askRec(c, f, key) {
    const t = ticket;
    $('#recOut').innerHTML = '<div class="spin">AI가 집계 숫자를 읽고 있습니다…</div>';
    const user = recPrompt(c, f);
    S.lastPrompt[key] = user;
    const res = await getAI(key, COMMON, user, 'rec');
    if (res.src === 'none') { if (still(t, 'nbArea', '#recOut')) { $('#recOut').innerHTML = noneMsg(res, '이 점포 · 반경') + '<button class="btn" id="askRec">다시 시도</button>'; $('#askRec').onclick = () => askRec(c, f, key); } return; }
    S.rec[key] = res;
    if (still(t, 'nbArea', '#recOut') && recKey() === key) showRec(c, f, res);
  }
  function recPrompt(c, f) {
    return `대구 동성로의 빈 점포 후보 한 곳과 그 주변을 자동 집계한 값이다(실제 공공데이터).\n[계산값]\n${JSON.stringify(f, null, 1)}\n\n[참고: 동성로 범위 전체 업종별 업소 수 (${D.meta.q_prev} → ${D.meta.q_now})]\n${scopeSubTable()}\n\n` +
      `할 일: 이 자리에 맞는 사업 후보 3개를 골라라. 같은 업종뿐 아니라 「비슷한업종묶음」(예: 기타 간이 = 분식 · 빵 · 토스트 · 버거)도 보고 경쟁을 판단한다. 같은 업종이 몰려 있거나 사라짐이 많은 업종은 위험으로 적는다. 직전 가게의 업종으로 매장 구조(주방 유무 등)를 짐작해 공사 부담도 적는다. 맞는 사업이 없다고 판단되면 그렇게 써도 된다.\n` +
      `숫자는 이 점포 [계산값]과 네가 고른 업종의 수치만 쓴다. 문장에 쓴 숫자는 evidence 에 항목 이름(key)과 값으로 모두 적는다. key 는 「${EVKEYS.join(' · ')}」 중 하나(고른 업종 기준)이거나 [계산값]의 맨 위 항목 이름이다.\n` +
      `출력 JSON: {"summary":"이 자리 한 줄 요약","candidates":[{"biz":"사업 이름(사장님이 알아듣는 말)","code":"참고 목록의 업종 이름 하나(그대로 복사)","why":"맞는 이유 2문장","risk":"위험 1~2문장","check":"사장님이 현장에서 확인할 것 1문장","evidence":[{"key":"반경안_지금","value":0}]}],"avoid":{"biz":"권하지 않는 업종","code":"참고 목록의 업종 이름","why":"이유 1문장","evidence":[]}}`;
  }
  const EVKEYS = ['반경안_지금', '반경안_지난분기', '반경안_사라짐', '반경안_새로생김', '반경안_비슷한업종', '범위_지난분기', '범위_지금', '범위_사라짐', '범위_새로생김', '범위_기록정리'];
  const EVLABEL = { 반경안_지금: '반경 안 같은 업종', 반경안_지난분기: '반경 안 같은 업종(지난 분기)', 반경안_사라짐: '반경 안 같은 업종 사라짐', 반경안_새로생김: '반경 안 같은 업종 새로', 반경안_비슷한업종: '반경 안 비슷한 업종', 범위_지난분기: '동성로 범위(지난 분기)', 범위_지금: '동성로 범위(지금)', 범위_사라짐: '동성로 범위 사라짐', 범위_새로생김: '동성로 범위 새로', 범위_기록정리: '동성로 범위 기록 정리', 반경안_사라진업소수: '반경 안 사라진 업소', 반경안_새로생긴업소수: '반경 안 새 업소', 반경안_영업중_업소수: '반경 안 업소', '직전업종_동성로범위.지난분기': '직전 업종 범위(지난 분기)', '직전업종_동성로범위.지금': '직전 업종 범위(지금)', '직전업종_동성로범위.사라짐': '직전 업종 범위 사라짐', '직전업종_동성로범위.새로생김': '직전 업종 범위 새로', '직전업종_동성로범위.기록정리': '직전 업종 범위 기록 정리', '같은업종.범위_지난분기': '같은 업종 범위(지난 분기)', '같은업종.범위_지금': '같은 업종 범위(지금)', '같은업종.범위_새로생김': '같은 업종 범위 새로', '같은업종.반경안_지난분기': '반경 안 같은 업종(지난 분기)' };
  const AREAL = { 같은업종_반경: '같은 업종', 같은업종_지난분기: '같은 업종(지난 분기)', 같은업종_사라짐: '같은 업종 사라짐', 비슷한업종_반경: '비슷한 업종', 카페_반경: '카페', 카페_지난분기: '카페(지난 분기)', 가장많은업종_수: '가장 많은 업종', 반경_업소수: '반경 업소' };
  const evLabel = k => {
    if (EVLABEL[k]) return EVLABEL[k];
    const ps = k.split('.');
    if (ps[0] === '대분류' || ps[0] === '묶음') return ps[1];
    if (ps[0] === '업종') return ps[1] + (ps[2] && ps[2] !== '지금' ? ' ' + ps[2] : '');
    if (AREAL[ps[ps.length - 1]]) return ps.slice(0, -1).join(' ') + ' ' + AREAL[ps[ps.length - 1]];
    return EVLABEL[ps[ps.length - 1]] || k.replace(/_/g, ' ');
  };
  function evHTML(chk) {
    if (!chk.length) return '';
    return `<p class="ev">근거 숫자 대조: ${chk.map(e => `<span class="${e.ok ? 'ok' : 'bad'}">${esc(evLabel(e.key))} ${esc(e.value)} ${e.ok ? '✓' : '✗' + (e.truth != null ? '(집계 ' + e.truth + ')' : '(없는 항목)')}</span>`).join(' · ')}</p>`;
  }
  function promptBox(key) {
    const t = S.lastPrompt[key]; if (!t) return '';
    return `<details class="pbox"><summary>AI에게 보낸 내용 보기 (자동 집계 숫자 + 지시)</summary><pre>${esc(COMMON + '\n\n' + t)}</pre></details>`;
  }
  function allowedFor(c, R, f, o) {
    const allowed = C.numbersIn(f); allowed.add(String(R));
    (o.candidates || []).concat(o.avoid ? [o.avoid] : []).forEach(k => { const sf = C.subFacts(c, R, k.code); if (sf) C.numbersIn(sf, allowed); });
    return allowed;
  }
  function checkHead(evAll, proseBad, proseTotal, missingEv) {
    const evBad = evAll.filter(e => !e.ok).length;
    if (missingEv) return `<div class="numbad">⚠ 문장에 숫자가 있는데 근거 숫자(항목 이름)가 없음 — 사람이 확인 필요</div>`;
    if (evBad || proseBad.length) return `<div class="numbad">⚠ ${evBad ? `근거 숫자 ${evAll.length}개 중 ${evBad}개가 집계값과 다름. ` : ''}${proseBad.length ? `근거 없이 쓴 숫자: ${proseBad.map(esc).join(', ')}` : ''} — 사람이 확인 필요</div>`;
    return evAll.length ? `<div class="numok">✓ 근거 숫자 ${evAll.length}개를 항목별로 집계값과 대조 — 모두 일치 · 문장 속 숫자 ${proseTotal}개도 근거 값에 있음 (어느 항목인지는 사람이 확인)</div>` : '<div class="note">AI 답에 숫자 없음</div>';
  }
  const proseNote = pv => pv.bad.length ? `<p class="numbad">근거 없이 쓴 숫자: ${pv.bad.map(esc).join(', ')}</p>` : '';
  function numBadge(chk) {
    return chk.bad.length ? `<div class="numbad">⚠ 문장 속 숫자 중 이 점포 집계표에 없는 값: ${chk.bad.map(esc).join(', ')} — 사람이 확인 필요</div>`
      : chk.total ? `<div class="note">문장 속 숫자 ${chk.total}개도 모두 이 점포 집계표 안의 값</div>` : '<div class="note">AI 답에 숫자 없음</div>';
  }
  function showRec(c, f, res) {
    const o = res.out;
    if (!S.lastPrompt[recKey()]) S.lastPrompt[recKey()] = recPrompt(c, f);
    const cards = (o.candidates || []).concat(o.avoid ? [o.avoid] : []);
    const evs = cards.map(k => C.checkEvidence(k.evidence, Object.assign({}, f, C.subFacts(c, S.R, k.code) || {})));
    const sumEv = C.checkEvidence(o.evidence, f);
    const ext = [];
    const pv = cards.map(k => C.proseVsEvidence([k.why, k.risk, k.check], k.evidence, ext));
    const spv = C.proseVsEvidence([o.summary], o.evidence, ext);
    const evAll = evs.flat().concat(sumEv), proseBad = [...new Set(pv.flatMap(x => x.bad).concat(spv.bad))];
    const head = checkHead(evAll, proseBad, pv.reduce((a, x) => a + x.total, spv.total), !evAll.length && (pv.some(x => x.total) || spv.total));
    $('#recOut').innerHTML = badge(res) + head + promptBox(recKey()) + `<p style="font-size:1.02rem;margin:.5rem 0 .1rem"><b>${esc(o.summary)}</b></p>${evHTML(sumEv)}${proseNote(spv)}` +
      (o.candidates || []).map((k, i) => {
        const sf = C.subFacts(c, S.R, k.code), pk = `prep:${pid(c)}:${S.R}:${k.code}`;
        return `<div class="rec"><h4>${i + 1}. ${esc(k.biz)}</h4>
        <p><span class="k">이유</span>${esc(k.why)}</p><p><span class="k">위험</span>${esc(k.risk)}</p><p><span class="k">현장 확인</span>${esc(k.check)}</p>
        ${sf ? `<p class="note">자동 집계 — 「${esc(sf.업종)}」 반경 안 ${sf.반경안_지금}곳 · 비슷한 업종(${esc(sf.비슷한업종묶음)}) ${sf.반경안_비슷한업종}곳 · 동성로 범위 ${sf.범위_지난분기} → ${sf.범위_지금}곳 (사라짐 ${sf.범위_사라짐}, 새로 ${sf.범위_새로생김})</p>` : `<p class="note">자동 집계 — 상가정보 업종 목록에 없는 새 업종이라 비교 자료 없음</p>`}
        ${evHTML(evs[i])}${proseNote(pv[i])}
        <button class="btn ghost pickItem" data-i="${i}" ${!live() && !hasPre(pk) ? 'title="실시간 연결 때 이어짐" style="opacity:.55"' : ''}>이 사업으로 창업 설계 → C</button></div>`;
      }).join('') +
      (o.avoid ? `<div class="rec no"><h4>권하지 않음: ${esc(o.avoid.biz)}</h4><p>${esc(o.avoid.why)}</p>${evHTML(evs[evs.length - 1])}${proseNote(pv[pv.length - 1])}</div>` : '') +
      (live() ? '<button class="btn ghost" id="reRec">다시 생성</button>' : '');
    document.querySelectorAll('.pickItem').forEach(b => b.onclick = () => { S.item = o.candidates[+b.dataset.i]; go('nbDesign'); });
    const rr = $('#reRec'); if (rr) rr.onclick = () => { delete S.rec[recKey()]; VIEW.nbArea(); $('#askRec').click(); };
  }

  // ---------- ③ ----------
  // 준비 항목을 누가 맡는지: 신고 · 계약 = 사장님 · 기관, 결과물이 남는 일 = 학생 팀(공고가 됨)
  function ownerTag(t) {
    if (/구청|세무서|신고|사업자 등록|보건증|건강진단|위생교육|확정일자|권리금|계약|원상복구|단말기|거래처/.test(t)) return '<span class="otag own">사장님 · 구청 · 세무서</span>';
    if (/원가|가격|본전|디자인|로고|메뉴판|간판|사진|인스타|SNS|홍보|조사|세어 보기|둘러보|배치|기록|설문|상자|포장/.test(t)) return '<span class="otag stu">학생 팀</span>';
    return '<span class="otag own">사장님</span>';
  }
  const stageList = st => (st || []).map(s => `<h3>${esc(s.when)}</h3><ul class="olist">${s.items.map(i => `<li>${ownerTag(i)}${esc(i)}</li>`).join('')}</ul>`).join('') +
    '<p class="note"><span class="otag stu">학생 팀</span> 일만 학생 공고가 됩니다. 신고 · 계약은 사장님이, 자금은 아래 <span class="otag sup">지원사업 · 개업 전 · 후</span>이 맡습니다.</p>';
  function helpersHTML(hs) {
    return `<div class="helpers"><h3>AI가 추린 필요한 일손 = 전공 · 업무 분야</h3>${(hs || []).map(h =>
      `<div class="hp"><b>${esc(h.field)}</b> · ${esc(h.weeks || '')}<br>할 일: ${esc(h.task)}<br>결과물: ${esc(h.deliverable)}<br><span class="note">왜: ${esc(h.why)}</span></div>`).join('')}</div>`;
  }
  const prepKey = () => (S.cand && S.item) ? `prep:${pid(S.cand)}:${S.R}:${S.item.code}` : '';
  VIEW.nbDesign = function step3a() {
    const c = S.cand;
    if (!c) { page(bar('newB', 2) + `<div class="card"><h2>먼저 상권 지도에서 점포를 고르고 사업 후보를 받으세요</h2><button class="btn" id="b">상권 지도로</button></div>`); $('#b').onclick = () => go('nbMap'); return; }
    const rec = S.rec[recKey()], opts = rec ? rec.out.candidates : [];
    if (S.item && !opts.some(o => o.biz === S.item.biz && o.code === S.item.code)) S.item = null;
    if (!S.item && opts.length) S.item = opts[0];
    const key = prepKey(), cache = key && S.prep[key] && S.prep[key].prof === S.prof ? S.prep[key] : null;
    page(bar('newB', 2) + `<div class="grid g3">
      <div class="card"><h2>C 창업 설계 — 예비 사장님 입력</h2>
        <div class="field"><span>위치 <span class="tag real">실제 데이터</span></span><b>${esc(short(c.addr))}</b> · ${c.f ? c.f + '층' : '층 정보 없음'} · 직전 ${esc(c.s)} · 반경 ${S.R}m</div>
        <div class="field"><span>아이템 (자리 분석의 AI 후보에서 고름)</span>${opts.length ? `<select id="item">${opts.map((o, i) => `<option value="${i}" ${S.item && S.item.biz === o.biz ? 'selected' : ''}>${esc(o.biz)}</option>`).join('')}</select>` : '<div class="warn">이 점포 · 반경으로 「자리 분석」에서 AI 사업 후보를 먼저 받으세요.</div>'}</div>
        <div class="field"><span>예비 사장님 정보 <span class="tag ex">가상 예시</span></span><textarea id="prof">${esc(S.prof)}</textarea></div>
        <button class="btn" id="askPrep" ${S.item ? '' : 'disabled'}>AI 개업 준비 목록 · 필요한 일손 받기</button>
        ${S.item && !live() && !hasPre(key) ? '<p class="note">이 조합은 미리 만들어 둔 답이 없어 실시간 연결 때만 나옵니다.</p>' : ''}
      </div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>C 창업 설계 — 준비 목록 · 필요한 일손</h2><div id="prepOut"></div></div></div>`);
    if (opts.length) $('#item').onchange = e => { S.item = opts[+e.target.value]; VIEW.nbDesign(); };
    $('#prof').oninput = e => { S.prof = e.target.value; if (S.prep[key]) $('#prepOut').innerHTML = '<div class="warn">예비 사장님 정보가 바뀌었습니다 — 「받기」를 다시 누르세요.</div>'; };
    if (S.item) $('#askPrep').onclick = e => { e.target.disabled = true; askPrep(c, prepKey()); };
    if (cache) showPrep(cache);
  }
  async function askPrep(c, key) {
    const t = ticket, prof = S.prof, item = S.item;
    $('#prepOut').innerHTML = '<div class="spin">AI가 개업 준비 목록을 만들고 있습니다…</div>';
    const f = C.facts(c, S.R), sf = C.subFacts(c, S.R, item.code);
    const user = `빈 점포에 처음 가게를 열려는 예비 사장님을 돕는다.\n[계산값]\n점포: ${JSON.stringify(f.점포)}\n반경 ${S.R}m 영업 중 ${f.반경안_영업중_업소수}곳, 사라짐 ${f.반경안_사라진업소수}곳, 새로 생김 ${f.반경안_새로생긴업소수}곳\n고른 업종 수치: ${JSON.stringify(sf)}\n직전 업종(${c.s}) 수치: 반경 안 지금 ${f.직전업종_반경안_지금}곳, 동성로 범위 ${JSON.stringify(f.직전업종_동성로범위)}\n` +
      `[고른 아이템] ${item.biz} — 이유: ${item.why} / 위험: ${item.risk}\n[예비 사장님] ${prof}\n\n` +
      `할 일: (1) 개업까지 할 일을 시기별로 정리(계약 전 / 계약~준비 / 개업 직전). 인허가 · 신고는 일반적인 절차 이름만 쓰고 확실하지 않으면 「구청 확인」이라고 쓴다. (2) 이 자리 · 이 아이템 · 이 사장님에게 특히 고려할 점 3개. (3) 사장님 혼자 하기 어려운 일을 대학생 프로젝트로 맡길 수 있게 「필요한 일손 = 전공 · 업무 분야」 2~3개로 추린다(한 학기 안에 끝나는 일).\n` +
      `출력 JSON: {"summary":"한 줄","stages":[{"when":"시기","items":["할 일"]}],"consider":["고려할 점"],"helpers":[{"field":"전공 · 업무 분야","task":"학생이 할 일","deliverable":"결과물","weeks":"기간(예: 8주)","why":"왜 필요한지"}]}`;
    const res = await getAI(prof === EX.newOwner.profile ? key : null, COMMON, user, 'prep');
    if (res.src === 'none') { if (still(t, 'nbDesign', '#prepOut')) $('#prepOut').innerHTML = noneMsg(res, prof === EX.newOwner.profile ? '이 점포 · 아이템 조합' : '고친 예비 사장님 정보'); const b = $('#askPrep'); if (b) b.disabled = false; return; }
    res.prof = prof; S.prep[key] = res;
    if (still(t, 'nbDesign', '#prepOut') && prepKey() === key && S.prof === prof) showPrep(res);
  }
  function showPrep(res) {
    const o = res.out;
    $('#prepOut').innerHTML = badge(res) + `<p style="margin:.5rem 0"><b>${esc(o.summary)}</b></p><div class="two"><div>` +
      helpersHTML(o.helpers) + `<div class="row" style="margin-top:.7rem"><button class="btn" id="toS4">이 일손으로 공고 작성 → A</button></div></div><div>` +
      stageList(o.stages) +
      `<h3>이 자리 · 이 아이템에서 고려할 점</h3><ul>${(o.consider || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>${supBox('pre', 'design')}</div></div>`;
    wireCrumbs();
    $('#toS4').onclick = () => { S.postSrc = 'prep'; go('post'); };
    const b = $('#askPrep'); if (b) b.disabled = false;
  }
  const DR = 150; // (나)는 반경 150m 고정
  const diagKey = () => `diag:${pid(S.diagPoint)}:${DR}`;
  function diagFacts(p) {
    const f = C.facts(p, DR), sf = C.subFacts(p, DR, EX.oldOwner.biz);
    return { 반경미터: DR, 반경안_영업중_업소수: f.반경안_영업중_업소수, 반경안_사라진업소수: f.반경안_사라진업소수, 반경안_새로생긴업소수: f.반경안_새로생긴업소수, 같은업종: sf };
  }
  function diagPrompt(p, worry) {
    const df = diagFacts(p), shop = (chatState('old').ans[0]) || `업종 ${EX.oldOwner.biz}, 운영 ${EX.oldOwner.years}`;
    return `동성로에서 이미 장사하는 사장님의 고민을 경영 과제로 진단한다.\n[계산값] ${JSON.stringify(df)}\n` +
      `[사장님이 말한 가게] ${shop}\n[사장님이 적은 고민] ${worry}\n\n` +
      `할 일: (1) 고민을 우선순위가 있는 경영 과제 3개로 바꾼다. 각 과제에 사장님 글 중 근거가 된 부분을 그대로 인용하고, 계산값에 근거가 있으면 적고 없으면 「자료 없음 — 사장님과 확인」. 사장님 느낌과 계산값이 다르면 그것도 쓴다. 반경과 동성로 범위의 숫자가 다른 방향이면 둘 다 쓴다. 한 분기 비교만 있으므로 추세를 단정하지 않는다. (2) 대학생 프로젝트로 맡길 「필요한 일손 = 전공 · 업무 분야」 2~3개.\n` +
      `data 에 쓴 숫자는 evidence 에 항목 이름(key, 예: 같은업종.반경안_지금 · 반경안_사라진업소수)과 값으로 모두 적는다.\n` +
      `출력 JSON: {"summary":"한 줄","issues":[{"rank":1,"issue":"과제","owner_said":"사장님 글 인용","data":"계산값 근거","first_step":"첫 단계","evidence":[{"key":"같은업종.반경안_지금","value":0}]}],"helpers":[{"field":"전공 · 업무 분야","task":"학생이 할 일","deliverable":"결과물","weeks":"기간","why":"왜 필요한지"}]}`;
  }
  async function askDiag(p, key) {
    const t = ticket, worry = S.worry;
    $('#diagOut').innerHTML = '<div class="spin">AI가 사장님 글을 과제로 바꾸고 있습니다…</div>';
    const user = diagPrompt(p, worry);
    S.lastPrompt[key] = user;
    const res = await getAI(worry === EX.oldOwner.worry ? key : null, COMMON, user, 'diag');
    if (res.src === 'none') { if (still(t, 'old', '#diagOut')) $('#diagOut').innerHTML = noneMsg(res, worry === EX.oldOwner.worry ? '이 기준점 · 반경' : '고친 고민 글'); const b = $('#askDiag'); if (b) b.disabled = false; return; }
    res.worry = worry; S.diag[key] = res;
    if (still(t, 'old', '#diagOut') && diagKey() === key && S.worry === worry) showDiag(res);
  }
  function showDiag(res) {
    const o = res.out, p = S.diagPoint;
    const allowed = C.numbersIn(diagFacts(p)); allowed.add(String(DR));
    (EX.oldOwner.years.match(/\d+/g) || []).forEach(n => allowed.add(n));
    (res.worry.match(/\d+/g) || []).forEach(n => allowed.add(n));
    const df = diagFacts(p), evs = (o.issues || []).map(i => C.checkEvidence(i.evidence, df)), evAll = evs.flat();
    const pv = (o.issues || []).map(i => C.proseVsEvidence([i.data, i.issue, i.first_step], i.evidence, []));
    const spv = C.proseVsEvidence([o.summary], [], (res.worry.match(/\d+/g) || []));
    const proseBad = [...new Set(pv.flatMap(x => x.bad).concat(spv.bad))];
    const head = checkHead(evAll, proseBad, pv.reduce((a, x) => a + x.total, spv.total), !evAll.length && pv.some(x => x.total));
    if (!S.lastPrompt[diagKey()]) S.lastPrompt[diagKey()] = diagPrompt(p, res.worry);
    $('#diagOut').innerHTML = badge(res) + `<p class="corechip"><span class="src2">1년차 기본 과제</span><b>고객 관리</b> 손님 말 · 후기에서 출발 → 메뉴판 · 온라인 노출</p>` + head + promptBox(diagKey()) + `<p style="margin:.5rem 0"><b>${esc(o.summary)}</b></p><div class="two"><div>` +
      (o.issues || []).map((i, n) => `<div class="rec"><h4>${i.rank}. ${esc(i.issue)}</h4><p><span class="k">사장님 글(예시)</span>「${esc(i.owner_said)}」</p><p><span class="k">자료</span>${esc(i.data)}</p><p><span class="k">첫 단계</span>${esc(i.first_step)}</p>${evHTML(evs[n])}${proseNote(pv[n])}</div>`).join('') + '</div><div>' +
      helpersHTML(o.helpers) + `<div class="row" style="margin-top:.7rem"><button class="btn" id="toS4">이 일손으로 학생 공고 쓰기 → ④</button></div></div></div>`;
    $('#toS4').onclick = () => { S.postSrc = 'diag'; go('post'); };
    const b = $('#askDiag'); if (b) b.disabled = false;
  }

  // ---------- ④ ----------
  const hash = o => { const t = JSON.stringify(o); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  function currentSource() {
    let k, r, kind;
    if (S.postSrc === 'diag') { k = diagKey(); r = S.diag[k]; kind = 'diag'; if (!r || r.worry !== S.worry || r.a0 !== chatState('old').ans[0]) return null; }
    else if (S.postSrc === 'designA') { k = 'designA'; r = S.designA; kind = 'designA'; if (!r) return null; }
    else if (S.postSrc === 'support') {
      const d = S.diag[diagKey()]; if (!d || d.worry !== S.worry || d.a0 !== chatState('old').ans[0]) return null;
      r = { src: d.src, out: { summary: '기존 가게의 지원사업(스마트상점 등) 신청 준비 — 신청은 대표자 본인, 학생은 자료 준비', helpers: SUPHELP } };
      return { key: 'post:support:' + pid(S.diagPoint) + ':' + hash(d.out), pre: d.src === 'pre' ? 'post:support' : null, kind: 'support', res: r };
    }
    else { k = prepKey(); r = k && S.prep[k]; kind = 'prep'; if (!r || r.prof !== S.prof) return null; }
    return { key: 'post:' + k + ':' + hash(r.out), pre: r.src === 'pre' ? 'post:' + k : null, kind, res: r };
  }
  const SKILLS = [...new Set(EX.students.concat([EX.applicant]).flatMap(s => s.skills))];
  function boardHTML() {
    return `<div class="board">${S.approved.map(p => `<div class="item"><b>${esc(p.out.title)}</b> <span class="tag ex">가상 예시</span> <span class="status ok">사장님 승인 · 게시됨</span><small>필요 전공: ${esc((p.out.majors || []).join(', '))} · ${esc(p.out.weeks)}주 · 주 ${esc(p.out.hours_per_week)}시간</small></div>`).join('')}
      ${EX.board.map(p => `<div class="item"><b>${esc(p.title)}</b> <span class="tag ex">가상 예시</span> <span class="status ${p.status === '모집 중' ? 'wait' : 'ok'}">${esc(p.status)}</span><small>필요 전공: ${esc(p.majors.join(', '))} · ${esc(p.period)}</small></div>`).join('')}</div>`;
  }
  const SUPHELP = [
    { field: '경영', task: '스마트상점 공고 · 첨부(지원금액 표 · 제외 업종)를 읽고 신청 조건 점검표 · 사업계획서 초안 만들기', deliverable: '조건 점검표, 사업계획서 초안', weeks: '6주', why: '사장님이 지원사업이 있는 줄도 몰랐고 서류 준비 시간이 없습니다.' },
    { field: '컴퓨터공학', task: '키오스크 · 테이블 주문 · 예약 S/W 비교표와 설치 뒤 사용법 정리', deliverable: '도입 기술 비교표, 사용법 한 장', weeks: '6주', why: '무엇을 도입할지 정해야 신청서를 쓸 수 있습니다.' }
  ];
  const postFlow = () => S.postSrc === 'diag' || S.postSrc === 'support' ? ['old', 3] : S.postSrc === 'designA' ? ['newA', 3] : ['newB', 3];
  VIEW.post = function step4() {
    const src = currentSource(), [fl, fi] = postFlow();
    if (!src) { page(`<div class="grid g5"><div class="card"><h2>먼저 갈래를 골라 AI 진단 · 필요한 일손을 받으세요</h2><button class="btn" data-go="home">처음 화면으로</button></div><div class="card"><h2>학생 과제 게시판</h2>${boardHTML()}</div></div>`); return; }
    const isOk = S.approved.some(p => p.key === src.key);
    page(bar(fl, isOk ? fi + 1 : fi) + `<div class="grid g5">
      <div class="card ai"><h2><span class="src2 ai">AI</span>학생용 과제 공고문 <span class="tag ex">가상 가게</span></h2><div id="postOut"></div></div>
      <div class="card"><h2>학생 과제 게시판</h2><p class="note"><span class="src2 hu">사람</span>사장님이 승인한 공고만 게시됩니다.</p>${boardHTML()}
        ${isOk ? '<div class="row" style="margin-top:.6rem"><button class="btn" id="toStu">학생 화면에서 이 공고 보기 →</button><button class="btn ghost" id="toS5">사장님: 지원자 추천 보기</button></div>' : ''}</div></div>`);
    if ($('#toS5')) { $('#toS5').onclick = () => { S.postSel = src.key; go('apply'); }; $('#toStu').onclick = () => go('student'); }
    if (S.post[src.key]) showPost(src); else askPost(src, '');
  }
  async function askPost(src, revise) {
    const t = ticket;
    $('#postOut').innerHTML = '<div class="spin">AI가 공고문을 쓰고 있습니다…</div>';
    const o = src.res.out;
    const where = src.kind === 'prep' ? `동성로 빈 점포(${short(S.cand.addr)} 부근)에 「${S.item.biz}」 개업을 준비하는 예비 사장님` :
      src.kind === 'designA' ? `동성로에 「${(S.classA && S.classA.out.biz) || '디저트 가게'}」 개업을 준비하는 예비 사장님(아이템 보유)` :
      `동성로(${short(S.diagPoint.addr)} 부근)의 기존 가게 — 사장님 말: 「${(S.chats.old && S.chats.old.ans[0]) || ''}」`;
    const meet = src.kind === 'diag' || src.kind === 'support' ? (S.chats.old && S.chats.old.ans[2]) || '' : src.kind === 'designA' ? (S.chats.newA && S.chats.newA.ans[4]) || '' : '';
    const user = `대학생이 지원할 과제 공고문을 쓴다.\n[가게] ${where}\n[AI 진단 요약] ${o.summary}\n[필요한 일손] ${JSON.stringify(o.helpers)}\n[학생 역량 이름 목록] ${SKILLS.join(', ')}\n${meet ? '[사장님이 말한 만날 수 있는 때 · 바라는 점] ' + meet + '\n' : ''}${revise ? '[사장님 수정 요청] ' + revise + '\n' : ''}\n` +
      `할 일: 학생이 읽고 바로 지원을 정할 수 있게 쓴다. 지원 조건에 「4인 팀 중 ○○ 담당 1자리」 「연계 교과(학점) · 지도교수 검수」를 넣는다. 가게 이름 · 사장님 개인정보는 쓰지 않는다. 활동비 · 학점은 금액을 만들지 말고 「시범 사업 운영 기준에 따름」. 한 학기(16주) 안의 과제.\n` +
      `출력 JSON: {"title":"공고 제목","store":"가게 소개 1~2문장","why":"이 과제가 필요한 이유","tasks":["학생이 할 일"],"majors":["전공 이름 짧게(예: 시각디자인, 경영)"],"keywords":["역량 이름 목록에서 고른 것 3~6개"],"weeks":16,"hours_per_week":8,"deliverables":["결과물"],"qualify":["지원 조건"],"meet":"만날 수 있는 때(평일 오후 · 주말 등, 모르면 빈칸)","support":"활동비 · 학점: 시범 사업 운영 기준에 따름"}`;
    const usePre = !revise && (src.res.src === 'pre' || !live()) && (!['diag', 'support'].includes(src.kind) || meet === EX.chatOld[2].ex) && (src.kind !== 'designA' || meet === EX.chatA[4].ex);
    const res = await getAI(usePre ? src.pre : null, COMMON, user, 'post');
    if (res.src === 'none') { if (still(t, 'post', '#postOut')) $('#postOut').innerHTML = noneMsg(res, revise ? '수정 요청 반영' : '이 공고'); return; }
    S.post[src.key] = res;
    if (still(t, 'post', '#postOut')) showPost(src);
  }
  function showPost(src) {
    const res = S.post[src.key], o = res.out, isOk = S.approved.some(p => p.key === src.key);
    $('#postOut').innerHTML = badge(res) + `<div class="post" style="margin-top:.6rem"><h3>${esc(o.title)}</h3>
      <p style="margin:.2rem 0">${esc(o.store)}</p><p style="margin:.2rem 0" class="note">${esc(o.why)}</p>
      <dl><dt>할 일</dt><dd><ul>${(o.tasks || []).map((t, i) => { const h = (src.res.out.helpers || [])[i]; return `<li>${esc(t)}${h && h.weeks && (src.res.out.helpers || []).length === o.tasks.length ? ` <span class="note">(${esc(h.weeks)})</span>` : ''}</li>`; }).join('')}</ul></dd>
      <dt>필요 전공</dt><dd>${(o.majors || []).map(m => `<span class="tag">${esc(m)}</span>`).join('')}</dd>
      <dt>필요 역량</dt><dd>${(o.keywords || []).map(m => `<span class="tag">${esc(m)}</span>`).join('')}</dd>
      <dt>기간 · 시간</dt><dd>한 학기(${esc(o.weeks)}주) 안 · 주 ${esc(o.hours_per_week)}시간${o.meet ? ' · 만남: ' + esc(o.meet) : ''}</dd>
      <dt>결과물</dt><dd>${esc((o.deliverables || []).join(' / '))}</dd>
      <dt>지원 조건</dt><dd>${esc((o.qualify || []).join(' / '))}</dd>
      <dt>지원</dt><dd>${esc(o.support)}</dd></dl></div>
      ${isOk ? '<div class="done">✓ 사장님 승인 완료 — 게시판에 올라갔습니다 (가상 예시)</div>' :
        `<div class="row" style="margin-top:.7rem"><button class="btn ok two" id="approve">사장님 승인하고 게시<small>학생 게시판에 올라갑니다</small></button><button class="btn ghost two" id="revBtn">고쳐 달라고 하기<small>AI가 다시 씁니다(실시간 연결 때)</small></button></div>
        <div id="revBox" class="hidden"><textarea id="rev" placeholder="예: 주말에는 가게가 바빠서 평일 오후에만 만날 수 있어요"></textarea><button class="btn" id="revGo">AI에게 다시 쓰게 하기</button></div>`}`;
    if (!isOk) {
      $('#approve').onclick = () => { S.approved.unshift({ key: src.key, out: o, pre: res.src === 'pre' ? src.pre : null, kind: src.kind }); VIEW.post(); };
      $('#revBtn').onclick = () => $('#revBox').classList.toggle('hidden');
      $('#revGo').onclick = () => {
        const rv = $('#rev').value.trim(); if (!rv) return;
        if (!live()) { $('#revBox').insertAdjacentHTML('beforeend', '<div class="warn">수정 요청 반영은 실시간 AI 연결 때만 됩니다.</div>'); return; }
        delete S.post[src.key]; askPost(src, rv);
      };
    }
  }

  // ---------- ⑤ ----------
  VIEW.apply = function step5() {
    if (!S.approved.length) { page(`<div class="card"><h2>먼저 사장님이 승인한 공고가 있어야 합니다</h2><button class="btn" data-go="home">처음 화면으로</button></div>`); return; }
    if (!S.postSel || !S.approved.some(p => p.key === S.postSel)) S.postSel = S.approved[0].key;
    const post = S.approved.find(p => p.key === S.postSel).out;
    const scored = S.students.map(s => ({ s, sc: C.matchScore(s, post) })).sort((a, b) => b.sc.total - a.sc.total);
    const hasApp = S.students.some(s => s.id === EX.applicant.id);
    const ap = S.approved.find(p => p.key === S.postSel);
    const mk = `match:${S.postSel}`, preMk = ap.pre ? 'match:' + ap.pre : null, sig = S.students.map(s => s.id).join(',');
    const cached = S.match[mk] && S.match[mk].sig === sig;
    const apk = S.approved.find(p => p.key === S.postSel), afl = apk && (apk.kind === 'diag' || apk.kind === 'support') ? ['old', 5] : apk && apk.kind === 'designA' ? ['newA', 5] : ['newB', 5];
    page(bar(afl[0], afl[1]) + `<div class="grid g5">
      <div class="card"><h2>학생 지원 <span class="tag ex">가상 학생</span></h2>
        <div class="field"><span>공고</span><select id="ps" title="${esc(post.title)}">${S.approved.map(p => `<option value="${esc(p.key)}" ${p.key === S.postSel ? 'selected' : ''}>${esc(p.out.title)}</option>`).join('')}</select></div>
        <h3>새 지원서</h3>
        <div class="field"><span>이름(가명) · 전공</span><div class="row"><input type="text" id="an" style="flex:1" placeholder="학생 J"><input type="text" id="am" style="flex:1.4" placeholder="관광경영학과"></div></div>
        <div class="field"><span>역량 (쉼표로)</span><input type="text" id="as" placeholder="고객 응대, 설문 조사"></div>
        <div class="field"><span>주당 가능 시간 · 요일</span><div class="row"><input type="number" id="ah" style="flex:.6" placeholder="12"><input type="text" id="aw" style="flex:1.4" placeholder="평일 오후 · 주말"></div></div>
        <div class="row"><button class="btn ghost" id="fill" ${hasApp ? 'disabled' : ''}>예시로 채우기</button><button class="btn" id="apply">지원하기</button></div><div id="applyMsg"></div>
        <h3><span class="src2">규칙</span>지원한 학생 ${S.students.length}명 — 규칙 점수</h3>
        <p class="note">전공 일치 40 + 역량 겹침(1개 10, 최대 40) + 가능 시간 20(공고의 만남 요일과 맞을 때) = 100점</p>
        ${scored.map(({ s, sc }) => `<div class="st"><div><b>${(scored.filter(x => x.sc.total === sc.total).length > 1 ? '공동 ' : '') + (1 + scored.filter(x => x.sc.total > sc.total).length)}위. ${esc(s.name)}</b> · ${esc(s.major)} ${s.year}학년 · 주 ${s.hours}시간(${esc(s.when)})<br><small>${esc(s.skills.join(', '))}${sc.hit.length ? ' — 겹침: ' + esc(sc.hit.join(', ')) : ''}</small></div><div class="score">${sc.total}점<br><small>${sc.major}+${sc.skill}+${sc.time}</small></div></div>`).join('')}
      </div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>지원자 추천 → <span class="src2 hu">사람</span>담당자 최종 확인</h2>
        <p class="note">규칙 점수는 전공 · 낱말이 맞는지만 봅니다. AI는 공고의 할 일 · 결과물과 학생 역량 · 시간을 같이 읽고 후보 3명과 이유를 냅니다. 결정은 담당자가 합니다.</p>
        <div id="mOut">${cached ? '' : '<button class="btn" id="askM">AI 지원자 추천 받기</button>'}</div></div></div>`);
    $('#ps').onchange = e => { S.postSel = e.target.value; ticket++; VIEW.apply(); };
    $('#fill').onclick = () => { const a = EX.applicant; $('#an').value = a.name; $('#am').value = a.major; $('#as').value = a.skills.join(', '); $('#ah').value = a.hours; $('#aw').value = a.when; };
    $('#apply').onclick = () => {
      const name = $('#an').value.trim(), major = $('#am').value.trim(), skills = $('#as').value.split(',').map(x => x.trim()).filter(Boolean);
      if (!name || !major || !skills.length) { $('#applyMsg').innerHTML = '<p class="numbad">이름 · 전공 · 역량을 채워 주세요.</p>'; return; }
      if (S.students.some(s => s.name === name)) { $('#applyMsg').innerHTML = '<p class="numbad">같은 이름의 지원자가 이미 있습니다.</p>'; return; }
      const a = EX.applicant, isEx = name === a.name && major === a.major;
      S.students.push({ id: isEx ? a.id : 'U' + (S.students.length + 1), name, major, year: isEx ? a.year : 3, skills, hours: Math.max(0, Math.min(40, +$('#ah').value || 0)), when: $('#aw').value.trim() || '-' });
      delete S.confirmed[mk]; ticket++; VIEW.apply();
    };
    if (cached) showMatch(mk, scored); else $('#askM').onclick = e => { e.target.disabled = true; askMatch(mk, preMk, post, scored, sig); };
  }
  async function askMatch(mk, preMk, post, scored, sig) {
    const t = ticket;
    $('#mOut').innerHTML = '<div class="spin">AI가 지원서를 읽고 있습니다…</div>';
    const user = `과제 공고와 지원한 학생을 보고 매칭 후보 3명을 추천한다.\n[공고] ${JSON.stringify(post)}\n[지원 학생 + 규칙 점수] ${JSON.stringify(scored.map(x => Object.assign({}, x.s, { rule_score: x.sc.total })))}\n\n` +
      `할 일: 점수만 따르지 말고 공고의 할 일 · 결과물과 학생 역량 · 시간을 같이 본다. 세 명이 서로 다른 일을 맡아 한 팀이 되게 고른다. 각 후보에 이유, 아쉬운 점, 첫 만남에서 확인할 것을 쓴다. 학생 id는 목록의 id를 그대로 쓴다.\n` +
      `출력 JSON: {"ranked":[{"id":"S01","why":"이유","gap":"아쉬운 점","ask":"첫 만남에서 확인할 것"}],"note":"담당자에게 한 줄"}`;
    const custom = S.students.filter(s => s.id.startsWith('U'));
    const res = await getAI(preMk, COMMON, user, 'match');
    if (res.src === 'none') { if (still(t, 'apply', '#mOut')) $('#mOut').innerHTML = noneMsg(res, '이 공고'); return; }
    // 미리 생성 결과는 예시 학생 9명 기준 순위 — 지금 지원한 학생만 남긴다
    if (res.src === 'pre') {
      const inPre = res.out.ranked.map(r => r.id);
      const present = res.out.ranked.filter(r => S.students.some(s => s.id === r.id));
      res.out = Object.assign({}, res.out, { ranked: present.slice(0, 3), later: present.slice(3) });
      res.custom = S.students.filter(s => !inPre.includes(s.id) && (s.id.startsWith('U') || s.id === EX.applicant.id)).map(s => s.name);
    } else res.custom = [];
    res.sig = sig; S.match[mk] = res;
    if (still(t, 'apply', '#mOut') && mk === 'match:' + S.postSel && sig === S.students.map(s => s.id).join(',')) showMatch(mk, scored);
  }
  function showMatch(mk, scored) {
    const res = S.match[mk], o = res.out, conf = S.confirmed[mk];
    $('#mOut').innerHTML = badge(res) + (res.custom && res.custom.length ? `<p class="note">새로 지원한 학생(${esc(res.custom.join(', '))})은 미리 만들어 둔 답에 없어 왼쪽 규칙 점수로만 보입니다. 실시간 연결 때는 AI가 함께 봅니다.</p>` : '') +
      (o.ranked || []).map((r, i) => {
        const s = S.students.find(x => x.id === r.id) || { name: r.id, major: '?' };
        const ri = scored.findIndex(x => x.s.id === r.id), sc = scored[ri];
        const rr = sc ? 1 + scored.filter(x => x.sc.total > sc.sc.total).length : 0, tie = sc ? scored.filter(x => x.sc.total === sc.sc.total).length > 1 : false;
        const rl = (tie ? '공동 ' : '') + rr + '위';
        const moved = !sc ? '' : rr === i + 1 ? `<span class="tag">규칙 점수 ${rl}와 같은 자리</span>` : rr > i + 1 ? `<span class="tag up">규칙 점수 ${rl} → AI ${i + 1}위로 올림</span>` : `<span class="tag">규칙 점수 ${rl} → AI ${i + 1}위</span>`;
        return `<div class="rec"><h4>${i + 1}. ${esc(s.name)} · ${esc(s.major)} <span class="note">(규칙 점수 ${sc ? sc.sc.total : '-'}점)</span> ${moved}</h4>
        <p><span class="k">이유</span>${esc(r.why)}</p><p><span class="k">아쉬운 점</span>${esc(r.gap)}</p><p><span class="k">첫 만남 확인</span>${esc(r.ask)}</p>
        ${conf ? (conf === r.id ? '<div class="done">✓ 담당자 최종 확인 · 지도교수 승인 — 매칭 확정 (가상 예시)</div>' : '') : `<button class="btn ok two conf" data-id="${esc(r.id)}">담당자 최종 확인<small>지도교수 승인 뒤 첫 만남 안내</small></button>`}</div>`;
      }).join('') + (o.later && o.later.length ? `<div class="later"><b>AI가 뒤로 둔 학생</b>${o.later.map(r => { const s2 = S.students.find(x => x.id === r.id) || { name: r.id }; const sc2 = scored.find(x => x.s.id === r.id); return `<p>${esc(s2.name)} (규칙 ${sc2 ? sc2.sc.total : '-'}점) — ${esc(r.gap)}</p>`; }).join('')}</div>` : '') + (o.note ? `<p class="note">${esc(o.note)}</p>` : '') +
      (conf ? `<div class="done">매칭 확정: 사장님 · 학생에게 첫 만남 안내 (시연에서는 실제로 보내지 않음)<br>→ 한 학기 프로젝트(8주 중간 점검: 지도교수 · 전담 인력) → 결과물 인수인계 · 학기 말 평가(사장님 · 지도교수)</div>` : '');
    document.querySelectorAll('.conf').forEach(b => b.onclick = () => { S.confirmed[mk] = b.dataset.id; showMatch(mk, scored); });
  }

  // ======================= 새 화면 (미영 스케치) =======================
  // ---------- 대화 묶음: 질문은 정해진 순서, 답을 읽고 정리 · 분류 · 설계는 AI ----------
  function chatState(name) { return S.chats[name] || (S.chats[name] = { ans: [] }); }
  const qText = q => q.ai ? ((S.classA && S.classA.out.ask) || '') : q.q;
  const qBubble = q => q.ai ? `<div class="msg ai gen"><span class="who">AI 질문</span>${esc(qText(q))}</div>` : `<div class="msg ai"><span class="who q">질문</span>${esc(q.q)}</div>`;
  function chatHTML(name, script, upto, busy) {
    const st = chatState(name), n = Math.min(st.ans.length, upto);
    let h = '<div class="chat">';
    for (let i = 0; i < n; i++) h += qBubble(script[i]) + `<div class="msg me">${esc(st.ans[i])}</div>`;
    if (n < upto && !busy) {
      const q = script[n];
      h += qBubble(q) + `
<div class="chips">${q.ex && st.ans.every((x, i) => x === script[i].ex) ? `<button class="chip ex" data-chat="${name}" data-ex="1"><span class="tag ex">예시 답</span> ${esc(q.ex)}</button>` : ''}</div>
        <form class="askform" data-chat="${name}"><input type="text" placeholder="직접 입력"><button class="btn">보내기</button></form>`;
    }
    if (busy) h += '<div class="msg ai"><span class="who">AI</span><span class="spin">답을 읽고 정리하는 중…</span></div>';
    return h + '<p class="note">「질문」은 정해진 질문, 「AI 질문」은 답을 읽고 AI가 만든 질문입니다. 분류 · 진단 · 설계는 AI가 합니다.</p></div>';
  }
  function wireChat(name, script, onAnswer) {
    document.querySelectorAll(`[data-chat="${name}"]`).forEach(el => {
      const st = chatState(name), q = script[st.ans.length];
      if (el.tagName === 'FORM') el.onsubmit = e => { e.preventDefault(); const v = el.querySelector('input').value.trim(); if (v) { st.ans.push(v); onAnswer(); } };
      else el.onclick = () => { if (q) { st.ans.push(q.ex); onAnswer(); } };
    });
  }
  const isEx = (name, script, upto) => { const st = chatState(name); for (let i = 0; i < upto; i++) if (st.ans[i] !== script[i].ex) return false; return true; };
  function resetChat(name, from) { const st = chatState(name); st.ans = st.ans.slice(0, from); }

  // ---------- 첫 화면 ----------
  function route(text) {
    const t = text.replace(/\s/g, '');
    if (/학생|학과|전공|경력|지원하|포트폴리오|인턴/.test(t)) return 'student';
    if (/이용방법|어떻게쓰|사용법/.test(t)) return 'howto';
    if (/년째|하고있|운영중|손님이|매출|장사|우리가게/.test(t)) return 'old';
    if (/상권|어디에|자리부터|지도|빈점포|빈가게|위치부터/.test(t)) return 'nbMap';
    if (/열고|열어|창업|차리|개업|아이템|해볼까|하나할까|하고싶/.test(t)) return 'newA';
    return null;
  }
  VIEW.home = function () {
    const m = D.meta;
    page(`<section class="home">
      <div class="hl">
        <p class="kicker">대구 동성로 · 빈 점포와 가게 일을 대학생 직무 경험으로 잇습니다</p>
        <h1>동성로에서 무엇을 하려고 하세요?</h1>
        <p class="lead">하고 싶은 말을 그대로 적으면 AI가 맞는 길로 안내합니다. 아래 네 길 중 하나를 바로 골라도 됩니다.</p>
        <form id="homeAsk" class="homeask"><span class="q">Q</span><input id="homeQ" type="text" placeholder="예: 동성로에 디저트 가게를 열고 싶어요 / 우리 가게 손님이 줄었어요"><button class="btn">물어보기</button></form>
        <div class="exq"><span class="exl">예시</span>${EX.homeEx.map((e, i) => `<button class="chip ex" data-hx="${i}">${esc(e.t)}</button>`).join('')}</div>
        <div id="homeMsg"></div>
        <ol class="ways">
          <li><button class="door" data-go="newSel"><span class="pill">1</span><span class="wt"><b>가게를 새로 열려는 분</b><small>아이템이 있거나, 상권부터 보고 싶을 때. 창업 설계를 거쳐 학생 공고까지</small></span><span class="go">시작</span></button></li>
          <li><button class="door" data-go="old"><span class="pill">2</span><span class="wt"><b>이미 가게를 하는 분</b><small>가게 고민을 말하면 과제와 필요한 일손으로 바꿉니다</small></span><span class="go">시작</span></button></li>
          <li><button class="door" data-go="student"><span class="pill">3</span><span class="wt"><b>학생</b><small>전공 · 관심 분야로, 알바가 아니라 경력이 되는 공고를 찾습니다</small></span><span class="go">시작</span></button></li>
          <li class="minor"><button class="door" data-go="howto"><span class="pill">?</span><span class="wt"><b>이용 방법</b><small>무엇을 AI가 하고 무엇을 계산으로 하는지</small></span><span class="go">보기</span></button></li>
        </ol>
      </div>
      <aside class="facts">
        <p class="kicker">이번 분기 동성로 <span class="tag real">실제 데이터</span></p>
        <div class="fact"><b>${fmt(m.n_now)}</b><span>영업 중 업소 (지난 분기 ${fmt(m.n_prev)})</span></div>
        <div class="fact"><b>${fmt(m.n_gone)}</b><span>지난 분기에 있다가 사라진 업소</span></div>
        <div class="fact warmth"><b>${fmt(m.n_floor1_open)}</b><span>그중 1층, 같은 층에 새 업소 없음. 먼저 볼 빈 점포 후보 (현장 확인 필요)</span></div>
        <p class="note">소상공인시장진흥공단 상가(상권)정보 2026년 2 · 3분기 비교. 범위: 중구 성내1동 + 도로명 「동성로」</p>
        <p class="note">신규는 창업 설계(C)를 거치고, 기존은 문제 분석에서 바로 공고 작성(A) → 사장님 검토 후 게시(B) → 학생 공고로 이어집니다.</p>
      </aside>
    </section>`);
    const startWith = async text => {
      let v = null, reply = '';
      if (live()) {
        $('#homeMsg').innerHTML = '<div class="spin">AI가 어디로 안내할지 읽는 중…</div>';
        try {
          const r = await callClaude(COMMON, `사용자 첫 말: 「${text}」\n이 사람을 다음 중 하나로 안내한다: newA(가게를 새로 열려는데 아이템이 있음), nbMap(가게를 새로 열려는데 상권 · 자리부터 보고 싶음), old(이미 가게를 운영 중), student(대학생 · 공고를 찾음), howto(사용법 질문). 출력 JSON: {"route":"…","reply":"한 문장 안내"}`, 400, 15000);
          if (['newA', 'nbMap', 'old', 'student', 'howto'].includes(r.out.route)) { v = r.out.route; reply = r.out.reply; }
        } catch (e) { reply = '실시간 연결 실패(' + e.message + ') — 낱말로 길을 찾습니다.'; }
      }
      if (!v) v = route(text);
      if (!v) { $('#homeMsg').innerHTML = `<div class="banner ask"><span class="pill">확인</span> 어느 쪽인지 알기 어려워요 → 아래 네 버튼 중 하나를 눌러 주세요.${reply ? '<br>' + esc(reply) : ''}${!live() ? '<br><span class="note">인터넷 없이 돌 때는 낱말로 길을 안내합니다. 실시간 연결 때는 AI가 문장을 읽고 안내합니다.</span>' : ''}</div>`; return; }
      if (v === 'newA') { resetChat('newA', 0); chatState('newA').ans.push(text); S.classA = null; S.designA = null; }
      if (v === 'old') { resetChat('old', 0); chatState('old').ans.push(text); }
      go(v);
    };
    $('#homeAsk').onsubmit = e => { e.preventDefault(); const t = $('#homeQ').value.trim(); if (t) startWith(t); };
    document.querySelectorAll('[data-hx]').forEach(b => b.onclick = () => {
      const e = EX.homeEx[+b.dataset.hx];
      if (e.go === 'newA') { resetChat('newA', 0); chatState('newA').ans.push(EX.chatA[0].ex); S.classA = null; S.designA = null; }
      if (e.go === 'old') { resetChat('old', 0); chatState('old').ans.push(EX.chatOld[0].ex); }
      if (e.stu) S.stuSel = e.stu;
      go(e.go);
    });
  };

  // ---------- 이용 방법 ----------
  VIEW.howto = function () {
    page(`<div class="flow"><button class="crumb" data-go="home">← 처음 화면</button><span class="fname">이용 방법</span></div>
    <div class="grid g2h">
      <div class="card"><h2>네 입구, 하나의 고리</h2>
        <ol class="steps">
          <li><span class="pill">1</span><b>신규 — 아이템 보유</b>: AI 질의응답 → 창업 분야 분류 → <b>C 창업 설계</b>(동성로 자리 비교 포함) → A → B</li>
          <li><span class="pill">1</span><b>신규 — 상권 기반</b>: 상권 지도 · 자리 분석(빈 점포 후보) → AI 사업 후보 → C → A → B</li>
          <li><span class="pill">2</span><b>기존 사장님</b>: AI 질의응답으로 문제 분석 · 개선안 → 필요한 일손 → A → B</li>
          <li><span class="pill">4</span><b>학생</b>: 전공 · 관심 분야 → 경력이 되는 공고 추천 → 지원</li>
        </ol>
        <div class="banner ok"><span class="pill">A</span> 공고 작성 자동화 — AI가 필요한 일손(전공 · 할 일 · 결과물)을 학생용 공고로 씁니다.</div>
        <div class="banner ok"><span class="pill">B</span> 사장님이 직접 검토 후 게시 — 승인 전에는 올라가지 않습니다. 지원자 추천도 담당자가 최종 확인합니다.</div>
        <div class="banner ok"><span class="pill">C</span> 창업 설계 구체화 — 무엇을 · 어디에 · 무엇부터 준비할지, 혼자 하기 어려운 일은 무엇인지.</div>
      </div>
      <div class="card"><h2>무엇이 AI이고 무엇이 계산인가</h2>
        <table><tr><th>일</th><th>누가</th></tr>
          <tr><td>업소 수 · 업종 분포 · 사라진 업소(두 분기 비교) · 반경 집계</td><td>자동 집계(공공데이터)</td></tr>
          <tr><td>사장님 말 → 과제 · 필요한 일손(전공) · 공고 글 · 사업 후보 · 창업 설계</td><td>AI</td></tr>
          <tr><td>AI가 쓴 근거 숫자가 집계와 맞는지</td><td>자동 대조(항목별 ✓/✗)</td></tr>
          <tr><td>공고 게시 · 매칭 확정</td><td>사람(사장님 · 담당자)</td></tr></table>
        <h3>화면 표시</h3>
        <p><span class="tag real">실제 데이터</span> 소상공인시장진흥공단 상가(상권)정보, ${esc(D.meta.q_prev)} · ${esc(D.meta.q_now)}</p>
        <p><span class="tag pre">AI 답 · 미리 만들어 둠</span> 인터넷 없이 시연할 때 — Claude가 같은 숫자를 받아 미리 작성한 답. 실시간 연결 때는 새로 생성</p>
        <p><span class="tag ex">가상 예시</span> 사장님 · 학생 · 게시판 예시는 가상</p>
        <div class="banner ask"><span class="pill">확인 필요</span> 「빈 점포」는 상가정보에서 사라진 업소로 찾은 <b>후보</b>입니다. 실제 공실 여부는 현장 확인 — 공실 정보 연동은 확장 단계.</div>
        <p class="note">이 판단에 쓰지 않은 자료: 임대료 · 유동 인구 · 카드 매출 → 본 사업에서 연결할 자료.</p>
      </div></div>`);
  };

  // ---------- 신규: 갈래 고르기 ----------
  VIEW.newSel = function () {
    page(`<div class="flow"><button class="crumb" data-go="home">← 처음 화면</button><span class="fname">신규: 가게를 열려는 분</span></div>
    <div class="doors two">
      <button class="door" data-go="newA"><span class="pill">가</span><b>창업 아이템이 있어요</b><small>AI 질의응답 → 창업 분야 분류 → C 창업 설계 → A 공고 → B 게시</small></button>
      <button class="door" data-go="nbMap"><span class="pill">나</span><b>상권부터 보고 싶어요</b><small>동성로 상권 지도 · 자리 분석 → AI 사업 후보 → C → A → B</small></button>
    </div>`);
  };

  // ---------- 신규 (가): 창업 아이템 보유 ----------
  function areaCompare(code) {
    const o = {};
    for (const c of featured) {
      const f = C.facts(c, 150), sf = C.subFacts(c, 150, code) || {}, cf = C.subFacts(c, 150, '카페') || {};
      const top = f.많은업종_상위12[0] || {};
      o[short(c.addr) + ' 부근'] = { 반경_업소수: f.반경안_영업중_업소수, 같은업종_반경: sf.반경안_지금, 같은업종_지난분기: sf.반경안_지난분기, 같은업종_사라짐: sf.반경안_사라짐,
        비슷한업종_반경: sf.반경안_비슷한업종, 카페_반경: cf.반경안_지금, 카페_지난분기: cf.반경안_지난분기, 가장많은업종: top.업종, 가장많은업종_수: top.지금 };
    }
    return o;
  }
  VIEW.newA = function () {
    const sc = EX.chatA, st = chatState('newA'), n = st.ans.length;
    const stage = n < 3 ? 0 : !S.designA ? 1 : 2;
    const upto = n < 3 || !S.classA ? 3 : 5;
    page(bar('newA', stage) + `<div class="grid g3">
      <div class="card"><h2>AI 질의응답 <span class="tag ex">가상 예비 사장님</span></h2>${chatHTML('newA', sc, upto, S.busyA)}
        <button class="btn ghost small" id="resetA">처음부터</button></div>
      <div class="card ai"><div id="classOut">${n < 3 ? '<p class="empty">질문 세 개에 답하면 AI가 창업 분야를 분류합니다.</p>' : ''}</div><div id="designOut"></div></div></div>`);
    wireChat('newA', sc, () => { if (chatState('newA').ans.length === 3) { S.classA = null; S.designA = null; askClassA(); } else if (chatState('newA').ans.length === 5) { S.designA = null; askDesignA(); } else VIEW.newA(); });
    $('#resetA').onclick = () => { ticket++; S.busyA = false; resetChat('newA', 0); S.classA = null; S.designA = null; VIEW.newA(); };
    if (S.classA) showClassA();
    if (S.designA) showDesignA();
    else if (S.classA && n >= 5 && !S.busyA) $('#designOut').innerHTML = noneMsg(S.designErr, '이 답 조합의 창업 설계');
  };
  function classPrompt() {
    const a = chatState('newA').ans;
    return `예비 사장님과의 질의응답이다.\n${EX.chatA.slice(0, 3).map((q, i) => `Q${i + 1}. ${q.q}\nA${i + 1}. ${a[i]}`).join('\n')}\n\n[참고: 동성로 범위 업종별 업소 수]\n${scopeSubTable()}\n\n` +
      `할 일: 이 아이템을 상가정보 업종 중 가장 가까운 것 하나로 분류하고, 함께 비교해야 할 업종 1~2개를 고른다. 아직 정해지지 않아 분류 · 경쟁 업종이 달라질 점을 사장님께 묻는 질문을 하나 만든다.\n` +
      `출력 JSON: {"biz":"아이템 이름(짧게)","field":"대분류 › 묶음 › 업종 형태의 분야","code":"참고 목록의 업종 이름 그대로","why":"이렇게 분류한 이유 1~2문장","near":["함께 볼 업종 이름"],"ask":"사장님께 묻는 질문 한 문장"}`;
  }
  async function askClassA() {
    const t = ticket, snap = chatState('newA').ans.join('|'); S.busyA = true; VIEW.newA();
    const user = classPrompt(); S.lastPrompt.classA = user;
    const res = await getAI(isEx('newA', EX.chatA, 3) ? 'classA' : null, COMMON, user, 'classA');
    if (t !== ticket || chatState('newA').ans.join('|') !== snap) return;
    S.busyA = false;
    if (res.src === 'none') { S.classErr = res; if (still(t, 'newA', '#classOut')) { VIEW.newA(); $('#classOut').innerHTML = noneMsg(res, '이 답 조합의 분야 분류'); } return; }
    S.classA = res; if (still(t, 'newA', '#classOut')) VIEW.newA();
  }
  function showClassA() {
    const o = S.classA.out, sf = D.sub[o.code];
    $('#classOut').innerHTML = `<h2><span class="src2 ai">AI</span>창업 분야 분류</h2>${badge(S.classA)}${promptBox('classA')}
      <div class="banner ai big1"><span class="pill">분류</span> <b>${esc(o.field)}</b> <span class="why">→ ${esc(o.why)}</span></div>
      ${sf ? `<p class="note">자동 집계 — 동성로 범위 「${esc(o.code)}」 지난 분기 ${sf[0]}곳 → 지금 ${sf[1]}곳 (사라짐 ${sf[2]} · 새로 ${sf[3]} · 기록 정리 ${sg(sf[4])})${(o.near || []).map(k => D.sub[k] ? ` / 「${esc(k)}」 ${D.sub[k][0]} → ${D.sub[k][1]}곳` : '').join('')} <span class="tag real">실제 데이터</span></p>` : ''}
      ${chatState('newA').ans.length < 5 ? '<p class="note">왼쪽에서 AI가 분류를 보고 만든 질문과 마지막 질문에 답하면 C 창업 설계로 넘어갑니다.</p>' : ''}`;
  }
  function designPrompt(cmp) {
    const a = chatState('newA').ans, o = S.classA.out;
    return `아이템을 가진 예비 사장님의 창업 설계를 구체화한다.\n[질의응답]\n${EX.chatA.map((q, i) => `Q${i + 1}. ${qText(q)}\nA${i + 1}. ${a[i] || ''}`).join('\n')}\n[분류] ${o.field} (업종: ${o.code})\n` +
      `[계산값: 동성로 세 자리 반경 150m 비교 — 업종 「${o.code}」]\n${JSON.stringify(cmp, null, 1)}\n\n` +
      `할 일: (1) 가게 콘셉트 한 문장. (2) 세 자리 중 하나를 골라 이유 · 위험을 계산값 숫자로 쓰고, 다른 한 곳을 대안으로. 손님층 · 시간대는 단정하지 말고 현장 확인으로. (3) 개업까지 할 일을 시기별로(인허가는 일반 절차 이름만, 모르면 「구청 확인」). (4) 혼자 하기 어려운 일을 「필요한 일손 = 전공 · 업무 분야」 2~3개로.\n` +
      `숫자는 evidence 에 「자리 이름.항목」 key 와 값으로 모두 적는다(예: 「동성로 10-1 부근.같은업종_반경」).\n` +
      `출력 JSON: {"summary":"한 줄","concept":"콘셉트","area":{"pick":"자리 이름","why":"이유","risk":"위험","alt":"대안 자리와 이유"},"stages":[{"when":"시기","items":["할 일"]}],"helpers":[{"field":"전공 · 업무 분야","task":"학생이 할 일","deliverable":"결과물","weeks":"기간","why":"왜"}],"evidence":[{"key":"…","value":0}]}`;
  }
  async function askDesignA() {
    const t = ticket, snap = chatState('newA').ans.join('|'); S.busyA = true; VIEW.newA();
    const cmp = areaCompare(S.classA.out.code), user = designPrompt(cmp); S.lastPrompt.designA = user;
    const res = await getAI(isEx('newA', EX.chatA, 5) && S.classA.src === 'pre' ? 'designA' : null, COMMON, user, 'designA');
    if (t !== ticket || chatState('newA').ans.join('|') !== snap) return;
    S.busyA = false;
    if (res.src === 'none') { S.designErr = res; if (still(t, 'newA', '#designOut')) VIEW.newA(); return; }
    res.cmp = cmp; S.designA = res; if (still(t, 'newA', '#designOut')) VIEW.newA();
  }
  function showDesignA() {
    const r = S.designA, o = r.out, cmp = r.cmp || areaCompare(S.classA.out.code);
    const evs = C.checkEvidence(o.evidence, cmp), pv = C.proseVsEvidence([o.summary, o.concept, o.area.why, o.area.risk, o.area.alt], o.evidence, []);
    $('#designOut').innerHTML = `<h2><span class="src2 ai">AI</span>C 창업 설계 구체화</h2>${badge(r)}${checkHead(evs, pv.bad, pv.total, !evs.length && pv.total)}${promptBox('designA')}
      <p><b>${esc(o.summary)}</b></p><p><span class="k">콘셉트</span>${esc(o.concept)}</p>
      <h3><span class="src2">자동 집계</span>동성로 세 자리 비교 (반경 150m) <span class="tag real">실제 데이터</span></h3>
      <table><tr><th>자리</th><th>같은 업종</th><th>비슷한 업종</th><th>카페</th><th>가장 많은 업종</th></tr>${Object.entries(cmp).map(([k, v]) => `<tr class="${k === o.area.pick ? 'hl' : ''}"><td>${esc(k)}</td><td>${v.같은업종_반경} <span class="note">(지난 ${v.같은업종_지난분기})</span></td><td>${v.비슷한업종_반경}</td><td>${v.카페_반경}</td><td>${esc(v.가장많은업종)} ${v.가장많은업종_수}</td></tr>`).join('')}</table>
      <div class="banner ai"><span class="pill">AI 추천 자리</span> <b>${esc(o.area.pick)}</b> <span class="why">→ ${esc(o.area.why)}</span></div>
      <div class="banner ask"><span class="pill">확인 필요</span> ${esc(o.area.risk)}</div>
      <p class="note">대안: ${esc(o.area.alt)}</p>
      ${evHTML(evs)}
      <div class="two"><div>${helpersHTML(o.helpers)}<div class="row" style="margin-top:.7rem"><button class="btn" id="toPostA">이 일손으로 공고 작성 → A</button></div></div>
      <div>${stageList(o.stages)}${supBox('pre', 'design')}</div></div>`;
    wireCrumbs();
    $('#toPostA').onclick = () => { S.postSrc = 'designA'; go('post'); };
  }

  // ---------- 기존 사장님 ----------
  VIEW.old = function () {
    const sc = EX.chatOld, st = chatState('old'), n = st.ans.length;
    if (n >= 2) S.worry = st.ans[1];
    const key = diagKey(), cache = n >= 2 && S.diag[key] && S.diag[key].worry === S.worry && S.diag[key].a0 === st.ans[0] ? S.diag[key] : null;
    const stage = n < 2 ? 0 : n < 3 ? 1 : 2;
    page(bar('old', stage) + `<div class="grid g3">
      <div class="card"><h2>AI 질의응답 <span class="tag ex">가상 사장님</span></h2>
        <div class="field"><span>가게가 있는 동네 (숫자 집계 기준점)</span><select id="dp">${featured.map(c => `<option value="${c.id}" ${c.id === S.diagPoint.id ? 'selected' : ''}>${esc(short(c.addr))} 부근</option>`).join('')}</select></div>
        ${chatHTML('old', sc, n < 2 || !cache ? 2 : 3, S.busyOld)}
        <button class="btn ghost small" id="resetOld">처음부터</button></div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>문제 분석 · 개선안 · 필요한 일손</h2><div id="diagOut">${n < 2 ? '<p class="empty">질문 두 개에 답하면 AI가 가게 고민을 과제로 바꿉니다.</p>' : ''}</div><div id="oldNext"></div></div></div>`);
    $('#dp').onchange = e => { S.diagPoint = D.cands.find(c => c.id === e.target.value); ticket++; VIEW.old(); };
    $('#resetOld').onclick = () => { ticket++; S.busyOld = false; resetChat('old', 0); VIEW.old(); };
    wireChat('old', sc, () => { const k = chatState('old').ans.length; if (k === 2) { S.worry = chatState('old').ans[1]; askDiagOld(); } else VIEW.old(); });
    if (cache) {
      showDiag(cache);
      const tb = $('#toS4'); if (tb) tb.remove();
      $('#oldNext').innerHTML = (n >= 3 ? `<div class="row" style="margin-top:.8rem"><button class="btn" id="toPostO">이 일손으로 공고 작성 → A</button></div>` :
        '<p class="note">왼쪽 마지막 질문(급한 일 · 만날 수 있는 때)에 답하면 공고 작성으로 넘어갑니다.</p>') +
        supBox('open', 'old') + (n >= 3 ? `<div class="row"><button class="btn ghost" id="toPostSup">신청서 · 사업계획서 준비 → 학생 공고(A)</button><span class="note">신청은 대표자 본인이 — 학생은 준비를 돕습니다(공고가 대리 신청을 제외).</span></div>` : '');
      wireCrumbs();
      const b = $('#toPostO'); if (b) b.onclick = () => { S.postSrc = 'diag'; go('post'); };
      const bs = $('#toPostSup'); if (bs) bs.onclick = () => { S.postSrc = 'support'; go('post'); };
    } else if (n >= 2 && !S.busyOld) $('#diagOut').innerHTML = noneMsg(S.diagErr, '이 가게 · 고민 글');
  };
  async function askDiagOld() {
    const t = ticket, worry = S.worry, key = diagKey(), a0 = chatState('old').ans[0], snap = chatState('old').ans.join('|');
    S.busyOld = true; VIEW.old();
    const user = diagPrompt(S.diagPoint, worry); S.lastPrompt[key] = user;
    const res = await getAI(worry === EX.oldOwner.worry && chatState('old').ans[0] === EX.chatOld[0].ex ? key : null, COMMON, user, 'diag');
    if (t !== ticket || chatState('old').ans.join('|') !== snap) return;   // 그사이 처음부터 · 이동
    S.busyOld = false;
    if (res.src === 'none') { S.diagErr = res; if (still(t, 'old', '#diagOut')) VIEW.old(); return; }
    res.worry = worry; res.a0 = a0; S.diag[key] = res; if (still(t, 'old', '#diagOut')) VIEW.old();
  }

  // ---------- 학생 ----------
  function postPool() {
    const pool = (PRE.__posts || []).map(k => ({ key: k, out: PRE[k], pre: true }));
    for (const a of S.approved) if (!pool.some(p => JSON.stringify(p.out) === JSON.stringify(a.out))) pool.push({ key: a.key, out: a.out, pre: false });
    return pool;
  }
  VIEW.student = function () {
    const all = EX.students.concat([EX.applicant]);
    const sel = all.find(s => s.id === S.stuSel) || null, pool = postPool();
    const scored = sel ? pool.map(p => ({ p, sc: C.matchScore(sel, p.out) })).sort((a, b) => b.sc.total - a.sc.total) : [];
    const rk = sel ? 'stu:' + sel.id + ':' + pool.length : '';
    page(`<div class="flow"><button class="crumb" data-go="home">← 처음 화면</button><span class="fname">학생: 경력이 되는 공고 찾기</span></div>
    <div class="grid g3">
      <div class="card"><h2>나는 어떤 학생? <span class="tag ex">가상 학생</span></h2>
        <div class="chips">${all.map(s => `<button class="chip ${sel && sel.id === s.id ? 'on' : ''}" data-stu="${s.id}">${sel && sel.id === s.id ? '✓ ' : ''}${esc(s.name)} · ${esc(s.major)}</button>`).join('')}</div>
        ${sel ? `<div class="prof"><b>${esc(sel.name)} · ${esc(sel.major)} ${sel.year}학년</b><br>관심 · 역량: ${esc(sel.skills.join(', '))}<br>주 ${sel.hours}시간 · ${esc(sel.when)}</div>` : '<p class="empty">학생을 고르면 지금 게시된 공고 중 경력이 될 만한 것을 추천합니다.</p>'}
        <div class="banner ok"><span class="pill">약속</span> 단순 알바가 아니라 <b>원하는 직무의 경력</b>이 되는 공고 — 할 일 · 결과물 · 배우는 것이 공고에 적혀 있습니다.</div>
        ${sel ? `<h3>게시된 공고 ${pool.length}개 — 규칙 점수</h3><p class="note">「시연용 기존 게시」 = 미리 올라 있는 가상 가게 공고 · 「이번에 게시」 = 이 시연에서 사장님이 승인한 공고</p>${scored.map(x => `<div class="st"><div><b>${esc(x.p.out.title)}</b> <span class="tag ${S.approved.some(a => JSON.stringify(a.out) === JSON.stringify(x.p.out)) ? 'up' : 'ex'}">${S.approved.some(a => JSON.stringify(a.out) === JSON.stringify(x.p.out)) ? '이번에 게시' : '시연용 기존 게시'}</span><br><small>필요 전공: ${esc((x.p.out.majors || []).join(', '))}${x.sc.hit.length ? ' — 겹침: ' + esc(x.sc.hit.join(', ')) : ''}${x.sc.dayOk === false ? ' — 만남 요일 안 맞음' : ''}</small></div><div class="score">${x.sc.total}점</div></div>`).join('')}` : ''}
      </div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>공고 추천 — 왜 경력이 되나</h2><div id="stuOut">${sel ? `<button class="btn" id="askStu">AI에게 공고 추천 받기</button>${!live() && !hasPre(rk) ? '<p class="note">이 학생은 미리 만들어 둔 답이 없어 실시간 연결 때만 나옵니다 (학생 A · B · D는 있음).</p>' : ''}` : ''}</div></div></div>`);
    document.querySelectorAll('[data-stu]').forEach(b => b.onclick = () => { S.stuSel = b.dataset.stu; ticket++; VIEW.student(); });
    if (sel) { if (S.stuRec[rk]) showStu(rk, pool); else $('#askStu').onclick = e => { e.target.disabled = true; askStu(sel, pool, scored, rk); }; }
  }
  async function askStu(sel, pool, scored, rk) {
    const t = ticket;
    $('#stuOut').innerHTML = '<div class="spin">AI가 공고를 읽고 있습니다…</div>';
    const user = `대학생에게 지금 게시된 가게 과제 공고 중 「단순 알바가 아니라 원하는 직무의 경력이 되는」 공고를 추천한다.\n[학생] ${JSON.stringify(sel)}\n[공고 + 규칙 점수] ${JSON.stringify(scored.map(x => ({ id: x.p.key, title: x.p.out.title, tasks: x.p.out.tasks, majors: x.p.out.majors, deliverables: x.p.out.deliverables, meet: x.p.out.meet || '', rule_score: x.sc.total })))}\n\n` +
      `할 일: 2~3개를 골라, 각 공고가 어떤 직무 경력이 되는지(직무 이름), 포트폴리오에 남는 결과물, 배우는 것, 주의할 점(시간 · 요일 등)을 쓴다. 공고 id 는 그대로 쓴다.\n` +
      `출력 JSON: {"picks":[{"post":"공고 id","job":"직무 이름","career":"경력이 되는 이유","output":"포트폴리오에 남는 것","learn":"배우는 것","care":"주의할 점"}],"note":"한 줄"}`;
    const res = await getAI(rk, COMMON, user, 'stu');
    if (res.src === 'none') { if (still(t, 'student', '#stuOut')) $('#stuOut').innerHTML = noneMsg(res, '이 학생'); return; }
    S.stuRec[rk] = res; if (still(t, 'student', '#stuOut') && S.stuSel === sel.id) showStu(rk, pool);
  }
  function showStu(rk, pool) {
    const res = S.stuRec[rk], o = res.out;
    $('#stuOut').innerHTML = badge(res) + (o.picks || []).filter(p => pool.some(x => x.key === p.post)).map((p, i) => {
      const post = pool.find(x => x.key === p.post).out;
      return `<div class="rec"><h4>${i + 1}. ${esc(post.title)}</h4>
        <div class="banner ai"><span class="pill">직무</span> <b>${esc(p.job)}</b> <span class="why">→ ${esc(p.career)}</span></div>
        <p><span class="k">남는 결과물</span>${esc(p.output)}</p><p><span class="k">배우는 것</span>${esc(p.learn)}</p>
        ${p.care ? `<p><span class="k">주의</span>${esc(p.care)}</p>` : ''}
        <p class="note">${esc(post.store)} · 한 학기(${esc(post.weeks)}주) 안 · 주 ${esc(post.hours_per_week)}시간${post.meet ? ' · 만남: ' + esc(post.meet) : ''} <span class="tag ex">가상 가게</span></p>
        <button class="btn ghost applyBtn">지원하기 (시연에서는 보내지 않음)</button></div>`;
    }).join('') + (o.note ? `<p class="note">${esc(o.note)}</p>` : '');
    document.querySelectorAll('.applyBtn').forEach(b => b.onclick = () => { b.outerHTML = '<div class="done">✓ 지원 완료 — 사장님 · 담당자에게 지원서가 갑니다 (가상 예시)</div>'; });
  }

  // ======================= 받을 수 있는 지원 =======================
  const SUPD = window.SUP || { list: [] };
  // 판정: 공고 조건(대상 · 영업 여부 · 구역)과 사장님 상황을 규칙으로 대조. 최종 자격은 공고 기관 판단.
  function judge(sp, sit) {
    if (!sp.who.includes(sit)) return { cls: 'no', label: '지금은 해당 안 됨', why: (sp.whyNot || {})[sit] || '대상이 아님' };
    if (sp.needCheck) return { cls: 'ask', label: '확인 필요', why: sp.check };
    return { cls: 'ok', label: '해당 가능', why: '대상 조건과 맞음 — ' + sp.check + ' 확인' + (sp.closed ? '. 이번 차수는 마감, 다음 차수 공고 확인' : '') };
  }
  function supCard(sp, sit) {
    const j = judge(sp, sit);
    return `<div class="sup ${j.cls}"><div class="suph"><b>${esc(sp.name)}</b><span class="verdict ${j.cls}">${esc(j.label)}</span></div>
      <p class="why">→ ${esc(j.why)}</p>
      <dl><dt>기관</dt><dd>${esc(sp.org)}</dd><dt>대상</dt><dd>${esc(sp.target)}</dd><dt>지원</dt><dd>${esc(sp.what)}</dd>
      <dt>금액</dt><dd>${esc(sp.amount)}</dd><dt>신청</dt><dd>${esc(sp.period)}${sp.closed ? ' <span class="tag pre">마감됨</span>' : ''}</dd>
      <dt>원문</dt><dd><a href="${esc(sp.url)}" target="_blank" rel="noopener">${esc(sp.src)}</a></dd></dl></div>`;
  }
  function supBox(sit, mode) {
    const L = SUPD.list;
    let body = '';
    if (mode === 'area') body = L.filter(s => s.id === 'dsr').map(s => supCard(s, sit)).join('');
    else if (mode === 'design') body = `<h4 class="supg"><span class="otag sup">지원사업 · 개업 전</span> 개업 전 신청</h4>${L.filter(s => s.when === 'before').map(s => supCard(s, sit)).join('')}<h4 class="supg"><span class="otag sup">지원사업 · 개업 후</span> 개업 후 신청</h4>${L.filter(s => s.when === 'after').map(s => supCard(s, sit)).join('')}`;
    else body = L.map(s => supCard(s, sit)).join('');
    return `<div class="supbox"><h3>받을 수 있는 지원 <span class="tag real">실제 공고 · 보도</span> <span class="src2">규칙</span>판정</h3>${body}
      <p class="note">금액은 공고 원문에서 확인한 것만 씁니다 — 조건을 충족하면 받을 수 있는 최대 금액이며, 최종 자격은 공고 기관이 판단합니다. 판정은 공고 조건과 상황을 규칙으로 대조한 것입니다(${esc(SUPD.checked || '')} 확인).</p>
      <p class="note">사업자 등록 뒤에는 「${esc(SUPD.alarm.name)}」(${esc(SUPD.alarm.org)})으로 넘깁니다 — ${esc(SUPD.alarm.what)}.</p>
      <button class="btn ghost small" data-go="supRead">AI가 공고문을 읽는 방법 보기 →</button></div>`;
  }
  // ---------- AI 공고 구조화 장면 ----------
  const normSp = t => String(t || '').replace(/\s+/g, '');
  VIEW.supRead = function () {
    const ex = SUPD.excerpt, key = 'supStruct';
    page(`<div class="flow"><button class="crumb" data-go="home">← 처음 화면</button><span class="fname">AI가 지원사업 공고문을 읽는 방법</span></div>
    <div class="grid g5">
      <div class="card"><h2>공고문 (원문 발췌) <span class="tag real">실제 공고</span></h2>
        <div class="excerpt"><b>${esc(ex.title)}</b>${ex.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
        <p class="note">원문: <a href="${esc(ex.url)}" target="_blank" rel="noopener">${esc(ex.url)}</a> · PDF · HWP 공고도 글자를 뽑아 같은 방식으로 넣습니다.</p>
        <button class="btn" id="askSup">AI에게 공고 정리 받기</button></div>
      <div class="card ai"><h2><span class="src2 ai">AI</span>대상 · 업종 · 업력 · 지역 · 금액 · 마감으로 정리</h2><div id="supOut"><p class="empty">왼쪽 공고문을 AI가 항목별 표로 바꾸고, 예비 사장님 · 영업 중 사장님 각각에 대해 판정합니다. 항목마다 원문 근거 구절을 함께 내고, 화면이 그 구절이 공고문에 정말 있는지 대조합니다.</p></div></div></div>`);
    if (S.supRes) showSup(); else $('#askSup').onclick = async e => {
      e.target.disabled = true; const t = ticket;
      $('#supOut').innerHTML = '<div class="spin">AI가 공고문을 읽고 있습니다…</div>';
      const user = `지원사업 공고문 발췌다.\n${ex.title}\n${ex.lines.join('\n')}\n\n할 일: 대상 · 제외 · 업종 · 업력 · 지역 · 지원 내용 · 금액 · 마감 · 신청 방법을 표로 정리한다. 각 항목에 공고문에서 그대로 가져온 근거 구절(quote)을 붙이고, 공고문에 없으면 value 에 「원문에 없음」, quote 는 빈칸. 금액을 지어내지 않는다. 그다음 「예비 사장님(아직 영업 전)」과 「영업 중 사장님」 각각에 대해 해당 가능 / 지금은 해당 안 됨 / 확인 필요와 이유. 오늘은 2026-11-25.\n` +
        `출력 JSON: {"rows":[{"field":"대상","value":"…","quote":"…"}],"forPre":{"verdict":"…","why":"…"},"forOpen":{"verdict":"…","why":"…"},"check":["사람이 첨부에서 확인할 것"]}`;
      S.lastPrompt[key] = user;
      const res = await getAI(key, COMMON, user, 'supStruct');
      if (res.src === 'none') { if (still(t, 'supRead', '#supOut')) $('#supOut').innerHTML = noneMsg(res, '이 공고문'); return; }
      S.supRes = res; if (still(t, 'supRead', '#supOut')) showSup();
    };
  };
  function showSup() {
    const res = S.supRes, o = res.out, full = normSp(SUPD.excerpt.title + SUPD.excerpt.lines.join(''));
    const rows = (o.rows || []).map(r => ({ ...r, ok: !r.quote || full.includes(normSp(r.quote)) }));
    const bad = rows.filter(r => !r.ok).length, withQ = rows.filter(r => r.quote).length;
    $('#supOut').innerHTML = badge(res) + (bad ? `<div class="numbad">⚠ 근거 구절 ${withQ}개 중 ${bad}개가 공고문에 없음 — 사람이 확인 필요</div>` : `<div class="numok">✓ 근거 구절 ${withQ}개가 모두 공고문에 그대로 있음 (자동 대조)</div>`) + promptBox('supStruct') +
      `<table class="suptab"><tr><th>항목</th><th>AI 정리</th><th>원문 근거</th></tr>${rows.map(r => `<tr><td>${esc(r.field)}</td><td>${esc(r.value)}</td><td class="${r.ok ? 'okq' : 'badq'}">${r.quote ? '「' + esc(r.quote) + '」 ' + (r.ok ? '✓' : '✗') : '—'}</td></tr>`).join('')}</table>
      <div class="banner ai"><span class="pill">영업 중 사장님</span> <b>${esc(o.forOpen.verdict)}</b> <span class="why">→ ${esc(o.forOpen.why)}</span></div>
      <div class="banner ai"><span class="pill">예비 사장님</span> <b>${esc(o.forPre.verdict)}</b> <span class="why">→ ${esc(o.forPre.why)}</span></div>
      ${(o.check || []).length ? `<p class="note">사람이 확인할 것: ${esc(o.check.join(' · '))}</p>` : ''}
      <p class="note">최종 자격은 공고 기관이 판단합니다. 전담 인력이 이 표를 확인한 뒤 사장님께 안내합니다.</p>`;
  }

  // ---------- 설정 ----------
  $('#brand').onclick = () => go('home');
  $('#modeBtn').onclick = () => { $('#apiKey').value = localStorage.getItem('dsr_key') || ''; $('#model').value = modelName(); $('#keyTest').textContent = ''; $('#modal').classList.add('show'); };
  $('#closeModal').onclick = () => $('#modal').classList.remove('show');
  $('#saveCode').onclick = async () => {
    const c = $('#teamCode').value.trim(); if (!c) return;
    localStorage.setItem('dsr_code', c); localStorage.removeItem('dsr_key'); localStorage.setItem('dsr_model', $('#model').value);
    $('#keyTest').textContent = '팀 서버 확인 중…';
    try { const r = await callClaude('', '「확인」 한 낱말로만 답하세요.', 200, 30000); setMode(); $('#keyTest').textContent = '팀 서버 연결 확인됨 (' + r.model + '). 이제 AI 답을 실시간으로 생성합니다.'; }
    catch (e) { localStorage.removeItem('dsr_code'); setMode(); $('#keyTest').textContent = '연결 실패: ' + (e.message || e) + ' — 미리 만들어 둔 답을 계속 씁니다.'; }
  };
  $('#saveKey').onclick = async () => {
    const k = $('#apiKey').value.trim(); if (!k) return;
    $('#keyTest').textContent = '키 확인 중…';
    try {
      const r = await callClaude('', '「확인」 한 낱말로만 답하세요.', 200, 20000, k, $('#model').value);
      localStorage.setItem('dsr_key', k); localStorage.removeItem('dsr_code'); localStorage.setItem('dsr_model', $('#model').value); setMode();
      $('#keyTest').textContent = '연결 확인됨 (' + r.model + '). 이제 AI 답을 실시간으로 생성합니다. 시연이 끝나면 「키 지우기」를 누르세요.';
    } catch (e) { $('#keyTest').textContent = '연결 실패: ' + (e.message || e) + ' — 키를 저장하지 않았습니다. 미리 만들어 둔 답을 계속 씁니다.'; }
  };
  $('#clearKey').onclick = () => { localStorage.removeItem('dsr_key'); localStorage.removeItem('dsr_code'); setMode(); $('#modal').classList.remove('show'); };
  window.__S = S; // 점검용
  setMode(); const v0 = location.hash.slice(1); history.replaceState({ v: VIEW[v0] ? v0 : 'home' }, '', '#' + (VIEW[v0] ? v0 : 'home')); go(VIEW[v0] ? v0 : 'home', true);
  // 시연 추천 점포에 미리 만들어 둔 답이 다 있는지 점검
  const miss = featured.length < 3 ? ['시연 추천 점포를 데이터에서 못 찾음'] : featured.filter(c => !hasPre(`rec:${pid(c)}:150`)).map(c => short(c.addr));
  if (miss.length) document.body.insertAdjacentHTML('afterbegin', `<div class="warn" style="margin:0;border-radius:0">점검: 미리 만들어 둔 답이 빠진 시연 점포 — ${esc(miss.join(', '))} (pregen.js 열쇠 확인)</div>`);
})();
