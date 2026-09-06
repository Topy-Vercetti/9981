import { beforeEach, describe, expect, it } from 'vitest'
import { assetRefForView } from '../../../../meta-state/asset-ref'
import type { MaterialIdentity } from '../../../../meta-state/types'
import { __test_getDoc, __test_setDoc, createPlayerSpawn, dropMaterial, undo } from '../editor-store'
import type { MapDoc } from '../map-types'

function document(): MapDoc {
  return {
    id: 'drop-test', name: '拖放测试', layers: [{ id: 'ground', name: '地面' }],
    sceneNodes: [
      { id: 'a', name: 'A', scale: 'medium', layerId: 'ground', at: { x: 200, y: 200 } },
      { id: 'b', name: 'B', scale: 'medium', layerId: 'ground', at: { x: 800, y: 200 } },
    ],
    sceneBoxes: [],
    edges: [{ id: 'edge', from: 'a', to: 'b', directionality: 'unidirectional', points: [{ x: 200, y: 200 }, { x: 800, y: 200 }] }],
    obstructions: [], terrains: [], placements: [], decorations: [], playerSpawns: [], transitionBundles: {},
  }
}

function material(overrides: Partial<MaterialIdentity>): MaterialIdentity {
  return {
    id: 'material', name: '素材', introduction: '测试', textureAssetRef: assetRefForView('asset:test', 'world-top-down'),
    quality: 1, category: 'item', subtypeTags: [], capabilities: [], ...overrides,
  }
}

beforeEach(() => __test_setDoc(document()))

describe('category-specific material drops', () => {
  it('binds an AI player package only to a spawn', () => {
    const spawn = createPlayerSpawn('a', { x: 220, y: 210 }, 'seat-1')
    expect(spawn.ok).toBe(true)
    const ai = material({ category: 'ai-player', aiPlayer: { characterDef: 'd:hero', controllerRef: 'd:controller', profileRef: 'd:profile', defaultConfig: {} } })
    expect(dropMaterial(ai, { kind: 'scene', sceneId: 'a', at: { x: 200, y: 200 } }).ok).toBe(false)
    if (spawn.ok) expect(dropMaterial(ai, { kind: 'player-spawn', spawnId: spawn.createdId }).ok).toBe(true)
  })

  it('stores decorations outside placements', () => {
    expect(dropMaterial(material({ category: 'decoration', decoration: {} }), { kind: 'layer', layerId: 'ground', at: { x: 300, y: 300 } }).ok).toBe(true)
    expect(__test_getDoc().decorations).toHaveLength(1)
    expect(__test_getDoc().placements).toHaveLength(0)
  })

  it('inserts a transition node atomically and undo restores the edge', () => {
    const transition = material({ category: 'transition-scene', transitionScene: { nodeDef: 'd:transition/node', entranceDef: 'd:door/in', exitDef: 'd:door/out', defaultDirectionality: 'unidirectional' } })
    expect(dropMaterial(transition, { kind: 'edge', edgeId: 'edge' }).ok).toBe(true)
    expect(__test_getDoc().edges).toHaveLength(2)
    expect(__test_getDoc().sceneNodes).toHaveLength(3)
    undo()
    expect(__test_getDoc().edges.map((edge) => edge.id)).toEqual(['edge'])
  })
})
