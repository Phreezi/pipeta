import { PALETTE_SIZE, TUBE_CAPACITY, type Board, type Color, type Move } from './types';

/**
 * Solver de ball sort: A* com memoização de estados (chave canónica que
 * ignora a ordem dos tubos) e heurística admissível.
 *
 * 1. Procura ótima (A*) até `optimalBudget` expansões.
 *    - Encontra solução => número mínimo de jogadas garantido.
 *    - Esgota o espaço de estados => nível comprovadamente impossível.
 * 2. Se o orçamento acabar, procura gulosa ponderada (wA*) até
 *    `fallbackBudget` expansões, para garantir que é resolúvel. A solução
 *    encontrada é um limite superior do mínimo (`optimal = false`).
 *
 * Tudo é determinístico: mesma entrada => mesmo resultado.
 */

export interface SolveOptions {
  readonly capacity?: number;
  readonly optimalBudget?: number;
  readonly fallbackBudget?: number;
  readonly fallbackWeight?: number;
}

export type SolveStatus = 'solved' | 'unsolvable' | 'unknown';

export interface SolveResult {
  readonly status: SolveStatus;
  /** Sequência de jogadas (índices do tabuleiro original), se resolvido. */
  readonly moves: readonly Move[] | null;
  /** `true` se `moves.length` é comprovadamente o mínimo. */
  readonly optimal: boolean;
  /** Total de estados expandidos (todas as fases). */
  readonly expanded: number;
}

export const DEFAULT_SOLVE_OPTIONS = {
  capacity: TUBE_CAPACITY,
  optimalBudget: 60_000,
  fallbackBudget: 60_000,
  fallbackWeight: 3,
} as const;

/*
 * Representação interna compacta: cada tubo é um inteiro (código) em base
 * (PALETTE_SIZE + 1), com 0 = vazio e c + 1 = cor c, da base para o topo.
 * Tabelas pré-calculadas dão comprimento, topo, base uniforme, etc. em O(1).
 */
const BASE = PALETTE_SIZE + 1;

interface Tables {
  readonly capacity: number;
  readonly pow: readonly number[];
  readonly length: Uint8Array;
  readonly top: Int8Array;
  readonly baseColor: Int8Array;
  readonly baseRun: Uint8Array;
  readonly uniform: Uint8Array;
}

const tablesCache = new Map<number, Tables>();

function getTables(capacity: number): Tables {
  const cached = tablesCache.get(capacity);
  if (cached !== undefined) return cached;
  if (capacity < 1 || capacity > 5) throw new Error(`Unsupported capacity ${capacity}`);
  const pow: number[] = [];
  for (let i = 0; i <= capacity; i++) pow.push(BASE ** i);
  const size = pow[capacity] as number;
  const length = new Uint8Array(size);
  const top = new Int8Array(size).fill(-1);
  const baseColor = new Int8Array(size).fill(-1);
  const baseRun = new Uint8Array(size);
  const uniform = new Uint8Array(size);
  const digits: number[] = [];
  for (let code = 0; code < size; code++) {
    digits.length = 0;
    let rest = code;
    for (let i = 0; i < capacity; i++) {
      digits.push(rest % BASE);
      rest = Math.floor(rest / BASE);
    }
    // Só são válidos códigos sem "buracos" (zeros abaixo de uma bola).
    let len = 0;
    while (len < capacity && digits[len] !== 0) len++;
    let valid = true;
    for (let i = len; i < capacity; i++) if (digits[i] !== 0) valid = false;
    if (!valid) continue;
    length[code] = len;
    if (len === 0) {
      uniform[code] = 1;
      continue;
    }
    const base = (digits[0] as number) - 1;
    let run = 1;
    while (run < len && digits[run] === base + 1) run++;
    top[code] = (digits[len - 1] as number) - 1;
    baseColor[code] = base;
    baseRun[code] = run;
    uniform[code] = run === len ? 1 : 0;
  }
  const tables: Tables = { capacity, pow, length, top, baseColor, baseRun, uniform };
  tablesCache.set(capacity, tables);
  return tables;
}

function encodeTube(tube: readonly Color[], t: Tables): number {
  let code = 0;
  for (let i = 0; i < tube.length; i++) code += ((tube[i] as Color) + 1) * (t.pow[i] as number);
  return code;
}

let keyScratch = new Uint16Array(16);

function keyOf(codes: readonly number[]): string {
  const n = codes.length;
  if (keyScratch.length < n) keyScratch = new Uint16Array(n * 2);
  const buf = keyScratch;
  // Ordenação por inserção: poucos tubos, quase sempre mais rápida que sort().
  for (let i = 0; i < n; i++) {
    const v = codes[i] as number;
    let j = i - 1;
    while (j >= 0 && (buf[j] as number) > v) {
      buf[j + 1] = buf[j] as number;
      j--;
    }
    buf[j + 1] = v;
  }
  return String.fromCharCode.apply(null, Array.from(buf.subarray(0, n)));
}

const runSum = new Int32Array(PALETTE_SIZE);
const runMax = new Int32Array(PALETTE_SIZE);

function heuristicCodes(codes: readonly number[], t: Tables): number {
  let h = 0;
  runSum.fill(0);
  runMax.fill(0);
  for (const code of codes) {
    const len = t.length[code] as number;
    if (len === 0) continue;
    const run = t.baseRun[code] as number;
    const color = t.baseColor[code] as number;
    h += len - run;
    runSum[color] = (runSum[color] as number) + run;
    if (run > (runMax[color] as number)) runMax[color] = run;
  }
  for (let c = 0; c < PALETTE_SIZE; c++) h += (runSum[c] as number) - (runMax[c] as number);
  return h;
}

function isGoalCodes(codes: readonly number[], t: Tables): boolean {
  for (const code of codes) {
    const len = t.length[code] as number;
    if (len !== 0 && (len !== t.capacity || t.uniform[code] === 0)) return false;
  }
  return true;
}

interface Node {
  readonly codes: number[];
  readonly key: string;
  readonly g: number;
  readonly f: number;
  readonly parent: Node | null;
  readonly from: number;
  readonly to: number;
  readonly order: number;
}

/** Fila de prioridade (min-heap) por f, depois maior g, depois ordem de inserção. */
class NodeHeap {
  private readonly items: Node[] = [];

  get size(): number {
    return this.items.length;
  }

  private less(a: Node, b: Node): boolean {
    if (a.f !== b.f) return a.f < b.f;
    if (a.g !== b.g) return a.g > b.g;
    return a.order < b.order;
  }

  push(node: Node): void {
    const items = this.items;
    items.push(node);
    let i = items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const parent = items[p] as Node;
      if (!this.less(node, parent)) break;
      items[i] = parent;
      i = p;
    }
    items[i] = node;
  }

  pop(): Node | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (top === undefined || last === undefined || items.length === 0) return top;
    let i = 0;
    const n = items.length;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= n) break;
      const r = l + 1;
      let c = l;
      if (r < n && this.less(items[r] as Node, items[l] as Node)) c = r;
      if (!this.less(items[c] as Node, last)) break;
      items[i] = items[c] as Node;
      i = c;
    }
    items[i] = last;
    return top;
  }
}

/** Chave canónica: os tubos são permutáveis, por isso ordena-se a sua codificação. */
export function boardKey(board: Board, capacity: number = TUBE_CAPACITY): string {
  const t = getTables(capacity);
  return keyOf(board.map((tube) => encodeTube(tube, t)));
}

/**
 * Heurística admissível (e consistente) — limite inferior das jogadas em falta:
 * - cada bola acima da "base uniforme" do seu tubo tem de se mover pelo menos uma vez;
 * - para cada cor com bases uniformes em vários tubos, todas menos a maior
 *   têm de se mover.
 */
export function heuristic(board: Board, capacity: number = TUBE_CAPACITY): number {
  const t = getTables(capacity);
  return heuristicCodes(
    board.map((tube) => encodeTube(tube, t)),
    t,
  );
}

function pathOf(node: Node): Move[] {
  const moves: Move[] = [];
  let n: Node | null = node;
  while (n !== null && n.parent !== null) {
    moves.push({ from: n.from, to: n.to });
    n = n.parent;
  }
  return moves.reverse();
}

interface SearchOutcome {
  readonly status: SolveStatus;
  readonly moves: Move[] | null;
  readonly expanded: number;
}

function search(start: Board, t: Tables, weight: number, budget: number): SearchOutcome {
  const startCodes = start.map((tube) => encodeTube(tube, t));
  const startKey = keyOf(startCodes);
  const root: Node = {
    codes: startCodes,
    key: startKey,
    g: 0,
    f: weight * heuristicCodes(startCodes, t),
    parent: null,
    from: -1,
    to: -1,
    order: 0,
  };
  const { capacity, length, top, uniform, pow } = t;
  const open = new NodeHeap();
  const bestG = new Map<string, number>();
  open.push(root);
  bestG.set(startKey, 0);
  let order = 1;
  let expanded = 0;
  const n = startCodes.length;

  while (open.size > 0) {
    const node = open.pop() as Node;
    const codes = node.codes;
    if ((bestG.get(node.key) ?? Infinity) < node.g) continue;
    if (isGoalCodes(codes, t)) return { status: 'solved', moves: pathOf(node), expanded };
    if (expanded >= budget) return { status: 'unknown', moves: null, expanded };
    expanded++;
    const g = node.g + 1;

    for (let from = 0; from < n; from++) {
      const src = codes[from] as number;
      const srcLen = length[src] as number;
      if (srcLen === 0) continue;
      const srcUniform = uniform[src] === 1;
      // Tubo completo: nunca se mexe.
      if (srcUniform && srcLen === capacity) continue;
      const ball = top[src] as number;
      const ballDigit = (ball + 1) * (pow[srcLen - 1] as number);
      const newSrc = src - ballDigit;
      let triedEmpty = false;
      for (let to = 0; to < n; to++) {
        if (to === from) continue;
        const dst = codes[to] as number;
        const dstLen = length[dst] as number;
        if (dstLen >= capacity) continue;
        if (dstLen === 0) {
          // Tubos vazios são equivalentes: basta tentar um.
          // Mover de um tubo uniforme para um vazio nunca ajuda.
          if (triedEmpty || srcUniform) continue;
          triedEmpty = true;
        } else if (top[dst] !== ball) {
          continue;
        }
        const next = codes.slice();
        next[from] = newSrc;
        next[to] = dst + (ball + 1) * (pow[dstLen] as number);
        const key = keyOf(next);
        if ((bestG.get(key) ?? Infinity) <= g) continue;
        bestG.set(key, g);
        open.push({
          codes: next,
          key,
          g,
          f: g + weight * heuristicCodes(next, t),
          parent: node,
          from,
          to,
          order: order++,
        });
      }
    }
  }
  return { status: 'unsolvable', moves: null, expanded };
}

export function solve(board: Board, options: SolveOptions = {}): SolveResult {
  const capacity = options.capacity ?? DEFAULT_SOLVE_OPTIONS.capacity;
  const optimalBudget = options.optimalBudget ?? DEFAULT_SOLVE_OPTIONS.optimalBudget;
  const fallbackBudget = options.fallbackBudget ?? DEFAULT_SOLVE_OPTIONS.fallbackBudget;
  const fallbackWeight = options.fallbackWeight ?? DEFAULT_SOLVE_OPTIONS.fallbackWeight;

  if (board.some((tube) => tube.length > capacity || tube.some((c) => c < 0 || c >= PALETTE_SIZE))) {
    throw new Error('Invalid board for solver');
  }
  const t = getTables(capacity);
  const exact = search(board, t, 1, optimalBudget);
  if (exact.status !== 'unknown') {
    return { status: exact.status, moves: exact.moves, optimal: exact.status === 'solved', expanded: exact.expanded };
  }
  const greedy = search(board, t, fallbackWeight, fallbackBudget);
  return {
    status: greedy.status,
    moves: greedy.moves,
    optimal: false,
    expanded: exact.expanded + greedy.expanded,
  };
}
