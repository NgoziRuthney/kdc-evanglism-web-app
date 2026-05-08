import { useState, useMemo } from 'react'
import { downloadConvertsDocx } from '../utils/docxExport'
import { MINISTRIES } from '../utils/formConstants'

export default function DownloadModal({ converts, profiles = [], onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [ministryFilter, setMinistryFilter] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // Build set of user IDs in selected ministry
  const ministryUserIds = useMemo(() => {
    if (!ministryFilter) return null
    const ids = new Set()
    profiles.forEach(p => {
      if (p.ministry_department === ministryFilter) ids.add(p.id)
    })
    return ids
  }, [profiles, ministryFilter])

  const filtered = useMemo(() => {
    if (!converts) return []
    return converts.filter(c => {
      const d = c.date_reached
      if (d < fromDate || d > toDate) return false
      if (ministryUserIds && !ministryUserIds.has(c.submitted_by)) return false
      return true
    })
  }, [converts, fromDate, toDate, ministryUserIds])

  async function handleDownload() {
    if (!filtered.length) {
      setError('No records found in this date range.')
      return
    }
    setDownloading(true)
    setError('')
    try {
      await downloadConvertsDocx(filtered, fromDate, toDate)
    } catch (err) {
      setError('Failed to generate document. Please try again.')
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-navy-900 text-base">Download Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select date range to export as DOCX</p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From</label>
              <input type="date" value={fromDate}
                onChange={e => { setFromDate(e.target.value); setError('') }}
                className="input-field" max={toDate}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={toDate}
                onChange={e => { setToDate(e.target.value); setError('') }}
                className="input-field" min={fromDate} max={today}
              />
            </div>
          </div>

          {/* Ministry filter */}
          <div>
            <label className="label">Filter by Ministry <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
            <select value={ministryFilter} onChange={e => setMinistryFilter(e.target.value)}
              className="input-field">
              <option value="">None (All Ministries)</option>
              {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Count preview */}
          <div className={`rounded-xl p-4 text-center ${filtered.length > 0 ? 'bg-navy-50 border border-navy-100' : 'bg-gray-50 border border-gray-100'}`}>
            <p className="text-3xl font-bold text-navy-900">{filtered.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {filtered.length === 1 ? 'convert found' : 'converts found'} in this range
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDownload} disabled={downloading || !filtered.length}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <span>⬇</span> Download Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
