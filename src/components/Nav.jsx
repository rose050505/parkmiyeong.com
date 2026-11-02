import { Link, useLocation } from 'react-router-dom'

const items = [
  { label: '만든 것들', to: '/#work' },
  { label: '2026 기록', to: '/#log' },
  { label: '일하는 방식', to: '/how' },
  { label: '연락', to: '/#contact' },
]

export default function Nav() {
  const { pathname } = useLocation()
  return (
    <header className="mx-auto flex max-w-site items-baseline justify-between gap-6 px-5 pt-6 sm:px-8 sm:pt-8">
      <Link to="/" className="text-[17px] font-bold tracking-tight">
        박미영
      </Link>
      <nav aria-label="주요" className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-[15px]">
        {items.map((it) => {
          const active = it.to === '/how' && pathname === '/how'
          return (
            <Link
              key={it.to}
              to={it.to}
              className={active ? 'font-semibold' : 'text-ink-2 hover:text-ink'}
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
