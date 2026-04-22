'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pad, todayStr } from '@/lib/utils'

export default function Timer({ onSaved }: { onSaved: () => void }) {
  const [running, setRunning] = useState(false)
  const [display, setDisplay] = useState('00:00:00')
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState('')
  const startRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start() {
    startRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current!) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setDisplay(`${pad(h)}:${pad(m)}:${pad(s)}`)
    }, 1000)
    setRunning(true)
    setStatus(`Started at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  async function stop() {
    clearInterval(intervalRef.current!)
    const end = new Date()
    const startDate = new Date(startRef.current!)
    const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('time_entries').insert({
      user_id: user!.id,
      date: todayStr(),
      start_time: toTime(startDate),
      end_time: toTime(end),
      label: label || null,
      break_mins: 0,
    })
    setRunning(false)
    setDisplay('00:00:00')
    startRef.current = null
    if (error) {
      setStatus('Error saving entry.')
    } else {
      setStatus(`Saved: ${toTime(startDate)} – ${toTime(end)}`)
      setLabel('')
      onSaved()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 text-center">
      <h2 className="text-sm font-semibold text-gray-700 text-left mb-4">Timer</h2>
      <div className={`text-5xl font-light tracking-widest tabular-nums mb-4 ${running ? 'text-indigo-600' : 'text-gray-900'}`}>
        {display}
      </div>
      <div className="flex justify-center mb-4">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex justify-center gap-3">
        {!running ? (
          <button onClick={start} className="bg-green-600 hover:bg-green-700 text-white px-7 py-2 rounded-md text-sm font-medium transition-colors">
            Start
          </button>
        ) : (
          <button onClick={stop} className="bg-red-500 hover:bg-red-600 text-white px-7 py-2 rounded-md text-sm font-medium transition-colors">
            Stop & Save
          </button>
        )}
      </div>
      {status && <p className="mt-3 text-xs text-gray-500">{status}</p>}
    </div>
  )
}
