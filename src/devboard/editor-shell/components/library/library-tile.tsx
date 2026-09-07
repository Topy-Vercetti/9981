'use client'

import { tileStyle } from '@editor/lib/materials'

/**
 * 素材贴图 —— 在编辑器 8×8 像素图集之上，按 glow 叠一层青色/暖色径向辉光
 * (lib-glow-*)，用同一套像素资源还原「像素前景 + 全息能量道具」的观感。
 * 只接收 tile + glow 两个最小字段，素材卡片与蓝本封面均可复用。外框由调用方决定。
 *
 * `textureUrl`：像素绘制器保存后的自定义贴图（PNG dataURL）覆盖优先于图集
 * tile——玩家改绘合成物贴图后，素材库卡片/详情预览随之更新（Spec §八验收）。
 *
 * `icon`：真实玩法素材（物品/武器/载具/生物/状态）挂的词条图标 SVG 地址，
 * 优先级低于 textureUrl（改绘贴图始终覆盖），高于占位像素图集 tile。
 */
export function LibTile({
  tile,
  glow = null,
  className = '',
  inset = '14%',
  textureUrl,
  icon,
}: {
  tile: number
  glow?: 'cyan' | 'warm' | null
  className?: string
  inset?: string
  textureUrl?: string | null
  icon?: string | null
}) {
  const glowClass = glow === 'cyan' ? 'lib-glow-cyan' : glow === 'warm' ? 'lib-glow-warm' : ''
  return (
    <div className={`relative ${glowClass} ${className}`}>
      {textureUrl ? (
        <div
          className="absolute [image-rendering:pixelated]"
          style={{
            inset,
            backgroundImage: `url(${textureUrl})`,
            backgroundSize: '100% 100%',
          }}
        />
      ) : icon ? (
        <div
          className="absolute [image-rendering:auto]"
          style={{
            inset,
            backgroundImage: `url(${icon})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'invert(1) brightness(1.15)',
          }}
        />
      ) : (
        <div className="absolute" style={{ inset, ...tileStyle(tile) }} />
      )}
    </div>
  )
}
