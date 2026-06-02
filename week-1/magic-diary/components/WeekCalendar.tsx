'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

const MONTHS_SHORT = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface WeekCalendarProps {
  selectedDate: string
  onSelectDate: (d: string) => void
}

export function WeekCalendar({ selectedDate, onSelectDate }: WeekCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toIso(today)
  const baseMonday = getMonday(today)

  const selDate = new Date(selectedDate + 'T00:00:00')
  const selMonday = getMonday(selDate)
  const initOffset = Math.round(
    (selMonday.getTime() - baseMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )

  const [weekOffset, setWeekOffset] = useState(initOffset)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(selDate.getFullYear())

  const monday = new Date(baseMonday)
  monday.setDate(baseMonday.getDate() + weekOffset * 7)

  // Czwartek → miarodajny dla wyświetlanego miesiąca (standard ISO)
  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const displayMonth = thursday.getMonth()
  const displayYear = thursday.getFullYear()

  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = toIso(d)
    return {
      name,
      iso,
      num: d.getDate(),
      isToday: iso === todayIso,
      isSel: iso === selectedDate,
    }
  })

  const jumpToMonth = (month: number, year: number) => {
    const target = new Date(year, month, 1)
    const targetMonday = getMonday(target)
    const offset = Math.round(
      (targetMonday.getTime() - baseMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    setWeekOffset(offset)
    setPickerOpen(false)
  }

  return (
    <div className="flex flex-col w-full relative">
      {/* Wiersz nawigacji */}
      <div className="flex items-center px-2 mb-2 gap-1">
        <button
          type="button"
          onClick={() => setWeekOffset(o => o - 1)}
          title="Poprzedni tydzień"
          className="p-1.5 rounded-lg hover:bg-[#C9993F]/15 text-[#7A5C42] hover:text-[#C9993F] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => { setPickerYear(displayYear); setPickerOpen(o => !o) }}
          className="flex-1 text-center transition-colors hover:opacity-80"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 13,
            color: '#C9993F',
            letterSpacing: '0.04em',
          }}
        >
          {MONTHS_PL[displayMonth]} {displayYear}
        </button>

        <button
          type="button"
          onClick={() => setWeekOffset(o => o + 1)}
          title="Następny tydzień"
          className="p-1.5 rounded-lg hover:bg-[#C9993F]/15 text-[#7A5C42] hover:text-[#C9993F] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Picker miesiąc/rok */}
      {pickerOpen && (
        <div
          className="absolute top-10 left-2 right-2 z-50 rounded-xl border border-[rgba(201,169,110,0.3)] shadow-xl overflow-hidden"
          style={{ background: '#F0E8CC' }}
        >
          {/* Rok */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(201,169,110,0.2)]">
            <button
              type="button"
              onClick={() => setPickerYear(y => y - 1)}
              className="p-1 rounded hover:bg-[#C9993F]/15 text-[#7A5C42] hover:text-[#C9993F] transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: '#5C3D28' }}>
              {pickerYear}
            </span>
            <button
              type="button"
              onClick={() => setPickerYear(y => y + 1)}
              className="p-1 rounded hover:bg-[#C9993F]/15 text-[#7A5C42] hover:text-[#C9993F] transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Siatka miesięcy */}
          <div className="grid grid-cols-4 gap-1 p-2">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => jumpToMonth(i, pickerYear)}
                style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
                className={[
                  'py-1.5 rounded-lg transition-all',
                  i === displayMonth && pickerYear === displayYear
                    ? 'bg-[#C9993F] text-white'
                    : 'text-[#5C3D28] hover:bg-[#C9993F]/15',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dni tygodnia */}
      <div className="flex w-full gap-1 px-1">
        {days.map(day => (
          <button
            key={day.iso}
            type="button"
            onClick={() => { onSelectDate(day.iso); setPickerOpen(false) }}
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
      </div>
    </div>
  )
}
