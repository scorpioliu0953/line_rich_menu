import { createClient } from '@supabase/supabase-js'

function getAuthClient(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const client = getAuthClient(token)
  const { data: { user }, error: authError } = await client.auth.getUser(token)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return new Response(JSON.stringify({ error: 'Missing channelId' }), { status: 400 })

  // Get channel access token
  const { data: channel, error: chError } = await client
    .from('channels')
    .select('channel_access_token')
    .eq('id', channelId)
    .single()

  if (chError || !channel) {
    return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
  }

  // Fetch rich menus from LINE API
  const lineRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
    headers: { Authorization: `Bearer ${channel.channel_access_token}` },
  })

  if (!lineRes.ok) {
    const errBody = await lineRes.text()
    return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
  }

  const data = await lineRes.json()

  // Also get the default rich menu ID
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
