// ============================================================
//  TOM LOUVORES — filtrar o repertório por cantor
//  Só no repertorio.html. Carregue DEPOIS do app.js, vista-lista.js,
//  busca-letra.js e artista.js, e ANTES do tons-mobile.js (que
//  transforma o filtro no mesmo campo de tom e ministrante).
//
//  Mais um filtro na fila de Ministrantes e Tons: Cantores. A lista
//  sai das próprias músicas do repertório, com quantas cada cantor
//  tem ("Fernandinho · 5 músicas"), e escolher um mostra só as
//  músicas dele. Para ver todos os cantores de uma vez, com as
//  músicas embaixo de cada um, há o "Agrupar → Cantor" da lista.
//
//  O total de cantores também aparece no topo do repertório, junto
//  de Músicas e Tons.
//
//  O cantor vem da cifra (artista.js): música sem cifra cadastrada
//  não tem cantor e só aparece com o filtro em "Todos".
// ============================================================
(() => {
  "use strict";

  const filtros = document.querySelector(".filtros-row");
  const tons = document.getElementById("filtroTom");
  if (!filtros || !tons || typeof tlArtistaDe !== "function") return;

  const sel = document.createElement("select");
  sel.id = "filtroCantor";
  sel.className = "sel";
  sel.setAttribute("aria-label", "Cantor");
  sel.innerHTML = `<option value="">Cantores</option>`;
  sel.addEventListener("change", () => filtrar());
  tons.after(sel);

  //  As opções: cada cantor do repertório, com quantas músicas tem.
  //  Refeita quando o repertório muda e quando as cifras (de onde
  //  vem o cantor) terminam de carregar.
  let assinatura = "";
  function montarOpcoes() {
    const conta = new Map();
    (musicas || []).forEach(m => {
      const c = tlArtistaDe(m.nome);
      if (c) conta.set(c, (conta.get(c) || 0) + 1);
    });
    const nomes = [...conta.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));
    //  o total no topo do repertório (no lugar do de ministrantes).
    //  "Medley" não é cantor: fica fora da conta.
    const total = document.getElementById("totalCantores");
    if (total) total.textContent = nomes.filter(n => n !== "Medley").length;
    const nova = nomes.map(n => n + conta.get(n)).join("|");
    if (nova === assinatura) return;
    assinatura = nova;

    const atual = sel.value;
    sel.innerHTML = `<option value="">Cantores</option>` + nomes.map(n => {
      const q = conta.get(n);
      return `<option value="${esc(n)}">${esc(n)} · ${q} ${q === 1 ? "música" : "músicas"}</option>`;
    }).join("");
    //  o cantor escolhido saiu do repertório: volta para todos
    sel.value = conta.has(atual) ? atual : "";
  }

  //  O filtro: os outros filtros (busca, letra, ministrante, tom)
  //  continuam como estão; o cantor só tira o que não é dele da
  //  lista que eles mandariam desenhar.
  const filtrarAnterior = filtrar;
  filtrar = function (...a) {
    montarOpcoes();
    const cantor = sel.value;
    if (!cantor) return filtrarAnterior.apply(this, a);
    const renderAnterior = render;
    render = lista => renderAnterior((lista || []).filter(m => tlArtistaDe(m.nome) === cantor));
    try { return filtrarAnterior.apply(this, a); }
    finally { render = renderAnterior; }
  };

  //  Quando o repertório chega (ou muda), o app.js desenha direto,
  //  sem passar pelo filtrar(): aqui as opções se atualizam junto, e
  //  um cantor já escolhido continua valendo.
  const renderOriginal = render;
  let dentro = false;
  render = function (lista) {
    if (dentro) return renderOriginal.call(this, lista);
    montarOpcoes();
    if (sel.value && lista === musicas) {
      dentro = true;
      try { return filtrar(); } finally { dentro = false; }
    }
    return renderOriginal.call(this, lista);
  };

  //  O cantor vem do índice das cifras, que chega depois do
  //  repertório: refaz as opções quando ele estiver pronto.
  if (typeof lyraCarregarIndice === "function") {
    lyraCarregarIndice().then(() => montarOpcoes()).catch(() => {});
  }
  montarOpcoes();
})();
