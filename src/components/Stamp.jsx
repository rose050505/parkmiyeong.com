// 상태 표시. 색은 뜻을 가진다 — 수상은 금색, 운영 중·제출은 초록, 폐기·미달은 적갈색, 예정은 회색.
const tone = {
  award: 'border-gold text-gold',
  live: 'border-green text-green',
  done: 'border-ink-2 text-ink-2',
  wip: 'border-green text-green',
  lost: 'border-rust text-rust',
  planned: 'border-ink-3 text-ink-3',
}

export default function Stamp({ kind = 'done', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium leading-5 ${tone[kind] || tone.done} ${className}`}
    >
      {children}
    </span>
  )
}
