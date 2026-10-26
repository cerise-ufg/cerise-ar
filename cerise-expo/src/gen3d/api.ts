import type { Health, JobCreated, JobOptions, JobState } from './types';

/**
 * Cliente do contrato /api/v1 do servidor de geracao 3D do CERISE.
 * Todas as URLs de resultado vindas do servidor sao relativas a base.
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const HEALTH_TIMEOUT_MS = 8000;
export const REQUEST_TIMEOUT_MS = 15000;
export const UPLOAD_TIMEOUT_MS = 180000;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Chave opcional do servidor (cabecalho X-API-Key), exigida so quando o servidor publico tiver
 * GEN3D_API_KEYS definido. Vem de EXPO_PUBLIC_GEN3D_API_KEY no momento do build/publicacao OTA
 * (embutida no bundle JS; e uma barreira contra uso casual, nao um segredo forte). Sem a variavel,
 * nenhum cabecalho e enviado (rede interna / testes).
 */
const API_KEY: string = (process.env.EXPO_PUBLIC_GEN3D_API_KEY || '').trim();

export function apiHeaders(): Record<string, string> {
  return API_KEY ? { 'X-API-Key': API_KEY } : {};
}

export function absUrl(base: string, rel: string): string {
  if (/^https?:\/\//i.test(rel)) return rel;
  return base.replace(/\/+$/, '') + (rel.startsWith('/') ? rel : '/' + rel);
}

function detailOf(body: string, status: number): string {
  try {
    const j = JSON.parse(body);
    const d = j?.detail ?? j?.error ?? j?.message;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg); // FastAPI 422
  } catch {}
  if (status === 429) return 'Fila do servidor cheia. Tente novamente em instantes.';
  if (status === 413) return 'A imagem é grande demais (máx. 15 MB).';
  if (status === 404) return 'Recurso não encontrado no servidor.';
  return `Erro HTTP ${status}`;
}

async function request(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { Accept: 'application/json', ...apiHeaders(), ...(init.headers || {}) } });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new ApiError(0, `O servidor não respondeu em ${Math.round(timeoutMs / 1000)} s.`);
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e a URL em Configurações.');
  } finally {
    clearTimeout(t);
  }
}

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, detailOf(text, res.status));
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, 'Resposta inesperada do servidor (não é JSON). A URL aponta para o servidor 3D?');
  }
}

export async function getHealth(base: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<{ health: Health; ms: number }> {
  const t0 = Date.now();
  const res = await request(absUrl(base, '/api/v1/health'), {}, timeoutMs);
  if (res.status === 404) throw new ApiError(404, 'Não há servidor 3D neste endereço (HTTP 404 em /api/v1/health).');
  const health = await json<Health>(res);
  if (!health || typeof health.status !== 'string') throw new ApiError(res.status, 'Resposta de /health fora do contrato.');
  return { health, ms: Date.now() - t0 };
}

export async function getJob(base: string, jobId: string): Promise<JobState> {
  const res = await request(absUrl(base, `/api/v1/jobs/${encodeURIComponent(jobId)}`));
  return json<JobState>(res);
}

/**
 * DELETE /api/v1/jobs/{id}: na fila, cancela o pedido; concluido (ou com erro), apaga a foto e o
 * modelo do servidor. Em execucao o servidor responde 409 (retorna false).
 */
export async function cancelJob(base: string, jobId: string): Promise<boolean> {
  const res = await request(absUrl(base, `/api/v1/jobs/${encodeURIComponent(jobId)}`), { method: 'DELETE' });
  return res.ok;
}

/**
 * Envia a foto (multipart: "image" + "options" JSON) com XMLHttpRequest + FormData
 * (rede nativa do React Native: progresso de envio, timeout e cancelamento nos dois
 * sistemas). Retorna a promessa do 202 e uma funcao para cancelar. onProgress: 0..1.
 */
export function uploadJob(
  base: string,
  fileUri: string,
  mimeType: string,
  options: JobOptions,
  onProgress?: (fraction: number) => void,
): { promise: Promise<JobCreated>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<JobCreated>((resolve, reject) => {
    xhr.open('POST', absUrl(base, '/api/v1/jobs'));
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader('Accept', 'application/json');
    for (const [k, v] of Object.entries(apiHeaders())) xhr.setRequestHeader(k, v);
    if (xhr.upload) {
      xhr.upload.onprogress = (e: any) => {
        if (e?.lengthComputable && e.total > 0) onProgress?.(Math.min(1, e.loaded / e.total));
      };
    }
    xhr.onload = () => {
      const body = String(xhr.responseText ?? '');
      if (xhr.status !== 202 && xhr.status !== 200 && xhr.status !== 201) {
        reject(new ApiError(xhr.status, detailOf(body, xhr.status)));
        return;
      }
      try {
        const created = JSON.parse(body) as JobCreated;
        if (!created?.job_id) throw new Error('sem job_id');
        resolve(created);
      } catch {
        reject(new ApiError(xhr.status, 'Resposta inesperada do servidor ao enviar a foto (sem job_id).'));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Falha ao enviar a foto: sem conexão com o servidor.'));
    xhr.ontimeout = () => reject(new ApiError(0, 'O envio da foto demorou demais e foi interrompido.'));
    xhr.onabort = () => reject(new ApiError(-1, 'Envio cancelado.'));
    const form = new FormData();
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    form.append('image', { uri: fileUri, name: `foto.${ext}`, type: mimeType } as any);
    form.append('options', JSON.stringify(options));
    xhr.send(form);
  });
  return { promise, cancel: () => xhr.abort() };
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String((e as any)?.message || e);
}
