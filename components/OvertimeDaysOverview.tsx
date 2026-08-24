"use client"

import { calculateTrackedWeeksBalance, formatHours, TimeEntry, WorkSchedule, Absence, BalanceAdjustment } from '@/lib/utils'

interface Props {
  year: number
  years: number[]
  entries: TimeEntry[]
  schedules: WorkSchedule[]
  absences: Absence[]
  adjustments: BalanceAdjustment[]
  onYearChange: (year: number) => void
}

export default function OvertimeDaysOverview({ year, years, entries, schedules, absences, adjustments, onYearChange }: Props) {
  const annual = calculateTrackedWeeksBalance(year, entries, schedules, absences, adjustments)
  const total = annual.balance
  const days = total / 7
  const positive = total >= 0

  return (
    <section className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Time balance</p>
          <p className={`text-3xl font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {positive ? '+' : '−'}{Math.abs(days).toFixed(1)}d
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {positive ? '+' : '−'}{formatHours(Math.abs(total))} balance · {formatHours(annual.worked)} worked / {formatHours(annual.expected - annual.credited)} adjusted target
          </p>
        </div>
        <select value={year} onChange={e => onYearChange(Number(e.target.value))}
          className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </section>
  )
}
