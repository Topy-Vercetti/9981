import { describe, expect, it } from 'vitest';
import {
  deriveLayerId,
  normalizeMapDocument,
  type CanonicalMapData,
  type LegacyMapData,
  type MapLayer,
} from '../types';
import { parseMapData, serializeMapData } from '../serialize';
import { validateMapStructure } from '../validate';

const backdrop = () => ({ image: 'map.png', pixelWidth: 100, pixelHeight: 100, tileRows: 1, tileCols: 1 });

function canonicalMap(overrides: Partial<CanonicalMapData> = {}): CanonicalMapData {
  return {
    schemaVersion: '2.0',
    id: 'map',
    name: '地图',
    backdrop: backdrop(),
    layers: [{ id: 'ground', name: '地面层' }, { id: 'roof', name: '屋顶层' }],
    nodes: [
      { id: 'a', def: 'd:scene/room', scale: 'medium', at: { x: 0.2, y: 0.2 }, layerId: 'ground' },
      { id: 'b', def: 'd:scene/room', scale: 'medium', at: { x: 0.8, y: 0.8 }, layerId: 'roof' },
    ],
    edges: [],
    placements: [],
    ...overrides,
  };
}

describe('canonical layers', () => {
  it('normalizes legacy floors to stable layer ids without deprecated metadata', () => {
    const legacy: LegacyMapData = {
      schemaVersion: '1.0', id: 'legacy', name: '旧地图', backdrop: backdrop(), floors: [0, 2],
      nodes: [{ id: 'a', def: 'd:scene/room', scale: 'medium', at: { x: 0.5, y: 0.5 }, floor: 2 }],
      edges: [], placements: [],
    };
    const normalized = normalizeMapDocument(legacy);
    expect(normalized.layers).toEqual([{ id: deriveLayerId(0) }, { id: deriveLayerId(2) }]);
    expect(normalized.nodes[0]?.layerId).toBe(deriveLayerId(2));
  });

  it('validates unique ids and node references', () => {
    expect(validateMapStructure(canonicalMap())).toEqual([]);
    expect(validateMapStructure(canonicalMap({ layers: [{ id: 'same' }, { id: 'same' }] as MapLayer[] })).some((item) => item.code === 'MAP_DUPLICATE_LAYER_ID')).toBe(true);
    expect(validateMapStructure(canonicalMap({ nodes: [{ ...canonicalMap().nodes[0]!, layerId: 'missing' }] })).some((item) => item.code === 'MAP_LAYER_REF_NOT_FOUND')).toBe(true);
  });

  it('ignores and strips legacy height and buildingGroups fields', () => {
    const dirty = {
      ...canonicalMap(),
      layers: [{ id: 'ground', name: '地面层', height: 4 }],
      nodes: [{ ...canonicalMap().nodes[0]!, layerId: 'ground' }],
      buildingGroups: [{ id: 'old-building' }],
    } as unknown as CanonicalMapData;
    const normalized = normalizeMapDocument(dirty);
    const json = serializeMapData(normalized);
    expect(json).not.toContain('"height"');
    expect(json).not.toContain('buildingGroups');
  });

  it('roundtrips canonical documents deterministically', () => {
    const map = canonicalMap();
    const json = serializeMapData(map);
    expect(parseMapData(json)).toEqual(normalizeMapDocument(map));
    expect(serializeMapData(map)).toBe(json);
    expect(json).not.toContain('"floor"');
  });
});
