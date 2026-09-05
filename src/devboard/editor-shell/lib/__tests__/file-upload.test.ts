// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readSvgSize, sanitizeSvg } from '../file-upload'

describe('map image upload', () => {
  it('reads intrinsic SVG size from viewBox', () => {
    expect(readSvgSize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"/>'))
      .toEqual({ width: 640, height: 360 })
  })

  it('falls back to explicit SVG width and height', () => {
    expect(readSvgSize('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"/>'))
      .toEqual({ width: 320, height: 200 })
  })

  it('rejects SVG without a deterministic size', () => {
    expect(() => readSvgSize('<svg xmlns="http://www.w3.org/2000/svg" width="100%"/>'))
      .toThrow('viewBox')
  })

  it('removes executable content and external references', () => {
    const sanitized = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><image href="https://example.com/a.png"/></svg>')
    expect(sanitized).not.toContain('script')
    expect(sanitized).not.toContain('onload')
    expect(sanitized).not.toContain('https://')
  })
})
