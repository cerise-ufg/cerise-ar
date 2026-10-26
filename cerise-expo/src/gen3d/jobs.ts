import { Directory, File } from 'expo-file-system';
import { ApiError, absUrl, apiHeaders, cancelJob, errorMessage, getJob, uploadJob } from './api';
import { readGlbInfo } from './glb';
import { GEN3D_DIR, MODELS_DIR, createStore, ensureDirs, readJson, writeJson } from './persist';
import { getSettings } from './settings';
import { GeneratedModel, JobOptions, JobState, isActive } from './types';

/**
 * Gerenciador dos modelos gerados: envio da foto, acompanhamento da fila por
 * polling, download do GLB/miniatura e lista "Meus modelos" persistida em
 * Documents/gen3d/models.json. Jobs ativos sao retomados ao abrir o app.
 */

const DB = new File(GEN3D_DIR, 'models.json');
const store = createStore<GeneratedModel[]>([]);
let loaded = false;

/** Desiste de acompanhar um job depois deste tempo. */
export const JOB_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_NET_FAILURES = 12;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const uploads = new Map<string, () => void>();
const failures = new Map<string, number>();

function persist() {
  writeJson(DB, store.get());
}

/** Atualiza um modelo. save=false para estados transitorios (progresso de download), que nao precisam ir ao disco. */
function patch(id: string, p: Partial<GeneratedModel>, save = true) {
  store.set(store.get().map((m) => (m.id === id ? { ...m, ...p, updatedAt: Date.now() } : m)));
  if (save) persist();
}

export function getModels(): GeneratedModel[] {
  initJobs();
  return store.get();
}

export function getModel(id: string): GeneratedModel | undefined {
  return store.get().find((m) => m.id === id);
}

export function useModels(): GeneratedModel[] {
  initJobs();
  return store.use();
}

export function useModel(id?: string | null): GeneratedModel | undefined {
  const list = useModels();
  return id ? list.find((m) => m.id === id) : undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');
function defaultTitle(d = new Date()) {
  return `Modelo 3D · ${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function modelDir(id: string) {
  return new Directory(MODELS_DIR, id);
}

/** Carrega a lista e retoma o acompanhamento dos jobs que estavam ativos. */
export function initJobs() {
  if (loaded) return;
  loaded = true;
  ensureDirs();
  const list = readJson<GeneratedModel[]>(DB, []);
  store.set(Array.isArray(list) ? list : []);
  for (const m of store.get()) {
    if (!isActive(m)) continue;
    if (m.status === 'uploading' || !m.jobId) {
      patch(m.id, { status: 'error', error: 'O envio foi interrompido (o app foi fechado). Toque em "Tentar de novo".' });
    } else {
      // Download interrompido: volta a consultar o job (que ja esta pronto) e baixa de novo.
      if (m.status === 'downloading') patch(m.id, { status: 'running', stage: 'retomando download' });
      schedule(m.id, 500);
    }
  }
}

function schedule(id: string, ms: number) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => poll(id), ms));
}

function stop(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  failures.delete(id);
}

/** Cria um modelo a partir da foto escolhida e inicia o envio. Retorna o id local. */
export function createFromPhoto(photoUri: string, mimeType: string | undefined, options: JobOptions): string {
  initJobs();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dir = modelDir(id);
  dir.create({ intermediates: true, idempotent: true });
  const mime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const src = new File(dir, mime === 'image/png' ? 'source.png' : 'source.jpg');
  try {
    new File(photoUri).copySync(src);
  } catch (e) {
    console.warn('[gen3d] nao copiou a foto, usando o original', e);
  }
  const now = Date.now();
  const model: GeneratedModel = {
    id,
    title: defaultTitle(),
    createdAt: now,
    updatedAt: now,
    server: getSettings().serverUrl,
    options,
    status: 'uploading',
    progress: 0,
    stage: 'enviando foto',
    sourceUri: src.exists ? src.uri : photoUri,
    timings: {},
  };
  store.set([model, ...store.get()]);
  persist();
  startUpload(id, mime);
  return id;
}

function startUpload(id: string, mime: string) {
  const m = getModel(id);
  if (!m?.sourceUri) return;
  const t0 = Date.now();
  patch(id, { status: 'uploading', progress: 0, error: undefined, stage: 'enviando foto', jobId: undefined, createdAt: t0, timings: {} });
  let lastPct = -1;
  const { promise, cancel } = uploadJob(m.server, m.sourceUri, mime, m.options, (f) => {
    const pct = Math.round(f * 100);
    if (pct !== lastPct && (pct - lastPct >= 5 || pct === 100)) {
      lastPct = pct;
      patch(id, { progress: pct });
    }
  });
  uploads.set(id, cancel);
  promise
    .then((created) => {
      uploads.delete(id);
      if (getModel(id)?.status === 'cancelled') {
        cancelJob(m.server, created.job_id).catch(() => {});
        return;
      }
      // status "done" no 202 = resultado ja estava no cache do servidor: busca o estado na hora.
      const fromCache = created.status === 'done';
      patch(id, {
        jobId: created.job_id,
        status: 'queued',
        progress: 0,
        position: created.position,
        etaSeconds: created.eta_seconds,
        stage: fromCache ? 'resultado em cache' : 'na fila',
        cached: fromCache || undefined,
        timings: { uploadMs: Date.now() - t0 },
      });
      schedule(id, fromCache ? 50 : 1000);
    })
    .catch((e) => {
      uploads.delete(id);
      if (getModel(id)?.status === 'cancelled') return;
      patch(id, { status: 'error', error: errorMessage(e) });
    });
}

async function poll(id: string) {
  timers.delete(id);
  const m = getModel(id);
  if (!m || !m.jobId || !isActive(m) || m.status === 'downloading') return;
  if (Date.now() - m.createdAt > JOB_TIMEOUT_MS) {
    patch(id, { status: 'error', error: 'Tempo esgotado: o servidor não concluiu o modelo em 30 minutos.' });
    return;
  }
  let st: JobState;
  try {
    st = await getJob(m.server, m.jobId);
    failures.delete(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      patch(id, { status: 'error', error: 'O servidor não encontrou este pedido (pode ter expirado ou o servidor reiniciou).' });
      return;
    }
    const n = (failures.get(id) || 0) + 1;
    failures.set(id, n);
    if (n >= MAX_NET_FAILURES) {
      // resumable: o job continua no servidor; "Tentar de novo" so volta a acompanhar.
      patch(id, { status: 'error', resumable: true, error: `${errorMessage(e)} (sem resposta após ${n} tentativas)` });
      failures.delete(id);
      return;
    }
    patch(id, { stage: `reconectando… (${n})` });
    schedule(id, Math.min(10000, 1500 * 2 ** Math.min(n, 3)));
    return;
  }
  if (getModel(id)?.status === 'cancelled') return;

  const timings = { ...(m.timings || {}) };
  if (st.status === 'queued') {
    patch(id, { status: 'queued', position: st.position, etaSeconds: st.eta_seconds, stage: st.stage || 'na fila', progress: st.progress || 0 });
    schedule(id, 2000);
  } else if (st.status === 'running') {
    if (m.status !== 'running') timings.queueMs = Date.now() - m.createdAt - (timings.uploadMs || 0);
    patch(id, { status: 'running', progress: st.progress, etaSeconds: st.eta_seconds, stage: st.stage, position: 0, timings });
    schedule(id, 1500);
  } else if (st.status === 'done' && st.result) {
    if (m.status !== 'running' && timings.queueMs === undefined) timings.queueMs = Date.now() - m.createdAt - (timings.uploadMs || 0);
    timings.generationMs = Date.now() - m.createdAt - (timings.uploadMs || 0) - (timings.queueMs || 0);
    // Tempos do proprio servidor (sem a resolucao do polling), quando informados.
    if (typeof st.timings?.queue_s === 'number') timings.serverQueueMs = Math.round(st.timings.queue_s * 1000);
    if (typeof st.timings?.run_s === 'number') timings.serverRunMs = Math.round(st.timings.run_s * 1000);
    const cached = !!(st.cached || (st.result.stats as any)?.cached || m.cached);
    patch(id, { status: 'downloading', progress: 0, stage: 'baixando modelo', stats: st.result.stats, timings, cached: cached || undefined });
    download(id, st.result.glb_url, st.result.thumbnail_url);
  } else if (st.status === 'error') {
    patch(id, { status: 'error', error: st.error || 'O servidor não conseguiu gerar o modelo.' });
  } else if (st.status === 'cancelled') {
    patch(id, { status: 'cancelled', stage: 'cancelado' });
  } else {
    schedule(id, 2000);
  }
}

async function download(id: string, glbUrl: string, thumbUrl?: string) {
  const m = getModel(id);
  if (!m) return;
  const t0 = Date.now();
  const dir = modelDir(id);
  try {
    dir.create({ intermediates: true, idempotent: true });
    const headers = apiHeaders();
    // Miniatura em paralelo com o GLB (falha nela nao impede o modelo: usa a foto).
    const thumbP: Promise<string | undefined> = thumbUrl
      ? File.downloadFileAsync(absUrl(m.server, thumbUrl), new File(dir, 'thumbnail.png'), { idempotent: true, headers })
          .then((f) => f.uri)
          .catch((e) => {
            console.warn('[gen3d] miniatura indisponivel, usando a foto', e);
            return undefined;
          })
      : Promise.resolve(undefined);
    // Progresso so em degraus de 10 % e sem gravar no disco. No teste contra o servidor real, com
    // models.json gravado a cada evento de progresso e a miniatura baixada depois do GLB, o download de
    // um GLB de 398 KB levou 5,0 s no emulador; com esta versao, 0,45 s (mesma foto e preset).
    let lastStep = -1;
    const glb = await File.downloadFileAsync(absUrl(m.server, glbUrl), new File(dir, 'model.glb'), {
      idempotent: true,
      headers,
      onProgress: (p: { bytesWritten: number; totalBytes: number }) => {
        if (p.totalBytes > 0) {
          const step = Math.floor((10 * p.bytesWritten) / p.totalBytes);
          if (step !== lastStep) {
            lastStep = step;
            patch(id, { progress: step * 10 }, false);
          }
        }
      },
    });
    const thumbUri = (await thumbP) ?? m.sourceUri;
    const info = readGlbInfo(glb.uri);
    const timings = { ...(getModel(id)?.timings || {}), downloadMs: Date.now() - t0 };
    timings.totalMs = Date.now() - (getModel(id)?.createdAt || t0);
    // Linha de metrica no logcat/console (sem dados pessoais): usada nos testes ponta a ponta.
    console.log(
      '[gen3d] modelo pronto ' +
        JSON.stringify({ job: m.jobId, options: m.options, timings, glb_bytes: info?.bytes ?? glb.size, cached: !!getModel(id)?.cached }),
    );
    patch(id, {
      status: 'ready',
      progress: 100,
      stage: 'pronto',
      glbUri: glb.uri,
      thumbUri,
      glbBytes: info?.bytes ?? glb.size,
      stats: { ...(getModel(id)?.stats || {}), local: info },
      timings,
    });
  } catch (e) {
    patch(id, { status: 'error', error: `Falha ao baixar o modelo: ${errorMessage(e)}` });
  }
}

/** Cancela: no envio aborta o upload; na fila pede DELETE ao servidor; gerando, deixa de acompanhar. */
export async function cancel(id: string): Promise<string> {
  const m = getModel(id);
  if (!m) return '';
  stop(id);
  const up = uploads.get(id);
  if (up) {
    patch(id, { status: 'cancelled', stage: 'cancelado' });
    up();
    return 'Envio cancelado.';
  }
  patch(id, { status: 'cancelled', stage: 'cancelado' });
  if (m.jobId && m.status === 'queued') {
    try {
      const ok = await cancelJob(m.server, m.jobId);
      return ok ? 'Pedido removido da fila do servidor.' : 'O servidor já tinha começado; o resultado será ignorado.';
    } catch {
      return 'Cancelado no aparelho (não foi possível avisar o servidor).';
    }
  }
  return 'Acompanhamento cancelado. O servidor pode concluir, mas o resultado será ignorado.';
}

export function retry(id: string) {
  const m = getModel(id);
  if (!m) return;
  if (m.jobId && m.status === 'error' && m.resumable) {
    patch(id, { status: 'queued', error: undefined, resumable: false, stage: 'reconectando…' });
    schedule(id, 100);
    return;
  }
  // Cancelado, erro do servidor ou falha no envio: envia a foto de novo (novo job).
  patch(id, { resumable: false });
  const mime = m.sourceUri?.endsWith('.png') ? 'image/png' : 'image/jpeg';
  patch(id, { server: getSettings().serverUrl });
  startUpload(id, mime);
}

export function rename(id: string, title: string) {
  if (title.trim()) patch(id, { title: title.trim().slice(0, 60) });
}

/**
 * Exclui o modelo do aparelho e pede ao servidor (DELETE, melhor esforco) que apague a foto e o
 * modelo dele tambem — sem esperar os 7 dias da retencao. Se o servidor estiver fora do ar, a
 * retencao automatica apaga depois.
 */
export function remove(id: string) {
  const m = getModel(id);
  stop(id);
  uploads.get(id)?.();
  uploads.delete(id);
  if (m?.jobId && m.server) cancelJob(m.server, m.jobId).catch(() => {});
  try {
    const dir = modelDir(id);
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('[gen3d] falha ao apagar arquivos', e);
  }
  store.set(store.get().filter((m) => m.id !== id));
  persist();
}

export const STATUS_LABEL: Record<GeneratedModel['status'], string> = {
  uploading: 'Enviando foto',
  queued: 'Na fila',
  running: 'Gerando',
  downloading: 'Baixando',
  ready: 'Pronto',
  error: 'Erro',
  cancelled: 'Cancelado',
};

export function formatEta(s?: number): string {
  if (s === undefined || s === null || !Number.isFinite(s)) return '';
  const v = Math.max(0, Math.round(s));
  if (v < 60) return `~${v} s`;
  return `~${Math.floor(v / 60)} min ${pad(v % 60)} s`;
}

/** Numero com virgula decimal (pt-BR), sem depender de Intl. */
export function fmtNum(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',');
}

/** Milissegundos -> "12,3 s" (ou "45 ms" abaixo de 0,1 s). */
export function formatMs(ms?: number): string {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return '';
  if (ms < 100) return `${Math.max(0, Math.round(ms))} ms`;
  return `${fmtNum(ms / 1000)} s`;
}

export function formatBytes(n?: number): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${fmtNum(n / 1024 / 1024)} MB`;
}
