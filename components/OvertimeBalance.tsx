'use client'

import { useState, type FormEvent } from 'react'
import { Absence, OvertimeReductionPlan, TimeEntry, durationHours, formatDate, getWeekBounds } from '@/lib/utils'
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
  const [plannedDate, setPlannedDate] = useState('')
  const [hours, setHours] = useState('7')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  if (!entries.length || weeklyTarget <= 0) return null

  const firstWeek = mondayOf([...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date)
  const currentWeek = mondayOf(dateString(new Date()))
  let earnedBalance = 0

  for (let week = firstWeek; week < currentWeek; week = addDays(week, 7)) {
    const weekKey = getWeekBounds(week).key
    const worked = entries.filter(entry => getWeekBounds(entry.date).key === weekKey).reduce((total, entry) => total + durationHours(entry.start_time, entry.end_time, entry.break_mins), 0)
    const absenceCredit = Array.from({ length: 5 }, (_, offset) => addDays(week, offset)).reduce((total, date) => {
      const absence = absences.find(item => item.start_date <= date && item.end_date >= date)
      return total + (absence ? Number(absence.hours_per_day) : 0)
    }, 0)
    const takenPlanHours = plans.filter(plan => plan.time_taken && mondayOf(plan.planned_date) === week).reduce((total, plan) => total + Number(plan.hours), 0)
    const adjustedTarget = Math.max(0, weeklyTarget - takenPlanHours)
    earnedBalance += worked + absenceCredit - adjustedTarget
  }

  const reserved = plans.reduce((total, plan) => total + Number(plan.hours), 0)
  const availableBalance = earnedBalance - reserved

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    setError('')
    const amount = Number(hours)
    if (!plannedDate || plannedDate <= dateString(new Date())) { setError('Choose a future date.'); return }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 168) { setError('Enter hours between 0 and 168.'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session has expired. Sign in again.'); return }
    const { error: saveError } = await supabase.from('overtime_reduction_plans').insert({ user_id: user.id, planned_date: plannedDate, hours: amount, note: note || null, time_taken: false })
    if (saveError) { setError(saveError.message); return }
    setPlanning(false); setPlannedDate(''); setHours('7'); setNote(''); onRefresh()
  }

  async function setTaken(plan: OvertimeReductionPlan, timeTaken: boolean) {
    await createClient().from('overtime_reduction_plans').update({ time_taken: timeTaken }).eq('id', plan.id)
    onRefresh()
  }

  async function removePlan(id: string) {
    await createClient().from('overtime_reduction_plans').delete().eq('id', id)
    onRefresh()
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total time balance</p>
      <p className={`mt-1 text-3xl font-semibold ${availableBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{signedTime(availableBalance)}</p>
      {plans.length > 0 && <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm"><div><p className="text-xs text-gray-400">Earned balance</p><p className="font-medium text-gray-700">{signedTime(earnedBalance)}</p></div><div><p className="text-xs text-gray-400">Planned reductions</p><p className="font-medium text-amber-600">−{balanceTime(reserved)}</p></div></div>}

      {plans.length > 0 && <div className="mt-4 space-y-2">{[...plans].sort((a, b) => a.planned_date.localeCompare(b.planned_date)).map(plan => {
        const canConfirm = mondayOf(plan.planned_date) <= currentWeek
        return <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><div><span className="font-medium text-gray-700">{formatDate(plan.planned_date)}</span><span className="ml-2 text-amber-600">−{balanceTime(Number(plan.hours))}</span>{plan.note && <span className="ml-2 text-xs italic text-gray-400">{plan.note}</span>}</div><div className="flex items-center gap-3">{canConfirm ? <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={plan.time_taken} onChange={event => setTaken(plan, event.target.checked)} className="rounded" />Time taken</label> : <span className="text-xs text-gray-400">Planned</span>}<button onClick={() => removePlan(plan.id)} className="text-gray-300 hover:text-red-500">×</button></div></div>
      })}</div>}

      {!planning ? <button onClick={() => setPlanning(true)} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Plan overtime reduction</button> : <form onSubmit={createPlan} className="mt-4 border-t border-gray-100 pt-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.2fr_.7fr_1.5fr_auto]"><input type="date" min={addDays(dateString(new Date()), 1)} value={plannedDate} onChange={event => setPlannedDate(event.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required /><input type="number" min="0.25" max="168" step="0.25" value={hours} onChange={event => setHours(event.target.value)} placeholder="Hours" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required /><input value={note} onChange={event => setNote(event.target.value)} placeholder="Note (optional)" className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:col-span-1" /><div className="col-span-2 flex gap-2 sm:col-span-1"><button type="button" onClick={() => { setPlanning(false); setError('') }} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600">Cancel</button><button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Plan</button></div></div>{error && <p className="mt-2 text-xs text-red-500">{error}</p>}</form>}
    </section>
  )
}
