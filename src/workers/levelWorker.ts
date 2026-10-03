/// <reference lib="webworker" />
import { generateLevel } from '../core/generator';

export interface LevelRequest {
  readonly level: number;
}

self.onmessage = (e: MessageEvent<LevelRequest>) => {
  const { level } = e.data;
  try {
    (self as DedicatedWorkerGlobalScope).postMessage({ level, ok: true, data: generateLevel(level) });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ level, ok: false, error: String(err) });
  }
};
