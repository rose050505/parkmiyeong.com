import { Link, useLocation } from 'react-router-dom'
import { L, counterpart, useLang, useUi } from '../i18n.jsx'

// tone="hero": 첫 화면의 남색 띠 위에 얹힐 때
export default function Nav({ tone = 'paper' }) {
  const { pathname, hash } = useLocation()
  const lang = useLang()
  const t = useUi()
  const hero = tone === 'hero'
  const idle = hero ? 'text-hero-ink-2 hover:text-hero-ink' : 'text-ink-2 hover:text-ink'
  const onHow = pathname === '/how' || pathname === '/en/how'
  return (
    <header className="mx-auto flex max-w-site items-baseline justify-between gap-6 px-5 pt-6 sm:px-8 sm:pt-8">
      <L to="/" className="shrink-0 whitespace-nowrap text-[17px] font-bold tracking-tight">
        {t.name}
      </L>
      <nav aria-label={t.navLabel} className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[14.5px] sm:gap-x-5 sm:text-[15px]">
        {t.nav.map((it) => {
          const active = it.to === '/how' && onHow
          return (
            <L
              key={it.to}
              to={it.to}
              className={active ? 'font-semibold' : idle}
              aria-current={active ? 'page' : undefined}
            >
              {it.label}
            </L>
          )
        })}
        <Link
          to={counterpart(pathname, hash, lang)}
          hrefLang={lang === 'en' ? 'ko' : 'en'}
          lang={lang === 'en' ? 'ko' : 'en'}
          aria-label={t.switchAria}
          className={`${idle} font-semibold`}
        >
          {t.switchLabel}
        </Link>
      </nav>
    </header>
  )
}
