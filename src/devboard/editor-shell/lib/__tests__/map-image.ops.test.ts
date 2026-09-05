// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __test_setDoc,
  addLayerFromImage,
  confirmPendingLayer,
  getState,
  removeLayer,
  scalePendingLayer,
  setCamera,
} from '../editor-store'
import type { MapDoc } from '../map-types'

function blankDoc(): MapDoc {
  return {
    id: 'blank',
    name: 'Blank',
    mapScale: { standardCharacterWidth: 80 },
    layers: [{ id: 'default', name: '默认图层' }],
    sceneNodes: [],
    sceneBoxes: [],
    edges: [],
    obstructions: [],
    terrains: [],
    placements: [],
  }
}

describe('map image layer operations', () => {
  beforeEach(() => {
    confirmPendingLayer()
    __test_setDoc(blankDoc())
    setCamera({ x: 0, y: 0, w: 1600, h: 1000 })
  })

  it('reuses an empty first layer and contains the image with equal scale', () => {
    addLayerFromImage({ dataUrl: 'data:image/svg+xml,test', mediaType: 'svg', pixelWidth: 800, pixelHeight: 800, name: 'vector' })
    const state = getState()
    expect(state.doc.layers).toHaveLength(1)
    expect(state.pendingLayerId).toBe('default')
    expect(state.doc.layers[0]?.backdrop?.mediaType).toBe('svg')
    expect(state.doc.layers[0]?.transform).toEqual({ scaleX: 1.25, scaleY: 1.25, tx: 300, ty: 0 })
  })

  it('wheel-scale action remains uniform and confirmation locks further changes', () => {
    addLayerFromImage({ dataUrl: 'data:image/png;base64,test', mediaType: 'bitmap', pixelWidth: 800, pixelHeight: 400 })
    const before = getState().doc.layers[0]?.transform
    scalePendingLayer(0.5)
    const after = getState().doc.layers[0]?.transform
    expect(after?.scaleX).toBe(after?.scaleY)
    expect((after?.tx ?? 0) + 800 * (after?.scaleX ?? 0) / 2).toBe((before?.tx ?? 0) + 800 * (before?.scaleX ?? 0) / 2)
    expect((after?.ty ?? 0) + 400 * (after?.scaleY ?? 0) / 2).toBe((before?.ty ?? 0) + 400 * (before?.scaleY ?? 0) / 2)
    const scale = after?.scaleX
    confirmPendingLayer()
    scalePendingLayer(2)
    expect(getState().doc.layers[0]?.transform?.scaleX).toBe(scale)
  })

  it('deleting the only image layer leaves a fresh blank layer', () => {
    addLayerFromImage({ dataUrl: 'data:image/png;base64,test', mediaType: 'bitmap', pixelWidth: 800, pixelHeight: 400 })
    removeLayer('default')
    expect(getState().doc.layers).toHaveLength(1)
    expect(getState().doc.layers[0]?.backdrop).toBeUndefined()
    expect(getState().pendingLayerId).toBeNull()
  })
})
