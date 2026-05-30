'use client'

import { MOOD_DATA } from '@/types/entry'

interface MoodPickerProps {
  value: number | null
  onChange: (v: number | null) => void
}

// Krótsze etykiety żeby mieściły się w flex-1 bez truncate
const SHORT_LABEL: Record<number, string> = {
  5: 'Świetnie',
  4: 'Dobrze',
  3: 'Neutral',
  2: 'Źle',
  1: 'Koszmar',
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex w-full">
      {MOOD_DATA.map(m => {
        const selected = value === m.value
        return (
          <button
            key={m.value}
            onClick={() => onChange(selected ? null : m.value)}
            title={m.label}
            className={[
              'flex-1 flex flex-col items-center gap-1 py-2',
              'transition-all duration-200 rounded-xl border',
              selected
                ? 'border-[#C9993F] bg-[#C9993F]/15'
                : 'border-transparent hover:bg-[#C9993F]/5',
            ].join(' ')}
          >
            <span className="text-[22px] leading-none">{m.emoji}</span>
            <span
              className="text-[10px] text-center leading-tight whitespace-nowrap"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#3D2010',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {SHORT_LABEL[m.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
