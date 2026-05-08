import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MemberForm from './pages/MemberForm'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Analytics from './pages/admin/Analytics'
import MembersConfig from './pages/admin/MembersConfig'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading…</p>
      </div>
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" replace />

  if (requireAdmin && profile.role !== 'admin') return <Navigate to="/form" replace />

  return children
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/form" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/form" element={
            <ProtectedRoute>
              <MemberForm />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="members" element={<MembersConfig />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
