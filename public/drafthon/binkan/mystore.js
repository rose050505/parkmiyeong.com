// 경영 도우미 「내 가게」 (설계도/경영도우미_설계.md 2판): ① 근처 바람에 답하기 ② 상권 변화 ③ 답한 메뉴 기록 → 운영단 추적
// 숫자는 사이트가 계산하고, AI(assist.js TASKS answer · themes · area)는 문장만 쓴다. AI가 안 되면 「기본 정리」로 끝까지 돈다.
// 읽고 쓰기는 db 묶음 하나로 모았다 — 백엔드가 붙으면 db만 설계서 §5 API로 바꾼다.
(function () {
  const A = window.APP, { st, save, store, SP, M, esc, shortAddr } = A;
  const T = () => window.OWNER.tools;
  const dist = A.dist;   // 위도 35.87° 기준 거리(m) — 빈칸 데이터를 만든 식과 같음
  const LM = Object.entries(M.lm).map(([name, [x, y]]) => ({ name, x, y }));
  const roundDist = m => Math.max(10, Math.round((m || 0) / 10) * 10);
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymd(new Date());   // 기기 시간 기준
  const dayNo = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const SHARE_KEYS = [['open', '영업 여부 (그 달 영업 일수)', true], ['band', '매출 구간 (월 1회 직접 고름)', true], ['answers', '답 수', false], ['sold', '답한 메뉴 판매 일수 · 누적 판매', false], ['came', '바람 보고 온 손님 수', false],
    ['changes', '시험 메뉴에서 바꾼 것 수', false], ['kept', '바꾼 것 가운데 유지한 것 수', false], ['outcome', '시험 결과(정식 메뉴 · 접음)', false]];
  const BANDS = ['월 500만 원 미만', '500만 ~ 1,000만 원', '1,000만 ~ 2,000만 원', '2,000만 ~ 3,000만 원', '3,000만 원 이상'];   // 구간 경계 [가정]
  const STATES = ['준비 중', '판매 중', '끝남'];
  const QL = `${M.meta.q_prev.replace(/\(.*$/, '')} → ${M.meta.q_now.replace(/\(.*$/, '').replace(/^\d+년\s*/, '')}`;   // 「2026년 2분기 → 3분기」
  const CHECKS = ['학생과 함께 첫 답을 올림', '답한 메뉴 기록 2주 [가정]', '사장님 혼자 답 1개 올림', '사용법 한 장 받음'];

  // ---------------- db: 이 묶음만 백엔드 API로 바꾸면 된다 ----------------
  ['mystores', 'went', 'reported', 'seen', 'shows', 'teams', 'visits', 'wants'].forEach(k => { if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {}; });
  if (!Array.isArray(st.answers)) st.answers = [];
  const db = {
    store: uid => st.mystores[uid] || null,                          // GET /stores/me
    stores: () => Object.values(st.mystores),
    putStore(s) { st.mystores[s.uid] = s; save(); },                  // PUT /stores/:id
    answers: () => st.answers,
    answer: id => st.answers.find(a => a.id === id),
    putAnswer(a) { const i = st.answers.findIndex(x => x.id === a.id); if (i >= 0) st.answers[i] = a; else st.answers.push(a); save(); },   // POST /wishes/:id/answers · PATCH /answers/:id
    mark(kind, uid, id, v) { const m = st[kind][uid] || (st[kind][uid] = {}); if (v === undefined) delete m[id]; else m[id] = v; save(); },
    got: (kind, uid, id) => !!(uid && st[kind][uid] && st[kind][uid][id]),
    ownerApps: () => st.ownerApps || [],
    stuApps: () => st.stuApps || [],
  };
  const wishById = id => store.wishes().find(w => w.id === id);
  const appOf = s => s ? db.ownerApps().filter(a => a.uid === s.uid).slice(-1)[0] || null : null;   // 이 가게 사장님이 낸 동행 프로젝트 지원서(가장 최근)
  // 지원서(추적 동의 필수)를 낸 가게는 영업 여부 · 매출 구간이 켜진 것으로 본다 — K4 · 월 집계 · 위험 판정이 모두 이 값을 씀
  const shareOf = s => Object.assign({}, s.share, appOf(s) ? { open: true, band: true } : {});
  // 이 답의 알림을 받는 회원 수: 바람을 쓴 회원 + 공감한 회원(운영팀이 넣어 둔 공감 수는 사람이 아니라 빼고), 답한 가게 사장님은 빼고
  const recipients = (w, ownerUid) => new Set([w.uid].concat(Object.entries(st.likedBy || {}).filter(([u, m]) => m && m[w.id] && u !== '_old').map(([u]) => u)).filter(u => u && u !== ownerUid)).size;

  // ---------------- 화면 상태 (저장 안 함) ----------------
  let ui = { view: 'k', open: null, busy: {}, pending: null, msg: '', extra: new Set(), det: {}, sum: {}, fail: {} };
  const W = document.getElementById('work');
  const keepScroll = fn => { const y = W.scrollTop; fn(); W.scrollTop = y; };
  const rerender = () => keepScroll(() => A.rerender());
  const patch = (id, html) => { const el = document.getElementById(id); if (el) el.outerHTML = html; };
  const typing = () => { const a = document.activeElement; return a && W.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };

  // 지금 화면의 가게: 설정을 마친 내 가게 → 학생 팀으로 초대받은 가게 → 아직 설정 전인 내 가게 순
  function ctx() {
    const u = st.user; if (!u) return { mode: 'none' };
    const mine = db.store(u.id), t = db.stores().find(s => s.uid !== u.id && (s.team.members || []).some(m => m.uid === u.id));
    if (mine && (mine.setup || !t)) return { s: mine, mode: 'owner' };
    if (t) return { s: t, mode: (t.team.members.find(m => m.uid === u.id) || {}).on ? 'team' : 'teamOff' };
    return { mode: 'new' };
  }
  const blank = (uid, o) => ({ id: 's' + uid, uid, owner: st.user ? st.user.name : '', name: '', item: o.item || '', sub: '', pt: null, near: o.near || '', space: o.space || null,
    menus: [{ name: '', price: '' }, { name: '', price: '' }, { name: '', price: '' }], offer: '', perk: '', openDays: [], months: [],
    share: { open: true, band: true, answers: false, sold: false, came: false }, team: { members: [], checks: [false, false, false, false], until: '', handedAt: 0 },
    drafts: {}, themes: null, area: null, setup: false, at: Date.now() });
  const ptOf = s => s.pt || (s.space && SP[s.space]) || LM.find(l => l.name === s.near) || null;   // 찍은 좌표 → 빈칸 → 근처 이름 순
  const placeOf = s => (s.pt && s.pt.label) || (s.space && SP[s.space] ? shortAddr(SP[s.space]) : s.near ? s.near + ' 근처' : '');
  const storeLabel = s => `${s.name || s.item} @ ${placeOf(s)}`;
  const aiTag = ai => T().aiTag(ai);

  function start(opts = {}) {
    ui.busy = {}; ui.msg = ''; ui.extra = new Set(); ui.fail = {};
    const u = st.user; if (!u) return;
    let c = ctx();
    if (c.mode === 'new') {
      // 처음 열면 사장님 흐름(st.owner)에서 업종 · 위치를 이어받는다
      const o = st.owner || {}, inh = o.status === 'open' ? { item: o.item, near: o.near } : o.status === 'pre' && o.space ? { item: o.item, space: o.space } : {};
      db.putStore(blank(u.id, inh)); c = ctx();
    }
    ui.view = c.mode === 'owner' && !c.s.setup ? 'k1' : 'k';
    ui.open = null; ui.pending = opts.wish || null;
    if (c.s) myAnswers(c.s).forEach(x => ui.extra.add(x.wish));   // 내가 답한 바람은 150m 밖이어도 목록에 남김
    if (opts.view && c.mode === 'owner' && c.s.setup) ui.view = opts.view;
    if (c.mode === 'owner' && c.s.setup) { ui.since = c.s.lastSeen || 0; c.s.lastSeen = Date.now(); db.putStore(c.s); }   // 지난번 연 뒤 새로 생긴 회원 바람에 「새 바람」
  }

  // ---------------- 계산 ----------------
  // 근처 바람 목록. 150m 목록 밖이어도 300m 안이면 답할 수 있다 — 가게 카드 · 상권 변화에서 고른 바람(ui.extra)은 뒤에 붙인다
  function nearList(s) {
    const pt = ptOf(s); if (!pt) return { list: [], near: true };
    const r = T().nearWishes(pt, s.item), L = r.list.slice();
    ui.extra.forEach(id => { const w = wishById(id); if (w && !L.some(x => x.w.id === id)) { const m = dist(SP[w.space], pt); if (m <= 300) L.push({ w, m, hit: T().wishMatch(s.item, w), extra: true }); } });
    return { near: r.near, list: L.map((x, i) => Object.assign(x, { n: i + 1 })) };
  }
  const reachable = (s, wid) => { const w = wishById(wid), pt = ptOf(s); return w && pt ? dist(SP[w.space], pt) : Infinity; };
  const answersFor = wid => db.answers().filter(a => a.wish === wid && !a.hidden).sort((a, b) => a.at - b.at);
  const myAnswers = s => db.answers().filter(a => a.sid === s.id).sort((a, b) => b.at - a.at);
  const myAnswerFor = (s, wid) => db.answers().find(a => a.sid === s.id && a.wish === wid);

  // ② 상권 변화: 지난 분기 prev · 이번 분기 bg · 사라짐 gone에서 가게 100m 안, 같은 소분류를 각각 직접 센다(설계서 §2-②)
  function area(s) {
    const pt = ptOf(s), si = M.subs.indexOf(s.sub); if (!pt || si < 0) return null;
    const near = a => dist({ x: a[0], y: a[1] }, pt) <= 100;
    const before = M.prev.filter(a => a[2] === si && near(a)).length;
    const nowL = M.bg.filter(a => a[3] === si && near(a)), born = nowL.filter(a => a[4]).length;
    const goneL = M.gone.filter(near), goneSame = goneL.filter(a => a[2] === si).length;
    const bySub = {}; goneL.forEach(a => { const k = M.subs[a[2]]; bySub[k] = (bySub[k] || 0) + 1; });
    const goneSubs = Object.entries(bySub).sort((a, b) => (b[0] === s.sub) - (a[0] === s.sub) || b[1] - a[1]);
    const vac = M.spaces.filter(v => v.id !== s.space && dist(v, pt) <= 100).map(v => ({ v, w: store.bySpace(v.id)[0] || null }));
    return { before, now: nowL.length, born, goneSame, goneAll: goneL.length, goneSubs, vac };
  }
  // ---------------- 시험 메뉴 계산 (추가기능_설계.md §2) ----------------
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const wd = s => new Date(dayNo(s) * 864e5).getUTCDay();   // 요일(0=일)
  const isWE = w => w === 0 || w === 6;
  const addDays = (s, n) => { const d = new Date((dayNo(s) + n) * 864e5); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
  const md = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
  const r2 = x => Math.round(x * 100) / 100;
  const mean = L => L.length ? L.reduce((x, v) => x + v, 0) / L.length : 0;
  const hasLeft = d => d.left != null && d.left !== '';
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const avgTime = L => { const v = L.map(toMin).filter(x => x != null); if (!v.length) return ''; const m = Math.round(mean(v)); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // 시험 판매: { on, from, to, perDay, offDays[], price, done }. 기본 기간 3주(11/26 미영)
  const trialOf = a => a.trial || { on: false };
  const trialLabel = a => { const t = trialOf(a); if (a.outcome || !t.on || t.done) return ''; return `시험 판매 ${md(t.from)}~${md(t.to)}${+t.perDay > 0 ? ` · 하루 ${+t.perDay}그릇` : ''}${(t.offDays || []).length ? ` · ${t.offDays.map(w => WD[w]).join('')} 쉼` : ''}`; };
  // 하루 한 줄: { date, sold, soldout, soldoutAt, resv(그날 판매에 든 확정 예약), resvNext(내일 확정 예약), came, ok, left }
  // 새로 만들 때 전날 적은 「내일 확정 예약」을 그날 예약으로 옮겨 적는다
  const dayOf = (a, date, make) => {
    let d = (a.days || []).find(x => x.date === date);
    if (!d && make) { const p = (a.days || []).find(x => x.date === addDays(date, -1)); d = { date, sold: 0, soldout: false, soldoutAt: '', resv: p && p.resvNext ? +p.resvNext : 0, resvNext: 0, came: 0, left: null }; (a.days || (a.days = [])).push(d); }
    return d;
  };
  const stats = a => { const D = a.days || []; return { soldDays: D.filter(d => d.sold > 0).length, sold: D.reduce((x, d) => x + (+d.sold || 0), 0), came: D.reduce((x, d) => x + (+d.came || 0), 0) }; };
  // 평균에 쓰는 판매한 날: 지난날 + 오늘은 마감(남은 양 · 품절)을 적은 뒤에만(장사 중이면 판매 수가 덜 참)
  const soldDays = a => { const t = today(); return (a.days || []).filter(d => d.sold > 0 && (d.date < t || (d.date === t && (hasLeft(d) || d.soldout)))); };

  // ⓒ 어느 날 만들 그릇 수 — §2-ⓒ 1~7 [가정 — 학생 팀이 가게에 맞게 고침]
  function cupsFor(a, target) {
    const tr = trialOf(a), w = wd(target), t = today(), live = tr.on && !tr.done;
    if (live && tr.to && target > tr.to) return { off: '시험 끝' };
    if (live && (tr.offDays || []).includes(w)) return { off: '쉬는 요일' };
    const D = soldDays(a), back = d => dayNo(t) - dayNo(d.date);
    const tries = [[`같은 요일(${WD[w]}, 최근 4주)`, D.filter(d => back(d) < 28 && wd(d.date) === w), 2], [`같은 ${isWE(w) ? '주말' : '평일'}(최근 14일)`, D.filter(d => back(d) < 14 && isWE(wd(d.date)) === isWE(w)), 2], ['최근 7일', D.filter(d => back(d) < 7), 3]];
    const hit = tries.find(([, L, k]) => L.length >= k), per = +tr.perDay || 0;
    const resv = target === addDays(t, 1) ? +((dayOf(a, t) || {}).resvNext || 0) : 0;
    if (hit) {
      const [basis, L] = hit, base = mean(L.map(d => d.sold - (+d.resv || 0)));
      const so = L.some(d => d.soldout && !(per && d.sold >= per)), m = so ? 0.15 : 0.1;   // 하루 수량에 닿아 생긴 품절은 수요 신호가 아님
      let cups = base * (1 + m) + resv; const capped = per && cups > per; if (per) cups = resv > per ? resv : Math.min(cups, per);
      return { basis, n: L.length, base, m, so, resv, cups, capped };
    }
    if (per) return { basis: '기록이 모자라 하루 수량', cups: Math.max(per, resv), resv, per: true };
    if (resv) return { basis: '예약만', cups: resv, resv, onlyResv: true };
    return { none: true, n: D.length };
  }
  // 내일 만들 양 = 내일 만들 그릇 × 1인분 양 − 오늘 마감 남은 양
  function prep(a) {
    const ing = a.ing || {}, tm = addDays(today(), 1), c = cupsFor(a, tm), td = dayOf(a, today());
    const left = td && hasLeft(td) ? +td.left || 0 : 0;
    const r = Object.assign({ tm, left, ok: false }, c);
    if (c.off || c.none || !ing.name || !(ing.per > 0)) return r;
    r.gross = c.cups * ing.per; r.need = Math.max(0, Math.ceil(Math.round((r.gross - left) * 1000) / 1000)); r.ok = true;
    return r;
  }
  // ⓓ 새 재료 주문할 양: 하루 쓰는 양 = 그날 만들 그릇 × 1인분(남은 양 빼기 전)
  // 판매량을 셀 수 없는 날(기록이 모자라고 하루 수량도 없음)은 null — 0으로 더하면 「충분해요」 「0g 들이세요」처럼 틀린 안내가 됨
  const useOn = (a, date) => { const c = cupsFor(a, date), per = +(a.ing || {}).per || 0; return c.off ? 0 : c.none ? null : c.cups * per; };
  const sumUse = (a, from, to) => { let x = 0; for (let d = from; d <= to; d = addDays(d, 1)) { const u = useOn(a, d); if (u == null) return null; x += u; } return x; };
  function order(a) {
    const tr = trialOf(a), o = a.order || {}, ing = a.ing || {}, t = today(), unit = ing.unit || 'g';
    if (!ing.isNew || !(ing.per > 0)) return { skip: true };
    const started = !!(a.startAt || soldDays(a).length);
    const td = dayOf(a, t), L = o.have !== '' && o.have != null ? +o.have || 0 : td && hasLeft(td) ? +td.left || 0 : 0, I = +o.incoming || 0, k = Math.max(1, +o.every || 0);
    const r = { unit, L, I, k };
    if (!started) {   // 시험 시작 전 첫 주문: 시작일부터 첫 다음 배송 전날(모르면 시험 끝)까지 × 1.1 [가정] − 지금 있는 양
      const from = [tr.from || t, t].sort().pop(), end = o.next ? addDays(o.next, -1) : tr.to;   // 지난 날은 셈에서 뺌
      if (!end || end < from) return Object.assign(r, { first: true, wait: true });
      const use = sumUse(a, from, end); if (use == null) return Object.assign(r, { first: true, unknown: true });
      return Object.assign(r, { first: true, from, end, use, done: (o.log || []).find(x => x.for === from), qty: Math.max(0, Math.ceil(Math.round((use * 1.1 - L) * 1000) / 1000)) });
    }
    if (!o.next || o.next <= t) return Object.assign(r, { wait: true });
    const D = o.next, u1 = sumUse(a, addDays(t, 1), addDays(D, -1));
    const end2 = [addDays(D, k - 1), tr.on && !tr.done && tr.to ? tr.to : null].filter(Boolean).sort()[0], u2 = D <= end2 ? sumUse(a, D, end2) : 0;
    if (u1 == null || u2 == null) return Object.assign(r, { unknown: true, D });
    if (D > end2) return Object.assign(r, { D, after: true, qty: 0 });   // 다음 배송일이 시험 끝 뒤
    const done = (o.log || []).find(x => x.for === D);
    const short = Math.max(0, u1 - L - I), R = Math.max(0, L + I - u1);
    return Object.assign(r, { D, u1, u2, end2, done, short: Math.ceil(Math.round(short * 1000) / 1000), R, qty: Math.max(0, Math.ceil(Math.round((u2 - R) * 1000) / 1000)) });
  }
  // ⓑ 언제 얼마나 팔렸나: 요일 표(같은 요일 2일 [가정] 이상인 요일이 없으면 평일 / 주말 묶음)
  function flowRows(a) {
    const D = soldDays(a);
    const agg = (L, d) => { const lf = L.filter(hasLeft); return { d, n: L.length, avg: L.length ? r2(mean(L.map(x => x.sold))) : '', so: L.filter(x => x.soldout).length, at: avgTime(L.filter(x => x.soldout).map(x => x.soldoutAt)), left: lf.length ? r2(mean(lf.map(x => +x.left))) : '', thin: L.length < 2 }; };
    const byW = [1, 2, 3, 4, 5, 6, 0].map(w => agg(D.filter(x => wd(x.date) === w), WD[w])).filter(r => r.n);
    if (byW.some(r => !r.thin)) return { kind: '요일', rows: byW, n: D.length };
    const g = [agg(D.filter(x => !isWE(wd(x.date))), '평일'), agg(D.filter(x => isWE(wd(x.date))), '주말')].filter(r => r.n);
    return { kind: '평일 / 주말', rows: g, n: D.length, more: g.every(r => r.thin) ? Math.max(0, 2 - Math.max(0, ...g.map(r => r.n))) || 1 : 0 };
  }
  // ⓕ 한 가지 바꾸기 전후 비교: ① 같은 요일이 전 · 뒤 각 2일 이상 ② 바꾸기 전 n일 · 바꾼 뒤 n일(n = 바꾼 뒤 판매한 날, 최대 7 [가정]), 각 3일 이상
  function compare(a, ch) {
    const D = soldDays(a).sort((p, q) => p.date < q.date ? -1 : 1), B = D.filter(d => d.date < ch.from), Af = D.filter(d => d.date >= ch.from);
    const items = (b, af, d) => [['평균 판매', L => L.length ? r2(mean(L.map(x => x.sold))) : '-'], ['품절 날', L => L.filter(x => x.soldout).length], ['평균 품절 시각', L => avgTime(L.filter(x => x.soldout).map(x => x.soldoutAt)) || '-'], ['평균 남은 양', L => { const f = L.filter(hasLeft); return f.length ? r2(mean(f.map(x => +x.left))) : '-'; }]].map(([k, f]) => ({ d, k, b: f(b), a: f(af) }));
    const W = [1, 2, 3, 4, 5, 6, 0].filter(w => B.filter(d => wd(d.date) === w).length >= 2 && Af.filter(d => wd(d.date) === w).length >= 2);
    if (W.length) return { basis: '같은 요일끼리', rows: W.flatMap(w => items(B.filter(d => wd(d.date) === w), Af.filter(d => wd(d.date) === w), WD[w])) };
    const n = Math.min(7, Af.length, B.length);   // 바꾸기 전 날은 더 늘지 않으므로 둘 중 적은 쪽(최대 7 [가정])
    if (n < 3) return { need: Math.max(3 - Af.length, 3 - B.length, 1), nA: Af.length, nB: B.length };
    const bn = B.slice(-n);
    if (bn.length < n) return { need: n - bn.length, nA: Af.length, nB: B.length };
    return { basis: `전후 ${n}일`, rows: items(bn, Af.slice(0, n), '전체') };
  }
  // ⓔ 가 본 시민 한 줄: 연락처 · 링크 · 욕설만 막음(바람 점검 BAD는 「별로 · 할인」까지 막아 아쉬운 한 줄이 사라지므로 쓰지 않음)
  function noteCheck(t) {
    t = (t || '').trim();
    if (t.length < 2) return '한 줄을 두 글자 이상 적어 주세요';
    const tc = t.replace(/\s/g, '');
    if (/(쓰레기|꺼져|씨발|시발(?!점)|씨바|ㅅㅂ|ㅆㅂ|ㅈㄴ|병신|개새끼|새끼(?!손|발|줄|오리|돼지)|개같|좆|존나|씹(새|할|년|놈|덕))/.test(tc)) return '욕설은 올라가지 않아요';
    const tn = t.replace(/[oO○ㅇ]/g, '0').replace(/[lI|]/g, '1');   // o1o-1234-5678 같은 꼴
    if (/((01[016789]|공일공)[\s.-]?[\d일이삼사오육칠팔구공영]{3,4}|\d{2,3}[\s.-]\d{3,4}[\s.-]\d{4})/.test(tn) || /(카톡|카카오(톡)?|kakao|인스타(그램)?|insta(gram)?|페북|facebook|line)\s*(아이디|id|채널)?\s*[:：@]?\s*[a-z0-9_.]{3,}/i.test(t) || /(오픈\s*채팅|오픈톡|\bdm\b|디엠|아이디\s*[:：]|\bid\s*[:：]|@[a-z0-9_.]{3,})/i.test(t)) return '연락처 · 계정은 올라가지 않아요';   // 「카톡으로 추천했어요」처럼 아이디가 안 붙으면 통과
    if (/(https?:\/\/|www\.|[a-z0-9-]+\.(com|kr|net|co|me|ly|io|link|shop|site|app)\b|@[a-z0-9_.]{3,})/i.test(t)) return '링크는 올라가지 않아요';
    return '';
  }
  const notesOf = a => (a.notes || []).filter(n => !n.hidden && !n.gone);

  // 월 집계: 공유가 켜진 항목만(설계서 §3 추적 세부). 메뉴 가격 · 정확한 매출 · 답글 · 후기는 어떤 경우에도 안 나감
  function monthly(s) {
    const A2 = myAnswers(s), cur = today().slice(0, 7), sh = shareOf(s);
    const yms = new Set([cur].concat(s.openDays.map(d => d.slice(0, 7)), s.months.map(m => m.ym), A2.flatMap(a => (a.days || []).map(d => d.date.slice(0, 7)))));
    return [...yms].sort().reverse().map(ym => {
      const days = A2.flatMap(a => (a.days || []).filter(d => d.date.slice(0, 7) === ym)), mo = s.months.find(m => m.ym === ym) || {};
      return { ym, open: sh.open ? s.openDays.filter(d => d.slice(0, 7) === ym).length : null, band: sh.band ? (mo.band || '') : null, alive: sh.open ? (mo.alive || '') : '',
        answers: sh.answers ? A2.filter(a => ymd(new Date(a.at)).slice(0, 7) === ym).length : null,
        soldDays: sh.sold ? new Set(days.filter(d => d.sold > 0).map(d => d.date)).size : null, sold: sh.sold ? days.reduce((x, d) => x + (+d.sold || 0), 0) : null,
        came: sh.came ? days.reduce((x, d) => x + (+d.came || 0), 0) : null,
        changes: sh.changes ? A2.flatMap(a => a.changes || []).filter(x => x.from.slice(0, 7) === ym).length : null,
        kept: sh.kept ? A2.flatMap(a => a.changes || []).filter(x => x.state === '유지' && x.decidedAt && ymd(new Date(x.decidedAt)).slice(0, 7) === ym).length : null,
        outcome: sh.outcome ? (() => { const L = A2.filter(a => a.outcome && a.outcomeAt && ymd(new Date(a.outcomeAt)).slice(0, 7) === ym); return L.length ? `정식 ${L.filter(a => a.outcome === '정식').length} · 접음 ${L.filter(a => a.outcome === '접음').length}` : ''; })() : null };
    });
  }
  const lastActive = s => Math.max(s.at ? dayNo(ymd(new Date(s.at))) : 0, ...s.openDays.map(dayNo), ...myAnswers(s).flatMap(a => (a.days || []).map(d => dayNo(d.date))));
  const noRecord = s => dayNo(today()) - lastActive(s) > 31;
  const ymBack = ym => { const [y, m] = ym.split('-').map(Number); return ymd(new Date(y, m - 2, 1)).slice(0, 7); };
  // 「버티기 위험」 [가정 — 기준은 운영단이 정함]: 그 가게 자신의 신호만 — 한 달 넘게 기록 없음 · 매출 구간 2달 연속 하락(이어진 세 달) · 「문 닫았어요」
  // 영업 여부 공유가 꺼진 가게는 판정하지 않는다
  function risk(s) {
    const sh = shareOf(s), out = [], cur = today().slice(0, 7); if (!sh.open) return out;
    if ((s.months.find(m => m.ym === cur) || {}).alive === '문 닫았어요') out.push('사장님이 「문 닫았어요」로 답함');
    if (noRecord(s)) out.push('한 달 넘게 기록 없음');
    if (sh.band) {
      const b = ym => BANDS.indexOf((s.months.find(m => m.ym === ym) || {}).band);
      const last = [cur, ymBack(cur)].find(ym => b(ym) >= 0);
      if (last) { const m1 = ymBack(last), m2 = ymBack(m1); if (b(m1) >= 0 && b(m2) >= 0 && b(m2) > b(m1) && b(m1) > b(last)) out.push('매출 구간 2달 연속 하락'); }
    }
    return out;
  }
  // 주변 변화(위험 수에 넣지 않음): 100m 안 같은 업종이 지난 분기보다 줄었을 때. 사라진 업소는 폐업만이 아니라 이전 · 상호 변경일 수도 있다
  const areaNote = s => { const ar = area(s); return ar && ar.now < ar.before ? `100m 안 같은 업종(${s.sub}) ${ar.before}→${ar.now}곳` : ''; };

  // 답글 점검(바람 점검 BAD와 따로): 욕설 · 연락처 · 링크 · 남 깎아내림 금지, 가격 · 할인 · 무료는 사장님이 적은 것에 있을 때만.
  // 자기 가게를 낮추는 말(「맛없으면 말씀해 주세요」)은 막지 않는다.
  // 숫자 맞추기: 8,000 · 8천 · 1만 2천 · 만 원 → 8000 · 8000 · 12000 · 10000
  const normNum = t => String(t).replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/(\d+)\s*만\s*(\d+)\s*천/g, (_, a, b) => String(a * 10000 + b * 1000))
    .replace(/(\d+)\s*만(?=\s*원)/g, (_, a) => String(a * 10000)).replace(/(\d+)\s*천(?=\s*원)/g, (_, a) => String(a * 1000))
    .replace(/(^|[^\d])(만|천)\s*원/g, (_, p, u) => p + (u === '만' ? '10000' : '1000') + '원');
  const nums = t => new Set(normNum(t).match(/\d+/g) || []);
  const GIFT = /(할인|반\s*값|무료|공짜|1\s*\+\s*1|원\s*플\s*원|증정|덤으로|덤\s*드|서비스로|서비스\s*드|돈\s*안\s*받|돈\s*받지\s*않)/g;
  const STOP = /^(할인|무료|공짜|증정|서비스|드려요|드립니다|드릴게요|드릴|드려|해요|해드려요|있어요|저희|가게|오시면|오신|오셔도|오셔서|처음|첫|방문|손님|혼자|모든|전부|메뉴|분께|분들|고객|함께|같이|정도|하나|그리고|또|꼭|바로|이번|오늘|평일|주말|점심|저녁)$/;
  function checkReply(d, s) {
    const menu = (d.menu || '').trim(), reply = (d.reply || '').trim(), t = `${menu} ${reply}`;
    if (!menu) return '메뉴 이름을 적어 주세요';
    if (reply.length < 5) return '바람 아래에 보일 답글을 적어 주세요';
    if (/△△|○○/.test(t)) return '틀 문장의 ○○ · △△ 자리를 채워 주세요';
    if (/(쓰레기|망해라|꺼져|씨발|시발|ㅅㅂ|병신|개같)/.test(t)) return '욕설 · 비방으로 보이는 말이 있어요. 고쳐서 올려 주세요';
    if (/((다른|옆|근처|주변|딴|그)\s*[가-힣]{0,6}(집|가게|매장|식당|카페)|거기|저기).{0,15}(별로|비싸|맛없|못하|나쁘|더럽|불친절|엉망|최악|위생|구려|후지)/.test(t)
      || /(창업|새\s*가게|빈칸|여기\s*들어오).{0,15}(필요\s*없|소용\s*없|안\s*돼|망할|고생|들어오지|하지\s*마|말리)/.test(t)) return '다른 가게나 빈칸 창업을 깎아내리는 말은 쓸 수 없어요';
    if (/((01[016789]|공일공)[\s.-]?[\d일이삼사오육칠팔구공영]{3,4}|\d{2,3}-\d{3,4}-\d{4}|카톡|카카오\s*(톡|아이디|채널|id)|오픈\s*채팅|오픈톡|인스타|페북|페이스북|아이디|\bid\b|\bdm\b|디엠|문자\s*주|전화\s*주)/i.test(t)) return '연락처 · 계정은 답글에 넣을 수 없어요(시민은 이 사이트에서 가게를 찾아요)';
    if (/(https?:\/\/|www\.|[a-z0-9-]+\.(com|kr|net|co|me|ly|io|link|shop|site|app)\b|@[a-z0-9_.]{3,}|[a-z]+[0-9_.][a-z0-9_.]{2,})/i.test(t)) return '링크 · 계정 주소는 답글에 넣을 수 없어요';
    const ok = nums(`${s.offer} ${s.perk} ${s.menus.map(m => m.name + ' ' + m.price).join(' ')} ${(d.trial && d.trial.on && d.trial.price) || ''}`);
    if ([...normNum(t).matchAll(/(\d+)\s*(원|%|퍼센트|프로)/g)].some(m => !ok.has(m[1]))) return '가격 · 할인 숫자는 가게 설정의 「가격 · 행사」나 메뉴 가격에 적은 것만 쓸 수 있어요';
    // 할인 · 반값 · 무료 · 증정: 그 말 바로 앞의 대상(예: 「음료」)이 모두 사장님이 적은 「첫 방문 혜택」 · 「가격 · 행사」의 할인 · 무료 말 주변에 있어야 통과
    const mineT = [s.perk || ''].concat([...(s.offer || '').matchAll(/(할인|반\s*값|무료|공짜|1\s*\+\s*1|증정|덤|서비스|%)/g)].map(m => s.offer.slice(Math.max(0, m.index - 14), m.index + m[0].length + 6))).join(' ');
    for (const part of [menu, reply]) for (const m of part.matchAll(GIFT)) {
      if (/^(은|는|이|도)?\s*(없|안\s*해|하지\s*않)/.test(part.slice(m.index + m[0].length, m.index + m[0].length + 6))) continue;   // 「할인은 없지만」
      if (/할인|반\s*값/.test(m[0]) && !/(할인|%|반\s*값)/.test(`${s.offer} ${s.perk}`)) return '할인은 가게 설정의 「가격 · 행사」에 먼저 적어 주세요';
      const words = (part.slice(Math.max(0, m.index - 10), m.index).match(/[가-힣A-Za-z]{2,}/g) || []).map(w => w.replace(/(으로|로|을|를|이|가|은|는|도|만|에서|에게|에는|엔|에|께|와|과|랑)$/, '')).filter(w => w.length >= 2 && !STOP.test(w));
      const inMine = w => mineT.includes(w) || (w.length >= 3 && mineT.includes(w.slice(0, -1)));   // 조사가 남은 꼴(「방문엔」)도 맞춤
      if (!mineT.trim() || words.some(w => !inMine(w))) return '할인 · 무료 · 증정은 가게 설정의 「가격 · 행사」나 「첫 방문 혜택」에 적은 것만 쓸 수 있어요';
    }
    return '';
  }

  // ---------------- AI 칸 (실패하면 기본 정리) ----------------
  const themesKey = L => L.slice(0, 12).map(x => x.w.id + ':' + x.w.why.length).join(',');
  function baseThemes(L) {   // 기본 정리: 바람의 업종 칩(cat)별로 세기
    const c = {}; L.forEach(x => { c[x.w.cat] = c[x.w.cat] || []; c[x.w.cat].push(x.n); });
    return Object.entries(c).sort((a, b) => b[1].length - a[1].length).map(([t, refs]) => ({ t: `${t} 바람 ${refs.length}개`, refs, try: '' }));
  }
  function loadThemes(s, L) {
    const key = themesKey(L);
    if (L.length < 2 || (s.themes && s.themes.key === key) || (ui.themes && ui.themes.key === key) || ui.busy.themes === key) return;
    ui.busy.themes = key;
    window.ASSIST.call('themes', { item: s.item, wishes: L.slice(0, 12).map(x => ({ title: x.w.title, why: x.w.why })) }, 25000)
      .then(out => ({ key, ai: true, list: out.themes }), () => ({ key, ai: false, list: baseThemes(L) }))
      .then(r => { if (ui.busy.themes !== key) return; ui.busy.themes = null; if (r.ai) { s.themes = r; db.putStore(s); } else ui.themes = r; patch('mthemes', themesBlock(s, L)); });   // 기본 정리는 저장하지 않음(다음에 열 때 AI를 다시 부름)
  }
  const areaKey = (s, ar) => [s.sub, ar.before, ar.now, ar.goneAll, ar.vac.map(v => v.w ? v.w.id : '').join('')].join('|');
  function loadArea(s, ar) {
    if (!ar) return;
    const key = areaKey(s, ar);
    if ((s.area && s.area.key === key) || (ui.area && ui.area.key === key) || ui.busy.area === key) return;
    ui.busy.area = key;
    const ws = ar.vac.filter(v => v.w).sort((a, b) => store.likes(b.w) - store.likes(a.w)).slice(0, 3).map(v => v.w.title);
    const input = { item: s.item, sub: s.sub, q: QL, before: ar.before, now: ar.now, born: ar.born, gone: ar.goneSame, goneAll: ar.goneAll, goneSubs: ar.goneSubs.slice(0, 8).map(([k, n]) => `${k} ${n}곳`), wishes: ws };
    window.ASSIST.call('area', input, 25000)
      .then(out => ({ key, ai: true, line: out.line }), () => ({ key, ai: false, line: '' }))
      .then(r => { if (ui.busy.area !== key) return; ui.busy.area = null; if (r.ai) { s.area = r; db.putStore(s); } else ui.area = r; patch('marea', areaBlock(s)); });
  }
  function draftAnswer(s, x) {
    const wid = x.w.id;
    if (ui.busy['d' + wid]) return;
    ui.busy['d' + wid] = true;
    const input = { item: s.item, place: placeOf(s), menus: s.menus.map(m => m.name).filter(Boolean), offer: [s.offer, s.perk && '첫 방문 혜택: ' + s.perk].filter(Boolean).join(' · '), title: x.w.title, why: x.w.why, likes: store.likes(x.w), dist: Math.round(x.m) };
    const base = { fit: '', why: '', idea: '', menu: '', reply: `${x.w.title}을(를) 바라셔서 저희 가게에서 △△를 준비해 볼게요.`, ai: false };
    window.ASSIST.call('answer', input, 25000)
      .then(out => Object.assign({}, out, { ai: true, menu: out.menu || '', reply: out.reply || '' }), () => base)
      .then(d => { ui.busy['d' + wid] = false; if (!s.drafts[wid] || !s.drafts[wid].touched) { s.drafts[wid] = d; db.putStore(s); } const el = document.getElementById('k2-' + wid); if (!(el && el.contains(document.activeElement))) patch('k2-' + wid, k2Block(s, x, ctx())); });
  }

  // ---------------- 화면 조각 ----------------
  const bar = (c, s) => `<div class="mtop"><button class="back" data-m="map">← 지도로</button><p class="kick">내 가게 · 경영 도우미</p>
      ${s && s.setup ? `<div class="mhead"><h2>${esc(s.name || s.item)} <small>${esc(s.item)} @ ${esc(placeOf(s))}</small></h2>
        <div class="mbtns">${c.mode === 'owner' ? `<button class="mb${s.openDays.includes(today()) ? ' on' : ''}" data-m="openday">${s.openDays.includes(today()) ? '✓ 오늘 영업했어요' : '오늘 영업했어요'}</button>
          <button class="mb${ui.view === 'k' ? ' on' : ''}" data-m="v" data-v="k">근처 바람 · 기록</button><button class="mb${ui.view === 'k1' ? ' on' : ''}" data-m="v" data-v="k1">가게 설정</button><button class="mb${ui.view === 'k4' ? ' on' : ''}" data-m="v" data-v="k4">공유 항목 · 이번 달</button><button class="mb${ui.view === 'k5' ? ' on' : ''}" data-m="v" data-v="k5">학생 팀</button>` : ''}</div></div>` : ''}</div>`;

  function banners(c, s) {
    const L = [];
    if (c.mode === 'team') L.push(`<div class="mban team"><b>학생 팀으로 함께 쓰는 중</b> ${esc(s.owner || '사장님')}님 가게예요. 답 초안 · 답한 메뉴 기록은 같이 쓰고, 답 올리기 · 상태 바꾸기는 사장님만 해요.</div>`);
    if (c.mode !== 'owner' || !s.setup) return L.join('');
    const cur = today().slice(0, 7), mo = s.months.find(m => m.ym === cur);
    if (noRecord(s) && !(mo && mo.alive)) L.push(`<div class="mban warn"><b>한 달 넘게 기록이 없어요. 지금 영업 중이세요?</b><span><button class="cta2 sm" data-m="alive" data-v="영업 중이에요">영업 중이에요</button><button class="cta2 sm" data-m="alive" data-v="잠시 쉬고 있어요">잠시 쉬고 있어요</button><button class="cta2 sm" data-m="alive" data-v="문 닫았어요">문 닫았어요</button></span></div>`);
    if (appOf(s) && s.share.band && !(mo && mo.band)) L.push(`<div class="mban"><b>이번 달 매출 구간을 아직 안 골랐어요</b> <small>월 1회 · 운영단에는 구간만 가요</small><button class="cta2 sm" data-m="v" data-v="k4">고르기</button></div>`);
    if (ui.msg) L.push(`<div class="mban ok">${ui.msg}</div>`);
    return L.join('');
  }

  function themesBlock(s, L) {
    if (L.length < 2) return '<div id="mthemes"></div>';
    const key = themesKey(L), th = s.themes && s.themes.key === key ? s.themes : ui.themes && ui.themes.key === key ? ui.themes : null;
    if (!th) return `<div id="mthemes" class="themes aiout"><b>사람들이 바라는 공통점</b> <small class="busy">AI가 근처 바람을 묶는 중…</small></div>`;
    return `<div id="mthemes" class="themes aiout"><b>사람들이 바라는 공통점 ${aiTag(th.ai)}</b>
      <ul>${th.list.map(x => `<li><b>${esc(x.t)}</b> <small>바람 ${x.refs.map(n => `#${n}`).join(' · ')}</small>${x.try ? `<span>→ ${esc(x.try)}</span>` : ''}</li>`).join('')}</ul>
      ${th.ai ? '' : '<small class="fine">바람 종류별로 세어 묶었어요.</small>'}</div>`;
  }

  // 답 올리기의 시험 판매 칸(기본: 오늘부터 3주, 11/26 미영)
  const trialDefault = () => ({ on: true, from: today(), to: addDays(today(), 20), perDay: '', offDays: [], price: '' });
  function trialFields(d, wid) {
    const t = d.trial || (d.trial = trialDefault());
    return `<fieldset class="trialbox"><label class="chk"><input type="checkbox" data-m-in="d.trial.on" data-w="${wid}"${t.on ? ' checked' : ''}> 시험 판매로 올리기 <small>기간 · 하루 수량을 정해 작게 팔아 봐요 — 시민은 「먹어보고 싶어요」를 누를 수 있어요</small></label>
      ${t.on ? `<div class="ming"><label>시작<input type="date" data-m-in="d.trial.from" data-w="${wid}" value="${esc(t.from)}"></label><label>끝 <small>(기본 3주)</small><input type="date" data-m-in="d.trial.to" data-w="${wid}" value="${esc(t.to)}"></label>
        <label>하루 수량<input type="number" min="0" data-m-in="d.trial.perDay" data-w="${wid}" value="${esc(t.perDay)}" placeholder="선택"></label><label>시험 가격(원)<input type="number" min="0" step="100" data-m-in="d.trial.price" data-w="${wid}" value="${esc(t.price)}" placeholder="선택"></label></div>
      <div class="offd">쉬는 요일 ${WD.map((n, w) => `<button class="${t.offDays.includes(w) ? 'on' : ''}" data-m="d.off" data-w="${wid}" data-v="${w}">${n}</button>`).join('')}</div>` : ''}</fieldset>`;
  }
  function k2Block(s, x, c) {
    const wid = x.w.id, d = s.drafts[wid], mine = myAnswerFor(s, wid), owner = !c || c.mode === 'owner';
    if (!d) return `<div class="k2 aiout" id="k2-${wid}"><small class="busy">AI가 이 바람과 우리 메뉴를 읽는 중… <small>(안 되면 기본 틀로 이어져요)</small></small></div>`;
    return `<div class="k2 aiout" id="k2-${wid}">
      ${d.ai ? `<p class="k2fit"><b>이 가게가 채울 수 있나 ${aiTag(true)}</b> <span class="fit f${['지금 메뉴로 됨', '조금 바꾸면 됨', '어려움'].indexOf(d.fit)}">${esc(d.fit)}</span> ${esc(d.why)}</p>${d.idea ? `<p class="k2idea"><b>해 볼 방법</b> ${esc(d.idea)}</p>` : ''}${d.fit === '어려움' ? '<p class="fine">억지로 맞추지 않아도 돼요. 그래도 답하고 싶으면 아래를 직접 채워 주세요.</p>' : ''}`
        : `<p class="k2fit"><b>답 초안</b> ${aiTag(false)} <small>틀 문장을 넣어 뒀어요. 메뉴 이름과 답글을 채워 주세요.</small></p>`}
      <div class="orow"><label class="ofl">메뉴 이름<input data-m-in="d.menu" data-w="${wid}" value="${esc(d.menu)}" maxlength="24" placeholder="예: 1인 파스타 덮밥"></label>
        <label class="ofl">바람 아래에 보일 답글 <small class="cnt" id="cnt-${wid}">${(d.reply || '').length} / 100</small><textarea data-m-in="d.reply" data-w="${wid}" rows="3" maxlength="140">${esc(d.reply)}</textarea></label></div>
      ${trialFields(d, wid)}
      <p class="err" id="k2err-${wid}" hidden></p>
      <p class="fine">가격 · 할인은 가게 설정의 「가격 · 행사」에 적은 것만 쓸 수 있어요. 연락처 · 링크 · 다른 가게를 깎아내리는 말은 올라가지 않아요. 답을 올려도 바람은 닫히지 않아요.</p>
      <div class="k2nav"><button class="cta2 sm" data-m="close2">닫기</button><button class="cta2 sm" data-m="redraft" data-w="${wid}"${ui.busy['d' + wid] ? ' disabled' : ''}>AI 초안 다시 받기</button>
        ${owner ? `<button class="cta sm" data-m="post" data-w="${wid}">${mine ? '고친 답 올리기' : '이 바람에 답 올리기'}</button>` : '<small class="fine">올리기는 사장님만 해요 — 초안은 저장돼요</small>'}</div></div>`;
  }

  function leftCol(c, s) {
    const nb = nearList(s), L = nb.list;
    if (c.mode === 'owner' || c.mode === 'team') loadThemes(s, L);
    return `<section class="mcol"><h3>근처 바람 <small>${nb.near ? `가게 150m 안 ${L.length}개 · 우리 업종과 닿는 것 먼저 · 공감순` : L.length ? '150m 안에 없어 300m 안 가까운 순' : '300m 안에도 아직 없어요'}</small></h3>
      ${themesBlock(s, L)}
      ${L.map(x => {
        const n = answersFor(x.w.id).length, mine = myAnswerFor(s, x.w.id), open = ui.open === x.w.id;
        return `<article class="nw${open ? ' open' : ''}" id="nw-${x.w.id}"><div class="nwh"><span class="no">#${x.n}</span><span class="cat">${esc(x.w.cat)}</span>${x.hit ? '<span class="tag calc">우리 업종과 닿음</span>' : ''}${x.w.seed ? '<span class="tag">운영팀 바람</span>' : '<span class="tag real">회원 바람</span>'}${!x.w.seed && ui.since && +String(x.w.id).slice(1) > ui.since ? '<span class="tag mine">새 바람</span>' : ''}</div>
          <h4>${esc(x.w.title)}${x.extra ? ' <small class="fine">150m 밖 · 300m 안</small>' : ''}</h4><p>${esc(x.w.why)}</p>
          <div class="nwf"><small>♥ ${store.likes(x.w)} · 약 ${roundDist(x.m)}m · ${n ? `답한 가게 ${n}곳` : '아직 답한 가게 없음'}${mine ? ` · <b>내 답: ${esc(mine.state)}</b>` : ''}</small>
            ${open ? '' : `<button class="cta2 sm" data-m="ans" data-w="${x.w.id}">${mine ? '내 답 고치기' : '답하기'}</button>`}</div>
          ${open ? k2Block(s, x, c) : ''}</article>`;
      }).join('') || `<div class="emptyw"><p>가게 300m 안에 아직 바람이 없어요. 위치가 맞는지 <button class="link" data-m="v" data-v="k1">가게 설정</button>에서 확인해 주세요.</p><p class="fine">바람이 모이게 하려면: 가게 앞 · 계산대에서 「동성로 빈칸에 여기 있으면 좋겠는 가게를 남겨 주세요」라고 알려 주세요. 근처 빈칸에 새 바람이 생기면 여기에 「새 바람」으로 떠요.</p></div>`}
      <p class="fine">「운영팀 바람」은 서비스를 소개하려고 운영팀이 넣어 둔 바람이라 실제 시민 글이 아니에요. 공감 · 거리 · 답한 가게 수는 사이트가 세요.</p></section>`;
  }

  // 알림 → 방문 단계: 알림 받은 회원 → 먹어보고 싶어요 → 보여 주기 화면을 연 회원 → 가 봤어요 → 바람 보고 온 손님(그중 시민 화면에서 확인)
  const funnel = a => { const w = wishById(a.wish), sx = stats(a); return { sent: w ? recipients(w, a.uid) : 0, wants: a.wants || 0, shows: a.shows || 0, went: a.went || 0, came: sx.came, ok: (a.days || []).reduce((x, d) => x + (d.ok || 0), 0) }; };
  const funnelLine = a => { const f = funnel(a); return `알림 ${f.sent}명 → 먹어보고 싶어요 ${f.wants} → 보여 주기 연 ${f.shows}명 → 가 봤어요 ${f.went} → 바람 보고 온 손님 <b>${f.came}</b>명${f.ok ? ` (시민 화면에서 확인 ${f.ok})` : ''}`; };
  const mstat = a => { const sx = stats(a), t = trialOf(a), price = +t.price || 0, soldT = soldDays(a).filter(d => d.date >= (t.from || '') && d.date <= (t.to || '9')).reduce((x, d) => x + d.sold, 0);
    return `판매 <b>${sx.soldDays}</b>일 · 누적 <b>${sx.sold}</b>${price && t.on ? ` · 시험 가격 × 판매 ${fmt(soldT * price, '원')}` : ''}`; };
  const det = (aid, key, title, body, extra = '') => `<details class="mbox" data-det="${aid}:${key}"${ui.det[aid + ':' + key] ? ' open' : ''}><summary>${title}${extra}</summary>${body}</details>`;
  const fmt = (x, u) => `${(Math.round(x * 100) / 100).toLocaleString()}${u || ''}`;
  const showSummary = a => { const t = trialOf(a); return t.on && !t.done && !a.outcome && (today() > (t.to || '9') || ui.sum[a.id]); };

  function mcard(c, s, a) {
    const w = wishById(a.wish), sx = stats(a), owner = c.mode === 'owner', date = ui['date' + a.id] || today(), d = dayOf(a, date) || { sold: '', soldout: false, soldoutAt: '', resv: 0, resvNext: 0, came: 0, left: '' };
    const ing = a.ing || {}, end = a.state === '끝남', tl = trialLabel(a), label = a.state !== '끝남' && a.outcome === '정식' ? '늘 팔아요' : a.state;
    return `<article class="mcard${end ? ' end' : ''}" id="mc-${a.id}">
      ${showSummary(a) ? summaryBox(c, a) : ''}
      <p class="mk"><span class="tag st">${esc(label)}</span> ${w ? `「${esc(w.title)}」에 답함` : '바람이 지워짐'} · ${md(ymd(new Date(a.at)))}${a.hidden ? ' · <b class="bad">운영단이 숨김</b>' : ''}${owner && !end ? ` <button class="link" data-m="change" data-a="${a.id}" data-w="${a.wish}">답 고치기</button>` : ''}</p>
      <b class="mm">${esc(a.menu)}</b>${tl ? `<p class="mtrial">${esc(tl)}${a.startAt ? ` · ${md(ymd(new Date(a.startAt)))} 판매 시작` : ''}</p>` : ''}
      <p class="mstat" id="ms-${a.id}">${mstat(a)}</p>
      <p class="mfun" id="mf-${a.id}">${funnelLine(a)}</p>
      ${owner ? `<div class="mstates">${STATES.map(t => `<button class="${a.state === t ? 'on' : ''}" data-m="state" data-a="${a.id}" data-v="${t}">${t === '끝남' ? (trialOf(a).on && !trialOf(a).done && !a.outcome ? '끝남 · 정리하기' : '끝남(접기)') : t}</button>`).join('')}</div>` : ''}
      ${end ? '' : `
      <div class="mday"><label>날짜<input type="date" data-m-in="day.date" data-a="${a.id}" value="${date}" max="${today()}"></label>
        <label>판매 수<input type="number" min="0" max="999" inputmode="numeric" data-m-in="day.sold" data-a="${a.id}" value="${d.sold === 0 && !dayOf(a, date) ? '' : esc(d.sold)}" placeholder="0"></label>
        <label class="chk"><input type="checkbox" data-m-in="day.soldout" data-a="${a.id}"${d.soldout ? ' checked' : ''}> 품절</label>
        ${d.soldout ? `<label class="wide">품절 시각<input type="time" data-m-in="day.soldoutAt" data-a="${a.id}" value="${esc(d.soldoutAt || '')}"></label>` : ''}
        <button class="plus" data-m="plus" data-a="${a.id}">＋ 바람 보고 왔어요 <b id="pc-${a.id}">${d.came || 0}</b></button></div>
      ${det(a.id, 'prep', '내일 만들 양', prepBox(a, d))}
      ${det(a.id, 'flow', '언제 얼마나 팔렸나', flowBox(a))}
      ${ing.isNew ? det(a.id, 'order', '새 재료 주문할 양', orderBox(a)) : ''}
      ${det(a.id, 'notes', '가 본 시민 한 줄', notesBox(c, a), ` <small>${notesOf(a).length}</small>`)}
      ${det(a.id, 'tweak', '한 가지 바꾸기', tweakBox(c, a), (a.changes || []).some(x => x.state === '진행 중') ? ' <small>진행 중</small>' : '')}
      ${owner ? det(a.id, 'trial', '시험 판매 설정', trialBox(a)) : ''}`}
    </article>`;
  }
  function prepBox(a, d) {
    const ing = a.ing || {};
    return `<div class="ming"><label>주재료<input data-m-in="ing.name" data-a="${a.id}" value="${esc(ing.name || '')}" maxlength="12" placeholder="예: 돼지고기"></label>
        <label>1인분 양<input type="number" min="0" step="1" data-m-in="ing.per" data-a="${a.id}" value="${ing.per || ''}" placeholder="예: 120"></label>
        <label>단위<select data-m-in="ing.unit" data-a="${a.id}">${['g', 'ml', '개'].map(u => `<option${ing.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label title="오늘 마감 때 남은 양 — 내일 만들 양에서 뺌">마감 남은 양<input type="number" min="0" data-m-in="day.left" data-a="${a.id}" value="${d.left == null ? '' : esc(d.left)}"></label></div>
      <div class="ming two"><label>그날 확정 예약 <small>그날 판매 수에 든 전화 · 단체 예약</small><input type="number" min="0" data-m-in="day.resv" data-a="${a.id}" value="${+d.resv || ''}" placeholder="0"></label>
        <label>내일 확정 예약 <small>다음 날 「그날 예약」으로 옮겨 적혀요</small><input type="number" min="0" data-m-in="day.resvNext" data-a="${a.id}" value="${+d.resvNext || ''}" placeholder="0"></label></div>
      <label class="chk"><input type="checkbox" data-m-in="ing.isNew" data-a="${a.id}"${ing.isNew ? ' checked' : ''}> 원래 메뉴에 없던 새 재료예요 <small>(새 재료 주문할 양을 계산해요)</small></label>
      <p class="mprep" id="mp-${a.id}">${prepLine(a)}</p>`;
  }
  function prepLine(a) {
    const p = prep(a), ing = a.ing || {}, u = ing.unit || 'g', day = `내일(${md(p.tm)} ${WD[wd(p.tm)]})`;
    if (p.off) return `<b>${day} 만들 양 0</b> <small>내일은 ${p.off === '시험 끝' ? '시험 판매가 끝난 뒤예요' : '쉬는 요일이에요'}</small>`;
    if (!ing.name || !(ing.per > 0)) return `<b>${day} 만들 양</b> 주재료와 1인분 양을 적으면 계산해요`;
    if (p.none) return `<b>${day} 만들 양</b> 기록이 모자라요 — 같은 요일 2일 · 같은 평일/주말 2일 · 최근 7일 3일 중 하나가 쌓이거나, 시험 판매 설정에 하루 수량을 적으면 계산해요 (지금 판매한 날 ${p.n}일) <small>[가정]</small>`;
    const tail = `${p.left ? ` − 오늘 남은 ${fmt(p.left, u)}` : ''} = <b>${fmt(p.need, u)}</b>`;
    if (p.onlyResv) return `<b>${day} 만들 양 ${fmt(p.need, u)}</b> <small>기록이 모자라 내일 확정 예약만: 예약 ${p.resv}그릇 × ${ing.per}${esc(u)}${tail}</small>`;
    if (p.per) return `<b>${day} 만들 양 ${fmt(p.need, u)}</b> <small>${esc(p.basis)} ${fmt(p.cups)}그릇 × ${ing.per}${esc(u)}${tail} · 판매 기록이 쌓이면 기록으로 바꿔 셈</small>`;
    return `<b>${day} 만들 양 ${fmt(p.need, u)}</b> <small>기준 = ${esc(p.basis)} ${p.n}일 평균(예약 뺀 판매) ${fmt(p.base)} × (1 + ${Math.round(p.m * 100)}%${p.so ? ' 품절 있음' : ''} [가정])${p.resv ? ` + 내일 예약 ${p.resv}` : ''} = ${fmt(p.base * (1 + p.m) + p.resv)}그릇${p.resv > +trialOf(a).perDay && +trialOf(a).perDay > 0 ? ` → 예약 ${p.resv}그릇(하루 수량보다 많음)` : p.capped ? ` → 하루 수량 ${+trialOf(a).perDay}그릇까지` : ''} × ${ing.per}${esc(u)}${tail}</small><small class="fine">「공감 · 먹어보고 싶어요」는 관심이라 넣지 않아요.</small>`;
  }
  function flowBox(a) {
    const f = flowRows(a), ai = a.aiFlow && a.aiFlow.key === flowKey(f) ? a.aiFlow : null, ok = f.rows.filter(r => !r.thin).length;
    if (!f.rows.length) return '<p class="fine">판매 수를 적은 날이 생기면 요일별로 묶어 보여 줘요.</p>';
    return `<p class="fine">${esc(f.kind)}별 · 판매한 날 ${f.n}일 기준 · 사이트 계산${f.more ? ` · 평일 · 주말 각각 2일 [가정] 넘게 쌓이면 비교가 나와요(기록 ${f.more}일 더)` : ''}</p>
      <div class="tblwrap"><table class="otable sm"><thead><tr><th>${f.kind === '요일' ? '요일' : '묶음'}</th><th>기록한 날</th><th>평균 판매</th><th>품절 날</th><th>평균 품절 시각</th><th>평균 남은 양</th></tr></thead>
      <tbody>${f.rows.map(r => `<tr class="${ai && ai.out.more === r.d ? 'more' : ai && ai.out.less === r.d ? 'less' : ''}"><td>${esc(r.d)}${r.thin ? ' <small>(기록 더 필요)</small>' : ''}</td><td>${r.n}</td><td>${r.avg === '' ? '-' : r.avg}</td><td>${r.so}</td><td>${r.at || '-'}</td><td>${r.left === '' ? '-' : r.left}</td></tr>`).join('')}</tbody></table></div>
      ${ai ? `<p class="mline aiout">${esc(ai.out.line)} ${aiTag(true)}${ai.out.more ? `<br><small>더 만들 칸: <b>${esc(ai.out.more)}</b>${ai.out.less ? ` · 덜 만들 칸: <b>${esc(ai.out.less)}</b>` : ''}</small>` : ''}</p>`
        : ok >= 2 ? `<button class="cta2 sm" data-m="aiflow" data-a="${a.id}"${ui.busy['flow' + a.id] ? ' disabled' : ''}>${ui.busy['flow' + a.id] ? 'AI가 표를 읽는 중…' : 'AI로 한 줄 풀기'}</button>${ui.fail['flow' + a.id] ? ' <small class="fine">지금은 AI가 답하지 않아 표만 보여 드려요.</small>' : ''}` : ''}`;
  }
  const flowKey = f => JSON.stringify(f.rows.map(r => [r.d, r.n, r.avg, r.so, r.at, r.left]));
  function orderBox(a) {
    const o = a.order || {}, r = order(a), u = r.unit || 'g', tr = trialOf(a);
    const inputs = `<div class="ming"><label>다음 배송일<input type="date" data-m-in="order.next" data-a="${a.id}" value="${esc(o.next || '')}" min="${addDays(today(), 1)}"></label>
        <label>그 전에 들어올 양<input type="number" min="0" data-m-in="order.incoming" data-a="${a.id}" value="${o.incoming || ''}" placeholder="0"></label>
        <label>배송 간격(일)<input type="number" min="1" data-m-in="order.every" data-a="${a.id}" value="${o.every || ''}" placeholder="예: 3"></label>
        <label title="비우면 오늘 마감 남은 양">지금 있는 양<input type="number" min="0" data-m-in="order.have" data-a="${a.id}" value="${o.have == null ? '' : esc(o.have)}" placeholder="마감 남은 양"></label></div>`;
    return `${inputs}<p class="mprep" id="mo-${a.id}">${orderLine(a, r)}</p>
      ${r.qty && !r.done ? `<button class="cta2 sm" data-m="ordered" data-a="${a.id}">주문함 (${fmt(r.qty, u)})</button> <small class="fine">사이트가 주문하지 않아요 — 사장님이 주문한 뒤 눌러 기록해요</small>` : ''}
      ${(o.log || []).length ? `<p class="fine">주문 기록: ${o.log.slice(-3).map(x => `${md(x.at)} ${fmt(x.qty, u)}${x.for ? `(${md(x.for)} 분)` : ''}`).join(' · ')}</p>` : ''}
      <p class="fine">하루 쓰는 양 = 그날 만들 그릇 × 1인분(쉬는 요일 · 시험 끝 뒤 0). ${tr.on ? '' : '시험 판매 설정이 없으면 기록으로만 셈.'}</p>`;
  }
  function orderLine(a, r) {
    r = r || order(a); const u = r.unit || 'g';
    if (r.skip) return '';
    if (r.unknown) return `<b>${r.first ? '첫 주문' : '다음 주문'}</b> 판매 기록이 모자라 셀 수 없는 날이 있어요 — 시험 판매 설정에 하루 수량을 적거나 기록이 더 쌓이면 계산해요 <small>[가정]</small>`;
    if (r.after) return `<b>다음 주문</b> ${md(r.D)}은 시험 판매가 끝난 뒤라 주문할 것이 없어요`;
    if (r.first && r.wait) return '<b>첫 주문</b> 시험 판매 기간(시험 판매 설정)을 정하면 계산해요';
    if (r.first && r.done) return `<b>✓ 첫 주문 ${fmt(r.done.qty, u)} 주문함</b> <small>(${md(r.done.at)} 기록)</small>`;
    if (r.first) return `<b>처음에 ${fmt(r.qty, u)} 들이세요</b> <small>= ${md(r.from)}~${md(r.end)} 하루 쓰는 양 합 ${fmt(r.use, u)} × 1.1(여유 [가정])${r.L ? ` − 지금 있는 ${fmt(r.L, u)}` : ''}</small>`;
    if (r.unknown) return `<b>${r.first ? '첫 주문' : '다음 주문'}</b> 판매 기록이 모자라 셀 수 없는 날이 있어요 — 시험 판매 설정에 하루 수량을 적거나 기록이 더 쌓이면 계산해요 <small>[가정]</small>`;
    if (r.wait) return '<b>다음 주문</b> 다음 배송일을 적으면 「그 전에 충분한지 · 그날 받을 양」을 계산해요';
    const lack = r.short ? `<b class="bad">${md(r.D)} 전에 ${fmt(r.short, u)} 모자라요</b> — 오늘 급히 더 들이거나 하루 수량을 줄이세요` : `${md(r.D)} 전엔 충분해요`;
    return `${lack}<br>${r.done ? `<b>✓ ${md(r.D)} 분 ${fmt(r.done.qty, u)} 주문함</b> <small>(${md(r.done.at)} 기록)</small> · 지금 계산은 ` : ''}<b>${md(r.D)} 분으로 ${fmt(r.qty, u)} 주문</b> <small>= ${md(r.D)}~${md(r.end2)} 쓰는 양 ${fmt(r.u2, u)} − 그때 남을 양 ${fmt(r.R, u)} · 그 전 쓰는 양 ${fmt(r.u1, u)} = 지금 ${fmt(r.L, u)} + 들어올 ${fmt(r.I, u)}${r.short ? '보다 많음' : ' 안'}</small>`;
  }
  function notesBox(c, a) {
    const L = notesOf(a), key = JSON.stringify(L.map(n => n.id)), ai = a.aiEcho && a.aiEcho.key === key ? a.aiEcho.out : null, w = wishById(a.wish);
    if (!L.length) return '<p class="fine">「가 봤어요」를 누른 시민이 한 줄을 남기면 여기에 모여요(모두에게 공개 · 사장님은 지울 수 없고 운영단이 신고를 처리해요).</p>';
    return `${w ? `<p class="fine">처음 바람: 「${esc(w.title)}」 — ${esc(w.why)}</p>` : ''}<ol class="notes">${L.map((n, i) => `<li id="nt-${a.id}-${i + 1}">${esc(n.t)} <small>${md(ymd(new Date(n.at)))}</small></li>`).join('')}</ol>
      ${ai ? `<div class="mline aiout">${ai.same.map(x => `<p><b>반복된 반응</b> ${esc(x.t)} <small>${x.refs.map(n => `#${n}`).join(' ')}</small></p>`).join('')}${ai.gap ? `<p><b>바람과 어긋난 점</b> ${esc(ai.gap.t)} <small>${ai.gap.refs.map(n => `#${n}`).join(' ')}</small></p>` : ''}<p><b>다음 주 해 볼 일</b> ${esc(ai.try)} ${aiTag(true)}</p>
        ${c.mode !== 'teamOff' ? `<button class="cta2 sm" data-m="echotry" data-a="${a.id}">이걸로 한 가지 바꾸기</button>` : ''}</div>`
        : L.length >= 3 ? `<button class="cta2 sm" data-m="aiecho" data-a="${a.id}"${ui.busy['echo' + a.id] ? ' disabled' : ''}>${ui.busy['echo' + a.id] ? 'AI가 읽는 중…' : 'AI로 바람과 맞대 보기'}</button>${ui.fail['echo' + a.id] ? ' <small class="fine">지금은 AI가 답하지 않아 목록만 보여 드려요.</small>' : ''}` : '<p class="fine">한 줄이 3개 이상 모이면 처음 바람과 맞대어 정리해요.</p>'}`;
  }
  function tweakBox(c, a) {
    const L = a.changes || [], cur = L.find(x => x.state === '진행 중'), canEdit = c.mode === 'owner' || c.mode === 'team';
    const hist = L.filter(x => x !== cur).slice(-3).map(x => `<li>${md(x.from)} 「${esc(x.what)}」 — <b>${esc(x.state)}</b></li>`).join('');
    if (cur) {
      const cp = compare(a, cur), key = JSON.stringify(cp.rows || []), ai = cur.ai && cur.ai.key === key ? cur.ai : null;
      return `<p><b>진행 중</b> ${md(cur.from)}부터 「${esc(cur.what)}」</p>
        ${cp.rows ? `<p class="fine">비교 기준: ${esc(cp.basis)} · 사이트 계산</p><div class="tblwrap"><table class="otable sm"><thead><tr><th>칸</th><th>항목</th><th>바꾸기 전</th><th>바꾼 뒤</th></tr></thead><tbody>${cp.rows.map(r => `<tr><td>${esc(r.d)}</td><td>${esc(r.k)}</td><td>${esc(r.b)}</td><td>${esc(r.a)}</td></tr>`).join('')}</tbody></table></div>
          ${ai ? `<p class="mline aiout">${esc(ai.line)} ${aiTag(true)}</p>` : `<button class="cta2 sm" data-m="aieffect" data-a="${a.id}"${ui.busy['effect' + a.id] ? ' disabled' : ''}>${ui.busy['effect' + a.id] ? 'AI가 표를 읽는 중…' : 'AI로 한 줄 풀기'}</button>${ui.fail['effect' + a.id] ? ' <small class="fine">지금은 AI가 답하지 않아 표만 보여 드려요.</small>' : ''}`}`
          : `<p class="fine">바꾸기 전 · 바꾼 뒤 판매한 날이 각 3일 넘게 쌓이면 비교 표가 열려요(지금 전 ${cp.nB}일 · 뒤 ${cp.nA}일 · 기록 ${cp.need}일 더).</p>`}
        ${c.mode === 'owner' ? `<div class="k2nav"><button class="cta2 sm" data-m="tweakback" data-a="${a.id}">되돌리기</button><button class="cta sm" data-m="tweakkeep" data-a="${a.id}">이대로 유지</button></div>` : ''}
        ${hist ? `<ul class="fine">${hist}</ul>` : ''}`;
    }
    const dr = ui['tw' + a.id] || { what: '', from: today() };
    return `${canEdit ? `<div class="ming two"><label>무엇을 바꾸나요<input data-m-in="tw.what" data-a="${a.id}" value="${esc(dr.what)}" maxlength="40" placeholder="예: 저녁 판매분 따로 준비"></label>
        <label>시작일<input type="date" data-m-in="tw.from" data-a="${a.id}" value="${esc(dr.from)}" max="${today()}"></label></div>
      <p class="err" id="twerr-${a.id}" hidden></p>
      <button class="cta2 sm" data-m="tweakgo" data-a="${a.id}">한 가지 바꾸기 시작</button> <small class="fine">한 번에 하나씩 — 바꾸기 전 · 뒤 판매를 사이트가 비교해요</small>` : ''}
      ${hist ? `<ul class="fine">${hist}</ul>` : ''}`;
  }
  function trialBox(a) {
    const t = trialOf(a);
    return `<label class="chk"><input type="checkbox" data-m-in="t.on" data-a="${a.id}"${t.on ? ' checked' : ''}> 시험 판매</label>
      <div class="ming"><label>시작<input type="date" data-m-in="t.from" data-a="${a.id}" value="${esc(t.from || '')}"></label><label>끝<input type="date" data-m-in="t.to" data-a="${a.id}" value="${esc(t.to || '')}"></label>
        <label>하루 수량<input type="number" min="0" data-m-in="t.perDay" data-a="${a.id}" value="${t.perDay || ''}" placeholder="선택"></label><label>시험 가격(원)<input type="number" min="0" step="100" data-m-in="t.price" data-a="${a.id}" value="${esc(t.price || '')}" placeholder="선택"></label></div>
      <div class="offd">쉬는 요일 ${WD.map((n, w) => `<button class="${(t.offDays || []).includes(w) ? 'on' : ''}" data-m="t.off" data-a="${a.id}" data-v="${w}">${n}</button>`).join('')}</div>`;
  }
  // ⓖ 시험 끝 요약: 숫자는 모두 사이트 계산, AI 없음
  function summaryBox(c, a) {
    const t = trialOf(a), sx = stats(a), D = soldDays(a), f = funnel(a), lf = D.filter(hasLeft), price = +t.price || 0, ech = a.aiEcho && a.aiEcho.key === JSON.stringify(notesOf(a).map(n => n.id)) ? a.aiEcho.out : null, inT = D.filter(d => d.date >= (t.from || '') && d.date <= (t.to || '9')), soldT = inT.reduce((x, d) => x + d.sold, 0);
    return `<div class="msum"><p class="kick">시험 판매 ${md(t.from)}~${md(t.to)} ${today() > t.to ? '끝' : '정리'} — 남길까 · 접을까</p>
      <dl class="mdl"><dt>판매한 날</dt><dd>${sx.soldDays}일 · 누적 ${sx.sold}${price ? ` · 시험 기간 안 시험 가격 × 판매 ${fmt(soldT * price, '원')}` : ''}</dd>
        <dt>품절 날</dt><dd>${D.filter(d => d.soldout).length}일 · 평균 남은 양 ${lf.length ? fmt(mean(lf.map(d => +d.left)), (a.ing || {}).unit || '') : '-'}</dd>
        <dt>손님 고리</dt><dd>먹어보고 싶어요 ${f.wants} → 보여 주기 ${f.shows} → 가 봤어요 ${f.went} → 바람 보고 온 손님 ${f.came}</dd>
        <dt>가 본 시민</dt><dd>한 줄 ${notesOf(a).length}개${ech && ech.same[0] ? ` · 반복된 반응 「${esc(ech.same[0].t)}」` : ''}</dd>
        <dt>바꾼 것</dt><dd>${(a.changes || []).map(x => `「${esc(x.what)}」 ${esc(x.state)}`).join(' · ') || '없음'}</dd></dl>
      ${c.mode === 'owner' ? `<div class="k2nav"><button class="cta2 sm" data-m="outcome" data-a="${a.id}" data-v="접기">접기 (시민에게 「끝났어요」)</button><button class="cta2 sm" data-m="outcome" data-a="${a.id}" data-v="늘리기">기간 1주 늘리기 [가정]</button><button class="cta sm" data-m="outcome" data-a="${a.id}" data-v="정식">정식 메뉴로</button></div>` : ''}</div>`;
  }
  function midCol(c, s) {
    const L = myAnswers(s);
    return `<section class="mcol"><h3>답한 메뉴 <small>${L.length}개 · 하루 한 줄</small></h3>
      ${L.map(a => mcard(c, s, a)).join('') || '<p class="emptyw">아직 답한 메뉴가 없어요. 왼쪽 근처 바람에 [답하기]를 눌러 보세요.</p>'}
      <p class="fine">「바람 보고 온 손님」은 시민이 알림에서 연 「가게에서 이 화면 보여 주기」를 보여 줄 때 세요. 그 화면의 [사장님 확인]을 누르면 시민 화면에서 확인한 손님으로 따로 남고, 바쁠 땐 여기 [＋]로 세요. 화면을 보여 준 손님만 세므로 실제와 다를 수 있어요 — 운영단은 「보여 주기 연 회원」 수와 같이 봐요.</p></section>`;
  }

  function areaBlock(s) {
    const ar = area(s);
    if (!ar) return `<div id="marea"><p class="emptyw">가게 설정에서 업종(소분류)과 위치를 고르면 계산해요.</p></div>`;
    const ak = areaKey(s, ar), ln = s.area && s.area.key === ak ? s.area : ui.area && ui.area.key === ak ? ui.area : null;
    const base = `같은 업종(${s.sub}) ${ar.before}곳 → ${ar.now}곳, 사라진 업소 ${ar.goneAll}곳${ar.vac.find(v => v.w) ? ` · 근처 빈칸에 「${ar.vac.find(v => v.w).w.title}」 바람이 있어요` : ''}`;
    const vacW = ar.vac.filter(v => v.w).sort((a, b) => store.likes(b.w) - store.likes(a.w));
    return `<div id="marea">
      <p class="mline aiout">${ln ? `${esc(ln.line || base)} ${aiTag(ln.ai && !!ln.line)}` : `<small class="busy">AI가 한 줄로 푸는 중…</small>`}</p>
      <dl class="mdl"><dt>같은 업종</dt><dd><b>${ar.before} → ${ar.now}곳</b> <small>${esc(s.sub)} · 우리 가게는 빼고 공공데이터에 있는 업소 · 새로 ${ar.born} · 사라짐 ${ar.goneSame}</small></dd>
        <dt>사라진 업소</dt><dd><b>${ar.goneAll}곳</b> ${ar.goneSubs.length ? `<small>${ar.goneSubs.slice(0, 5).map(([k, n]) => `${esc(k)} ${n}`).join(' · ')}${ar.goneSubs.length > 5 ? ` 외 ${ar.goneSubs.length - 5}종` : ''}</small>` : ''}</dd>
        <dt>근처 빈칸</dt><dd><b>${ar.vac.length}곳</b> ${vacW.length ? `<small>바람 1위 「${esc(vacW[0].w.title)}」 ♥${store.likes(vacW[0].w)}</small>` : '<small>바람은 아직 없음</small>'}</dd></dl>
      ${vacW.length ? `<button class="cta2 sm" data-m="ans" data-w="${vacW[0].w.id}">이 빈칸 바람에 답하기 ←</button>` : ''}
    </div>`;
  }
  function rightCol(c, s) {
    const ar = area(s); if (c.mode === 'owner' || c.mode === 'team') loadArea(s, ar);
    return `<section class="mcol"><h3>상권 변화 <span class="tag calc">계산</span></h3>
      <p class="mq">${esc(QL)} · 우리 가게 100m 안</p>
      ${areaBlock(s)}
      <p class="fine">소상공인시장진흥공단 상가(상권)정보 분기 파일로 빈칸과 같은 방법으로 셌어요. 사라진 업소는 폐업뿐 아니라 이전 · 상호 변경일 수도 있어요. 분기마다 새 파일이 오면 다시 세요.</p></section>`;
  }

  function k1(c, s) {
    const tk = T().tokens ? T().tokens(s.item) : [];
    const cnt = {}; M.bg.forEach(b => { cnt[b[3]] = (cnt[b[3]] || 0) + 1; });
    const subsAll = M.subs.map((n, i) => ({ n, c: cnt[i] || 0 })).filter(x => x.c).sort((a, b) => b.c - a.c);
    const sug = subsAll.filter(x => tk.some(k => x.n.split(/[\/ ]/).some(p => p && (p.includes(k) || k.includes(p)))));
    const pt = ptOf(s);
    return `<section class="ocard k1"><div class="ohead"><h2>가게 설정</h2><p class="was">근처 바람 · 상권 변화를 계산하는 데 써요. 가게 이름 · 메뉴 이름은 답을 올릴 때 시민에게 보여요.</p></div>
      <div class="k1grid"><div>
        <div class="orow"><label class="ofl">가게 이름<input data-m-in="name" value="${esc(s.name)}" maxlength="20" placeholder="예: ○○덮밥"></label>
          <label class="ofl">업종<input data-m-in="item" value="${esc(s.item)}" maxlength="20" placeholder="예: 덮밥집"></label></div>
        <label class="ofl">상권 비교에 쓸 업종 <small>(공공데이터 업종 분류 — 우리 가게와 같은 업종을 셀 때 씀)</small><select data-m-in="sub"><option value="">고르기</option>
          ${sug.length ? `<optgroup label="업종 이름과 닿는 분류">${sug.map(x => `<option value="${esc(x.n)}"${s.sub === x.n ? ' selected' : ''}>${esc(x.n)} (동성로 ${x.c}곳)</option>`).join('')}</optgroup>` : ''}
          <optgroup label="전체 (동성로 업소 많은 순)">${subsAll.map(x => `<option value="${esc(x.n)}"${s.sub === x.n && !sug.includes(x) ? ' selected' : ''}>${esc(x.n)} (${x.c}곳)</option>`).join('')}</optgroup></select></label>
        <fieldset class="ofs"><legend>지금 메뉴 이름 <small>3~8개 · 가격은 선택</small></legend>
          ${s.menus.map((m, i) => `<div class="mrow"><input data-m-in="menu.name" data-i="${i}" value="${esc(m.name)}" maxlength="20" placeholder="메뉴 ${i + 1}"><input data-m-in="menu.price" data-i="${i}" value="${esc(m.price)}" maxlength="10" placeholder="가격(선택)" inputmode="numeric">${s.menus.length > 3 ? `<button class="x2" data-m="delmenu" data-i="${i}" aria-label="메뉴 ${i + 1} 지우기">×</button>` : ''}</div>`).join('')}
          ${s.menus.length < 8 ? '<button class="link" data-m="addmenu">＋ 메뉴 더하기</button>' : ''}</fieldset>
        <label class="ofl">가격 · 행사 <small>(선택 — 답글에 가격 · 할인을 쓰려면 여기에 먼저)</small><textarea data-m-in="offer" rows="2" maxlength="80" placeholder="예: 평일 점심 덮밥 8,000원">${esc(s.offer)}</textarea></label>
        <label class="ofl">첫 방문 혜택 <small>(선택 — 바람 보고 온 시민의 「보여 주기」 화면에 크게 보여요)</small><input data-m-in="perk" value="${esc(s.perk)}" maxlength="40" placeholder="예: 첫 방문 음료 하나"></label>
      </div><div>
        <p class="ofl">가게 위치 <small>지도에서 가게 자리를 눌러 찍어 주세요(끌면 지도가 움직여요)</small></p>
        <div class="k1box"><div class="map k1map" id="k1map"></div></div>
        <p class="k1pt" id="k1pt">${pt ? `📍 <b>${esc(placeOf(s))}</b> ${s.pt ? '' : '<small>(사장님 상담에서 고른 곳 — 지도에서 정확히 찍어 주세요)</small>'}` : '아직 위치가 없어요'}</p>
        <div class="k1find"><input id="k1addr" placeholder="주소 · 건물 이름으로 찾기 (예: 교동2길 43)" maxlength="40"><button class="cta2 sm" data-m="addr">찾기</button></div>
        <div class="ochips">${LM.map(l => `<button data-m="lm" data-v="${esc(l.name)}">${esc(l.name)} 근처</button>`).join('')}</div>
      </div></div>
      <p class="err" id="merr" hidden></p>
      <div class="onav">${s.setup ? '<button class="cta2" data-m="v" data-v="k">← 내 가게로</button>' : '<span></span>'}<button class="cta" data-m="save1">${s.setup ? '설정 저장' : '저장하고 근처 바람 보기 →'}</button></div></section>`;
  }

  function k4(c, s) {
    const ap = appOf(s), cur = today().slice(0, 7), mo = s.months.find(m => m.ym === cur) || {}, rows = monthly(s), sh = shareOf(s);
    const cell = v => v == null ? '<td class="off">공유 안 함</td>' : `<td>${esc(v === '' ? '—' : v)}</td>`;
    return `<section class="ocard"><div class="ohead"><h2>공유 항목 · 이번 달 확인</h2><p class="was">운영단(대구시 + 지역 대학)에 달마다 가는 것만 골라요. ${ap ? `동행 프로젝트 지원서(${ap.result === 'yes' ? '선정' : ap.result === 'no' ? '이번엔 선정 안 됨 · 함께 살펴보는 가게' : '심사 중'})에서 동의한 앞의 두 항목은 꼭 필요해서 켜진 채로 잠겨 있어요.` : '동행 프로젝트에 지원하면 앞의 두 항목은 꼭 필요한 항목이 돼요.'}</p></div>
      <div class="shares">${SHARE_KEYS.map(([k, t, req]) => { const lock = req && !!ap; return `<label class="share1${lock ? ' lock' : ''}"><input type="checkbox" data-m-in="share" data-k="${k}"${sh[k] ? ' checked' : ''}${lock ? ' disabled' : ''}> ${esc(t)}${lock ? ' <small>필수 · 잠김</small>' : ''}</label>`; }).join('')}</div>
      <p class="fine">보내지 않는 것: 메뉴 가격 · 정확한 매출 · 답글 밖의 메모 · 손님 정보. 운영단 표에는 구간과 횟수만 나와요.</p>
      <h3 style="margin-top:16px">이번 달(${cur.replace('-', '.')}) 매출 구간 <small>월 1회 · 사장님이 직접 고름 · 구간 경계 [가정]</small></h3>
      <div class="ochips">${BANDS.map(b => `<button class="${mo.band === b ? 'on' : ''}" data-m="band" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>
      <h3 style="margin-top:16px">운영단에 가는 월 집계 미리 보기</h3>
      <div class="tblwrap"><table class="otable"><thead><tr><th>달</th><th>영업 일수</th><th>매출 구간</th><th>답 수</th><th>판매 일수</th><th>누적 판매</th><th>바람 보고 온 손님</th><th>바꾼 것</th><th>유지</th><th>시험 결과</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.ym.replace('-', '.')}${r.alive ? ` <small>${esc(r.alive)}</small>` : ''}</td>${cell(r.open)}${cell(r.band)}${cell(r.answers)}${cell(r.soldDays)}${cell(r.sold)}${cell(r.came)}${cell(r.changes)}${cell(r.kept)}${cell(r.outcome)}</tr>`).join('')}</tbody></table></div>
      <div class="onav"><button class="cta2" data-m="v" data-v="k">← 내 가게로</button><span></span></div></section>`;
  }

  function k5(c, s) {
    const ap = appOf(s), t = s.team;
    if (!ap || ap.result !== 'yes') return `<section class="ocard"><div class="ohead"><h2>학생 팀</h2><p class="was">동행 프로젝트에 선정된 가게가 학기 중에 학생 팀(4명 + 지도교수)을 초대해요. ${ap ? (ap.result === 'no' ? '이번 기수에는 선정되지 않았어요. 「내 가게」는 똑같이 쓰고, 같은 기록으로 함께 살펴봐요.' : '지원서가 운영단 심사 중이에요.') : '아직 지원서가 없어요.'}</p></div>
      <p class="fine">「근처 바람으로 메뉴 실험」은 학생 팀 과제 후보예요(메뉴 설계 · 답글 · 기록 양식 — 식품영양 · 경영 · 미디어).</p>
      <div class="onav"><button class="cta2" data-m="v" data-v="k">← 내 가게로</button>${ap ? '<span></span>' : '<button class="cta" data-act="owner">동행 프로젝트 지원하기 →</button>'}</div></section>`;
    const teamOps = (st.teams[ap.id] || { members: [] }).members;
    const done = t.checks.every(Boolean), handed = !!t.handedAt, after = handed ? myAnswers(s).filter(a => a.at > t.handedAt).length : 0;
    const facts = [myAnswers(s).filter(a => a.byTeam).length ? `학생 팀과 쓴 답 ${myAnswers(s).filter(a => a.byTeam).length}개` : '', `기록한 날 ${new Set(myAnswers(s).flatMap(a => (a.days || []).map(d => d.date))).size}일`, handed ? `인수인계 뒤 답 ${after}개` : `사장님 혼자 올린 답 ${myAnswers(s).filter(a => !a.byTeam).length}개`, ''];
    return `<section class="ocard"><div class="ohead"><h2>학생 팀 <small>동행 프로젝트 1기 · ${esc(ap.item)}</small></h2><p class="was">학기 중 초대한 학생은 답 초안 · 답한 메뉴 기록을 같이 써요. 답 올리기는 사장님만 해요.</p></div>
      ${teamOps.length ? `<h3>운영단이 짠 팀</h3><div class="tlist">${teamOps.map(m => { const inv = t.members.find(x => x.uid === m.uid); return `<div class="trow"><span><b>${esc(m.name)}</b> <small>${esc(m.major)} · ${esc(m.slotT || '')}</small></span>${inv ? `<small>${inv.on ? '초대함 · 권한 켜짐' : '권한 꺼짐'}</small>` : `<button class="cta2 sm" data-m="invite" data-u="${esc(m.uid)}" data-n="${esc(m.name)}" data-j="${esc(m.major)}"${handed ? ' disabled' : ''}>초대</button>`}</div>`; }).join('')}</div>` : '<p class="fine">운영단이 팀을 짜면 여기에 학생이 떠요. 아이디로 직접 초대할 수도 있어요.</p>'}
      <div class="k1find"><input id="k5id" placeholder="학생 아이디로 초대" maxlength="20"${handed ? ' disabled' : ''}><button class="cta2 sm" data-m="inviteid"${handed ? ' disabled' : ''}>초대</button></div>
      ${t.members.length ? `<h3>초대한 학생</h3><div class="tlist">${t.members.map((m, i) => `<div class="trow"><span><b>${esc(m.name)}</b> <small>@${esc(m.uid)}${m.major ? ' · ' + esc(m.major) : ''}</small></span>${m.on ? `<button class="cta2 sm" data-m="revoke" data-i="${i}">권한 끄기</button>` : '<small>권한 꺼짐</small>'}</div>`).join('')}</div>` : ''}
      <label class="ofl" style="max-width:260px">학기 끝 <input type="date" data-m-in="team.until" value="${esc(t.until)}"${handed ? ' disabled' : ''}></label>
      <h3 style="margin-top:16px">인수인계 체크 4개 <small>학생이 떠나도 사장님이 혼자 다음 바람에 답할 수 있게</small></h3>
      <div class="checks">${CHECKS.map((x, i) => `<label class="chk1${t.checks[i] ? ' on' : ''}"><input type="checkbox" data-m-in="team.check" data-i="${i}"${t.checks[i] ? ' checked' : ''}${handed ? ' disabled' : ''}> ${esc(x)}${facts[i] ? ` <small>${esc(facts[i])}</small>` : ''}</label>`).join('')}</div>
      <p class="fine"><button class="link" data-m="guide">사용법 한 장 보기 · 인쇄</button> — 학생 팀이 사장님께 남기는 「내 가게」 사용법이에요.</p>
      ${handed ? `<div class="okpost"><p class="kick">인수인계 끝 · ${ymd(new Date(t.handedAt))}</p><p>학생 권한이 모두 꺼졌어요. 그 뒤 사장님이 혼자 올린 답 <b>${after}개</b>.</p></div>`
        : `<div class="onav"><button class="cta2" data-m="v" data-v="k">← 내 가게로</button><button class="cta" data-m="handover"${done && t.members.length ? '' : ' disabled'}>인수인계 완료 → 학생 권한 끄기</button></div>`}
    </section>`;
  }

  // 과제 1-2 ② 「도입하고 계속 쓰게」: 쓰는 법 · 비용 · 교육 · 막힐 때 (설계서 §8)
  const helpCard = s => `<section class="mhelp"><div><b>쓰는 법</b><ol><li>근처 바람에 「우리 가게에서 해 볼게요」라고 답해요</li><li>알림을 받은 손님이 가게에서 화면을 보여 주면 확인해요</li><li>답한 메뉴를 하루 한 줄 적어요 — 분기마다 상권 변화도 와요</li></ol></div>
      <div><b>비용 · 교육</b><p>동행 프로젝트 선정 가게와 함께 살펴보는 가게는 무료 [제안]. AI 비용은 운영단 예산으로 [확인 필요]. 선정 가게는 학생 팀이 한 학기 같이 쓰고 사용법 한 장을 남겨요.</p></div>
      <div><b>막히면</b><p>오른쪽 아래 빈칸 도우미에게 물어보세요. 기록이 한 달 넘게 끊기면 「지금 영업 중이세요?」를 먼저 여쭤봐요. <button class="link" data-m="guide">사용법 한 장</button></p></div></section>`;
  const guideHTML = () => `<div class="guide"><h3>「내 가게」 사용법 한 장</h3><ol>
      <li><b>가게 설정</b> — 가게 이름 · 업종 · 메뉴 3개 이상 · 지도에서 위치. 가격 · 행사와 첫 방문 혜택은 여기에 적은 것만 답글에 쓸 수 있어요.</li>
      <li><b>근처 바람에 답하기</b> — 가게 150m(없으면 300m) 안 빈칸 바람을 보고 [답하기]. AI가 「채울 수 있나 · 메뉴 · 답글」 초안을 내면 고쳐서 올려요. 연락처 · 링크 · 남 깎아내리는 말은 안 올라가요.</li>
      <li><b>손님 확인</b> — 알림을 받은 시민이 「가게에서 이 화면 보여 주기」를 보여 주면 그 화면의 [사장님 확인]을 누르거나 답한 메뉴 카드의 [＋]를 눌러요.</li>
      <li><b>하루 한 줄</b> — 판매 수 · 품절. 판매한 날이 3일 넘으면 내일 준비량이 나와요. 안 팔리면 「끝남」으로 접어요(시민에게 「끝났어요」).</li>
      <li><b>상권 변화</b> — 분기마다 가게 100m 안 같은 업종 · 사라진 업소 · 근처 빈칸이 바뀌어요. 근처 빈칸 바람에도 답할 수 있어요.</li>
      <li><b>이번 달 확인</b> — 동행 프로젝트 가게는 달마다 매출 구간을 골라요. 운영단에는 구간과 횟수만 가요.</li></ol>
      <button class="cta" data-act="printguide">인쇄하기</button></div>`;
  function render() {
    const c = ctx();
    if (c.mode === 'none') return `<div class="owrap"><p class="emptyw">로그인하면 「내 가게」를 열 수 있어요.</p></div>`;
    if (c.mode === 'teamOff') return `<div class="mwrap">${bar(c, null)}<section class="ocard"><h2>인수인계가 끝나 학생 권한이 꺼졌어요</h2><p class="was">${esc(c.s.name || c.s.item)} 가게와 함께한 한 학기 수고 많았어요. 경력 카드는 대학생 화면에서 볼 수 있어요.</p><div class="onav"><button class="cta2" data-m="map">지도로</button><button class="cta" data-act="student">대학생 화면 →</button></div></section></div>`;
    const s = c.s;
    let body;
    if (c.mode === 'owner' && (ui.view === 'k1' || !s.setup)) body = k1(c, s);
    else if (c.mode === 'owner' && ui.view === 'k4') body = k4(c, s);
    else if (c.mode === 'owner' && ui.view === 'k5') body = k5(c, s);
    else body = `<div class="mgrid">${leftCol(c, s)}${midCol(c, s)}${rightCol(c, s)}</div>${c.mode === 'owner' ? helpCard(s) : ''}`;
    return `<div class="mwrap">${bar(c, s)}${banners(c, s)}${body}<div class="oad">${A.adHTML('mystore', 'panel')}</div></div>`;
  }

  // K1 작은 지도 · 답하기 대기 처리 (그린 뒤에 app.js가 부름)
  let mini = null;
  function mount() {
    const c = ctx(), el = document.getElementById('k1map');
    if (el && c.s) {
      const s = c.s;
      const pinsOf = () => M.spaces.map(v => ({ id: v.id, x: v.x, y: v.y, cls: 'empty', html: '<i class="sq"></i>', label: '빈칸 ' + shortAddr(v), z: 1 }))
        .concat(ptOf(s) ? [{ id: '_me', x: ptOf(s).x, y: ptOf(s).y, cls: 'store', html: '<span>내 가게</span>', label: '내 가게 위치', z: 9999 }] : []);
      // spaceId: 빈칸 핀을 직접 눌렀을 때만(그 빈칸에 연 가게). 빈 곳을 찍으면 빈칸과 상관없는 위치
      const setPt = (x, y, label, spaceId) => {
        x = +(+x).toFixed(6); y = +(+y).toFixed(6);
        const near = LM.map(l => ({ l, m: dist(l, { x, y }) })).sort((a, b) => a.m - b.m)[0];
        s.pt = { x, y, label: label || (near.m <= 250 ? `${near.l.name} 근처` : '찍은 위치') };
        s.space = spaceId || null;
        db.putStore(s); mv && mv.draw(pinsOf());
        const t = document.getElementById('k1pt'); if (t) t.innerHTML = `📍 <b>${esc(placeOf(s))}</b> <small>(${x.toFixed(5)}, ${y.toFixed(5)})</small>`;
      };
      let mv = null;
      // 상권 데이터 상자에서 100m 넘게 안쪽만 찍게(가장자리면 100m 원이 잘려 업소 수가 덜 나옴)
      const inside = (x, y) => { const [x0, y0, x1, y1] = M.meta.box, mx = 100 / A.KX, my = 100 / A.KY; return x > x0 + mx && x < x1 - mx && y > y0 + my && y < y1 - my; };
      const spot = (x, y) => inside(x, y) ? setPt(x, y) : A.toast('동성로 범위(빈칸 데이터가 있는 곳) 밖이에요 — 조금 더 안쪽을 찍어 주세요');
      mini = { setPt, focus: p => mv && mv.focus(p), inside };
      MapView.create(el, M, { onPick: id => { if (SP[id]) setPt(SP[id].x, SP[id].y, shortAddr(SP[id]) + ' (빈칸이던 자리)', id); }, onSpot: spot }).then(v => {
        if (!document.body.contains(el)) return;
        mv = v; v.draw(pinsOf()); const p = ptOf(s); if (p) v.focus(p);
      });
    }
    if (ui.pending && c.s && c.s.setup) {
      const wid = ui.pending, m = reachable(c.s, wid); ui.pending = null;
      if (m <= 300) ui.extra.add(wid);
      const x = nearList(c.s).list.find(y => y.w.id === wid);
      if (x) openAnswer(c, x); else { ui.msg = `그 바람은 가게에서 약 ${roundDist(m)}m라 답할 수 없어요(가게 300m 안 바람만 답해요). 위치가 맞는지 가게 설정에서 확인해 주세요.`; rerender(); }
    }
    if (ui.open) { const el2 = document.getElementById('nw-' + ui.open); if (el2 && ui.scrollTo) { el2.scrollIntoView({ block: 'center' }); ui.scrollTo = false; } }
  }
  function openAnswer(c, x) {
    ui.open = x.w.id; ui.scrollTo = true;
    const mine = myAnswerFor(c.s, x.w.id);
    if (!c.s.drafts[x.w.id] && mine) c.s.drafts[x.w.id] = { fit: mine.fit, why: mine.why || '', idea: mine.idea || '', menu: mine.menu, reply: mine.reply, ai: mine.ai };
    // 올린 답을 고칠 때 시험 판매 칸은 늘 지금 저장된 값으로(설정 칸 · 기간 늘리기로 바뀐 값 · 옛 답은 꺼짐)
    if (mine && c.s.drafts[x.w.id]) c.s.drafts[x.w.id].trial = mine.trial ? JSON.parse(JSON.stringify(mine.trial)) : { on: false, from: today(), to: addDays(today(), 20), perDay: '', offDays: [], price: '' };
    rerender();
    if (!c.s.drafts[x.w.id]) draftAnswer(c.s, x);
  }

  // ---------------- 동작 ----------------
  const isMine = () => document.body.classList.contains('work-open') && A.view().mode === 'mystore';
  const merr = (m, id = 'merr') => { const e = document.getElementById(id); if (e) { e.textContent = m; e.hidden = !m; } };
  W.addEventListener('input', e => {
    if (!isMine()) return;
    const k = e.target.dataset.mIn; if (!k) return;
    const c = ctx(), s = c.s; if (!s) return;
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (['name', 'item', 'offer', 'perk'].includes(k)) { s[k] = v; db.putStore(s); merr(''); return; }
    if (k === 'sub') { s[k] = v; db.putStore(s); return; }
    if (k === 'menu.name' || k === 'menu.price') { s.menus[+e.target.dataset.i][k.slice(5)] = v; db.putStore(s); return; }
    if (k === 'd.menu' || k === 'd.reply') {
      const d = s.drafts[e.target.dataset.w]; if (!d) return; d[k.slice(2)] = v; d.touched = true; db.putStore(s);
      if (k === 'd.reply') { const n = document.getElementById('cnt-' + e.target.dataset.w); if (n) n.textContent = `${v.length} / 100`; }
      merr('', 'k2err-' + e.target.dataset.w); return;
    }
    if (k.startsWith('d.trial.')) {
      const d = s.drafts[e.target.dataset.w]; if (!d) return; const t = d.trial || (d.trial = trialDefault()), f = k.slice(8);
      t[f] = f === 'on' ? !!v : v; d.touched = true; db.putStore(s);
      if (f === 'on') { const x = nearList(s).list.find(y => y.w.id === e.target.dataset.w); if (x) patch('k2-' + x.w.id, k2Block(s, x, c)); }
      return;
    }
    if (k === 'share') { if (c.mode !== 'owner') return; s.share[e.target.dataset.k] = v; db.putStore(s); return rerender(); }
    if (k === 'team.until') { s.team.until = v; db.putStore(s); return; }
    if (k === 'team.check') { s.team.checks[+e.target.dataset.i] = v; db.putStore(s); return rerender(); }
    // ③ 기록: 자주 누르는 칸은 숫자만 바꿈(화면이 튀지 않게)
    const a = db.answer(e.target.dataset.a); if (!a || a.sid !== s.id) return;
    if (k === 'day.date' || k === 'day.soldout' || k === 'ing.isNew' || k === 't.on') return;   // 날짜 · 체크는 change에서(입력 중 다시 그리지 않게)
    if (k.startsWith('ing.')) { a.ing = a.ing || { name: '', per: 0, unit: 'g' }; const f = k.slice(4); a.ing[f] = f === 'per' ? Math.max(0, +v || 0) : v; db.putAnswer(a); refreshNums(a); return; }
    if (k.startsWith('order.')) { const o = a.order || (a.order = {}), f = k.slice(6); o[f] = f === 'next' ? v : v === '' ? (f === 'have' ? null : '') : Math.max(0, +v || 0); db.putAnswer(a); refreshNums(a); return; }
    if (k.startsWith('tw.')) { const dr = ui['tw' + a.id] || (ui['tw' + a.id] = { what: '', from: today() }); dr[k.slice(3)] = v; merr('', 'twerr-' + a.id); return; }
    if (k.startsWith('t.')) { if (c.mode !== 'owner') return; const t = a.trial || (a.trial = trialDefault()), f = k.slice(2); t[f] = v; db.putAnswer(a); refreshNums(a); return; }
    const date = ui['date' + a.id] || today(), d = dayOf(a, date, true);
    if (k === 'day.sold') { d.sold = Math.max(0, Math.min(999, parseInt(v, 10) || 0)); if (d.sold > 0 && !s.openDays.includes(date)) s.openDays.push(date); if (c.mode === 'team') a.byTeam = true; }
    if (k === 'day.soldoutAt') d.soldoutAt = v;
    if (k === 'day.resv' || k === 'day.resvNext') d[k.slice(4)] = Math.max(0, parseInt(v, 10) || 0);
    if (k === 'day.left') d.left = v === '' ? null : Math.max(0, +v || 0);
    db.putAnswer(a); db.putStore(s); refreshNums(a);
  });
  W.addEventListener('change', e => {
    if (!isMine()) return;
    const k = e.target.dataset.mIn;
    if (k === 'sub') return rerender();
    if (k === 'day.date') { const v = e.target.value; if (v && v <= today() && /^\d{4}-\d{2}-\d{2}$/.test(v)) { ui['date' + e.target.dataset.a] = v; rerender(); } return; }
    const c = ctx(), s = c.s, a = s && db.answer(e.target.dataset.a); if (!a || a.sid !== s.id) return;
    // 체크 칸: 값을 저장하고 그 카드만 다시 그림(품절 시각 칸 · 새 재료 주문 칸이 열리고 닫힘)
    if (k === 'day.soldout') { const d = dayOf(a, ui['date' + a.id] || today(), true); d.soldout = e.target.checked; if (!d.soldout) d.soldoutAt = ''; }
    else if (k === 'ing.isNew') { a.ing = a.ing || { name: '', per: 0, unit: 'g' }; a.ing.isNew = e.target.checked; if (a.ing.isNew) ui.det[a.id + ':order'] = true; }
    else if (k === 't.on') { if (c.mode !== 'owner') return; const t = a.trial || (a.trial = trialDefault()); t.on = e.target.checked; }
    else return;
    db.putAnswer(a); repaint(c, s, a);
  });
  // <details> 펼침 상태 기억(카드를 다시 그려도 열린 칸 유지) — toggle은 버블되지 않아 capture로
  W.addEventListener('toggle', e => { const k = e.target.dataset && e.target.dataset.det; if (k) ui.det[k] = e.target.open; }, true);
  const repaint = (c, s, a) => keepScroll(() => patch('mc-' + a.id, mcard(c, s, a)));
  // 펼침 칸 하나만 다시 그림. 그 칸 안에서 입력 중이면 칸 밖으로 나갈 때까지 기다림
  function repaintBox(a, key) {
    const el = W.querySelector(`[data-det="${a.id}:${key}"]`), c = ctx(); if (!el || !c.s) return;
    if (el.contains(document.activeElement)) { const h = e => { if (!el.contains(e.relatedTarget)) { el.removeEventListener('focusout', h); setTimeout(() => repaintBox(a, key), 0); } }; el.addEventListener('focusout', h); return; }
    const html = key === 'flow' ? det(a.id, 'flow', '언제 얼마나 팔렸나', flowBox(a)) : key === 'notes' ? det(a.id, 'notes', '가 본 시민 한 줄', notesBox(c, a), ` <small>${notesOf(a).length}</small>`) : det(a.id, 'tweak', '한 가지 바꾸기', tweakBox(c, a), (a.changes || []).some(x => x.state === '진행 중') ? ' <small>진행 중</small>' : '');
    keepScroll(() => { el.outerHTML = html; });
  }
  function refreshNums(a) {
    const sx = stats(a), el = document.getElementById('ms-' + a.id);
    if (el) el.innerHTML = mstat(a);
    const fl = document.getElementById('mf-' + a.id); if (fl) fl.innerHTML = funnelLine(a);
    const p = document.getElementById('mp-' + a.id); if (p) p.innerHTML = prepLine(a);
    const o = document.getElementById('mo-' + a.id); if (o) o.innerHTML = orderLine(a);
    const d = dayOf(a, ui['date' + a.id] || today()), pc = document.getElementById('pc-' + a.id); if (pc) pc.textContent = d ? d.came : 0;
  }
  W.addEventListener('click', e => {
    if (!isMine()) return;
    const b = e.target.closest('[data-m]'); if (!b) return;
    e.preventDefault();
    const k = b.dataset.m, c = ctx(), s = c.s, owner = c.mode === 'owner';
    switch (k) {
      case 'map': return A.go('home');
      case 'v': if (!owner) return; ui.view = b.dataset.v; ui.msg = ''; return A.rerender();
      case 'addmenu': if (s.menus.length < 8) { s.menus.push({ name: '', price: '' }); db.putStore(s); } return rerender();
      case 'delmenu': s.menus.splice(+b.dataset.i, 1); db.putStore(s); return rerender();
      case 'lm': { const l = LM.find(x => x.name === b.dataset.v); if (l && mini) { mini.setPt(l.x, l.y, l.name + ' 근처'); mini.focus(l); } return; }
      case 'addr': return findAddr(document.getElementById('k1addr').value);
      case 'save1': {
        const names = s.menus.map(m => m.name.trim()).filter(Boolean);
        if (!s.name.trim()) return merr('가게 이름을 적어 주세요');
        if (!s.item.trim()) return merr('업종을 적어 주세요');
        if (!s.sub) return merr('상권 비교에 쓸 업종을 골라 주세요');
        if (!ptOf(s)) return merr('지도에서 가게 위치를 찍어 주세요');
        if (names.length < 3) return merr('지금 메뉴 이름을 3개 이상 적어 주세요');
        s.menus = s.menus.filter(m => m.name.trim()); while (s.menus.length < 3) s.menus.push({ name: '', price: '' });
        if (!s.pt) { const p = ptOf(s); s.pt = { x: p.x, y: p.y, label: placeOf(s) }; }
        s.setup = true; s.themes = null; s.area = null; db.putStore(s); ui.view = 'k'; A.rerender(); return;
      }
      case 'ans': { if (reachable(s, b.dataset.w) <= 300) ui.extra.add(b.dataset.w); const x = nearList(s).list.find(y => y.w.id === b.dataset.w); if (x) openAnswer(c, x); return; }
      case 'close2': ui.open = null; return rerender();
      case 'redraft': { const x = nearList(s).list.find(y => y.w.id === b.dataset.w); if (!x) return; delete s.drafts[x.w.id]; ui.busy['d' + x.w.id] = false; db.putStore(s); patch('k2-' + x.w.id, k2Block(s, x, c)); return draftAnswer(s, x); }
      case 'post': return post(c, b.dataset.w);
      case 'state': { if (!owner) return; const a = db.answer(b.dataset.a); if (!a || a.state === b.dataset.v) return;
        if (b.dataset.v === '끝남' && trialOf(a).on && !trialOf(a).done && !a.outcome) { ui.sum[a.id] = true; repaint(c, s, a); return A.toast('시험 판매를 정리해요 — 남길지 · 접을지 골라 주세요'); }
        a.state = b.dataset.v; if (a.state === '판매 중' && !a.startAt) a.startAt = Date.now(); if (a.state === '끝남') a.endAt = Date.now(); db.putAnswer(a); A.toast(a.state === '끝남' ? '접었어요 · 시민에게 「끝났어요」로 보여요' : `「${a.state}」로 바꿨어요`); return keepScroll(() => A.refresh()); }
      case 'guide': return A.openModal(guideHTML(), 'wide');
      case 'd.off': { const d = s.drafts[b.dataset.w]; if (!d) return; const t = d.trial || (d.trial = trialDefault()), w = +b.dataset.v; t.offDays = t.offDays.includes(w) ? t.offDays.filter(x => x !== w) : t.offDays.concat(w); d.touched = true; db.putStore(s); b.classList.toggle('on'); return; }
      case 't.off': { if (!owner) return; const a = db.answer(b.dataset.a); if (!a) return; const t = a.trial || (a.trial = trialDefault()), w = +b.dataset.v; t.offDays = (t.offDays || []).includes(w) ? t.offDays.filter(x => x !== w) : (t.offDays || []).concat(w); db.putAnswer(a); return repaint(c, s, a); }
      case 'ordered': { if (!owner) return; const a = db.answer(b.dataset.a), r = a && order(a); if (!r || !r.qty) return; const o = a.order || (a.order = {}); if ((o.log || []).some(x => x.for === (r.D || r.from))) return; (o.log || (o.log = [])).push({ at: today(), qty: r.qty, for: r.D || r.from || '' }); o.orderedAt = Date.now(); db.putAnswer(a); A.toast('주문을 기록했어요'); return repaint(c, s, a); }
      case 'aiflow': return aiFlow(c, s, db.answer(b.dataset.a));
      case 'aiecho': return aiEcho(c, s, db.answer(b.dataset.a));
      case 'aieffect': return aiEffect(c, s, db.answer(b.dataset.a));
      case 'echotry': { const a = db.answer(b.dataset.a); if (!a || !a.aiEcho) return; ui['tw' + a.id] = { what: String(a.aiEcho.out.try || '').slice(0, 40), from: today() }; ui.det[a.id + ':tweak'] = true; return repaint(c, s, a); }
      case 'tweakgo': {
        if (!(owner || c.mode === 'team')) return; const a = db.answer(b.dataset.a); if (!a) return;
        const dr = ui['tw' + a.id] || {}; if (!(dr.what || '').trim()) return merr('무엇을 바꾸는지 한 줄 적어 주세요', 'twerr-' + a.id);
        if ((a.changes || []).some(x => x.state === '진행 중')) return merr('진행 중인 바꾸기가 있어요 — 먼저 유지 · 되돌리기를 골라 주세요', 'twerr-' + a.id);
        (a.changes || (a.changes = [])).push({ id: 'c' + Date.now().toString(36), what: dr.what.trim(), from: dr.from && dr.from <= today() ? dr.from : today(), state: '진행 중', at: Date.now() });
        ui['tw' + a.id] = null; db.putAnswer(a); A.toast('한 가지 바꾸기를 시작했어요 — 전후 판매를 비교해요'); return repaint(c, s, a);
      }
      case 'tweakkeep': case 'tweakback': { if (!owner) return; const a = db.answer(b.dataset.a), ch = a && (a.changes || []).find(x => x.state === '진행 중'); if (!ch) return; ch.state = k === 'tweakkeep' ? '유지' : '되돌림'; ch.decidedAt = Date.now(); db.putAnswer(a); A.toast(k === 'tweakkeep' ? '이대로 유지해요' : '되돌렸어요'); return repaint(c, s, a); }
      case 'outcome': {
        if (!owner) return; const a = db.answer(b.dataset.a); if (!a) return; const t = a.trial || (a.trial = trialDefault()), v = b.dataset.v;
        if (v === '정식') { a.outcome = '정식'; t.done = true; if (a.state !== '판매 중') { a.state = '판매 중'; if (!a.startAt) a.startAt = Date.now(); } a.outcomeAt = Date.now(); A.toast('정식 메뉴로 · 시민에게 「이제 늘 팔아요」'); }
        if (v === '늘리기') { t.to = addDays(t.to && t.to > today() ? t.to : today(), 7); A.toast(`시험 판매를 ${md(t.to)}까지 늘렸어요`); }
        if (v === '접기') { a.outcome = '접음'; t.done = true; a.state = '끝남'; a.endAt = a.outcomeAt = Date.now(); A.toast('접었어요 · 시민에게 「끝났어요」로 보여요'); }
        ui.sum[a.id] = false; db.putAnswer(a); return keepScroll(() => A.refresh());
      }
      case 'keep': { if (!owner) return; const a = db.answer(b.dataset.a); if (a && a.state !== '판매 중') { a.state = '판매 중'; db.putAnswer(a); } A.toast('계속 팔아요 · 「판매 중」'); return keepScroll(() => A.refresh()); }
      case 'change': { if (reachable(s, b.dataset.w) <= 300) ui.extra.add(b.dataset.w); const x = nearList(s).list.find(y => y.w.id === b.dataset.w); if (x) openAnswer(c, x); else A.toast('그 바람이 이제 가게 300m 밖이에요'); return; }
      case 'plus': {
        const a = db.answer(b.dataset.a); if (!a) return;
        const date = ui['date' + a.id] || today(), d = dayOf(a, date, true); d.came = (d.came || 0) + 1; db.putAnswer(a); refreshNums(a);
        b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 300); return;
      }
      case 'openday': { const t = today(), i = s.openDays.indexOf(t); if (i >= 0) s.openDays.splice(i, 1); else s.openDays.push(t); db.putStore(s); return rerender(); }
      case 'band': { const cur = today().slice(0, 7); let mo = s.months.find(m => m.ym === cur); if (!mo) s.months.push(mo = { ym: cur, band: '', asked: false }); mo.band = b.dataset.v; db.putStore(s); A.toast('이번 달 매출 구간을 저장했어요'); return rerender(); }
      case 'alive': {
        const cur = today().slice(0, 7); let mo = s.months.find(m => m.ym === cur); if (!mo) s.months.push(mo = { ym: cur, band: '', asked: true }); mo.asked = true; mo.alive = b.dataset.v;
        if (b.dataset.v === '영업 중이에요' && !s.openDays.includes(today())) s.openDays.push(today());
        db.putStore(s); ui.msg = b.dataset.v === '문 닫았어요' ? '알려 주셔서 고마워요. 운영단이 다음 지원을 먼저 연락드려요.' : '고마워요. 이번 달 기록으로 남겼어요.'; return rerender();
      }
      case 'invite': return invite(s, b.dataset.u, b.dataset.n, b.dataset.j);
      case 'inviteid': { const id = (document.getElementById('k5id').value || '').trim().toLowerCase(), acc = (st.accounts || {})[id]; if (!acc) return A.toast('그 아이디의 회원이 없어요'); return invite(s, id, acc.name, ''); }
      case 'revoke': { const m = s.team.members[+b.dataset.i]; if (m) m.on = false; db.putStore(s); return rerender(); }
      case 'handover': { if (!s.team.checks.every(Boolean)) return; s.team.members.forEach(m => m.on = false); s.team.handedAt = Date.now(); db.putStore(s); A.toast('인수인계 완료 · 학생 권한을 껐어요'); return rerender(); }
    }
  });
  function invite(s, uid, name, major) {
    if (!uid || uid === s.uid) return A.toast('초대할 학생을 골라 주세요');
    if (s.team.members.some(m => m.uid === uid)) return A.toast('이미 초대했어요');
    s.team.members.push({ uid, name: name || uid, major: major || '', on: true, at: Date.now() }); db.putStore(s); A.toast(`${name || uid} 학생을 초대했어요`); rerender();
  }
  // 주소 찾기: 카카오 지도면 주소 검색(services), 아니면 빈칸 주소 · 건물 이름 · 근처 이름에서
  function findAddr(q) {
    q = (q || '').trim(); if (!q || !mini) return;
    const local = () => {
      const t = q.replace(/\s/g, ''), hit = M.spaces.find(v => (v.addr + v.bld).replace(/\s/g, '').includes(t)) || LM.find(l => l.name.includes(t));
      if (!hit) return A.toast('동성로 범위에서 찾지 못했어요 — 지도에서 직접 찍어 주세요');
      mini.setPt(hit.x, hit.y, hit.addr ? shortAddr(hit) + ' 근처' : hit.name + ' 근처'); mini.focus(hit);
    };
    if (window.kakao && kakao.maps && kakao.maps.services) {
      new kakao.maps.services.Geocoder().addressSearch(/대구/.test(q) ? q : '대구 중구 ' + q, (r, ok) => {
        if (ok !== kakao.maps.services.Status.OK || !r.length) return local();
        const x = +r[0].x, y = +r[0].y;
        if (!mini.inside(x, y)) return A.toast('동성로 범위(빈칸 데이터가 있는 곳) 밖 주소예요');
        mini.setPt(+x.toFixed(6), +y.toFixed(6), (r[0].road_address ? r[0].road_address.address_name : r[0].address_name).replace(/^대구 중구 /, '')); mini.focus({ x, y });
      });
    } else local();
  }
  // 답 올리기: 점검 → 저장(한 바람에 가게당 답 1개, 있으면 고치기) → 바람 쓴 사람 · 공감한 사람 알림
  function post(c, wid) {
    if (c.mode !== 'owner') return;
    const s = c.s, x = nearList(s).list.find(y => y.w.id === wid), d = s.drafts[wid];
    if (!x || !d) return;
    if (x.m > 300) return merr('가게 300m 안 바람에만 답할 수 있어요', 'k2err-' + wid);
    const bad = checkReply(d, s); if (bad) return merr(bad, 'k2err-' + wid);
    if (d.trial && d.trial.on && d.trial.to && d.trial.from && d.trial.to < d.trial.from) return merr('시험 판매 끝나는 날이 시작일보다 앞이에요', 'k2err-' + wid);
    const added = A.addRole('open');   // 백엔드 전: 올릴 때 「기존 사장님」 역할을 더함(사업자등록 확인은 백엔드)
    const old = myAnswerFor(s, wid);
    const a = Object.assign(old || { id: 'a' + Date.now().toString(36), wish: wid, sid: s.id, uid: s.uid, state: '준비 중', at: Date.now(), went: 0, reports: 0, reportWhy: [], hidden: false, ing: { name: '', per: 0, unit: 'g' }, days: [] },
      { store: s.name, item: s.item, fit: d.fit || '', why: d.why || '', idea: d.idea || '', menu: d.menu.trim(), reply: d.reply.trim(), dist: Math.round(x.m), ai: !!d.ai, editedAt: old ? Date.now() : 0 });
    const tr = d.trial || trialDefault();
    a.trial = { on: !!tr.on, from: tr.from || today(), to: tr.to || addDays(tr.from || today(), 20), perDay: tr.perDay, offDays: (tr.offDays || []).slice(), price: tr.price, done: !!(old && old.trial && old.trial.done) };   // 답 고치기: 고친 칸이 그대로 저장됨
    if (s.team.members.some(m => m.on)) a.byTeam = true;
    db.putAnswer(a); delete s.drafts[wid]; db.putStore(s);   // 올린 뒤 초안은 지움(다음 고치기는 저장된 답에서 다시 엶)
    ui.open = null;
    const n = recipients(x.w, s.uid);
    A.toast(old ? '고친 답을 올렸어요' : `답을 올렸어요 · ${n ? `바람을 쓰거나 공감한 회원 ${n}명에게 알림이 가요` : '이 바람을 쓰거나 공감한 회원이 생기면 알려요'}${added ? ' · 기존 사장님 역할을 더했어요' : ''}`);
    keepScroll(() => A.refresh());
  }

  // ---------------- 시민 쪽 (app.js가 부름) ----------------
  // 알림: 내가 쓴 · 공감한 바람에 답이 옴 / 「먹어보고 싶어요」 누른 답이 판매를 시작함 · 내일 끝남 / 정식 메뉴가 됨 / 끝남
  function alertsFor(u) {
    if (!u) return [];
    const mineW = new Set(A.myWishes().map(w => w.id)), wants = st.wants[u.id] || {}, out = [], tm = addDays(today(), 1);
    for (const a of db.answers()) {
      if (a.hidden) continue;
      const w = wishById(a.wish); if (!w) continue;
      const why = mineW.has(a.wish) ? 'wrote' : (store.liked ? store.liked(w) : st.liked[a.wish]) ? 'liked' : null, wanted = !!wants[a.id];   // 서버 모드에서도 store.liked
      if (!why && !wanted) continue;
      const base = { a, w, why: why || 'wanted', self: a.uid === u.id }, t = trialOf(a), add = (kind, key, at) => out.push(Object.assign({ kind, key: a.id + ':' + key, at }, base));
      if (why) add('answer', 'ans', a.at);
      if (wanted && a.startAt) add('start', 'start', a.startAt);
      if (wanted && t.on && !t.done && a.state === '판매 중' && t.to === tm) add('endsoon', 'soon:' + t.to, dayNo(today()) * 864e5);
      if (a.outcome === '정식') add('regular', 'regular', a.outcomeAt || a.at);
      if (a.state === '끝남') add('end', 'end', a.endAt || a.at);
    }
    const seen = st.seen[u.id] || {};
    return out.map(x => Object.assign(x, { unread: !seen[x.key] })).sort((p, q) => q.at - p.at);
  }
  function markSeen(u) { if (!u) return; const L = alertsFor(u).filter(x => x.unread); if (!L.length) return; const m = st.seen[u.id] || (st.seen[u.id] = {}); L.forEach(x => m[x.key] = Date.now()); save(); }
  function showCard(aid) {
    const a = db.answer(aid); if (!a || a.hidden) return '';
    const w = wishById(a.wish), s = db.stores().find(x => x.id === a.sid) || {}, end = a.state === '끝남', u = st.user;
    if (u && u.id !== a.uid && !db.got('shows', u.id, aid)) { db.mark('shows', u.id, aid, Date.now()); a.shows = (a.shows || 0) + 1; db.putAnswer(a); }
    const done = u && db.got('visits', u.id, aid + ':' + today());
    return `<div class="showcard${end ? ' end' : ''}">
      ${end ? '<p class="send">이 메뉴는 끝났어요</p>' : '<p class="sk">동성로 빈칸 · 바람 보고 왔어요</p>'}
      <p class="ss">${esc(a.store)}</p><p class="si">${esc(a.item)} · ${esc(placeOf(s.id ? s : { near: '' }))}</p>
      <p class="sm">${esc(a.menu)}</p>
      <p class="sr">「${esc(a.reply)}」</p>
      ${w ? `<p class="sw">바람 「${esc(w.title)}」에 답한 메뉴</p>` : ''}
      ${!end && s.perk ? `<div class="sperk"><b>첫 방문 혜택</b><span>${esc(s.perk)}</span></div>` : ''}
      ${end ? '' : u && u.id !== a.uid ? `<div class="svisit">${done ? '<b>✓ 오늘 사장님이 확인했어요</b>' : `<button class="cta" data-act="visitok" data-id="${esc(aid)}">사장님 확인 — 바람 보고 왔어요</button><small>가게에서 사장님이 눌러 주세요 (하루 한 번)</small>`}</div>` : ''}
      ${end ? '' : `<button class="link" data-act="storemap" data-id="${esc(aid)}">지도에서 가게 보기</button>`}
      <p class="fine">이름 · 연락처는 사장님께 가지 않아요.</p></div>`;
  }
  // 「사장님 확인」: 시민 화면에서 사장님이 누르면 그날 「바람 보고 온 손님」 +1 (시민 1명 · 답 1개당 하루 한 번)
  function confirmVisit(aid) {
    const u = st.user, a = db.answer(aid); if (!u || !a || a.state === '끝남') return '';
    if (a.uid === u.id) return '내 가게 답이에요 — 손님 화면에서 눌러 주세요';
    const key = aid + ':' + today(); if (db.got('visits', u.id, key)) return '오늘은 이미 확인했어요';
    db.mark('visits', u.id, key, Date.now());
    const d = dayOf(a, today(), true); d.came = (d.came || 0) + 1; d.ok = (d.ok || 0) + 1; db.putAnswer(a);
    return '확인했어요 · 「바람 보고 온 손님」에 하나 더했어요';
  }
  // 시민 지도: 근처 바람에 답하고 지금 하는(끝나지 않은) 가게 핀
  function storePins() {
    const live = db.answers().filter(a => !a.hidden && a.state !== '끝남'), ids = [...new Set(live.map(a => a.sid))];
    return ids.map(id => db.stores().find(s => s.id === id)).filter(s => s && s.setup && ptOf(s)).map(s => {
      const n = live.filter(a => a.sid === s.id).length, p = ptOf(s);
      return { id: 'st:' + s.id, x: p.x, y: p.y, cls: 'store', z: 3000, html: `<span>${esc(s.name || s.item)}</span>`, label: `${s.name || s.item} · 근처 바람 ${n}개에 답한 가게` };
    });
  }
  function pickStore(sid) {
    const a = db.answers().filter(x => x.sid === sid && !x.hidden && x.state !== '끝남').sort((p, q) => q.at - p.at)[0], w = a && wishById(a.wish); if (!w) return;
    A.go('space', { space: w.space }); setTimeout(() => { const el = document.getElementById('a-' + a.id); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } }, 80);
  }
  const storePoint = aid => { const a = db.answer(aid), s = a && db.stores().find(x => x.id === a.sid); return s && ptOf(s); };
  function went(aid) {
    const u = st.user, a = db.answer(aid); if (!a || !u) return '';
    if (a.uid === u.id) return '내 가게 답에는 누를 수 없어요';
    if (db.got('went', u.id, aid)) { db.mark('went', u.id, aid); a.went = Math.max(0, (a.went || 0) - 1); a.notes = (a.notes || []).filter(n => n.uid !== u.id || n.hidden || n.reports > 0).map(n => n.uid === u.id ? Object.assign(n, { gone: true }) : n); db.putAnswer(a); return '「가 봤어요」를 취소했어요(남긴 한 줄도 함께 내렸어요)'; }   // 신고 · 숨김 이력이 있는 한 줄은 운영단 근거로 남김
    db.mark('went', u.id, aid, Date.now()); a.went = (a.went || 0) + 1; db.putAnswer(a); return '「가 봤어요」를 남겼어요 — 다른 시민이 이 답을 볼 때 참고가 돼요';
  }
  // 신고: 답 또는 가 본 시민 한 줄(nid). 운영단이 숨김을 정함
  function report(aid, why, nid) {
    const u = st.user, a = db.answer(aid); if (!a || !u) return '';
    const n = nid && (a.notes || []).find(x => x.id === nid), key = n ? aid + ':' + nid : aid;
    if (n ? n.uid === u.id : a.uid === u.id) return '내가 쓴 것은 신고할 수 없어요';
    if (db.got('reported', u.id, key)) return '이미 신고했어요';
    db.mark('reported', u.id, key, why);
    const tgt = n || a; tgt.reports = (tgt.reports || 0) + 1; (tgt.reportWhy || (tgt.reportWhy = [])).push(why); db.putAnswer(a); return '신고했어요 · 운영단이 확인해요';
  }
  // 「먹어보고 싶어요」: 「준비 중」 답에 1인 1회(다시 누르면 취소). 관심으로만 세고 준비량 · 주문량에는 넣지 않는다
  function want(aid) {
    const u = st.user, a = db.answer(aid); if (!a || !u) return '';
    if (a.uid === u.id) return '내 가게 답이에요';
    if (db.got('wants', u.id, aid)) { db.mark('wants', u.id, aid); a.wants = Math.max(0, (a.wants || 0) - 1); db.putAnswer(a); return '「먹어보고 싶어요」를 취소했어요'; }
    db.mark('wants', u.id, aid, Date.now()); a.wants = (a.wants || 0) + 1; db.putAnswer(a); return '「먹어보고 싶어요」 — 판매를 시작하면 알려 드려요';
  }
  // 가 본 시민 한 줄(선택, 60자): 「가 봤어요」를 누른 회원만, 한 사람 한 줄(다시 쓰면 바꿈). 모두에게 공개(11/26 미영)
  function addNote(aid, text) {
    const u = st.user, a = db.answer(aid); if (!a || !u) return { err: '로그인해 주세요' };
    if (!db.got('went', u.id, aid)) return { err: '「가 봤어요」를 누른 뒤에 남길 수 있어요' };
    if ((a.notes || []).some(n => n.uid === u.id && n.hidden)) return { err: '운영단이 숨긴 한 줄이 있어 새로 남길 수 없어요' };
    const t = String(text || '').trim().slice(0, 60), bad = noteCheck(t); if (bad) return { err: bad };
    a.notes = (a.notes || []).filter(n => n.uid !== u.id || n.reports > 0).map(n => n.uid === u.id ? Object.assign(n, { gone: true }) : n).concat({ id: 'n' + Date.now().toString(36), uid: u.id, t, at: Date.now(), hidden: false, reports: 0 });
    db.putAnswer(a); return { ok: '한 줄을 남겼어요 · 모두에게 보여요' };
  }
  // AI 칸 셋(설계서 §5): 누를 때 부름, 실패하면 표 · 목록만(기본 정리)
  function aiRun(c, s, a, kind, input, done) {
    if (!a || ui.busy[kind + a.id]) return;
    const key = kind === 'effect' ? 'tweak' : kind === 'echo' ? 'notes' : 'flow';
    ui.busy[kind + a.id] = true; ui.fail[kind + a.id] = false; ui.det[a.id + ':' + key] = true; repaintBox(a, key);
    window.ASSIST.call(kind, input, 25000).then(out => { done(out); db.putAnswer(a); }, () => { ui.fail[kind + a.id] = true; })
      .then(() => { ui.busy[kind + a.id] = false; if (isMine()) repaintBox(a, key); });   // 카드 전체가 아니라 그 펼침 칸만 바꿈(같은 카드의 다른 칸 입력 · 클릭이 안 날아가게)
  }
  const aiFlow = (c, s, a) => { const f = flowRows(a), key = flowKey(f); aiRun(c, s, a, 'flow', { menu: a.menu, rows: f.rows.map(r => ({ d: r.d, n: r.n, avg: r.avg, so: r.so, at: r.at, left: r.left, thin: r.thin })) }, out => { a.aiFlow = { key, out }; }); };
  const aiEcho = (c, s, a) => { const w = wishById(a.wish) || {}, L = notesOf(a), key = JSON.stringify(L.map(n => n.id)); aiRun(c, s, a, 'echo', { title: w.title, why: w.why, menu: a.menu, notes: L.map(n => n.t) }, out => { a.aiEcho = { key, out }; }); };
  const aiEffect = (c, s, a) => { const ch = (a.changes || []).find(x => x.state === '진행 중'); if (!ch) return; const cp = compare(a, ch); if (!cp.rows) return; const key = JSON.stringify(cp.rows); aiRun(c, s, a, 'effect', { menu: a.menu, what: ch.what, from: md(ch.from), basis: cp.basis, rows: cp.rows }, out => { ch.ai = { key, line: out.line }; }); };

  window.MYSTORE = {
    want, wantBy: (aid, uid) => db.got('wants', uid, aid), addNote, notesOf, noteBy: (aid, uid) => (((db.answer(aid) || {}).notes) || []).filter(n => n.uid === uid && !n.gone).pop(), noteCheck, trialLabel, cupsFor, order, orderLine, flowRows, compare,
    render, mount, start, answersFor, showCard, confirmVisit, storePins, pickStore, storePoint, monthly, alertsFor, markSeen, went, report, roundDist, funnel, areaNote, shareOf, recipients,
    wentBy: (aid, uid) => db.got('went', uid, aid), reportedBy: (aid, uid) => db.got('reported', uid, aid),
    stores: db.stores, storeOf: uid => db.store(uid), appOf, risk, area, stats, myAnswers, storeLabel, placeOf, db, checkReply, prep,
  };
})();
