import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';

/** Pasta do app (Documents/gen3d) onde ficam configuracoes, lista e arquivos dos modelos. */
export const GEN3D_DIR = new Directory(Paths.document, 'gen3d');
export const MODELS_DIR = new Directory(GEN3D_DIR, 'models');

export function ensureDirs() {
  try {
    GEN3D_DIR.create({ intermediates: true, idempotent: true });
    MODELS_DIR.create({ intermediates: true, idempotent: true });
  } catch (e) {
    console.warn('[gen3d] nao foi possivel criar as pastas', e);
  }
}

export function readJson<T>(file: File, fallback: T): T {
  try {
    if (!file.exists) return fallback;
    return JSON.parse(file.textSync()) as T;
  } catch (e) {
    console.warn('[gen3d] JSON invalido em', file.uri, e);
    return fallback;
  }
}

export function writeJson(file: File, value: unknown) {
  try {
    ensureDirs();
    if (!file.exists) file.create({ intermediates: true });
    file.write(JSON.stringify(value));
  } catch (e) {
    console.warn('[gen3d] falha ao salvar', file.uri, e);
  }
}

/** Store minimo (sem dependencias) para usar com useSyncExternalStore. */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: T) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    use(): T {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(this.subscribe, this.get, this.get);
    },
  };
}
