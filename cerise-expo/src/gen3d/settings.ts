import { File } from 'expo-file-system';
import { GEN3D_DIR, createStore, readJson, writeJson } from './persist';

/** URL publica planejada do servidor de geracao 3D (exposicao ainda pendente). */
export const DEFAULT_SERVER = 'https://cerise.wenfur.com.br/gen3d';

/** Sugestoes para testes (aparecem na tela de Configuracoes). */
export const SERVER_SUGGESTIONS = [
  { label: 'Produção (planejada)', url: DEFAULT_SERVER },
  { label: 'Emulador → servidor via túnel SSH', url: 'http://10.0.2.2:18095' },
  { label: 'Emulador → mock local', url: 'http://10.0.2.2:18096' },
  { label: 'Simulador iOS → mock local', url: 'http://localhost:18096' },
];

export type Settings = { serverUrl: string };

const FILE = new File(GEN3D_DIR, 'settings.json');
const store = createStore<Settings>({ serverUrl: DEFAULT_SERVER });
let loaded = false;

export function normalizeServer(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isValidServer(url: string): boolean {
  return /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(normalizeServer(url));
}

export function loadSettings() {
  if (loaded) return;
  loaded = true;
  const s = readJson<Partial<Settings>>(FILE, {});
  if (s.serverUrl && isValidServer(s.serverUrl)) store.set({ serverUrl: normalizeServer(s.serverUrl) });
}

export function getSettings(): Settings {
  loadSettings();
  return store.get();
}

export function setServerUrl(url: string) {
  const next = { ...store.get(), serverUrl: normalizeServer(url) };
  store.set(next);
  writeJson(FILE, next);
}

export function useSettings(): Settings {
  loadSettings();
  return store.use();
}
