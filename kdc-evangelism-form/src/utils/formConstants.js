export const LOCATIONS = [
  '40 Rooms Area',
  'Arab suit/ Health tech Area',
  'Atari/Abuja gate Area',
  'Church Area',
  'Mini campus Area',
  'Obanimomo/ Hallelujah Area',
  'Omo_owo Area',
  'Orita_merin Area',
  'PS Area',
  'Saint Claire Area',
  'Secretariat Area',
  'Tipper Garage Area',
  'Thomade Area'
]

export const MINISTRIES = [
  'Discipleship and Empowerment ministry',
  'Follow up and Retention ministry',
  'Street Evangelism and Outreach ministry',
  'Intercessory and mobilization ministry',
  'Media and Technical ministry',
  'Welfare and helps ministry',
  'Worship and music Ministry'
]

export const OCCUPATIONS = [
  'Student',
  'Lecturer',
  'Navy Personnel/Navy Student',
  'Corp Member',
  'Business Owner',
  'Skilled Worker',
  'Market Trader',
  'Agricultural Farmer',
  'Professional Worker',
  'Civil Servant'
]

export const SALVATION_STATUSES = ['Saved Believer', 'Yet to be Saved']

export const RESPONSE_LEVELS = ['High', 'Middle', 'Low']

export const KDC_VISITED = ['YES', 'NO']

export const PHONE_TYPES = ['Calling', 'WhatsApp']

export const GENDERS = ['Male', 'Female']

export function EMPTY_FORM() {
  return {
    full_name: '',
    gender: '',
    phone_number: '',
    phone_type: 'Calling',
    date_reached: new Date().toISOString().slice(0, 10),
    location_address: '',
    location_other: '',
    salvation_status: '',
    occupation: '',
    level_of_response: '',
    visited_kdc: '',
    remark: ''
  }
}

export function isFormValid(form) {
  const locationValid = form.location_address === '__other__'
    ? form.location_other.trim().length > 0
    : form.location_address !== ''
  return (
    form.full_name.trim() !== '' &&
    form.gender !== '' &&
    form.phone_number.length === 11 &&
    form.date_reached !== '' &&
    locationValid &&
    form.salvation_status !== '' &&
    form.occupation !== '' &&
    form.level_of_response !== '' &&
    form.visited_kdc !== ''
  )
}

export function buildConvertPayload(form, userId, ministerName) {
  const locationValue = form.location_address === '__other__'
    ? `Other: ${form.location_other.trim()}`
    : form.location_address
  return {
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
    remark: form.remark || null,
    submitted_by: userId,
    minister_name: ministerName || null
  }
}

export function parseCSV(text) {
  const rows = []
  let field = '', inQuotes = false, fields = []
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if ((ch === ',' || ch === '\n' || ch === '\r' || i === text.length) && !inQuotes) {
      fields.push(field.trim())
      field = ''
      if (ch === '\n' || ch === '\r' || i === text.length) {
        if (fields.some(f => f)) rows.push(fields)
        fields = []
        if (ch === '\r' && text[i + 1] === '\n') i++
      }
    } else if (ch !== undefined) {
      field += ch
    }
  }
  return rows
}

const CSV_HEADERS = [
  'full_name', 'gender', 'phone_number', 'phone_type', 'date_reached',
  'location_address', 'salvation_status', 'occupation', 'level_of_response',
  'visited_kdc', 'remark'
]

export function parseCSVToForms(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row.')

  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const missing = CSV_HEADERS.filter(h => h !== 'remark' && !headers.includes(h))
  if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`)

  const forms = []
  for (let i = 1; i < rows.length; i++) {
    const vals = rows[i]
    const row = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] || '' })

    const gender = row.gender || ''
    if (gender && !['Male', 'Female'].includes(gender)) {
      throw new Error(`Row ${i}: Invalid gender "${gender}". Must be "Male" or "Female".`)
    }
    const phone = (row.phone_number || '').replace(/\D/g, '')
    if (phone && phone.length !== 11) {
      throw new Error(`Row ${i}: Phone number must be 11 digits. Got "${row.phone_number}".`)
    }

    const isOther = (row.location_address || '').startsWith('Other:')
    forms.push({
      full_name: row.full_name || '',
      gender,
      phone_number: phone,
      phone_type: row.phone_type || 'Calling',
      date_reached: row.date_reached || new Date().toISOString().slice(0, 10),
      location_address: isOther ? '__other__' : (row.location_address || ''),
      location_other: isOther ? row.location_address.replace('Other:', '').trim() : '',
      salvation_status: row.salvation_status || '',
      occupation: row.occupation || '',
      level_of_response: row.level_of_response || '',
      visited_kdc: row.visited_kdc || '',
      remark: row.remark || ''
    })
  }
  if (forms.length === 0) throw new Error('No valid data rows found in CSV.')
  return forms
}
