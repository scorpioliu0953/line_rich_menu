import { useState, useRef } from 'react'

const MENU_WIDTH = 2500

const TEMPLATES = [
  {
    name: '2 欄',
    areas: (h) => [
      { x: 0, y: 0, width: 1250, height: h },
      { x: 1250, y: 0, width: 1250, height: h },
    ],
  },
  {
    name: '3 欄',
    areas: (h) => [
      { x: 0, y: 0, width: 833, height: h },
      { x: 833, y: 0, width: 834, height: h },
      { x: 1667, y: 0, width: 833, height: h },
    ],
  },
  {
    name: '2x2',
    areas: (h) => {
      const halfH = Math.floor(h / 2)
      return [
        { x: 0, y: 0, width: 1250, height: halfH },
        { x: 1250, y: 0, width: 1250, height: halfH },
        { x: 0, y: halfH, width: 1250, height: h - halfH },
        { x: 1250, y: halfH, width: 1250, height: h - halfH },
      ]
    },
  },
  {
    name: '3x2',
    areas: (h) => {
      const halfH = Math.floor(h / 2)
      return [
        { x: 0, y: 0, width: 833, height: halfH },
        { x: 833, y: 0, width: 834, height: halfH },
        { x: 1667, y: 0, width: 833, height: halfH },
        { x: 0, y: halfH, width: 833, height: h - halfH },
        { x: 833, y: halfH, width: 834, height: h - halfH },
        { x: 1667, y: halfH, width: 833, height: h - halfH },
      ]
    },
  },
  {
    name: '1 上 + 2 下',
    areas: (h) => {
      const halfH = Math.floor(h / 2)
      return [
        { x: 0, y: 0, width: 2500, height: halfH },
        { x: 0, y: halfH, width: 1250, height: h - halfH },
        { x: 1250, y: halfH, width: 1250, height: h - halfH },
      ]
    },
  },
]

const AREA_COLORS = [
  'rgba(59, 130, 246, 0.3)',
  'rgba(239, 68, 68, 0.3)',
  'rgba(34, 197, 94, 0.3)',
  'rgba(168, 85, 247, 0.3)',
  'rgba(245, 158, 11, 0.3)',
  'rgba(236, 72, 153, 0.3)',
]

const AREA_BORDER_COLORS = [
  'rgb(59, 130, 246)',
  'rgb(239, 68, 68)',
  'rgb(34, 197, 94)',
  'rgb(168, 85, 247)',
  'rgb(245, 158, 11)',
  'rgb(236, 72, 153)',
]

export default function AreaSelector({ areas, onChange, imageUrl, sizeHeight, selectedArea, onSelectArea }) {
  const containerRef = useRef(null)

  const applyTemplate = (template) => {
    const bounds = template.areas(sizeHeight)
    const newAreas = bounds.map((b) => ({
      bounds: b,
      action: { type: 'uri', uri: '' },
    }))
    onChange(newAreas)
  }

  const scale = containerRef.current
    ? containerRef.current.clientWidth / MENU_WIDTH
    : 0.25

  const displayHeight = sizeHeight * scale

  return (
    <div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">快速佈局模板</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative border border-gray-300 rounded-md overflow-hidden bg-gray-100"
        style={{ width: '100%', height: displayHeight || 'auto', aspectRatio: displayHeight ? undefined : `${MENU_WIDTH} / ${sizeHeight}` }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="選單圖片"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {areas.map((area, i) => {
          const s = containerRef.current ? containerRef.current.clientWidth / MENU_WIDTH : 0.25
          return (
            <div
              key={i}
              onClick={() => onSelectArea(i)}
              className="absolute cursor-pointer flex items-center justify-center transition-all"
              style={{
                left: area.bounds.x * s,
                top: area.bounds.y * s,
                width: area.bounds.width * s,
                height: area.bounds.height * s,
                backgroundColor: AREA_COLORS[i % AREA_COLORS.length],
                border: `2px solid ${AREA_BORDER_COLORS[i % AREA_BORDER_COLORS.length]}`,
                outline: selectedArea === i ? '3px solid #000' : 'none',
                outlineOffset: '-3px',
              }}
            >
              <span className="text-white font-bold text-sm drop-shadow-md">{i + 1}</span>
            </div>
          )
        })}

        {!imageUrl && areas.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            請先上傳圖片並選擇佈局模板
          </div>
        )}
      </div>
    </div>
  )
}
