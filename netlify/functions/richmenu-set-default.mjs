import { createClient } from '@supabase/supabase-js'

function getAuthClient(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const client = getAuthClient(token)
  const { data: { user }, error: authError } = await client.auth.getUser(token)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body = await req.json()
  const { channelId, menuId } = body

  // Get channel
  const { data: channel } = await client
    .from('channels')
    .select('channel_access_token')
    .eq('id', channelId)
    .single()

  if (!channel) return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })

  // Get menu
  const { data: menu } = await client
    .from('rich_menus')
    .select('line_rich_menu_id, channel_id')
    .eq('id', menuId)
    .single()

  if (!menu || !menu.line_rich_menu_id) {
    return new Response(JSON.stringify({ error: 'Menu not published to LINE' }), { status: 400 })
  }

  // Set as default on LINE
  const lineRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${menu.line_rich_menu_id}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${channel.channel_access_token}` },
    }
  )

  if (!lineRes.ok) {
    const errBody = await lineRes.text()
    return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
  }

  // Update local DB: reset all menus for this channel, then set this one
  await client
    .from('rich_menus')
    .update({ is_default: false })
    .eq('channel_id', menu.channel_id)

  await client
    .from('rich_menus')
    .update({ is_default: true })
    .eq('id', menuId)

  return new Response(JSON.stringify({ success: true }))
}
