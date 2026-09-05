import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { visibleLayers } from '../layers/layer-rules'

const stableIdArb = fc.stringMatching(/^[A-Za-z0-9_]{1,12}$/)
const layerIdsArb = fc.uniqueArray(stableIdArb, { minLength: 1, maxLength: 12 })

describe('devboard correctness properties', () => {
  it('Property 1: 当前图层是唯一可见编辑表面', () => {
    fc.assert(
      fc.property(layerIdsArb, fc.nat(), (ids, index) => {
        const currentId = ids[index % ids.length]!
        const layers = ids.map((id) => ({ id }))
        expect(visibleLayers(layers, currentId).map((layer) => layer.id)).toEqual([currentId])
      }),
      { numRuns: 200 },
    )
  })

  it('Property 2: 锁定贴纸不会进入可选项集', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.record({ id: stableIdArb, locked: fc.boolean() }), {
          selector: (item) => item.id,
          maxLength: 20,
        }),
        (stickers) => {
          const selectable = new Set(stickers.filter((item) => !item.locked).map((item) => item.id))
          for (const sticker of stickers) expect(selectable.has(sticker.id)).toBe(!sticker.locked)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('Property 3: 图层变换序列化保序且不产生废弃字段', () => {
    const transformedLayerArb = fc.record({
      id: stableIdArb,
      transform: fc.record({
        scaleX: fc.double({ min: 0.1, max: 10, noNaN: true }),
        scaleY: fc.double({ min: 0.1, max: 10, noNaN: true }),
        tx: fc.double({ min: -1000, max: 1000, noNaN: true }),
        ty: fc.double({ min: -1000, max: 1000, noNaN: true }),
      }),
    })
    fc.assert(
      fc.property(fc.array(transformedLayerArb, { maxLength: 10 }), (layers) => {
        const json = JSON.stringify({ layers })
        const parsed = JSON.parse(json) as { layers: typeof layers }
        expect(parsed.layers.map((layer) => layer.id)).toEqual(layers.map((layer) => layer.id))
        expect(json).not.toContain('"height"')
        expect(json).not.toContain('buildingGroups')
        expect(json).not.toContain('"bounds"')
      }),
      { numRuns: 200 },
    )
  })
})
