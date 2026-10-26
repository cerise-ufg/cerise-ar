/**
 * Tipos do contrato da API de geracao 3D do CERISE (/api/v1) e dos modelos
 * gerados guardados no aparelho.
 */

export type Preset = 'rapido' | 'padrao' | 'alto';

export const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: 'rapido', label: 'Rápido', hint: 'menos detalhe, sai mais rápido' },
  { id: 'padrao', label: 'Padrão', hint: 'equilíbrio entre detalhe e tempo' },
  { id: 'alto', label: 'Alto', hint: 'mais detalhe, demora mais' },
];

export type JobOptions = {
  preset: Preset;
  texture: boolean;
  remove_background: boolean;
};

/** GET /api/v1/health (status: ok | loading | paused | degraded no servidor real) */
export type Health = {
  status: string;
  model: string;
  gpu: string;
  queue_length: number;
  workers: number;
  presets: string[];
  running?: number;
  version?: string;
  retention_days?: number;
};

/** 202 de POST /api/v1/jobs ("done" quando a mesma foto+opcoes ja estava no cache do servidor) */
export type JobCreated = {
  job_id: string;
  status: 'queued' | 'done';
  position: number;
  eta_seconds: number;
  cached?: boolean;
  deduplicated?: boolean;
};

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

/** GET /api/v1/jobs/{id} */
export type JobState = {
  job_id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  position: number;
  eta_seconds: number;
  error: string | null;
  result: {
    glb_url: string;
    thumbnail_url: string;
    stats?: Record<string, unknown>;
  } | null;
  cached?: boolean;
  /** tempos medidos pelo servidor (s): espera na fila e execucao no worker de GPU */
  timings?: { queue_s?: number | null; run_s?: number | null };
};

/** Estado local de um modelo gerado (persistido em models.json). */
export type LocalStatus =
  | 'uploading'
  | 'queued'
  | 'running'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'cancelled';

export type GeneratedModel = {
  id: string; // id local
  title: string;
  createdAt: number;
  updatedAt: number;
  server: string; // URL base usada na geracao
  jobId?: string;
  options: JobOptions;
  status: LocalStatus;
  progress: number; // 0..100 (upload ou geracao, conforme o status)
  stage?: string;
  position?: number;
  etaSeconds?: number;
  error?: string;
  /** erro de rede durante o acompanhamento: o job segue no servidor e pode ser retomado */
  resumable?: boolean;
  sourceUri?: string; // copia local da foto enviada
  glbUri?: string; // GLB baixado para o armazenamento do app
  thumbUri?: string; // miniatura baixada
  glbBytes?: number;
  stats?: Record<string, unknown>;
  /** Tempos medidos no app (resolucao do polling: 1,5-2 s) e, quando o servidor informa, os dele. */
  timings?: {
    uploadMs?: number;
    queueMs?: number;
    generationMs?: number;
    downloadMs?: number;
    totalMs?: number;
    serverQueueMs?: number;
    serverRunMs?: number;
  };
  /** resultado veio do cache do servidor (mesma foto e opcoes ja processadas) */
  cached?: boolean;
};

export const ACTIVE_STATUSES: LocalStatus[] = ['uploading', 'queued', 'running', 'downloading'];
export const isActive = (m: GeneratedModel) => ACTIVE_STATUSES.includes(m.status);
