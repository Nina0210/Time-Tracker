'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Absence } from '@/lib/utils'

export default function EditAbsenceModal({ absence, onClose, onSaved }: { absence: Absence | null; onClose: () => void; onSaved: () => void }) {
  if (!absence) return null
  return <Content key={absence.id} absence={absence} onClose={onClose} onSaved={onSaved} />
}

function Content({ absence, onClose, onSaved }: { absence: Absence; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState(absence.kind)
  const [startDate, setStartDate] = useState(absence.start_date)
  const [endDate, setEndDate] = useState(absence.end_date)
  const [hours, setHours] = useState(String(absence.hours_per_day))
  const [note, setNote] = useState(absence.note || '')
  const [error, setError] = useState('')
  async function save() {
    if (endDate < startDate) { setError('The end date must be on or after the start date.'); return }
    const creditedHours = Number(hours)
    if (!Number.isFinite(creditedHours) || creditedHours <= 0 || creditedHours > 24) { setError('Enter credited hours between 0 and 24.'); return }
    const { error } = await createClient().from('absences').update({ kind, start_date: startDate, end_date: endDate, hours_per_day: creditedHours, note: note || null }).eq('id', absence.id)
    if (error) { setError(error.message); return }; onSaved(); onClose()
  }
  async function remove() { await createClient().from('absences').delete().eq('id', absence.id); onSaved(); onClose() }
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={event => event.stopPropagation()}><h3 className="font-semibold mb-4">Edit absence</h3><div className="grid grid-cols-2 gap-3 mb-3"><label className="text-xs text-gray-500">Type<select value={kind} onChange={event => setKind(event.target.value as Absence['kind'])} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"><option value="vacation">Vacation</option><option value="sick">Sick leave</option></select></label><label className="text-xs text-gray-500">Credited hours<input type="number" min="0.25" max="24" step="0.25" value={hours} onChange={event => setHours(event.target.value)} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" /></label><label className="text-xs text-gray-500">From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" /></label><label className="text-xs text-gray-500">To<input type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" /></label></div><input value={note} onChange={event => setNote(event.target.value)} placeholder="Note (optional)" className="w-full border rounded-md px-3 py-2 text-sm mb-3" />{error && <p className="text-xs text-red-500 mb-3">{error}</p>}<div className="flex justify-between"><button onClick={remove} className="text-sm text-red-600">Delete</button><div className="flex gap-2"><button onClick={onClose} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md">Cancel</button><button onClick={save} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md">Save</button></div></div></div></div>
}
