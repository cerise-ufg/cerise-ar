/**
 * Configuracao dinamica sobre o app.json.
 *
 * CERISE_NO_VIRO=1 gera um build SEM ViroReact (RA). Usado so para o Simulador
 * iOS: o ViroKit.framework distribuido tem apenas a fatia arm64 de DISPOSITIVO,
 * entao nao linka para o simulador. O app detecta (extra.viroEnabled=false) e
 * esconde as entradas de RA; o resto (Criar 3D, Meus modelos, visualizador 3D,
 * configuracoes) funciona normalmente.
 */
module.exports = ({ config }) => {
  const noViro = process.env.CERISE_NO_VIRO === '1';
  // CERISE_TEST_MODE=1: build de teste/captura de telas (links cerisear:// podem trocar o
  // servidor e usar uma foto de exemplo). Nunca usar no build da loja.
  const testMode = process.env.CERISE_TEST_MODE === '1';
  config.extra = { ...(config.extra || {}), viroEnabled: !noViro, testMode };
  if (noViro) {
    config.plugins = (config.plugins || []).filter(
      (p) => (Array.isArray(p) ? p[0] : p) !== '@reactvision/react-viro',
    );
  }
  return config;
};
