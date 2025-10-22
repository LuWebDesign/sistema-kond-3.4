import { useState, useEffect } from 'react'
import { 
  getAvailableCapacityPerDay, 
  calculateTotalProductionTime,
  getMinSelectableDateForTransfer 
} from '../utils/catalogUtils'

export default function AvailabilityCalendar({ 
  cart, 
  selectedDate, 
  onDateSelect,
  className = '' 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [capacityPerDay, setCapacityPerDay] = useState({})
  
  const maxDailyCapacity = 480 // 8 horas en minutos
  const cartTime = calculateTotalProductionTime(cart)
  
  useEffect(() => {
    setCapacityPerDay(getAvailableCapacityPerDay())
  }, [])

  const today = new Date()
  const minSelectable = getMinSelectableDateForTransfer()
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startDay = firstDay.getDay()

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateClick = (day) => {
    const date = new Date(currentYear, currentMonth, day)
    const dateStr = date.toISOString().split('T')[0]
    const usedCapacity = capacityPerDay[dateStr] || 0
    const availableCapacity = maxDailyCapacity - usedCapacity
    const canFit = availableCapacity >= cartTime
    const isPast = date < minSelectable
    const isWeekend = date.getDay() === 0 // Solo domingo

    if (!isPast && !isWeekend && canFit) {
      onDateSelect(dateStr)
    }
  }

  const renderCalendarDays = () => {
    const days = []
    
    // Días vacíos al inicio
    for (let i = 0; i < startDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      )
    }

    // Días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day)
      const dateStr = date.toISOString().split('T')[0]
      const usedCapacity = capacityPerDay[dateStr] || 0
      const availableCapacity = maxDailyCapacity - usedCapacity
      const canFit = availableCapacity >= cartTime
      const isPast = date < minSelectable
      const isWeekend = date.getDay() === 0
      const isSelected = selectedDate === dateStr

      let dayClass = 'calendar-day'
      let dayTitle = 'Disponible'

      if (isPast) {
        dayClass += ' past'
        dayTitle = 'Fecha pasada'
      } else if (isWeekend) {
        dayClass += ' weekend'
        dayTitle = 'Fin de semana'
      } else if (!canFit) {
        dayClass += ' full'
        dayTitle = 'Sin capacidad'
      } else {
        dayClass += ' available'
      }

      if (isSelected) {
        dayClass += ' selected'
      }

      const isClickable = !isPast && !isWeekend && canFit

      days.push(
        <div
          key={day}
          className={dayClass}
          title={dayTitle}
          onClick={isClickable ? () => handleDateClick(day) : undefined}
          style={{
            cursor: isClickable ? 'pointer' : 'not-allowed'
          }}
        >
          <span className="day-number">{day}</span>
        </div>
      )
    }

    return days
  }

  return (
    <div className={`availability-calendar ${className}`}>
      <style jsx>{`
        .availability-calendar {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .calendar-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .calendar-nav-btn {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .calendar-nav-btn:hover {
          background: var(--bg-secondary);
        }
        
        .calendar-days-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .calendar-day-name {
          text-align: center;
          padding: 8px 4px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        
        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 20px;
        }
        
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
          position: relative;
        }
        
        .calendar-day.empty {
          visibility: hidden;
        }
        
        .calendar-day.available {
          background: var(--accent-available, #059669); /* fallback verde */
          color: white;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        
        .calendar-day.available:hover {
          transform: translateY(-3px) scale(1.06);
          box-shadow: 0 8px 22px rgba(59,130,246,0.18);
        }
        
        .calendar-day.past {
          background: var(--bg-tertiary);
          color: var(--text-muted);
          opacity: 0.5;
        }
        
        .calendar-day.weekend {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .calendar-day.full {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        .calendar-day.selected {
          background: var(--accent-secondary) !important;
          color: white !important;
          border: 2px solid var(--accent-secondary) !important;
          font-weight: 700;
        }
        
        .day-number {
          position: relative;
          z-index: 1;
        }
        
        .calendar-legend {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          font-size: 0.8rem;
        }
        
        .calendar-legend > div {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
        }
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .legend-dot.available {
          background: var(--accent-blue);
          border: 1px solid rgba(59,130,246,0.9);
        }
        
        .legend-dot.full {
          background: rgba(245, 158, 11, 0.3);
          border: 1px solid #f59e0b;
        }
        
        .legend-dot.weekend {
          background: rgba(239, 68, 68, 0.3);
          border: 1px solid #ef4444;
        }
        
        @media (max-width: 768px) {
          .availability-calendar {
            padding: 16px;
          }
          
          .calendar-header {
            margin-bottom: 16px;
          }
          
          .calendar-header h4 {
            font-size: 1.1rem;
          }
          
          .calendar-nav-btn {
            padding: 6px 10px;
            font-size: 0.8rem;
          }
          
          .calendar-day {
            font-size: 0.8rem;
          }
          
          .calendar-legend {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
      `}</style>
      
      <div className="calendar-header">
        <button 
          className="calendar-nav-btn"
          onClick={prevMonth}
          type="button"
        >
          ← Anterior
        </button>
        
        <h4>{monthNames[currentMonth]} {currentYear}</h4>
        
        <button 
          className="calendar-nav-btn"
          onClick={nextMonth}
          type="button"
        >
          Siguiente →
        </button>
      </div>
      
      <div className="calendar-days-header">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-name">
            {day}
          </div>
        ))}
      </div>
      
      <div className="calendar-days-grid">
        {renderCalendarDays()}
      </div>
      
      <div className="calendar-legend">
        <div>
          <span className="legend-dot available"></span>
          Disponible
        </div>
        <div>
          <span className="legend-dot full"></span>
          Sin capacidad
        </div>
        <div>
          <span className="legend-dot weekend"></span>
          Fin de semana
        </div>
      </div>
      
      {selectedDate && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--accent-secondary)',
          color: 'white',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          ✓ Fecha seleccionada: {(() => {
            try {
              const { parseDateYMD } = require('../utils/catalogUtils')
              const d = parseDateYMD(selectedDate) || new Date(selectedDate + 'T00:00:00')
              return d.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            } catch (e) {
              return selectedDate
            }
          })()}
        </div>
      )}
    </div>
  )
}