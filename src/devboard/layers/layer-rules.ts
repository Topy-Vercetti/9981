import type { MapLayer } from './layer-shapes';

export interface LayerTreeInput {
  readonly layers: readonly MapLayer[];
}

/** 当前图层是唯一普通编辑表面。 */
export function visibleLayers(
  layers: readonly MapLayer[],
  currentId: string | null,
): readonly MapLayer[] {
  if (currentId === null) return [];
  return layers.filter((layer) => layer.id === currentId);
}

export function isVerticalTransition(from: MapLayer | undefined, to: MapLayer | undefined): boolean {
  return Boolean(from && to && from.id !== to.id);
}

export function shadowOnTransparency(stickerHasTransparencyAt: boolean): boolean {
  return stickerHasTransparencyAt;
}
