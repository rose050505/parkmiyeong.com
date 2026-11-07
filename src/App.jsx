import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import How from './pages/How.jsx'
import Project from './pages/Project.jsx'
import NotFound from './pages/NotFound.jsx'
import { langOf } from './i18n.jsx'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

// <html lang> 을 주소의 언어에 맞춘다 (화면 낭독기, 번역 제안, 글꼴 대체에 쓰인다)
function LangManager() {
  const { pathname } = useLocation()
  const lang = langOf(pathname)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return null
}

function TopNav() {
  const { pathname } = useLocation()
  return pathname === '/' || pathname === '/en' || pathname === '/en/' ? null : <Nav />
}

export default function App() {
  return (
    <div className="min-h-screen">
      <ScrollManager />
      <LangManager />
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how" element={<How />} />
        <Route path="/p/:slug" element={<Project />} />
        <Route path="/en" element={<Home />} />
        <Route path="/en/how" element={<How />} />
        <Route path="/en/p/:slug" element={<Project />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  )
}
