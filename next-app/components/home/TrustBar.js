// next-app/components/home/TrustBar.js
// 4-column trust signals section for the Megafibro home page.

const TRUST_ITEMS = [
  {
    icon: '✂️',
    title: 'Diseño Personalizado',
    desc: 'Adaptamos cada producto a tu idea',
  },
  {
    icon: '🚚',
    title: 'Envíos a todo el país',
    desc: 'Correo Argentino y otros medios',
  },
  {
    icon: '📦',
    title: 'Mayor y menor',
    desc: 'Para emprendedores y particulares',
  },
  {
    icon: '🏅',
    title: 'Calidad MDF',
    desc: 'Materiales seleccionados',
  },
]

export default function TrustBar() {
  return (
    <section style={{
      padding: '32px 24px 48px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <style jsx>{`
        .trust-grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .trust-item {
          flex: 1 1 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 16px;
          border-radius: 12px;
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(255,255,255,0.07));
          gap: 8px;
        }
      `}</style>

      <div className="trust-grid">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="trust-item">
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{item.icon}</span>
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary, #f1f5f9)',
            }}>
              {item.title}
            </p>
            <p style={{
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--text-muted, #94a3b8)',
              lineHeight: 1.4,
            }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
