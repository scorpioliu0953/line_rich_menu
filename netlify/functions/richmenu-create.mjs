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

  await supabaseAdmin
    .from('rich_menus')
    .update({ line_rich_menu_id: lineData.richMenuId, status: 'published' })
    .eq('id', menuId)

  return new Response(JSON.stringify({ richMenuId: lineData.richMenuId }))
}
