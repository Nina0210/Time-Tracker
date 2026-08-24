'use client'

import { useState, type FormEvent } from 'react'
import { Absence, TimeEntry, durationHours, formatHours, formatDate, getWeekBounds, todayStr } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Props {
  entries: TimeEntry[]
  absences: Absence[]
  weeklyTarget: number
  usualWorkdays: number[]
  onEdit: (entry: TimeEntry) => void
  onEditAbsence: (absence: Absence) => void
  onRefresh: () => void
}

interface Week {
  key: string
  label: string
  entries: (TimeEntry & { dur: number })[]
  workdays: string[]
  total: number
}

function getWorkdays(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))

  return Array.from({ length: 5 }, (_, offset) => {
    const workday = new Date(date)
    workday.setDate(date.getDate() + offset)
    const year = workday.getFullYear()
    const month = String(workday.getMonth() + 1).padStart(2, '0')
    const dateOfMonth = String(workday.getDate()).padStart(2, '0')
    return `${year}-${month}-${dateOfMonth}`
  })
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dateOfMonth = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${dateOfMonth}`
}

function distributeHours(total: number, days: number) {
  const base = Math.floor(total / days)
  let remainder = Number((total - base * days).toFixed(2))
  return Array.from({ length: days }, () => {
    const extra = Math.min(1, remainder)
    remainder = Number((remainder - extra).toFixed(2))
    return base + extra
  })
}

export default function WeeklyEntries({ entries, absences, weeklyTarget, usualWorkdays, onEdit, onEditAbsence, onRefresh }: Props) {
  const currentWeekKey = getWeekBounds(todayStr()).key
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [logDate, setLogDate] = useState<string | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [label, setLabel] = useState('')
  const [lunch, setLunch] = useState(true)
  const [logError, setLogError] = useState('')
  const [saving, setSaving] = useState(false)
  const [absenceDate, setAbsenceDate] = useState<string | null>(null)
  const [absenceKind, setAbsenceKind] = useState<Absence['kind']>('vacation')
  const [absenceHours, setAbsenceHours] = useState('')
  const [fullWeekAbsence, setFullWeekAbsence] = useState(false)
  const [absenceNote, setAbsenceNote] = useState('')
  const [absenceError, setAbsenceError] = useState('')
  const [savingAbsence, setSavingAbsence] = useState(false)

  const weeksMap: Record<string, Week> = {}
  const currentWeek = getWeekBounds(todayStr())
  weeksMap[currentWeek.key] = {
    ...currentWeek,
    entries: [],
    workdays: getWorkdays(todayStr()),
    total: 0,
  }

  const visibleDates = [...entries.map(entry => entry.date), ...absences.map(absence => absence.start_date)]
  if (visibleDates.length) {
    const earliestEntryDate = [...visibleDates].sort()[0]
    const currentMonday = getWorkdays(todayStr())[0]

    for (let monday = getWorkdays(earliestEntryDate)[0]; monday <= currentMonday; monday = addDays(monday, 7)) {
      const week = getWeekBounds(monday)
      if (!weeksMap[week.key]) {
        weeksMap[week.key] = {
          ...week,
          entries: [],
          workdays: getWorkdays(monday),
          total: 0,
        }
      }
    }
  }

  for (const e of entries) {
    const { key, label } = getWeekBounds(e.date)
    if (!weeksMap[key]) weeksMap[key] = { key, label, entries: [], workdays: getWorkdays(e.date), total: 0 }
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

  function openLogForm(date: string) {
    setAbsenceDate(null)
    setLogDate(date)
    setStart('')
    setEnd('')
    setLabel('')
    setLunch(true)
    setLogError('')
  }

  function openAbsenceForm(date: string, kind: Absence['kind']) {
    if (!usualWorkdays.includes(new Date(`${date}T00:00:00`).getDay())) return
    setLogDate(null)
    setAbsenceDate(date)
    setAbsenceKind(kind)
    setAbsenceHours(weeklyTarget > 0 && usualWorkdays.length ? String(weeklyTarget / usualWorkdays.length) : '')
    setFullWeekAbsence(false)
    setAbsenceNote('')
    setAbsenceError('')
  }

  async function addEntry(event: FormEvent) {
    event.preventDefault()
    setLogError('')

    if (logDate && absences.some(absence => absence.start_date <= logDate && absence.end_date >= logDate)) {
      setLogError('Remove the absence before logging work on this day.')
      return
    }
    if (!logDate || end <= start) {
      setLogError('End time must be after start time.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLogError('Your session has expired. Please sign in again.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      date: logDate,
      start_time: start,
      end_time: end,
      label: label || null,
      break_mins: lunch ? 60 : 0,
    })

    setSaving(false)
    if (error) {
      setLogError(error.message)
      return
    }

    setLogDate(null)
    onRefresh()
  }

  async function addAbsence(event: FormEvent) {
    event.preventDefault()
    if (!absenceDate) return
    setAbsenceError('')
    const weekDates = getWorkdays(absenceDate)
    const dates = fullWeekAbsence
      ? weekDates.filter(date => usualWorkdays.includes(new Date(`${date}T00:00:00`).getDay()))
      : [absenceDate]
    if (!fullWeekAbsence && !usualWorkdays.includes(new Date(`${absenceDate}T00:00:00`).getDay())) {
      setAbsenceError('Absences can only be added on usual workdays.')
      return
    }
    if (fullWeekAbsence && (!weeklyTarget || !dates.length)) {
      setAbsenceError('Set a weekly target and at least one usual workday first.')
      return
    }
    const datesToCheckForWork = fullWeekAbsence ? weekDates : dates
    if (datesToCheckForWork.some(date => entries.some(entry => entry.date === date))) {
      setAbsenceError('Remove the logged work before adding an absence.')
      return
    }
    if (dates.some(date => absences.some(absence => absence.start_date <= date && absence.end_date >= date))) {
      setAbsenceError('An absence already exists on one of these days.')
      return
    }
    const credits = fullWeekAbsence ? distributeHours(weeklyTarget, dates.length) : [Number(absenceHours)]
    if (credits.some(hours => !Number.isFinite(hours) || hours <= 0 || hours > 24)) {
      setAbsenceError('Enter credited hours between 0 and 24.')
      return
    }
    setSavingAbsence(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAbsenceError('Your session has expired. Please sign in again.')
      setSavingAbsence(false)
      return
    }
    const { error } = await supabase.from('absences').insert(dates.map((date, index) => ({ user_id: user.id, kind: absenceKind, start_date: date, end_date: date, hours_per_day: credits[index], note: absenceNote || null })))
    setSavingAbsence(false)
    if (error) { setAbsenceError(error.message); return }
    setAbsenceDate(null)
    onRefresh()
  }

  function renderLogForm(date: string) {
    if (logDate !== date) return []

    return [
      <form key={`${date}-form`} onSubmit={addEntry} className="border-b border-gray-100 bg-indigo-50/40 px-5 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end">
          <label className="text-xs font-medium text-gray-500">Start
            <input type="time" value={start} onChange={event => setStart(event.target.value)} required className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-gray-500">End
            <input type="time" value={end} onChange={event => setEnd(event.target.value)} required className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="col-span-2 text-xs font-medium text-gray-500 sm:col-span-1">Label <span className="font-normal text-gray-400">(optional)</span>
            <input value={label} onChange={event => setLabel(event.target.value)} placeholder="e.g. Deep work" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm" />
          </label>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <button type="button" onClick={() => setLogDate(null)} className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-600 ring-1 ring-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:bg-indigo-300">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lunch} onChange={event => setLunch(event.target.checked)} className="rounded" />
          Subtract 1h lunch break
        </label>
        {logError && <p className="mt-2 text-xs text-red-500">{logError}</p>}
      </form>,
    ]
  }

  function renderAbsenceForm(date: string) {
    if (absenceDate !== date) return []
    const text = absenceKind === 'vacation' ? 'Vacation' : 'Sick leave'
    return [
      <form key={`${date}-absence-form`} onSubmit={addAbsence} className="border-b border-gray-100 bg-amber-50/60 px-5 py-3">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={fullWeekAbsence} onChange={event => setFullWeekAbsence(event.target.checked)} className="rounded" />Full week on usual workdays</label>
        <div className="flex flex-wrap items-end gap-2">
          {!fullWeekAbsence && <label className="w-28 text-xs font-medium text-gray-500">Credited hours<input type="number" min="0.25" max="24" step="0.25" value={absenceHours} onChange={event => setAbsenceHours(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm" required /></label>}
          <label className="min-w-44 flex-1 text-xs font-medium text-gray-500">{text} note <span className="font-normal text-gray-400">(optional)</span><input value={absenceNote} onChange={event => setAbsenceNote(event.target.value)} placeholder="Add a note" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm" /></label>
          <button type="button" onClick={() => setAbsenceDate(null)} className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-600 ring-1 ring-gray-200">Cancel</button>
          <button type="submit" disabled={savingAbsence} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:bg-amber-300">{savingAbsence ? 'Saving…' : `Save ${text.toLowerCase()}`}</button>
        </div>
        {absenceError && <p className="mt-2 text-xs text-red-500">{absenceError}</p>}
      </form>,
    ]
  }

  function absenceActions(date: string) {
    return <div className="flex items-center gap-2"><button onClick={() => openAbsenceForm(date, 'vacation')} className="text-xs font-medium text-amber-600 hover:text-amber-800">Vacation</button><button onClick={() => openAbsenceForm(date, 'sick')} className="text-xs font-medium text-rose-500 hover:text-rose-700">Sick</button></div>
  }

  return (
    <div className="space-y-4">
      {weeks.map(week => {
        const open = isOpen(week.key)
        const credited = week.workdays.reduce((total, date) => {
          const absence = absences.find(item => item.start_date <= date && item.end_date >= date)
          return total + (absence ? Number(absence.hours_per_day) : 0)
        }, 0)
        const accounted = week.total + credited

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
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {formatHours(accounted)}{weeklyTarget > 0 && ` / ${formatHours(weeklyTarget)}`}
                </span>
              </div>
            </button>
            {open && (
              <div>
                {week.workdays.flatMap(date => {
                  const dayEntries = week.entries.filter(entry => entry.date === date)
                  const dayAbsence = absences.find(absence => absence.start_date <= date && absence.end_date >= date)

                  if (!dayEntries.length && !dayAbsence) {
                    return [
                      <div key={date} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400 w-24">{formatDate(date)}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-300">No time logged</span>
                          <button onClick={() => openLogForm(date)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">+ Time</button>
                          {usualWorkdays.includes(new Date(`${date}T00:00:00`).getDay()) && absenceActions(date)}
                        </div>
                      </div>,
                      ...renderLogForm(date),
                      ...renderAbsenceForm(date),
                    ]
                  }

                  return [
                    ...(dayAbsence ? [
                      <div key={`${date}-absence`} className="flex items-center justify-between border-b border-gray-50 bg-amber-50/50 px-5 py-2.5">
                        <div className="flex items-center gap-3"><span className="w-24 text-xs text-gray-400">{formatDate(date)}</span><span className="text-sm font-medium text-amber-700">{dayAbsence.kind === 'vacation' ? 'Vacation' : 'Sick leave'}</span><span className="text-xs text-amber-600">{formatHours(Number(dayAbsence.hours_per_day))} credited</span>{dayAbsence.note && <span className="text-xs italic text-gray-400">{dayAbsence.note}</span>}</div>
                        <button onClick={() => onEditAbsence(dayAbsence)} className="rounded p-1 text-xs text-gray-300 hover:bg-amber-100 hover:text-amber-600">✎</button>
                      </div>,
                    ] : []),
                    ...dayEntries.map((e, index) => (
                      <div key={e.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-gray-400 w-24">{formatDate(e.date)}</span>
                          <span className="text-sm text-gray-700">{e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}</span>
                          {e.label && <span className="text-xs text-gray-400 italic">{e.label}</span>}
                          {e.break_mins > 0 && <span className="text-xs text-gray-400 italic">−1h lunch</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-gray-700 min-w-[40px] text-right">{formatHours(e.dur)}</span>
                          {index === 0 && !dayAbsence && <button onClick={() => openLogForm(date)} className="text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded p-1 text-sm transition-colors">+</button>}
                          <button onClick={() => onEdit(e)} className="text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded p-1 text-xs transition-colors">✎</button>
                          <button onClick={() => deleteEntry(e.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-1 text-sm transition-colors">×</button>
                        </div>
                      </div>
                    )),
                    ...renderLogForm(date),
                    ...renderAbsenceForm(date),
                  ]
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
