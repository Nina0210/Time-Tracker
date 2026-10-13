'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function OvertimeReductionForm({ initialDate, defaultHours = 7, onClose, onSaved }: {
  initialDate?: string
  defaultHours?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(initialDate ?? localToday())
  const [hours, setHours] = useState(String(defaultHours))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const taken = date <= localToday()

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    const amount = Number(hours)
    if (!date || !Number.isFinite(amount) || amount < 0.25 || amount > 168) {
      setError('Choose a date and enter hours between 0.25 and 168.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Your session has expired. Sign in again.'); return }
      const { error: saveError } = await supabase.from('overtime_reduction_plans').insert({
        user_id: user.id, planned_date: date, hours: amount, note: note.trim() || null, time_taken: date <= localToday(),
      })
      if (saveError) { setError(saveError.message); return }
      onSaved()
      onClose()
    } catch {
      setError('Could not save the overtime reduction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={save} className="border-t border-gray-100 p-4">
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-gray-500">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} required className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm" /></label>
      <label className="w-24 text-xs text-gray-500">Hours<input type="number" min="0.25" max="168" step="0.25" value={hours} onChange={event => setHours(event.target.value)} required className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" /></label>
      <label className="min-w-32 flex-1 text-xs text-gray-500">Note (optional)<input value={note} onChange={event => setNote(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" /></label>
      <button type="button" onClick={onClose} disabled={saving} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm">Cancel</button>
      <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : taken ? 'Save reduction' : 'Plan reduction'}</button>
    </div>
    <p className="mt-2 text-xs text-gray-500">{taken ? 'Recorded as time taken and deducted from your total time balance.' : 'Reserved from your total time balance. Confirm time taken on or after this date.'}</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
  </form>
}
