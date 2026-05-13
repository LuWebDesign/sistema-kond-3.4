// next-app/components/home/AnnouncementBar.js
// Scrolling marquee announcement bar for the Megafibro home page.
// CSS-only animation, no external libraries.

const DEFAULT_MESSAGES = [
  'Envíos a todo el país',
  '10% OFF abonando por transferencia',
  'Pedidos personalizados',
]

export default function AnnouncementBar({ messages = DEFAULT_MESSAGES }) {
  // Duplicate messages so the marquee loops seamlessly
  const items = [...messages, ...messages]

  return (
    <div style={{
      background: 'var(--accent-blue)',
      color: '#fff',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      padding: '8px 0',
      fontSize: '0.85rem',
      fontWeight: 500,
      letterSpacing: '0.3px',
    }}>
      <style jsx>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .announcement-track {
          display: inline-block;
          animation: marquee 28s linear infinite;
        }
        .announcement-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="announcement-track">
        {items.map((msg, i) => (
          <span key={i} style={{ marginRight: '48px' }}>{msg}</span>
        ))}
      </div>
    </div>
  )
}
