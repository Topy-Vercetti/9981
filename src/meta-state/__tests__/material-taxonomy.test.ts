import { describe, expect, it } from 'vitest'
import { MATERIAL_TOP_CATEGORIES, migrateLegacyMaterialCategory } from '../material-taxonomy'

describe('material taxonomy', () => {
  it('has exactly eight stable top-level categories', () => {
    expect(new Set(MATERIAL_TOP_CATEGORIES).size).toBe(8)
  })

  it('uses capabilities before a legacy display label', () => {
    expect(migrateLegacyMaterialCategory({ displayCategory: '装置', capabilities: ['container'] })).toEqual({
      ok: true,
      category: 'container',
      subtypeTags: ['装置'],
    })
  })

  it('keeps blueprints outside material categories and blocks ambiguous migration', () => {
    expect(migrateLegacyMaterialCategory({ displayCategory: '蓝本' })).toMatchObject({
      ok: false,
      diagnostic: { code: 'MATERIAL_BLUEPRINT_NOT_MATERIAL' },
    })
    expect(migrateLegacyMaterialCategory({ displayCategory: '照明' })).toMatchObject({
      ok: false,
      diagnostic: { code: 'MATERIAL_CATEGORY_AMBIGUOUS' },
    })
  })
})
