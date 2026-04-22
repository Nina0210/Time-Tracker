'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialTarget: number
  onChanged: (t: number) => void
}

export default function TargetBar({ initialTarget, onChanged }: Props) {
  const [value, setValue] = useState(initialTarget > 0 ? String(initialTarget) : '')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { weekly_target: num } })
    onChanged(num)
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
      <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
        Save
      </button>
      {saved && <span className="text-xs text-green-600">Saved!</span>}
    </div>
  )
}
