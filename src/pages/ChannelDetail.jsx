import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'

const STATUS_LABELS = {
  draft: { text: '草稿', className: 'bg-gray-100 text-gray-700' },
  published: { text: '已發布', className: 'bg-green-100 text-green-700' },
}

export default function ChannelDetail() {
  const { id: channelId } = useParams()
  const [channel, setChannel] = useState(null)
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const channels = await apiFetch('/.netlify/functions/channels')
      const ch = channels.find((c) => c.id === channelId)
      setChannel(ch || null)

      const menuData = await apiFetch(`/.netlify/functions/menus?channelId=${channelId}`)
      setMenus(menuData || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePublish = async (menu) => {
    setError('')
    setActionLoading(menu.id)

    try {
      await apiFetch('/.netlify/functions/richmenu-create', {
        method: 'POST',
        body: JSON.stringify({ channelId, menuId: menu.id }),
      })

      if (menu.image_path) {
        await apiFetch('/.netlify/functions/richmenu-upload-image', {
          method: 'POST',
          body: JSON.stringify({ channelId, menuId: menu.id }),
        })
      }

      fetchData()
    } catch (err) {
      setError(`發布失敗：${err.message}`)
    }
    setActionLoading(null)
  }

  const handleSetDefault = async (menu) => {
    setError('')
    setActionLoading(menu.id)

    try {
      await apiFetch('/.netlify/functions/richmenu-set-default', {
        method: 'POST',
        body: JSON.stringify({ channelId, menuId: menu.id }),
      })
      fetchData()
    } catch (err) {
      setError(`設定預設失敗：${err.message}`)
    }
    setActionLoading(null)
  }

  const handleDelete = async (menu) => {
    if (!confirm(`確定要刪除「${menu.name}」？此操作無法復原。`)) return
    setError('')
    setActionLoading(menu.id)

    try {
      await apiFetch('/.netlify/functions/richmenu-delete', {
        method: 'POST',
        body: JSON.stringify({ channelId, menuId: menu.id }),
      })
      fetchData()
    } catch (err) {
      setError(`刪除失敗：${err.message}`)
    }
    setActionLoading(null)
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-12">載入中...</div>
  }

  if (!channel) {
    return <div className="text-center text-red-500 py-12">頻道不存在</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-green-600 hover:text-green-700">
          &larr; 返回頻道列表
        </Link>
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-2xl font-bold text-gray-800">{channel.channel_name}</h1>
          <Link
            to={`/channels/${channelId}/richmenu/new`}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + 建立圖文選單
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {menus.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">尚未建立任何圖文選單</p>
          <Link
            to={`/channels/${channelId}/richmenu/new`}
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            建立第一個選單
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => {
            const isLoading = actionLoading === menu.id
            const statusInfo = STATUS_LABELS[menu.status] || STATUS_LABELS.draft

            let imageUrl = null
            if (menu.image_path) {
              const { data } = supabase.storage
                .from('richmenu-images')
                .getPublicUrl(menu.image_path)
              imageUrl = data.publicUrl
            }

            return (
              <div key={menu.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[2500/1686] bg-gray-100 relative">
                  {imageUrl ? (
                    <img src={imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      無圖片
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{menu.name}</h3>
                    <div className="flex gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                      {menu.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          預設
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-1">列文字：{menu.chat_bar_text}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    尺寸：{menu.size_height === 1686 ? '全尺寸' : '半尺寸'} ・
                    區域：{menu.areas?.length || 0} 個
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/channels/${channelId}/richmenu/${menu.id}`}
                      className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      編輯
                    </Link>

                    {menu.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(menu)}
                        disabled={isLoading}
                        className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? '處理中...' : '發布到 LINE'}
                      </button>
                    )}

                    {menu.status === 'published' && !menu.is_default && (
                      <button
                        onClick={() => handleSetDefault(menu)}
                        disabled={isLoading}
                        className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? '處理中...' : '設為預設'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(menu)}
                      disabled={isLoading}
                      className="text-sm px-3 py-1.5 text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
