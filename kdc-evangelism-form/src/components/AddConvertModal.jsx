import { useState, useRef, useEffect } from 'react'
import { EMPTY_FORM, buildConvertPayload, isFormValid, parseCSVToForms } from '../utils/formConstants'
import ConvertFormFields from './ConvertFormFields'
import { insertConverts } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import DeleteConfirmModal from './DeleteConfirmModal'

export default function AddConvertModal({ onClose, onAdded }) {
  const { user, profile } = useAuth()
  const [forms, setForms] = useState([EMPTY_FORM()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('form') // 'form' | 'csv'
  const [csvError, setCsvError] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(null) // index or null
  const lastFormRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const longPressRef = useRef(null)

  const filledCount = forms.filter(f => isFormValid(f)).length

  // Intersection observer for scroll-to-latest button
  useEffect(() => {
    if (!lastFormRef.current || forms.length <= 1) { setShowScrollBtn(false); return }
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { threshold: 0.1, root: scrollContainerRef.current }
    )
    observer.observe(lastFormRef.current)
    return () => observer.disconnect()
  }, [forms.length])

  function addForm() {
    const lastForm = forms[forms.length - 1]
    if (!isFormValid(lastForm)) {
      setError('Please fill all required fields on the current form before adding another.')
      return
    }
    setError('')
    setForms(prev => [...prev, EMPTY_FORM()])
    setTimeout(() => lastFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function updateForm(index, updater) {
    setForms(prev => prev.map((f, i) => i === index ? (typeof updater === 'function' ? updater(f) : { ...f, ...updater }) : f))
  }

  function handleLongPress(index) {
    longPressRef.current = setTimeout(() => {
      setClearConfirm(index)
    }, 600)
  }

  function handleLongPressEnd() { clearTimeout(longPressRef.current) }

  function handleDeleteForm(index) {
    if (forms.length === 1) {
      setForms([EMPTY_FORM()])
    } else {
      setForms(prev => prev.filter((_, i) => i !== index))
    }
    setClearConfirm(null)
  }

  // CSV upload
  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Only CSV files are accepted.')
      return
    }
    setCsvError('')
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = parseCSVToForms(evt.target.result)
        setForms(parsed)
        setMode('form')
        setError('')
      } catch (err) {
        setCsvError(err.message)
      }
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validForms = forms.filter(f => isFormValid(f))
    if (validForms.length === 0) {
      setError('Please fill at least one complete form before submitting.')
      return
    }
    // Check for incomplete forms
    const invalidCount = forms.length - validForms.length
    if (invalidCount > 0) {
      const proceed = window.confirm(`${invalidCount} form(s) are incomplete and will be skipped. Submit the ${validForms.length} completed form(s)?`)
      if (!proceed) return
    }
    setSubmitting(true)
    setError('')
    try {
      const payloads = validForms.map(f => buildConvertPayload(f, user.id, profile?.full_name))
      const records = await insertConverts(payloads)
      onAdded(records)
      onClose()
    } catch (err) {
      setError('Failed to save records. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-navy-900 text-base">Enter New Convert Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filledCount > 0 && <span className="text-emerald-600 font-medium">{filledCount} convert detail{filledCount !== 1 ? 's' : ''} filled</span>}
              {filledCount === 0 && 'All fields required unless optional.'}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Mode toggle: Form / CSV */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 shrink-0">
          <button onClick={() => setMode('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'form' ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Manual Entry
          </button>
          <button onClick={() => setMode('csv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'csv' ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Upload CSV
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
          {/* Scroll to latest button */}
          {showScrollBtn && mode === 'form' && (
            <button onClick={() => lastFormRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="sticky top-0 z-10 w-full bg-navy-900/90 text-white text-xs py-2 font-medium hover:bg-navy-800">
              ↓ Scroll to latest form
            </button>
          )}

          {mode === 'csv' ? (
            <div className="px-6 py-8">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <p className="text-3xl mb-3">📄</p>
                <p className="font-medium text-gray-700 text-sm mb-1">Upload CSV File</p>
                <p className="text-xs text-gray-400 mb-4">
                  CSV must have headers: full_name, gender, phone_number, phone_type, date_reached,
                  location_address, salvation_status, occupation, level_of_response, visited_kdc, remark
                </p>
                <label className="btn-primary cursor-pointer inline-block">
                  Choose File
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
                {csvError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mt-4 text-left">
                    {csvError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-5">
              {/* Minister name */}
              <div className="mb-5">
                <label className="label">Name of Minister filling the report <span className="text-gray-400 text-xs font-normal">(Auto)</span></label>
                <input type="text" value={profile?.full_name || ''} disabled
                  className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>

              {/* Forms array */}
              {forms.map((form, idx) => (
                <div
                  key={idx}
                  ref={idx === forms.length - 1 ? lastFormRef : undefined}
                  className="relative mb-6 border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                  onContextMenu={e => { e.preventDefault(); setClearConfirm(idx) }}
                  onTouchStart={() => handleLongPress(idx)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-navy-900 bg-navy-50 px-2 py-1 rounded-lg">
                      Form #{idx + 1}
                    </span>
                    {isFormValid(form) && (
                      <span className="text-xs text-emerald-600 font-medium">✓ Complete</span>
                    )}
                  </div>
                  <ConvertFormFields
                    form={form}
                    setForm={updater => updateForm(idx, typeof updater === 'function' ? updater : () => ({ ...form, ...updater }))}
                    disabled={submitting}
                    radioName={`gender_${idx}`}
                  />
                </div>
              ))}

              {/* Plus button */}
              <button
                type="button"
                onClick={addForm}
                disabled={submitting}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-navy-300 hover:text-navy-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <span className="text-2xl">+</span> Add Another Convert
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={submitting}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || filledCount === 0} className="btn-primary flex-1">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : `Submit ${filledCount > 0 ? filledCount + ' ' : ''}Record${filledCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Delete / Clear form confirmation */}
      {clearConfirm !== null && (
        <DeleteConfirmModal
          title={forms.length === 1 ? 'Clear Form' : 'Delete Form'}
          message={forms.length === 1
            ? 'Are you sure you want to clear this form?'
            : `Are you sure you want to delete Form #${clearConfirm + 1}?`}
          loading={false}
          onConfirm={() => handleDeleteForm(clearConfirm)}
          onCancel={() => setClearConfirm(null)}
        />
      )}
    </div>
  )
}
