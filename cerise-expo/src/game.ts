import { Colors } from './theme';

/**
 * CERISE Summit scavenger hunt: N animated characters scattered in AR; find and
 * tap each within the time limit.
 *
 * Only LIGHT animated GLBs are used (three.js examples + Khronos, CC-BY/CC0):
 * rendering 10 heavy skinned meshes at once crashed the app (OOM/GPU), so the
 * heavy human models were dropped and a few light ones repeat under distinct
 * names. Metro reuses each require() asset, so repeats cost ~no extra memory.
 * `scale` was derived from each model's bounding box to render ~0.5 m.
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

const ROBOT = require('../assets/models/game/robot_dance.glb');
const FLAMINGO = require('../assets/models/game/flamingo.glb');
const PARROT = require('../assets/models/game/parrot2.glb');
const STORK = require('../assets/models/game/stork.glb');
const HORSE = require('../assets/models/game/horse.glb');
const FOX = require('../assets/models/game/fox.glb');
const CESIUM = require('../assets/models/game/cesiumman.glb');

export const HUNT_CHARACTERS: HuntCharacter[] = [
  { id: 'robot', name: 'Robô Dançarino', accent: Colors.cerise, scale: 0.19, danceClip: 'Dance', model: ROBOT, author: 'Tomás Laulhé / Don McCurdy', license: 'CC0' },
  { id: 'flamingo', name: 'Flamingo', accent: Colors.orange, scale: 0.0028, danceClip: 'flamingo_flyA_', model: FLAMINGO, author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'parrot', name: 'Papagaio', accent: Colors.green, scale: 0.005, danceClip: 'parrot_A_', model: PARROT, author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'stork', name: 'Cegonha', accent: Colors.cyan, scale: 0.0025, danceClip: 'storkFly_B_', model: STORK, author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'horse', name: 'Cavalo', accent: Colors.yellow, scale: 0.0016, danceClip: 'horse_A_', model: HORSE, author: 'mirada (three.js)', license: 'CC-BY' },
  { id: 'fox', name: 'Raposa', accent: Colors.orange, scale: 0.0032, danceClip: 'Run', model: FOX, author: 'PixelMannen / tomkranis', license: 'CC0' },
  { id: 'cesium', name: 'Homem Ciano', accent: Colors.cyan, scale: 0.33, model: CESIUM, author: 'Cesium', license: 'CC-BY 4.0' },
  { id: 'robot2', name: 'Robô Azul', accent: Colors.blue, scale: 0.19, danceClip: 'Dance', model: ROBOT, author: 'Tomás Laulhé / Don McCurdy', license: 'CC0' },
  { id: 'fox2', name: 'Raposa Veloz', accent: Colors.purple, scale: 0.0032, danceClip: 'Run', model: FOX, author: 'PixelMannen / tomkranis', license: 'CC0' },
  { id: 'horse2', name: 'Pônei', accent: Colors.green, scale: 0.0016, danceClip: 'horse_A_', model: HORSE, author: 'mirada (three.js)', license: 'CC-BY' },
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
