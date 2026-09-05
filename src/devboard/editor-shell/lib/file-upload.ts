'use client'

export type MapImageMediaType = 'bitmap' | 'svg'

export interface UploadedMapImage {
  dataUrl: string
  width: number
  height: number
  mediaType: MapImageMediaType
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('文件读取结果不是字符串'))
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

export function isPng(file: File): boolean {
  return file.size >= 8 && (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png'))
}

export function isSvg(file: File): boolean {
  return file.size > 0 && (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'))
}

export function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
    img.onerror = () => reject(new Error('无法解码图片'))
    img.src = dataUrl
  })
}

function positiveSvgLength(value: string | null): number | null {
  if (!value || /%$/.test(value.trim())) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseSvg(svgText: string): XMLDocument {
  const document = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (document.documentElement.localName !== 'svg' || document.querySelector('parsererror')) throw new Error('SVG 文件格式无效')
  return document
}

export function readSvgSize(svgText: string): { width: number; height: number } {
  const root = parseSvg(svgText).documentElement
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && (viewBox[2] ?? 0) > 0 && (viewBox[3] ?? 0) > 0) {
    return { width: viewBox[2] as number, height: viewBox[3] as number }
  }
  const width = positiveSvgLength(root.getAttribute('width'))
  const height = positiveSvgLength(root.getAttribute('height'))
  if (width && height) return { width, height }
  throw new Error('SVG 必须提供有效的 viewBox 或 width/height')
}

export function sanitizeSvg(svgText: string): string {
  const document = parseSvg(svgText)
  document.querySelectorAll('script,foreignObject,iframe,object,embed').forEach((node) => node.remove())
  document.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#') && !value.startsWith('data:image/'))) {
        node.removeAttribute(attribute.name)
      }
    }
  })
  return new XMLSerializer().serializeToString(document.documentElement)
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export function exceedsSizeLimit(file: File, limit = MAX_UPLOAD_BYTES): boolean {
  return file.size > limit
}

export async function uploadMapImage(file: File): Promise<UploadedMapImage> {
  if (exceedsSizeLimit(file)) throw new Error('图片超过 8MB 上限')
  const svgText = !isPng(file) ? await file.text() : ''
  if (isSvg(file) || /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svgText)) {
    const { width, height } = readSvgSize(svgText)
    const sanitized = sanitizeSvg(svgText)
    return {
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`,
      width,
      height,
      mediaType: 'svg',
    }
  }
  if (!isPng(file)) throw new Error('只支持 PNG 或 SVG 图片')
  const dataUrl = await fileToDataURL(file)
  const { width, height } = await readImageSize(dataUrl)
  return { dataUrl, width, height, mediaType: 'bitmap' }
}
