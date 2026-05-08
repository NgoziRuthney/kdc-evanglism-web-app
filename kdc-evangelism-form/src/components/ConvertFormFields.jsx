import {
  LOCATIONS, OCCUPATIONS, SALVATION_STATUSES, RESPONSE_LEVELS,
  KDC_VISITED, PHONE_TYPES, GENDERS
} from '../utils/formConstants'

export default function ConvertFormFields({ form, setForm, disabled = false, radioName = 'gender' }) {
  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Full Name */}
      <div>
        <label className="label">Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          placeholder="Enter Name of Convert / Invitee"
          value={form.full_name}
          onChange={e => update('full_name', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        />
      </div>

      {/* Gender */}
      <div>
        <label className="label">Gender <span className="text-red-500">*</span></label>
        <div className="flex gap-4 mt-1">
          {GENDERS.map(g => (
            <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name={radioName}
                value={g}
                checked={form.gender === g}
                onChange={() => update('gender', g)}
                required
                disabled={disabled}
                className="w-4 h-4 text-navy-900 border-gray-300 focus:ring-navy-600"
              />
              <span className="text-sm text-gray-700">{g}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="label">Phone Number <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="11-digit phone number"
            value={form.phone_number}
            onChange={e => update('phone_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
            className="input-field flex-1"
            minLength={11}
            maxLength={11}
            required
            disabled={disabled}
          />
          <select
            value={form.phone_type}
            onChange={e => update('phone_type', e.target.value)}
            className="input-field w-36"
            disabled={disabled}
          >
            {PHONE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <p className={`text-xs mt-1 ${form.phone_number.length === 11 ? 'text-emerald-600' : 'text-gray-400'}`}>
          {form.phone_number.length}/11 digits
        </p>
      </div>

      {/* Date Reached */}
      <div>
        <label className="label">Date Reached <span className="text-red-500">*</span></label>
        <input
          type="date"
          value={form.date_reached}
          onChange={e => update('date_reached', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        />
      </div>

      {/* Location */}
      <div>
        <label className="label">Location Address <span className="text-red-500">*</span></label>
        {form.location_address === '__other__' ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter the name of the location"
              value={form.location_other || ''}
              onChange={e => update('location_other', e.target.value.slice(0, 50))}
              className="input-field flex-1"
              maxLength={50}
              required
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => { update('location_address', ''); update('location_other', '') }}
              className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-2 rounded-lg"
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        ) : (
          <select
            value={form.location_address}
            onChange={e => update('location_address', e.target.value)}
            className="input-field"
            required
            disabled={disabled}
          >
            <option value="">Select location…</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            <option value="__other__">Other</option>
          </select>
        )}
        {form.location_address === '__other__' && (
          <p className={`text-xs mt-1 ${(form.location_other || '').length > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {(form.location_other || '').length}/50 characters
          </p>
        )}
      </div>

      {/* Salvation Status */}
      <div>
        <label className="label">Salvation Status <span className="text-red-500">*</span></label>
        <select
          value={form.salvation_status}
          onChange={e => update('salvation_status', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        >
          <option value="">Select status…</option>
          {SALVATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Occupation */}
      <div>
        <label className="label">Occupation <span className="text-red-500">*</span></label>
        <select
          value={form.occupation}
          onChange={e => update('occupation', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        >
          <option value="">Select occupation…</option>
          {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Level of Response */}
      <div>
        <label className="label">Level of Response <span className="text-red-500">*</span></label>
        <select
          value={form.level_of_response}
          onChange={e => update('level_of_response', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        >
          <option value="">Select level…</option>
          {RESPONSE_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Visited KDC */}
      <div>
        <label className="label">Visited KDC Before? <span className="text-red-500">*</span></label>
        <select
          value={form.visited_kdc}
          onChange={e => update('visited_kdc', e.target.value)}
          className="input-field"
          required
          disabled={disabled}
        >
          <option value="">Select…</option>
          {KDC_VISITED.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Remark */}
      <div>
        <label className="label">Remark <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
        <textarea
          placeholder="Enter brief remark…"
          value={form.remark}
          onChange={e => update('remark', e.target.value)}
          rows={3}
          className="input-field resize-none"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
