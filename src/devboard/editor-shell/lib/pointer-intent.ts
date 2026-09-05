export function shouldStartMarquee(modifiers: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return modifiers.ctrlKey || modifiers.metaKey
}

export function exceedsDragThreshold(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 4,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold
}
