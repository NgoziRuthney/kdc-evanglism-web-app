import { supabase } from './supabase'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

async function callAdminApi(body) {
  const token = await getToken()
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

export async function createUser({ fullName, phoneNumber, password, role, department }) {
  return callAdminApi({ action: 'create', fullName, phoneNumber, password, role, department: department || null })
}

export async function deleteUser(userId) {
  return callAdminApi({ action: 'delete', userId })
}

export async function downgradeAdmin(userId) {
  return callAdminApi({ action: 'downgrade', userId })
}
