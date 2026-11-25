// 동성로 빈칸 의견 공유 썸네일(1200×630 PNG). /api/binkan-ogimg?t=가게&a=주소&n=공감수
// 카카오톡 · 메신저 링크 미리보기용. satori(화면 → SVG) + resvg(SVG → PNG). 글꼴은 사이트에 올린 Pretendard를 읽어 쓴다.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const h = (type, style, ...children) => ({ type, props: { style: Object.assign({ display: 'flex' }, style), children: children.length === 1 ? children[0] : children } });
const cut = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  const u = new URL(req.url, 'https://' + (req.headers.host || 'parkmiyeong.com'));
  const t = cut(u.searchParams.get('t'), 24) || '원하는 가게', a = cut(u.searchParams.get('a'), 28), n = Math.max(0, Math.min(99999, parseInt(u.searchParams.get('n'), 10) || 0));
  const font = p => fetch('https://parkmiyeong.com/drafthon/binkan/og/fonts/' + p).then(r => r.arrayBuffer());
  const [xb, sb] = await Promise.all([font('Pretendard-ExtraBold.otf'), font('Pretendard-SemiBold.otf')]);
  const size = t.length <= 7 ? 104 : t.length <= 11 ? 84 : t.length <= 16 ? 66 : 54;
  const ORANGE = '#f0573a', INK = '#18202b';
  const el = h('div', { width: '1200px', height: '630px', background: ORANGE, position: 'relative', fontFamily: 'P', color: '#fff', overflow: 'hidden' },
    // 오른쪽 빈칸 그림: 겹친 빈칸 네모들
    h('div', { position: 'absolute', right: '-70px', top: '120px', width: '420px', height: '420px', border: '18px solid rgba(255,255,255,.22)', borderRadius: '64px' }),
    h('div', { position: 'absolute', right: '60px', top: '60px', width: '250px', height: '250px', border: '14px solid rgba(255,255,255,.35)', borderRadius: '44px' }),
    h('div', { position: 'absolute', left: '72px', top: '58px', width: '1056px', height: '514px', flexDirection: 'column' },
      h('div', { alignItems: 'center' },
        h('div', { background: '#fff', color: ORANGE, fontWeight: 800, fontSize: '28px', padding: '8px 14px', borderRadius: '14px' }, '빈칸'),
        h('div', { marginLeft: '14px', fontSize: '30px', fontWeight: 800 }, '동성로 빈칸')),
      h('div', { marginTop: '54px', fontSize: '36px', fontWeight: 600, opacity: 0.92 }, '이 빈칸에'),
      h('div', { marginTop: '6px', fontSize: size + 'px', fontWeight: 800, lineHeight: 1.12, maxWidth: '900px', letterSpacing: '-2px' }, '「' + t + '」'),
      h('div', { marginTop: '10px', fontSize: '44px', fontWeight: 800, letterSpacing: '-1px' }, '있으면 좋겠다!'),
      h('div', { marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between', width: '1056px' },
        h('div', { alignItems: 'center' },
          a ? h('div', { fontSize: '30px', fontWeight: 600, marginRight: '18px' }, (/^동성로/.test(a) ? a : '동성로 ' + a)) : h('div', {}, ''),
          h('div', { background: '#fff', color: ORANGE, fontSize: '30px', fontWeight: 800, padding: '8px 20px', borderRadius: '99px' }, '♥ ' + n + (u.searchParams.get('o') === '1' ? ' · 운영팀 의견' : '명이 공감'))),
        h('div', { background: INK, color: '#fff', fontSize: '28px', fontWeight: 800, padding: '14px 26px', borderRadius: '99px' }, '나도 공감하기 →'))));
  try {
    const svg = await satori(el, { width: 1200, height: 630, fonts: [{ name: 'P', data: xb, weight: 800, style: 'normal' }, { name: 'P', data: sb, weight: 600, style: 'normal' }] });
    const buf = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.status(200).send(buf);
  } catch (e) { console.error('ogimg', e); res.setHeader('Cache-Control', 'no-store'); return res.redirect(302, '/drafthon/binkan/og/home.png'); }
}
