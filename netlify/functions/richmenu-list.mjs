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
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const user = await getUser(req)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return new Response(JSON.stringify({ error: 'Missing channelId' }), { status: 400 })

  const { data: channel } = await supabaseAdmin
    .from('channels')
    .select('channel_access_token, user_id')
    .eq('id', channelId)
    .single()

  if (!channel || channel.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
  }

  const lineRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
    headers: { Authorization: `Bearer ${channel.channel_access_token}` },
  })

  if (!lineRes.ok) {
    const errBody = await lineRes.text()
    return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
  }

  const data = await lineRes.json()

  let defaultRichMenuId = null
  const defaultRes = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
    headers: { Authorization: `Bearer ${channel.channel_access_token}` },
  })
  if (defaultRes.ok) {
    const defaultData = await defaultRes.json()
    defaultRichMenuId = defaultData.richMenuId
  }

  return new Response(JSON.stringify({ richmenus: data.richmenus || [], defaultRichMenuId }))
}
