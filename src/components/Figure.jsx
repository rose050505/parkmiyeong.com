// 이미지. kind: 'wide'(그림·화면 전체) | 'phone'(세로 스크린샷 한 장) | 'phones'(세로 스크린샷 두 장)
export default function Figure({ kind = 'wide', images, caption, className = '' }) {
  const list = Array.isArray(images) ? images : [images]
  return (
    <figure className={className}>
      {kind === 'wide' && (
        <div className="shot">
          <img src={list[0].src} alt={list[0].alt || ''} loading="lazy" decoding="async" />
        </div>
      )}
      {kind === 'phone' && (
        <div className="mx-auto max-w-[300px]">
          <div className="phone">
            <img src={list[0].src} alt={list[0].alt || ''} loading="lazy" decoding="async" />
          </div>
        </div>
      )}
      {kind === 'phones' && (
        <div className="mx-auto grid max-w-[640px] grid-cols-2 items-start gap-4 sm:gap-6">
          {list.map((im) => (
            <div key={im.src} className="phone">
              <img src={im.src} alt={im.alt || ''} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      )}
      {caption && (
        <figcaption className="mt-2.5 text-[14px] leading-snug text-ink-3">{caption}</figcaption>
      )}
    </figure>
  )
}
