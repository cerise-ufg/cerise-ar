import { File, FileMode } from 'expo-file-system';

export type GlbInfo = {
  bytes: number;
  vertices: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  /** maior dimensao da caixa envolvente (unidades do arquivo; glTF = metros) */
  maxDim: number;
  size: [number, number, number];
  generator?: string;
};

/**
 * Le apenas o cabecalho + chunk JSON de um .glb (sem carregar a geometria) para
 * estatisticas e para normalizar a escala na RA. A caixa envolvente usa min/max
 * dos accessors POSITION (ignora transformacoes de nos — suficiente para os GLBs
 * de malha unica gerados pelo servidor).
 */
export function readGlbInfo(uri: string): GlbInfo | null {
  let handle: ReturnType<File['open']> | null = null;
  try {
    const file = new File(uri);
    const bytes = file.size;
    handle = file.open(FileMode.ReadOnly);
    const header = handle.readBytes(20);
    const dv = new DataView(header.buffer, header.byteOffset, header.byteLength);
    if (dv.getUint32(0, true) !== 0x46546c67) return null; // 'glTF'
    const jsonLen = dv.getUint32(12, true);
    if (jsonLen <= 0 || jsonLen > 64 * 1024 * 1024) return null;
    const jsonBytes = handle.readBytes(jsonLen);
    let text = '';
    if (typeof TextDecoder !== 'undefined') {
      text = new TextDecoder('utf-8').decode(jsonBytes);
    } else {
      // Fallback latin-1: as chaves do glTF sao ASCII, entao o JSON continua valido.
      const CH = 8192;
      for (let i = 0; i < jsonBytes.length; i += CH) {
        text += String.fromCharCode.apply(null, Array.from(jsonBytes.subarray(i, i + CH)));
      }
    }
    const gltf = JSON.parse(text);
    let vertices = 0, triangles = 0;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of gltf.meshes || []) {
      for (const prim of mesh.primitives || []) {
        const pos = gltf.accessors?.[prim.attributes?.POSITION];
        if (!pos) continue;
        vertices += pos.count || 0;
        if (prim.indices !== undefined) triangles += Math.floor((gltf.accessors[prim.indices]?.count || 0) / 3);
        else triangles += Math.floor((pos.count || 0) / 3);
        if (Array.isArray(pos.min) && Array.isArray(pos.max)) {
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], pos.min[k]);
            max[k] = Math.max(max[k], pos.max[k]);
          }
        }
      }
    }
    const size: [number, number, number] = [0, 1, 2].map((k) =>
      Number.isFinite(max[k] - min[k]) ? max[k] - min[k] : 0,
    ) as [number, number, number];
    return {
      bytes,
      vertices,
      triangles,
      meshes: (gltf.meshes || []).length,
      materials: (gltf.materials || []).length,
      textures: (gltf.textures || []).length,
      maxDim: Math.max(...size),
      size,
      generator: gltf.asset?.generator,
    };
  } catch (e) {
    console.warn('[gen3d] readGlbInfo falhou', e);
    return null;
  } finally {
    try {
      handle?.close();
    } catch {}
  }
}

/** Escala para que a maior dimensao fique com `targetMeters` na RA. */
export function arScaleFor(info: GlbInfo | null | undefined, targetMeters = 0.35): number {
  if (!info || !(info.maxDim > 0)) return targetMeters;
  return targetMeters / info.maxDim;
}
