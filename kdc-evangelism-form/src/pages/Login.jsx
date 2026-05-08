import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPhone } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const QUOTES = [
  {
    text: 'Go therefore and make disciples of all the nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.',
    ref: 'Matt 28:19 (NKJV)'
  },
  {
    text: 'How then shall they call on Him in whom they have not believed? And how shall they believe in Him of whom they have not heard? And how shall they hear without a preacher?',
    ref: 'Rom 10:14 (KJV)'
  },
  {
    text: 'Preach the word of God. Be persistent, whether the time is favorable or not. Patiently correct, rebuke, and encourage your people with good teaching.',
    ref: '2Tim 4:2 (NLT)'
  },
  {
    text: 'But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.',
    ref: 'Acts 1:8 (NIV)'
  }
]

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') navigate('/admin/dashboard', { replace: true })
      else navigate('/form', { replace: true })
    }
  }, [user, profile, navigate])

  // Animate quotes
  useEffect(() => {
    const cycleQuote = () => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setQuoteVisible(true)
      }, 600)
    }
    const interval = setInterval(cycleQuote, 10000)
    return () => clearInterval(interval)
  }, [])

  function handlePhoneInput(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(val)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (phone.length !== 11) return setError('Phone number must be exactly 11 digits.')
    if (!password) return setError('Password is required.')
    setLoading(true)
    setError('')
    try {
      await signInWithPhone(phone, password)
      // Auth context will update and trigger redirect
    } catch (err) {
      setError('Invalid phone number or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const q = QUOTES[quoteIdx]

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Background subtle pattern */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #eff6ff 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/kdc_logo.png" alt="KDC" className="h-20 object-contain" />
        </div>

        {/* Bible quote */}
        <div className="mb-8 min-h-[100px] flex flex-col items-center text-center px-2">
          <div className={`transition-opacity duration-500 ${quoteVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-sm text-gray-600 leading-relaxed italic max-w-sm">
              "{q.text}"
            </p>
            <p className="text-xs font-semibold text-navy-900 mt-2">— {q.ref}</p>
          </div>
        </div>

        {/* Login card */}
        <div className="card p-8 shadow-md">
          <h2 className="text-xl font-bold text-navy-900 mb-1 text-center">Login to Continue</h2>
          <p className="text-xs text-gray-400 text-center mb-6">KDC Evangelism Portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 11-digit phone number"
                value={phone}
                onChange={handlePhoneInput}
                className="input-field"
                maxLength={11}
                required
                autoComplete="username"
              />
              <p className={`text-xs mt-1 ${phone.length === 11 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {phone.length}/11 digits
              </p>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="input-field pr-10"
                  required
                  autoComplete="current-password"
                />
                <button type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm select-none"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Login'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          KDC Evangelism Portal © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
