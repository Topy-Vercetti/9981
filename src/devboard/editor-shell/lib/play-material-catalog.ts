/* =========================================================================
   真实玩法素材接线层 —— 只读投影 src/play/profiles/* 到素材库卡片模型

   这是"素材库已有实现"与"真实可玩内容"之间唯一的接线点：不改动 zero-render
   内核也不改动 profiles 本身的数据契约，只在开发板这一侧把 JSON 蓝图转成
   library-data.ts 认识的 MaterialMeta 形状，并挂上 304 个词条图标里挑出的
   语义匹配图标（game-icons--*.svg，通过 Vite `?url` 静态引入拿到可用路径）。

   物品 / 武器 / 载具 / 生物 / 状态 五个新类别，与原有装置/照明/陈设/交互/
   线索/遮挡的占位类别并列展示——各走各的图标与品级来源，互不覆盖。
   ========================================================================= */

import type { MaterialMeta, MaterialSource, Quality } from './library-data'

export type RealMaterialCategory = '物品' | '武器' | '载具' | '生物' | '状态'

export const REAL_CATEGORIES: RealMaterialCategory[] = ['物品', '武器', '载具', '生物', '状态']

/* ------------------------------------------------------------- 静态资源 ---- */

const iconModules = import.meta.glob<string>('../../../svg-game-icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

function iconUrl(slug: string): string {
  const suffix = `game-icons--${slug}.svg`
  const key = Object.keys(iconModules).find((k) => k.endsWith(suffix))
  if (!key) throw new Error(`Missing icon asset for slug: ${slug}`)
  const url = iconModules[key]
  if (!url) throw new Error(`Icon module has no url for slug: ${slug}`)
  return url
}

type ProfileModule = { default: Record<string, unknown> }

const itemFiles = import.meta.glob<ProfileModule>('../../../play/profiles/items/*.json', { eager: true })
const weaponFiles = import.meta.glob<ProfileModule>('../../../play/profiles/weapons/*.json', { eager: true })
const vehicleFiles = import.meta.glob<ProfileModule>('../../../play/profiles/vehicles/*.json', { eager: true })
const npcFiles = import.meta.glob<ProfileModule>('../../../play/profiles/npcs/*.json', { eager: true })
const statusFiles = import.meta.glob<ProfileModule>('../../../play/profiles/statuses/*.json', { eager: true })

function profilesByStem(files: Record<string, ProfileModule>): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>()
  Object.entries(files).forEach(([path, mod]) => {
    const stem = path.split('/').pop()?.replace(/\.json$/, '')
    if (!stem) throw new Error(`Cannot derive stem from profile path: ${path}`)
    out.set(stem, mod.default)
  })
  return out
}

const ITEMS = profilesByStem(itemFiles)
const WEAPONS = profilesByStem(weaponFiles)
const VEHICLES = profilesByStem(vehicleFiles)
const NPCS = profilesByStem(npcFiles)
const STATUSES = profilesByStem(statusFiles)

/* --------------------------------------------------------- 图标语义映射 ---- */

const ITEM_ICONS: Record<string, string> = {
  item_antidote: 'pill',
  item_bandage: 'first-aid-kit',
  item_bulletproof_vest_light: 'kevlar-vest',
  item_bulletproof_vest_medium: 'kevlar-vest',
  item_energy_drink: 'drink-me',
  item_iced_americano: 'drink-me',
  item_key: 'key',
  item_lockpick: 'skeleton-key',
  item_magazine: 'machine-gun-magazine',
  item_medkit: 'medical-pack',
  item_shield_civilian: 'attached-shield',
  item_shield_riot: 'arrows-shield',
}

const WEAPON_ICONS: Record<string, string> = {
  wp_axe_fire: 'axe-swing',
  wp_bat_baseball: 'high-punch',
  wp_fists: 'punch',
  wp_knife_combat: 'swiss-army-knife',
  wp_machinegun_m249: 'machine-gun',
  wp_pistol_quickdraw: 'revolver',
  wp_pistol_standard: 'revolver',
  wp_rifle_assault: 'winchester-rifle',
  wp_shotgun_pump: 'gun-stock',
  wp_smg_uzi: 'gunshot',
  wp_sniper_m24: 'winchester-rifle',
}

const VEHICLE_ICONS: Record<string, string> = {
  ambulance: 'car-key',
  armored_car: 'car-door',
  ebike: 'aero-bike',
  jeep: 'car-key',
  sedan: 'car-door',
}

const NPC_ICONS: Record<string, string> = {
  civilian_hider: 'walk',
  civilian_runner: 'walk',
  guard_elite: 'police-officer-head',
  guard_standard: 'police-officer-head',
  zombie_common: 'alien-skull',
  zombie_rusher: 'alien-skull',
}

const STATUS_ICONS: Record<string, string> = {
  status_aiming: 'on-target',
  status_blocking: 'shield-bash',
  status_burning: 'fire',
  status_concealed: 'walk',
  status_downed: 'falling',
  status_frozen: 'ice-cube',
  status_hastened: 'heavy-lightning',
  status_heavy: 'heavy-bullets',
  status_knocked_down: 'falling',
  status_lockpicking: 'skeleton-key',
  status_overloaded: 'heavy-lightning',
  status_poisoned: 'shield-disabled',
  status_radiation: 'fallout-shelter',
  status_sleeping: 'alarm-clock',
  status_slowed: 'anticlockwise-rotation',
  status_staggered: 'shield-bounces',
  status_stunned: 'stun-grenade',
  status_traveling: 'walk',
  status_weak: 'biceps',
}

/* --------------------------------------------------------------- 品级 ---- */

const ITEM_QUALITY: Record<string, Quality> = {
  item_bandage: 1,
  item_energy_drink: 1,
  item_iced_americano: 1,
  item_key: 1,
  item_antidote: 2,
  item_lockpick: 2,
  item_magazine: 2,
  item_shield_civilian: 2,
  item_bulletproof_vest_light: 3,
  item_medkit: 3,
  item_bulletproof_vest_medium: 4,
  item_shield_riot: 4,
}

const WEAPON_QUALITY: Record<string, Quality> = {
  wp_fists: 1,
  wp_bat_baseball: 2,
  wp_knife_combat: 2,
  wp_pistol_quickdraw: 2,
  wp_pistol_standard: 2,
  wp_axe_fire: 3,
  wp_smg_uzi: 3,
  wp_machinegun_m249: 4,
  wp_rifle_assault: 4,
  wp_shotgun_pump: 4,
  wp_sniper_m24: 5,
}

const VEHICLE_QUALITY: Record<string, Quality> = {
  ebike: 2,
  jeep: 3,
  sedan: 3,
  ambulance: 4,
  armored_car: 5,
}

const NPC_QUALITY: Record<string, Quality> = {
  civilian_hider: 1,
  civilian_runner: 1,
  zombie_common: 2,
  guard_standard: 3,
  zombie_rusher: 3,
  guard_elite: 5,
}

/** 状态无品级概念，卡片一律按「稀有」中性色展示 */
const STATUS_QUALITY: Quality = 3

/** 状态极性：正/中性状态给青色辉光，负面状态给暖色辉光（呼应异常告警） */
const STATUS_DEBUFFS = new Set([
  'status_burning',
  'status_downed',
  'status_frozen',
  'status_heavy',
  'status_knocked_down',
  'status_overloaded',
  'status_poisoned',
  'status_radiation',
  'status_sleeping',
  'status_slowed',
  'status_staggered',
  'status_stunned',
  'status_weak',
])

/* ----------------------------------------------------------- 派生工具 ---- */

function nameOf(profile: Record<string, unknown>, fallback: string): string {
  const n = profile['name']
  return typeof n === 'string' && n.length > 0 ? n : fallback
}

function descOf(profile: Record<string, unknown>, fallback: string): string {
  const d = profile['description']
  return typeof d === 'string' && d.length > 0 ? d : fallback
}

function buildEntry(
  id: string,
  profile: Record<string, unknown>,
  category: RealMaterialCategory,
  quality: Quality,
  iconSlug: string,
  glow: 'cyan' | 'warm' | null,
  source: MaterialSource = 'standard',
): MaterialMeta {
  return {
    id,
    name: nameOf(profile, id),
    category,
    quality,
    owned: true,
    source,
    starred: false,
    modified: false,
    isUgcNew: false,
    limitedFree: false,
    weakness: null,
    equippedTokens: [null, null, null, null, null],
    tile: 0,
    glow,
    desc: descOf(profile, `${category}·${id}`),
    freeRemaining: null,
    icon: iconUrl(iconSlug),
  }
}

function buildItems(): MaterialMeta[] {
  return Array.from(ITEMS.entries()).map(([id, profile]) => {
    const icon = ITEM_ICONS[id]
    const quality = ITEM_QUALITY[id]
    if (!icon || !quality) throw new Error(`Item ${id} is missing icon/quality wiring`)
    return buildEntry(id, profile, '物品', quality, icon, quality >= 4 ? 'cyan' : null)
  })
}

function buildWeapons(): MaterialMeta[] {
  return Array.from(WEAPONS.entries()).map(([id, profile]) => {
    const icon = WEAPON_ICONS[id]
    const quality = WEAPON_QUALITY[id]
    if (!icon || !quality) throw new Error(`Weapon ${id} is missing icon/quality wiring`)
    return buildEntry(id, profile, '武器', quality, icon, quality >= 4 ? 'cyan' : null)
  })
}

function buildVehicles(): MaterialMeta[] {
  return Array.from(VEHICLES.entries()).map(([id, profile]) => {
    const icon = VEHICLE_ICONS[id]
    const quality = VEHICLE_QUALITY[id]
    if (!icon || !quality) throw new Error(`Vehicle ${id} is missing icon/quality wiring`)
    return buildEntry(id, profile, '载具', quality, icon, quality >= 4 ? 'cyan' : null)
  })
}

function buildNpcs(): MaterialMeta[] {
  return Array.from(NPCS.entries()).map(([id, profile]) => {
    const icon = NPC_ICONS[id]
    const quality = NPC_QUALITY[id]
    if (!icon || !quality) throw new Error(`NPC ${id} is missing icon/quality wiring`)
    return buildEntry(id, profile, '生物', quality, icon, quality >= 4 ? 'cyan' : null)
  })
}

function buildStatuses(): MaterialMeta[] {
  return Array.from(STATUSES.entries()).map(([id, profile]) => {
    const icon = STATUS_ICONS[id]
    if (!icon) throw new Error(`Status ${id} is missing icon wiring`)
    const glow: 'cyan' | 'warm' = STATUS_DEBUFFS.has(id) ? 'warm' : 'cyan'
    return buildEntry(id, profile, '状态', STATUS_QUALITY, icon, glow)
  })
}

/** 5 类真实玩法素材（物品/武器/载具/生物/状态），全部标记为已拥有（owned=true）。 */
export const REAL_MATERIALS: MaterialMeta[] = [
  ...buildItems(),
  ...buildWeapons(),
  ...buildVehicles(),
  ...buildNpcs(),
  ...buildStatuses(),
]
