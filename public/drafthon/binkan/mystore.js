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
  const SHARE_KEYS = [['open', '영업 여부 (그 달 영업 일수)', true], ['band', '매출 구간 (월 1회 직접 고름)', true], ['answers', '답 수', false], ['sold', '답한 메뉴 판매 일수 · 누적 판매', false], ['came', '바람 보고 온 손님 수', false]];
  const BANDS = ['월 500만 원 미만', '500만 ~ 1,000만 원', '1,000만 ~ 2,000만 원', '2,000만 ~ 3,000만 원', '3,000만 원 이상'];   // 구간 경계 [가정]
  const STATES = ['준비 중', '판매 중', '끝남'];
  const QL = `${M.meta.q_prev.replace(/\(.*$/, '')} → ${M.meta.q_now.replace(/\(.*$/, '').replace(/^\d+년\s*/, '')}`;   // 「2026년 2분기 → 3분기」
  const CHECKS = ['학생과 함께 첫 답을 올림', '답한 메뉴 기록 2주 [가정]', '사장님 혼자 답 1개 올림', '사용법 한 장 받음'];

  // ---------------- db: 이 묶음만 백엔드 API로 바꾸면 된다 ----------------
  ['mystores', 'went', 'reported', 'seen', 'shows', 'teams', 'visits'].forEach(k => { if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {}; });
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
  let ui = { view: 'k', open: null, busy: {}, pending: null, msg: '', extra: new Set() };
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
    ui.busy = {}; ui.msg = ''; ui.extra = new Set();
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
  // ③ 내일 준비량: 최근 7일 가운데 판매한 날 평균 × 1인분 양 × 1.1 [가정] − 오늘 마감 때 남은 양. 판매한 날 3일 미만이면 계산 안 함 [가정]
  // 오늘은 장사 중이라 판매 수가 덜 찼을 수 있어, 마감(남은 양 · 품절)을 적은 뒤에만 평균에 넣는다. 지난날 남은 양은 이미 그날 쓴 것이라 빼지 않는다
  function prep(a) {
    const t = dayNo(today()), ing = a.ing || {}, D = a.days || [];
    const closed = d => (d.left != null && d.left !== '') || d.soldout;
    const recent = D.filter(d => { const k = t - dayNo(d.date); return d.sold > 0 && ((k >= 1 && k <= 7) || (k === 0 && closed(d))); });
    const r = { n: recent.length, ok: false };
    if (recent.length < 3 || !ing.name || !(ing.per > 0)) return r;
    const avg = recent.reduce((x, d) => x + d.sold, 0) / recent.length;
    const td = D.find(d => d.date === today()), left = td && td.left != null && td.left !== '' ? +td.left || 0 : 0;
    return Object.assign(r, { ok: true, avg, left, leftDate: left ? today() : '', need: Math.max(0, Math.ceil(Math.round((avg * ing.per * 1.1 - left) * 1000) / 1000)) });
  }
  const stats = a => { const D = a.days || []; return { soldDays: D.filter(d => d.sold > 0).length, sold: D.reduce((x, d) => x + (+d.sold || 0), 0), came: D.reduce((x, d) => x + (+d.came || 0), 0) }; };
  const dayOf = (a, date, make) => { let d = (a.days || []).find(x => x.date === date); if (!d && make) { d = { date, sold: 0, soldout: false, came: 0, left: null }; (a.days || (a.days = [])).push(d); } return d; };

  // 월 집계: 공유가 켜진 항목만(설계서 §3 추적 세부). 메뉴 가격 · 정확한 매출 · 답글 · 후기는 어떤 경우에도 안 나감
  function monthly(s) {
    const A2 = myAnswers(s), cur = today().slice(0, 7), sh = shareOf(s);
    const yms = new Set([cur].concat(s.openDays.map(d => d.slice(0, 7)), s.months.map(m => m.ym), A2.flatMap(a => (a.days || []).map(d => d.date.slice(0, 7)))));
    return [...yms].sort().reverse().map(ym => {
      const days = A2.flatMap(a => (a.days || []).filter(d => d.date.slice(0, 7) === ym)), mo = s.months.find(m => m.ym === ym) || {};
      return { ym, open: sh.open ? s.openDays.filter(d => d.slice(0, 7) === ym).length : null, band: sh.band ? (mo.band || '') : null, alive: sh.open ? (mo.alive || '') : '',
        answers: sh.answers ? A2.filter(a => ymd(new Date(a.at)).slice(0, 7) === ym).length : null,
        soldDays: sh.sold ? new Set(days.filter(d => d.sold > 0).map(d => d.date)).size : null, sold: sh.sold ? days.reduce((x, d) => x + (+d.sold || 0), 0) : null,
        came: sh.came ? days.reduce((x, d) => x + (+d.came || 0), 0) : null };
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
    const ok = nums(`${s.offer} ${s.perk} ${s.menus.map(m => m.name + ' ' + m.price).join(' ')}`);
    if ([...normNum(t).matchAll(/(\d+)\s*(원|%|퍼센트|프로)/g)].some(m => !ok.has(m[1]))) return '가격 · 할인 숫자는 가게 설정의 「가격 · 행사」나 메뉴 가격에 적은 것만 쓸 수 있어요';
    // 할인 · 반값 · 무료 · 증정: 그 말 바로 앞의 대상(예: 「음료」)이 모두 사장님이 적은 「첫 방문 혜택」 · 「가격 · 행사」의 할인 · 무료 말 주변에 있어야 통과
    const mineT = [s.perk || ''].concat([...(s.offer || '').matchAll(/(할인|반\s*값|무료|공짜|1\s*\+\s*1|증정|덤|서비스|%)/g)].map(m => s.offer.slice(Math.max(0, m.index - 14), m.index + m[0].length + 6))).join(' ');
    for (const part of [menu, reply]) for (const m of part.matchAll(GIFT)) {
      if (/^(은|는|이|도)?\s*(없|안\s*해|하지\s*않)/.test(part.slice(m.index + m[0].length, m.index + m[0].length + 6))) continue;   // 「할인은 없지만」
      if (/할인|반\s*값/.test(m[0]) && !/(할인|%|반\s*값)/.test(`${s.offer} ${s.perk}`)) return '할인은 가게 설정의 「가격 · 행사」에 먼저 적어 주세요';
      const words = (part.slice(Math.max(0, m.index - 10), m.index).match(/[가-힣A-Za-z]{2,}/g) || []).map(w => w.replace(/(으로|로|을|를|이|가|은|는|도|만|에서|에게|께|와|과|랑)$/, '')).filter(w => w.length >= 2 && !STOP.test(w));
      if (!mineT.trim() || words.some(w => !mineT.includes(w))) return '할인 · 무료 · 증정은 가게 설정의 「가격 · 행사」나 「첫 방문 혜택」에 적은 것만 쓸 수 있어요';
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

  function k2Block(s, x, c) {
    const wid = x.w.id, d = s.drafts[wid], mine = myAnswerFor(s, wid), owner = !c || c.mode === 'owner';
    if (!d) return `<div class="k2 aiout" id="k2-${wid}"><small class="busy">AI가 이 바람과 우리 메뉴를 읽는 중… <small>(안 되면 기본 틀로 이어져요)</small></small></div>`;
    return `<div class="k2 aiout" id="k2-${wid}">
      ${d.ai ? `<p class="k2fit"><b>이 가게가 채울 수 있나 ${aiTag(true)}</b> <span class="fit f${['지금 메뉴로 됨', '조금 바꾸면 됨', '어려움'].indexOf(d.fit)}">${esc(d.fit)}</span> ${esc(d.why)}</p>${d.idea ? `<p class="k2idea"><b>해 볼 방법</b> ${esc(d.idea)}</p>` : ''}${d.fit === '어려움' ? '<p class="fine">억지로 맞추지 않아도 돼요. 그래도 답하고 싶으면 아래를 직접 채워 주세요.</p>' : ''}`
        : `<p class="k2fit"><b>답 초안</b> ${aiTag(false)} <small>틀 문장을 넣어 뒀어요. 메뉴 이름과 답글을 채워 주세요.</small></p>`}
      <div class="orow"><label class="ofl">메뉴 이름<input data-m-in="d.menu" data-w="${wid}" value="${esc(d.menu)}" maxlength="24" placeholder="예: 1인 파스타 덮밥"></label>
        <label class="ofl">바람 아래에 보일 답글 <small class="cnt" id="cnt-${wid}">${(d.reply || '').length} / 100</small><textarea data-m-in="d.reply" data-w="${wid}" rows="3" maxlength="140">${esc(d.reply)}</textarea></label></div>
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

  // 알림 → 방문 단계: 알림 받은 회원 → 보여 주기 화면을 연 회원 → 가 봤어요 → 바람 보고 온 손님(그중 시민 화면에서 확인)
  const funnel = a => { const w = wishById(a.wish), sx = stats(a); return { sent: w ? recipients(w, a.uid) : 0, shows: a.shows || 0, went: a.went || 0, came: sx.came, ok: (a.days || []).reduce((x, d) => x + (d.ok || 0), 0) }; };
  const funnelLine = a => { const f = funnel(a); return `알림 ${f.sent}명 → 보여 주기 연 ${f.shows}명 → 가 봤어요 ${f.went} → 바람 보고 온 손님 <b>${f.came}</b>명${f.ok ? ` (시민 화면에서 확인 ${f.ok})` : ''}`; };
  function mcard(c, s, a) {
    const w = wishById(a.wish), sx = stats(a), p = prep(a), owner = c.mode === 'owner', date = ui['date' + a.id] || today(), d = dayOf(a, date) || { sold: '', soldout: false, came: 0, left: '' };
    const ing = a.ing || {};
    return `<article class="mcard${a.state === '끝남' ? ' end' : ''}" id="mc-${a.id}">
      <p class="mk"><span class="tag st">${esc(a.state)}</span> ${w ? `「${esc(w.title)}」에 답함` : '바람이 지워짐'} · ${ymd(new Date(a.at)).slice(5).replace('-', '/')}${a.hidden ? ' · <b class="bad">운영단이 숨김</b>' : ''}${owner && a.state !== '끝남' ? ` <button class="link" data-m="change" data-a="${a.id}" data-w="${a.wish}">답 고치기</button>` : ''}</p>
      <b class="mm">${esc(a.menu)}</b>
      <p class="mstat" id="ms-${a.id}">판매 <b>${sx.soldDays}</b>일 · 누적 <b>${sx.sold}</b></p>
      <p class="mfun" id="mf-${a.id}">${funnelLine(a)}</p>
      ${owner ? `<div class="mstates">${STATES.map(t => `<button class="${a.state === t ? 'on' : ''}" data-m="state" data-a="${a.id}" data-v="${t}">${t === '끝남' ? '끝남 (시민에게 「끝났어요」)' : t}</button>`).join('')}</div>` : ''}
      ${a.state === '끝남' ? '' : `
      <div class="mday"><label>날짜<input type="date" data-m-in="day.date" data-a="${a.id}" value="${date}" max="${today()}"></label>
        <label>판매 수<input type="number" min="0" max="999" inputmode="numeric" data-m-in="day.sold" data-a="${a.id}" value="${d.sold === 0 && !dayOf(a, date) ? '' : esc(d.sold)}" placeholder="0"></label>
        <label class="chk"><input type="checkbox" data-m-in="day.soldout" data-a="${a.id}"${d.soldout ? ' checked' : ''}> 품절</label>
        <button class="plus" data-m="plus" data-a="${a.id}">＋ 바람 보고 왔어요 <b id="pc-${a.id}">${d.came || 0}</b></button></div>
      <details class="mprepbox"${ing.name ? ' open' : ''}><summary>내일 준비량 계산</summary>
        <div class="ming"><label>주재료<input data-m-in="ing.name" data-a="${a.id}" value="${esc(ing.name || '')}" maxlength="12" placeholder="예: 돼지고기"></label>
          <label>1인분 양<input type="number" min="0" step="1" data-m-in="ing.per" data-a="${a.id}" value="${ing.per || ''}" placeholder="예: 120"></label>
          <label>단위<select data-m-in="ing.unit" data-a="${a.id}">${['g', 'ml', '개'].map(u => `<option${ing.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
          <label title="오늘 마감 때 남은 양 — 내일 준비량에서 뺌">마감 남은 양<input type="number" min="0" data-m-in="day.left" data-a="${a.id}" value="${d.left == null ? '' : esc(d.left)}"></label></div>
        <p class="mprep" id="mp-${a.id}">${prepLine(a, p)}</p></details>`}
    </article>`;
  }
  function prepLine(a, p) {
    const ing = a.ing || {};
    if (p.n < 3) return `<b>내일 준비</b> 최근 7일 중 판매한 날이 3일 이상이면 계산해요 (지금 ${p.n}일 · 오늘은 마감 남은 양이나 품절을 적으면 넣어요) <small>[가정]</small>`;
    if (!ing.name || !(ing.per > 0)) return '<b>내일 준비</b> 주재료와 1인분 양을 적으면 계산해요';
    return `<b>내일 준비 ${esc(ing.name)} ${p.need.toLocaleString()}${esc(ing.unit || 'g')}</b> <small>= 최근 7일 중 판매한 ${p.n}일 평균 ${(Math.round(p.avg * 10) / 10)} × ${ing.per}${esc(ing.unit || 'g')} × 1.1(여유 10% [가정])${p.left ? ` − 오늘 남은 ${p.left}${esc(ing.unit || 'g')}` : ''}</small>`;
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
      <div class="tblwrap"><table class="otable"><thead><tr><th>달</th><th>영업 일수</th><th>매출 구간</th><th>답 수</th><th>판매 일수</th><th>누적 판매</th><th>바람 보고 온 손님</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.ym.replace('-', '.')}${r.alive ? ` <small>${esc(r.alive)}</small>` : ''}</td>${cell(r.open)}${cell(r.band)}${cell(r.answers)}${cell(r.soldDays)}${cell(r.sold)}${cell(r.came)}</tr>`).join('')}</tbody></table></div>
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
    if (k === 'share') { if (c.mode !== 'owner') return; s.share[e.target.dataset.k] = v; db.putStore(s); return rerender(); }
    if (k === 'team.until') { s.team.until = v; db.putStore(s); return; }
    if (k === 'team.check') { s.team.checks[+e.target.dataset.i] = v; db.putStore(s); return rerender(); }
    // ③ 기록: 자주 누르는 칸은 숫자만 바꿈(화면이 튀지 않게)
    const a = db.answer(e.target.dataset.a); if (!a || a.sid !== s.id) return;
    if (k === 'day.date') return;   // 날짜는 change에서(입력 중 다시 그리지 않게)
    if (k.startsWith('ing.')) { a.ing = a.ing || { name: '', per: 0, unit: 'g' }; const f = k.slice(4); a.ing[f] = f === 'per' ? Math.max(0, +v || 0) : v; db.putAnswer(a); refreshNums(a); return; }
    const date = ui['date' + a.id] || today(), d = dayOf(a, date, true);
    if (k === 'day.sold') { d.sold = Math.max(0, Math.min(999, parseInt(v, 10) || 0)); if (d.sold > 0 && !s.openDays.includes(date)) s.openDays.push(date); if (c.mode === 'team') a.byTeam = true; }
    if (k === 'day.soldout') d.soldout = !!v;
    if (k === 'day.left') d.left = v === '' ? null : Math.max(0, +v || 0);
    db.putAnswer(a); db.putStore(s); refreshNums(a);
  });
  W.addEventListener('change', e => {
    if (!isMine()) return;
    const k = e.target.dataset.mIn;
    if (k === 'sub') return rerender();
    if (k === 'day.date') { const v = e.target.value; if (v && v <= today() && /^\d{4}-\d{2}-\d{2}$/.test(v)) { ui['date' + e.target.dataset.a] = v; rerender(); } }
  });
  function refreshNums(a) {
    const sx = stats(a), el = document.getElementById('ms-' + a.id);
    if (el) el.innerHTML = `판매 <b>${sx.soldDays}</b>일 · 누적 <b>${sx.sold}</b>`;
    const fl = document.getElementById('mf-' + a.id); if (fl) fl.innerHTML = funnelLine(a);
    const p = document.getElementById('mp-' + a.id); if (p) p.innerHTML = prepLine(a, prep(a));
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
      case 'state': { if (!owner) return; const a = db.answer(b.dataset.a); if (!a || a.state === b.dataset.v) return; a.state = b.dataset.v; if (a.state === '끝남') a.endAt = Date.now(); db.putAnswer(a); A.toast(a.state === '끝남' ? '접었어요 · 시민에게 「끝났어요」로 보여요' : `「${a.state}」로 바꿨어요`); return keepScroll(() => A.refresh()); }
      case 'guide': return A.openModal(guideHTML(), 'wide');
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
    const added = A.addRole('open');   // 백엔드 전: 올릴 때 「기존 사장님」 역할을 더함(사업자등록 확인은 백엔드)
    const old = myAnswerFor(s, wid);
    const a = Object.assign(old || { id: 'a' + Date.now().toString(36), wish: wid, sid: s.id, uid: s.uid, state: '준비 중', at: Date.now(), went: 0, reports: 0, reportWhy: [], hidden: false, ing: { name: '', per: 0, unit: 'g' }, days: [] },
      { store: s.name, item: s.item, fit: d.fit || '', why: d.why || '', idea: d.idea || '', menu: d.menu.trim(), reply: d.reply.trim(), dist: Math.round(x.m), ai: !!d.ai, editedAt: old ? Date.now() : 0 });
    if (s.team.members.some(m => m.on)) a.byTeam = true;
    db.putAnswer(a);
    ui.open = null;
    const n = recipients(x.w, s.uid);
    A.toast(old ? '고친 답을 올렸어요' : `답을 올렸어요 · ${n ? `바람을 쓰거나 공감한 회원 ${n}명에게 알림이 가요` : '이 바람을 쓰거나 공감한 회원이 생기면 알려요'}${added ? ' · 기존 사장님 역할을 더했어요' : ''}`);
    keepScroll(() => A.refresh());
  }

  // ---------------- 시민 쪽 (app.js가 부름) ----------------
  function alertsFor(u) {
    if (!u) return [];
    const mineW = new Set(A.myWishes().map(w => w.id)), out = [];
    for (const a of db.answers()) {
      if (a.hidden) continue;
      const why = mineW.has(a.wish) ? 'wrote' : st.liked[a.wish] ? 'liked' : null; if (!why) continue;
      const w = wishById(a.wish); if (!w) continue;
      const base = { a, w, why, self: a.uid === u.id };
      out.push(Object.assign({ kind: 'answer', key: a.id + ':ans', at: a.at }, base));
      if (a.state === '끝남') out.push(Object.assign({ kind: 'end', key: a.id + ':end', at: a.endAt || a.at }, base));
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
    if (db.got('went', u.id, aid)) { db.mark('went', u.id, aid); a.went = Math.max(0, (a.went || 0) - 1); db.putAnswer(a); return '「가 봤어요」를 취소했어요'; }
    db.mark('went', u.id, aid, Date.now()); a.went = (a.went || 0) + 1; db.putAnswer(a); return '「가 봤어요」를 남겼어요 — 다른 시민이 이 답을 볼 때 참고가 돼요';
  }
  function report(aid, why) {
    const u = st.user, a = db.answer(aid); if (!a || !u) return '';
    if (a.uid === u.id) return '내 가게 답은 신고할 수 없어요';
    if (db.got('reported', u.id, aid)) return '이미 신고했어요';
    db.mark('reported', u.id, aid, why); a.reports = (a.reports || 0) + 1; (a.reportWhy || (a.reportWhy = [])).push(why); db.putAnswer(a); return '신고했어요 · 운영단이 확인해요';
  }

  window.MYSTORE = {
    render, mount, start, answersFor, showCard, confirmVisit, storePins, pickStore, storePoint, monthly, alertsFor, markSeen, went, report, roundDist, funnel, areaNote, shareOf, recipients,
    wentBy: (aid, uid) => db.got('went', uid, aid), reportedBy: (aid, uid) => db.got('reported', uid, aid),
    stores: db.stores, storeOf: uid => db.store(uid), appOf, risk, area, stats, myAnswers, storeLabel, placeOf, db, checkReply, prep,
  };
})();
