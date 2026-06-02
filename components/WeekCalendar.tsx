'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

interface WeekCalendarProps {
  selectedDate: string
  onSelectDate: (d: string) => void
}

export function WeekCalendar({ selectedDate, onSelectDate }: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const todayIso = today.toISOString().split('T')[0]

  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + weekOffset * 7)

  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    return { name, iso, num: d.getDate(), isToday: iso === todayIso, isSel: iso === selectedDate }
  })

  return (
    <div className="flex items-center w-full gap-1 px-1">
      {/* Strzałka wstecz */}
      <button
        onClick={() => setWeekOffset(o => o - 1)}
        className="flex-shrink-0 p-1.5 rounded-lg text-[#7A5C42] hover:bg-[#C9993F]/15 hover:text-[#C9993F] transition-all"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Dni tygodnia */}
      {days.map(day => (
        <button
          key={day.iso}
          onClick={() => onSelectDate(day.iso)}
          style={{ borderRadius: 16 }}
          className={[
            'flex-1 flex flex-col items-center py-2 transition-all duration-150',
            day.isSel
              ? 'bg-[#C9993F] text-white'
              : day.isToday
              ? 'bg-[#C9993F]/15 text-[#C9993F]'
              : 'text-[#7A5C42] hover:bg-[#C9993F]/8',
          ].join(' ')}
        >
          <span
            style={{ fontFamily: "'Cinzel', serif", fontSize: 10 }}
            className="leading-none mb-1"
          >
            {day.name}
          </span>
          <span className="text-base font-bold leading-none">{day.num}</span>
        </button>
      ))}

      {/* Strzałka do przodu */}
      <button
        onClick={() => setWeekOffset(o => o + 1)}
        className="flex-shrink-0 p-1.5 rounded-lg text-[#7A5C42] hover:bg-[#C9993F]/15 hover:text-[#C9993F] transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
