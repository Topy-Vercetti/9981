import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeMapDocument, type CanonicalMapData, type LegacyMapData } from '../types';
import { parseMapData, serializeMapData } from '../serialize';

const backdrop = { image: 'map.png', pixelWidth: 100, pixelHeight: 100, tileRows: 1, tileCols: 1 };

describe('map layer properties', () => {
  it('legacy normalization is idempotent', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 6 }),
      (floors) => {
        const uniqueFloors = [...new Set(floors)];
        const legacy: LegacyMapData = {
          schemaVersion: '1.0', id: 'legacy', name: '旧地图', backdrop, floors: uniqueFloors,
          nodes: uniqueFloors.map((floor, index) => ({ id: `n${index}`, def: 'd:scene/room', scale: 'medium', at: { x: 0.5, y: 0.5 }, floor })),
          edges: [], placements: [],
        };
        const once = normalizeMapDocument(legacy);
        expect(normalizeMapDocument(once)).toEqual(once);
      },
    ), { numRuns: 100 });
  });

  it('canonical serialization preserves layer order and references', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 6 }), (count) => {
      const layers = Array.from({ length: count }, (_, index) => ({ id: `layer:${index}`, name: `层${index}` }));
      const map: CanonicalMapData = {
        schemaVersion: '2.0', id: 'canonical', name: '地图', backdrop, layers,
        nodes: layers.map((layer, index) => ({ id: `n${index}`, def: 'd:scene/room', scale: 'medium', at: { x: 0.5, y: 0.5 }, layerId: layer.id })),
        edges: [], placements: [],
      };
      const roundtrip = parseMapData(serializeMapData(map));
      expect(roundtrip).toEqual(normalizeMapDocument(map));
      expect(roundtrip.layers.map((layer) => layer.id)).toEqual(layers.map((layer) => layer.id));
    }), { numRuns: 100 });
  });
});
