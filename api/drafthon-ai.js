// 드래프톤 시연(/drafthon) 실시간 AI 중계. Claude 키는 Vercel 환경 변수에만 두고 브라우저에는 보내지 않는다.
// 팀 코드(DRAFTHON_CODE)가 맞는 요청만, 정해진 모델 · 길이 안에서만 전달한다.
const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5'];
const ORIGIN_OK = o => !o || /^https:\/\/(www\.)?parkmiyeong\.com$/.test(o) || /^https:\/\/parkmiyeong-[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } });
  if (!ORIGIN_OK(req.headers.origin)) return res.status(403).json({ error: { message: 'origin' } });
  const code = process.env.DRAFTHON_CODE, key = process.env.ANTHROPIC_API_KEY;
  if (!code || !key) return res.status(503).json({ error: { message: '서버 설정 없음' } });
  if (req.headers['x-demo-code'] !== code) return res.status(401).json({ error: { message: '팀 코드가 틀림' } });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const msgs = Array.isArray(b.messages) ? b.messages : [];
  if (msgs.length !== 1 || msgs[0].role !== 'user' || typeof msgs[0].content !== 'string' || msgs[0].content.length > 60000)
    return res.status(400).json({ error: { message: '요청 모양 오류' } });
  if (b.system != null && (typeof b.system !== 'string' || b.system.length > 4000)) return res.status(400).json({ error: { message: '요청 모양 오류' } });
  const body = {
    model: MODELS.includes(b.model) ? b.model : MODELS[0],
    max_tokens: Math.max(16, Math.min(Number(b.max_tokens) || 4000, 8000)),
    output_config: { effort: 'low' }, fallbacks: 'default',
    messages: [{ role: 'user', content: msgs[0].content }]
  };
  if (b.system) body.system = b.system;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify(body)
    });
    const t = await r.text();
    res.status(r.status).setHeader('content-type', 'application/json').send(t);
  } catch (e) {
    res.status(502).json({ error: { message: 'AI 서버 연결 실패' } });
  }
}
