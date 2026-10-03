# Pipeta

Jogo de puzzle "ball sort" (Phaser 3 + TypeScript + Vite), para Android
(Capacitor) e web. Leve, offline, níveis gerados por algoritmo.

> **Estado:** Fase 3 concluída — menu, jogo, vitória com estrelas,
> definições, gravação do progresso e idiomas (pt-PT/en).
> Ajudas com anúncios simulados chegam na Fase 4.

### Parâmetros de URL úteis para testes
- `?level=N` ou `#N` — abre diretamente o nível N (ex.: `#60`, um nível difícil).
- `?debug` ou `#debug` — página de teste da lógica da Fase 1 (gerador/solver, "Ver solução").

## Como correr

Requisitos: Node 20+ (testado com Node 22).

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm test           # testes unitários (Vitest) — inclui os 300 primeiros níveis
npm run typecheck  # TypeScript strict
npm run build      # build de produção em dist/
```

## Versão para testar no telemóvel

A versão de teste está publicada como página do claude.ai:
**https://claude.ai/artifact/BuMu8EdNBLLscY1wnvTqu7**
(gerada com `npm run build:artifact` → `dist/artifact.html` + `dist/assets/`).
Nessa página, o nível escolhe-se pelo hash: `…/BuMu8EdNBLLscY1wnvTqu7#60`;
`#debug` abre a página de teste da lógica.

## Versão pública (GitHub Pages)

**https://phreezi.github.io/pipeta/** — também abre no browser do Tesla e
em qualquer telemóvel, sem conta. Nível direto: `https://phreezi.github.io/pipeta/?level=60`.

Cada push no ramo principal corre typecheck, testes e build e publica a
build no ramo `gh-pages` (`.github/workflows/deploy.yml`), que o GitHub
Pages serve. Demora 1–2 minutos a aparecer.

## Estrutura

```
src/
  core/        lógica pura, sem Phaser (testável em Node)
    types.ts       tipos base, capacidade (4) e tamanho da paleta (12)
    rules.ts       regras: validar/aplicar jogada, tubo completo, nível resolvido
    rng.ts         PRNG determinístico (mulberry32)
    difficulty.ts  curva de dificuldade por número de nível
    generator.ts   gerador determinístico + verificação pelo solver
    solver.ts      solver A* com memoização de estados
    stars.ts       cálculo de estrelas
    session.ts     sessão de jogo: seleção, desfazer, reiniciar, tubo extra, snapshot
  config/      paleta, cores da interface, durações das animações, DPR
  scenes/      BootScene (texturas + assets) e GameScene (jogo)
  services/    áudio, i18n, níveis (Web Worker + cache + pré-geração)
  i18n/        todos os textos (pt-PT e en)
  ui/          layout responsivo (lógica pura, testada), botões, texturas geradas
  workers/     Web Worker do gerador de níveis
  debug/       página de teste da Fase 1 (?debug)
tests/core/    testes Vitest
assets-src/    arquivos originais dos assets (fora da build)
```

## Decisões da Fase 1

- **Uma jogada = uma bola** (como pedido: toca-se e levanta-se a bola do topo).
- **Seeds:** a tentativa 0 de cada nível usa `seed = número do nível`. Se o
  tabuleiro for impossível ou trivial (algum tubo já completo), passa-se à
  seed seguinte, gerada no espaço do próprio nível (`mixSeed(nível, tentativa)`)
  para nunca repetir o puzzle de outro nível.
- **Solver:** A* com chave canónica (a ordem dos tubos é irrelevante),
  heurística admissível e podas seguras (tubos vazios equivalentes; nunca
  mexer num tubo completo; nunca passar um tubo uniforme para um vazio).
  Até 60 000 expansões procura o mínimo exato; se o orçamento acabar, usa
  A* ponderado e a solução encontrada serve de mínimo (marcado como
  aproximado). Nos 300 primeiros níveis o mínimo é sempre exato.
  Os testes confirmam que o mínimo coincide com uma BFS sem podas.
- **Níveis difíceis** (60, 70, 80, …): 1 tubo vazio e 9 cores. Com 1 só
  vazio, tabuleiros aleatórios com 11–12 cores são quase sempre impossíveis
  (500 seeds seguidas sem solução), por isso fixei-os no início do intervalo 9–12.
- **Curva:** 1–5: 3 cores · 6–12: 4 · 13–20: 5 · 21–30: 6 · 31–40: 7 ·
  41–50: 8 · 51–70: 9 · 71–100: 10 · 101–150: 11 · 151+: 12.
- **Estrelas:** 3 até 1,3× o mínimo, 2 até 2×, 1 concluído.
- **Desfazer não desconta jogadas** — o contador mostra todas as jogadas
  feitas (as estrelas refletem a eficiência). Fácil de mudar em `session.ts`.
- **Reiniciar** mantém o tubo extra (já foi "pago" com vídeo) e os usos de
  desfazer restantes; conta para o "Saltar nível" (após 3 reinícios).
- **Desempenho do gerador:** ~60 ms em média por nível (máx. ~400 ms nos
  níveis de 12 cores, em servidor). Na Fase 2 a geração corre num Web Worker
  e o nível seguinte é pré-gerado durante o jogo, para não haver esperas.

## Decisões da Fase 2

- **Nitidez:** o canvas é criado na resolução real do ecrã (devicePixelRatio,
  limitado a 2 para manter 60 fps) e reduzido por CSS.
- **Bolas, tubos, botões, estrelas e confetes** são desenhados em código
  (Phaser Graphics → texturas) a partir da paleta de 12 cores.
- **Layout:** 1 ou 2 filas, escolhendo a que dá bolas maiores; zonas de toque
  com ≥ 48 dp de largura até 14 tubos (com 15 — 12 cores + 2 vazios + extra —
  ficam com ~45 dp num ecrã de 360 dp).
- **Animações:** levantar 150 ms, arco 220 ms, pousar com ressalto 170 ms,
  abanar 240 ms em jogada inválida (com vibração curta).
- **Níveis gerados num Web Worker**, com o seguinte pré-gerado durante o jogo.
- **Tubo Extra** funciona já sem anúncio; na Fase 4 passa a exigir vídeo.
- **Sons:** ficheiros do Kenney (OGG); se não carregarem, toca um som
  sintetizado de substituição.

## Decisões da Fase 3

- **Ecrãs:** Menu (Jogar no nível atual, nível atual, total de estrelas,
  Definições) → Jogo (botões Menu e Definições no topo) → Vitória
  (estrelas, jogadas, mínimo, Próximo nível, Menu). As Definições abrem por
  cima do menu ou do jogo, que fica em pausa.
- **Gravação:** `SaveStore` guarda nível atual, melhores estrelas por nível,
  definições e o nível em curso (`SessionSnapshot`) a cada jogada, com
  escrita agrupada (300 ms) e gravação imediata ao minimizar/fechar.
  Formato com `version` e `migrate()` que valida campo a campo.
  Armazenamento: `LocalStorageAdapter` (web), `PreferencesStorage`
  (Android, ligado na Fase 5), `MemoryStorage` (fallback/testes).
- **Retomar:** ao reabrir, o nível em curso só é retomado se o tabuleiro
  inicial gravado coincidir com o gerado (protege contra mudanças futuras
  no gerador).
- **Idioma:** Automático (idioma do dispositivo) → Português → English.
- **Modo daltónico:** cada cor tem uma forma própria desenhada na bola.
- **Política de privacidade:** `public/privacy.html` (pt/en), publicada em
  https://phreezi.github.io/pipeta/privacy.html (URL em `src/config/app.ts`).
  O contacto aponta para as issues do GitHub — troca por um email antes de publicar na Play Store.
- **Gerir consentimento:** na web mostra "Disponível na app Android"; na
  Fase 5 abre o formulário da Google UMP.
- **Música:** a opção já existe nas definições; a música entra na Fase 6.

## Assets do Kenney esperados

Os arquivos originais estão em `assets-src/`. Os ficheiros abaixo são
copiados para `public/assets/kenney/` (sons, jingle e ícones já incluídos).
Se faltar algum, o jogo usa placeholders gerados em código e avisa na consola.

**UI Pack** → `public/assets/kenney/ui/`
- `PNG/Blue/Default/button_rectangle_depth_gradient.png` → `button_primary.png`
- `PNG/Green/Default/button_rectangle_depth_gradient.png` → `button_success.png`
- `PNG/Grey/Default/button_rectangle_depth_flat.png` → `button_disabled.png`
- `PNG/Blue/Default/button_round_depth_gradient.png` → `button_round.png`
- `PNG/Grey/Default/check_square_grey_checkmark.png`, `check_square_grey.png` → toggles (definições)

**Game Icons** (`PNG/White/2x/`) → `public/assets/kenney/icons/` (mesmo nome)
- `return.png` (desfazer), `rewind.png` (reiniciar), `plus.png` (tubo extra),
  `fastForward.png` (saltar), `gear.png` (definições), `home.png` (menu),
  `audioOn.png`, `audioOff.png`, `musicOn.png`, `musicOff.png`,
  `star.png`, `video.png` (botões com vídeo), `next.png`, `checkmark.png`, `cross.png`

**Interface Sounds** (`Audio/`) → `public/assets/kenney/sfx/` (mesmo nome)
- `select_001.ogg` (levantar bola), `drop_002.ogg` (pousar), `error_004.ogg`
  (jogada inválida), `confirmation_002.ogg` (tubo completo),
  `click_002.ogg` (botões), `maximize_006.ogg` (tubo extra)

**Music Jingles** (`Audio/Pizzicato jingles/`) → `public/assets/kenney/jingles/jingles_PIZZI00.ogg` (vitória) ·
**Música de fundo** → 6 faixas "JRPG Music Pack 4 — Calm" (Juhani Junkala, CC0),
recomprimidas e carregadas em segundo plano (fora do carregamento inicial).

## Licenças

Todos os assets são CC0 (ver `assets-src/README.md`).
