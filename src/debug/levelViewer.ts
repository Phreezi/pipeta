import { computeStars, GameSession, generateLevel, type Level } from '../core';
import { BALL_COLORS, BALL_SYMBOLS, cssColor } from '../config/palette';

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; color: #eef;
    background: linear-gradient(160deg, #1d2340, #3a2d5c); }
  .wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { opacity: .7; font-size: 13px; margin-bottom: 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  button, input { min-height: 48px; font-size: 16px; border-radius: 10px; border: 0; padding: 0 14px; }
  button { background: #5a67d8; color: #fff; cursor: pointer; }
  button:disabled { opacity: .4; }
  input { width: 96px; background: #fff; color: #111; }
  .info { font-size: 14px; line-height: 1.6; background: rgba(0,0,0,.2); padding: 8px 12px; border-radius: 10px; }
  .tubes { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 20px 0; }
  .tube { width: 52px; height: 220px; padding: 6px 4px; border: 3px solid rgba(255,255,255,.55);
    border-top: 0; border-radius: 0 0 26px 26px; display: flex; flex-direction: column-reverse;
    gap: 4px; align-items: center; cursor: pointer; transition: transform .15s; }
  .tube.sel { transform: translateY(-12px); border-color: #ffe119; }
  .tube.done { border-color: #3cb44b; }
  .ball { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
    font-size: 18px; color: rgba(0,0,0,.6); box-shadow: inset -4px -6px 0 rgba(0,0,0,.18); }
  .msg { min-height: 24px; text-align: center; font-weight: 600; }
  .shake { animation: shake .25s; }
  @keyframes shake { 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
`;

export function mountLevelViewer(root: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="wrap">
      <h1>Pipeta — teste da Fase 1</h1>
      <div class="sub">Lógica, gerador e solver. Toca num tubo para levantar a bola e noutro para a pousar.</div>
      <div class="bar">
        <button data-act="prev">◀</button>
        <input type="number" min="1" value="1" aria-label="nível" />
        <button data-act="next">▶</button>
        <button data-act="go">Gerar</button>
        <label><input type="checkbox" data-act="cb" style="width:auto;min-height:0" /> daltónico</label>
      </div>
      <div class="bar">
        <button data-act="undo">Desfazer</button>
        <button data-act="restart">Reiniciar</button>
        <button data-act="extra">Tubo extra</button>
        <button data-act="solve">Ver solução</button>
      </div>
      <div class="info"></div>
      <div class="tubes"></div>
      <div class="msg"></div>
    </div>`;

  const q = <T extends Element>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (el === null) throw new Error(`missing ${sel}`);
    return el;
  };
  const input = q<HTMLInputElement>('input[type=number]');
  const colorBlind = q<HTMLInputElement>('[data-act=cb]');
  const info = q<HTMLDivElement>('.info');
  const tubesEl = q<HTMLDivElement>('.tubes');
  const msg = q<HTMLDivElement>('.msg');

  let level: Level = generateLevel(1);
  let genMs = 0;
  let session = new GameSession(level.level, level.board);
  let playing = 0;

  const render = (): void => {
    const p = level.params;
    info.innerHTML =
      `Nível <b>${level.level}</b> · ${p.colors} cores · ${p.emptyTubes} vazio(s)${p.hard ? ' · <b>difícil</b>' : ''}<br>` +
      `Seed ${level.seed} (tentativas rejeitadas: ${level.attempts}) · gerado em ${genMs.toFixed(0)} ms<br>` +
      `Mínimo: <b>${level.minMoves}</b>${level.optimal ? ' (ótimo)' : ' (aprox.)'} · ` +
      `Jogadas: <b>${session.moveCount}</b> · Desfazer: ${session.undosLeft} · Reinícios: ${session.restarts}`;
    tubesEl.innerHTML = '';
    session.board.forEach((tube, i) => {
      const t = document.createElement('div');
      t.className = 'tube';
      if (session.selected === i) t.classList.add('sel');
      if (session.isTubeComplete(i)) t.classList.add('done');
      for (const c of tube) {
        const b = document.createElement('div');
        b.className = 'ball';
        b.style.background = cssColor(BALL_COLORS[c] ?? 0);
        if (colorBlind.checked) b.textContent = BALL_SYMBOLS[c] ?? '';
        t.appendChild(b);
      }
      t.addEventListener('click', () => onTap(i, t));
      tubesEl.appendChild(t);
    });
    if (session.solved) {
      const stars = computeStars(session.moveCount, level.minMoves);
      msg.textContent = `Resolvido em ${session.moveCount} jogadas — ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
    }
  };

  const onTap = (i: number, el: HTMLElement): void => {
    if (playing !== 0) return;
    const r = session.tap(i);
    msg.textContent = '';
    if (r.kind === 'invalid') {
      el.classList.add('shake');
      msg.textContent = `Jogada inválida (${r.reason})`;
      setTimeout(render, 250);
      return;
    }
    render();
  };

  const load = (n: number): void => {
    stop();
    const lv = Math.max(1, Math.floor(n) || 1);
    input.value = String(lv);
    const t0 = performance.now();
    level = generateLevel(lv);
    genMs = performance.now() - t0;
    session = new GameSession(level.level, level.board);
    msg.textContent = '';
    render();
  };

  const stop = (): void => {
    if (playing !== 0) clearInterval(playing);
    playing = 0;
  };

  const playSolution = (): void => {
    stop();
    session = new GameSession(level.level, level.board);
    let i = 0;
    render();
    playing = window.setInterval(() => {
      const m = level.solution[i++];
      if (m === undefined) return stop();
      session.tap(m.from);
      session.tap(m.to);
      render();
    }, 350);
  };

  root.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).dataset['act'];
    if (act === 'prev') load(Number(input.value) - 1);
    else if (act === 'next') load(Number(input.value) + 1);
    else if (act === 'go') load(Number(input.value));
    else if (act === 'undo') {
      const r = session.undo();
      msg.textContent = r.ok ? '' : r.reason === 'no-undos-left' ? 'Sem desfazer (na versão final: +5 por vídeo)' : '';
      render();
    } else if (act === 'restart') {
      stop();
      session.restart();
      msg.textContent = session.canSkip ? 'Saltar nível disponível (Fase 4)' : '';
      render();
    } else if (act === 'extra') {
      msg.textContent = session.addExtraTube() ? '' : 'Tubo extra já usado neste nível';
      render();
    } else if (act === 'solve') playSolution();
    else if (act === 'cb') render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') load(Number(input.value));
  });

  render();
}
