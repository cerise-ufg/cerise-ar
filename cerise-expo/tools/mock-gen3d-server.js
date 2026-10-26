#!/usr/bin/env node
/**
 * MOCK do servidor de geracao 3D do CERISE (contrato /api/v1). Sem dependencias.
 *
 * Serve para desenvolver e testar o app enquanto o servidor real (GPU, DGX Spark)
 * e construido por outra frente. Simula fila (1 worker), posicao, ETA, estagios e
 * progresso; ao final devolve um GLB TEXTURIZADO de exemplo dos assets do app
 * (o GLB NAO e gerado a partir da foto — e um mock!). A miniatura devolvida e um
 * render desse GLB (tools/mock-thumbs/*.png).
 *
 * Uso:  node tools/mock-gen3d-server.js [--port 18096] [--host 127.0.0.1]
 *   Emulador Android -> http://10.0.2.2:18096   |   Simulador iOS -> http://localhost:18096
 * Variaveis: MOCK_SPEED (multiplica os tempos; 0.5 = 2x mais rapido), MOCK_MAX_QUEUE (padrao 8),
 *            MOCK_FAIL_EVERY (N>0: todo N-esimo job termina em erro, para testar a UI de erro).
 *
 * Endpoints (iguais ao contrato):
 *   GET    /api/v1/health
 *   POST   /api/v1/jobs              multipart: image (jpeg/png <= 15 MB) + options (JSON)
 *   GET    /api/v1/jobs/:id
 *   GET    /api/v1/jobs/:id/model.glb
 *   GET    /api/v1/jobs/:id/thumbnail.png
 *   DELETE /api/v1/jobs/:id          cancela se ainda na fila
 *   POST   /                         legado (app 2025): imagens + metadata -> GLB sincrono
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const PORT = Number(arg('port', process.env.PORT || 18096));
const HOST = arg('host', '127.0.0.1'); // so loopback: o emulador chega via 10.0.2.2
const SPEED = Number(process.env.MOCK_SPEED || 1);
const MAX_QUEUE = Number(process.env.MOCK_MAX_QUEUE || 8);
const FAIL_EVERY = Number(process.env.MOCK_FAIL_EVERY || 0);
const MAX_IMAGE = 15 * 1024 * 1024;
const PRESETS = ['rapido', 'padrao', 'alto'];
// Duracao simulada (s) por preset; textura acrescenta tempo.
const PRESET_SECONDS = { rapido: 8, padrao: 14, alto: 22 };
const TEXTURE_SECONDS = 4;

const ASSETS = path.join(__dirname, '..', 'assets', 'models');
// GLBs texturizados de exemplo (licencas no app: Sobre > Licencas).
const SAMPLE_GLBS = ['duck.glb', 'helmet.glb', 'astronaut.glb', 'flower.glb']
  .map((f) => path.join(ASSETS, f))
  .filter((f) => fs.existsSync(f));

/** Le o chunk JSON de um GLB e conta vertices/triangulos/texturas (estatisticas reais do arquivo). */
function glbStats(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  let vertices = 0, triangles = 0;
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const pos = gltf.accessors[prim.attributes.POSITION];
      if (pos) vertices += pos.count;
      if (prim.indices !== undefined) triangles += Math.floor(gltf.accessors[prim.indices].count / 3);
      else if (pos) triangles += Math.floor(pos.count / 3);
    }
  }
  return { vertices, triangles, textures: (gltf.textures || []).length, materials: (gltf.materials || []).length, glb_bytes: buf.length };
}

const jobs = new Map(); // id -> job
const queue = []; // ids aguardando
let running = null; // id em execucao
let jobCounter = 0;

const now = () => Date.now() / 1000;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function durationFor(job) {
  return (PRESET_SECONDS[job.options.preset] + (job.options.texture ? TEXTURE_SECONDS : 0)) * SPEED;
}
function etaFor(job) {
  if (job.status === 'running') return Math.max(0, job.startedAt + job.duration - now());
  if (job.status !== 'queued') return 0;
  let eta = running ? Math.max(0, jobs.get(running).startedAt + jobs.get(running).duration - now()) : 0;
  for (const id of queue) {
    if (id === job.id) break;
    eta += durationFor(jobs.get(id));
  }
  return eta + durationFor(job);
}
function stageFor(job) {
  if (job.status === 'queued') return 'na fila';
  if (job.status === 'done') return 'concluido';
  if (job.status === 'error') return 'erro';
  if (job.status === 'cancelled') return 'cancelado';
  const p = job.progress;
  if (p < 15) return job.options.remove_background ? 'removendo fundo' : 'pre-processando';
  if (p < 55) return 'gerando geometria';
  if (p < 85) return job.options.texture ? 'texturizando' : 'refinando malha';
  return 'exportando GLB';
}

function tick() {
  if (!running && queue.length) {
    const id = queue.shift();
    const job = jobs.get(id);
    job.status = 'running';
    job.startedAt = now();
    job.duration = durationFor(job);
    running = id;
    log(`job ${id} RUNNING (${job.options.preset}, ${job.duration.toFixed(1)} s)`);
  }
  if (running) {
    const job = jobs.get(running);
    job.progress = Math.min(100, Math.round(((now() - job.startedAt) / job.duration) * 100));
    if (job.progress >= 100) {
      if (FAIL_EVERY > 0 && job.seq % FAIL_EVERY === 0) {
        job.status = 'error';
        job.error = 'Falha simulada pelo mock (MOCK_FAIL_EVERY).';
        log(`job ${running} ERROR (simulado)`);
      } else {
        job.status = 'done';
        job.finishedAt = now();
        job.glbFile = SAMPLE_GLBS[(job.seq - 1) % SAMPLE_GLBS.length];
        job.stats = {
          ...glbStats(job.glbFile),
          preset: job.options.preset,
          texture: job.options.texture,
          seconds: Number((job.finishedAt - job.startedAt).toFixed(1)),
          source: `mock:${path.basename(job.glbFile)}`,
          mock: true,
        };
        log(`job ${running} DONE -> ${path.basename(job.glbFile)}`);
      }
      running = null;
    }
  }
}
setInterval(tick, 250);

function publicJob(job) {
  return {
    job_id: job.id,
    status: job.status,
    progress: job.status === 'done' ? 100 : job.progress,
    stage: stageFor(job),
    position: job.status === 'queued' ? queue.indexOf(job.id) + 1 : 0,
    eta_seconds: Number(etaFor(job).toFixed(1)),
    error: job.error || null,
    result:
      job.status === 'done'
        ? {
            glb_url: `/api/v1/jobs/${job.id}/model.glb`,
            thumbnail_url: `/api/v1/jobs/${job.id}/thumbnail.png`,
            stats: job.stats,
          }
        : null,
  };
}

// ---------- multipart minimalista ----------
function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return null;
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const parts = [];
  let start = body.indexOf(boundary);
  while (start >= 0) {
    const next = body.indexOf(boundary, start + boundary.length);
    if (next < 0) break;
    const part = body.slice(start + boundary.length + 2, next - 2); // pula CRLF
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd > 0) {
      const headers = part.slice(0, headerEnd).toString('utf8');
      const data = part.slice(headerEnd + 4);
      const name = /name="([^"]*)"/i.exec(headers)?.[1];
      const filename = /filename="([^"]*)"/i.exec(headers)?.[1];
      const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1];
      parts.push({ name, filename, type, data });
    }
    start = next;
  }
  return parts;
}
function imageKind(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

function send(res, status, obj, headers = {}) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'access-control-allow-origin': '*', ...headers });
  res.end(body);
}
function sendFile(res, file, type, extra = {}) {
  const buf = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
  res.writeHead(200, { 'content-type': type, 'content-length': buf.length, 'access-control-allow-origin': '*', ...extra });
  res.end(buf);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('too large'), { code: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/\/+$/, '') || '/';
  log(req.method, p);
  try {
    if (req.method === 'GET' && p === '/api/v1/health') {
      return send(res, 200, {
        status: 'ok',
        model: 'mock (GLB de exemplo, sem IA)',
        gpu: 'nenhuma (mock)',
        queue_length: queue.length + (running ? 1 : 0),
        workers: 1,
        presets: PRESETS,
      });
    }

    if (req.method === 'POST' && p === '/api/v1/jobs') {
      if (queue.length >= MAX_QUEUE) return send(res, 429, { detail: 'Fila cheia, tente novamente em instantes.' });
      const body = await readBody(req, MAX_IMAGE + 1024 * 1024);
      const parts = parseMultipart(body, req.headers['content-type']);
      if (!parts) return send(res, 400, { detail: 'Envie multipart/form-data.' });
      const img = parts.find((x) => x.name === 'image');
      if (!img || !img.data.length) return send(res, 400, { detail: 'Campo "image" ausente.' });
      if (img.data.length > MAX_IMAGE) return send(res, 413, { detail: 'Imagem maior que 15 MB.' });
      const kind = imageKind(img.data);
      if (!kind) return send(res, 400, { detail: 'Imagem invalida (use JPEG ou PNG).' });
      let options = { preset: 'padrao', texture: true, remove_background: true };
      const optPart = parts.find((x) => x.name === 'options');
      if (optPart) {
        try {
          options = { ...options, ...JSON.parse(optPart.data.toString('utf8')) };
        } catch {
          return send(res, 400, { detail: 'Campo "options" nao e JSON valido.' });
        }
      }
      if (!PRESETS.includes(options.preset)) return send(res, 400, { detail: `preset invalido: ${options.preset}` });
      const id = crypto.randomBytes(8).toString('hex');
      const job = { id, seq: ++jobCounter, status: 'queued', progress: 0, options, image: img.data, imageType: kind, createdAt: now() };
      jobs.set(id, job);
      queue.push(id);
      log(`job ${id} QUEUED (${(img.data.length / 1024).toFixed(0)} KB ${kind}, ${JSON.stringify(options)})`);
      const pj = publicJob(job);
      return send(res, 202, { job_id: id, status: 'queued', position: pj.position, eta_seconds: pj.eta_seconds });
    }

    let m = /^\/api\/v1\/jobs\/([a-f0-9]+)(\/model\.glb|\/thumbnail\.png)?$/.exec(p);
    if (m) {
      const job = jobs.get(m[1]);
      if (!job) return send(res, 404, { detail: 'job nao encontrado' });
      if (req.method === 'DELETE' && !m[2]) {
        if (job.status !== 'queued') return send(res, 409, { detail: `job em estado ${job.status}, nao pode ser cancelado` });
        queue.splice(queue.indexOf(job.id), 1);
        job.status = 'cancelled';
        return send(res, 200, { job_id: job.id, status: 'cancelled' });
      }
      if (req.method === 'GET' && !m[2]) return send(res, 200, publicJob(job));
      if (req.method === 'GET' && m[2] === '/model.glb') {
        if (job.status !== 'done') return send(res, 409, { detail: 'modelo ainda nao esta pronto' });
        return sendFile(res, job.glbFile, 'model/gltf-binary');
      }
      if (req.method === 'GET' && m[2] === '/thumbnail.png') {
        if (job.status !== 'done') return send(res, 409, { detail: 'miniatura ainda nao esta pronta' });
        // Miniatura = render do GLB de exemplo (tools/mock-thumbs, gerado no visualizador do app);
        // se nao houver, devolve a propria foto enviada.
        const thumb = path.join(__dirname, 'mock-thumbs', path.basename(job.glbFile, '.glb') + '.png');
        if (fs.existsSync(thumb)) return sendFile(res, thumb, 'image/png');
        return sendFile(res, job.image, job.imageType);
      }
    }

    // Legado (app Android de 2025): POST / multipart (imagens + metadata) -> GLB sincrono.
    if (req.method === 'POST' && p === '/') {
      const body = await readBody(req, 4 * MAX_IMAGE);
      const parts = parseMultipart(body, req.headers['content-type']) || [];
      const images = parts.filter((x) => x.filename && imageKind(x.data));
      if (!images.length) return send(res, 400, { detail: 'nenhuma imagem recebida' });
      await new Promise((r) => setTimeout(r, 3000 * SPEED));
      return sendFile(res, SAMPLE_GLBS[0], 'model/gltf-binary', { 'content-disposition': 'attachment; filename="model.glb"' });
    }

    send(res, 404, { detail: 'rota nao encontrada' });
  } catch (e) {
    if (e.code === 413) return send(res, 413, { detail: 'Imagem maior que 15 MB.' });
    log('ERRO', e);
    send(res, 500, { detail: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  log(`mock gen3d ouvindo em http://${HOST}:${PORT}  (${SAMPLE_GLBS.length} GLBs de exemplo, speed x${SPEED})`);
});
