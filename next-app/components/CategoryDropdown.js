// next-app/components/CategoryDropdown.js
// Category selector with flyout subcategories (desktop) and accordion (mobile).
// No emojis. Purely inline-styled to match the catalog's design system.

import { useState, useEffect, useRef } from 'react'

/**
 * @param {string[]} categories          - Root category names (from useProducts)
 * @param {object[]} categoriasAPI       - Full category objects { id, nombre, slug, parent_id, activa, orden }
 * @param {string}   selectedCategory    - Currently selected root category name
 * @param {number|null} selectedSubcategoryId - Currently selected subcategory ID (client-only)
 * @param {function} onSelectCategory    - (catName: string) => void — root category selected
 * @param {function} onSelectSubcategory - (subcatId: number, catName: string) => void
 * @param {function} onClear             - () => void — reset to "all"
 */
export default function CategoryDropdown({
  categories = [],
  categoriasAPI = [],
  selectedCategory = '',
  selectedSubcategoryId = null,
  onSelectCategory,
  onSelectSubcategory,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredRoot, setHoveredRoot] = useState(null)   // index — desktop flyout
  const [expandedRoot, setExpandedRoot] = useState(null) // index — mobile accordion
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef(null)
  // Grace period for desktop flyout: prevents flyout closing while cursor
  // moves from the row to the subpanel (brief gap between both elements).
  const flyoutCloseTimerRef = useRef(null)

  // Detect viewport size (SSR-safe: starts false, updates on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeAll()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Build category tree from flat list
  const tree = categories.map(catName => {
    const apiObj = categoriasAPI.find(c => c.nombre === catName && c.parent_id === null)
    const children = apiObj
      ? categoriasAPI
          .filter(c => c.parent_id === apiObj.id && c.activa !== false)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      : []
    return { name: catName, apiObj, children }
  })

  // Resolve label for the trigger button
  let displayLabel = 'Todas las categorías'
  if (selectedSubcategoryId) {
    const sub = categoriasAPI.find(c => c.id === selectedSubcategoryId)
    if (sub) {
      const parent = sub.parent_id ? categoriasAPI.find(c => c.id === sub.parent_id) : null
      displayLabel = parent ? `${parent.nombre} › ${sub.nombre}` : sub.nombre
    }
  } else if (selectedCategory) {
    displayLabel = selectedCategory
  }

  const closeAll = () => {
    setIsOpen(false)
    setHoveredRoot(null)
    setExpandedRoot(null)
  }

  // Desktop flyout helpers — open immediately, close with grace period so the
  // cursor can travel from the row to the subpanel without the flyout blinking.
  const openFlyout = (idx) => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current)
      flyoutCloseTimerRef.current = null
    }
    setHoveredRoot(idx)
  }

  const scheduleFlyoutClose = () => {
    flyoutCloseTimerRef.current = setTimeout(() => {
      setHoveredRoot(null)
    }, 150)
  }

  const handleSelectRoot = (catName) => {
    onSelectCategory && onSelectCategory(catName)
    closeAll()
  }

  const handleSelectSub = (subcatId, catName) => {
    onSelectSubcategory && onSelectSubcategory(subcatId, catName)
    closeAll()
  }

  const handleClear = () => {
    onClear && onClear()
    closeAll()
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const hoveredBg = 'var(--bg-hover, rgba(0,0,0,0.06))'
  const activeBg = 'var(--accent-blue)'

  const itemBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    userSelect: 'none',
    transition: 'background 0.15s',
  }

  const getItemStyle = (isActive) => ({
    ...itemBase,
    background: isActive ? activeBg : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
  })

  // NOTE: overflow must be 'visible' (not 'hidden') so the absolutely-positioned
  // flyout subpanel is not clipped when it extends beyond the panel bounds.
  const panelStyle = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    zIndex: 1000,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    minWidth: '220px',
    overflow: 'visible',  // MUST be visible — 'hidden' would clip the flyout subpanel
  }

  const subPanelStyle = {
    position: 'absolute',
    top: 0,
    left: '100%',
    marginLeft: '4px',   // small gap so border doesn't overlap
    zIndex: 1001,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    minWidth: '200px',
    overflow: 'hidden',
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          padding: '12px 16px',
          border: '2px solid var(--border-color)',
          borderRadius: '12px',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          fontWeight: '500',
          minWidth: '200px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-blue)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <span style={{ fontSize: '0.7rem', flexShrink: 0, opacity: 0.7 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div style={panelStyle}>

          {/* "Todas las categorías" — clear option */}
          <div
            style={{
              ...getItemStyle(!selectedCategory && !selectedSubcategoryId),
              borderBottom: '1px solid var(--border-color)',
              borderRadius: '12px 12px 0 0',
            }}
            onClick={handleClear}
            onMouseEnter={(e) => {
              if (selectedCategory || selectedSubcategoryId)
                e.currentTarget.style.background = hoveredBg
            }}
            onMouseLeave={(e) => {
              if (selectedCategory || selectedSubcategoryId)
                e.currentTarget.style.background = 'transparent'
            }}
          >
            Todas las categorías
          </div>

          {/* Root category items */}
          {tree.map((node, idx) => {
            const isRootActive = selectedCategory === node.name && !selectedSubcategoryId
            const hasChildren = node.children.length > 0
            const isLast = idx === tree.length - 1

            // ── No children: simple selectable row ────────────────────────
            if (!hasChildren) {
              return (
                <div
                  key={node.name}
                  style={{
                    ...getItemStyle(isRootActive),
                    borderRadius: isLast ? '0 0 12px 12px' : 0,
                  }}
                  onClick={() => handleSelectRoot(node.name)}
                  onMouseEnter={(e) => {
                    if (!isRootActive) e.currentTarget.style.background = hoveredBg
                  }}
                  onMouseLeave={(e) => {
                    if (!isRootActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {node.name}
                </div>
              )
            }

            // ── Desktop: flyout submenu on hover ───────────────────────────
            if (!isMobile) {
              return (
                <div
                  key={node.name}
                  style={{
                    position: 'relative',
                    borderRadius: isLast ? '0 0 12px 12px' : 0,
                  }}
                  onMouseEnter={() => openFlyout(idx)}
                  onMouseLeave={scheduleFlyoutClose}
                >
                  {/* Root row */}
                  <div
                    style={{
                      ...getItemStyle(isRootActive),
                      background: hoveredRoot === idx && !isRootActive
                        ? hoveredBg
                        : isRootActive ? activeBg : 'transparent',
                      color: isRootActive ? 'white' : 'var(--text-primary)',
                      borderRadius: isLast && hoveredRoot !== idx ? '0 0 12px 12px' : 0,
                    }}
                    onClick={() => handleSelectRoot(node.name)}
                  >
                    <span>{node.name}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>▶</span>
                  </div>

                  {/* Flyout submenu — only visible when this row is hovered */}
                  {hoveredRoot === idx && (
                    <div
                      style={subPanelStyle}
                      onMouseEnter={() => openFlyout(idx)}
                      onMouseLeave={scheduleFlyoutClose}
                    >
                      {/* "Todos en X" */}
                      <div
                        style={{
                          ...getItemStyle(isRootActive),
                          borderBottom: '1px solid var(--border-color)',
                          fontStyle: 'italic',
                          borderRadius: '12px 12px 0 0',
                        }}
                        onClick={() => handleSelectRoot(node.name)}
                        onMouseEnter={(e) => {
                          if (!isRootActive) e.currentTarget.style.background = hoveredBg
                        }}
                        onMouseLeave={(e) => {
                          if (!isRootActive) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        Todos en {node.name}
                      </div>

                      {node.children.map((child, childIdx) => {
                        const isSubActive = selectedSubcategoryId === child.id
                        const isLastChild = childIdx === node.children.length - 1
                        return (
                          <div
                            key={child.id}
                            style={{
                              ...getItemStyle(isSubActive),
                              borderRadius: isLastChild ? '0 0 12px 12px' : 0,
                            }}
                            onClick={() => handleSelectSub(child.id, node.name)}
                            onMouseEnter={(e) => {
                              if (!isSubActive) e.currentTarget.style.background = hoveredBg
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubActive) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {child.nombre}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // ── Mobile: accordion ──────────────────────────────────────────
            const isExpanded = expandedRoot === idx
            return (
              <div key={node.name}>
                <div
                  style={{
                    ...getItemStyle(isRootActive),
                    borderRadius: isLast && !isExpanded ? '0 0 12px 12px' : 0,
                  }}
                  onClick={() => setExpandedRoot(isExpanded ? null : idx)}
                  onMouseEnter={(e) => {
                    if (!isRootActive) e.currentTarget.style.background = hoveredBg
                  }}
                  onMouseLeave={(e) => {
                    if (!isRootActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span>{node.name}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      opacity: 0.6,
                      display: 'inline-block',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ▶
                  </span>
                </div>

                {/* Accordion children */}
                {isExpanded && (
                  <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.03))' }}>
                    {/* "Todos en X" */}
                    <div
                      style={{
                        ...getItemStyle(isRootActive),
                        paddingLeft: '28px',
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                      onClick={() => handleSelectRoot(node.name)}
                      onMouseEnter={(e) => {
                        if (!isRootActive) e.currentTarget.style.background = hoveredBg
                      }}
                      onMouseLeave={(e) => {
                        if (!isRootActive) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      Todos en {node.name}
                    </div>

                    {node.children.map((child, childIdx) => {
                      const isSubActive = selectedSubcategoryId === child.id
                      const isLastChild = isLast && childIdx === node.children.length - 1
                      return (
                        <div
                          key={child.id}
                          style={{
                            ...getItemStyle(isSubActive),
                            paddingLeft: '28px',
                            fontSize: '0.9rem',
                            borderRadius: isLastChild ? '0 0 12px 12px' : 0,
                          }}
                          onClick={() => handleSelectSub(child.id, node.name)}
                          onMouseEnter={(e) => {
                            if (!isSubActive) e.currentTarget.style.background = hoveredBg
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {child.nombre}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
