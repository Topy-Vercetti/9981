// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __test_setDoc,
  beginCrossLayerEdge,
  cancelCrossLayerEdge,
  completeCrossLayerEdge,
  deleteSelection,
  getState,
  removeLayer,
  setCurrentLayer,
  setCurrentLayerByIndex,
  setSelection,
} from '../editor-store'
import type { MapDoc } from '../map-types'

const doc = (): MapDoc => ({
  id: 'layers',
  name: 'Layer isolation',
  layers: [{ id: 'ground', name: '地面' }, { id: 'roof', name: '屋顶' }],
  sceneNodes: [
    { id: 'scene-ground', name: '入口', scale: 'medium', layerId: 'ground', at: { x: 100, y: 100 } },
    { id: 'scene-roof', name: '天台', scale: 'medium', layerId: 'roof', at: { x: 400, y: 400 } },
  ],
  sceneBoxes: [
    { id: 'box-ground', sceneId: 'scene-ground', x: 50, y: 50, width: 100, height: 100 },
    { id: 'box-roof', sceneId: 'scene-roof', x: 350, y: 350, width: 100, height: 100 },
  ],
  edges: [
    { id: 'edge-cross', from: 'scene-ground', to: 'scene-roof', directionality: 'bidirectional', points: [{ x: 100, y: 100 }, { x: 400, y: 400 }] },
  ],
  obstructions: [
    { id: 'ob-ground', layerId: 'ground', type: 'visual', x: 10, y: 10, width: 20, height: 20, rotation: 0, affectsEdges: ['edge-cross'] },
  ],
  terrains: [
    { id: 'terrain-roof', layerId: 'roof', type: 'highland', x: 300, y: 300, width: 40, height: 40, rotation: 0 },
  ],
  placements: [
    { id: 'placement-ground', materialId: 'mat', sceneId: 'scene-ground', x: 100, y: 100 },
  ],
})

describe('layer workspace operations', () => {
  beforeEach(() => {
    __test_setDoc(doc())
    setCurrentLayer('ground')
    setSelection([])
  })

  it('switching layer clears selections that do not belong to the destination layer', () => {
    setSelection([
      { type: 'scene', id: 'scene-ground' },
      { type: 'placement', id: 'placement-ground' },
      { type: 'obstruction', id: 'ob-ground' },
      { type: 'edge', id: 'edge-cross' },
    ])
    setCurrentLayerByIndex(1)
    expect(getState().currentLayerId).toBe('roof')
    expect(getState().selection).toEqual([{ type: 'edge', id: 'edge-cross' }])
  })

  it('completes and cancels a one-shot cross-layer edge relay', () => {
    expect(beginCrossLayerEdge('scene-ground', 'roof')).toBe(true)
    expect(getState().currentLayerId).toBe('roof')
    expect(getState().crossLayerEdgeDraft).toEqual({
      fromSceneId: 'scene-ground',
      fromLayerId: 'ground',
      targetLayerId: 'roof',
    })
    expect(completeCrossLayerEdge('scene-ground')).toBeNull()
    const edgeId = completeCrossLayerEdge('scene-roof')
    expect(edgeId).toBeTruthy()
    expect(getState().crossLayerEdgeDraft).toBeNull()
    expect(getState().doc.edges.some((edge) => edge.id === edgeId && edge.from === 'scene-ground' && edge.to === 'scene-roof')).toBe(true)

    expect(beginCrossLayerEdge('scene-ground', 'roof')).toBe(true)
    cancelCrossLayerEdge()
    expect(getState().crossLayerEdgeDraft).toBeNull()
  })

  it('deleting the source scene cancels an active relay', () => {
    expect(beginCrossLayerEdge('scene-ground', 'roof')).toBe(true)
    setSelection([{ type: 'scene', id: 'scene-ground' }])
    deleteSelection()
    expect(getState().crossLayerEdgeDraft).toBeNull()
  })

  it('deleting a layer cascades its scenes, figures, placements and connected edges', () => {
    setSelection([
      { type: 'scene', id: 'scene-ground' },
      { type: 'placement', id: 'placement-ground' },
      { type: 'obstruction', id: 'ob-ground' },
      { type: 'edge', id: 'edge-cross' },
    ])
    removeLayer('ground')
    const state = getState()
    expect(state.currentLayerId).toBe('roof')
    expect(state.doc.layers.map((layer) => layer.id)).toEqual(['roof'])
    expect(state.doc.sceneNodes.map((scene) => scene.id)).toEqual(['scene-roof'])
    expect(state.doc.sceneBoxes.map((box) => box.id)).toEqual(['box-roof'])
    expect(state.doc.edges).toEqual([])
    expect(state.doc.obstructions).toEqual([])
    expect(state.doc.placements).toEqual([])
    expect(state.doc.terrains.map((terrain) => terrain.id)).toEqual(['terrain-roof'])
    expect(state.selection).toEqual([])
  })
})
