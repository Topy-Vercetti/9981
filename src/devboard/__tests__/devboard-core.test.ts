import { describe, expect, it } from 'vitest'
import { isVerticalTransition, shadowOnTransparency, visibleLayers } from '../layers/layer-rules'
import type { MapLayer } from '../layers/layer-shapes'
import { blueprintCopy, serializeMapPublish, stableMapId } from '../editor/map-io'
import { emptyLayer } from '../editor/workspace-state'
import type { MapData } from '../ports/map-contracts'

const layer = (id: string): MapLayer => ({ id })

describe('devboard 图层规则', () => {
  it('只暴露当前图层', () => {
    const layers = [layer('ground'), layer('roof')]
    expect(visibleLayers(layers, 'roof').map((item) => item.id)).toEqual(['roof'])
    expect(visibleLayers(layers, null)).toEqual([])
  })

  it('不同图层之间是跨层过渡', () => {
    expect(isVerticalTransition(layer('ground'), layer('roof'))).toBe(true)
    expect(isVerticalTransition(layer('ground'), layer('ground'))).toBe(false)
    expect(isVerticalTransition(undefined, layer('roof'))).toBe(false)
  })

  it('透明像素仍产生遮挡提示', () => {
    expect(shadowOnTransparency(true)).toBe(true)
    expect(shadowOnTransparency(false)).toBe(false)
  })
})

describe('devboard 加载 / 蓝本 / 导出', () => {
  const baseMap: MapData = {
    schemaVersion: '1.0',
    id: 'sample_sleeper',
    name: '卧铺车厢',
    backdrop: { image: 'sleeper.png', pixelWidth: 1920, pixelHeight: 1080, tileRows: 1, tileCols: 1 },
    floors: [0],
    nodes: [],
    edges: [],
    placements: [],
  }

  it('复制蓝本时产生稳定名称且不修改源地图', () => {
    const copy = blueprintCopy(baseMap, 'office tower')
    expect(copy.id).toBe(stableMapId('office tower'))
    expect(copy.id).toBe('office_tower')
    expect(copy.name).toBe('office tower')
    expect(baseMap.id).toBe('sample_sleeper')
  })

  it('稳定命名会规整空白和随机尾缀', () => {
    expect(stableMapId('a b c')).toBe('a_b_c')
    expect(stableMapId('hello_7f3a')).toBe('hello')
    expect(stableMapId('  ')).toBe('map')
  })

  it('导出 canonical layers/layerId 且不含废弃字段', () => {
    const layers = [layer('l0'), { ...layer('l1'), transform: { scaleX: 2, scaleY: 2, tx: 10, ty: 20 } }]
    const json = serializeMapPublish({ map: baseMap, layers })
    const parsed = JSON.parse(json) as { schemaVersion: string; layers: MapLayer[]; nodes: { layerId?: string }[] }
    expect(parsed.schemaVersion).toBe('2.0')
    expect(parsed.layers.map((item) => item.id)).toEqual(['l0', 'l1'])
    expect(parsed.layers[1]?.transform?.tx).toBe(10)
    expect(json).not.toContain('"floors"')
    expect(json).not.toContain('"height"')
    expect(json).not.toContain('buildingGroups')
    expect(json).not.toContain('"bounds"')
  })

  it('新建图层是无高度字段的空画布', () => {
    expect(emptyLayer('layer:0', '底')).toEqual({ id: 'layer:0', name: '底' })
  })
})
