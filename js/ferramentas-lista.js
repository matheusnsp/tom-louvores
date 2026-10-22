// ============================================================
//  TOM LOUVORES — lugar dos botões "Revisar" (⚑) e "Lista/Cards"
//  Carregue DEPOIS do vista-lista.js e do revisao.js (repertório).
//
//  No celular os dois botões caíam sozinhos numa terceira linha,
//  abaixo de Ministrantes e Tons, soltos no canto. Eles são da
//  LISTA (filtrar as marcadas e trocar o jeito de ver), então no
//  celular passam a morar na barra da lista, ao lado do "237
//  músicas". No computador continuam na fileira de filtros, onde
//  cabem. Na visão em cards (sem a barra da lista) também voltam
//  para a fileira de filtros.
//
//  A barra da lista é redesenhada a cada busca; os botões saem dela
//  antes e voltam depois, para não serem apagados junto.
// ============================================================
(() => {
  const MQ = window.matchMedia("(max-width: 600px)");
  const botoes = () => ["rvFiltro", "btnVista"].map(id => document.getElementById(id)).filter(Boolean);

  function devolver() {
    const filtros = document.querySelector(".filtros-row");
    if (filtros) botoes().forEach(b => { if (b.parentElement !== filtros) filtros.appendChild(b); });
  }

  function posicionar() {
    const wrap = document.getElementById("lstWrap");
    const barra = wrap && wrap.style.display !== "none" ? wrap.querySelector(".lst-bar") : null;
    if (!MQ.matches || !barra) { devolver(); return; }
    let slot = barra.querySelector(".lst-ferr");
    if (!slot) {
      slot = document.createElement("span");
      slot.className = "lst-ferr";
      barra.querySelector(".lst-count")?.after(slot);
    }
    botoes().forEach(b => { if (b.parentElement !== slot) slot.appendChild(b); });
  }

  if (typeof render === "function") {
    const anterior = render;
    render = function (...a) {
      devolver();                       // tira da barra antes de ela ser refeita
      const r = anterior.apply(this, a);
      posicionar();
      return r;
    };
  }
  MQ.addEventListener?.("change", posicionar);

  const st = document.createElement("style");
  st.textContent = `
  .lst-ferr{display:none}
  @media (max-width: 600px){
    /* barra da lista em duas linhas: contagem + botões; agrupar embaixo */
    #lstWrap .lst-bar{display:grid;grid-template-columns:1fr auto;align-items:center;row-gap:10px;column-gap:8px}
    #lstWrap .lst-bar .lst-bar-sp,#lstWrap .lst-bar .lst-bar-lbl{display:none}
    #lstWrap .lst-bar .lst-seg{grid-column:1 / -1;justify-self:start}
    .lst-ferr{display:inline-flex;align-items:center;gap:8px}
    .lst-ferr .rv-filtro,.lst-ferr .btn-vista{height:38px;min-width:38px;padding:0 12px;
      display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:999px}
    .lst-ferr .rv-filtro[hidden]{display:none}
  }`;
  document.head.appendChild(st);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", posicionar);
  else posicionar();
})();
