// ============================================================
//  TOM LOUVORES — três páginas
//  Carregue por ÚLTIMO, depois de todos os outros scripts.
//
//  index.html      → só os louvores escalados nos cultos
//  repertorio.html → a lista completa, com busca e filtros
//  sugestoes.html  → sugestões de louvores (sugestoes.js)
//
//  Os arquivos compartilham o mesmo app.js. Cada página traz
//  escondidos os campos de que o app.js precisa mas que ela
//  não mostra, então nada aqui altera o app.js.
// ============================================================

const PAGINA = document.body.dataset.pagina || "cultos";

// ============================================================
//  ESTILO
// ============================================================

(function paginasEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /* ── abas Cultos / Repertório ──────────────────────────────
     As abas moram dentro do header, ao lado da logo, em qualquer
     tamanho de tela: aproveitam a faixa que estava vazia e o
     header fica com uma linha só. No celular, com as ações
     recolhidas no botão do menu, elas continuam ali — o que era
     uma segunda faixa de 46px volta para a cifra.

     No desktop ficam encostadas na logo, com um fio separando as
     duas coisas. No celular vão para o centro da tela, e o fio
     sai: ali ele viraria um risco solto.                        */
  .nav-pag{
    display:flex;align-items:stretch;gap:24px;flex-shrink:0;
    margin-left:28px;
    margin-right:auto;      /* encosta na logo e empurra o resto */
    padding-left:28px;
    border-left:1px solid var(--line);
    align-self:stretch;     /* o sublinhado cai na borda do header */
  }
  .nav-pag a{
    display:inline-flex;align-items:center;
    font-family:var(--font-ui);
    font-size:14px;font-weight:600;
    letter-spacing:1.6px;text-transform:uppercase;
    color:rgba(246,245,241,0.78);text-decoration:none;
    border-bottom:1px solid transparent;
    transition:color 0.15s,border-color 0.15s;
    white-space:nowrap;
  }
  .nav-pag a:hover{color:var(--white)}
  .nav-pag a[aria-current]{color:var(--gold);border-bottom-color:var(--gold)}

  /* quantas sugestões esperam análise (só com login), logo
     depois do nome da aba */
  .nav-conta{
    display:inline-block;margin-left:7px;
    min-width:16px;height:16px;padding:0 4px;border-radius:8px;
    background:var(--gold);color:var(--black);
    font-size:9.5px;font-weight:800;line-height:16px;
    letter-spacing:0;text-align:center;
    pointer-events:none;
  }
  /* No celular as abas ficam centradas na tela: o número vai
     para o canto da aba, fora do fluxo, para elas não mudarem de
     lugar quando ele aparece ou some. */
  @media(max-width:900px){
    .nav-pag a{position:relative}
    .nav-conta{position:absolute;top:calc(50% - 18px);right:-14px;margin-left:0}
  }

  /* Com três abas e a fileira de botões de quem está logado, o
     cabeçalho do computador apertava abaixo de 1366px: os botões
     quebravam em duas linhas e, abaixo de 1100px, saíam da tela.
     Nessa faixa as abas se aproximam um pouco, e o "Conectado"
     fica só com a bolinha verde (vermelha quando cai), como já
     acontece no celular: abaixo de 1280px para quem está logado,
     abaixo de 1025px para todo mundo. */
  @media(min-width:901px) and (max-width:1366px){
    .nav-pag{gap:18px;margin-left:20px;padding-left:20px}
  }
  /* com login a fileira de botões é longa (e o "Baixar cifras"
     ganha o contador "81/86"): o "Conectado" fica só com a bolinha
     em qualquer computador comum */
  @media(min-width:901px) and (max-width:1680px){
    body:not(.read-only) #statusTxt{display:none}
    body:not(.read-only) .status-pill{padding:7px 9px;gap:0}
  }
  /* nunca encostar as abas nos botões, e nenhum botão quebra em
     duas linhas ("Baixar cifras / (102/106)", "Nova / música") em
     nenhuma largura de computador */
  @media(min-width:901px){
    .header-right{margin-left:24px;flex-wrap:nowrap}
    .header-right > *{white-space:nowrap;flex-shrink:0}
  }
  /* até 1440px os botões ficam um pouco mais justos para caber */
  @media(min-width:1280px) and (max-width:1440px){
    .header-right{gap:8px}
    .header-right .btn-add{padding-left:16px;padding-right:16px}
    .header-right .btn-logout{padding-left:14px;padding-right:14px}
    .nav-pag{gap:18px}
  }
  /* Com login, a fileira de botões só cabe numa linha se o nome
     "Tom Louvores" sair do lado da logo até 1440px (fica o V). */
  @media(min-width:901px) and (max-width:1440px){
    body:not(.read-only) .logo-sub,
    body:not(.read-only) .logo-sep{display:none}
    body:not(.read-only) .nav-pag{border-left:none;padding-left:0}
  }
  /* Notebook pequeno: "Baixar cifras" e "Cifras" ficam só com o
     ícone (o nome aparece ao passar o mouse). Enquanto baixa, o
     contador continua visível. */
  @media(min-width:901px) and (max-width:1180px){
    body:not(.read-only) #adminLyraBtn .admin-lbl{display:none}
    body:not(.read-only) #lyraBaixar:not(.baixando) .lyra-dl-txt{display:none}
  }
  /* Em tela de notebook menor os botões quebravam em
     duas linhas ("Baixar cifras / (81/86)", "Nova / música"). Aqui
     eles ficam numa linha só e um pouco mais justos; abaixo de
     1150px o nome "Tom Louvores" sai e fica só o V da logo. */
  @media(min-width:901px) and (max-width:1279px){
    .header-right{gap:6px}
    .header-right > *{white-space:nowrap}
    .header-right .btn-add,
    .header-right .btn-logout,
    .header-right a,
    .header-right button{padding-left:10px;padding-right:10px;letter-spacing:0.04em}
    .nav-pag{gap:14px;margin-left:14px;padding-left:14px}
  }
  @media(min-width:901px) and (max-width:1150px){
    body:not(.read-only) .logo-sub,
    body:not(.read-only) .logo-sep{display:none}
    body:not(.read-only) .nav-pag{border-left:none;padding-left:0}
  }
  @media(min-width:901px) and (max-width:1024px){
    .nav-pag{gap:14px;margin-left:14px;padding-left:14px}
    .nav-pag a{font-size:11px;letter-spacing:0.07em}
    #statusTxt{display:none}
    .status-pill{padding:7px 9px;gap:0}
  }

  /* a busca gruda logo abaixo do header, seja qual for a altura
     dele. O valor é medido no navegador (ajustarHeader). */
  .toolbar{top:var(--header-alt, 64px)}

  /* Cada camada fixa pinta uma faixa preta acima de si. Sem isso,
     qualquer diferença de um pixel entre a base do header e o topo
     da busca vira uma fresta por onde o texto passa rolando. */
  .header{background:var(--veu)}
  /* a faixa da busca vai de ponta a ponta da tela, atrás do conteúdo */
  .toolbar,.search-row{background:transparent}
  .toolbar::before,.search-row::before{
    content:"";position:absolute;z-index:-1;
    left:calc(50% - 50vw);right:calc(50% - 50vw);
    top:-26px;bottom:0;
    background:var(--veu);
    -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
    pointer-events:none;
  }

  @media(max-width:768px){
    /* abaixo daqui a .toolbar vira display:contents e quem gruda
       é a .search-row — a faixa acompanha.
       O número aqui é só a reserva até o JS medir de verdade;
       com o header em uma linha ele é a altura dela. */
    .search-row{top:var(--header-alt, 64px)}
  }
  @media(max-width:480px){
    .search-row{top:var(--header-alt, 56px)}
  }

  /*  Uma linha só, sem quebra, e as abas no centro da TELA.
      Centrar no espaço livre não serve aqui: a logo é larga, o
      botão do menu tem 40px, e o meio do vão cai bem à direita
      do meio da tela — as abas acabavam encostando no botão.
      Fora do fluxo elas também deixam de empurrar os dois. */
  @media(max-width:900px){
    .header-inner{flex-wrap:nowrap;gap:12px;position:relative}
    .nav-pag{
      position:absolute;left:50%;transform:translateX(-50%);
      top:0;bottom:0;              /* altura inteira: o sublinhado
                                      encosta na borda de baixo */
      margin:0;padding-left:0;
      border-left:none;
      gap:22px;
    }
    .nav-pag a{
      font-size:11px;letter-spacing:0.08em;
      border-bottom-width:3px;
    }
  }

  @media(max-width:600px){
    .nav-pag{gap:18px}
    .nav-pag a{font-size:10.5px;letter-spacing:0.06em}
  }

  /* Abaixo de 440px a logo e as ações começavam a não caber juntas
     e as ações caíam para uma linha só delas, empurrando tudo.
     Encolhendo os espaçamentos elas voltam para a mesma linha. */
  @media(max-width:440px){
    .header-inner{gap:10px;padding-left:14px;padding-right:14px}
    .header-right{gap:6px;flex-wrap:nowrap}
    .logo{gap:8px;min-width:0}
    .logo-sep{display:none}
    .logo-sub{font-size:8.5px;letter-spacing:0.08em}
    .btn-add{padding:8px 10px;font-size:11px;letter-spacing:0.01em}
    .btn-logout{padding:8px 9px;font-size:11px;letter-spacing:0.01em}
    .lyra-dl{padding:8px 9px}
    /* com tão pouca largura, as abas cedem o espaçamento primeiro */
    .nav-pag{gap:14px}
    .nav-pag a{font-size:10px;letter-spacing:0.04em}
  }

  /* Com a terceira aba (Sugestões), as abas e o nome "Tom
     Louvores" deixam de caber juntos abaixo de 420px: o nome
     encostava no "Cultos". Dali para baixo fica só o V da logo,
     e as três abas continuam à vista. */
  @media(max-width:419px){
    .logo-sub{display:none}
  }

  /* Abaixo de 350px nem o rótulo cabe: fica só o "+", que já é
     o símbolo entendido de adicionar. */
  @media(max-width:350px){
    .nav-conta{right:-10px}
    .btn-lbl{display:none}
    .btn-add{padding:8px 13px;font-size:15px;line-height:1}
    .nav-pag{gap:11px}
    .nav-pag a{font-size:9.5px;letter-spacing:0.02em}
  }

  /* Seção vazia não aparece para quem só visualiza. Com login o
     bloco continua visível, senão não haveria onde clicar em
     "+ Adicionar". O :has olha se sobrou a mensagem de vazio. */
  body.read-only .culto-secao:has(.culto-empty){display:none}

  /* ── louvores do culto: aproveitar a largura ───────────────
     Com um culto por vez na tela, cada louvor ocupava uma linha
     inteira e sobrava metade da tela vazia. Acima de 820px eles
     passam a se distribuir em colunas.                         */
  @media(min-width:820px){
    .culto-col-bd,
    .culto-secao-bd{
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
      gap:8px;align-content:start;
    }
    .culto-empty{grid-column:1/-1}
  }`;
  document.head.appendChild(st);
})();

// ============================================================
//  NAVEGAÇÃO
// ============================================================

function navMontar() {
  const barra = document.querySelector(".header-inner");
  if (!barra || document.querySelector(".nav-pag")) return;

  const nav = document.createElement("nav");
  nav.className = "nav-pag";
  nav.setAttribute("aria-label", "Seções");
  nav.innerHTML = `
    <a href="./"${PAGINA === "cultos" ? ' aria-current="page"' : ""}>Cultos</a>
    <a href="repertorio.html"${PAGINA === "repertorio" ? ' aria-current="page"' : ""}>Repertório</a>
    <a href="sugestoes.html" id="navSugestoes"${PAGINA === "sugestoes" ? ' aria-current="page"' : ""}>Sugestões</a>`;

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