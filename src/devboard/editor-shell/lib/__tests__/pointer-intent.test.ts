import { describe, expect, it } from 'vitest'
import { exceedsDragThreshold, shouldStartMarquee } from '../pointer-intent'

describe('canvas pointer intent', () => {
  it('uses ordinary blank dragging for pan', () => {
    expect(shouldStartMarquee({ ctrlKey: false, metaKey: false })).toBe(false)
  })

  it('uses Control or Command blank dragging for marquee selection', () => {
    expect(shouldStartMarquee({ ctrlKey: true, metaKey: false })).toBe(true)
    expect(shouldStartMarquee({ ctrlKey: false, metaKey: true })).toBe(true)
  })

  it('distinguishes a confirmation click from a deliberate drag', () => {
    expect(exceedsDragThreshold({ x: 10, y: 10 }, { x: 12, y: 12 })).toBe(false)
    expect(exceedsDragThreshold({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true)
  })
})
