// ============================================================
//  TOM LOUVORES — aviso no estilo do site
//  Substitui o alert() do navegador (caixa branca do sistema, com
//  "Fechar" em azul e texto técnico) por um cartão escuro com o
//  dourado do site, título curto, texto claro e botões de ação.
//
//    tlAviso({ tipo: "ok" | "erro" | "info", titulo, texto,
//              detalhe, acoes: [{ rotulo, primario, aoTocar }] })
//
//  Esc, tocar fora ou o ✕ fecham. Devolve uma Promise que resolve
//  quando o aviso fecha.
// ============================================================
(() => {
  "use strict";

  const ICO = {
    ok:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    erro: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 16.5v.5"/><circle cx="12" cy="12" r="9.5"/></svg>',
    info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5"/><path d="M12 7.5v.5"/></svg>',
  };

  const st = document.createElement("style");
  st.textContent = `
  .tl-aviso-fundo{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
    padding:20px;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
    opacity:0;transition:opacity .18s}
  .tl-aviso-fundo.on{opacity:1}
  .tl-aviso{position:relative;width:min(100%,420px);padding:26px 24px 22px;border-radius:20px;
    background:#121214;border:1px solid var(--line,rgba(240,185,58,.38));
    box-shadow:0 30px 80px rgba(0,0,0,.7);color:var(--paper,#fff);font-family:var(--font-ui,Montserrat,sans-serif);
    transform:translateY(10px) scale(.98);transition:transform .2s cubic-bezier(.22,1,.36,1)}
  .tl-aviso-fundo.on .tl-aviso{transform:none}
  .tl-aviso-ico{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin-bottom:16px;
    background:rgba(240,185,58,.12);border:1px solid rgba(240,185,58,.45);color:var(--gold-hi,#F6D27A)}
  .tl-aviso.erro .tl-aviso-ico{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.45);color:#F87171}
  .tl-aviso h3{margin:0 0 8px;font-family:var(--font-display,Montserrat,sans-serif);font-size:20px;font-weight:700;line-height:1.25}
  .tl-aviso p{margin:0;font-size:14.5px;line-height:1.6;color:var(--dim,rgba(255,255,255,.78))}
  .tl-aviso details{margin-top:12px;font-size:12px;color:var(--gray2,#8A8A90)}
  .tl-aviso details summary{cursor:pointer}
  .tl-aviso details pre{margin:8px 0 0;white-space:pre-wrap;word-break:break-word;font-size:11.5px}
  .tl-aviso-acoes{display:flex;gap:10px;margin-top:22px}
  .tl-aviso-acoes button{flex:1;min-height:46px;padding:0 16px;border-radius:999px;cursor:pointer;
    font:600 14px var(--font-ui,Montserrat,sans-serif);transition:background .15s,border-color .15s,color .15s;
    background:rgba(0,0,0,.4);border:1px solid var(--line,rgba(240,185,58,.38));color:var(--paper,#fff)}
  .tl-aviso-acoes button:hover{border-color:var(--gold,#F0B93A);color:var(--gold,#F0B93A)}
  .tl-aviso-acoes button.primario{background:var(--gold,#F0B93A);border-color:var(--gold,#F0B93A);color:var(--on-gold,#0B0B0C)}
  .tl-aviso-acoes button.primario:hover{background:var(--gold-hi,#F6D27A);color:var(--on-gold,#0B0B0C)}
  .tl-aviso-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;cursor:pointer;
    background:none;border:1px solid var(--fio,rgba(255,255,255,.12));color:var(--gray2,#8A8A90);font-size:15px}
  .tl-aviso-x:hover{color:var(--paper,#fff);border-color:var(--gray2,#8A8A90)}
  @media(max-width:480px){.tl-aviso-acoes{flex-direction:column-reverse}}
  @media(prefers-reduced-motion:reduce){.tl-aviso-fundo,.tl-aviso{transition:none}}`;
  document.head.appendChild(st);

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  window.tlAviso = function ({ tipo = "info", titulo = "", texto = "", detalhe = "", acoes } = {}) {
    document.getElementById("tlAviso")?.remove();
    const lista = acoes && acoes.length ? acoes : [{ rotulo: "Entendi", primario: true }];

    return new Promise(resolve => {
      const fundo = document.createElement("div");
      fundo.id = "tlAviso";
      fundo.className = "tl-aviso-fundo";
      fundo.innerHTML = `
        <div class="tl-aviso ${esc(tipo)}" role="alertdialog" aria-modal="true" aria-labelledby="tlAvisoT" aria-describedby="tlAvisoP">
          <button type="button" class="tl-aviso-x" aria-label="Fechar">&#10005;</button>
          <div class="tl-aviso-ico">${ICO[tipo] || ICO.info}</div>
          <h3 id="tlAvisoT">${esc(titulo)}</h3>
          <p id="tlAvisoP">${esc(texto)}</p>
          ${detalhe ? `<details><summary>Detalhes técnicos</summary><pre>${esc(detalhe)}</pre></details>` : ""}
          <div class="tl-aviso-acoes">${lista.map((a, i) =>
            `<button type="button" data-i="${i}" class="${a.primario ? "primario" : ""}">${esc(a.rotulo)}</button>`).join("")}</div>
        </div>`;

      const fechar = valor => {
        document.removeEventListener("keydown", tecla, true);
        fundo.classList.remove("on");
        setTimeout(() => fundo.remove(), 180);
        resolve(valor);
      };
      const tecla = e => { if (e.key === "Escape") { e.stopPropagation(); fechar(null); } };

      fundo.addEventListener("click", e => {
        if (e.target === fundo || e.target.closest(".tl-aviso-x")) { fechar(null); return; }
        const b = e.target.closest("[data-i]");
        if (!b) return;
        const acao = lista[Number(b.dataset.i)];
        fechar(acao.rotulo);
        if (typeof acao.aoTocar === "function") acao.aoTocar();
      });
      document.addEventListener("keydown", tecla, true);

      document.body.appendChild(fundo);
      requestAnimationFrame(() => fundo.classList.add("on"));
      (fundo.querySelector(".primario") || fundo.querySelector("[data-i]")).focus({ preventScroll: true });
    });
  };
})();
