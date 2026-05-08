import { useState } from 'react'
import ConvertFormFields from './ConvertFormFields'
import { updateConvert } from '../utils/supabase'

function convertToForm(row) {
  const isOther = row.location_address?.startsWith('Other:')
  return {
    full_name: row.full_name || '',
    gender: row.gender || '',
    phone_number: row.phone_calling || row.phone_whatsapp || '',
    phone_type: row.phone_calling ? 'Calling' : 'WhatsApp',
    date_reached: row.date_reached || new Date().toISOString().slice(0, 10),
    location_address: isOther ? '__other__' : (row.location_address || ''),
    location_other: isOther ? row.location_address.replace('Other: ', '').replace('Other:', '') : '',
    salvation_status: row.salvation_status || '',
    occupation: row.occupation || '',
    level_of_response: row.level_of_response || '',
    visited_kdc: row.visited_kdc || '',
    remark: row.remark || ''
  }
}

export default function EditConvertModal({ convert, onClose, onUpdated }) {
  const [form, setForm] = useState(convertToForm(convert))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.phone_number.length !== 11) {
      setError('Phone number must be exactly 11 digits.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const locationValue = form.location_address === '__other__'
        ? `Other: ${form.location_other.trim()}`
        : form.location_address
      const payload = {
        full_name: form.full_name.trim(),
        gender: form.gender,
        phone_calling: form.phone_type === 'Calling' ? form.phone_number : null,
        phone_whatsapp: form.phone_type === 'WhatsApp' ? form.phone_number : null,
        date_reached: form.date_reached,
        location_address: locationValue,
        salvation_status: form.salvation_status,
        occupation: form.occupation,
        level_of_response: form.level_of_response,
        visited_kdc: form.visited_kdc,
        remark: form.remark || null
      }
      const updated = await updateConvert(convert.id, payload)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError('Failed to update. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-navy-900 text-base">Edit Convert Record</h2>
            <p className="text-xs text-gray-400 mt-0.5">Modify the fields below and save.</p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
          <ConvertFormFields form={form} setForm={setForm} disabled={saving} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mt-4">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
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
