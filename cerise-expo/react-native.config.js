// Com CERISE_NO_VIRO=1 (build de Simulador iOS) o modulo nativo do ViroReact nao
// e autolinkado — ver app.config.js.
module.exports = {
  dependencies:
    process.env.CERISE_NO_VIRO === '1'
      ? { '@reactvision/react-viro': { platforms: { ios: null, android: null } } }
      : {},
};
