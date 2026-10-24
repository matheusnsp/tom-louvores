// ============================================================
//  TOM LOUVORES — três páginas
//  Carregue por ÚLTIMO, depois de todos os outros scripts.
//
//  index.html      → só os louvores escalados nos cultos
//  repertorio.html → a lista completa, com busca e filtros
//  sugestoes.html  → sugestões de louvores (sugestoes.js)
//  escala.html     → ministrante e back da escala (escala.js)
//
//  Os arquivos compartilham o mesmo app.js. Cada página traz
//  escondidos os campos de que o app.js precisa mas que ela
//  não mostra, então nada aqui altera o app.js.
// ============================================================

const PAGINA = document.body.dataset.pagina || "cultos";

// ============================================================
//  ESTILO
// ============================================================

//  O estilo das abas e do header mora em css/header.css, carregado
//  no <head>. Antes era injetado aqui, no fim da página: a cada troca
//  de aba o header aparecia cru por um instante e depois "pulava".

// ============================================================
//  NAVEGAÇÃO
// ============================================================

function navMontar() {
  const barra = document.querySelector(".header-inner");
  if (!barra) return;

  //  As abas agora vêm prontas no HTML (aparecem junto com a página,
  //  sem pular). Aqui só ajusta o header e conta as sugestões.
  if (document.querySelector(".nav-pag")) {
    ajustarHeader();
    navContarSugestoes();
    return;
  }

  const nav = document.createElement("nav");
  nav.className = "nav-pag";
  nav.setAttribute("aria-label", "Seções");
  nav.innerHTML = `
    <a href="./"${PAGINA === "cultos" ? ' aria-current="page"' : ""}>Cultos</a>
    <a href="repertorio.html"${PAGINA === "repertorio" ? ' aria-current="page"' : ""}>Repertório</a>
    <a href="sugestoes.html" id="navSugestoes"${PAGINA === "sugestoes" ? ' aria-current="page"' : ""}>Sugestões</a>
    <a href="escala.html" class="nav-equipe"${PAGINA === "escala" ? ' aria-current="page"' : ""}>Escala</a>`;

  // entra logo depois da logo, e fica ali em qualquer largura
  const logo = barra.querySelector(".logo");
  logo ? logo.insertAdjacentElement("afterend", nav) : barra.appendChild(nav);

  ajustarHeader();
  // a primeira contagem pode ter vindo antes de a aba existir
  navContarSugestoes();
}

// ── sugestões esperando análise ─────────────────────────────
//  Para quem está logado, a aba mostra quantas sugestões estão
//  esperando, em qualquer página: é assim que a equipe fica
//  sabendo que chegou sugestão nova. Para quem só visualiza,
//  nada (nem a busca no banco acontece).
//
//  Se a tabela ainda não existir no Supabase, a busca falha e a
//  aba fica sem número — o resto do site nem percebe.

let navContagemPedido = 0;

async function navContarSugestoes() {
  const aba = document.getElementById("navSugestoes");
  if (!aba) return;
  // na própria página de sugestões quem conta é o sugestoes.js,
  // que já tem a lista inteira na mão
  if (PAGINA === "sugestoes") return;
  const logado = () => typeof isAdmin === "function" && isAdmin();
  const pedido = ++navContagemPedido;
  let n = 0;
  if (logado()) {
    try {
      const pendentes = await req("sugestoes?select=id&status=eq.pendente&limit=100");
      n = (pendentes || []).length;
    } catch { n = 0; }
  }
  // resposta de uma busca mais velha, ou a pessoa saiu enquanto
  // ela viajava: não mostra
  if (pedido !== navContagemPedido) return;
  navMostrarContagem(logado() ? n : 0);
}

function navMostrarContagem(n) {
  const aba = document.getElementById("navSugestoes");
  if (!aba) return;
  let bolha = aba.querySelector(".nav-conta");
  if (!n) { if (bolha) bolha.remove(); return; }
  if (!bolha) {
    bolha = document.createElement("span");
    bolha.className = "nav-conta";
    aba.appendChild(bolha);
  }
  bolha.textContent = n > 99 ? "99+" : String(n);
  bolha.setAttribute("aria-label", `${n} esperando análise`);
}

// entrou ou saiu: o número aparece ou some na hora
if (typeof aplicarEstadoAuth === "function") {
  const navAuthOriginal = aplicarEstadoAuth;
  aplicarEstadoAuth = function (...a) {
    const r = navAuthOriginal.apply(this, a);
    navContarSugestoes();
    return r;
  };
}

// ── altura real do header ───────────────────────────────────
//  O header muda de altura: cresce com o notch, encolhe nos
//  tamanhos menores. Em vez de repetir números pelo CSS, medimos
//  uma vez e guardamos em --header-alt, que a busca usa para
//  grudar no lugar certo logo abaixo.

function ajustarHeader() {
  const h = document.querySelector(".header");
  if (!h) return;
  document.documentElement.style.setProperty("--header-alt", h.offsetHeight + "px");

  // a lista recalcula onde os cabeçalhos de letra grudam
  if (typeof vistaAjustarTopo === "function") vistaAjustarTopo();
}

window.addEventListener("resize", ajustarHeader);
window.addEventListener("load", ajustarHeader);
if (window.visualViewport) window.visualViewport.addEventListener("resize", ajustarHeader);

// ============================================================
//  O QUE CADA PÁGINA FAZ
// ============================================================

if (PAGINA === "cultos") {
  //  O repertório inteiro continua sendo carregado — o app.js
  //  precisa dele para abrir a música com observações e cifras
  //  a partir de um louvor escalado — mas não faz sentido montar
  //  as 218 linhas numa seção escondida.
  render = function (lista) {
    if (typeof lyraListaVisivel !== "undefined") lyraListaVisivel = lista || [];
  };
}

if (PAGINA === "repertorio") {
  //  Nada de cultos nesta página: nem a busca no banco, nem o
  //  desenho. Uma requisição a menos no carregamento.
  //  (o app.js chama estas duas logo após carregar o repertório,
  //   e este arquivo roda antes disso acontecer)
  carregarCultos = async function () {};
  renderCultos   = function () {};
}

if (PAGINA === "sugestoes") {
  //  No lugar dos cultos, as sugestões. O app.js chama
  //  carregarCultos() na abertura, e o atualizar.js ao voltar para
  //  a aba, ao recuperar a conexão e de tempos em tempos — com o
  //  cuidado de não atualizar no meio de um formulário. As
  //  sugestões pegam carona nesse mesmo ciclo.
  carregarCultos = async function () {
    if (typeof sugCarregar === "function") await sugCarregar();
  };
  renderCultos = function () {};

  //  O repertório é carregado mesmo assim: é com ele que a página
  //  avisa "essa já está no repertório". Mas não há lista para
  //  montar — cada vez que ele chega (ou muda, depois de salvar
  //  uma música), quem redesenha são as sugestões.
  render = function (lista) {
    if (typeof lyraListaVisivel !== "undefined") lyraListaVisivel = lista || [];
    if (typeof sugRepertorioMudou === "function") sugRepertorioMudou();
  };
}

if (PAGINA === "escala") {
  //  No lugar dos cultos, a escala do Firebase, no mesmo ciclo de
  //  atualização. Nada de repertório para desenhar.
  carregarCultos = async function () {
    if (typeof escCarregar === "function") await escCarregar();
  };
  renderCultos = function () {};
  render = function (lista) {
    if (typeof lyraListaVisivel !== "undefined") lyraListaVisivel = lista || [];
  };
}

//  A contagem da aba Sugestões pega carona na busca dos cultos:
//  ela acontece na abertura e o atualizar.js repete ao voltar para
//  a aba, ao recuperar a conexão e de tempos em tempos.
if (PAGINA !== "sugestoes" && typeof carregarCultos === "function") {
  const navCultosOriginal = carregarCultos;
  carregarCultos = async function (...a) {
    const r = await navCultosOriginal.apply(this, a);
    navContarSugestoes();
    return r;
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", navMontar);
} else {
  navMontar();
}