import { MATERIALS, materialById, type Material } from './materials'
import type { MaterialIdentity } from '../../../meta-state/types'
import type { MaterialTopCategory } from '../../../meta-state/material-taxonomy'
import { assetRefForView } from '../../../meta-state/asset-ref'

const TOP_CATEGORY: Record<Material['category'], MaterialTopCategory> = {
  装置: 'mechanism', 照明: 'decoration', 陈设: 'decoration', 交互: 'mechanism', 线索: 'item', 遮挡: 'decoration',
}

const CONTAINER_NAMES = new Set(['储物柜', '衣柜', '木箱', '集装箱'])

function slug(name: string): string {
  return name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function canonicalMaterialId(material: Material): string {
  return `material:${slug(material.name)}:${material.category}`
}

export function canonicalMaterialIdentity(material: Material): MaterialIdentity {
  return {
    id: canonicalMaterialId(material),
    name: material.name,
    introduction: `${material.name}，可用于梦境地图中的${material.category}表达。`,
    textureAssetRef: assetRefForView('asset:editor-material-atlas', 'world-top-down', `tile:${material.tile}`),
    quality: 1,
    category: CONTAINER_NAMES.has(material.name) ? 'container' : TOP_CATEGORY[material.category],
    subtypeTags: [material.category],
    capabilities: CONTAINER_NAMES.has(material.name) ? ['container', 'carrier'] : [],
    legacyDisplayCategory: material.category,
  }
}

const OLD_TO_CANONICAL = new Map(MATERIALS.map((material) => [material.id, canonicalMaterialId(material)]))
const CANONICAL_TO_OLD = new Map(MATERIALS.map((material) => [canonicalMaterialId(material), material.id]))

export function canonicalizeMaterialId(id: string): string | undefined {
  if (CANONICAL_TO_OLD.has(id)) return id
  return OLD_TO_CANONICAL.get(id)
}

export function legacyMaterialId(id: string): string | undefined {
  return CANONICAL_TO_OLD.get(id) ?? (materialById(id) ? id : undefined)
}

export function materialIdentityById(id: string): MaterialIdentity | undefined {
  const legacyId = legacyMaterialId(id)
  const material = legacyId ? materialById(legacyId) : undefined
  return material ? canonicalMaterialIdentity(material) : undefined
}

export const CANONICAL_MATERIALS = Object.freeze(MATERIALS.map(canonicalMaterialIdentity))
