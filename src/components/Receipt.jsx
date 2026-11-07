import { useEffect, useRef, useState } from 'react'
import { L, useUi } from '../i18n.jsx'

// 숫자 하나와 그 숫자가 뜻하는 것. 사이트 전체에서 가장 큰 글자다.
// value가 순수 숫자면 처음 보일 때 한 번 세어 올라간다. (움직임 줄이기 설정이면 바로 보여준다)

function useCountUp(target, enabled) {
  const [shown, setShown] = useState(enabled ? 0 : target)
  const ref = useRef(null)
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const dur = 700
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur)
          const eased = 1 - Math.pow(1 - t, 3)
          setShown(Math.round(target * eased))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, enabled])
  return [shown, ref]
}

export default function Receipt({ value, caption, to, size = 'lg' }) {
  const numeric = typeof value === 'number'
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, ref] = useCountUp(numeric ? value : 0, numeric && !reduce)
  const t = useUi()
  const text = numeric ? shown.toLocaleString(t.numLocale) : value

  // 긴 문자열(7→4→3→2, 233 / 437)은 한 줄에 들어가도록 조금 작게
  const long = String(value).length >= 7
  const sizeCls =
    size === 'lg'
      ? long
        ? 'text-[2.1rem] sm:text-[2.7rem] lg:text-[3rem]'
        : 'text-[2.75rem] sm:text-[3.4rem] lg:text-[3.8rem]'
      : long
        ? 'text-[1.6rem] sm:text-[1.9rem]'
        : 'text-[2rem] sm:text-[2.4rem]'

  const body = (
    <>
      <span ref={ref} className={`num block whitespace-nowrap ${sizeCls}`}>
        {text}
      </span>
      <span className="mt-2.5 block max-w-[22ch] text-[14px] leading-snug text-ink-2">{caption}</span>
    </>
  )

  if (to) {
    return (
      <L to={to} className="group block rounded-sm" aria-label={`${value}, ${caption}`}>
        <span className="block transition-colors group-hover:text-green">{body}</span>
      </L>
    )
  }
  return <div>{body}</div>
}
