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
    .select('line_rich_menu_id, image_path')
    .eq('id', menuId)
    .single()

  if (!menu) return new Response(JSON.stringify({ error: 'Menu not found' }), { status: 404 })

  // Delete from LINE if published
  if (menu.line_rich_menu_id) {
    const lineRes = await fetch(
      `https://api.line.me/v2/bot/richmenu/${menu.line_rich_menu_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${channel.channel_access_token}` },
      }
    )
    // Ignore 404 (already deleted on LINE)
    if (!lineRes.ok && lineRes.status !== 404) {
      const errBody = await lineRes.text()
      return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
    }
  }

  // Delete image from storage
  if (menu.image_path) {
    await client.storage.from('richmenu-images').remove([menu.image_path])
  }

  // Delete from DB
  const { error: dbError } = await client.from('rich_menus').delete().eq('id', menuId)
  if (dbError) {
    return new Response(JSON.stringify({ error: dbError.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ success: true }))
}
