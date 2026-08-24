export interface TimeEntry {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  label: string | null
  break_mins: number
}

export interface Absence {
  id: string
  user_id: string
  start_date: string
  end_date: string
  kind: 'vacation' | 'sick'
  hours_per_day: number
  note: string | null
}

export function durationHours(start: string, end: string, breakMins = 0) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60 - breakMins / 60
}

export function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}

export function getWeekBounds(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const toMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + toMon)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return { key: mon.toISOString().slice(0, 10), label: `${fmt(mon)} – ${fmt(fri)}` }
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
