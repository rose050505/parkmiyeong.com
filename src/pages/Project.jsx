import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import Stamp from '../components/Stamp.jsx'
import Receipt from '../components/Receipt.jsx'
import Figure from '../components/Figure.jsx'
import Blocks from '../components/Blocks.jsx'
import { CraftList, SkillList } from '../components/Craft.jsx'
import NotFound from './NotFound.jsx'
import { projects, bySlug } from '../content/projects.js'

export default function Project() {
  const { slug } = useParams()
  const p = bySlug[slug]
  if (!p) return <NotFound />
  const idx = projects.findIndex((x) => x.slug === slug)
  const prev = projects[idx - 1]
  const next = projects[idx + 1]

  return (
    <main className="mx-auto max-w-site px-5 sm:px-8">
      <Seo title={p.name} description={p.oneLiner} />

      <p className="pt-10 text-[15px]">
        <Link to="/#work" className="text-ink-3 hover:text-ink">
          ← 만든 것들
        </Link>
      </p>

      <header className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.6rem]">{p.name}</h1>
            <Stamp kind={p.status.kind}>{p.status.label}</Stamp>
          </div>
          <p className="mt-6 max-w-read text-[19px] leading-[1.7]">{p.oneLiner}</p>
          {p.links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-[16px]">
              {p.links.map((l) => (
                <li key={l.href}>
                  <a className="link font-medium" href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <dl className="facts self-end text-[15px] lg:col-span-5">
          <div><dt className="text-ink-3">언제</dt><dd>{p.period}</dd></div>
          <div><dt className="text-ink-3">어디에</dt><dd>{p.venue}</dd></div>
          <div><dt className="text-ink-3">결과</dt><dd>{p.result}</dd></div>
          <div><dt className="text-ink-3">역할</dt><dd>{p.role}</dd></div>
          <div><dt className="text-ink-3">만든 재료</dt><dd>{p.stack}</dd></div>
        </dl>
      </header>

      <Figure kind={p.hero.kind} images={p.hero.images} caption={p.hero.caption} className="mt-14" />

      <section className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <h2 className="text-[1.55rem] font-bold tracking-tight">공들인 부분</h2>
          <CraftList items={p.craft} size="lg" className="mt-6" />
        </div>
        <aside className="lg:col-span-5 lg:border-l lg:border-line lg:pl-12">
          <h2 className="text-[1.55rem] font-bold tracking-tight">이 프로젝트로 키운 능력</h2>
          <SkillList items={p.skills} cols={1} className="mt-6" />
          <h3 className="subhead mt-12">숫자로 보면</h3>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8">
            {p.receipts.map((r, i) => (
              <Receipt key={i} value={r.value} caption={r.caption} size="sm" />
            ))}
          </div>
        </aside>
      </section>

      <article className="mt-20 max-w-read border-t border-line pt-14">
        <Blocks blocks={p.body} />
      </article>

      <nav aria-label="다른 프로젝트" className="mt-24 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          {prev && (
            <Link to={`/p/${prev.slug}`} className="group block">
              <span className="block text-[14px] text-ink-3">이전</span>
              <span className="block text-[20px] font-semibold group-hover:text-green">{prev.name}</span>
            </Link>
          )}
        </div>
        <div className="sm:text-right">
          {next && (
            <Link to={`/p/${next.slug}`} className="group block">
              <span className="block text-[14px] text-ink-3">다음</span>
              <span className="block text-[20px] font-semibold group-hover:text-green">{next.name}</span>
            </Link>
          )}
        </div>
      </nav>
    </main>
  )
}
