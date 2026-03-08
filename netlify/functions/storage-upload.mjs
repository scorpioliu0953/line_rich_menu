import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  return error ? null : user
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const user = await getUser(req)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const path = new URL(req.url).searchParams.get('path')
  if (!path) return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 })

  // Verify the path starts with the user's ID
  if (!path.startsWith(user.id + '/')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const contentType = req.headers.get('content-type') || 'image/png'
  const fileBuffer = await req.arrayBuffer()

  const { error } = await supabaseAdmin.storage
    .from('richmenu-images')
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ path }))
}
