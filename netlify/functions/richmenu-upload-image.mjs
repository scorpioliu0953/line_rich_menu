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

  const body = await req.json()
  const { channelId, menuId } = body

  const { data: channel } = await supabaseAdmin
    .from('channels')
    .select('channel_access_token, user_id')
    .eq('id', channelId)
    .single()

  if (!channel || channel.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
  }

  const { data: menu } = await supabaseAdmin
    .from('rich_menus')
    .select('*')
    .eq('id', menuId)
    .single()

  if (!menu) return new Response(JSON.stringify({ error: 'Menu not found' }), { status: 404 })
  if (!menu.line_rich_menu_id) {
    return new Response(JSON.stringify({ error: 'Menu not published to LINE yet' }), { status: 400 })
  }
  if (!menu.image_path) {
    return new Response(JSON.stringify({ error: 'No image uploaded' }), { status: 400 })
  }

  const { data: imageData, error: dlError } = await supabaseAdmin.storage
    .from('richmenu-images')
    .download(menu.image_path)

  if (dlError || !imageData) {
    return new Response(JSON.stringify({ error: 'Failed to download image' }), { status: 500 })
  }

  const imageBuffer = await imageData.arrayBuffer()
  const contentType = menu.image_path.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const lineRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${menu.line_rich_menu_id}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channel.channel_access_token}`,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    }
  )

  if (!lineRes.ok) {
    const errBody = await lineRes.text()
    return new Response(JSON.stringify({ error: 'LINE API error', details: errBody }), { status: lineRes.status })
  }

  return new Response(JSON.stringify({ success: true }))
}
