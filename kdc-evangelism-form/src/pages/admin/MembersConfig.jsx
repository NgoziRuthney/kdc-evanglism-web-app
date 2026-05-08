import { useState, useEffect, useRef, useMemo } from 'react'
import {
  fetchProfiles, fetchPendingActions, initiateAdminRemoval,
  confirmAdminRemoval, cancelPendingAction, supabase, fetchConverts
} from '../../utils/supabase'
import { createUser, deleteUser, downgradeAdmin } from '../../utils/adminApi'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'
import ContextMenu from '../../components/ContextMenu'
import { MINISTRIES } from '../../utils/formConstants'

// ─── ADD MEMBER MODAL ────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', password: '', role: 'member', department: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!/^\d{11}$/.test(form.phoneNumber)) {
      setError('Phone number must be exactly 11 digits.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await createUser(form)
      onCreated(result.profile)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create member. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-navy-900">Add New Member</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Full name" required value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="input-field" disabled={loading} />
          </div>
          <div>
            <label className="label">Phone Number <span className="text-red-500">*</span></label>
            <input
              type="tel" inputMode="numeric" pattern="[0-9]*"
              placeholder="11-digit number"
              value={form.phoneNumber}
              onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
              className="input-field" maxLength={11} required disabled={loading}
            />
            <p className={`text-xs mt-1 ${form.phoneNumber.length === 11 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {form.phoneNumber.length}/11
            </p>
          </div>
          <div>
            <label className="label">Role <span className="text-red-500">*</span></label>
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="input-field" disabled={loading}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Ministry Department <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
            <select value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="input-field" disabled={loading}>
              <option value="">None</option>
              {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field pr-10" required minLength={8} disabled={loading}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              ) : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── EDIT MEMBER MODAL ───────────────────────────────────────────────────────
// Bug #3 fixed: uses statically imported `supabase` directly — no dynamic import, not from useAuth
// Bug #4 fixed: removed the double dynamic import() inside the submit handler
function EditMemberModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: member.full_name, role: member.role, department: member.ministry_department || '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fullName.trim()) {
      setError('Full name is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .update({ full_name: form.fullName.trim(), role: form.role, ministry_department: form.department || null })
        .eq('id', member.id)
        .select()
        .single()
      if (err) throw err
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update member.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-navy-900">Edit Member</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="input-field" required disabled={loading} />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input type="text" value={member.phone_number}
              className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" disabled />
            <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed.</p>
          </div>
          <div>
            <label className="label">Role</label>
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="input-field" disabled={loading}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Ministry Department <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
            <select value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="input-field" disabled={loading}>
              <option value="">None</option>
              {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MEMBER ROW ──────────────────────────────────────────────────────────────
// Bug #5 fixed: defined OUTSIDE the parent component — no remount on every parent re-render
// Bug #6 fixed: always renders 5 <td> elements — "You" badge is inside the cell, not a conditional cell
function MemberRow({ p, currentUserId, convertCounts, onContextMenu, onLongPressStart, onLongPressEnd }) {
  const counts = convertCounts[p.id] || { total: 0, thisMonth: 0 }
  return (
    <tr
      className="border-t border-gray-100 table-row-selectable select-none"
      onContextMenu={e => onContextMenu(e, p)}
      onTouchStart={() => onLongPressStart(p)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
    >
      <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
      <td className="px-4 py-3 font-mono text-sm text-gray-600">{p.phone_number}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.role === 'admin' ? 'bg-blue-100 text-navy-900' : 'bg-gray-100 text-gray-600'
          }`}>
          {p.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
        {p.ministry_department || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center font-medium">{counts.thisMonth}</td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center font-medium">{counts.total}</td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(p.created_at).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        })}
      </td>
      <td className="px-4 py-3 text-center w-12">
        {p.id === currentUserId && (
          <span className="text-xs text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
            You
          </span>
        )}
      </td>
    </tr>
  )
}

const TABLE_HEADERS = ['Name', 'Phone', 'Role', 'Department', 'This Month', 'Total', 'Added', '']

function ProfileTable({ rows, title, badge, convertCounts, onContextMenu, onLongPressStart, onLongPressEnd, currentUserId }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${badge}`}>
          {title[0]}
        </span>
        <h2 className="font-bold text-navy-900 text-sm">{title} ({rows.length})</h2>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          {title === 'Admins' ? 'No admins found.' : 'No members yet. Add one above.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {TABLE_HEADERS.map((h, i) => (
                  <th key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <MemberRow
                  key={p.id}
                  p={p}
                  currentUserId={currentUserId}
                  convertCounts={convertCounts}
                  onContextMenu={onContextMenu}
                  onLongPressStart={onLongPressStart}
                  onLongPressEnd={onLongPressEnd}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function MembersConfig() {
  const { user } = useAuth()
  const toast = useToast()
  const [profiles, setProfiles] = useState([])
  const [allConverts, setAllConverts] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [ministryFilter, setMinistryFilter] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [ctxMenu, setCtxMenu] = useState(null)
  const longPressRef = useRef(null)

  // Compute convert counts per user
  const convertCounts = useMemo(() => {
    const counts = {}
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    allConverts.forEach(c => {
      if (!c.submitted_by) return
      if (!counts[c.submitted_by]) counts[c.submitted_by] = { total: 0, thisMonth: 0 }
      counts[c.submitted_by].total++
      if (c.date_reached >= monthStart) counts[c.submitted_by].thisMonth++
    })
    return counts
  }, [allConverts])

  // Filter profiles by ministry
  const filteredProfiles = useMemo(() => {
    if (!ministryFilter) return profiles
    return profiles.filter(p => p.ministry_department === ministryFilter)
  }, [profiles, ministryFilter])

  const admins = filteredProfiles.filter(p => p.role === 'admin')
  const members = filteredProfiles.filter(p => p.role === 'member')

  function sortByRole(arr) {
    return [...arr].sort((a, b) => {
      if (a.role === b.role) return a.full_name.localeCompare(b.full_name)
      return a.role === 'admin' ? -1 : 1
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const [profs, actions, converts] = await Promise.all([fetchProfiles(), fetchPendingActions(), fetchConverts()])
        setProfiles(sortByRole(profs))
        setPendingActions(actions)
        setAllConverts(converts)
      } catch (err) {
        toast('Failed to load members. Please refresh.', 'error')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleContextMenu(e, p) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, target: p })
  }

  function handleLongPressStart(p) {
    longPressRef.current = setTimeout(() => {
      setCtxMenu({
        x: Math.max(8, window.innerWidth / 2 - 80),
        y: Math.max(8, window.innerHeight / 2 - 50),
        target: p
      })
    }, 600)
  }

  function handleLongPressEnd() {
    clearTimeout(longPressRef.current)
  }

  function handleCreated(newProfile) {
    setProfiles(prev => sortByRole([...prev, newProfile]))
    toast(`${newProfile.full_name} added as ${newProfile.role}.`, 'success')
  }

  function handleSaved(updated) {
    setProfiles(prev => sortByRole(prev.map(p => p.id === updated.id ? updated : p)))
    toast('Member updated successfully.', 'success')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.role === 'admin') {
        await initiateAdminRemoval(deleteTarget.id, user.id)
        const updated = await fetchPendingActions()
        setPendingActions(updated)
        toast('Admin removal request initiated. A second admin must confirm.', 'info', 6000)
      } else {
        await deleteUser(deleteTarget.id)
        setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id))
        toast('Member removed successfully.', 'info')
      }
      setDeleteTarget(null)
    } catch (err) {
      toast(err.message || 'Failed to remove member.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleConfirmAdminRemoval(action) {
    if (action.initiated_by === user.id) {
      toast('You cannot confirm your own request — a different admin must confirm.', 'warning', 5000)
      return
    }
    try {
      await confirmAdminRemoval(action.id, user.id)
      await downgradeAdmin(action.target_user_id)
      setProfiles(prev =>
        sortByRole(prev.map(p =>
          p.id === action.target_user_id ? { ...p, role: 'member' } : p
        ))
      )
      setPendingActions(prev => prev.filter(a => a.id !== action.id))
      toast('Admin has been downgraded to member.', 'success')
    } catch (err) {
      toast(err.message || 'Failed to confirm removal.', 'error')
    }
  }

  async function handleCancelAction(actionId) {
    try {
      await cancelPendingAction(actionId)
      setPendingActions(prev => prev.filter(a => a.id !== actionId))
      toast('Pending action cancelled.', 'info')
    } catch {
      toast('Failed to cancel action.', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Admin</p>
          <h1 className="text-2xl font-bold text-navy-900">Member Configuration</h1>
          <p className="text-xs text-gray-400 mt-1">
            {admins.length} admin{admins.length !== 1 ? 's' : ''} ·{' '}
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2 self-start">
          <span>+</span> Add Member
        </button>
      </div>

      {/* Ministry filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 font-medium">Filter by Ministry:</label>
        <select value={ministryFilter} onChange={e => setMinistryFilter(e.target.value)}
          className="input-field w-auto text-sm py-1.5">
          <option value="">None (Show All)</option>
          {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Pending admin removal actions */}
      {pendingActions.length > 0 && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <h2 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
            <span>⏳</span> Pending Admin Actions ({pendingActions.length})
          </h2>
          <p className="text-xs text-amber-700 mb-4">
            Admin removal requires confirmation from a <strong>different</strong> admin.
            The initiating admin cannot confirm their own request.
          </p>
          <div className="space-y-3">
            {pendingActions.map(action => (
              <div key={action.id}
                className="bg-white rounded-xl border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Remove admin:{' '}
                    <span className="text-navy-900">{action.target?.full_name || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Initiated by {action.initiator?.full_name || 'Unknown'} ·{' '}
                    {new Date(action.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {action.initiated_by !== user.id ? (
                    <button onClick={() => handleConfirmAdminRemoval(action)}
                      className="btn-danger text-xs py-1.5 px-3">
                      Confirm Removal
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 italic self-center">
                      Awaiting 2nd admin…
                    </span>
                  )}
                  <button onClick={() => handleCancelAction(action.id)}
                    className="btn-secondary text-xs py-1.5 px-3">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <ProfileTable
            rows={admins}
            title="Admins"
            badge="bg-navy-900"
            convertCounts={convertCounts}
            onContextMenu={handleContextMenu}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
            currentUserId={user.id}
          />
          <ProfileTable
            rows={members}
            title="Members"
            badge="bg-gray-400"
            convertCounts={convertCounts}
            onContextMenu={handleContextMenu}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
            currentUserId={user.id}
          />
          <p className="text-xs text-gray-300">
            💡 Right-click any row to edit or delete. On mobile, long-press a row.
          </p>
        </>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onEdit={() => setEditTarget(ctxMenu.target)}
          onDelete={() => setDeleteTarget(ctxMenu.target)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Modals */}
      {showAdd && (
        <AddMemberModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}
      {editTarget && (
        <EditMemberModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.role === 'admin' ? 'Initiate Admin Removal' : 'Remove Member'}
          message={
            deleteTarget.role === 'admin'
              ? `This will initiate a removal request for admin "${deleteTarget.full_name}". A second admin must confirm before the action takes effect.`
              : `Are you sure you want to permanently remove member "${deleteTarget.full_name}" from the system?`
          }
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
