"use client"

import { dailyOvertime, formatHours, formatDate, TimeEntry, WorkSchedule } from '@/lib/utils'

interface Props {
  entries: TimeEntry[]
  schedules: WorkSchedule[]
  days?: number
}

export default function OvertimeOverview({ entries, schedules, days = 14 }: Props) {
  const data = dailyOvertime(entries, schedules, days)
  const max = Math.max(...data.map(d => Math.abs(d.overtime)), 1)

  return (
    <section className="bg-white rounded-xl shadow-sm px-5 py-3.5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Overtime (daily)</p>
          <p className="text-lg font-semibold text-gray-900">Last {days} days</p>
        </div>
      </div>
      <div className="flex items-end gap-2 h-36">
        {data.map(d => {
          const height = Math.round((Math.abs(d.overtime) / max) * 100)
          const positive = d.overtime >= 0
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              <div className="relative w-full flex items-end justify-center">
                <div className={`w-4 rounded-t-md ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: `${height}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-2">{formatDate(d.date)}</div>
              <div className="text-xs text-gray-700 mt-0.5">{d.overtime >= 0 ? '+' : '−'}{formatHours(Math.abs(d.overtime))}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
