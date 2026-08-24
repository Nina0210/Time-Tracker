'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Absence, OvertimeReductionPlan, TimeEntry } from '@/lib/utils'
import WeeklyEntries from '@/components/WeeklyEntries'
import EditModal from '@/components/EditModal'
import TargetBar from '@/components/TargetBar'
import EditAbsenceModal from '@/components/EditAbsenceModal'
import OvertimeBalance from '@/components/OvertimeBalance'

export default function DashboardPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [email, setEmail] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState(0)
  const [usualWorkdays, setUsualWorkdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const [absences, setAbsences] = useState<Absence[]>([])
  const [editAbsence, setEditAbsence] = useState<Absence | null>(null)
  const [plans, setPlans] = useState<OvertimeReductionPlan[]>([])
  const router = useRouter()
  const supabase = createClient()

  const loadEntries = useCallback(async () => {
    const [entriesResult, absencesResult, plansResult] = await Promise.all([
      supabase.from('time_entries').select('*').order('date', { ascending: false }).order('start_time', { ascending: false }),
      supabase.from('absences').select('*').order('start_date', { ascending: false }),
      supabase.from('overtime_reduction_plans').select('*').order('planned_date', { ascending: true }),
    ])
    if (entriesResult.data) setEntries(entriesResult.data)
    if (absencesResult.data) setAbsences(absencesResult.data)
    if (plansResult.data) setPlans(plansResult.data)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      setWeeklyTarget(parseFloat(user.user_metadata?.weekly_target || '0'))
      const savedWorkdays = user.user_metadata?.usual_workdays
      if (Array.isArray(savedWorkdays) && savedWorkdays.length) setUsualWorkdays(savedWorkdays.map(Number))
      setSettingsLoaded(true)
      loadEntries()
    }
    init()
  }, [supabase, router, loadEntries])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Time Tracker</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{email}</span>
          <button onClick={signOut} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <OvertimeBalance entries={entries} absences={absences} plans={plans} weeklyTarget={weeklyTarget} onRefresh={loadEntries} />
      {settingsLoaded && <TargetBar initialTarget={weeklyTarget} initialWorkdays={usualWorkdays} onChanged={(target, workdays) => { setWeeklyTarget(target); setUsualWorkdays(workdays) }} onWorkdaysChanged={setUsualWorkdays} />}
      <WeeklyEntries
        entries={entries}
        absences={absences}
        plans={plans}
        weeklyTarget={weeklyTarget}
        usualWorkdays={usualWorkdays}
        onEdit={setEditEntry}
        onEditAbsence={setEditAbsence}
        onRefresh={loadEntries}
      />
      <EditAbsenceModal absence={editAbsence} onClose={() => setEditAbsence(null)} onSaved={loadEntries} />
      <EditModal
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={loadEntries}
      />
    </div>
  )
}
