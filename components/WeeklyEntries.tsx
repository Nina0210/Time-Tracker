'use client'

import { useState } from 'react'
import { TimeEntry, durationHours, formatHours, formatDate, getWeekBounds, todayStr } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Props {
  entries: TimeEntry[]
  weeklyTarget: number
  onEdit: (entry: TimeEntry) => void
  onRefresh: () => void
}

interface Week {
  key: string
  label: string
  entries: (TimeEntry & { dur: number })[]
  total: number
}

export default function WeeklyEntries({ entries, weeklyTarget, onEdit, onRefresh }: Props) {
  const currentWeekKey = getWeekBounds(todayStr()).key
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  if (!entries.length) {
    return <p className="text-center text-gray-400 py-12">No entries yet. Log your first hours above.</p>
  }

  const weeksMap: Record<string, Week> = {}
  for (const e of entries) {
    const { key, label } = getWeekBounds(e.date)
    if (!weeksMap[key]) weeksMap[key] = { key, label, entries: [], total: 0 }
    const dur = durationHours(e.start_time, e.end_time, e.break_mins)
    weeksMap[key].entries.push({ ...e, dur })
    weeksMap[key].total += dur
  }

  const weeks = Object.values(weeksMap).sort((a, b) => b.key.localeCompare(a.key))

  async function deleteEntry(id: string) {
    const supabase = createClient()
    await supabase.from('time_entries').delete().eq('id', id)
    onRefresh()
  }

  function isOpen(key: string) {
    if (key in collapsed) return !collapsed[key]
    return key === currentWeekKey
  }

  function toggle(key: string) {
    setCollapsed(prev => ({ ...prev, [key]: isOpen(key) }))
  }

  return (
    <div className="space-y-4">
      {weeks.map(week => {
        const open = isOpen(week.key)
        const diff = week.total - weeklyTarget
        const hasDiff = weeklyTarget > 0

        return (
          <div key={week.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(week.key)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className={`text-xs text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
                {week.label}
              </span>
              <div className="flex items-center gap-2">
                {hasDiff && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    diff > 0 ? 'bg-green-100 text-green-700' :
                    diff < 0 ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {diff > 0 ? '+' : diff < 0 ? '−' : ''}{formatHours(Math.abs(diff))}
                  </span>
                )}
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {formatHours(week.total)}
                </span>
              </div>
            </button>
            {open && (
              <div>
                {week.entries.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400 w-24">{formatDate(e.date)}</span>
                      <span className="text-sm text-gray-700">{e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}</span>
                      {e.label && <span className="text-xs text-gray-400 italic">{e.label}</span>}
                      {e.break_mins > 0 && <span className="text-xs text-gray-400 italic">−1h lunch</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-gray-700 min-w-[40px] text-right">{formatHours(e.dur)}</span>
                      <button onClick={() => onEdit(e)} className="text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded p-1 text-xs transition-colors">✎</button>
                      <button onClick={() => deleteEntry(e.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-1 text-sm transition-colors">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
