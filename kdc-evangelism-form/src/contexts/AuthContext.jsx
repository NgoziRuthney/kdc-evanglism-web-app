import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, fetchProfile } from '../utils/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const handleSession = async (session) => {
    if (session?.user) {
      setUser(session.user)

      try {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      } catch (err) {
        console.error("Profile fetch error:", err)
        setProfile(null)
      }
    } else {
      setUser(null)
      setProfile(null)
    }

    setLoading(false)
  }

  // 1. Initial session
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      handleSession(session)
    })
    .catch((err) => {
      console.error("Session error:", err)
      setLoading(false)
    })

  // 2. Auth state listener
  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

  // 3. Cleanup (VERY IMPORTANT)
  return () => {
    subscription.unsubscribe()
  }
}, [])

  const isAdmin = profile?.role === 'admin'
  const isMember = profile?.role === 'member'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isMember }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
