import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setChannels(data || [])
    setLoading(false)
  }

  const handleAddChannel = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    // 重新取得最新 session 確保 JWT 有效
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) {
      setError('登入已過期，請重新登入')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('channels').insert({
      user_id: currentSession.user.id,
      channel_name: channelName,
      channel_access_token: accessToken,
    })

    if (error) {
      setError(`${error.message} (code: ${error.code}, hint: ${error.hint || 'none'})`)
    } else {
      setChannelName('')
      setAccessToken('')
      setShowModal(false)
      fetchChannels()
    }
    setSaving(false)
  }

  const handleDeleteChannel = async (id) => {
    if (!confirm('確定要刪除此頻道？相關的圖文選單也會一併刪除。')) return
    await supabase.from('channels').delete().eq('id', id)
    fetchChannels()
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-12">載入中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的頻道</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
        >
          + 新增頻道
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">尚未建立任何頻道</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
          >
            建立第一個頻道
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <Link to={`/channels/${channel.id}`} className="block">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{channel.channel_name}</h3>
                <p className="text-sm text-gray-500">
                  建立於 {new Date(channel.created_at).toLocaleDateString('zh-TW')}
                </p>
              </Link>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleDeleteChannel(channel.id)}
                  className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">新增 LINE 頻道</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">頻道名稱</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                  placeholder="例如：我的官方帳號"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
                <textarea
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  required
                  rows={3}
                  placeholder="從 LINE Developers Console 取得"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError('') }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
