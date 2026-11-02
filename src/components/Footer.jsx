import { site } from '../content/site.js'

export default function Footer() {
  return (
    <footer id="contact" className="mx-auto max-w-site px-5 pb-16 pt-24 sm:px-8">
      <div className="border-t border-line pt-8">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-2xl font-bold tracking-tight">연락</p>
            <p className="mt-2 max-w-read text-ink-2">
              함께 만들 일, 물어볼 것, 틀린 곳을 발견했을 때. 메일이 가장 빠릅니다.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link" href={`mailto:${site.email}`}>{site.email}</a></li>
              <li><a className="link" href={site.github} target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a className="link" href={site.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            </ul>
          </div>
          <p className="text-sm text-ink-3">
            {site.name} · {site.domain}
            <br />
            이 사이트도 코딩 에이전트와 함께 만들었고,{' '}
            <a className="link" href={site.repo} target="_blank" rel="noreferrer">소스</a>를 공개해 둡니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
