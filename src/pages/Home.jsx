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

// 첫 장면 고정 + 커튼: 첫 화면은 붙어 있고, 아래 내용이 위로 덮어 오면 첫 장면이 작아지며 물러난다.
// 첫 화면이 화면보다 길면(휴대폰) 끝까지 읽은 뒤에 붙는다.
function useStage() {
  const stage = useRef(null)
  const inner = useRef(null)
  const curtain = useRef(null)
  useEffect(() => {
    const st = stage.current, inn = inner.current, cur = curtain.current
    if (!st || !inn || !cur) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const fit = () => { st.style.top = `${Math.min(0, window.innerHeight - st.offsetHeight)}px` }
    const tick = () => {
      raf = 0
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh - cur.getBoundingClientRect().top) / vh))
      st.style.setProperty('--p', p.toFixed(3))
      if (!reduce) {
        inn.style.transform = `translate3d(0, ${(-p * 7).toFixed(2)}%, 0) scale(${(1 - p * 0.07).toFixed(4)})`
        inn.style.opacity = String((1 - p * 0.8).toFixed(3))
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const onResize = () => { fit(); onScroll() }
    fit(); tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(st)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); ro.disconnect(); cancelAnimationFrame(raf) }
  }, [])
  return { stage, inner, curtain }
}

export default function Home() {
  const { stage, inner, curtain } = useStage()
  const t = useUi()
  const { projects, results, strengths, log } = useContent()
  return (
    <main>
      <Seo />

      {/* 첫 화면 — 사이트에서 유일한 짙은 면. 이름, 문장, 바깥에서 확인된 결과까지 */}
      <div ref={stage} className="hero-band sticky z-0 flex min-h-[100svh] flex-col overflow-hidden">
        <span aria-hidden="true" className="px-star left-[8%] top-[64%] text-hero-accent" />
        <span aria-hidden="true" className="px-star right-[6%] top-[18%] text-[#b9a8ff]" />
        <span aria-hidden="true" className="px-dot left-[46%] top-[12%] text-hero-ink" />
        <span aria-hidden="true" className="px-dot left-[30%] top-[86%] text-[#b9a8ff]" />
        <span aria-hidden="true" className="px-dot right-[22%] top-[90%] text-hero-accent" />
        <Nav tone="hero" />
        <div ref={inner} className="relative mx-auto flex w-full max-w-site flex-1 flex-col justify-center px-5 pb-8 pt-12 will-change-transform sm:px-8 sm:pt-14">
          <section className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <p className="text-[15px] font-medium text-hero-accent">{t.eyebrow}</p>
              <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.13] tracking-[-0.04em] sm:text-[3.3rem] lg:text-[3.75rem]">
                {t.headline[0][0]}
                <br className="hidden sm:block" />{t.headline[0][1]}
                <br /> {t.headline[1][0]}
              </h1>
              <p className="mt-8 max-w-[38rem] text-[18px] leading-[1.75] text-hero-ink-2">
                {t.intro}
              </p>
            </div>
            <div className="lg:col-span-5">
              <VerifyLog />
            </div>
          </section>

          {/* 바깥에서 확인된 결과 */}
          <section aria-label={t.resultsLabel} className="mt-12 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-14">
            {results.map((r, i) => (
              <L
                key={i}
                to={r.to}
                className="group block border border-hero-line bg-white/[0.04] px-5 py-5 backdrop-blur-[2px] transition-colors hover:border-hero-accent/60 hover:bg-white/[0.07] sm:px-6 sm:py-6"
              >
                <span className="block text-[1.45rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.6rem]">{r.value}</span>
                <span className="mt-2 block text-[15px] leading-[1.6] text-hero-ink-2">{r.caption}</span>
              </L>
            ))}
          </section>
        </div>
        <a href="#strengths" className="scroll-cue mx-auto mb-6 mt-2 flex items-center gap-2 text-[13px] text-hero-ink-2 hover:text-hero-ink" aria-label={t.scrollCueAria}>
          <span aria-hidden="true" className="cue-px" />
          {t.scrollCue}
        </a>
      </div>

      {/* 커튼 — 첫 장면 위로 덮어 올라오는 나머지 전부 */}
      <div ref={curtain} className="curtain relative z-10">
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
