// ============================================================
//  TOM LOUVORES — o back e a hora de chegada no cartão do culto
//  Só na index.html. Carregue DEPOIS do app.js, do
//  escala-ministrante.js e do escala.js.
//
//  A página Escala mostra o mês inteiro; aqui a mesma escala entra
//  no cartão de cada culto, logo abaixo do ministrante:
//    · "Chegada 18:30" no fim da linha do ministrante;
//    · uma linha "Back" com quem canta, na ordem BVOCAL 1 a 4, e
//      "Vaga" tracejada onde ainda não há ninguém.
//  Todo mundo vê, como na página Escala. Nada é gravado: o
//  ministrante continua sendo preenchido pelo escala-ministrante.js.
//
//  De onde vem: a consulta do escala.js (escBuscar), uma por
//  abertura, com a cópia guardada no aparelho (a mesma da página
//  Escala). Cópia com menos de uma hora dispensa a consulta. A
//  janela é de hoje até o fim do mês que vem: culto passado só
//  mostra o back se ainda estiver na cópia.
// ============================================================
(() => {
  "use strict";
  if (typeof renderCultos !== "function" || typeof escBuscar !== "function") return;

  const FRESCA_MS = 60 * 60 * 1000;
  const TURNO = typeof ESCALA_TURNO_POR_TIPO !== "undefined"
    ? ESCALA_TURNO_POR_TIPO
    : { quarta: "único", domingo_manha: "manhã", domingo_noite: "noite" };

  let lista = null;   // [{ data, turno, chegada, ministrante, backs }]

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  //  A ocorrência "domingo_noite@2026-11-16" casa com a escala pela
  //  data e pelo turno. Um culto extra (tipo sem turno) casa com o
  //  único culto escalado naquele dia, se houver só um.
  function entradaDe(chave) {
    if (!lista) return null;
    const [tipo, data] = String(chave || "").split("@");
    if (!data) return null;
    const doDia = lista.filter(c => c.data === data);
    const turno = TURNO[tipo];
    if (turno) return doDia.find(c => c.turno === turno) || null;
    return doDia.length === 1 ? doDia[0] : null;
  }

  function chip(nome) {
    return nome
      ? `<span class="culto-back">${esc(nome)}</span>`
      : `<span class="culto-back vaga">Vaga</span>`;
  }

  function pintar() {
    document.querySelectorAll(".culto-col[data-culto-key]").forEach(col => {
      col.querySelector(".culto-equipe")?.remove();
      col.querySelector(".culto-chegada")?.remove();
      const e = entradaDe(col.dataset.cultoKey);
      if (!e) return;

      const linhaMin = col.querySelector(".culto-escala");
      if (linhaMin && e.chegada) {
        linhaMin.insertAdjacentHTML("beforeend",
          `<span class="culto-chegada">Chegada <b>${esc(e.chegada)}</b></span>`);
      }

      const backs = e.backs && e.backs.length
        ? e.backs.map(chip).join("")
        : `<span class="culto-back vaga">A definir</span>`;
      const div = document.createElement("div");
      div.className = "culto-equipe";
      div.innerHTML = `<span class="culto-escala-label">Back</span><div class="culto-backs">${backs}</div>`;
      (linhaMin || col.querySelector(".culto-col-hd")).after(div);
    });
  }

  async function carregar() {
    const copia = typeof escCopiaLer === "function" ? escCopiaLer() : null;
    if (copia && Array.isArray(copia.lista)) {
      lista = copia.lista;
      pintar();
      if (Date.now() - (copia.em || 0) < FRESCA_MS) return;
    }
    try {
      lista = await escBuscar();
      if (typeof escCopiaGravar === "function") escCopiaGravar(lista);
      pintar();
    } catch (e) {
      console.warn("Escala no cartão do culto:", e);
    }
  }

  const original = renderCultos;
  renderCultos = function (...a) {
    const r = original.apply(this, a);
    pintar();
    return r;
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", carregar);
  else carregar();
})();
