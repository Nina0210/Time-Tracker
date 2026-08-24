'use client'

import { useState } from 'react'
import { createClient, getSessionUser } from '@/lib/supabase/client'
import { todayStr } from '@/lib/utils'

type LogKind = 'work' | 'vacation' | 'sick'

export default function AbsenceLogForm({ onSaved }: { onSaved: () => void }) {
  const [kind, setKind] = useState<LogKind>('work')
  const [date, setDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [lunch, setLunch] = useState(true)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const isWork = kind === 'work'

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(null)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    if (isWork && (weekday === 0 || weekday === 6)) { setMessage({ text: 'Worked time can only be logged Monday to Friday.', error: true }); return }
    if (isWork && (!startTime || !endTime || endTime <= startTime)) { setMessage({ text: 'Enter an end time after the start time.', error: true }); return }
    if (!isWork && endDate < date) { setMessage({ text: 'The end date must be on or after the start date.', error: true }); return }
    const supabase = createClient(); const user = await getSessionUser(supabase); if (!user) return
    setSaving(true)
    const result = isWork ? await supabase.from('time_entries').insert({ user_id: user.id, date, start_time: startTime, end_time: endTime, label: note || null, break_mins: lunch ? 60 : 0 }) : await supabase.from('absences').insert({ user_id: user.id, kind, start_date: date, end_date: endDate, hours_per_day: 24, note: note || null })
    setSaving(false)
    if (result.error) { setMessage({ text: result.error.message, error: true }); return }
    setStartTime(''); setEndTime(''); setNote(''); setMessage({ text: isWork ? 'Worked time logged.' : `${kind === 'vacation' ? 'Vacation' : 'Sick leave'} logged.` }); onSaved()
  }

  return <section className="bg-white rounded-xl shadow-sm p-5 mb-6"><h2 className="text-sm font-semibold text-gray-700 mb-1">Log time</h2><p className="text-xs text-gray-400 mb-4">Log worked time for one day, or vacation and sick leave for a date range.</p><form onSubmit={submit}>
    <fieldset className="flex gap-2 mb-4">{([['work', 'Worked time'], ['vacation', 'Vacation'], ['sick', 'Sick leave']] as const).map(([value, text]) => <label key={value} className={`cursor-pointer rounded-md px-3 py-1.5 text-sm border ${kind === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}><input type="radio" checked={kind === value} onChange={() => setKind(value)} className="sr-only" />{text}</label>)}</fieldset>
    <div className={`grid grid-cols-1 ${isWork ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 mb-3`}><label className="text-xs font-medium text-gray-500">{isWork ? 'Date' : 'From'}<input type="date" value={date} onChange={event => { setDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm" required /></label>{isWork ? <><label className="text-xs font-medium text-gray-500">Start<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm" required /></label><label className="text-xs font-medium text-gray-500">End<input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm" required /></label></> : <label className="text-xs font-medium text-gray-500">To<input type="date" min={date} value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm" required /></label>}</div>
    <input value={note} onChange={event => setNote(event.target.value)} placeholder={isWork ? 'Label (optional)' : 'Note (optional)'} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
    {isWork && <label className="flex items-center gap-2 mb-3 cursor-pointer"><input type="checkbox" checked={lunch} onChange={event => setLunch(event.target.checked)} className="rounded" /><span className="text-sm text-gray-700">Subtract 1h lunch break</span></label>}
    <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium">{saving ? 'Saving…' : isWork ? 'Log worked time' : 'Log absence'}</button>{message && <p className={`text-xs mt-3 ${message.error ? 'text-red-500' : 'text-emerald-600'}`}>{message.text}</p>}
  </form></section>
}
