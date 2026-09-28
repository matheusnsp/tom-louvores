// ============================================================
//  TOM LOUVORES — chat da igreja, dentro do site
//  Carregue por último: depende do app.js, do lyra.js e do
//  menu.js.
//
//  O chat abre num painel por cima do site, sem aba nova. No
//  computador ele entra pela direita e o leitor de cifra chega
//  para o lado, com as setas à vista; no celular ele ocupa a
//  tela. O X devolve a pessoa exatamente onde estava, e depois
//  da primeira vez o chat fica carregado por trás: reabrir é
//  instantâneo.
//
//  O botão fica em três lugares, só para quem entrou como
//  admin: no leitor (entre as setas e o X), no cabeçalho (antes
//  do "Sair") e na gaveta do MENU (abaixo do "Editar cifras").
//  Sair fecha o painel e descarrega o chat.
//
//  O Lyra ficou de fora de propósito: ele mora em outro domínio,
//  e dentro do painel o login dele não segurava. Os atalhos do
//  Lyra abrem a página dele, como sempre abriram.
// ============================================================

const CHAT_URL = "https://chat.invbotafogo.com.br";

//  O mesmo balão em todo lugar. Muda só o tamanho e o traço,
//  para acompanhar os ícones vizinhos de cada um.
function chatIco(tam, traco) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${traco}" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
}

//  O "abrir fora" é o mesmo desenho do atalho do Lyra.
const PE_ICO_FORA = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>`;

(function peEstilo() {
  const st = document.createElement("style");
  st.textContent = `
    :root{--pe-larg:440px}

    #lyraChat,#chatCabecalho{text-decoration:none}
    #chatCabecalho{display:inline-flex;align-items:center;gap:7px}
    /*  Até 1100px o cabeçalho do admin já vem apertado: fica só
        o ícone. Abaixo de 900px quem esconde o botão inteiro é o
        menu.js, e aí vale a linha da gaveta. */
    @media (max-width:1100px){
      #chatCabecalho{padding:9px 11px}
      #chatCabecalho .chat-lbl{display:none}
    }

    /* ── painel ── */
    .pe-painel{
      position:fixed;top:0;right:0;bottom:0;z-index:9500;
      width:min(var(--pe-larg), 100vw);
      display:flex;flex-direction:column;
      background:var(--black);
      border-left:1px solid var(--black5);
      box-shadow:-18px 0 40px rgba(0,0,0,.5);
      padding-top:env(safe-area-inset-top);
      padding-bottom:env(safe-area-inset-bottom);
      transform:translateX(101%);visibility:hidden;
      transition:transform .3s cubic-bezier(.22,1,.36,1),visibility 0s linear .3s;
    }
    .pe-painel.on{
      transform:none;visibility:visible;
      transition:transform .3s cubic-bezier(.22,1,.36,1),visibility 0s;
    }
    .pe-hd{
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      flex:0 0 auto;padding:12px 14px;
      border-bottom:1px solid var(--black4);
    }
    .pe-hd h2{
      margin:0;font-family:'Bebas Neue',sans-serif;
      font-size:24px;letter-spacing:.06em;color:var(--white);line-height:1;
    }
    .pe-acoes{display:flex;align-items:center;gap:8px}
    .pe-acoes a,.pe-acoes button{
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      background:transparent;border:1px solid var(--black5);border-radius:4px;
      color:var(--gray);font-size:14px;cursor:pointer;text-decoration:none;
      transition:all .15s;
    }
    .pe-acoes a:hover,.pe-acoes button:hover{background:var(--black4);color:var(--white)}
    .pe-corpo{position:relative;flex:1;min-height:0}
    .pe-corpo iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    .pe-msg{
      position:absolute;inset:0;
      display:flex;align-items:center;justify-content:center;
      color:var(--gray);font-size:13px;font-weight:600;
    }

    /*  Tela larga: o leitor chega para o lado em vez de ficar por
        baixo do painel — as setas e o X continuam à mão. */
    #lyraOverlay{transition:padding-right .3s cubic-bezier(.22,1,.36,1)}
    @media (min-width:901px){
      body.painel-aberto #lyraOverlay{padding-right:var(--pe-larg)}
    }
    /*  Celular: o painel cobre tudo, então a página de trás não
        precisa rolar junto. */
    @media (max-width:600px){
      body.painel-aberto{overflow:hidden}
    }`;
  document.head.appendChild(st);
})();

// ── painel ──────────────────────────────────────────────────

function peAberto() {
  return !!document.getElementById("pePainel")?.classList.contains("on");
}

function peMontar() {
  let p = document.getElementById("pePainel");
  if (p) return p;
  p = document.createElement("div");
  p.id = "pePainel";
  p.className = "pe-painel";
  p.setAttribute("role", "dialog");
  p.setAttribute("aria-label", "Chat da igreja");
  p.innerHTML = `
    <div class="pe-hd">
      <h2>CHAT</h2>
      <div class="pe-acoes">
        <a href="${CHAT_URL}" target="_blank" rel="noopener"
           title="Abrir em outra aba" aria-label="Abrir em outra aba">${PE_ICO_FORA}</a>
        <button type="button" id="peFechar" aria-label="Fechar o chat">&#10005;</button>
      </div>
    </div>
    <div class="pe-corpo" id="peCorpo">
      <div class="pe-msg">Carregando o chat...</div>
    </div>`;
  document.body.appendChild(p);
  p.querySelector("#peFechar").addEventListener("click", peFechar);
  return p;
}

function chatAbrir() {
  if (typeof isAdmin !== "function" || !isAdmin()) return;
  if (typeof mnFechar === "function") mnFechar();

  const p = peMontar();
  const corpo = p.querySelector("#peCorpo");
  //  O chat só carrega na primeira abertura e depois fica vivo
  //  por trás: reabrir é instantâneo e a conversa volta onde
  //  parou.
  if (!corpo.querySelector("iframe")) {
    const f = document.createElement("iframe");
    f.src = CHAT_URL;
    f.title = "Chat da igreja";
    f.allow = "clipboard-write";
    corpo.appendChild(f);
  }
  p.classList.add("on");
  document.body.classList.add("painel-aberto");
  document.getElementById("lyraChat")?.classList.add("on");
}

function peFechar() {
  if (!peAberto()) return;
  document.getElementById("pePainel").classList.remove("on");
  document.body.classList.remove("painel-aberto");
  document.getElementById("lyraChat")?.classList.remove("on");
}

function chatAlternar() {
  if (peAberto()) peFechar();
  else chatAbrir();
}

//  Sem login o chat não fica nem aberto nem carregado por trás.
function chatDesligar() {
  peFechar();
  document.querySelector("#peCorpo iframe")?.remove();
}

//  Esc fecha o painel antes de tudo — senão fecharia o leitor
//  que está por baixo. A escuta fica na janela, que ouve antes do
//  documento, onde o lyra.js escuta.
window.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !peAberto()) return;
  e.stopPropagation();
  peFechar();
}, true);

// ── os botões ───────────────────────────────────────────────
//  São links de verdade: Cmd ou Ctrl + clique ainda abre o chat
//  em outra aba, para quem quiser. O clique normal usa o painel.

function chatLink(id, classe, titulo, html) {
  const a = document.createElement("a");
  a.id = id;
  a.className = classe;
  a.href = CHAT_URL;
  a.title = titulo;
  a.setAttribute("aria-label", titulo);
  a.innerHTML = html;
  a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    chatAlternar();
  });
  return a;
}

//  Cada função põe o seu se houver login e ele ainda não
//  existir, e tira se não houver login.

function chatNoLeitor(logado) {
  const atual = document.getElementById("lyraChat");
  if (!logado) { if (atual) atual.remove(); return; }
  const acoes = document.querySelector("#lyraOverlay .lyra-hd-acoes");
  if (atual || !acoes) return;
  const link = chatLink("lyraChat", "lyra-btn", "Abrir o chat", chatIco(17, 2));
  if (peAberto()) link.classList.add("on");
  acoes.insertBefore(link, document.getElementById("lyraFechar"));
}

function chatNoCabecalho(logado) {
  const atual = document.getElementById("chatCabecalho");
  if (!logado) { if (atual) atual.remove(); return; }
  const barra = document.querySelector(".header-right");
  if (atual || !barra) return;
  barra.insertBefore(
    chatLink("chatCabecalho", "btn-logout", "Abrir o chat da igreja",
             `${chatIco(14, 2.2)}<span class="chat-lbl">Chat</span>`),
    document.getElementById("btnLogout"));
}

function chatNoMenu(logado) {
  const atual = document.getElementById("mnChat");
  if (!logado) { if (atual) atual.remove(); return; }
  const vizinho = document.getElementById("mnAdmin");
  if (atual || !vizinho || typeof mnLinha !== "function") return;
  vizinho.after(mnLinha({
    ico: chatIco(18, 2.2), nome: "Chat",
    sub: "Chat interno da igreja", id: "mnChat",
    aoTocar: chatAbrir,
  }));
}

function chatSincronizar() {
  const logado = typeof isAdmin === "function" && isAdmin();
  chatNoLeitor(logado);
  chatNoCabecalho(logado);
  chatNoMenu(logado);
  if (!logado) chatDesligar();
}

// ── enxerto ─────────────────────────────────────────────────
//  Cada lugar do chat nasce numa hora: o cabeçalho e a gaveta
//  quando a página termina de carregar, o leitor na primeira
//  música aberta. E o login muda sempre pelo aplicarEstadoAuth.
//  Pendurado em todos, o chat acompanha qualquer caminho.

const chatMontarOriginal = lyraMontarEstrutura;
lyraMontarEstrutura = function (...a) {
  const r = chatMontarOriginal.apply(this, a);
  chatSincronizar();
  return r;
};

const chatAuthOriginal = aplicarEstadoAuth;
aplicarEstadoAuth = function (...a) {
  const r = chatAuthOriginal.apply(this, a);
  chatSincronizar();
  return r;
};

if (typeof mnMontar === "function") {
  const chatMnMontarOriginal = mnMontar;
  mnMontar = function (...a) {
    const r = chatMnMontarOriginal.apply(this, a);
    chatSincronizar();
    return r;
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", chatSincronizar);
} else {
  chatSincronizar();
}
