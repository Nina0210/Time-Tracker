'use client'

import { useState } from 'react'
import { Absence, OvertimeReductionPlan, TimeEntry, durationHours, formatDate, getWeekBounds } from '@/lib/utils'
import OvertimeReductionForm from './OvertimeReductionForm'
import { createClient } from '@/lib/supabase/client'

interface Props {
  entries: TimeEntry[]
  absences: Absence[]
  plans: OvertimeReductionPlan[]
  weeklyTarget: number
  onRefresh: () => void
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: string, amount: number) {
  const result = new Date(`${date}T00:00:00`)
  result.setDate(result.getDate() + amount)
  return dateString(result)
}

function mondayOf(date: string) {
  const result = new Date(`${date}T00:00:00`)
  const weekday = result.getDay()
  result.setDate(result.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return dateString(result)
}

function balanceTime(hours: number) {
  const totalMinutes = Math.round(Math.abs(hours) * 60)
  const days = Math.floor(totalMinutes / 420)
  const remainder = totalMinutes % 420
  const parts = [`${days}d`, `${Math.floor(remainder / 60)}h`]
  if (remainder % 60) parts.push(`${remainder % 60}m`)
  return parts.join(' ')
}

function signedTime(hours: number) {
  return `${hours >= 0 ? '+' : '−'}${balanceTime(hours)}`
}

export default function OvertimeBalance({ entries, absences, plans, weeklyTarget, onRefresh }: Props) {
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState('')
  if (weeklyTarget <= 0) return null

  const firstWeek = mondayOf([...entries].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? dateString(new Date()))
  const currentWeek = mondayOf(dateString(new Date()))
  let earnedBalance = 0

  for (let week = firstWeek; week < currentWeek; week = addDays(week, 7)) {
    const weekKey = getWeekBounds(week).key
    const worked = entries.filter(entry => getWeekBounds(entry.date).key === weekKey).reduce((total, entry) => total + durationHours(entry.start_time, entry.end_time, entry.break_mins), 0)
    const absenceCredit = Array.from({ length: 5 }, (_, offset) => addDays(week, offset)).reduce((total, date) => {
      const absence = absences.find(item => item.start_date <= date && item.end_date >= date)
      return total + (absence ? Number(absence.hours_per_day) : 0)
    }, 0)
    // Reductions are deducted below; they must not also increase earned time.
    earnedBalance += worked + absenceCredit - weeklyTarget
  }

  const reserved = plans.reduce((total, plan) => total + Number(plan.hours), 0)
  const availableBalance = earnedBalance - reserved

  async function setTaken(plan: OvertimeReductionPlan, timeTaken: boolean) {
    const { error } = await createClient().from('overtime_reduction_plans').update({ time_taken: timeTaken }).eq('id', plan.id)
    if (error) { setError(error.message); return }
    setError('')
    onRefresh()
  }

  async function removePlan(id: string) {
    const { error } = await createClient().from('overtime_reduction_plans').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setError('')
    onRefresh()
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total time balance</p>
      <p className={`mt-1 text-3xl font-semibold ${availableBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{signedTime(availableBalance)}</p>
      {plans.length > 0 && <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm"><div><p className="text-xs text-gray-400">Earned balance</p><p className="font-medium text-gray-700">{signedTime(earnedBalance)}</p></div><div><p className="text-xs text-gray-400">Overtime reductions</p><p className="font-medium text-amber-600">−{balanceTime(reserved)}</p></div></div>}

      {plans.length > 0 && <details className="group mt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90">▶</span>
          Overtime reductions ({plans.length})
        </summary>
        <div className="mt-2 space-y-2">{[...plans].sort((a, b) => a.planned_date.localeCompare(b.planned_date)).map(plan => {
        const canConfirm = plan.planned_date <= dateString(new Date())
        return <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><div><span className="font-medium text-gray-700">{formatDate(plan.planned_date)}</span><span className="ml-2 text-amber-600">−{balanceTime(Number(plan.hours))}</span>{plan.note && <span className="ml-2 text-xs italic text-gray-400">{plan.note}</span>}</div><div className="flex items-center gap-3">{canConfirm ? <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={plan.time_taken} onChange={event => setTaken(plan, event.target.checked)} className="rounded" />Time taken</label> : <span className="text-xs text-gray-400">Planned</span>}<button onClick={() => removePlan(plan.id)} className="text-gray-300 hover:text-red-500">×</button></div></div>
      })}</div>
      </details>}

      {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
      {!planning ? <button onClick={() => setPlanning(true)} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add overtime reduction</button> : <OvertimeReductionForm onClose={() => setPlanning(false)} onSaved={onRefresh} />}
    </section>
  )
}
