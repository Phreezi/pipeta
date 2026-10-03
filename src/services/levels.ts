import { generateLevel, type Level } from '../core';

type WorkerReply = { level: number; ok: true; data: Level } | { level: number; ok: false; error: string };

/**
 * Fornece níveis gerados num Web Worker (para não bloquear a animação),
 * com cache e pré-geração do nível seguinte. Sem Worker, gera no thread principal.
 */
export class LevelService {
  private readonly cache = new Map<number, Promise<Level>>();
  private readonly pending = new Map<number, { resolve: (l: Level) => void; reject: (e: Error) => void }>();
  private worker: Worker | null = null;

  constructor() {
    try {
      this.worker = new Worker(new URL('../workers/levelWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerReply>) => this.onReply(e.data);
      this.worker.onerror = () => this.disableWorker();
    } catch {
      this.worker = null;
    }
  }

  get(level: number): Promise<Level> {
    const cached = this.cache.get(level);
    if (cached !== undefined) return cached;
    const promise = this.worker !== null ? this.requestFromWorker(level) : this.generateSync(level);
    this.cache.set(level, promise);
    // Mantém a cache pequena.
    for (const key of this.cache.keys()) if (key < level - 2 || key > level + 3) this.cache.delete(key);
    return promise;
  }

  /** Pré-gera um nível em segundo plano. */
  prefetch(level: number): void {
    void this.get(level).catch(() => undefined);
  }

  private requestFromWorker(level: number): Promise<Level> {
    return new Promise<Level>((resolve, reject) => {
      this.pending.set(level, { resolve, reject });
      this.worker?.postMessage({ level });
    });
  }

  private generateSync(level: number): Promise<Level> {
    return new Promise<Level>((resolve, reject) => {
      // setTimeout para deixar o ecrã de carregamento aparecer primeiro.
      setTimeout(() => {
        try {
          resolve(generateLevel(level));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 0);
    });
  }

  private onReply(reply: WorkerReply): void {
    const p = this.pending.get(reply.level);
    if (p === undefined) return;
    this.pending.delete(reply.level);
    if (reply.ok) p.resolve(reply.data);
    else p.reject(new Error(reply.error));
  }

  /** Se o Worker falhar, os pedidos pendentes passam para o thread principal. */
  private disableWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [level, p] of this.pending) {
      this.generateSync(level).then(p.resolve, p.reject);
    }
    this.pending.clear();
  }
}
