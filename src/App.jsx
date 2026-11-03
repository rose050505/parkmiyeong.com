import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import How from './pages/How.jsx'
import Project from './pages/Project.jsx'
import NotFound from './pages/NotFound.jsx'

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

function TopNav() {
  const { pathname } = useLocation()
  return pathname === '/' ? null : <Nav />
}

export default function App() {
  return (
    <div className="min-h-screen">
      <ScrollManager />
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how" element={<How />} />
        <Route path="/p/:slug" element={<Project />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  )
}
