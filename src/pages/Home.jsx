import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import Stamp from '../components/Stamp.jsx'
import { CraftList, SkillList } from '../components/Craft.jsx'
import { projects } from '../content/projects.js'
import { results, strengths, log } from '../content/home.js'

function SectionHead({ title, children }) {
  return (
    <header className="max-w-read">
      <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]">{title}</h2>
      {children && <p className="mt-3 text-[17px] leading-[1.7] text-ink-2">{children}</p>}
    </header>
  )
}

function WorkEntry({ p, index }) {
  const img = p.card.image
  return (
    <article id={p.slug} className="grid scroll-mt-10 gap-8 border-t border-line py-14 sm:py-16 lg:grid-cols-12 lg:gap-14">
      <div className="lg:sticky lg:top-10 lg:col-span-5 lg:self-start">
        <Link to={`/p/${p.slug}`} className="block" aria-label={`${p.name} 자세히 보기`}>
          {img.kind === 'phone' ? (
            <div className="mx-auto max-w-[260px]">
              <div className="phone">
                <img src={img.src} alt={img.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </div>
            </div>
          ) : (
            <div className="shot">
              <img src={img.src} alt={img.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
            </div>
          )}
        </Link>
      </div>

      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.4rem]">
            <Link to={`/p/${p.slug}`} className="hover:text-green">
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

      <div className="mx-auto max-w-site px-5 sm:px-8">
        {/* 첫 문장 */}
        <section className="pt-20 sm:pt-28">
          <h1 className="text-[2.3rem] font-extrabold leading-[1.15] tracking-[-0.035em] sm:text-[3.3rem] lg:text-[4.1rem]">
            틀리면 안 되는 숫자는
            <br className="hidden sm:block" /> 코드가 계산하고,
            <br /> 말은 AI가 합니다.
          </h1>
          <p className="mt-8 max-w-read text-[18px] leading-[1.75] text-ink-2 sm:text-[19px]">
            소프트웨어 전공 대학교 2학년 박미영입니다. 법 조문, 공식 통계, 모임 기록처럼 틀리면 안 되는 자료를 다루는 AI
            서비스를 만듭니다. 2026년에 공모전과 대회에 내놓은 것들을 모았고, 기획부터 배포까지 대부분 혼자 했습니다.
          </p>
        </section>

        {/* 바깥에서 확인된 결과 */}
        <section aria-label="확인된 결과" className="mt-14 grid border-y border-line sm:grid-cols-3">
          {results.map((r, i) => (
            <Link
              key={i}
              to={r.to}
              className={`group block py-6 sm:px-6 sm:py-7 ${i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : ''} ${i === 0 ? 'sm:pl-0' : ''}`}
            >
              <span className="block text-[1.5rem] font-bold leading-tight tracking-[-0.02em] group-hover:text-green sm:text-[1.65rem]">
                {r.value}
              </span>
              <span className="mt-2 block max-w-[30ch] text-[15px] leading-[1.6] text-ink-2">{r.caption}</span>
            </Link>
          ))}
        </section>
      </div>

      {/* 강점 — 이 사이트에서 유일한 짙은 면 */}
      <section id="strengths" className="mt-24 scroll-mt-0 bg-panel text-panel-ink sm:mt-32">
        <div className="mx-auto max-w-site px-5 py-20 sm:px-8 sm:py-24">
          <header className="max-w-read">
            <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]">강점</h2>
            <p className="mt-3 text-[17px] leading-[1.7] text-panel-ink-2">
              올해 만든 것들에서 반복해서 드러난 네 가지입니다. 각각 아래 프로젝트에서 실제로 한 일을 근거로 붙였습니다.
            </p>
          </header>
          <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
            {strengths.map((s, i) => (
              <article key={i} className="border-t border-panel-line pt-7">
                <h3 className="text-[1.4rem] font-bold leading-snug tracking-[-0.015em] sm:text-[1.55rem]">{s.title}</h3>
                <p className="mt-3 text-[16.5px] leading-[1.75] text-panel-ink-2">{s.text}</p>
                <ul className="mt-6 space-y-4">
                  {s.proof.map((pr, j) => (
                    <li key={j}>
                      <Link to={pr.to} className="group grid gap-x-4 gap-y-0.5 sm:grid-cols-[7.5rem_1fr]">
                        <span className="text-[15px] font-semibold text-panel-accent">{pr.project}</span>
                        <span className="text-[15.5px] leading-[1.65] group-hover:underline group-hover:underline-offset-4">
                          {pr.text}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-site px-5 sm:px-8">
        {/* 만든 것들 */}
        <section id="work" className="mt-24 scroll-mt-10 sm:mt-32">
          <SectionHead title="만든 것들">
            제대로 만들어 내놓은 다섯입니다. 상을 받았거나 지금도 운영 중인 것부터 놓았고, 프로젝트마다 공들인 부분과 그 과정에서
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
            위 다섯을 포함해 올해 한 일입니다. 끝난 것, 안 된 것, 하는 중인 것을 함께 적었습니다.
          </SectionHead>
          <ol className="mt-8 max-w-[52rem]">
            {log.map((e, i) => (
              <li key={i} className="grid gap-x-6 gap-y-1 border-b border-line py-3.5 sm:grid-cols-[9.5rem_1fr]">
                <span className="text-[15px] tabular-nums text-ink-3">{e.when}</span>
                <span className="text-[16px] leading-[1.7]">
                  {e.to ? (
                    <Link to={e.to} className="hover:text-green">
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
              <h2 className="text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.2rem]">일하는 방식</h2>
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
