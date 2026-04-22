'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayStr } from '@/lib/utils'

export default function LogForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(todayStr())
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (end <= start) {
      setMessage({ text: 'End time must be after start time.', type: 'error' })
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('time_entries').insert({
      user_id: user!.id, date, start_time: start, end_time: end,
      label: label || null, break_mins: 0,
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setLabel('')
      setMessage({ text: 'Entry added!', type: 'success' })
      setTimeout(() => setMessage(null), 2000)
      onSaved()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Log Time</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} required
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} required
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Label <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Deep work, Meetings, Admin…"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            Add Entry
          </button>
          {message && (
            <span className={`text-xs ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
