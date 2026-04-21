// Shim to read/write user from localStorage with compatibility between keys
export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const current = localStorage.getItem('currentUser')
    const kond = localStorage.getItem('kond-user')
    const raw = current || kond
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // normalize
    return {
      id: parsed.id || parsed.userId || null,
      email: parsed.email || parsed.mail || '',
      username: parsed.username || parsed.user_name || parsed.nombre || '',
      nombre: parsed.nombre || parsed.name || '',
      apellido: parsed.apellido || parsed.lastName || '',
      rol: parsed.rol || parsed.role || 'usuario',
      avatar: parsed.avatar || parsed.photo || null,
      ...parsed
    }
  } catch (e) {
    // swallow and return null
    return null
  }
}

export function setUser(user) {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify(user)
    localStorage.setItem('currentUser', payload)
    localStorage.setItem('kond-user', payload)
  } catch (e) {
    // ignore storage errors
  }
}

export function migrateIfNeeded() {
  if (typeof window === 'undefined') return
  try {
    const current = localStorage.getItem('currentUser')
    const kond = localStorage.getItem('kond-user')
    if (current && !kond) {
      localStorage.setItem('kond-user', current)
    } else if (kond && !current) {
      localStorage.setItem('currentUser', kond)
    }
  } catch (e) {
    // ignore
  }
}
