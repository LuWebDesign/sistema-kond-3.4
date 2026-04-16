import React from 'react'

// Client-only wrapper: returns null during SSR, and loads the real
// SectionSelector on the client via require to avoid build-time SSR imports.
export default function SectionSelectorClient(props) {
  if (typeof window === 'undefined') return null
  try {
    // require at runtime on the client only
    const SectionSelector = require('./SectionSelector').default
    return <SectionSelector {...props} />
  } catch (e) {
    return null
  }
}
