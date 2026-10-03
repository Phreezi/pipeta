import{a as e,i as t,n,o as r,r as i,t as a}from"./index-8y4AP3eE.js";var o=`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { overflow: auto !important; touch-action: auto !important; height: auto !important; }
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
`;function s(s){let c=document.createElement(`style`);c.textContent=o,document.head.appendChild(c),s.innerHTML=`
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
    </div>`;let l=e=>{let t=s.querySelector(e);if(t===null)throw Error(`missing ${e}`);return t},u=l(`input[type=number]`),d=l(`[data-act=cb]`),f=l(`.info`),p=l(`.tubes`),m=l(`.msg`),h=r(1),g=0,_=new t(h.level,h.board),v=0,y=()=>{let t=h.params;if(f.innerHTML=`Nível <b>${h.level}</b> · ${t.colors} cores · ${t.emptyTubes} vazio(s)${t.hard?` · <b>difícil</b>`:``}<br>Seed ${h.seed} (tentativas rejeitadas: ${h.attempts}) · gerado em ${g.toFixed(0)} ms<br>Mínimo: <b>${h.minMoves}</b>${h.optimal?` (ótimo)`:` (aprox.)`} · Jogadas: <b>${_.moveCount}</b> · Desfazer: ${_.undosLeft} · Reinícios: ${_.restarts}`,p.innerHTML=``,_.board.forEach((e,t)=>{let r=document.createElement(`div`);r.className=`tube`,_.selected===t&&r.classList.add(`sel`),_.isTubeComplete(t)&&r.classList.add(`done`);for(let t of e){let e=document.createElement(`div`);e.className=`ball`,e.style.background=i(a[t]??0),d.checked&&(e.textContent=n[t]??``),r.appendChild(e)}r.addEventListener(`click`,()=>b(t,r)),p.appendChild(r)}),_.solved){let t=e(_.moveCount,h.minMoves);m.textContent=`Resolvido em ${_.moveCount} jogadas — ${`★`.repeat(t)}${`☆`.repeat(3-t)}`}},b=(e,t)=>{if(v!==0)return;let n=_.tap(e);if(m.textContent=``,n.kind===`invalid`){t.classList.add(`shake`),m.textContent=`Jogada inválida (${n.reason})`,setTimeout(y,250);return}y()},x=e=>{S();let n=Math.max(1,Math.floor(e)||1);u.value=String(n);let i=performance.now();h=r(n),g=performance.now()-i,_=new t(h.level,h.board),m.textContent=``,y()},S=()=>{v!==0&&clearInterval(v),v=0},C=()=>{S(),_=new t(h.level,h.board);let e=0;y(),v=window.setInterval(()=>{let t=h.solution[e++];if(t===void 0)return S();_.tap(t.from),_.tap(t.to),y()},350)};s.addEventListener(`click`,e=>{let t=e.target.dataset.act;if(t===`prev`)x(Number(u.value)-1);else if(t===`next`)x(Number(u.value)+1);else if(t===`go`)x(Number(u.value));else if(t===`undo`){let e=_.undo();m.textContent=e.ok?``:e.reason===`no-undos-left`?`Sem desfazer (na versão final: +5 por vídeo)`:``,y()}else t===`restart`?(S(),_.restart(),m.textContent=_.canSkip?`Saltar nível disponível (Fase 4)`:``,y()):t===`extra`?(m.textContent=_.addExtraTube()?``:`Tubo extra já usado neste nível`,y()):t===`solve`?C():t===`cb`&&y()}),u.addEventListener(`keydown`,e=>{e.key===`Enter`&&x(Number(u.value))}),y()}export{s as mountLevelViewer};