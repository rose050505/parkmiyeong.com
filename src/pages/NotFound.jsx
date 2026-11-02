import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-site px-5 pt-24 sm:px-8">
      <Seo title="없는 페이지" />
      <p className="num text-[4rem]">404</p>
      <p className="mt-4 text-[18px] text-ink-2">이 주소에는 아무것도 없습니다.</p>
      <p className="mt-6">
        <Link to="/" className="link">
          첫 화면으로
        </Link>
      </p>
    </main>
  )
}
