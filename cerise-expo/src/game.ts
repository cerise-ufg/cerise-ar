import { Colors } from './theme';

/**
 * CERISE Summit scavenger hunt: N animated characters are scattered around the
 * player in AR; find and tap each within the time limit.
 *
 * Models are free animated GLBs (three.js examples + Khronos glTF-Sample-Assets,
 * CC-BY / CC0). `danceClip` is the embedded animation clip Viro loops; when
 * absent the character just spins (huntSpin). `scale` was derived from each
 * model's bounding box to render ~0.5 m tall in AR.
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

export const HUNT_CHARACTERS: HuntCharacter[] = [
  { id: 'robot', name: 'Robô Dançarino', accent: Colors.cerise, scale: 0.19, danceClip: 'Dance', model: require('../assets/models/game/robot_dance.glb'), author: 'Tomás Laulhé / Don McCurdy', license: 'CC0' },
  { id: 'flamingo', name: 'Flamingo', accent: Colors.orange, scale: 0.0028, danceClip: 'flamingo_flyA_', model: require('../assets/models/game/flamingo.glb'), author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'parrot', name: 'Papagaio', accent: Colors.green, scale: 0.005, danceClip: 'parrot_A_', model: require('../assets/models/game/parrot2.glb'), author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'stork', name: 'Cegonha', accent: Colors.cyan, scale: 0.0025, danceClip: 'storkFly_B_', model: require('../assets/models/game/stork.glb'), author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'horse', name: 'Cavalo', accent: Colors.yellow, scale: 0.0016, danceClip: 'horse_A_', model: require('../assets/models/game/horse.glb'), author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'fox', name: 'Raposa', accent: Colors.orange, scale: 0.0032, danceClip: 'Run', model: require('../assets/models/game/fox.glb'), author: 'PixelMannen / tomkranis', license: 'CC0' },
  { id: 'soldier', name: 'Soldado', accent: Colors.blue, scale: 0.27, danceClip: 'Run', model: require('../assets/models/game/soldier.glb'), author: 'three.js examples', license: 'CC-BY' },
  { id: 'xbot', name: 'Agente X', accent: Colors.purple, scale: 0.25, danceClip: 'run', model: require('../assets/models/game/xbot.glb'), author: 'three.js examples', license: 'CC-BY' },
  { id: 'cesium', name: 'Homem Ciano', accent: Colors.cyan, scale: 0.33, model: require('../assets/models/game/cesiumman.glb'), author: 'Cesium', license: 'CC-BY 4.0' },
  { id: 'brainstem', name: 'Robô Braço', accent: Colors.cerise, scale: 0.28, model: require('../assets/models/game/brainstem.glb'), author: 'Keith Hunter (Khronos)', license: 'sample' },
];

export const HUNT_TIME_SECONDS = 5 * 60; // 5-minute hunt

/**
 * Fixed scatter positions around the player (origin), full 360° so some are
 * behind you. Deterministic per index. [x, y, z] in meters.
 */
export function huntPositions(count: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.35;
    const radius = 2.4 + ((i * 37) % 22) / 10; // 2.4–4.5 m
    const y = 0.2 + ((i * 53) % 15) / 10; // 0.2–1.6 m
    positions.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  return positions;
}
