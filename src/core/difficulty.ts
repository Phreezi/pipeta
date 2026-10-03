/** Parâmetros de dificuldade de um nível. */
export interface LevelParams {
  readonly colors: number;
  readonly emptyTubes: number;
  /** Nível "difícil" (apenas 1 tubo vazio). */
  readonly hard: boolean;
}

/**
 * Curva de dificuldade:
 * - 1-5:   3 cores, 2 vazios
 * - 6-20:  4-5 cores, 2 vazios
 * - 21-50: 6-8 cores, 2 vazios
 * - 51+:   9-12 cores, 2 vazios; de 10 em 10 (60, 70, ...) só 1 vazio
 *          (níveis difíceis com 9 cores)
 */
export const HARD_LEVEL_COLORS = 9;

export function levelParams(level: number): LevelParams {
  if (!Number.isInteger(level) || level < 1) throw new Error(`Invalid level: ${level}`);
  if (level <= 5) return { colors: 3, emptyTubes: 2, hard: false };
  if (level <= 12) return { colors: 4, emptyTubes: 2, hard: false };
  if (level <= 20) return { colors: 5, emptyTubes: 2, hard: false };
  if (level <= 30) return { colors: 6, emptyTubes: 2, hard: false };
  if (level <= 40) return { colors: 7, emptyTubes: 2, hard: false };
  if (level <= 50) return { colors: 8, emptyTubes: 2, hard: false };
  // Níveis difíceis ficam em 9 cores: com 1 só tubo vazio, mais cores
  // tornam quase todos os tabuleiros aleatórios impossíveis.
  if (level % 10 === 0) return { colors: HARD_LEVEL_COLORS, emptyTubes: 1, hard: true };
  const colors = level <= 70 ? 9 : level <= 100 ? 10 : level <= 150 ? 11 : 12;
  return { colors, emptyTubes: 2, hard: false };
}
