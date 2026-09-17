#!/usr/bin/env node
// Publish a self-hosted Expo OTA update for CERISE AR.
//
//   node ota-server/publish-update.mjs "mensagem opcional"
//
// Runs `expo export` in cerise-expo, stamps the bundle with an update id +
// timestamp, and uploads it to the wenfur updates server over SSH (alias
// `wenfur-root`). The app fetches it from https://cerise.wenfur.com.br/updates.
//
// NOTE: OTA only reaches installs whose runtimeVersion matches (policy
// appVersion → the app's `version`). Native/app.json/dependency changes need a
// new build, not an OTA.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, '..', 'cerise-expo');
const SSH_HOST = 'wenfur-root';
const REMOTE_ROOT = '/opt/cerise-ota/updates';

const appJson = JSON.parse(readFileSync(join(appDir, 'app.json'), 'utf8'));
const runtimeVersion = appJson.expo.version; // policy: appVersion
const id = randomUUID();
const createdAt = new Date().toISOString();
const message = process.argv[2] || '';

const run = (cmd, cwd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
};

console.log(`\nPublishing update ${id} (runtime ${runtimeVersion})\n`);

// 1. Export the JS bundle + assets.
run('npx expo export --platform all --clear', appDir);

// 2. Stamp it so the server can order/dedupe updates.
writeFileSync(join(appDir, 'dist', 'update.json'), JSON.stringify({ id, createdAt, message }, null, 2));

// 3. Upload to the server (updates/<runtimeVersion>/<id>/).
const remoteDir = `${REMOTE_ROOT}/${runtimeVersion}/${id}`;
run(`ssh ${SSH_HOST} "mkdir -p '${remoteDir}'"`);
run(`scp -q -r "${join(appDir, 'dist')}/." ${SSH_HOST}:"${remoteDir}/"`);

console.log(`\n✅ Update ${id} published for runtime ${runtimeVersion}.`);
console.log('   Installed apps on this runtime will pick it up on next launch.');
