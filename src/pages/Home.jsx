import { useEffect, useRef } from 'react'
import { L, useUi } from '../i18n.jsx'
import { useContent } from '../content/index.js'
import Seo from '../components/Seo.jsx'
import Stamp from '../components/Stamp.jsx'
import Nav from '../components/Nav.jsx'
import VerifyLog from '../components/VerifyLog.jsx'
import Reveal from '../components/Reveal.jsx'
import { CraftList, SkillList } from '../components/Craft.jsx'

function SectionHead({ title, children }) {
  return (
    <header className="max-w-read">
      <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]"><span aria-hidden="true" className="sec-star" />{title}</h2>
      {children && <p className="mt-3 text-[17px] leading-[1.7] text-ink-2">{children}</p>}
    </header>
  )
}

function WorkEntry({ p, index }) {
  const t = useUi()
  const img = p.card.image
  return (
    <Reveal as="article" id={p.slug} className="grid scroll-mt-10 gap-8 border-t border-line py-14 sm:py-16 lg:grid-cols-12 lg:gap-14 first:border-t-0">
      <div className="lg:sticky lg:top-10 lg:col-span-5 lg:self-start">
        <L to={`/p/${p.slug}`} className="block" aria-label={t.seeMore(p.name)}>
          <div className="frame" style={p.tint ? { '--tint': p.tint } : undefined}>
            {img.kind === 'phone' ? (
              <div className="mx-auto max-w-[250px]">
                <div className="phone">
                  <img src={img.src} alt={img.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
                </div>
              </div>
            ) : (
              <div className="shot">
                <img src={img.src} alt={img.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </div>
            )}
          </div>
        </L>
      </div>

      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.4rem]">
            <L to={`/p/${p.slug}`} className="hover:text-accent">
              {p.name}
            </L>
          </h3>
          <Stamp kind={p.status.kind}>{p.status.label}</Stamp>
        </div>
        <p className="mt-2 text-[15px] leading-snug text-ink-3">{p.venue}</p>
        <p className="mt-1 text-[15px] leading-snug text-ink-3">{p.role}</p>
        <p className="mt-5 text-[18px] leading-[1.7]">{p.oneLiner}</p>

        <h4 className="subhead mt-9">{t.craftTitle}</h4>
        <CraftList items={p.craft} className="mt-4" />

        <h4 className="subhead mt-9">{t.skillsTitle}</h4>
        <SkillList items={p.skills} className="mt-3" />

        <p className="mt-9">
          <L to={`/p/${p.slug}`} className="link text-[16px] font-medium">
            {t.readMore(p.name)}
          </L>
        </p>
      </div>
    </Reveal>
  )
}

// 첫 화면 → 강점 장면 전환.
// 첫 화면은 .scene 안에서 붙어 있고(휴대폰처럼 화면보다 길면 끝까지 읽은 뒤에 붙는다),
// 붙은 뒤 더 내린 거리(화면 높이 단위)가 각 요소의 data-out 값을 넘으면 그 요소가 정해진 쪽으로 빠진다.
// 값이 작은 것부터: 내려서 보기 → 결과 카드(왼쪽부터) → 검산 기록 → 글과 메뉴 → 남색 바탕(auto, 아래 fit 참고).
// 되감아서 값보다 0.03 이상 올라오면 돌아온다(경계에서 떨리지 않게 조금 겹친다).
function useScene() {
  const scene = useRef(null)
  const stage = useRef(null)
  useEffect(() => {
    const sc = scene.current, st = stage.current
    if (!sc || !st) return
    const motion = document.documentElement.classList.contains('motion')
    const parts = [...st.querySelectorAll('[data-out]')].map((el) => ({ el, at: parseFloat(el.dataset.out) || 0, auto: el.dataset.out === 'auto', out: false }))
    let raf = 0
    let top = 0
    const fit = () => {
      top = Math.min(0, window.innerHeight - st.offsetHeight)
      st.style.top = `${top}px`
      // 바탕(data-out="auto")은 붙은 화면에 실제로 보이는 마지막 요소가 빠진 직후에 꺼진다.
      // 휴대폰은 첫 화면이 길어서 붙었을 때 제목이 이미 위로 지나가 있다 — 그만큼 빈 남색 구간을 줄인다.
      const base = st.getBoundingClientRect().top
      let last = 0
      for (const pt of parts) {
        if (pt.auto) continue
        const r = pt.el.getBoundingClientRect()
        if (r.bottom - base > -top + 40) last = Math.max(last, pt.at)
      }
      for (const pt of parts) if (pt.auto) pt.at = last + 0.05
    }
    const tick = () => {
      raf = 0
      const d = (top - sc.getBoundingClientRect().top) / window.innerHeight
      const changed = []
      for (const pt of parts) {
        const out = d > pt.at ? true : d <= Math.max(0, pt.at - 0.03) ? false : pt.out
        if (out !== pt.out) changed.push(pt)
      }
      if (!changed.length) return
      // 한 번에 여러 문턱을 넘으면(빠른 스크롤, 메뉴 클릭) 동시에 움직이지 않고 순서대로 70ms씩 늦게 출발한다.
      // 나갈 때는 문턱이 작은 것부터, 돌아올 때는 큰 것부터(바탕이 먼저 켜지고 카드가 들어온다).
      const goingOut = !changed[0].out
      changed.sort((a, b) => (goingOut ? a.at - b.at : b.at - a.at))
      changed.forEach((pt, k) => {
        pt.out = goingOut
        pt.el.style.transitionDelay = changed.length > 1 ? `${k * 70 + (goingOut && pt.auto ? 120 : 0)}ms` : ''
        pt.el.classList.toggle('out', goingOut)
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const onResize = () => { fit(); onScroll() }
    // 빠진 요소에 키보드 초점이 들어오면 장면을 처음으로 되돌려 보이게 한다
    const onFocus = (e) => {
      if (!e.target.closest('.out')) return
      st.classList.add('scene-jump')
      window.scrollTo({ top: window.scrollY + sc.getBoundingClientRect().top - top, behavior: 'instant' })
      tick()
      requestAnimationFrame(() => st.classList.remove('scene-jump'))
    }
    // 움직임 줄이기: 붙이지도 빼지도 않는다. 첫 화면은 그냥 흘러가는 첫 블록이다.
    if (!motion) return
    fit()
    // 주소의 #으로 중간에서 열렸을 때는 움직임 없이 그 상태로 시작한다
    st.classList.add('scene-jump')
    tick()
    const unjump = requestAnimationFrame(() => requestAnimationFrame(() => st.classList.remove('scene-jump')))
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    st.addEventListener('focusin', onFocus)
    const ro = new ResizeObserver(onResize)
    ro.observe(st)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      st.removeEventListener('focusin', onFocus)
      ro.disconnect()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(unjump)
    }
  }, [])
  return { scene, stage }
}

export default function Home() {
  const { scene, stage } = useScene()
  const t = useUi()
  const { projects, results, strengths, log } = useContent()
  // 결과 카드가 빠지는 쪽: 한 줄 세 칸(640px 이상)이면 왼쪽·위·오른쪽으로 갈라지고, 세로로 쌓이면 번갈아 좌우로
  const resultOut = [
    { dir: 'left', sm: 'left', at: 0.04 },
    { dir: 'right', sm: 'up', at: 0.08 },
    { dir: 'left', sm: 'right', at: 0.12 },
  ]
  return (
    <main className="overflow-x-clip">
      <Seo />

      {/* 첫 화면 — 사이트에서 유일한 짙은 면. 이름, 문장, 바깥에서 확인된 결과까지 */}
      <div ref={scene} className="scene">
      <div ref={stage} className="hero-band relative z-0 flex min-h-[100svh] flex-col overflow-hidden">
        <div aria-hidden="true" className="hero-bg" data-out="auto">
          <span className="px-star left-[8%] top-[64%] text-hero-accent" />
          <span className="px-star right-[6%] top-[18%] text-[#b9a8ff]" />
          <span className="px-dot left-[46%] top-[12%] text-hero-ink" />
          <span className="px-dot left-[30%] top-[86%] text-[#b9a8ff]" />
          <span className="px-dot right-[22%] top-[90%] text-hero-accent" />
        </div>
        <div className="relative" data-out="0.21" data-dir="up">
          <Nav tone="hero" />
        </div>
        <div className="relative mx-auto flex w-full max-w-site flex-1 flex-col justify-center px-5 pb-8 pt-12 sm:px-8 sm:pt-14">
          <section className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7" data-out="0.21" data-dir="up">
              <p className="text-[15px] font-medium text-hero-accent">{t.eyebrow}</p>
              <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.13] tracking-[-0.04em] sm:text-[3.3rem] lg:text-[3.75rem]">
                {t.headline[0][0]}
                {t.headline[0][1] && <br className="hidden sm:block" />}
                {t.headline[0][1]}
                <br /> {t.headline[1][0]}
              </h1>
              <p className="mt-8 max-w-[38rem] text-[18px] leading-[1.75] text-hero-ink-2">
                {t.intro}
              </p>
            </div>
            <div className="lg:col-span-5" data-out="0.16" data-dir="right">
              <VerifyLog />
            </div>
          </section>

          {/* 바깥에서 확인된 결과 */}
          <section aria-label={t.resultsLabel} className="mt-12 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-14">
            {results.map((r, i) => (
              <div key={i} className="grid" data-out={resultOut[i % 3].at} data-dir={resultOut[i % 3].dir} data-dir-sm={resultOut[i % 3].sm}>
                <L
                  to={r.to}
                  className="group block border border-hero-line bg-white/[0.04] px-5 py-5 backdrop-blur-[2px] transition-colors hover:border-hero-accent/60 hover:bg-white/[0.07] sm:px-6 sm:py-6"
                >
                  <span className="block text-[1.45rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.6rem]">{r.value}</span>
                  <span className="mt-2 block text-[15px] leading-[1.6] text-hero-ink-2">{r.caption}</span>
                </L>
              </div>
            ))}
          </section>
        </div>
        <div className="relative" data-out="0.02">
          <a href="#strengths" className="scroll-cue mx-auto mb-6 mt-2 flex w-fit items-center gap-2 text-[13px] text-hero-ink-2 hover:text-hero-ink" aria-label={t.scrollCueAria}>
            <span aria-hidden="true" className="cue-px" />
            {t.scrollCue}
          </a>
        </div>
      </div>
      </div>

      {/* 첫 화면이 비워진 자리로 이어지는 본문. 바탕이 같아서 이음매가 없다 */}
      <div className="after-scene relative z-10">
      <div className="mx-auto max-w-site px-5 sm:px-8">
        <section id="strengths" className="scroll-mt-10 pt-16 sm:pt-24">
          <SectionHead title={t.strengthsTitle}>{t.strengthsLead}</SectionHead>
          <div className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-2">
            {strengths.map((s, i) => (
              <Reveal as="article" key={i} delay={(i % 2) * 90} className="border border-line bg-surface p-6 sm:p-8">
                <h3 className="text-[1.35rem] font-bold leading-snug tracking-[-0.02em] sm:text-[1.5rem]">{s.title}</h3>
                <p className="mt-3 text-[16px] leading-[1.75] text-ink-2">{s.text}</p>
                <ul className="mt-6 space-y-3 border-t border-line pt-5">
                  {s.proof.map((pr, j) => (
                    <li key={j}>
                      <L to={pr.to} className="group grid gap-x-4 gap-y-0.5 sm:grid-cols-[6.5rem_1fr]">
                        <span className="text-[14.5px] font-semibold text-accent">{pr.project}</span>
                        <span className="text-[15px] leading-[1.65] text-ink-2 group-hover:text-ink">{pr.text}</span>
                      </L>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-site px-5 sm:px-8">
        {/* 만든 것들 */}
        <section id="work" className="mt-24 scroll-mt-10 sm:mt-32">
          <SectionHead title={t.workTitle}>{t.workLead}</SectionHead>
          <div className="mt-10">
            {projects.map((p, i) => (
              <WorkEntry key={p.slug} p={p} index={i} />
            ))}
          </div>
        </section>

        {/* 2026 기록 */}
        <section id="log" className="mt-16 scroll-mt-10 border-t border-line pt-14 sm:mt-20">
          <SectionHead title={t.logTitle}>{t.logLead}</SectionHead>
          <ol className="mt-8 max-w-[52rem]">
            {log.map((e, i) => (
              <li key={i} className="grid gap-x-6 gap-y-1 border-b border-line py-3.5 sm:grid-cols-[9.5rem_1fr]">
                <span className="text-[15px] tabular-nums text-ink-3">{e.when}</span>
                <span className="text-[16px] leading-[1.7]">
                  {e.to ? (
                    <L to={e.to} className="hover:text-accent">
                      {e.text}
                    </L>
                  ) : (
                    e.text
                  )}
                  {e.stamp === 'award' && (
                    <Stamp kind="award" className="ml-2 align-[2px]">
                      {t.stampAward}
                    </Stamp>
                  )}
                  {e.stamp === 'planned' && (
                    <Stamp kind="planned" className="ml-2 align-[2px]">
                      {t.stampPlanned}
                    </Stamp>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 일하는 방식 */}
        <section className="mt-20 border-t border-line pt-14 sm:mt-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]"><span aria-hidden="true" className="sec-star" />{t.howTitle}</h2>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-2">{t.howTeaser}</p>
              <p className="mt-6">
                <L to="/how" className="link text-[16px] font-medium">
                  {t.howRead}
                </L>
              </p>
            </div>
            <blockquote className="pull self-center lg:col-span-5">
              <p className="text-[20px] font-medium leading-[1.6]">{t.pullQuote}</p>
              <cite className="mt-3 block text-[14px] not-italic text-ink-3">{t.pullCite}</cite>
            </blockquote>
          </div>
        </section>
      </div>
      </div>
    </main>
  )
}
