import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

export default function PublicSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const timerRef = useRef(null)
  const path = router.asPath?.split(/[?#]/)[0] || ''
  const isCatalog = path === '/catalog' || path.startsWith('/catalog/')

  useEffect(() => {
    if (!router.isReady) return
    const queryValue = typeof router.query.q === 'string' ? router.query.q : ''
    setValue(queryValue)
  }, [router.isReady, router.query.q])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const updateCatalogQuery = (term) => {
    if (!isCatalog || !router.isReady) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const query = { ...router.query }
      if (term.trim()) query.q = term.trim()
      else delete query.q
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
    }, 300)
  }

  const submit = (event) => {
    event.preventDefault()
    clearTimeout(timerRef.current)
    const term = value.trim()
    if (!isCatalog) {
      router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : '/catalog')
      setMobileOpen(false)
      return
    }

    const query = { ...router.query }
    if (term) query.q = term
    else delete query.q
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
    setMobileOpen(false)
  }

  const renderInput = () => (
    <input
      type="search"
      aria-label="Buscar productos"
      placeholder="Buscar productos..."
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value
        setValue(nextValue)
        updateCatalogQuery(nextValue)
      }}
      style={{
        width: '100%',
        minWidth: 0,
        padding: '9px 12px',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        background: 'var(--bg-input)',
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
      }}
    />
  )

  return (
    <div className="public-search">
      <form className="public-search-desktop" onSubmit={submit} role="search">
        {renderInput()}
      </form>
      <button
         type="button"
         className="public-search-trigger public-header-action-button"
        aria-label="Buscar productos"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span aria-hidden="true">⌕</span>
      </button>
      {mobileOpen && (
        <form className="public-search-mobile-panel" onSubmit={submit} role="search">
          {renderInput()}
        </form>
      )}
      <style jsx>{`
        .public-search { min-width: 0; }
        .public-search-desktop { width: min(240px, 24vw); }
        .public-search-trigger { display: none; }
        .public-search-mobile-panel { display: none; }
        @media (max-width: 768px) {
          .public-search-desktop { display: none; }
          .public-search-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            padding: 0;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg-section);
            color: var(--text-primary);
            font-size: 1.35rem;
            cursor: pointer;
          }
          .public-search-mobile-panel {
            display: block;
            position: fixed;
            top: 64px;
            left: 12px;
            right: 12px;
            z-index: 1100;
            padding: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.16);
          }
        }
      `}</style>
    </div>
  )
}
