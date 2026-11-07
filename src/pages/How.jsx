import Seo from '../components/Seo.jsx'
import Blocks from '../components/Blocks.jsx'
import { useContent } from '../content/index.js'
import { useUi } from '../i18n.jsx'

export default function How() {
  const { how } = useContent()
  const t = useUi()
  return (
    <main className="mx-auto max-w-site px-5 sm:px-8">
      <Seo title={how.title} description={t.howDescription} />
      <header className="pt-16 sm:pt-24">
        <h1 className="text-[2.4rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[3.4rem]">{how.title}</h1>
        <p className="mt-6 max-w-read text-[18px] leading-[1.75] sm:text-[19px]">{how.lead}</p>
      </header>

      <article className="mt-16 max-w-read">
        <Blocks blocks={how.blocks} />
      </article>
    </main>
  )
}
