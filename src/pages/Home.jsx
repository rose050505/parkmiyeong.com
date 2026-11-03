import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import Stamp from '../components/Stamp.jsx'
import Nav from '../components/Nav.jsx'
import VerifyLog from '../components/VerifyLog.jsx'
import { CraftList, SkillList } from '../components/Craft.jsx'
import { projects } from '../content/projects.js'
import { results, strengths, log } from '../content/home.js'

function SectionHead({ title, children }) {
  return (
    <header className="max-w-read">
      <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]"><span aria-hidden="true" className="sec-star" />{title}</h2>
      {children && <p className="mt-3 text-[17px] leading-[1.7] text-ink-2">{children}</p>}
    </header>
  )
}

function WorkEntry({ p, index }) {
  const img = p.card.image
  return (
    <article id={p.slug} className="grid scroll-mt-10 gap-8 border-t border-line py-14 sm:py-16 lg:grid-cols-12 lg:gap-14 first:border-t-0">
      <div className="lg:sticky lg:top-10 lg:col-span-5 lg:self-start">
        <Link to={`/p/${p.slug}`} className="block" aria-label={`${p.name} 자세히 보기`}>
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
        </Link>
      </div>

      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.4rem]">
            <Link to={`/p/${p.slug}`} className="hover:text-accent">
              {p.name}
            </Link>
          </h3>
          <Stamp kind={p.status.kind}>{p.status.label}</Stamp>
        </div>
        <p className="mt-2 text-[15px] leading-snug text-ink-3">{p.venue}</p>
        <p className="mt-1 text-[15px] leading-snug text-ink-3">{p.role}</p>
        <p className="mt-5 text-[18px] leading-[1.7]">{p.oneLiner}</p>

        <h4 className="subhead mt-9">공들인 부분</h4>
        <CraftList items={p.craft} className="mt-4" />

        <h4 className="subhead mt-9">이 프로젝트로 키운 능력</h4>
        <SkillList items={p.skills} className="mt-3" />

        <p className="mt-9">
          <Link to={`/p/${p.slug}`} className="link text-[16px] font-medium">
            {p.name} 자세히 읽기
          </Link>
        </p>
      </div>
    </article>
  )
}

export default function Home() {
  return (
    <main>
      <Seo />

      {/* 첫 화면 — 사이트에서 유일한 짙은 면. 이름, 문장, 바깥에서 확인된 결과까지 */}
      <div className="hero-band relative overflow-hidden">
        <span aria-hidden="true" className="px-star left-[8%] top-[64%] text-hero-accent" />
        <span aria-hidden="true" className="px-star right-[6%] top-[18%] text-[#b9a8ff]" />
        <span aria-hidden="true" className="px-dot left-[46%] top-[12%] text-hero-ink" />
        <span aria-hidden="true" className="px-dot left-[30%] top-[86%] text-[#b9a8ff]" />
        <span aria-hidden="true" className="px-dot right-[22%] top-[90%] text-hero-accent" />
        <Nav tone="hero" />
        <div className="relative mx-auto max-w-site px-5 pb-16 sm:px-8 sm:pb-20">
          <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <p className="text-[15px] font-medium text-hero-accent">소프트웨어 전공 2학년 · AI 서비스 개발</p>
              <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.13] tracking-[-0.04em] sm:text-[3.3rem] lg:text-[3.75rem]">
                틀리면 안 되는 숫자는
                <br className="hidden sm:block" /> 코드가 계산하고,
                <br /> 말은 AI가 합니다.
              </h1>
              <p className="mt-8 max-w-[38rem] text-[18px] leading-[1.75] text-hero-ink-2">
                박미영입니다. 법 조문, 공식 통계, 모임 기록처럼 틀리면 안 되는 자료를 다루는 AI 서비스를 만듭니다. 2026년에
                공모전과 대회에 내놓은 것들을 모았고, 기획부터 배포까지 대부분 혼자 했습니다.
              </p>
            </div>
            <div className="lg:col-span-5">
              <VerifyLog />
            </div>
          </section>

          {/* 바깥에서 확인된 결과 */}
          <section aria-label="확인된 결과" className="mt-14 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {results.map((r, i) => (
              <Link
                key={i}
                to={r.to}
                className="group block rounded-2xl border border-hero-line bg-white/[0.04] px-5 py-5 backdrop-blur-[2px] transition-colors hover:border-hero-accent/60 hover:bg-white/[0.07] sm:px-6 sm:py-6"
              >
                <span className="block text-[1.45rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.6rem]">{r.value}</span>
                <span className="mt-2 block text-[15px] leading-[1.6] text-hero-ink-2">{r.caption}</span>
              </Link>
            ))}
          </section>
        </div>
      </div>

      {/* 강점 */}
      <div className="mx-auto max-w-site px-5 sm:px-8">
        <section id="strengths" className="mt-20 scroll-mt-10 sm:mt-28">
          <SectionHead title="강점">
            올해 만든 것들에서 반복해서 드러난 네 가지입니다. 각각 아래 프로젝트에서 실제로 한 일을 근거로 붙였습니다.
          </SectionHead>
          <div className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-2">
            {strengths.map((s, i) => (
              <article key={i} className="rounded-[22px] border border-line bg-surface p-6 sm:p-8">
                <h3 className="text-[1.35rem] font-bold leading-snug tracking-[-0.02em] sm:text-[1.5rem]">{s.title}</h3>
                <p className="mt-3 text-[16px] leading-[1.75] text-ink-2">{s.text}</p>
                <ul className="mt-6 space-y-3 border-t border-line pt-5">
                  {s.proof.map((pr, j) => (
                    <li key={j}>
                      <Link to={pr.to} className="group grid gap-x-4 gap-y-0.5 sm:grid-cols-[6.5rem_1fr]">
                        <span className="text-[14.5px] font-semibold text-accent">{pr.project}</span>
                        <span className="text-[15px] leading-[1.65] text-ink-2 group-hover:text-ink">{pr.text}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-site px-5 sm:px-8">
        {/* 만든 것들 */}
        <section id="work" className="mt-24 scroll-mt-10 sm:mt-32">
          <SectionHead title="만든 것들">
            제대로 만들어 내놓은 여섯입니다. 상을 받았거나 지금도 쓰이는 것부터 놓았고, 프로젝트마다 공들인 부분과 그 과정에서
            키운 능력을 적었습니다.
          </SectionHead>
          <div className="mt-10">
            {projects.map((p, i) => (
              <WorkEntry key={p.slug} p={p} index={i} />
            ))}
          </div>
        </section>

        {/* 2026 기록 */}
        <section id="log" className="mt-16 scroll-mt-10 border-t border-line pt-14 sm:mt-20">
          <SectionHead title="2026년 기록">
            위 여섯을 포함해 올해 한 일입니다. 끝난 것, 안 된 것, 하는 중인 것을 함께 적었습니다.
          </SectionHead>
          <ol className="mt-8 max-w-[52rem]">
            {log.map((e, i) => (
              <li key={i} className="grid gap-x-6 gap-y-1 border-b border-line py-3.5 sm:grid-cols-[9.5rem_1fr]">
                <span className="text-[15px] tabular-nums text-ink-3">{e.when}</span>
                <span className="text-[16px] leading-[1.7]">
                  {e.to ? (
                    <Link to={e.to} className="hover:text-accent">
                      {e.text}
                    </Link>
                  ) : (
                    e.text
                  )}
                  {e.stamp === 'award' && (
                    <Stamp kind="award" className="ml-2 align-[2px]">
                      수상
                    </Stamp>
                  )}
                  {e.stamp === 'planned' && (
                    <Stamp kind="planned" className="ml-2 align-[2px]">
                      예정
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
              <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]"><span aria-hidden="true" className="sec-star" />일하는 방식</h2>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-2">
                혼자 하지만 혼자 하지 않습니다. 노트북의 Claude Code, 클라우드의 총괄 세션, 검토와 야간 실행을 맡는 Codex가 한
                팀이고, 저는 성공 기준과 검증 세트와 최종 선택을 쥡니다. 10월에는 에이전트와 일해 온 제 방식을 작업 로그로
                진단해서 운영 방식을 바꿨습니다. 할 일 보드와 GPU 과금 감시기처럼 그 과정에서 직접 만든 도구도 있습니다.
              </p>
              <p className="mt-6">
                <Link to="/how" className="link text-[16px] font-medium">
                  어떻게 일하는지 읽기
                </Link>
              </p>
            </div>
            <blockquote className="pull self-center lg:col-span-5">
              <p className="text-[20px] font-medium leading-[1.6]">
                문장으로 남긴 교훈은 지켜지지 않았고, 훅·관문 스크립트로 막은 것만 지켜졌다.
              </p>
              <cite className="mt-3 block text-[14px] not-italic text-ink-3">항만 대회 교훈, 2026년 10월 29일</cite>
            </blockquote>
          </div>
        </section>
      </div>
    </main>
  )
}
