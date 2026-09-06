import type { ActorKind, MaterialIdentity, RuntimeEntityRef } from './types'

export const MATERIAL_TOP_CATEGORIES = [
  'npc',
  'ai-player',
  'vehicle',
  'item',
  'mechanism',
  'decoration',
  'container',
  'transition-scene',
] as const

export type MaterialTopCategory = (typeof MATERIAL_TOP_CATEGORIES)[number]

export const MATERIAL_CATEGORY_LABELS: Readonly<Record<MaterialTopCategory, string>> = {
  npc: 'NPC',
  'ai-player': 'AI 玩家角色包',
  vehicle: '载具',
  item: '物品',
  mechanism: '装置机关',
  decoration: '装饰',
  container: '容器',
  'transition-scene': '过渡场景',
}

export type LegacyDisplayCategory =
  | '装置' | '照明' | '陈设' | '交互' | '线索' | '遮挡'
  | '物品' | '武器' | '载具' | '生物' | '角色' | '机制' | '氛围' | '蓝本'

export interface MaterialCategoryDiagnostic {
  readonly code: 'MATERIAL_CATEGORY_AMBIGUOUS' | 'MATERIAL_BLUEPRINT_NOT_MATERIAL'
  readonly legacyCategory: LegacyDisplayCategory
  readonly message: string
  readonly correction: string
}

export type MaterialCategoryMigration =
  | { readonly ok: true; readonly category: MaterialTopCategory; readonly subtypeTags: readonly string[] }
  | { readonly ok: false; readonly diagnostic: MaterialCategoryDiagnostic }

const DIRECT_LEGACY_MIGRATIONS: Partial<Record<LegacyDisplayCategory, MaterialTopCategory>> = {
  物品: 'item',
  武器: 'item',
  载具: 'vehicle',
  生物: 'npc',
  角色: 'npc',
}

function categoryFromRuntimeRef(ref: RuntimeEntityRef | undefined): MaterialTopCategory | undefined {
  if (ref === undefined) return undefined
  switch (ref.kind) {
    case 'npc': return 'npc'
    case 'vehicle': return 'vehicle'
    case 'item':
    case 'weapon': return 'item'
    case 'interactive': return 'mechanism'
    case 'character': return 'npc'
    case 'environment': return undefined
  }
}

export function migrateLegacyMaterialCategory(input: {
  readonly displayCategory: LegacyDisplayCategory
  readonly runtimeEntityRef?: RuntimeEntityRef
  readonly actorKind?: ActorKind
  readonly capabilities?: readonly string[]
}): MaterialCategoryMigration {
  const legacyCategory = input.displayCategory
  if (legacyCategory === '蓝本') {
    return {
      ok: false,
      diagnostic: {
        code: 'MATERIAL_BLUEPRINT_NOT_MATERIAL',
        legacyCategory,
        message: '蓝本是独立地图资产，不属于八类素材。',
        correction: '迁移到 MetaState.blueprints，不要登记为 MaterialIdentity。',
      },
    }
  }

  if (input.actorKind === 'ai-player') {
    return { ok: true, category: 'ai-player', subtypeTags: [legacyCategory] }
  }
  const capabilities = new Set(input.capabilities ?? [])
  if (capabilities.has('container') || capabilities.has('carrier')) {
    return { ok: true, category: 'container', subtypeTags: [legacyCategory] }
  }
  const runtimeCategory = categoryFromRuntimeRef(input.runtimeEntityRef)
  if (runtimeCategory !== undefined) {
    return { ok: true, category: runtimeCategory, subtypeTags: [legacyCategory] }
  }
  const direct = DIRECT_LEGACY_MIGRATIONS[legacyCategory]
  if (direct !== undefined) return { ok: true, category: direct, subtypeTags: [legacyCategory] }

  return {
    ok: false,
    diagnostic: {
      code: 'MATERIAL_CATEGORY_AMBIGUOUS',
      legacyCategory,
      message: `旧分类「${legacyCategory}」不能仅凭名称安全迁移。`,
      correction: '补充运行时引用或能力标记后重试；纯表现对象应明确登记为 decoration。',
    },
  }
}

export interface MaterialIdentityDiagnostic {
  readonly code: 'MATERIAL_PAYLOAD_MISSING' | 'MATERIAL_CAPABILITY_MISMATCH'
  readonly message: string
}

/** 登记前守住类别与玩法能力边界；一次返回全部问题。 */
export function validateMaterialIdentity(identity: MaterialIdentity): readonly MaterialIdentityDiagnostic[] {
  const diagnostics: MaterialIdentityDiagnostic[] = []
  const add = (code: MaterialIdentityDiagnostic['code'], message: string) => diagnostics.push({ code, message })
  if (identity.category === 'decoration' && (identity.runtimeEntityRef !== undefined || identity.capabilities.length > 0)) {
    add('MATERIAL_CAPABILITY_MISMATCH', '装饰不得携带运行时实体引用或玩法能力。')
  }
  if (identity.category === 'container' && !identity.capabilities.some((capability) => capability === 'container' || capability === 'carrier')) {
    add('MATERIAL_CAPABILITY_MISMATCH', '容器必须声明 container 或 carrier 能力。')
  }
  if (identity.category === 'ai-player') {
    if (identity.aiPlayer === undefined) add('MATERIAL_PAYLOAD_MISSING', 'AI 玩家角色包必须绑定角色、控制器、profile 和默认配置。')
    if (identity.actorBinding?.kind === 'npc') add('MATERIAL_CAPABILITY_MISMATCH', 'AI 玩家角色包不能使用 NPC actor binding。')
  }
  if (identity.category === 'npc' && identity.actorBinding?.kind === 'ai-player') {
    add('MATERIAL_CAPABILITY_MISMATCH', 'NPC 不能使用玩家 AI controller 路径。')
  }
  if (identity.category === 'transition-scene' && identity.transitionScene === undefined) {
    add('MATERIAL_PAYLOAD_MISSING', '过渡场景必须声明节点与两侧门户定义。')
  }
  const expectedRuntimeKinds: Partial<Record<MaterialTopCategory, readonly RuntimeEntityRef['kind'][]>> = {
    npc: ['npc', 'character'],
    vehicle: ['vehicle'],
    item: ['item', 'weapon'],
    mechanism: ['interactive'],
    container: ['interactive', 'item'],
  }
  const expected = expectedRuntimeKinds[identity.category]
  if (identity.runtimeEntityRef !== undefined && expected !== undefined && !expected.includes(identity.runtimeEntityRef.kind)) {
    add('MATERIAL_CAPABILITY_MISMATCH', `类别 ${identity.category} 与运行时实体类型 ${identity.runtimeEntityRef.kind} 不兼容。`)
  }
  return diagnostics
}

export function isMaterialTopCategory(value: string): value is MaterialTopCategory {
  return (MATERIAL_TOP_CATEGORIES as readonly string[]).includes(value)
}
