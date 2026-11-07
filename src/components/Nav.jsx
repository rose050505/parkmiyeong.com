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
  // 휴대폰: 윗줄에 이름과 언어 전환, 아랫줄에 섹션 링크를 폭 전체로. 640px 이상: 한 줄.
  return (
    <header className="mx-auto flex w-full max-w-site flex-wrap items-baseline justify-between gap-x-5 gap-y-3 px-5 pt-6 sm:flex-nowrap sm:px-8 sm:pt-8">
      <L to="/" className="order-1 shrink-0 whitespace-nowrap text-[17px] font-bold tracking-tight">
        {t.name}
      </L>
      <nav aria-label={t.navLabel} className="order-3 flex w-full justify-between text-[14.5px] sm:order-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-x-5 sm:text-[15px]">
        {t.nav.map((it) => {
          const active = it.to === '/how' && onHow
          return (
            <L
              key={it.to}
              to={it.to}
              className={`whitespace-nowrap ${active ? 'font-semibold' : idle}`}
              aria-current={active ? 'page' : undefined}
            >
              {it.label}
            </L>
          )
        })}
      </nav>
      <Link
        to={counterpart(pathname, hash, lang)}
        hrefLang={lang === 'en' ? 'ko' : 'en'}
        lang={lang === 'en' ? 'ko' : 'en'}
        aria-label={t.switchAria}
        className={`${idle} order-2 text-[14.5px] font-semibold sm:order-3 sm:text-[15px]`}
      >
        {t.switchLabel}
      </Link>
    </header>
  )
}
