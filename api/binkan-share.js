// 같이가게 의견 공유 주소: /drafthon/binkan/s/V005?w=가게&a=주소&n=공감수 → 미리보기(og) 태그를 단 페이지를 주고 사이트로 넘긴다.
import SPACES from './_binkan_spaces.json' with { type: 'json' };
import SEEDW from './_binkan_seed.json' with { type: 'json' };
const SITE = 'https://parkmiyeong.com';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
export default function handler(req, res) {
  const q = Object.assign({}, req.query || {});
  // 짧은 주소 /b/:c — c = 처음부터 있던 의견 번호(w05) 또는 빈칸.가게이름(base64url).공감수
  const c = String(q.c || '');
  if (/^w\d{1,3}$/.test(c) && SEEDW[c]) Object.assign(q, { s: SEEDW[c].s, w: SEEDW[c].t, n: SEEDW[c].n });
  else { const m = c.match(/^(V\d{3})\.([A-Za-z0-9_-]{1,120})\.(\d{1,5})$/); if (m) { let t = ''; try { t = Buffer.from(m[2], 'base64url').toString('utf8'); } catch (e) {} Object.assign(q, { s: m[1], w: t, n: m[3] }); } }
  const s = /^V\d{3}$/.test(String(q.s || '')) ? String(q.s) : '';
  const w = cut(q.w, 24), a = cut(q.a, 28) || (s && SPACES[s]) || '', n = Math.max(0, Math.min(99999, parseInt(q.n, 10) || 0));
  const target = SITE + '/drafthon/binkan/' + (s ? '#s=' + s : '');
  const self = c ? SITE + '/b/' + c : SITE + '/drafthon/binkan/s/' + s + '?' + new URLSearchParams({ w, n: String(n) }).toString();
  const title = w ? `「${w}」 있으면 좋겠다 — 같이가게` : '같이가게 — 의견에서 개업, 운영까지';
  const place = /^동성로/.test(a) ? a : '동성로 ' + a;
  const op = /^w\d{1,3}$/.test(c);   // 처음부터 있던 의견 = 운영팀이 넣은 의견(공감 수도 운영팀이 넣은 것)
  const desc = w ? `${place} 빈칸 · 공감 ${n}${op ? ' · 운영팀 의견' : ''}. 나도 공감하고, 원하는 가게를 남겨 보세요.` : '동성로 빈 점포에 「여기 ○○ 있으면」을 남기면, 준비된 사장님이 가게를 열고 대구 대학생 팀이 개업 준비를 도와요.';
  const img = w ? SITE + '/api/binkan-ogimg?' + new URLSearchParams(Object.assign({ t: w, a, n: String(n) }, op ? { o: '1' } : {})).toString() : SITE + '/drafthon/binkan/og/home.png';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="같이가게">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(self)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><script>location.replace(${JSON.stringify(target)})</script><a href="${esc(target)}">같이가게로 가기</a></body></html>`);
}
