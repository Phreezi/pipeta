/** Todos os textos do jogo. Nunca escrever texto visível diretamente no código. */
export const STRINGS = {
  'pt-PT': {
    level: 'Nível {n}',
    moves: 'Jogadas: {n}',
    undo: 'Desfazer',
    restart: 'Reiniciar',
    extraTube: 'Tubo extra',
    skip: 'Saltar',
    loading: 'A gerar nível…',
    levelComplete: 'Nível concluído!',
    movesMade: '{n} jogadas',
    minMoves: 'Mínimo: {n}',
    nextLevel: 'Próximo nível',
    hardLevel: 'Nível difícil',
    noUndos: 'Sem desfazer',
    extraUsed: 'Tubo extra já usado',
  },
  en: {
    level: 'Level {n}',
    moves: 'Moves: {n}',
    undo: 'Undo',
    restart: 'Restart',
    extraTube: 'Extra tube',
    skip: 'Skip',
    loading: 'Generating level…',
    levelComplete: 'Level complete!',
    movesMade: '{n} moves',
    minMoves: 'Best: {n}',
    nextLevel: 'Next level',
    hardLevel: 'Hard level',
    noUndos: 'No undos left',
    extraUsed: 'Extra tube already used',
  },
} as const;

export type Locale = keyof typeof STRINGS;
export type StringKey = keyof (typeof STRINGS)['pt-PT'];
export const LOCALES: readonly Locale[] = ['pt-PT', 'en'];
