import { describe, expect, it } from 'vitest'
import { compileMap } from '../compile'
import { parseMapData, serializeMapData } from '../serialize'
import type { CanonicalMapData } from '../types'

const map: CanonicalMapData = {
  schemaVersion: '2.0',
  id: 'authoring-extension',
  name: '创作扩展测试',
  backdrop: { image: 'map.png', mediaType: 'bitmap', pixelWidth: 100, pixelHeight: 100, tileRows: 1, tileCols: 1 },
  mapScale: { standardCharacterWidth: 0.05 },
  layers: [{ id: 'ground' }],
  nodes: [{
    id: 'room',
    def: 'd:scene/room',
    scale: 'medium',
    at: { x: 0.5, y: 0.5 },
    layerId: 'ground',
    authorGeometry: { shape: 'rect', origin: { x: 0.2, y: 0.2 }, size: { x: 0.6, y: 0.6 } },
  }],
  edges: [],
  placements: [],
  decorations: [{ id: 'poster', assetRef: 'material:poster', layerId: 'ground', at: { x: 0.4, y: 0.4 } }],
  playerSpawns: [{ id: 'spawn-1', nodeId: 'room', layerId: 'ground', at: { x: 0.5, y: 0.5 }, seat: 'player-1', aiPlayerMaterialId: 'material:ai-1' }],
  transitionBundles: {},
}

describe('canonical authoring extensions', () => {
  it('round-trips author geometry, decorations and player spawns', () => {
    expect(parseMapData(serializeMapData(map))).toEqual(map)
  })

  it('does not compile decorations or player spawn bindings as gameplay entities', () => {
    const result = compileMap(map)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.prefab.entities).toEqual([])
  })
})
