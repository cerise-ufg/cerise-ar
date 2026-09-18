// Minimal self-hosted Expo Updates (protocol v1) server for CERISE AR.
// Serves JSON manifests + assets from published `expo export` bundles. No EAS.
//
// Layout on disk (DATA_DIR):
//   updates/<runtimeVersion>/<updateId>/metadata.json
//   updates/<runtimeVersion>/<updateId>/update.json     { id, createdAt }
//   updates/<runtimeVersion>/<updateId>/_expo/... , assets/...
//
// The client (app.json > updates.url) points at <PUBLIC_BASE>/manifest.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || '/data';
const UPDATES_DIR = path.join(DATA_DIR, 'updates');
const PUBLIC_BASE = process.env.PUBLIC_BASE || 'https://cerise.wenfur.com.br/updates';
const PORT = process.env.PORT || 3000;

const MIME = {
  hbc: 'application/javascript',
  js: 'application/javascript',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ttf: 'font/ttf',
  otf: 'font/otf',
  glb: 'application/octet-stream',
  gltf: 'model/gltf+json',
};
const mimeFor = (ext) => MIME[String(ext).toLowerCase().replace(/^\./, '')] || 'application/octet-stream';

const base64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const hashCache = new Map(); // absPath -> { mtimeMs, hash }
function fileHash(absPath) {
  const st = fs.statSync(absPath);
  const cached = hashCache.get(absPath);
  if (cached && cached.mtimeMs === st.mtimeMs) return cached.hash;
  const hash = base64url(crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest());
  hashCache.set(absPath, { mtimeMs: st.mtimeMs, hash });
  return hash;
}

// Newest published update dir for a runtime version, by createdAt (fallback mtime).
function latestUpdate(runtimeVersion) {
  const rtDir = path.join(UPDATES_DIR, runtimeVersion);
  if (!fs.existsSync(rtDir)) return null;
  const entries = fs
    .readdirSync(rtDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(rtDir, d.name);
      let createdAt = fs.statSync(dir).mtime.toISOString();
      let id = d.name;
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(dir, 'update.json'), 'utf8'));
        if (meta.createdAt) createdAt = meta.createdAt;
        if (meta.id) id = meta.id;
      } catch {}
      return { dir, name: d.name, id, createdAt };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return entries[0] || null;
}

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, base: PUBLIC_BASE }));

// ---- CERISE Summit hunt leaderboard (ranking by time) --------------------
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const readScores = () => {
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch { return []; }
};
// Rank: most found first, then fastest time.
const rankScores = (list) =>
  [...list].sort((a, b) => (b.found - a.found) || (a.seconds - b.seconds));

app.get('/scores', (_req, res) => {
  res.set('cache-control', 'no-store');
  res.json(rankScores(readScores()).slice(0, 100));
});

app.post('/scores', (req, res) => {
  const b = req.body || {};
  const entry = {
    name: String(b.name || 'Anônimo').slice(0, 24),
    seconds: Math.max(0, Math.floor(Number(b.seconds) || 0)),
    found: Math.max(0, Math.floor(Number(b.found) || 0)),
    total: Math.max(1, Math.floor(Number(b.total) || 1)),
    at: new Date().toISOString(),
  };
  const list = readScores();
  list.push(entry);
  try { fs.writeFileSync(SCORES_FILE, JSON.stringify(list)); } catch (e) {
    return res.status(500).json({ error: 'could not save' });
  }
  res.json({ ok: true, rank: rankScores(list).findIndex((s) => s.at === entry.at) + 1 });
});

app.get('/manifest', (req, res) => {
  const runtimeVersion = req.header('expo-runtime-version');
  const platform = req.header('expo-platform'); // ios | android
  const currentUpdateId = req.header('expo-current-update-id');

  const commonHeaders = {
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
    'cache-control': 'private, max-age=0',
  };

  if (!runtimeVersion || !platform) {
    return res.status(400).set(commonHeaders).json({ error: 'missing expo headers' });
  }

  const upd = latestUpdate(runtimeVersion);
  if (!upd) return res.status(204).set(commonHeaders).end(); // no update for this runtime

  // Client already runs the latest → nothing new.
  if (currentUpdateId && currentUpdateId === upd.id) {
    return res.status(204).set(commonHeaders).end();
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(path.join(upd.dir, 'metadata.json'), 'utf8'));
  } catch {
    return res.status(500).set(commonHeaders).json({ error: 'metadata unreadable' });
  }

  const fileMeta = metadata.fileMetadata && metadata.fileMetadata[platform];
  if (!fileMeta) return res.status(204).set(commonHeaders).end();

  const rel = `${runtimeVersion}/${upd.name}`;
  const assetUrl = (p, contentType) =>
    `${PUBLIC_BASE}/assets?path=${encodeURIComponent(`${rel}/${p}`)}&contentType=${encodeURIComponent(contentType)}`;

  const bundlePath = fileMeta.bundle.replace(/\\/g, '/');
  const bundleAbs = path.join(upd.dir, bundlePath);

  const launchAsset = {
    key: fileHash(bundleAbs),
    contentType: 'application/javascript',
    url: assetUrl(bundlePath, 'application/javascript'),
    hash: fileHash(bundleAbs),
  };

  const assets = (fileMeta.assets || []).map((a) => {
    const p = a.path.replace(/\\/g, '/'); // Windows exports use backslashes
    const abs = path.join(upd.dir, p);
    const contentType = mimeFor(a.ext);
    return {
      key: path.basename(p),
      contentType,
      fileExtension: `.${String(a.ext).replace(/^\./, '')}`,
      url: assetUrl(p, contentType),
      hash: fileHash(abs),
    };
  });

  const manifest = {
    id: upd.id,
    createdAt: upd.createdAt,
    runtimeVersion,
    launchAsset,
    assets,
    metadata: {},
    extra: {},
  };

  res.status(200).set({ ...commonHeaders, 'content-type': 'application/json' }).send(JSON.stringify(manifest));
});

app.get('/assets', (req, res) => {
  const relPath = String(req.query.path || '');
  const contentType = String(req.query.contentType || 'application/octet-stream');
  // Prevent path traversal: resolve and ensure it stays under UPDATES_DIR.
  const abs = path.resolve(UPDATES_DIR, relPath);
  if (!abs.startsWith(path.resolve(UPDATES_DIR) + path.sep)) {
    return res.status(400).end('bad path');
  }
  if (!fs.existsSync(abs)) return res.status(404).end('not found');
  res.set('content-type', contentType);
  res.set('cache-control', 'public, max-age=31536000, immutable');
  fs.createReadStream(abs).pipe(res);
});

app.listen(PORT, () => console.log(`CERISE updates server on :${PORT}, base ${PUBLIC_BASE}`));
