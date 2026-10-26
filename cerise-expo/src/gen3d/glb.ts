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
 * dos accessors POSITION transformados pelas matrizes dos nos da cena (em metros).
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
    // caixa local de cada malha (min/max dos accessors POSITION)
    const meshBox = (gltf.meshes || []).map((mesh: any) => {
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (const prim of mesh.primitives || []) {
        const pos = gltf.accessors?.[prim.attributes?.POSITION];
        if (!pos) continue;
        vertices += pos.count || 0;
        if (prim.indices !== undefined) triangles += Math.floor((gltf.accessors[prim.indices]?.count || 0) / 3);
        else triangles += Math.floor((pos.count || 0) / 3);
        if (Array.isArray(pos.min) && Array.isArray(pos.max)) {
          for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos.min[k]); mx[k] = Math.max(mx[k], pos.max[k]); }
        }
      }
      return Number.isFinite(mn[0]) ? { mn, mx } : null;
    });
    // percorre a cena aplicando as transformacoes dos nos (matrix ou TRS) aos 8 cantos
    const nodes = gltf.nodes || [];
    const visit = (ni: number, parent: number[], depth: number) => {
      const node = nodes[ni];
      if (!node || depth > 64) return;
      const m = mul(parent, localMatrix(node));
      const box = node.mesh !== undefined ? meshBox[node.mesh] : null;
      if (box) {
        for (let c = 0; c < 8; c++) {
          const p = [c & 1 ? box.mx[0] : box.mn[0], c & 2 ? box.mx[1] : box.mn[1], c & 4 ? box.mx[2] : box.mn[2]];
          for (let k = 0; k < 3; k++) {
            const v = m[k] * p[0] + m[4 + k] * p[1] + m[8 + k] * p[2] + m[12 + k];
            min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v);
          }
        }
      }
      for (const ch of node.children || []) visit(ch, m, depth + 1);
    };
    const scene = gltf.scenes?.[gltf.scene ?? 0];
    const roots: number[] = scene?.nodes ?? nodes.map((_: any, i: number) => i);
    for (const r of roots) visit(r, IDENTITY, 0);
    if (!Number.isFinite(min[0])) {
      // sem cena/nos: usa as caixas das malhas sem transformacao
      for (const b of meshBox) if (b) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], b.mn[k]); max[k] = Math.max(max[k], b.mx[k]); }
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

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Matriz 4x4 (coluna-maior, como no glTF) de um no: `matrix` ou T*R*S. */
function localMatrix(node: any): number[] {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix;
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function mul(a: number[], b: number[]): number[] {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let v = 0;
    for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = v;
  }
  return o;
}

/** Escala para que a maior dimensao fique com `targetMeters` na RA. */
export function arScaleFor(info: GlbInfo | null | undefined, targetMeters = 0.35): number {
  if (!info || !(info.maxDim > 0)) return targetMeters;
  return targetMeters / info.maxDim;
}
