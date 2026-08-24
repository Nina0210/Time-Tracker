'use client'

import { Absence, BalanceAdjustment, calculateBalance, formatHours, TimeEntry, WorkSchedule } from '@/lib/utils'

interface Props {
  year: number
  years: number[]
  entries: TimeEntry[]
  schedules: WorkSchedule[]
  absences: Absence[]
  adjustments: BalanceAdjustment[]
  onYearChange: (year: number) => void
}

export default function BalanceOverview({ year, years, entries, schedules, absences, adjustments, onYearChange }: Props) {
  const annual = calculateBalance(year, entries, schedules, absences, adjustments)
  const firstYear = Math.min(year, ...years)
  let carryover = 0
  for (let y = firstYear; y < year; y++) {
    carryover += calculateBalance(y, entries, schedules, absences, adjustments, `${y}-12-31`).balance
  }
  const total = carryover + annual.balance
  const positive = total >= 0

  return (
    <section className="bg-gray-900 text-white rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">Time balance</p>
          <p className={`text-3xl font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {positive ? '+' : '−'}{formatHours(total)} {positive ? 'overtime' : 'remaining'}
          </p>
        </div>
        <select value={year} onChange={e => onYearChange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Metric label="Worked" value={annual.worked} />
        <Metric label="Expected" value={annual.expected} />
        <Metric label="Absence & holidays" value={annual.credited} />
        <Metric label="Opening balance" value={carryover} signed />
      </div>
      {annual.adjustments !== 0 && (
        <p className="text-xs text-gray-400 mt-4">Manual corrections in {year}: {annual.adjustments > 0 ? '+' : '−'}{formatHours(annual.adjustments)}</p>
      )}
    </section>
  )
}

function Metric({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="font-medium">{signed && value !== 0 ? (value > 0 ? '+' : '−') : ''}{formatHours(value)}</p>
    </div>
  )
}
