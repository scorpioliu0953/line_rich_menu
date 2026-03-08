import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

function getAuthClient(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

function getToken(headers) {
  const auth = headers.get('authorization') || ''
  return auth.replace('Bearer ', '')
}

export default async (req) => {
  const token = getToken(req.headers)
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const client = getAuthClient(token)
  const { data: { user }, error: authError } = await client.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const method = req.method

  if (method === 'GET') {
    const { data, error } = await client
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data))
  }

  if (method === 'POST') {
    const body = await req.json()
    const { data, error } = await client.from('channels').insert({
      user_id: user.id,
      channel_name: body.channel_name,
      channel_access_token: body.channel_access_token,
    }).select().single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data), { status: 201 })
  }

  if (method === 'DELETE') {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const { error } = await client.from('channels').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify({ success: true }))
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
