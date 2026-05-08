import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/** Sign in with phone number (converted to email format internally) */
export async function signInWithPhone(phoneNumber, password) {
  const email = `${phoneNumber}@kdc.app`
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Fetch the current user's profile */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

/** Fetch all converts (admin only) */
export async function fetchConverts() {
  const { data, error } = await supabase
    .from('converts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Insert a convert */
export async function insertConvert(payload) {
  const { data, error } = await supabase
    .from('converts')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Insert multiple converts at once */
export async function insertConverts(payloads) {
  const { data, error } = await supabase
    .from('converts')
    .insert(payloads)
    .select()
  if (error) throw error
  return data
}

/** Update a convert */
export async function updateConvert(id, payload) {
  const { data, error } = await supabase
    .from('converts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a convert */
export async function deleteConvert(id) {
  const { error } = await supabase.from('converts').delete().eq('id', id)
  if (error) throw error
}

/** Fetch all profiles (admin only) */
export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
  if (error) throw error
  return data
}

/** Fetch pending admin actions */
export async function fetchPendingActions() {
  const { data, error } = await supabase
    .from('pending_admin_actions')
    .select(`
      *,
      target:target_user_id(full_name, phone_number),
      initiator:initiated_by(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Initiate an admin removal request */
export async function initiateAdminRemoval(targetUserId, initiatedBy) {
  const { data, error } = await supabase
    .from('pending_admin_actions')
    .insert({ action_type: 'remove_admin', target_user_id: targetUserId, initiated_by: initiatedBy })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Confirm a pending admin removal (second admin) */
export async function confirmAdminRemoval(actionId, confirmedBy) {
  const { data, error } = await supabase
    .from('pending_admin_actions')
    .update({ status: 'completed', confirmed_by: confirmedBy })
    .eq('id', actionId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Cancel a pending action */
export async function cancelPendingAction(actionId) {
  const { error } = await supabase
    .from('pending_admin_actions')
    .update({ status: 'cancelled' })
    .eq('id', actionId)
  if (error) throw error
}
