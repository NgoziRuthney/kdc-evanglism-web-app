import { useState, useEffect, useMemo } from 'react'
import { fetchConverts, fetchProfiles } from '../../utils/supabase'
import { getCachedConverts } from '../../utils/indexedDB'
import { MINISTRIES } from '../../utils/formConstants'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const GENDER_COLORS = { Male: '#1e3a8a', Female: '#f59e0b' }
const RESPONSE_COLORS = { High: '#10b981', Middle: '#f59e0b', Low: '#ef4444' }
const LOCATION_COLORS = [
  '#e11d48', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7'
]
const OCCUPATION_COLORS = [
  '#e11d48', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#84cc16'
]
const MINISTRY_COLORS = [
  '#e11d48', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'
]

function pct(count, total) {
  if (!total) return 0
  return ((count / total) * 100).toFixed(1)
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600">{value} records</p>
      {p?.pct !== undefined && <p className="text-gray-400">{p.pct}% of total</p>}
    </div>
  )
}

export default function Analytics() {
  const [converts, setConverts] = useState([])
  const [profiles, setProfilesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('all') // 'all' | '30'

  useEffect(() => {
    async function load() {
      try {
        const cached = await getCachedConverts()
        if (cached.length) { setConverts(cached); setLoading(false) }
        const fresh = await fetchConverts()
        setConverts(fresh)
        try { const p = await fetchProfiles(); setProfilesList(p) } catch { }
      } catch {
        const cached = await getCachedConverts()
        setConverts(cached)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build profile ministry map
  const profileMinistryMap = useMemo(() => {
    const map = {}
    profiles.forEach(p => { if (p.ministry_department) map[p.id] = p.ministry_department })
    return map
  }, [profiles])

  const data = useMemo(() => {
    let src = converts
    if (range === '30') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      src = converts.filter(c => c.date_reached >= cutoffStr)
    }
    const total = src.length

    // 1. Gender
    const genderMap = {}
    src.forEach(c => { genderMap[c.gender] = (genderMap[c.gender] || 0) + 1 })
    const gender = Object.entries(genderMap).map(([name, value]) => ({
      name, value, pct: pct(value, total)
    }))

    // 2. Response by gender
    const responseGender = ['High', 'Middle', 'Low'].map(level => {
      const male = src.filter(c => c.level_of_response === level && c.gender === 'Male').length
      const female = src.filter(c => c.level_of_response === level && c.gender === 'Female').length
      return { name: level, Male: male, Female: female }
    })

    // 3. Location
    const locMap = {}
    src.forEach(c => { if (c.location_address) locMap[c.location_address] = (locMap[c.location_address] || 0) + 1 })
    const locations = Object.entries(locMap).map(([name, value]) => ({
      name, value, pct: pct(value, total)
    })).sort((a, b) => b.value - a.value)

    // 4. Occupation
    const occMap = {}
    src.forEach(c => { if (c.occupation) occMap[c.occupation] = (occMap[c.occupation] || 0) + 1 })
    const occupations = Object.entries(occMap).map(([name, value]) => ({
      name, value, pct: pct(value, total)
    })).sort((a, b) => b.value - a.value)

    // 5. Ministry department breakdown
    const ministryMap = {}
    MINISTRIES.forEach(m => { ministryMap[m] = 0 })
    let unassigned = 0
    src.forEach(c => {
      const dept = profileMinistryMap[c.submitted_by]
      if (dept && ministryMap[dept] !== undefined) ministryMap[dept]++
      else unassigned++
    })
    const ministries = MINISTRIES.map(name => ({
      name: name.replace(' ministry', '').replace(' Ministry', ''),
      fullName: name,
      value: ministryMap[name]
    }))

    return { total, gender, responseGender, locations, occupations, ministries }
  }, [converts, range, profileMinistryMap])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Admin</p>
          <h1 className="text-2xl font-bold text-navy-900">Statistical Analytics</h1>
          <p className="text-xs text-gray-400 mt-1">{data.total} total records in view</p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${range === 'all' ? 'bg-white shadow text-navy-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Time
          </button>
          <button
            onClick={() => setRange('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${range === '30' ? 'bg-white shadow text-navy-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {data.total === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No data to display for this period.</p>
          <p className="text-xs mt-1">Add convert records to see analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 1. Gender Pie */}
          <div className="card p-5">
            <h2 className="font-bold text-navy-900 text-sm mb-1">Gender Distribution</h2>
            <p className="text-xs text-gray-400 mb-4">Percentage of male vs female converts/invitees</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.gender} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={3} dataKey="value" label={({ name, pct }) => `${name} ${pct}%`}
                  labelLine={false}
                >
                  {data.gender.map((entry, i) => (
                    <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {data.gender.map(g => (
                <div key={g.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full" style={{ background: GENDER_COLORS[g.name] || '#64748b' }} />
                  <span className="font-medium">{g.name}</span>
                  <span className="text-gray-400">{g.value} ({g.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Response by Gender */}
          <div className="card p-5">
            <h2 className="font-bold text-navy-900 text-sm mb-1">Level of Response by Gender</h2>
            <p className="text-xs text-gray-400 mb-4">High / Middle / Low response grading broken down by gender</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.responseGender} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Male" fill={GENDER_COLORS.Male} radius={[4, 4, 0, 0]} name="Male" />
                <Bar dataKey="Female" fill={GENDER_COLORS.Female} radius={[4, 4, 0, 0]} name="Female" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {['Male', 'Female'].map(g => (
                <div key={g} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full" style={{ background: GENDER_COLORS[g] }} />
                  <span className="font-medium">{g}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              {['High', 'Middle', 'Low'].map(l => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: RESPONSE_COLORS[l] }} />
                  {l} = high/mid/low engagement
                </span>
              ))}
            </div>
          </div>

          {/* 3. Location Pie */}
          <div className="card p-5">
            <h2 className="font-bold text-navy-900 text-sm mb-1">Converts by Location</h2>
            <p className="text-xs text-gray-400 mb-4">Percentage of converts reached per location area</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.locations} cx="50%" cy="50%" outerRadius={100}
                  paddingAngle={2} dataKey="value"
                >
                  {data.locations.map((entry, i) => (
                    <Cell key={entry.name} fill={LOCATION_COLORS[i % LOCATION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {data.locations.map((l, i) => (
                <div key={l.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: LOCATION_COLORS[i % LOCATION_COLORS.length] }} />
                  <span className="font-medium truncate max-w-[130px]">{l.name}</span>
                  <span className="text-gray-400">({l.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Occupation */}
          <div className="card p-5">
            <h2 className="font-bold text-navy-900 text-sm mb-1">Converts by Occupation</h2>
            <p className="text-xs text-gray-400 mb-4">Percentage breakdown by type of occupation</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.occupations} cx="50%" cy="50%" outerRadius={100}
                  paddingAngle={2} dataKey="value"
                >
                  {data.occupations.map((entry, i) => (
                    <Cell key={entry.name} fill={OCCUPATION_COLORS[i % OCCUPATION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {data.occupations.map((o, i) => (
                <div key={o.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: OCCUPATION_COLORS[i % OCCUPATION_COLORS.length] }} />
                  <span className="font-medium truncate max-w-[140px]">{o.name}</span>
                  <span className="text-gray-400">({o.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Ministry Department Histogram */}
          <div className="card p-5 xl:col-span-2">
            <h2 className="font-bold text-navy-900 text-sm mb-1">Converts by Ministry Department</h2>
            <p className="text-xs text-gray-400 mb-4">Number of converts/invitees added by members of each ministry</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.ministries} barCategoryGap="20%" layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={180} />
                <Tooltip formatter={(value, name, props) => [`${value} converts`, props.payload.fullName]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Converts">
                  {data.ministries.map((entry, i) => (
                    <Cell key={entry.fullName} fill={MINISTRY_COLORS[i % MINISTRY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  )
}
