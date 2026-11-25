// 팀 백엔드(V2V, Spring Boot · Render) 연결: 로그인 · 가입, 빈칸 짝짓기, 바람(의견) · 공감.
// 서버가 안 되거나 비어 있으면 on = false → 사이트는 지금처럼 브라우저 저장으로 돈다. 늦게 깨어나면(Render 무료 서버) 그때 바꿔 탄다.
// 주소 바꾸기(개발): localStorage.setItem('binkan.api', 'http://127.0.0.1:8081')
(function () {
  const BASE = localStorage.getItem('binkan.api') || 'https://v2v-drafthon-backend.onrender.com';
  const BK = { on: false, base: BASE, spaces: {}, byB: {}, wishes: [], listeners: [], rawAnswers: [], ansVer: 0 };
  const days = iso => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));

  async function call(m, p, body, token, ms = 12000) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms);
    try {
      const h = { 'content-type': 'application/json' }; if (token) h.authorization = 'Bearer ' + token;
      const r = await fetch(BASE + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
      const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
      if (!r.ok) { const e = new Error((j && j.detail) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
      return j;
    } finally { clearTimeout(tm); }
  }
  const token = () => (window.APP && APP.st.user && APP.st.user.token) || null;

  // 서버 의견 → 사이트 바람 모양. 처음 바람(운영팀이 올린 것)은 seed.js와 짝지어 원래 공감 수 · 쓴 사람 표시를 이어 씀
  function toWish(o, sid) {
    const seed = window.SEED.wishes.find(s => s.space === sid && s.title === o.desiredBusiness);
    return { id: seed ? seed.id : 'o' + o.id.replace(/-/g, ''), op: o.id, seedId: seed ? seed.id : null, seed: !!seed, space: sid, cat: o.category || (seed && seed.cat) || '기타', title: o.desiredBusiness, why: o.reason || '—',
      who: seed ? seed.who : '시민', base: seed ? seed.likes : 0, likes: (seed ? seed.likes : 0) + (o.likeCount || 0), liked: !!o.likedByMe, ago: seed ? seed.ago : days(o.createdAt), vacancy: o.vacancyId };
  }
  async function loadOpinions(sid) {
    const m = BK.spaces[sid]; if (!m) return;
    const list = await call('GET', `/api/buildings/${m.b}/opinions?limit=100`, null, token());
    BK.wishes = BK.wishes.filter(w => w.space !== sid).concat(list.map(o => toWish(o, sid)));
  }
  async function loadAll() {
    const ids = Object.keys(BK.spaces); let i = 0;
    const next = [];
    await Promise.all(Array.from({ length: 8 }, async () => { while (i < ids.length) { const sid = ids[i++]; const list = await call('GET', `/api/buildings/${BK.spaces[sid].b}/opinions?limit=100`, null, token()); list.forEach(o => next.push(toWish(o, sid))); } }));
    BK.wishes = next;
    await loadAnswers();
  }
  // 가게가 주민 바람에 단 답(PR #5). 서버가 아직 모르면(404 등) 조용히 빈 목록
  async function loadAnswers() {
    const L = BK.wishes.slice(), out = []; let i = 0;
    await Promise.all(Array.from({ length: 8 }, async () => { while (i < L.length) { const w = L[i++]; try { (await call('GET', `/api/wishes/${w.op}/answers?limit=50`)).forEach(a => out.push(a)); } catch (e) { } } }));
    BK.rawAnswers = out; BK.ansVer++;
  }

  async function init() {
    await call('GET', '/api/health', null, null, 8000);
    const spaces = {}, byB = {};
    for (let off = 0; off < 500; off += 100) {
      const list = await call('GET', `/api/vacancies?limit=100&offset=${off}`);
      list.forEach(v => byB[v.buildingId] = byB[v.buildingId] || v);
      if (list.length < 100) break;
    }
    for (let off = 0; off < 500; off += 100) {
      const list = await call('GET', `/api/buildings?limit=100&offset=${off}`);
      list.forEach(b => { const m = /^binkan-(V\d{3})$/.exec(b.buildingKey || ''); if (m && byB[b.id]) spaces[m[1]] = { b: b.id, v: byB[b.id].id, status: byB[b.id].status }; });
      if (list.length < 100) break;
    }
    if (!Object.keys(spaces).length) throw new Error('서버에 빈칸 없음');
    BK.spaces = spaces; await loadAll(); BK.on = true;
    BK.listeners.forEach(f => f());
  }
  // 처음엔 브라우저 저장으로 보여 주고, 서버가 준비되면 바꿔 탄다(Render 무료 서버는 깨어나는 데 30~60초)
  BK.ready = (async () => { for (let k = 0; k < 6; k++) { try { await init(); return true; } catch (e) { console.warn('백엔드 대기:', e.message); await new Promise(r => setTimeout(r, k === 0 ? 3000 : 15000)); } } return false; })();

  // ---------------- 계정 ----------------
  const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');
  const shape = j => ({ id: j.account.username || j.account.id, name: j.account.displayName, token: j.token, accountId: j.account.id, srvRole: j.account.role || null });
  BK.signup = async (username, password, name) => {
    const u = (username || 'm' + rnd(9)).toLowerCase(), pw = password && password.length >= 8 ? password : (password || '') + rnd(12);
    return shape(await call('POST', '/api/auth/signup', { email: u + '@members.binkan.invalid', username: u, password: pw, displayName: name || u }));
  };
  BK.login = async (username, password) => shape(await call('POST', '/api/auth/login', { username: username.toLowerCase(), password }));

  // ---------------- 바람 · 공감 ----------------
  BK.add = async (w) => {
    const m = BK.spaces[w.space]; if (!m) throw new Error('서버에 없는 빈칸');
    const j = await call('POST', `/api/buildings/${m.b}/opinions`, { desiredBusiness: w.title, reason: w.why === '—' ? '' : w.why, category: w.cat, vacancyId: m.v }, token());
    await loadOpinions(w.space);
    return BK.wishes.find(x => x.op === j.id) || null;
  };
  BK.toggleLike = async (id) => {
    const w = BK.wishes.find(x => x.id === id); if (!w) return null;
    const m = BK.spaces[w.space];
    const r = await call(w.liked ? 'DELETE' : 'PUT', `/api/buildings/${m.b}/opinions/${w.op}/like`, null, token());
    w.liked = !!r.likedByMe; w.likes = w.base + (r.likeCount || 0);
    return w;
  };
  // ---------------- 내 가게(가게 운영 API, OWNER만) ----------------
  // 사장님 역할은 서버가 정함(사업자등록 확인 또는 지정된 시범 가게 계정). 아니면 「내 가게」는 브라우저 저장으로만 돈다
  let ownerAt = 0, ownerOk = null, ownerTok = null;
  BK.isOwner = async () => {
    const t = token(); if (!BK.on || !t) return false;
    if (ownerTok === t && ownerOk !== null && (ownerOk || Date.now() - ownerAt < 60000)) return ownerOk;
    try { const me = await call('GET', '/api/me', null, t); ownerOk = me.role === 'OWNER'; } catch (e) { ownerOk = false; }
    ownerTok = t; ownerAt = Date.now(); return ownerOk;
  };
  BK.putStore = body => call('PUT', '/api/stores/me', body, token());
  BK.postAnswer = (op, body) => call('POST', `/api/wishes/${op}/answers`, body, token());
  BK.patchAnswer = (id, body) => call('PATCH', `/api/answers/${id}`, body, token());
  BK.went = id => call('POST', `/api/answers/${id}/went`, null, token());
  BK.alerts = () => call('GET', '/api/me/alerts?limit=30', null, token());
  BK.reloadAnswers = async () => { if (BK.on) { await loadAnswers(); BK.listeners.forEach(f => f()); } };

  BK.reload = async () => { if (BK.on) { await loadAll(); BK.listeners.forEach(f => f()); } };
  BK.onChange = f => BK.listeners.push(f);
  window.BK = BK;
})();
