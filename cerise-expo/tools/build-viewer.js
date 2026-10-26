#!/usr/bin/env node
/**
 * Gera assets/viewer/viewer.html: uma pagina autocontida com o <model-viewer>
 * (Google, Apache-2.0) EMBUTIDO inline. O app carrega essa pagina num WebView
 * e envia o GLB em pedacos base64 (window.__glb*), que viram um Blob URL.
 * Assim a pre-visualizacao 3D funciona offline, no emulador e no simulador.
 *
 * Uso: node tools/build-viewer.js   (rode de novo ao atualizar @google/model-viewer)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', '@google', 'model-viewer', 'dist', 'model-viewer-umd.min.js');
const pkg = require(path.join(root, 'node_modules', '@google', 'model-viewer', 'package.json'));
const outDir = path.join(root, 'assets', 'viewer');
const out = path.join(outDir, 'viewer.html');

let js = fs.readFileSync(src, 'utf8');
// Nunca pode haver "</script" literal dentro de um <script> inline.
js = js.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>CERISE 3D</title>
<!-- @google/model-viewer ${pkg.version} (Apache-2.0) embutido; three.js (MIT) incluso no bundle -->
<style>
  html, body { margin: 0; height: 100%; background: #1A1020; overflow: hidden; font-family: sans-serif; }
  model-viewer { width: 100%; height: 100%; --poster-color: transparent; background: radial-gradient(circle at 50% 40%, #3a2347 0%, #1A1020 70%); }
  #msg { position: absolute; left: 0; right: 0; top: 45%; text-align: center; color: #cbb8c6; font-size: 15px; }
  #bar { position: absolute; left: 20%; right: 20%; top: 52%; height: 4px; background: #2A1B33; border-radius: 4px; overflow: hidden; }
  #bar > div { height: 100%; width: 0%; background: #C60463; transition: width .2s; }
  .hidden { display: none; }
</style>
<script>${js}</script>
</head>
<body>
<model-viewer id="mv" camera-controls auto-rotate auto-rotate-delay="1500" rotation-per-second="25deg"
  shadow-intensity="1" shadow-softness="0.8" exposure="1.05" environment-image="neutral"
  interaction-prompt="none" touch-action="none" disable-tap></model-viewer>
<div id="msg">Carregando modelo...</div>
<div id="bar"><div></div></div>
<script>
(function () {
  var mv = document.getElementById('mv');
  var msg = document.getElementById('msg');
  var bar = document.getElementById('bar');
  var fill = bar.firstElementChild;
  var parts = [], expected = 0, received = 0, lastUrl = null;
  function post(o) { try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {} }
  function b64ToBytes(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  window.__glbBegin = function (totalChunks) {
    parts = []; expected = totalChunks; received = 0;
    msg.textContent = 'Recebendo modelo...'; msg.classList.remove('hidden'); bar.classList.remove('hidden');
  };
  window.__glbChunk = function (b64) {
    parts.push(b64ToBytes(b64)); received++;
    fill.style.width = Math.round(50 * received / Math.max(1, expected)) + '%';
  };
  window.__glbEnd = function () {
    var blob = new Blob(parts, { type: 'model/gltf-binary' });
    parts = [];
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    msg.textContent = 'Montando cena 3D...';
    mv.src = lastUrl;
  };
  mv.addEventListener('progress', function (e) {
    var p = (e.detail && e.detail.totalProgress) || 0;
    fill.style.width = (50 + Math.round(50 * p)) + '%';
  });
  mv.addEventListener('load', function () {
    msg.classList.add('hidden'); bar.classList.add('hidden');
    var dims = null;
    try { var d = mv.getDimensions(); dims = { x: d.x, y: d.y, z: d.z }; } catch (e) {}
    post({ type: 'loaded', dims: dims });
  });
  mv.addEventListener('error', function (e) {
    msg.textContent = 'Nao foi possivel abrir este modelo.'; bar.classList.add('hidden');
    post({ type: 'error', detail: String((e.detail && e.detail.type) || 'load-error') });
  });
  window.__setAutoRotate = function (on) { if (on) mv.setAttribute('auto-rotate', ''); else mv.removeAttribute('auto-rotate'); };
  window.__resetCamera = function () { mv.cameraOrbit = 'auto auto auto'; mv.cameraTarget = 'auto auto auto'; mv.fieldOfView = 'auto'; mv.jumpCameraToGoal(); };
  post({ type: 'ready', version: '${pkg.version}' });
})();
</script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, html);
console.log(`viewer.html gerado (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, model-viewer ${pkg.version}) -> ${path.relative(root, out)}`);
