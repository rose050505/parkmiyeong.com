import { useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import Stamp from '../components/Stamp.jsx'
import Receipt from '../components/Receipt.jsx'
import Figure from '../components/Figure.jsx'
import Blocks from '../components/Blocks.jsx'
import { CraftList, SkillList } from '../components/Craft.jsx'
import NotFound from './NotFound.jsx'
import { useContent } from '../content/index.js'
import { L, useUi } from '../i18n.jsx'

export default function Project() {
  const { slug } = useParams()
  const { projects, bySlug } = useContent()
  const t = useUi()
  const p = bySlug[slug]
  if (!p) return <NotFound />
  const idx = projects.findIndex((x) => x.slug === slug)
  const prev = projects[idx - 1]
  const next = projects[idx + 1]

  return (
    <main className="mx-auto max-w-site px-5 sm:px-8">
      <Seo title={p.name} description={p.oneLiner} />

      <p className="pt-10 text-[15px]">
        <L to="/#work" className="text-ink-3 hover:text-ink">
          {t.backToWork}
        </L>
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
          <div><dt className="text-ink-3">{t.facts.period}</dt><dd>{p.period}</dd></div>
          <div><dt className="text-ink-3">{t.facts.venue}</dt><dd>{p.venue}</dd></div>
          <div><dt className="text-ink-3">{t.facts.result}</dt><dd>{p.result}</dd></div>
          <div><dt className="text-ink-3">{t.facts.role}</dt><dd>{p.role}</dd></div>
          <div><dt className="text-ink-3">{t.facts.stack}</dt><dd>{p.stack}</dd></div>
        </dl>
      </header>

      <div style={p.tint ? { '--tint': p.tint } : undefined}>
        <Figure kind={p.hero.kind} images={p.hero.images} caption={p.hero.caption} maxW={p.hero.maxW} className="mt-14" />
      </div>

      <section className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <h2 className="text-[1.55rem] font-bold tracking-tight">{t.craftTitle}</h2>
          <CraftList items={p.craft} size="lg" className="mt-6" />
        </div>
        <aside className="lg:col-span-5 lg:border-l lg:border-line lg:pl-12">
          <h2 className="text-[1.55rem] font-bold tracking-tight">{t.skillsTitle}</h2>
          <SkillList items={p.skills} cols={1} className="mt-6" />
          <h3 className="subhead mt-12">{t.receiptsTitle}</h3>
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

      <nav aria-label={t.otherProjects} className="mt-24 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          {prev && (
            <L to={`/p/${prev.slug}`} className="group block">
              <span className="block text-[14px] text-ink-3">{t.prev}</span>
              <span className="block text-[20px] font-semibold group-hover:text-accent">{prev.name}</span>
            </L>
          )}
        </div>
        <div className="sm:text-right">
          {next && (
            <L to={`/p/${next.slug}`} className="group block">
              <span className="block text-[14px] text-ink-3">{t.next}</span>
              <span className="block text-[20px] font-semibold group-hover:text-accent">{next.name}</span>
            </L>
          )}
        </div>
      </nav>
    </main>
  )
}
