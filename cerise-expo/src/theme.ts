// CERISE brand palette — captured from cerise.ufg.br (mirrors the native app).
export const Colors = {
  cerise: '#C60463',
  ceriseDark: '#9A0049',
  ceriseLight: '#FCE7F1',
  purple: '#67046A',
  purpleDark: '#4A0249',
  cyan: '#78D5EF',
  orange: '#F96D00',
  yellow: '#F4B400',
  green: '#1FAA6E',
  blue: '#2D6CDF',
  ink: '#1A1020',
  inkSoft: '#2A1B33',
  surface: '#FFFBFD',
  muted: '#6E5A66',
  white: '#FFFFFF',
  black: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
} as const;

// Work Sans is loaded via expo-font under this family name.
export const Fonts = {
  regular: 'WorkSans',
  // A single variable TTF; RN maps weight via fontWeight where supported.
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const Space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;
