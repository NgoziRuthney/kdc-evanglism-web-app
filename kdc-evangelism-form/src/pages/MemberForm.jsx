import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { insertConverts, signOut } from '../utils/supabase'
import { EMPTY_FORM, buildConvertPayload, isFormValid, parseCSVToForms } from '../utils/formConstants'
import ConvertFormFields from '../components/ConvertFormFields'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import TypingTitle from '../components/TypingTitle'

export default function MemberForm() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [forms, setForms] = useState([EMPTY_FORM()])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('form')
  const [csvError, setCsvError] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(null)
  const lastFormRef = useRef(null)
  const longPressRef = useRef(null)

  const filledCount = forms.filter(f => isFormValid(f)).length

  // Intersection observer for scroll-to-latest
  useEffect(() => {
    if (!lastFormRef.current || forms.length <= 1) { setShowScrollBtn(false); return }
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { threshold: 0.1 }
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
    const invalidCount = forms.length - validForms.length
    if (invalidCount > 0) {
      const proceed = window.confirm(`${invalidCount} form(s) are incomplete and will be skipped. Submit the ${validForms.length} completed form(s)?`)
      if (!proceed) return
    }
    setSubmitting(true)
    setError('')
    try {
      const payloads = validForms.map(f => buildConvertPayload(f, user.id, profile?.full_name))
      await insertConverts(payloads)
      setSuccess(true)
      setForms([EMPTY_FORM()])
    } catch (err) {
      setError('Failed to submit. Please check your connection and try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src="/kdc_logo.png" alt="KDC" className="h-10 object-contain" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{profile?.full_name}</span>
            <button onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors border border-gray-200 
                hover:border-red-300 px-3 py-1.5 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Scroll to latest floating button */}
      {showScrollBtn && mode === 'form' && (
        <button onClick={() => lastFormRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-navy-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg font-medium hover:bg-navy-800">
          ↓ Scroll to latest form
        </button>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-8">
          <img src="/kdc_logo.png" alt="KDC" className="h-16 mx-auto mb-4 object-contain" />
          <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
          <h1 className="text-2xl font-bold text-navy-900">
            <TypingTitle />
          </h1>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-xl mt-0.5">✓</span>
            <div>
              <p className="font-semibold text-sm">Record submitted successfully!</p>
              <p className="text-xs text-emerald-600 mt-0.5">The convert/invitee information has been saved.</p>
            </div>
            <button onClick={() => setSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-700 text-lg">✕</button>
          </div>
        )}

        {/* Form card */}
        <div className="card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-navy-900">Enter Convert / Invitee Information Below</h2>
          </div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-gray-400">
              {filledCount > 0
                ? <span className="text-emerald-600 font-medium">{filledCount} convert detail{filledCount !== 1 ? 's' : ''} filled</span>
                : 'All fields are required unless marked optional.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setMode('form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'form' ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Manual Entry
            </button>
            <button onClick={() => setMode('csv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'csv' ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Upload CSV
            </button>
          </div>

          {mode === 'csv' ? (
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
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Minister name (read-only) */}
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
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-navy-300 hover:text-navy-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium mb-4"
              >
                <span className="text-2xl">+</span> Add Another Convert
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mt-4">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <button type="submit" disabled={submitting || filledCount === 0} className="btn-primary w-full py-3 text-base">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : `Submit ${filledCount > 0 ? filledCount + ' ' : ''}Record${filledCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

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
