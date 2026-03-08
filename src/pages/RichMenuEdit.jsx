import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RichMenuEditor from '../components/RichMenuEditor'

export default function RichMenuEdit({ session }) {
  const { id: channelId, menuId } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(null)
  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch channel info
      const { data: channelData } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()
      setChannel(channelData)

      // Fetch menu if editing existing
      if (menuId) {
        const { data: menuData } = await supabase
          .from('rich_menus')
          .select('*')
          .eq('id', menuId)
          .single()
        setMenu(menuData)
      }
      setLoading(false)
    }
    fetchData()
  }, [channelId, menuId])

  if (loading) {
    return <div className="text-center text-gray-500 py-12">載入中...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/channels/${channelId}`}
          className="text-sm text-green-600 hover:text-green-700"
        >
          &larr; 返回 {channel?.channel_name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          {menuId ? '編輯圖文選單' : '建立圖文選單'}
        </h1>
      </div>

      <RichMenuEditor
        menu={menu}
        channelId={channelId}
        session={session}
        onSave={() => navigate(`/channels/${channelId}`)}
      />
    </div>
  )
}
