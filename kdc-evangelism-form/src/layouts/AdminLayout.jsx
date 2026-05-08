import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../utils/supabase'
import { ToastProvider } from '../components/Toast'

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/admin/analytics', icon: '📊', label: 'Analytics' },
  { to: '/admin/members', icon: '👥', label: 'Member Config' }
]

export default function AdminLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMobileWarning, setShowMobileWarning] = useState(false)

  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) setShowMobileWarning(true)
      else setShowMobileWarning(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-navy-900 flex flex-col z-30
          transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-center border-b border-white/10 px-4">
            <img src="/kdc_logo.png" alt="KDC" className="h-10 object-contain" />
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ to, icon, label }) => (
              <NavLink key={to} to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/10">
            <p className="text-white/80 text-xs font-medium truncate">{profile?.full_name}</p>
            <p className="text-white/40 text-xs capitalize">{profile?.role}</p>
            <button onClick={handleLogout}
              className="mt-3 w-full text-xs text-white/60 hover:text-red-300 border border-white/20 
                hover:border-red-400/40 rounded-lg py-1.5 transition-colors"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="text-navy-900 text-xl p-1">
              ☰
            </button>
            <img src="/kdc_logo.png" alt="KDC" className="h-8 object-contain" />
          </header>

          {/* Mobile warning toast */}
          {showMobileWarning && (
            <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl 
              px-4 py-3 text-xs flex items-start gap-2 shadow-sm">
              <span className="text-base mt-0.5">💻</span>
              <p>
                <span className="font-semibold">Better on desktop.</span> The admin dashboard has a wide table
                with 11 columns. For the best experience, switch to a desktop or larger screen.
              </p>
              <button onClick={() => setShowMobileWarning(false)} className="ml-auto text-amber-400 hover:text-amber-700 shrink-0">✕</button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
