'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TimeEntry } from '@/lib/utils'
import Timer from '@/components/Timer'
import LogForm from '@/components/LogForm'
import WeeklyEntries from '@/components/WeeklyEntries'
import EditModal from '@/components/EditModal'
import TargetBar from '@/components/TargetBar'

export default function DashboardPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [email, setEmail] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState(0)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
    if (data) setEntries(data)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      setWeeklyTarget(parseFloat(user.user_metadata?.weekly_target || '0'))
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

      <TargetBar initialTarget={weeklyTarget} onChanged={setWeeklyTarget} />
      <Timer onSaved={loadEntries} />
      <LogForm onSaved={loadEntries} />
      <WeeklyEntries
        entries={entries}
        weeklyTarget={weeklyTarget}
        onEdit={setEditEntry}
        onRefresh={loadEntries}
      />
      <EditModal
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={loadEntries}
      />
    </div>
  )
}
