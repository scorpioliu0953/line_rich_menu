import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import AreaSelector from './AreaSelector'
import ActionConfig from './ActionConfig'

export default function RichMenuEditor({ menu, channelId, session, onSave }) {
  const [name, setName] = useState(menu?.name || '')
  const [chatBarText, setChatBarText] = useState(menu?.chat_bar_text || '查看更多')
  const [sizeHeight, setSizeHeight] = useState(menu?.size_height || 1686)
  const [selected, setSelected] = useState(menu?.selected || false)
  const [areas, setAreas] = useState(menu?.areas || [])
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [selectedArea, setSelectedArea] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (menu?.image_path) {
      const { data } = supabase.storage
        .from('richmenu-images')
        .getPublicUrl(menu.image_path)
      setImageUrl(data.publicUrl)
    }
  }, [menu])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
  }

  const handleAreaChange = (index, updatedArea) => {
    const newAreas = [...areas]
    newAreas[index] = updatedArea
    setAreas(newAreas)
  }

  const handleSave = async () => {
    setError('')

    if (!name.trim()) {
      setError('請輸入選單名稱')
      return
    }
    if (!chatBarText.trim()) {
      setError('請輸入選單列文字')
      return
    }

    setSaving(true)

    try {
      let imagePath = menu?.image_path || null

      // Upload image if new file selected
      if (imageFile) {
        const menuId = menu?.id || crypto.randomUUID()
        const ext = imageFile.name.split('.').pop()
        const path = `${session.user.id}/${menuId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('richmenu-images')
          .upload(path, imageFile, { upsert: true })

        if (uploadError) throw uploadError
        imagePath = path
      }

      const menuData = {
        channel_id: channelId,
        name,
        chat_bar_text: chatBarText,
        size_height: sizeHeight,
        selected,
        image_path: imagePath,
        areas,
      }

      // Save via Netlify Function (bypasses RLS)
      await apiFetch('/.netlify/functions/menus', {
        method: 'POST',
        body: JSON.stringify({
          menuId: menu?.id || null,
          menuData,
        }),
      })

      onSave()
    } catch (err) {
      setError(err.message)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Basic Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">基本設定</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選單名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：主選單"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選單列文字</label>
            <input
              type="text"
              value={chatBarText}
              onChange={(e) => setChatBarText(e.target.value)}
              placeholder="查看更多"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選單尺寸</label>
            <select
              value={sizeHeight}
              onChange={(e) => setSizeHeight(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={1686}>全尺寸 (2500 x 1686)</option>
              <option value={843}>半尺寸 (2500 x 843)</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => setSelected(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700">預設展開選單</span>
            </label>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">選單圖片</h3>
        <div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:cursor-pointer"
          />
          <p className="mt-1 text-xs text-gray-500">
            建議尺寸：2500 x {sizeHeight} px，格式：PNG 或 JPEG，檔案大小上限 1 MB
          </p>
        </div>
      </div>

      {/* Area Editor */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">點擊區域設定</h3>
        <AreaSelector
          areas={areas}
          onChange={setAreas}
          imageUrl={imageUrl}
          sizeHeight={sizeHeight}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
        />
      </div>

      {/* Action Configs */}
      {areas.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">區域動作設定</h3>
          <div className="space-y-4">
            {areas.map((area, i) => (
              <div
                key={i}
                onClick={() => setSelectedArea(i)}
                className={selectedArea === i ? 'ring-2 ring-green-500 rounded-md' : ''}
              >
                <ActionConfig
                  area={area}
                  index={i}
                  onChange={handleAreaChange}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 cursor-pointer font-medium"
        >
          {saving ? '儲存中...' : '儲存草稿'}
        </button>
      </div>
    </div>
  )
}
