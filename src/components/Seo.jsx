import { useEffect } from 'react'

export default function Seo({ title, description }) {
  useEffect(() => {
    document.title = title ? `${title} — 박미영` : '박미영 — 만든 것들'
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description])
  return null
}
