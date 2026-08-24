'use client'

import { Absence, TimeEntry, durationHours, formatHours, getWeekBounds } from '@/lib/utils'

interface Props {
  entries: TimeEntry[]
  absences: Absence[]
  weeklyTarget: number
}

function dateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function signedHours(hours: number) {
  return `${hours >= 0 ? '+' : '−'}${formatHours(Math.abs(hours))}`
}

export default function OvertimeBalance({ entries, absences, weeklyTarget }: Props) {
  if (!entries.length || weeklyTarget <= 0) return null

  const firstWeek = mondayOf([...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date)
  const currentWeek = mondayOf(dateString(new Date()))
  let completedBalance = 0

  for (let week = firstWeek; week < currentWeek; week = addDays(week, 7)) {
    const weekKey = getWeekBounds(week).key
    const worked = entries
      .filter(entry => getWeekBounds(entry.date).key === weekKey)
      .reduce((total, entry) => total + durationHours(entry.start_time, entry.end_time, entry.break_mins), 0)
    const credited = Array.from({ length: 5 }, (_, offset) => addDays(week, offset))
      .reduce((total, date) => {
        const absence = absences.find(item => item.start_date <= date && item.end_date >= date)
        return total + (absence ? Number(absence.hours_per_day) : 0)
      }, 0)
    completedBalance += worked + credited - weeklyTarget
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total time balance</p>
      <p className={`mt-1 text-3xl font-semibold ${completedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{signedHours(completedBalance)}</p>
    </section>
  )
}
