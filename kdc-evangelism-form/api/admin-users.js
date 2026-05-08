import { createClient } from '@supabase/supabase-js'

// This runs server-side only — service role key is NEVER sent to the browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://xslydkfqpwufccxitqcu.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify caller is an authenticated admin
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY
  )

  const { data: { user: caller }, error: authErr } =
    await supabaseAuth.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: 'Invalid token' })

  // Check caller is admin in profiles table
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()
  if (profileErr || callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' })
  }

  const { action, fullName, phoneNumber, password, role, userId, department } = req.body

  // ─── CREATE USER ───────────────────────────────────────────────
  if (action === 'create') {
    if (!fullName || !phoneNumber || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (!/^\d{11}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Phone number must be exactly 11 digits' })
    }

    const email = `${phoneNumber}@kdc.app`

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (createErr) {
      if (createErr.message?.includes('already')) {
        return res.status(409).json({ error: 'A user with this phone number already exists.' })
      }
      return res.status(500).json({ error: createErr.message })
    }

    // Create profile record
    const { data: profile, error: profileInsertErr } = await supabaseAdmin
      .from('profiles')
      .insert({ id: newUser.user.id, full_name: fullName, phone_number: phoneNumber, role, ministry_department: department || null })
      .select()
      .single()
    if (profileInsertErr) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return res.status(500).json({ error: profileInsertErr.message })
    }

    return res.status(200).json({ success: true, profile })
  }

  // ─── DELETE USER ───────────────────────────────────────────────
  if (action === 'delete') {
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    // Prevent self-deletion
    if (userId === caller.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' })
    }

    // Delete profile first (cascade will handle auth)
    const { error: profileDelErr } = await supabaseAdmin
      .from('profiles').delete().eq('id', userId)
    if (profileDelErr) return res.status(500).json({ error: profileDelErr.message })

    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDelErr) return res.status(500).json({ error: authDelErr.message })

    return res.status(200).json({ success: true })
  }

  // ─── DOWNGRADE ADMIN TO MEMBER (after 2-admin confirmation) ───
  if (action === 'downgrade') {
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    if (userId === caller.id) {
      return res.status(400).json({ error: 'You cannot downgrade yourself.' })
    }

    const { error } = await supabaseAdmin
      .from('profiles').update({ role: 'member' }).eq('id', userId)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
