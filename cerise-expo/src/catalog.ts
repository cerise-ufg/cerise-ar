import { Colors } from './theme';

/**
 * A 3D model bundled with the app and shown in the home catalog.
 * Ported from the native ModelCatalog. `model` is a Metro asset (require) so it
 * can be handed to Viro; `scaleToUnits` is the target size in meters.
 */
export type ArModel = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  model: number | { uri: string }; // require(...) do catalogo ou arquivo gerado (file://)
  scaleToUnits: number;
  generated?: boolean;
  animated: boolean;
  accent: string;
  author: string;
  license: string;
};

export const CAT_ALL = 'Todos';

// Versao de loja (1.1.0): os modelos de franquias protegidas (Pikachu/Pokemon e a
// figura Macross) sairam do catalogo para atender a politica de Propriedade
// Intelectual do Google Play. Os arquivos continuam no repositorio, mas nao sao
// mais referenciados (nao entram no bundle).
export const MODELS: ArModel[] = [
  {
    id: 'robot', title: 'Robô Expressivo', subtitle: 'Modelo animado',
    category: 'Robótica', model: require('../assets/models/robot.glb'),
    scaleToUnits: 0.6, animated: true, accent: Colors.cerise,
    author: 'Tomás Laulhé / Don McCurdy', license: 'CC0',
  },
  {
    id: 'parrot', title: 'Arara', subtitle: 'Pássaro animado',
    category: 'Natureza', model: require('../assets/models/parrot.glb'),
    scaleToUnits: 0.5, animated: true, accent: Colors.cyan,
    author: 'mirada (three.js)', license: 'CC-BY',
  },
  {
    id: 'flower', title: 'Rosas', subtitle: 'Flores · natureza',
    category: 'Natureza', model: require('../assets/models/flower.glb'),
    scaleToUnits: 0.5, animated: false, accent: Colors.green,
    author: 'Christopher F (Poly Pizza)', license: 'CC-BY',
  },
  {
    id: 'duck', title: 'Patinho', subtitle: 'Brinquedo clássico',
    category: 'Brinquedos', model: require('../assets/models/duck.glb'),
    scaleToUnits: 0.4, animated: false, accent: Colors.yellow,
    author: 'Sony (Khronos glTF Sample)', license: 'CC-BY',
  },
  {
    id: 'astronaut', title: 'Astronauta', subtitle: 'Exploração espacial',
    category: 'Espaço', model: require('../assets/models/astronaut.glb'),
    scaleToUnits: 0.55, animated: false, accent: Colors.blue,
    author: 'Poly by Google', license: 'CC-BY',
  },
  {
    id: 'helmet', title: 'Capacete', subtitle: 'PBR de alta fidelidade',
    category: 'Tecnologia', model: require('../assets/models/helmet.glb'),
    scaleToUnits: 0.45, animated: false, accent: Colors.purple,
    author: 'ctxwing · theblueturtle_', license: 'CC-BY',
  },
];

export const CATEGORIES: string[] = [
  CAT_ALL,
  ...MODELS.map((m) => m.category).filter((c, i, a) => a.indexOf(c) === i),
];

export const inCategory = (category: string): ArModel[] =>
  category === CAT_ALL ? MODELS : MODELS.filter((m) => m.category === category);

export const byId = (id?: string): ArModel =>
  MODELS.find((m) => m.id === id) ?? MODELS[0];

export function creditsText(): string {
  const lines = MODELS.map(
    (m) => `• ${m.title} — ${m.author} (${m.license})`,
  ).join('\n');
  return (
    'Modelos 3D incluídos neste app e seus autores:\n\n' +
    lines +
    '\n\nFontes e licenças: poly.pizza, Khronos glTF Sample Assets e three.js; personagens da Caça CERISE: Gobkit (CC0) e dançarino 8th Wall/Mixamo. ' +
    'Tipografia: Work Sans (OFL). Marca: CERISE / UFG.'
  );
}

/** Software de terceiros usado no app (tela Sobre > Licencas). */
export const SOFTWARE_LICENSES: { name: string; license: string }[] = [
  { name: 'React Native / React (Meta)', license: 'MIT' },
  { name: 'Expo SDK 57 (expo-updates, expo-file-system, expo-image-picker...)', license: 'MIT' },
  { name: 'ViroReact (ReactVision) — realidade aumentada', license: 'MIT' },
  { name: '<model-viewer> (Google) — visualização 3D', license: 'Apache-2.0' },
  { name: 'three.js (incluso no model-viewer)', license: 'MIT' },
  { name: 'react-native-webview', license: 'MIT' },
  { name: 'Work Sans (tipografia)', license: 'SIL OFL 1.1' },
];
