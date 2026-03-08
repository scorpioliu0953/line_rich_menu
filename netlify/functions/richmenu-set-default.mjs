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
    .select('line_rich_menu_id, channel_id')
    .eq('id', menuId)
    .single()

  if (!menu || !menu.line_rich_menu_id) {
    return new Response(JSON.stringify({ error: 'Menu not published to LINE' }), { status: 400 })
  }

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

  await supabaseAdmin
    .from('rich_menus')
    .update({ is_default: false })
    .eq('channel_id', menu.channel_id)

  await supabaseAdmin
    .from('rich_menus')
    .update({ is_default: true })
    .eq('id', menuId)

  return new Response(JSON.stringify({ success: true }))
}
