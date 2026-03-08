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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: '伺服器缺少 SUPABASE_SERVICE_ROLE_KEY 環境變數，請在 Netlify 設定'
    }), { status: 500 })
  }

  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const method = req.method

  if (method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data))
  }

  if (method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabaseAdmin.from('channels').insert({
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

    // Verify ownership
    const { data: ch } = await supabaseAdmin.from('channels').select('user_id').eq('id', id).single()
    if (!ch || ch.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    const { error } = await supabaseAdmin.from('channels').delete().eq('id', id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify({ success: true }))
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
