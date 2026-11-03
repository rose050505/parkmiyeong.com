import Seo from '../components/Seo.jsx'
import Blocks from '../components/Blocks.jsx'
import { how } from '../content/how.js'

export default function How() {
  return (
    <main className="mx-auto max-w-site px-5 sm:px-8">
      <Seo title={how.title} description="박미영이 AI 코딩 에이전트와 일하는 방식, 거기서 배운 것, 직접 만든 도구." />
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
