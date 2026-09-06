'use client'
/* =========================================================================
   editor-shell MapDoc ⇄ 游戏 canonical MapData 转化桥。

   editor-shell 自建 MapDoc（map-types.ts）与 `src/play/map` 的 CanonicalMapData
   是两套独立形状：字段名错位（from/to vs a/b、materialId+sceneId+x+y vs at/def）
   且编辑器缺游戏契约必需的 backdrop / def。本文件是他们间的唯一映射点——
   editor-shell 侧经 `ports/map-contracts.ts`（src/devboard/ports）消费游戏契约，
   不做游戏契约的内部改写。

   导出（editorDocToCanonical）：把编辑器编辑态桥成 canonical v2，喂给
   `createLoadedMatch` / `compileMap` / `validateMapStructure`。
   导入（canonicalToEditorDoc）：把 `parseMapData` 的产物桥回 MapDoc，让游戏中
   已验证的地图能进编辑器继续编辑。
   ========================================================================= */

import { STANDARD_CHARACTER_WIDTH, WORLD, sceneGroupBBox, boxesOfScene, type MapDoc, type Layer, type SceneNode, type Edge } from './map-types'
import { uid } from './editor-store'
import type {
  CanonicalMapData,
  CanonicalMapNode,
  MapLayer,
  MapEdge,
  MapPlacement,
  SceneScale,
  Directionality,
} from '../../ports/map-contracts'

/** 世界坐标(0..WORLD) → 归一化坐标(0..1)。 */
function nx(v: number): number {
  return +(v / WORLD.w).toFixed(4)
}
function ny(v: number): number {
  return +(v / WORLD.h).toFixed(4)
}
/** 归一化坐标 → 世界坐标。 */
function wx(v: number): number {
  return Math.round(v * WORLD.w)
}
function wy(v: number): number {
  return Math.round(v * WORLD.h)
}

/** canonical 节点/放置的 def 缺省：按尺度给占位 scene def。 */
function nodeDefOf(scale: SceneScale): string {
  return `d:scene/${scale}`
}
const DEFAULT_EDGE_DEF = 'd:link/path'

/** 顶层缺省底图：transparent dataURL（1×1）。任何地图都必须有 backdrop。 */
export const TRANSPARENT_BACKDROP = {
  image:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  pixelWidth: 1,
  pixelHeight: 1,
  tileRows: 1,
  tileCols: 1,
}

function layerToCanonical(layer: Layer): MapLayer {
  return {
    id: layer.id,
    ...(layer.name !== undefined ? { name: layer.name } : {}),
    ...(layer.backdrop !== undefined
      ? {
          backdrop: {
            image: layer.backdrop.image,
            mediaType: layer.backdrop.mediaType,
            pixelWidth: layer.backdrop.pixelWidth,
            pixelHeight: layer.backdrop.pixelHeight,
          },
        }
      : {}),
    ...(layer.transform !== undefined
      ? {
          transform: {
            scaleX: layer.transform.scaleX,
            scaleY: layer.transform.scaleY,
            tx: nx(layer.transform.tx),
            ty: ny(layer.transform.ty),
          },
        }
      : {}),
  }
}

/** 收集所有图层的 backdrop —— 优先取第一个有图层的，否则用透明占位。 */
function backdropOf(doc: MapDoc): typeof TRANSPARENT_BACKDROP {
  const first = doc.layers.find((l) => l.backdrop)
  if (first?.backdrop) {
    return {
      image: first.backdrop.image,
      pixelWidth: first.backdrop.pixelWidth,
      pixelHeight: first.backdrop.pixelHeight,
      tileRows: 1,
      tileCols: 1,
    }
  }
  return TRANSPARENT_BACKDROP
}

/** 把一次地图级导出聚合成 CanonicalMapData。 */
export function editorDocToCanonical(doc: MapDoc): CanonicalMapData {
  const nodes: CanonicalMapNode[] = doc.sceneNodes.map((n) => {
    const node: CanonicalMapNode = {
      id: n.id,
      def: n.def ?? nodeDefOf(n.scale),
      scale: n.scale,
      at: { x: nx(n.at.x), y: ny(n.at.y) },
      layerId: n.layerId,
      ...(n.parent !== undefined ? { parent: n.parent } : {}),
      ...(n.name !== undefined ? { name: n.name } : {}),
      ...(() => {
        const bounds = sceneGroupBBox(boxesOfScene(n.id, doc))
        return bounds === null ? {} : {
          authorGeometry: {
            shape: 'rect' as const,
            origin: { x: nx(bounds.x), y: ny(bounds.y) },
            size: { x: nx(bounds.width), y: ny(bounds.height) },
          },
        }
      })(),
    }
    return node
  })

  const edges: MapEdge[] = doc.edges.map((e) => {
    const edge: MapEdge = {
      id: e.id,
      def: e.def ?? DEFAULT_EDGE_DEF,
      a: e.from,
      b: e.to,
      directionality: toDirectionality(e),
      path: e.points.map((p) => ({ x: nx(p.x), y: ny(p.y) })),
      ...(e.semanticAnchor !== undefined
        ? { semanticAnchor: (e.semanticAnchor === 'highland' ? 'high' : e.semanticAnchor === 'lowland' ? 'low' : 'neutral') as 'high' | 'low' | 'neutral' }
        : {}),
    }
    return edge
  })

  const placements: MapPlacement[] = doc.placements.map((p) => ({
    id: p.id,
    at: p.sceneId,
    def: p.materialId,
  }))

  return {
    schemaVersion: '2.0',
    id: doc.id,
    name: doc.name,
    backdrop: backdropOf(doc),
    mapScale: { standardCharacterWidth: nx(doc.mapScale?.standardCharacterWidth ?? STANDARD_CHARACTER_WIDTH) },
    layers: doc.layers.map(layerToCanonical),
    nodes,
    edges,
    placements,
    decorations: (doc.decorations ?? []).map((decoration) => ({
      id: decoration.id,
      assetRef: decoration.materialId,
      layerId: decoration.layerId,
      at: { x: nx(decoration.x), y: ny(decoration.y) },
      scale: decoration.scale,
      rotation: decoration.rotation,
      zOrder: decoration.zOrder,
      visible: decoration.visible,
    })),
    playerSpawns: (doc.playerSpawns ?? []).map((spawn) => ({
      id: spawn.id,
      nodeId: spawn.sceneId,
      layerId: spawn.layerId,
      at: { x: nx(spawn.x), y: ny(spawn.y) },
      ...(spawn.seat !== undefined ? { seat: spawn.seat } : {}),
      ...(spawn.team !== undefined ? { team: spawn.team } : {}),
      ...(spawn.aiPlayerMaterialId !== undefined ? { aiPlayerMaterialId: spawn.aiPlayerMaterialId } : {}),
      ...(spawn.aiConfigOverrides !== undefined ? { aiConfigOverrides: spawn.aiConfigOverrides } : {}),
    })),
    transitionBundles: { ...(doc.transitionBundles ?? {}) },
  }
}

/** 编辑器方向性 → canonical Directionality。 */
function toDirectionality(e: Pick<Edge, 'directionality'>): Directionality {
  return e.directionality as Directionality
}

/** canonical Directionality → 编辑器方向性。 */
function fromDirectionality(d: Directionality): Edge['directionality'] {
  return d as Edge['directionality']
}

function canonicalLayerToEditor(layer: MapLayer): Layer {
  const out: Layer = {
    id: layer.id,
    name: layer.name ?? '图层',
    ...(layer.backdrop !== undefined ? { backdrop: { ...layer.backdrop } } : {}),
    ...(layer.transform !== undefined
      ? { transform: { ...layer.transform, tx: wx(layer.transform.tx), ty: wy(layer.transform.ty) } }
      : {}),
  }
  return out
}

/** 把 canonical MapData 桥回编辑器 MapDoc（导入 / 继续编辑用）。 */
export function canonicalToEditorDoc(canonical: CanonicalMapData): MapDoc {
  const layers: Layer[] = canonical.layers.map(canonicalLayerToEditor)

  const layerOf = (layerId: string) =>
    layers.find((l) => l.id === layerId)?.id ?? layers[0]?.id ?? 'ly_0'

  const sceneNodes: SceneNode[] = canonical.nodes.map((n, i) => {
    const node: SceneNode = {
      id: n.id,
      name: n.name ?? `场景 ${i + 1}`,
      scale: n.scale,
      layerId: layerOf(n.layerId),
      at: { x: wx(n.at.x), y: wy(n.at.y) },
      ...(n.parent !== undefined ? { parent: n.parent } : {}),
      ...(n.def !== undefined ? { def: n.def } : {}),
    }
    return node
  })

  const nodeIds = new Set(sceneNodes.map((n) => n.id))
  const edges: Edge[] = canonical.edges.flatMap((e) => {
    if (!nodeIds.has(e.a) || !nodeIds.has(e.b)) return []
    const edge: Edge = {
      id: e.id,
      from: e.a,
      to: e.b,
      directionality: fromDirectionality(e.directionality),
      points: e.path.map((p) => ({ x: wx(p.x), y: wy(p.y) })),
      ...(e.semanticAnchor !== undefined
        ? { semanticAnchor: (e.semanticAnchor === 'high' ? 'highland' : e.semanticAnchor === 'low' ? 'lowland' : 'neutral') as 'highland' | 'lowland' | 'neutral' }
        : {}),
      ...(e.def !== undefined ? { def: e.def } : {}),
    }
    return [edge]
  })

  // 场景框：按节点锚点生成一个默认矩形，让节点在画布上有可视实体。
  const sceneBoxes = sceneNodes.map((n, i) => {
    const geometry = canonical.nodes[i]?.authorGeometry
    if (geometry?.shape === 'rect') {
      return {
        id: `bx_${i}_${uid('edge').slice(-4)}`,
        sceneId: n.id,
        x: wx(geometry.origin.x),
        y: wy(geometry.origin.y),
        width: wx(geometry.size.x),
        height: wy(geometry.size.y),
      }
    }
    const w = n.scale === 'large' ? 200 : n.scale === 'medium' ? 140 : 90
    const h = n.scale === 'large' ? 120 : n.scale === 'medium' ? 84 : 56
    return {
      id: `bx_${i}_${uid('edge').slice(-4)}`,
      sceneId: n.id,
      x: Math.round(n.at.x - w / 2),
      y: Math.round(n.at.y - h / 2),
      width: w,
      height: h,
    }
  })

  // 放置：canonical placement.at 指向宿主节点；编辑器 placement 需要 sceneId 与坐标。
  const placements = canonical.placements.flatMap((p) => {
    const host = sceneNodes.find((n) => n.id === p.at)
    if (!host) return []
    return [
      {
        id: p.id,
        materialId: p.def,
        sceneId: host.id,
        x: host.at.x,
        y: host.at.y,
      },
    ]
  })

  return {
    id: canonical.id,
    name: canonical.name,
    mapScale: { standardCharacterWidth: wx(canonical.mapScale?.standardCharacterWidth ?? 0.05) },
    layers,
    sceneNodes,
    sceneBoxes,
    edges,
    obstructions: [],
    terrains: [],
    placements,
    decorations: (canonical.decorations ?? []).map((decoration) => ({
      id: decoration.id,
      materialId: decoration.assetRef,
      layerId: decoration.layerId,
      x: wx(decoration.at.x),
      y: wy(decoration.at.y),
      scale: decoration.scale ?? 1,
      rotation: decoration.rotation ?? 0,
      zOrder: decoration.zOrder ?? 0,
      visible: decoration.visible ?? true,
    })),
    playerSpawns: (canonical.playerSpawns ?? []).map((spawn) => ({
      id: spawn.id,
      sceneId: spawn.nodeId,
      layerId: spawn.layerId,
      x: wx(spawn.at.x),
      y: wy(spawn.at.y),
      ...(spawn.seat !== undefined ? { seat: spawn.seat } : {}),
      ...(spawn.team !== undefined ? { team: spawn.team } : {}),
      ...(spawn.aiPlayerMaterialId !== undefined ? { aiPlayerMaterialId: spawn.aiPlayerMaterialId } : {}),
      ...(spawn.aiConfigOverrides !== undefined ? { aiConfigOverrides: { ...spawn.aiConfigOverrides } } : {}),
    })),
    transitionBundles: { ...(canonical.transitionBundles ?? {}) },
  }
}
