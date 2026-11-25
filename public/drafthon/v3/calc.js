// 계산 전용 (AI 아님). 브라우저와 node 둘 다에서 돈다.
(function (G) {
  const D = G.DATA;
  const LAT0 = 35.8695, LON0 = 128.5955;
  const L = LAT0 * Math.PI / 180;
  const KY = 111132.92 - 559.82 * Math.cos(2 * L) + 1.175 * Math.cos(4 * L);   // 위도 1도 길이(m)
  const KX = 111412.84 * Math.cos(L) - 93.5 * Math.cos(3 * L);                 // 경도 1도 길이(m)
  // 경위도 -> 기준점에서 미터 (동쪽 +x, 남쪽 +y : SVG 좌표와 같은 방향)
  function xy(p) { return [(p.x - LON0) * KX, -(p.y - LAT0) * KY]; }
  function dist(a, b) { const A = xy(a), B = xy(b); return Math.hypot(A[0] - B[0], A[1] - B[1]); }
  function cnt(arr, key) {
    const m = {}; for (const r of arr) m[r[key]] = (m[r[key]] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  // 점포 c 반경 R미터 계산값
  function facts(c, R) {
    const near = D.active.filter(p => dist(p, c) <= R);
    const nearPrev = D.prev.filter(p => dist(p, c) <= R);
    const goneNear = D.cands.filter(p => dist(p, c) <= R);
    const newNear = near.filter(p => p.n);
    const prevSub = {}; for (const p of nearPrev) prevSub[p.s] = (prevSub[p.s] || 0) + 1;
    const goneSub = {}; for (const p of goneNear) goneSub[p.s] = (goneSub[p.s] || 0) + 1;
    const newSub = {}; for (const p of newNear) newSub[p.s] = (newSub[p.s] || 0) + 1;
    const subs = cnt(near, 's');
    const mids = cnt(near, 'm').slice(0, 12).map(([k, v]) => ({ 묶음: k.trim(), 업소수: v }));
    const top = subs.slice(0, 12).map(([s, n]) => {
      const a = prevSub[s] || 0, g = goneSub[s] || 0, w = newSub[s] || 0;
      return { 업종: s, 지금: n, 지난분기: a, 사라짐: g, 새로생김: w, 기록정리: n - (a - g + w) };
    });
    const same = near.filter(p => p.s === c.s).length;
    const sameScope = D.sub[c.s] || [0, 0, 0, 0, 0];
    return {
      점포: { 번호: c.id, 주소: c.addr, 층: c.f ? c.f + '층' : '층 정보 없음', 직전업종: c.s, 직전업종대분류: c.l,
              같은층새업소: c.filled.length ? c.filled.join(', ') : '없음' },
      반경미터: R,
      기준: D.meta.q_now + ' 영업 중 업소, ' + D.meta.q_prev + '와 비교',
      반경안_영업중_업소수: near.length,
      반경안_지난분기_업소수: nearPrev.length,
      반경안_사라진업소수: goneNear.length,
      반경안_새로생긴업소수: newNear.length,
      반경안_기록정리: near.length - (nearPrev.length - goneNear.length + newNear.length),
      반경안_1층업소수: near.filter(p => p.f === '1').length,
      대분류별: cnt(near, 'l').map(([k, v]) => ({ 대분류: k, 업소수: v })),
      많은업종_상위12: top,
      비슷한업종묶음별_상위12: mids,
      직전업종_반경안_지금: same,
      직전업종_동성로범위: { 지난분기: sameScope[0], 지금: sameScope[1], 사라짐: sameScope[2], 새로생김: sameScope[3], 기록정리: sameScope[4] }
    };
  }
  // 업종 이름 하나에 대한 동성로 범위 · 반경 수치 (AI가 고른 후보 확인용)
  const MID = {}; for (const p of D.active) if (p.m) MID[p.s] = p.m.trim();
  function subFacts(c, R, s) {
    const sc = D.sub[s]; if (!sc) return null;
    const nearA = D.active.filter(p => p.s === s && dist(p, c) <= R);
    const near = nearA.length, nNew = nearA.filter(p => p.n).length;
    const nPrev = D.prev.filter(p => p.s === s && dist(p, c) <= R).length;
    const nGone = D.cands.filter(p => p.s === s && dist(p, c) <= R).length;
    const mid = MID[s], nearMid = mid ? D.active.filter(p => p.m && p.m.trim() === mid && dist(p, c) <= R).length : 0;
    return { 업종: s, 반경안_지금: near, 반경안_지난분기: nPrev, 반경안_사라짐: nGone, 반경안_새로생김: nNew,
             비슷한업종묶음: mid || '', 반경안_비슷한업종: nearMid,
             범위_지난분기: sc[0], 범위_지금: sc[1], 범위_사라짐: sc[2], 범위_새로생김: sc[3], 범위_기록정리: sc[4] };
  }
  // 계산값 안의 숫자 모음 (AI 답 숫자 확인용)
  function numbersIn(obj, set) {
    set = set || new Set();
    const walk = v => {
      if (typeof v === 'number') set.add(String(v));
      else if (typeof v === 'string') (v.match(/\d+(?:\.\d+)?/g) || []).forEach(n => set.add(n));
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(obj); return set;
  }
  function checkNumbers(text, allowed) {
    const found = (text.replace(/,(?=\d{3})/g, '').match(/\d+(?:\.\d+)?/g) || []);
    const bad = [...new Set(found.filter(n => !allowed.has(n) && !allowed.has(String(Number(n)))))];
    return { total: found.length, bad };
  }
  // 학생 - 공고 맞춤 점수 (코드 계산, 100점)
  // 규칙 점수: 전공 40 + 역량 겹침(1개 10, 최대 40) + 가능 시간 20(역량이 1개 이상 겹칠 때만)
  function matchScore(st, post) {
    const core = st.major.replace(/학과|학부|전공|\s/g, '');
    const major = core.length >= 2 && (post.majors || []).some(m => m.replace(/\s|학과|학부|전공/g, '') === core) ? 40 : 0;
    const hit = (post.keywords || []).filter(k => st.skills.some(s => s.length >= 2 && (s === k || (s.length >= 3 && k.includes(s)) || (k.length >= 3 && s.includes(k)))));
    const skill = Math.min(40, hit.length * 10);
    const need = post.hours_per_week || 0;
    // 공고에 만날 때(평일 · 주말)가 있으면 학생 가능 요일이 맞아야 시간 점수
    const m = post.meet || '', w = st.when || '';
    const dayOk = !m || ((!/평일/.test(m) || /평일/.test(w)) && (!/주말/.test(m) || /주말/.test(w)));
    const time = !hit.length || !dayOk ? 0 : st.hours >= need ? 20 : Math.round(20 * st.hours / Math.max(need, 1));
    return { total: major + skill + time, major, skill, time, hit, dayOk };
  }
  G.CALC = { xy, dist, facts, subFacts, numbersIn, checkNumbers, matchScore, cnt };
})(typeof window !== 'undefined' ? window : globalThis);
// 근거 숫자 항목별 대조: evidence=[{key, value}] 를 계산값 객체(평탄화)의 같은 항목과 비교
(function (G) {
  function flat(o, pre, out) {
    out = out || {};
    for (const [k, v] of Object.entries(o || {})) {
      const p = pre ? pre + '.' + k : k;
      if (Array.isArray(v)) {   // 이름 붙은 표: 대분류별 · 많은업종 · 묶음 → 「대분류.소매」 「업종.카페.지금」 「묶음.한식」
        for (const r of v) {
          if (!r || typeof r !== 'object') continue;
          if (r.대분류) out['대분류.' + r.대분류] = r.업소수;
          else if (r.묶음) out['묶음.' + r.묶음] = r.업소수;
          else if (r.업종) for (const [kk, vv] of Object.entries(r)) if (typeof vv === 'number') out['업종.' + r.업종 + '.' + kk] = vv;
        }
      } else if (v && typeof v === 'object') flat(v, p, out);
      else if (typeof v === 'number') out[p] = v;
    }
    return out;
  }
  function checkEvidence(ev, obj) {
    const f = flat(obj);
    return (ev || []).map(e => ({ key: e.key, value: e.value, ok: Object.prototype.hasOwnProperty.call(f, e.key) && Number(f[e.key]) === Number(e.value), truth: f[e.key] }));
  }
  // 문장 속 숫자가 모두 근거 숫자(evidence 값)에 있는지 — 없으면 「근거 없이 쓴 숫자」
  function proseVsEvidence(texts, ev, extra) {
    const vals = new Set((ev || []).map(e => String(Math.abs(Number(e.value))))); (extra || []).forEach(x => vals.add(String(x)));
    // 자리 정보(「반경 150m」 「1층」 「동성로 10-1」 「동성로6길 46」)는 숫자 검사에서 뺀다
    const clean = t => String(t || '').replace(/,(?=\d{3})/g, '').replace(/동성로\s?\d*길?\s?\d+(-\d+)?/g, '').replace(/\d+\s?m(?![a-z가-힣])/g, '').replace(/\d+층/g, '');
    const nums = [].concat(...texts.map(t => (clean(t).match(/\d+(?:\.\d+)?/g) || [])));
    return { total: nums.length, bad: [...new Set(nums.filter(n => !vals.has(String(Number(n)))))] };
  }
  G.CALC.flat = flat; G.CALC.checkEvidence = checkEvidence; G.CALC.proseVsEvidence = proseVsEvidence;
})(typeof window !== 'undefined' ? window : globalThis);
