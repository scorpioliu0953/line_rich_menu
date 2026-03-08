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

  // Get channel and menu data
  const { data: channel } = await client
    .from('channels')
    .select('channel_access_token')
    .eq('id', channelId)
    .single()

  if (!channel) return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })

  const { data: menu } = await client
    .from('rich_menus')
    .select('*')
    .eq('id', menuId)
    .single()

  if (!menu) return new Response(JSON.stringify({ error: 'Menu not found' }), { status: 404 })

  // Build LINE API request body
  const lineBody = {
    size: { width: 2500, height: menu.size_height },
    selected: menu.selected,
    name: menu.name,
    chatBarText: menu.chat_bar_text,
    areas: menu.areas.map((area) => ({
      bounds: area.bounds,
      action: area.action,
    })),
  }

  // Create rich menu on LINE
  const lineRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channel.channel_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lineBody),
  })

  if (!lineRes.ok) {
    const errBody = await lineRes.text()
    return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
  }

  const lineData = await lineRes.json()

  // Save LINE rich menu ID back to our DB
  await client
    .from('rich_menus')
    .update({
      line_rich_menu_id: lineData.richMenuId,
      status: 'published',
    })
    .eq('id', menuId)

  return new Response(JSON.stringify({ richMenuId: lineData.richMenuId }))
}
