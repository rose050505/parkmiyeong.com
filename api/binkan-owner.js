// 동성로 빈칸 「가게 사장님으로 바로 시작」: 서버에 지정된 시범 가게 계정(팀 백엔드 V2V_DEMO_OWNER_ACCOUNT_ID)으로 로그인해 토큰만 돌려준다.
// 비밀번호는 Vercel 환경변수(BINKAN_OWNER_USER · BINKAN_OWNER_PW)에만 있고 브라우저 코드에는 없다.
const ORIGIN_OK = o => /^https:\/\/(www\.)?parkmiyeong\.com$/.test(o) || /^https:\/\/parkmiyeong-[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
const API = 'https://v2v-drafthon-backend.onrender.com';
const hits = new Map();
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Cache-Control', 'no-store');
  if (ORIGIN_OK(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); }
  if (req.method === 'OPTIONS') return res.status(ORIGIN_OK(origin) ? 204 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!ORIGIN_OK(origin)) return res.status(403).json({ error: 'origin' });
  const u = process.env.BINKAN_OWNER_USER, p = process.env.BINKAN_OWNER_PW;
  if (!u || !p) return res.status(503).json({ error: '서버 설정 없음' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x', now = Date.now();
  const h = (hits.get(ip) || []).filter(t => t > now - 60000); if (h.length >= 30) return res.status(429).json({ error: '요청이 너무 많아요' }); h.push(now); hits.set(ip, h);
  try {
    const r = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: p }), signal: AbortSignal.timeout(60000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) return res.status(502).json({ error: '가게 계정 로그인 실패' });
    let a = j.account || {};
    // 시범 가게 계정이 다른 역할(예: 예비 창업자 FOUNDER)로 바뀌어 있으면 가게 API(/api/stores/me 등)가 403 → 「내 가게」가 서버에 안 올라감.
    // 지정된 시연 계정은 역할명만 보내 OWNER로 되돌릴 수 있음(백엔드 README). 실패해도 로그인은 그대로 돌려줌
    if (a.role !== 'OWNER') {
      try {
        const rr = await fetch(API + '/api/me/role', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + j.token }, body: JSON.stringify({ role: 'OWNER' }), signal: AbortSignal.timeout(20000) });
        if (rr.ok) { const me = await rr.json().catch(() => null); if (me && me.role) a = Object.assign({}, a, me); }
      } catch (e) { }
    }
    return res.status(200).json({ token: j.token, account: { id: a.id, username: a.username, displayName: '동성로 시범 가게', role: a.role || null, roles: a.roles || [], demoOwner: !!a.demoOwner } });
  } catch (e) { return res.status(504).json({ error: '팀 서버 응답 없음' }); }
}
