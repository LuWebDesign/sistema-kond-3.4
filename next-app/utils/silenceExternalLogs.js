// Filtra mensajes ruidosos de librerías externas (SES / Supabase Realtime)
// Se ejecuta en el cliente y reemplaza temporalmente console.* para silenciar sólo mensajes coincidentes.
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  try {
    const original = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info ? console.info.bind(console) : console.log.bind(console)
    }

    const filters = [
      'SES Removing unpermitted intrinsics',
      'lockdown-install.js',
      '[Realtime]',
      'WebSocket is closed before the connection is established',
      'Canal cerrado',
      'Canal no existe, recreando',
      'Suscripción cancelada exitosamente'
    ]

    function shouldFilter(args) {
      if (!args || args.length === 0) return false
      try {
        const text = args.map(a => (typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a))).join(' ')
        return filters.some(f => text.includes(f))
      } catch (e) {
        return false
      }
    }

    ;['log', 'warn', 'error', 'info'].forEach(level => {
      console[level] = function (...args) {
        if (shouldFilter(args)) return
        original[level](...args)
      }
    })
  } catch (e) {
    // no bloquear en caso de error
  }
}
