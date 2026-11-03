import { Inline } from './Blocks.jsx'

// 공들인 부분. 항목마다 굵은 첫 문장이 주장이고, 뒤 문장이 그 근거다.
export function CraftList({ items, className = '', size = 'md' }) {
  const text = size === 'lg' ? 'text-[17px] leading-[1.8]' : 'text-[16px] leading-[1.75]'
  return (
    <ul className={`craft space-y-4 ${className}`}>
      {items.map((it, i) => (
        <li key={i} className={`border-l-2 border-line pl-4 text-ink-2 ${text}`}>
          <Inline text={it} />
        </li>
      ))}
    </ul>
  )
}

// 키운 능력. 짧은 명사구 목록.
export function SkillList({ items, className = '', cols = 2 }) {
  return (
    <ul className={`grid gap-x-8 gap-y-2 ${cols === 2 ? 'sm:grid-cols-2' : ''} ${className}`}>
      {items.map((s, i) => (
        <li key={i} className="skill relative pl-5 text-[15.5px] leading-[1.6]">
          {s}
        </li>
      ))}
    </ul>
  )
}
