import { useEffect } from 'react'

type JsonLd = Record<string, unknown> | Record<string, unknown>[]

interface SEOProps {
  title: string
  description: string
  path?: string
  keywords?: string[]
  jsonLd?: JsonLd
  noindex?: boolean
}

const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://www.salonox.com').replace(/\/$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function buildCanonical(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`
}

export default function SEO({ title, description, path = '/', keywords = [], jsonLd, noindex }: SEOProps) {
  useEffect(() => {
    const canonical = buildCanonical(path)
    document.title = title
    setMeta('description', description)
    setMeta('keywords', keywords.join(', '))
    setMeta('robots', noindex ? 'noindex,nofollow' : 'index,follow')
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('og:url', canonical, 'property')
    setMeta('og:image', DEFAULT_IMAGE, 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setLink('canonical', canonical)

    const oldJson = document.head.querySelectorAll('script[data-salonox-jsonld="true"]')
    oldJson.forEach(el => el.remove())

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
      items.forEach(item => {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.dataset.salonoxJsonld = 'true'
        script.textContent = JSON.stringify(item)
        document.head.appendChild(script)
      })
    }
  }, [title, description, path, keywords.join('|'), JSON.stringify(jsonLd), noindex])

  return null
}

