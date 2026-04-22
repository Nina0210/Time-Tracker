'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/utils'

interface Props {
  entry: TimeEntry | null
  onClose: () => void
  onSaved: () => void
}

export default function EditModal({ entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [label, setLabel] = useState('')
  const [lunch, setLunch] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setStart(entry.start_time.slice(0, 5))
      setEnd(entry.end_time.slice(0, 5))
      setLabel(entry.label || '')
      setLunch((entry.break_mins || 0) >= 60)
      setError('')
    }
  }, [entry])

  if (!entry) return null

  async function handleSave() {
    setError('')
    if (!date || !start || !end) { setError('All fields are required.'); return }
    if (end <= start) { setError('End time must be after start time.'); return }

    const supabase = createClient()
    const { error: err } = await supabase.from('time_entries').update({
      date, start_time: start, end_time: end,
      label: label || null,
      break_mins: lunch ? 60 : 0,
    }).eq('id', entry!.id)

    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4">Edit Entry</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Label <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Deep work, Meetings…"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={lunch} onChange={e => setLunch(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">Subtract 1h lunch break</span>
        </label>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-md text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
