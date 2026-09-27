// ============================================================
//  TOM LOUVORES — ministrantes que cabem na linha da lista
//  Carregue DEPOIS do vista-lista.js.
//
//  No celular a linha tem uma faixa só para os ministrantes, e
//  três nomes compridos ("Raphaela", "Daniela", "Pr. Humberto")
//  passavam da borda, por cima do índice A–Z. E quem tinha mais
//  de três ministrantes perdia os outros sem aviso.
//
//  Agora ficam na linha os nomes que cabem, e o resto vira um
//  "+N" — o mesmo recurso da coluna de tons. No computador a
//  coluna cresce e os três cabem; ali o "+N" só aparece quando
//  há mais de três.
// ============================================================

const LM_CELULAR = window.matchMedia("(max-width: 820px)");

(function lmEstilo() {
  const st = document.createElement("style");
  st.textContent = `
    .lst-min.lst-mais{color:var(--gray2);background:transparent;border-color:var(--black5)}
    /*  Rede de segurança: mesmo antes da conta, nada passa da
        borda da linha. */
    @media (max-width:820px){ .lst-mins{overflow:hidden} }`;
  document.head.appendChild(st);
})();

//  O "+N" conta todo mundo que não aparece: os que saíram agora
//  por falta de espaço e os que a lista já não desenhava.
function lmMais(c) {
  const resto = Math.max(c.nomes.length, c.chips.length) - c.visiveis;
  if (resto <= 0) {
    if (c.mais) { c.mais.remove(); c.mais = null; }
    return;
  }
  if (!c.mais) {
    c.mais = document.createElement("span");
    c.mais.className = "lst-min lst-mais";
    c.box.appendChild(c.mais);
  }
  c.mais.textContent = "+" + resto;
  c.mais.title = c.nomes.slice(c.visiveis).join(", ");
}

function lmAjustar() {
  const linhas = document.querySelectorAll("#lstWrap .lst-row");
  if (!linhas.length) return;
  const lista = typeof vistaLista !== "undefined" ? vistaLista : [];

  //  1ª passada, só escrita: todos os nomes de volta, e o "+N" de
  //  quem tem mais ministrantes do que a lista desenhou.
  const caixas = [];
  linhas.forEach(row => {
    const box = row.querySelector(".lst-mins");
    if (!box || box.querySelector(".todos")) return;
    const m = lista.find(x => x.id == row.dataset.id);
    const c = {
      box,
      chips: [...box.querySelectorAll(".lst-min:not(.lst-mais)")],
      nomes: (m && typeof vistaMins === "function" && vistaMins(m)) || [],
      mais: box.querySelector(".lst-mais"),
    };
    c.chips.forEach(ch => { ch.hidden = false; });
    c.visiveis = c.chips.length;
    lmMais(c);
    caixas.push(c);
  });

  if (!LM_CELULAR.matches) return;

  //  2ª, só leitura: quais passaram da borda. Ler tudo de uma vez
  //  custa um cálculo de página só, em vez de um por linha.
  const cheias = caixas.filter(c => c.box.scrollWidth > c.box.clientWidth + 1);

  //  3ª, só nessas: tira nomes do fim até caber (fica pelo menos um).
  cheias.forEach(c => {
    while (c.visiveis > 1 && c.box.scrollWidth > c.box.clientWidth + 1) {
      c.chips[--c.visiveis].hidden = true;
      lmMais(c);
    }
  });
}

// ── enxerto ─────────────────────────────────────────────────
const lmRenderOriginal = vistaRenderLista;
vistaRenderLista = function (...a) {
  const r = lmRenderOriginal.apply(this, a);
  lmAjustar();
  return r;
};

let lmEspera = null;
window.addEventListener("resize", () => {
  clearTimeout(lmEspera);
  lmEspera = setTimeout(lmAjustar, 150);
});

//  A fonte do site chega depois do primeiro desenho e muda a
//  largura dos nomes.
if (document.fonts) document.fonts.ready.then(lmAjustar);
