// 상태 표시. 색은 뜻을 가진다 — 수상은 호박색, 운영 중·매일 사용·진행 중은 보라, 출품은 회색, 폐기·미달은 적색, 예정은 옅은 회색.
const tone = {
  award: 'bg-gold/10 text-gold ring-gold/30',
  live: 'bg-accent-soft text-accent ring-accent/25',
  wip: 'bg-accent-soft text-accent ring-accent/25',
  done: 'bg-paper-2 text-ink-2 ring-line',
  lost: 'bg-rust/10 text-rust ring-rust/30',
  planned: 'bg-transparent text-ink-3 ring-line',
}

export default function Stamp({ kind = 'done', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-5 ring-1 ring-inset ${tone[kind] || tone.done} ${className}`}
    >
      {children}
    </span>
  )
}
