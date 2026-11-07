import Seo from '../components/Seo.jsx'
import { L, useUi } from '../i18n.jsx'

export default function NotFound() {
  const t = useUi()
  return (
    <main className="mx-auto max-w-site px-5 pt-24 sm:px-8">
      <Seo title={t.notFoundTitle} />
      <p className="num text-[4rem]">404</p>
      <p className="mt-4 text-[18px] text-ink-2">{t.notFoundText}</p>
      <p className="mt-6">
        <L to="/" className="link">
          {t.notFoundBack}
        </L>
      </p>
    </main>
  )
}
