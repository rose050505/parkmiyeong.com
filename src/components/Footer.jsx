import { site } from '../content/site.js'
import { useUi } from '../i18n.jsx'

export default function Footer() {
  const t = useUi()
  const src = (label) => (
    <a className="link" href={site.repo} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
  return (
    <footer id="contact" className="mx-auto max-w-site px-5 pb-16 pt-24 sm:px-8">
      <div className="border-t border-line pt-8">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-2xl font-bold tracking-tight">{t.contactTitle}</p>
            <p className="mt-2 max-w-read text-ink-2">{t.contactLead}</p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link" href={`mailto:${site.email}`}>{site.email}</a></li>
              <li><a className="link" href={site.github} target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a className="link" href={site.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            </ul>
          </div>
          <p className="text-sm text-ink-3">
            {t.name} · {site.domain}
            <br />
            {t.builtWith(src)}
          </p>
        </div>
      </div>
    </footer>
  )
}
