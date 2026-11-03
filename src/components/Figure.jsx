// 이미지. kind: 'wide'(그림·화면 전체) | 'phone'(세로 스크린샷 한 장) | 'phones'(세로 스크린샷 두 장)
// 모두 연보라 판(.frame) 위에 얹는다. 휴대폰 두 장은 높이가 달라도 각자 제 높이만 차지한다.
export default function Figure({ kind = 'wide', images, caption, className = '' }) {
  const list = Array.isArray(images) ? images : [images]
  return (
    <figure className={className}>
      <div className="frame">
        {kind === 'wide' && (
          <div className="shot">
            <img src={list[0].src} alt={list[0].alt || ''} loading="lazy" decoding="async" />
          </div>
        )}
        {kind === 'phone' && (
          <div className="mx-auto max-w-[280px]">
            <div className="phone">
              <img src={list[0].src} alt={list[0].alt || ''} loading="lazy" decoding="async" />
            </div>
          </div>
        )}
        {kind === 'phones' && (
          <div className="mx-auto flex max-w-[620px] items-start justify-center gap-4 sm:gap-7">
            {list.map((im) => (
              <div key={im.src} className="phone w-1/2">
                <img src={im.src} alt={im.alt || ''} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-[14px] leading-snug text-ink-3">{caption}</figcaption>
      )}
    </figure>
  )
}
