import { Colors } from './theme';

/**
 * CERISE Summit scavenger hunt characters — a mix of a low-poly HIPHOP DANCER
 * (8thWall sample, Mixamo-animated) and colorful CC0 creatures (Gobkit). All
 * animated + light so the 10 render without the earlier OOM crash. `danceClip`
 * is the looped clip; `scale` was derived from each model's bounding box (~0.5 m).
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

const DANCER = require('../assets/models/dancers/dancer1.glb');
const G = 'Gobkit (CC0)';

export const HUNT_CHARACTERS: HuntCharacter[] = [
  { id: 'dancer1', name: 'Dançarino Rosa', accent: Colors.cerise, scale: 0.3, danceClip: 'hiphop', model: DANCER, author: '8thWall / Mixamo', license: 'sample' },
  { id: 'shark', name: 'Tubarão', accent: Colors.blue, scale: 0.0007, danceClip: 'idle', model: require('../assets/models/hunt/shark.glb'), author: G, license: 'CC0' },
  { id: 'duck', name: 'Patinho', accent: Colors.yellow, scale: 0.0011, danceClip: 'idle', model: require('../assets/models/hunt/duck.glb'), author: G, license: 'CC0' },
  { id: 'dancer2', name: 'Dançarino Ciano', accent: Colors.cyan, scale: 0.3, danceClip: 'hiphop', model: DANCER, author: '8thWall / Mixamo', license: 'sample' },
  { id: 'corgi', name: 'Corgi', accent: Colors.orange, scale: 0.0011, danceClip: 'idle', model: require('../assets/models/hunt/corgi.glb'), author: G, license: 'CC0' },
  { id: 'jellyfish', name: 'Água-viva', accent: Colors.purple, scale: 0.0012, danceClip: 'idle', model: require('../assets/models/hunt/jellyfish.glb'), author: G, license: 'CC0' },
  { id: 'dancer3', name: 'Dançarino Laranja', accent: Colors.orange, scale: 0.3, danceClip: 'hiphop', model: DANCER, author: '8thWall / Mixamo', license: 'sample' },
  { id: 'bee', name: 'Abelha', accent: Colors.yellow, scale: 0.076, danceClip: 'idle', model: require('../assets/models/hunt/bee.glb'), author: G, license: 'CC0' },
  { id: 'owl', name: 'Coruja', accent: Colors.cerise, scale: 0.128, danceClip: 'idle', model: require('../assets/models/hunt/owl.glb'), author: G, license: 'CC0' },
  { id: 'whale', name: 'Baleia', accent: Colors.blue, scale: 0.088, danceClip: 'idle', model: require('../assets/models/hunt/whale.glb'), author: G, license: 'CC0' },
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
