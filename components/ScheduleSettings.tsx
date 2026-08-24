'use client'

import { useState } from 'react'
import { createClient, getSessionUser } from '@/lib/supabase/client'
import { todayStr, WorkSchedule } from '@/lib/utils'

interface Props {
  schedules: WorkSchedule[]
  onSaved: () => void
}

export default function ScheduleSettings({ schedules, onSaved }: Props) {
  const current = [...schedules]
    .filter(schedule => schedule.effective_from <= todayStr())
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
  const [target, setTarget] = useState(String(current?.weekly_target ?? 20))
  const [validFrom, setValidFrom] = useState(todayStr())
  const [message, setMessage] = useState('')

  async function save() {
    const hours = Number(target)
    if (!validFrom || !Number.isFinite(hours) || hours < 0 || hours > 168) {
      setMessage('Enter a target between 0 and 168 hours and choose a valid date.')
      return
    }

    const supabase = createClient()
    const user = await getSessionUser(supabase)
    if (!user) return

    const { error: saveError } = await supabase.from('work_schedules').upsert({
      user_id: user.id,
      effective_from: validFrom,
      weekly_target: hours,
      workdays: [1, 2, 3, 4, 5],
    }, { onConflict: 'user_id,effective_from' })
    if (saveError) { setMessage(saveError.message); return }

    // This setting supersedes later test entries. Older targets remain as history.
    const { error: cleanupError } = await supabase
      .from('work_schedules')
      .delete()
      .gt('effective_from', validFrom)
    if (cleanupError) { setMessage(cleanupError.message); return }

    setMessage(`Saved: ${hours}h per week, valid from ${validFrom}.`)
    onSaved()
  }

  return (
    <section className="mb-6 rounded-xl bg-white px-5 py-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Weekly target hours</h2>
        <p className="mt-0.5 text-xs text-gray-400">Monday to Friday · current target: {current?.weekly_target ?? 20}h</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-gray-500">Hours per week
          <input type="number" min="0" max="168" step="0.25" value={target} onChange={event => setTarget(event.target.value)}
            className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium text-gray-500">Valid from this date
          <input type="date" value={validFrom} onChange={event => setValidFrom(event.target.value)}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <button onClick={save} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save target</button>
        {message && <span className="text-xs text-gray-500">{message}</span>}
      </div>
    </section>
  )
}
