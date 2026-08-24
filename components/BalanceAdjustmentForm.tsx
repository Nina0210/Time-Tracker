'use client'

import { useState } from 'react'
import { createClient, getSessionUser } from '@/lib/supabase/client'
import { BalanceAdjustment, formatDate, todayStr } from '@/lib/utils'

export default function BalanceAdjustmentForm({ adjustments, onChanged }: { adjustments: BalanceAdjustment[]; onChanged: () => void }) {
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function add() {
    const amount = Number(hours)
    if (!amount) { setError('Enter a positive or negative number of hours.'); return }
    const supabase = createClient()
    const user = await getSessionUser(supabase)
    if (!user) { setError('Your session has expired. Sign in again.'); return }
    const { error: err } = await supabase.from('balance_adjustments').insert({ user_id: user!.id, effective_date: date, hours: amount, note: note || null })
    if (err) { setError(err.message); return }
    setHours(''); setNote(''); setError(''); onChanged()
  }

  async function remove(id: string) {
    await createClient().from('balance_adjustments').delete().eq('id', id)
    onChanged()
  }

  return <section className="bg-white rounded-xl shadow-sm p-5 mb-6">
    <h2 className="text-sm font-semibold text-gray-700 mb-1">Balance corrections</h2>
    <p className="text-xs text-gray-400 mb-4">Add an opening balance or an official correction. Use a negative value to subtract time.</p>
    <div className="grid sm:grid-cols-[1fr_1fr_1.5fr_auto] gap-2 mb-3">
      <input type="number" step="0.25" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours, e.g. 12.5" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason (optional)" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <button onClick={add} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium">Add</button>
    </div>
    {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
    {adjustments.length > 0 && <div className="space-y-1">
      {[...adjustments].sort((a, b) => b.effective_date.localeCompare(a.effective_date)).map(a => <div key={a.id} className="flex justify-between text-xs text-gray-500 py-1">
        <span>{a.hours > 0 ? '+' : ''}{a.hours}h · {formatDate(a.effective_date)}{a.note ? ` · ${a.note}` : ''}</span>
        <button onClick={() => remove(a.id)} className="text-gray-300 hover:text-red-500">×</button>
      </div>)}
    </div>}
  </section>
}
