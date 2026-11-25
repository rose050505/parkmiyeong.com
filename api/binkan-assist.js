// 동성로 빈칸(/drafthon/binkan) 「빈칸 도우미」 전용 AI 창구. 팀 코드 없이 열려 있지만 일반 Claude 창구로는 못 쓴다:
// - 지시문(SYSTEM)과 요청 모양은 서버가 고정(_binkan_assist.cjs = 프론트 assist.js 사본). 브라우저는 맥락 · 문장만 보낸다
// - 답은 길 안내 JSON(route · item · trouble · group · query · reply)만 돌려준다
// - 사이트 주소 확인 · 길이 제한 · 1분당 횟수 제한(인스턴스 단위, 대략)
import A from './_binkan_assist.cjs';

const ORIGIN_OK = o => /^https:\/\/(www\.)?parkmiyeong\.com$/.test(o) || /^https:\/\/parkmiyeong-[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
const hits = new Map(); let all = [];
function limited(ip) {
  const now = Date.now(), cut = now - 60000;
  all = all.filter(t => t > cut); if (all.length >= 300) return true;
  const h = (hits.get(ip) || []).filter(t => t > cut); if (h.length >= 20) return true;
  h.push(now); hits.set(ip, h); all.push(now); return false;
}
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const list = (v, k, n) => (Array.isArray(v) ? v.slice(0, k).map(x => str(x, n)).filter(Boolean) : []);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Cache-Control', 'no-store');
  if (ORIGIN_OK(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); }
  if (req.method === 'OPTIONS') return res.status(ORIGIN_OK(origin) ? 204 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!ORIGIN_OK(origin)) return res.status(403).json({ error: 'origin' });
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return res.status(503).json({ error: '서버 설정 없음' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return res.status(429).json({ error: '요청이 너무 많아요' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const text = str(b.text, 300).trim(); if (!text) return res.status(400).json({ error: '빈 문장' });
  const c = b.ctx || {}, sp = c.space && typeof c.space === 'object' ? c.space : null;
  const ctx = { screen: str(c.screen, 30) || '첫 화면', space: sp ? { addr: str(sp.addr, 60), was: str(sp.was, 40), wishes: list(sp.wishes, 3, 60) } : null, trending: list(c.trending, 8, 40), supports: list(c.supports, 5, 60) };
  const history = (Array.isArray(b.history) ? b.history.slice(-6) : []).map(h => ({ who: h && h.who === 'me' ? 'me' : 'bot', text: str(h && h.text, 300) })).filter(h => h.text);
  const body = Object.assign(A.body(ctx, history, text), { output_config: { effort: 'low' }, fallbacks: 'default' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: 'AI 서버 응답 오류' });
    if (j.stop_reason === 'refusal') return res.status(200).json({ u: null, why: 'refusal' });
    const u = A.parse((j.content || []).filter(x => x.type === 'text').map(x => x.text).join(''));
    return res.status(200).json({ u });
  } catch (e) {
    return res.status(502).json({ error: 'AI 서버 연결 실패' });
  }
}
