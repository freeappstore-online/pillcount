import { initApp } from '@freeappstore/sdk'
import { Shell } from '@freeappstore/sdk/ui'
import { useState, useEffect, useCallback } from 'react'

const fas = initApp({ appId: 'pillcount' })

const STORAGE_KEY = 'pillcount-data'

interface PillData {
  startDate: string       // ISO date (YYYY-MM-DD)
  timestamps: string[]    // ISO datetime for each pill taken
}

function load(): PillData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function save(data: PillData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function toLocalDate(iso: string): string {
  // For YYYY-MM-DD dates, parse as local (not UTC) by appending T00:00:00
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function toLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
}

/** Returns today's date as YYYY-MM-DD in local timezone. */
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns the local YYYY-MM-DD portion of an ISO datetime string. */
function localDateOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function App() {
  const [data, setData] = useState<PillData | null>(load)

  useEffect(() => {
    if (data) save(data)
    else localStorage.removeItem(STORAGE_KEY)
  }, [data])

  const takePill = useCallback(() => {
    const now = new Date().toISOString()
    setData(prev => {
      if (!prev) return { startDate: todayISO(), timestamps: [now] }
      return { ...prev, timestamps: [...prev.timestamps, now] }
    })
  }, [])

  const undo = useCallback(() => {
    setData(prev => {
      if (!prev || prev.timestamps.length === 0) return prev
      const ts = prev.timestamps.slice(0, -1)
      if (ts.length === 0) return null
      return { ...prev, timestamps: ts }
    })
  }, [])

  const reset = useCallback(() => {
    if (confirm('Reset all pill data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY)
      setData(null)
    }
  }, [])

  const total = data?.timestamps.length ?? 0
  const today = todayISO()
  const dayNumber = data ? daysBetween(data.startDate, today) : 0
  const todayPills = data?.timestamps.filter(t => localDateOf(t) === today) ?? []

  return (
    <Shell app={fas} appName="Pill Count">
      <div className="flex flex-1 flex-col items-center gap-8 px-4 py-8" style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Big count */}
        <div className="text-center">
          <div className="text-7xl font-bold" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {total}
          </div>
          <div className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            pills taken
          </div>
        </div>

        {/* Take pill button */}
        <button
          onClick={takePill}
          className="rounded-2xl px-10 py-4 text-lg font-bold transition-transform active:scale-95"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            border: 'none',
            width: '100%',
            maxWidth: 320,
          }}
        >
          Take Pill
        </button>

        {/* Stats */}
        {data && (
          <div
            className="grid w-full grid-cols-3 gap-3 rounded-xl p-4"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
          >
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Day {dayNumber}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>current</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{todayPills.length}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>today</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                {toLocalDate(data.startDate)}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>started</div>
            </div>
          </div>
        )}

        {/* Today's log */}
        {todayPills.length > 0 && (
          <div className="w-full">
            <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              Today's log
            </h2>
            <div
              className="rounded-xl"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
            >
              {todayPills.map((t, i) => (
                <div
                  key={t + '-' + i}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < todayPills.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    Pill #{total - todayPills.length + i + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>
                    {toLocalTime(t)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full history */}
        {data && data.timestamps.length > todayPills.length && (
          <details className="w-full">
            <summary
              className="cursor-pointer text-sm font-medium"
              style={{ color: 'var(--muted)' }}
            >
              Full history ({data.timestamps.length} pills)
            </summary>
            <div
              className="mt-2 max-h-64 overflow-y-auto rounded-xl"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
            >
              {[...data.timestamps].reverse().map((t, i) => (
                <div
                  key={t + i}
                  className="flex items-center justify-between px-4 py-2"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                    #{data.timestamps.length - i}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {toLocalDate(t)} {toLocalTime(t)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Actions */}
        {data && (
          <div className="flex gap-3">
            <button
              onClick={undo}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--glass)', color: 'var(--ink)', border: '1px solid var(--line)' }}
            >
              Undo last
            </button>
            <button
              onClick={reset}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--glass)', color: 'var(--error)', border: '1px solid var(--line)' }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}
