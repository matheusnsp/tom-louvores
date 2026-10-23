// ============================================================
//  TOM LOUVORES — "Editar cifra" dentro do leitor
//  Carregue DEPOIS do app.js, do editor-navegacao.js, do lyra.js e
//  do chat.js.
//
//  Com a cifra aberta, quem entrou (admin) vê um lápis no topo do
//  leitor. Ele abre a página de edição do próprio Tom Louvores
//  (cifras-editor.html) já com a música, os tons e os ministrantes,
//  do mesmo jeito que o lápis da lista do repertório. Música que só
//  tem cifra e não está no repertório não ganha o lápis.
// ============================================================
(() => {
  "use strict";

  const logado = () => typeof isAdmin === "function" && isAdmin() === true;
  const norm = s => (typeof normTexto === "function" ? normTexto(s || "") : String(s || "").toLowerCase().trim());

  //  No celular o topo do leitor já é apertado (o nome da música
  //  sumia): lá o lápis fica de fora; editar é coisa de iPad e
  //  computador.
  const st = document.createElement("style");
  st.textContent = "@media (max-width:600px){#lyraEditar{display:none!important}}";
  document.head.appendChild(st);

  const ICO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;

  //  A música do repertório que está aberta no leitor.
  function musicaAberta() {
    if (typeof lyraAtual === "undefined" || !lyraAtual || typeof musicas === "undefined") return null;
    const nome = lyraAtual.nome || (lyraAtual.song && lyraAtual.song.title) || "";
    const slug = lyraAtual.song && lyraAtual.song.slug;
    return musicas.find(m => m && norm(m.nome) === norm(nome)) ||
      (slug && typeof lyraNoIndice === "function"
        ? musicas.find(m => m && lyraNoIndice(m.nome)?.slug === slug) : null) ||
      null;
  }

  function abrirEdicao() {
    const m = musicaAberta();
    if (!m || !logado()) return;
    if (typeof window.tlAbrirEditor === "function") window.tlAbrirEditor(m);
    else if (typeof abrirModal === "function") abrirModal(m);
  }

  function atualizar() {
    let b = document.getElementById("lyraEditar");
    const acoes = document.querySelector("#lyraOverlay .lyra-hd-acoes");
    const m = logado() ? musicaAberta() : null;
    if (!m || !acoes) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.id = "lyraEditar";
      b.className = "lyra-btn";
      b.title = "Editar esta cifra";
      b.setAttribute("aria-label", "Editar esta cifra");
      b.innerHTML = ICO;
      b.style.display = "flex";
      b.style.alignItems = "center";
      b.style.justifyContent = "center";
      b.addEventListener("click", abrirEdicao);
    }
    //  fica antes do raio e do chat, perto das setas
    const vizinho = document.getElementById("lyraMsgs") || document.getElementById("lyraChat") ||
      document.getElementById("lyraTelaBtn") || document.getElementById("lyraFechar");
    if (b.nextElementSibling !== vizinho || b.parentElement !== acoes) acoes.insertBefore(b, vizinho);
  }

  const embrulhar = nome => {
    if (typeof window[nome] !== "function") return;
    const anterior = window[nome];
    window[nome] = function (...a) { const r = anterior.apply(this, a); atualizar(); return r; };
  };
  //  troca de música (abrir, setas), login e saída
  ["lyraAtualizarCabecalho", "chatSincronizar", "aplicarEstadoAuth"].forEach(embrulhar);
})();
