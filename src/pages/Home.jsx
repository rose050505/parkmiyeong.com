import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import Receipt from '../components/Receipt.jsx'
import Stamp from '../components/Stamp.jsx'
import { projects } from '../content/projects.js'
import { wall, log } from '../content/home.js'

function WorkEntry({ p, index }) {
  const flip = index % 2 === 1
  const img = p.card.image
  return (
    <article className="grid items-center gap-8 border-t border-line py-12 sm:py-16 lg:grid-cols-12 lg:gap-12">
      <div className={`lg:col-span-6 ${flip ? 'lg:order-2' : ''}`}>
        <Link to={`/p/${p.slug}`} className="block" aria-label={`${p.name} 자세히 보기`}>
          {img.kind === 'phone' ? (
            <div className="mx-auto max-w-[280px]">
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
      <div className={`lg:col-span-6 ${flip ? 'lg:order-1' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.4rem]">
            <Link to={`/p/${p.slug}`} className="hover:text-green">
              {p.name}
            </Link>
          </h3>
          <Stamp kind={p.status.kind}>{p.status.label}</Stamp>
        </div>
        <p className="mt-2 text-[15px] text-ink-3">{p.venue}</p>
        <p className="mt-5 text-[18px] leading-[1.7]">{p.oneLiner}</p>
        <p className="mt-3 text-[16px] leading-[1.75] text-ink-2">{p.card.claim}</p>
        <div className="mt-7 grid grid-cols-2 gap-6">
          {p.card.receipts.map((r, i) => (
            <Receipt key={i} value={r.value} caption={r.caption} size="sm" />
          ))}
        </div>
        <p className="mt-7">
          <Link to={`/p/${p.slug}`} className="link text-[16px] font-medium">
            자세히 읽기
          </Link>
        </p>
      </div>
    </article>
  )
}

export default function Home() {
  return (
    <main className="mx-auto max-w-site px-5 sm:px-8">
      <Seo />

      {/* 첫 문장 */}
      <section className="pt-20 sm:pt-28">
        <h1 className="max-w-[18ch] text-[2.4rem] font-extrabold leading-[1.12] tracking-[-0.03em] sm:text-[3.4rem] lg:text-[4.2rem]">
          틀리면 안 되는 숫자는 코드가 계산하고, 말은 AI가 합니다.
        </h1>
        <p className="mt-8 max-w-read text-[18px] leading-[1.75] text-ink-2 sm:text-[19px]">
          소프트웨어 전공 대학교 2학년 박미영입니다. 2026년에 만들어 내놓은 것들과, 그걸 만든 방식을 적어 둔 곳입니다.
          공모전에 내고, 배포하고, 밤새 돌리고, 아침에 검산합니다. 아래 숫자들은 전부 실제로 잰 값이고, 누르면 그 숫자가 나온
          자리로 갑니다.
        </p>
      </section>

      {/* 숫자 벽 */}
      <section aria-label="실측값" className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 sm:mt-20 lg:grid-cols-4 lg:gap-x-10">
        {wall.map((r, i) => (
          <Receipt key={i} value={r.value} caption={r.caption} to={r.to} />
        ))}
      </section>

      {/* 만든 것들 */}
      <section id="work" className="mt-28 scroll-mt-10 sm:mt-36">
        <h2 className="text-[1.3rem] font-semibold tracking-tight text-ink-2">만든 것들</h2>
        <p className="mt-1 max-w-read text-[16px] text-ink-3">
          제대로 만들어 내놓은 다섯. 최근 것부터.
        </p>
        <div className="mt-6">
          {projects.map((p, i) => (
            <WorkEntry key={p.slug} p={p} index={i} />
          ))}
        </div>
      </section>

      {/* 2026 기록 */}
      <section id="log" className="mt-20 scroll-mt-10 border-t border-line pt-10 sm:mt-28">
        <h2 className="text-[1.3rem] font-semibold tracking-tight text-ink-2">2026년 기록</h2>
        <p className="mt-1 max-w-read text-[16px] text-ink-3">
          위 다섯을 포함해 올해 한 일. 끝난 것, 안 된 것, 하는 중인 것.
        </p>
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
      <section className="mt-20 border-t border-line pt-10 sm:mt-28">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="text-[1.3rem] font-semibold tracking-tight text-ink-2">일하는 방식</h2>
            <p className="mt-4 text-[18px] leading-[1.75]">
              혼자 하지만 혼자 하지 않습니다. 노트북의 Claude Code, 클라우드의 총괄 세션, 검토와 야간 실행을 맡는 Codex가 한
              팀이고, 저는 성공 기준과 검증 세트와 최종 선택을 쥡니다. 10월에는 제가 에이전트와 일해 온 방식을 로그 숫자로 진단해서
              운영 방식을 바꿨습니다. 할 일 보드와 GPU 과금 감시기처럼 그 과정에서 직접 만든 도구도 있습니다.
            </p>
            <p className="mt-6">
              <Link to="/how" className="link text-[16px] font-medium">
                어떻게 일하는지 읽기
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:col-span-5">
            <Receipt value={25838} caption="한 대회 열흘 동안 에이전트가 실행한 셸 명령" size="sm" to="/how" />
            <Receipt value="233 / 437" caption="할 일 보드 저장소 커밋 중 에이전트가 함께 쓴 수" size="sm" to="/how#tools" />
          </div>
        </div>
      </section>
    </main>
  )
}
