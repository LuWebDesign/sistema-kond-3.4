import React from 'react'

export default function AnalyticsCard({ title, value, icon, color = '#3b82f6', isAmount = false, subtitle, trend, compact = false, leftAccent = false }) {
  const containerStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: compact ? '8px' : '12px',
    padding: compact ? '16px' : '24px',
    display: 'flex',
    alignItems: compact ? 'center' : 'flex-start',
    gap: '12px',
    position: 'relative',
    boxSizing: 'border-box'
  }

  if (leftAccent) {
    containerStyle.borderLeft = `4px solid ${color}`
  }

  const iconStyle = {
    fontSize: compact ? '1.5rem' : '2rem',
    background: `${color}20`,
    color,
    padding: compact ? '8px' : '12px',
    borderRadius: compact ? '6px' : '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const titleStyle = {
    fontSize: compact ? '0.8rem' : '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    fontWeight: 500
  }

  const valueStyle = {
    fontSize: isAmount ? (compact ? '1.1rem' : '1.4rem') : (compact ? '1.3rem' : '1.8rem'),
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1
  }

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>{icon}</div>
      <div style={{ flex: 1 }}>
        <h4 style={titleStyle}>{title}</h4>
        <p style={valueStyle}>{value}</p>

        {!compact && (subtitle || trend) && (
          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            {subtitle && <span style={{ color: 'var(--text-secondary)' }}>{subtitle}</span>}
            {trend && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trend.color, fontWeight: 600, marginLeft: 'auto' }}>
                <span>{trend.icon}</span>
                <span>{trend.text}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {compact && trend && !leftAccent && (
        <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: trend.color, fontWeight: 600 }}>
          <span>{trend.icon}</span>
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  )
}
