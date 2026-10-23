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
//  No editor, o "Voltar" (e o "Ir para o repertório" depois de
//  salvar) traz de volta para a cifra aberta, no mesmo tom.
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

  const VOLTAR = "tl_voltar_leitor_v1";
  const pagina = () => location.pathname.split("/").pop() || "index.html";

  function abrirEdicao() {
    const m = musicaAberta();
    if (!m || !logado()) return;
    //  para o "Voltar" do editor reabrir esta cifra, no mesmo tom
    try {
      sessionStorage.setItem(VOLTAR, JSON.stringify({
        pagina: pagina(),
        id: m.id,
        nome: m.nome,
        slug: (lyraAtual.song && lyraAtual.song.slug) || "",
        tom: lyraAtual.tom || "",
        modo: lyraAtual.modo || "cifra",
        em: Date.now(),
      }));
    } catch { /* sem armazenamento: volta para a lista, como antes */ }
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

  // ── de volta do editor: reabre a cifra ──
  //  Vale só na página de onde o lápis foi tocado e por 2 horas;
  //  usado uma vez. Espera o repertório e o índice de cifras chegarem.
  async function reabrir() {
    let v = null;
    try { v = JSON.parse(sessionStorage.getItem(VOLTAR) || "null"); } catch { v = null; }
    if (!v || v.pagina !== pagina() || Date.now() - v.em > 2 * 3600e3) return;
    try { sessionStorage.removeItem(VOLTAR); } catch { /* ok */ }

    const limite = Date.now() + 15000;
    const pronto = () => typeof musicas !== "undefined" && musicas.length &&
      typeof lyraIndice !== "undefined" && lyraIndice;
    while (!pronto() && Date.now() < limite) {
      if (typeof lyraCarregarIndice === "function") { try { await lyraCarregarIndice(); } catch { /* sem rede */ } }
      await new Promise(r => setTimeout(r, 300));
    }
    if (!pronto()) return;

    const m = musicas.find(x => x && x.id == v.id) || musicas.find(x => x && norm(x.nome) === norm(v.nome));
    let song = null;
    lyraIndice.forEach(s => { if (!song && s && v.slug && s.slug === v.slug) song = s; });
    if (!song && m) song = lyraNoIndice(m.nome);
    if (!song) return;
    let nav = null;
    try { nav = m && typeof lyraMontarNav === "function" ? lyraMontarNav(m, null) : null; } catch { nav = null; }
    lyraAbrirLeitor(song, v.tom, [], nav, v.modo === "letra" ? "letra" : "cifra");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(reabrir, 0));
  else setTimeout(reabrir, 0);

  const embrulhar = nome => {
    if (typeof window[nome] !== "function") return;
    const anterior = window[nome];
    window[nome] = function (...a) { const r = anterior.apply(this, a); atualizar(); return r; };
  };
  //  troca de música (abrir, setas), login e saída
  ["lyraAtualizarCabecalho", "chatSincronizar", "aplicarEstadoAuth"].forEach(embrulhar);
})();
