import { useEffect } from 'react'
import { useUi } from '../i18n.jsx'

export default function Seo({ title, description }) {
  const t = useUi()
  useEffect(() => {
    document.title = title ? `${title}${t.titleSuffix}` : t.siteTitle
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description, t])
  return null
}
