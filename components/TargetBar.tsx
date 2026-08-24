'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialTarget: number
  initialWorkdays: number[]
  onChanged: (target: number, workdays: number[]) => void
  onWorkdaysChanged: (workdays: number[]) => void
}

const weekdays = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri']] as const

export default function TargetBar({ initialTarget, initialWorkdays, onChanged, onWorkdaysChanged }: Props) {
  const [value, setValue] = useState(initialTarget > 0 ? String(initialTarget) : '')
  const [workdays, setWorkdays] = useState(initialWorkdays)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0 || !workdays.length) return
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { weekly_target: num, usual_workdays: workdays } })
    onChanged(num, workdays)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm px-5 py-3.5 mb-6 flex items-center gap-3 flex-wrap">
      <label htmlFor="weekly-target" className="text-sm font-medium text-gray-600 whitespace-nowrap">
        Weekly target (hours):
      </label>
      <input
        id="weekly-target"
        type="number"
        min="0"
        max="168"
        step="0.5"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. 40"
        className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Usual workdays</legend>
        {weekdays.map(([day, text]) => <label key={day} className={`cursor-pointer rounded px-2 py-1 text-xs ${workdays.includes(day) ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-50 text-gray-400'}`}><input type="checkbox" checked={workdays.includes(day)} onChange={() => { const next = workdays.includes(day) ? workdays.filter(value => value !== day) : [...workdays, day].sort(); setWorkdays(next); setSaved(false); onWorkdaysChanged(next) }} className="sr-only" />{text}</label>)}
      </fieldset>
      <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
        Save
      </button>
      {saved && <span className="text-xs text-green-600">Saved!</span>}
    </div>
  )
}
