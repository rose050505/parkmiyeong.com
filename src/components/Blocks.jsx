import Figure from './Figure.jsx'
import Receipt from './Receipt.jsx'

// **굵게** 만 지원하는 아주 작은 인라인 처리
export function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  )
}

export default function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'h':
        return (
          <h2 key={i} id={b.id} className="mt-14 text-[1.55rem] font-bold tracking-tight first:mt-0">
            {b.text}
          </h2>
        )
      case 'p':
        return (
          <p key={i} className="mt-4 text-[17px] leading-[1.8] text-ink-2">
            <Inline text={b.text} />
          </p>
        )
      case 'lead':
        return (
          <p key={i} className="mt-4 text-[19px] leading-[1.7]">
            <Inline text={b.text} />
          </p>
        )
      case 'list':
        return (
          <ul key={i} className="mt-4 list-disc space-y-1.5 pl-5 text-[17px] leading-[1.75] text-ink-2 marker:text-ink-3">
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} />
              </li>
            ))}
          </ul>
        )
      case 'quote':
        return (
          <blockquote key={i} className="pull mt-7">
            <p className="text-[19px] font-medium leading-[1.6]">
              <Inline text={b.text} />
            </p>
            {b.cite && <cite className="mt-2 block text-[14px] not-italic text-ink-3">{b.cite}</cite>}
          </blockquote>
        )
      case 'facts':
        return (
          <dl key={i} className="facts mt-6 text-[16px]">
            {b.rows.map(([k, v], j) => (
              <div key={j}>
                <dt className="text-ink-3">{k}</dt>
                <dd>
                  <Inline text={v} />
                </dd>
              </div>
            ))}
          </dl>
        )
      case 'receipts':
        return (
          <div key={i} className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {b.items.map((r, j) => (
              <Receipt key={j} value={r.value} caption={r.caption} size="sm" />
            ))}
          </div>
        )
      case 'figure':
        return <Figure key={i} kind={b.kind} images={b.images} caption={b.caption} className="mt-8" />
      case 'links':
        return (
          <ul key={i} className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[16px]">
            {b.items.map((l, j) => (
              <li key={j}>
                <a className="link" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )
      default:
        return null
    }
  })
}
