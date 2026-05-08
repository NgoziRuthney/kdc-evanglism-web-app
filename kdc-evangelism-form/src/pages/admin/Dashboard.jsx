import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchConverts, deleteConvert, fetchProfiles } from '../../utils/supabase'
import { cacheAllConverts, getCachedConverts, upsertCachedConvert, removeCachedConvert, getLastSync } from '../../utils/indexedDB'
import TypingTitle from '../../components/TypingTitle'
import AddConvertModal from '../../components/AddConvertModal'
import EditConvertModal from '../../components/EditConvertModal'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'
import DownloadModal from '../../components/DownloadModal'
import ContextMenu from '../../components/ContextMenu'
import { useToast } from '../../components/Toast'

const COLS = [
  { key: 'full_name', label: 'Name of Convert / Invitee', width: 'min-w-[160px]' },
  { key: 'gender', label: 'Gender', width: 'min-w-[80px]' },
  { key: 'phone_calling', label: 'Phone (Calling)', width: 'min-w-[120px]' },
  { key: 'phone_whatsapp', label: 'Phone (WhatsApp)', width: 'min-w-[130px]' },
  { key: 'date_reached', label: 'Date Reached', width: 'min-w-[110px]' },
  { key: 'location_address', label: 'Location Address', width: 'min-w-[160px]' },
  { key: 'salvation_status', label: 'Salvation Status', width: 'min-w-[130px]' },
  { key: 'occupation', label: 'Occupation', width: 'min-w-[140px]' },
  { key: 'level_of_response', label: 'Level of Response', width: 'min-w-[130px]' },
  { key: 'visited_kdc', label: 'Visited KDC', width: 'min-w-[100px]' },
  { key: 'remark', label: 'Other Remarks', width: 'min-w-[160px]' },
  { key: 'minister_name', label: 'Name of Minister', width: 'min-w-[150px]' }
]

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard() {
  const toast = useToast()
  const [converts, setConverts] = useState([])
  const [profiles, setProfilesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lastSync, setLastSyncState] = useState(null)

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, convert }
  const longPressTimerRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      // Show cached data first for instant load
      const cached = await getCachedConverts()
      if (cached.length > 0) {
        setConverts(cached)
        setLoading(false)
      }
      // Then fetch fresh from Supabase
      const fresh = await fetchConverts()
      setConverts(fresh)
      await cacheAllConverts(fresh)
      // Fetch profiles for ministry filtering
      try { const p = await fetchProfiles(); setProfilesList(p) } catch { }
      const ts = await getLastSync()
      setLastSyncState(ts)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch converts:', err)
      setLoading(false)
      toast('Could not load data from server. Showing cached data.', 'warning')
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  // Daily count (today)
  const todayCount = converts.filter(c => c.date_reached === todayISO()).length

  // Filtered by search
  const filtered = converts.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone_calling?.includes(q) ||
      c.phone_whatsapp?.includes(q) ||
      c.location_address?.toLowerCase().includes(q)
    )
  })

  // Context menu handlers
  function handleContextMenu(e, convert) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, convert })
  }

  function handleLongPressStart(convert) {
    longPressTimerRef.current = setTimeout(() => {
      // Get center of screen for mobile
      setCtxMenu({ x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 50, convert })
    }, 600)
  }

  function handleLongPressEnd() {
    clearTimeout(longPressTimerRef.current)
  }

  // Add / Edit / Delete handlers
  function handleAdded(newRecords) {
    const records = Array.isArray(newRecords) ? newRecords : [newRecords]
    setConverts(prev => [...records, ...prev])
    records.forEach(r => upsertCachedConvert(r))
    toast(`${records.length} convert record${records.length !== 1 ? 's' : ''} added successfully!`, 'success')
  }

  function handleUpdated(updated) {
    setConverts(prev => prev.map(c => c.id === updated.id ? updated : c))
    upsertCachedConvert(updated)
    toast('Record updated successfully!', 'success')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteConvert(deleteTarget.id)
      setConverts(prev => prev.filter(c => c.id !== deleteTarget.id))
      removeCachedConvert(deleteTarget.id)
      toast('Record deleted.', 'info')
      setDeleteTarget(null)
    } catch (err) {
      toast('Failed to delete record.', 'error')
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  // Badge colors
  const responseBadge = { High: 'bg-emerald-100 text-emerald-700', Middle: 'bg-amber-100 text-amber-700', Low: 'bg-red-100 text-red-700' }
  const salvationBadge = { 'Saved Believer': 'bg-blue-100 text-blue-700', 'Yet to be Saved': 'bg-orange-100 text-orange-700' }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Admin Dashboard</p>
        <h1 className="text-2xl font-bold text-navy-900 mt-1">
          Welcome, <TypingTitle />
        </h1>
      </div>

      {/* Stat cards + action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Today's Souls Added</p>
          <p className="text-4xl font-bold text-navy-900 mt-1">{todayCount}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(todayISO())}</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Records</p>
          <p className="text-4xl font-bold text-navy-900 mt-1">{converts.length}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>

        <button onClick={() => setShowAdd(true)}
          className="card p-5 text-left hover:bg-navy-50 hover:border-navy-200 transition-colors group cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center text-sm group-hover:bg-navy-800">✚</span>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Add Convert</p>
          </div>
          <p className="text-sm font-semibold text-navy-900">Enter New Convert Details</p>
        </button>

        <button onClick={() => setShowDownload(true)}
          className="card p-5 text-left hover:bg-emerald-50 hover:border-emerald-200 transition-colors group cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm">⬇</span>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Export</p>
          </div>
          <p className="text-sm font-semibold text-gray-800">Download Document</p>
        </button>
      </div>

      {/* Last sync */}
      {lastSync && (
        <p className="text-xs text-gray-300 -mt-2">
          Last synced {new Date(lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name, phone number, or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-2 rounded-lg">
              Clear
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-400 mt-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
        )}
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-300 -mt-2 hidden md:block">
        💡 Right-click any row to edit or delete. On mobile, long-press a row.
      </p>
      <p className="text-xs text-gray-300 -mt-2 md:hidden">
        💡 Long-press any row to edit or delete.
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">{search ? 'No matching records found.' : 'No converts recorded yet.'}</p>
            <p className="text-xs mt-1">{search ? 'Try a different search term.' : 'Click "Enter New Convert Details" to add the first record.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide min-w-[40px] sticky left-0 bg-navy-900">#</th>
                  {COLS.map(col => (
                    <th key={col.key}
                      className={`px-3 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap ${col.width}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={c.id}
                    className="border-t border-gray-100 table-row-selectable select-none"
                    onContextMenu={e => handleContextMenu(e, c)}
                    onTouchStart={() => handleLongPressStart(c)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchMove={handleLongPressEnd}
                  >
                    <td className="px-3 py-3 text-gray-400 text-xs sticky left-0 bg-inherit">{idx + 1}</td>
                    <td className="px-3 py-3 font-medium text-navy-900 whitespace-nowrap">{c.full_name || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{c.gender || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{c.phone_calling || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{c.phone_whatsapp || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(c.date_reached)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{c.location_address || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${salvationBadge[c.salvation_status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.salvation_status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{c.occupation || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${responseBadge[c.level_of_response] || 'bg-gray-100 text-gray-600'}`}>
                        {c.level_of_response || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.visited_kdc === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.visited_kdc || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate">{c.remark || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{c.minister_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          onEdit={() => setEditTarget(ctxMenu.convert)}
          onDelete={() => setDeleteTarget(ctxMenu.convert)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Modals */}
      {showAdd && <AddConvertModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {showDownload && <DownloadModal converts={converts} profiles={profiles} onClose={() => setShowDownload(false)} />}
      {editTarget && (
        <EditConvertModal convert={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Convert Record"
          message={`Are you sure you want to permanently delete the record for "${deleteTarget.full_name}"?`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
