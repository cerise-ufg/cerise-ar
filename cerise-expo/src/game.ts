import { Colors } from './theme';

/**
 * CERISE Summit scavenger hunt: N characters are scattered around the player in
 * AR; find and tap each within the time limit. Live ranking comes later (server).
 *
 * NOTE: the models below are PLACEHOLDERS (the app's existing GLBs). Swap `model`
 * for the 10 "dancing anime character" GLBs when we have them — the game logic,
 * positions and UI do not change, only the asset + optional `danceClip`.
 */
export type HuntCharacter = {
  id: string;
  name: string;
  model: number; // require(...) asset — replace with the anime dancer GLB
  accent: string;
  scale: number;
  /** Name of the embedded GLB animation clip to play (a dance), if any. */
  danceClip?: string;
};

// 10 hunt targets. Placeholder models reuse the current catalog assets.
export const HUNT_CHARACTERS: HuntCharacter[] = [
  { id: 'c01', name: 'Dançarino 01', accent: Colors.cerise, scale: 0.5, model: require('../assets/models/robot.glb'), danceClip: undefined },
  { id: 'c02', name: 'Dançarino 02', accent: Colors.cyan, scale: 0.5, model: require('../assets/models/parrot.glb') },
  { id: 'c03', name: 'Dançarino 03', accent: Colors.yellow, scale: 0.4, model: require('../assets/models/pikachu.glb') },
  { id: 'c04', name: 'Dançarino 04', accent: Colors.orange, scale: 0.5, model: require('../assets/models/toy.glb') },
  { id: 'c05', name: 'Dançarino 05', accent: Colors.green, scale: 0.45, model: require('../assets/models/flower.glb') },
  { id: 'c06', name: 'Dançarino 06', accent: Colors.blue, scale: 0.4, model: require('../assets/models/duck.glb') },
  { id: 'c07', name: 'Dançarino 07', accent: Colors.purple, scale: 0.5, model: require('../assets/models/astronaut.glb') },
  { id: 'c08', name: 'Dançarino 08', accent: Colors.cerise, scale: 0.45, model: require('../assets/models/helmet.glb') },
  { id: 'c09', name: 'Dançarino 09', accent: Colors.cyan, scale: 0.5, model: require('../assets/models/robot.glb') },
  { id: 'c10', name: 'Dançarino 10', accent: Colors.orange, scale: 0.5, model: require('../assets/models/parrot.glb') },
];

export const HUNT_TIME_SECONDS = 5 * 60; // 5-minute hunt

/**
 * Fixed scatter positions around the player (origin), full 360° so some are
 * behind you. Deterministic per index so every device places them the same way
 * relative to its own start point. [x, y, z] in meters.
 */
export function huntPositions(count: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.35; // spread around 360°
    const radius = 2.4 + ((i * 37) % 22) / 10; // 2.4–4.5 m, varied
    const y = 0.2 + ((i * 53) % 15) / 10; // 0.2–1.6 m height
    positions.push([
      Math.cos(angle) * radius,
      y,
      -Math.abs(Math.sin(angle) * radius) - 0.5, // bias in front/around
    ]);
  }
  return positions;
}
