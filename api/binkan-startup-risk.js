import { createRequire } from 'node:module';

const spaces = createRequire(import.meta.url)('./_binkan_spaces.json');
const ANALYSIS_URL = 'https://v2v-dongseongro-risk.onrender.com/api/startup-risk/direct';
const allowedOrigin = /^https:\/\/(?:(?:www\.)?parkmiyeong\.com|parkmiyeong-[a-z0-9-]+\.vercel\.app)$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;
const inputFields = ['depositKrw', 'monthlyRentKrw'];
const ipCounts = new Map();
let windowEnd = 0;
let requests = 0;

function rateLimited(ip) {
  const now = Date.now();
  if (now >= windowEnd) {
    windowEnd = now + 60000;
    requests = 0;
    ipCounts.clear();
  }
  const count = ipCounts.get(ip) || 0;
  if (count >= 12 || requests >= 90) return true;
  ipCounts.set(ip, count + 1);
  requests += 1;
  return false;
}

function analysisInput(body) {
  if (typeof body === 'string') {
    if (body.length > 4000) return null;
    body = JSON.parse(body);
  }
  const { businessIdea, spaceId, latitude, longitude, areaM2 } = body || {};
  const idea = typeof businessIdea === 'string' ? businessIdea.trim() : '';
  if (!idea || idea.length > 500 || typeof spaceId !== 'string' || !Object.hasOwn(spaces, spaceId)
    || !Number.isFinite(latitude) || Math.abs(latitude) > 90
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;

  const input = { businessIdea: idea, latitude, longitude };
  if (/(스시|초밥|사시미)/.test(idea)) input.industry = '일식 회/초밥';
  if (Number.isFinite(areaM2) && areaM2 > 0) input.areaM2 = areaM2;
  for (const field of inputFields) {
    const value = body[field];
    if (Number.isSafeInteger(value) && value >= 0 && value <= 1e15) input[field] = value;
  }
  return input;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청을 사용하세요.' });
  }
  if (!allowedOrigin.test(req.headers.origin || '')) {
    return res.status(403).json({ error: '빈칸 사이트에서 분석을 요청하세요.' });
  }
  let input;
  try { input = analysisInput(req.body); } catch { input = null; }
  if (!input) return res.status(400).json({ error: '창업 아이템과 후보 점포 좌표를 확인하세요.' });

  const token = process.env.STARTUP_RISK_API_TOKEN;
  if (!token) return res.status(503).json({ error: 'AI 분석 서버 설정이 필요합니다.' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000))));
    return res.status(429).json({ error: '잠시 후 다시 분석해 주세요.' });
  }
  try {
    const upstream = await fetch(ANALYSIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      redirect: 'error',
      signal: AbortSignal.timeout(55000),
    });
    if (!upstream.ok) return res.status(502).json({ error: 'AI 분석 서버가 결과를 반환하지 못했습니다.' });
    const report = await upstream.json();
    if (!['analyzed', 'partial', 'outside_coverage'].includes(report?.analysisStatus)
      || typeof report.summary !== 'string' || !Array.isArray(report.findings)) {
      return res.status(502).json({ error: 'AI 분석 결과를 읽을 수 없습니다.' });
    }
    const candidate = report.candidates?.[0];
    const market = candidate?.public_comparison;
    const model = candidate?.learned_risk;
    return res.status(200).json({
      analysisStatus: report.analysisStatus,
      summary: report.summary,
      findings: report.findings,
      studentProjects: Array.isArray(report.studentProjects) ? report.studentProjects : [],
      model: model ? { status: model.status, reason: model.reason, horizonDays: model.horizon_days,
        closureProbability: model.closure_probability } : null,
      comparison: market?.status === 'available' ? {
        radius: market.radius_m,
        nearby: market.nearby_business_count,
        same: market.same_industry_count,
        industry: market.industry_match?.industry,
        observedOn: market.observed_on,
      } : null,
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 서버가 깨어나는 중입니다. 잠시 후 다시 분석해 주세요.' });
    }
    return res.status(502).json({ error: 'AI 분석 서버에 연결할 수 없습니다.' });
  }
}
