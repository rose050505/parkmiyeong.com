import { Link, useLocation } from 'react-router-dom'

const items = [
  { label: '강점', to: '/#strengths' },
  { label: '만든 것들', to: '/#work' },
  { label: '2026 기록', to: '/#log' },
  { label: '일하는 방식', to: '/how' },
  { label: '연락', to: '/#contact' },
]

// tone="hero": 첫 화면의 남색 띠 위에 얹힐 때
export default function Nav({ tone = 'paper' }) {
  const { pathname } = useLocation()
  const hero = tone === 'hero'
  const idle = hero ? 'text-hero-ink-2 hover:text-hero-ink' : 'text-ink-2 hover:text-ink'
  return (
    <header className="mx-auto flex max-w-site items-baseline justify-between gap-6 px-5 pt-6 sm:px-8 sm:pt-8">
      <Link to="/" className="shrink-0 whitespace-nowrap text-[17px] font-bold tracking-tight">
        박미영
      </Link>
      <nav aria-label="주요" className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[14.5px] sm:gap-x-5 sm:text-[15px]">
        {items.map((it) => {
          const active = it.to === '/how' && pathname === '/how'
          return (
            <Link
              key={it.to}
              to={it.to}
              className={active ? 'font-semibold' : idle}
              aria-current={active ? 'page' : undefined}
            >
              {it.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
