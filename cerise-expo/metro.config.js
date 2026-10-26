// Metro config: bundle 3D model assets so require('...glb') works with Viro,
// plus the self-contained 3D viewer page (assets/viewer/viewer.html).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl', 'hdr', 'vrx', 'html');

module.exports = config;
