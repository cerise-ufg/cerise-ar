import { Colors } from './theme';

/**
 * CERISE Summit scavenger hunt characters.
 *
 * Fun, colorful, low-poly ANIMATED creatures from Gobkit (CC0 / public domain —
 * free for any use, no attribution). Low-poly + small (~100 KB each) so all 10
 * render at once without the earlier OOM crash. `danceClip` = 'idle' (an in-place
 * bob) and the scene adds a spin, so they read as "dancing"; `scale` was derived
 * from each model's bounding box to render ~0.5 m tall.
 */
export type HuntCharacter = {
  id: string;
  name: string;
  model: number;
  accent: string;
  scale: number;
  danceClip?: string;
  author: string;
  license: string;
};

const A = 'Gobkit';
const L = 'CC0';
const CLIP = 'idle';

export const HUNT_CHARACTERS: HuntCharacter[] = [
  { id: 'trex', name: 'T-Rex', accent: Colors.green, scale: 0.062, danceClip: CLIP, model: require('../assets/models/hunt/trex.glb'), author: A, license: L },
  { id: 'triceratops', name: 'Tricerátops', accent: Colors.orange, scale: 0.055, danceClip: CLIP, model: require('../assets/models/hunt/triceratops.glb'), author: A, license: L },
  { id: 'stego', name: 'Stego', accent: Colors.cyan, scale: 0.051, danceClip: CLIP, model: require('../assets/models/hunt/stegosaurus.glb'), author: A, license: L },
  { id: 'duck', name: 'Patinho', accent: Colors.yellow, scale: 0.0011, danceClip: CLIP, model: require('../assets/models/hunt/duck.glb'), author: A, license: L },
  { id: 'corgi', name: 'Corgi', accent: Colors.orange, scale: 0.0011, danceClip: CLIP, model: require('../assets/models/hunt/corgi.glb'), author: A, license: L },
  { id: 'jellyfish', name: 'Água-viva', accent: Colors.purple, scale: 0.0012, danceClip: CLIP, model: require('../assets/models/hunt/jellyfish.glb'), author: A, license: L },
  { id: 'shark', name: 'Tubarão', accent: Colors.blue, scale: 0.0007, danceClip: CLIP, model: require('../assets/models/hunt/shark.glb'), author: A, license: L },
  { id: 'bee', name: 'Abelha', accent: Colors.yellow, scale: 0.076, danceClip: CLIP, model: require('../assets/models/hunt/bee.glb'), author: A, license: L },
  { id: 'owl', name: 'Coruja', accent: Colors.cerise, scale: 0.128, danceClip: CLIP, model: require('../assets/models/hunt/owl.glb'), author: A, license: L },
  { id: 'whale', name: 'Baleia', accent: Colors.blue, scale: 0.088, danceClip: CLIP, model: require('../assets/models/hunt/whale.glb'), author: A, license: L },
];

export const HUNT_TIME_SECONDS = 5 * 60; // 5-minute hunt

/** Deterministic 360° ring around the origin, in meters, as a fallback layout. */
export function huntPositions(count: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.35;
    const radius = 2.4 + ((i * 37) % 22) / 10;
    const y = 0.2 + ((i * 53) % 15) / 10;
    positions.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  return positions;
}
