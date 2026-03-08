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

async function verifyChannelOwnership(userId, channelId) {
  const { data } = await supabaseAdmin
    .from('channels')
    .select('id')
    .eq('id', channelId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export default async (req) => {
  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')

  if (channelId && !(await verifyChannelOwnership(user.id, channelId))) {
    return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
  }

  const method = req.method

  // GET: list menus for a channel, or get a single menu
  if (method === 'GET') {
    const menuId = url.searchParams.get('menuId')

    if (menuId) {
      const { data, error } = await supabaseAdmin
        .from('rich_menus')
        .select('*')
        .eq('id', menuId)
        .single()
      if (error || !data) return new Response(JSON.stringify({ error: 'Menu not found' }), { status: 404 })
      return new Response(JSON.stringify(data))
    }

    if (!channelId) return new Response(JSON.stringify({ error: 'Missing channelId' }), { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('rich_menus')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data))
  }

  // POST: create or update a menu
  if (method === 'POST') {
    const body = await req.json()
    const { menuId, menuData } = body

    if (!menuData.channel_id) {
      return new Response(JSON.stringify({ error: 'Missing channel_id' }), { status: 400 })
    }

    // Verify ownership of target channel
    if (!(await verifyChannelOwnership(user.id, menuData.channel_id))) {
      return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
    }

    if (menuId) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('rich_menus')
        .update(menuData)
        .eq('id', menuId)
        .select()
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      return new Response(JSON.stringify(data))
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('rich_menus')
        .insert(menuData)
        .select()
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      return new Response(JSON.stringify(data), { status: 201 })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
