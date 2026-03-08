import { useState } from 'react'

const ACTION_TYPES = [
  { value: 'uri', label: '開啟網址' },
  { value: 'message', label: '發送訊息' },
  { value: 'postback', label: 'Postback' },
]

export default function ActionConfig({ area, index, onChange }) {
  const action = area.action || { type: 'uri', uri: '' }

  const handleTypeChange = (type) => {
    const newAction = { type }
    if (type === 'uri') newAction.uri = ''
    else if (type === 'message') newAction.text = ''
    else if (type === 'postback') { newAction.data = ''; newAction.displayText = '' }
    onChange(index, { ...area, action: newAction })
  }

  const handleFieldChange = (field, value) => {
    onChange(index, { ...area, action: { ...action, [field]: value } })
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">區域 {index + 1}</h4>
        <span className="text-xs text-gray-400">
          ({area.bounds.x}, {area.bounds.y}) {area.bounds.width}x{area.bounds.height}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">動作類型</label>
          <select
            value={action.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {action.type === 'uri' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">網址 (URI)</label>
            <input
              type="url"
              value={action.uri || ''}
              onChange={(e) => handleFieldChange('uri', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {action.type === 'message' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">訊息文字</label>
            <input
              type="text"
              value={action.text || ''}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              placeholder="使用者點擊後發送的訊息"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {action.type === 'postback' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Postback Data</label>
              <input
                type="text"
                value={action.data || ''}
                onChange={(e) => handleFieldChange('data', e.target.value)}
                placeholder="action=buy&itemid=123"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">顯示文字（選填）</label>
              <input
                type="text"
                value={action.displayText || ''}
                onChange={(e) => handleFieldChange('displayText', e.target.value)}
                placeholder="使用者看到的文字"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
