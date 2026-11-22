// ============================================================
// TOM LOUVORES — aviso de mensagem nova no chat
// Carregue DEPOIS do chat.js.
//
// O chat é outro site (chat.invbotafogo.com.br) dentro de um
// iframe, e daqui não dá para ver o que acontece lá dentro. Mas
// o NVB Chat guarda as mensagens num Firebase aberto para
// leitura — então o site escuta o mesmo banco por conta própria.
// Não depende do painel ter sido aberto, nem de mexer no chat.
//
// Quando chega mensagem:
//   · painel fechado → balão no topo com o nome e o começo do
//     texto (tocar abre o chat) e um número nos botões do chat
//   · app em segundo plano → notificação do sistema, se a pessoa
//     permitiu. O pedido sai na primeira vez que ela abre o chat:
//     é um toque dela (o navegador exige) e é quando faz sentido.
//   · painel aberto e na tela → nada: ela já está lendo
//
// Só para quem entrou como admin, igual ao chat.
//
// (Escrito sem ponto de exclamação de propósito: este arquivo foi
// criado colando um comando no terminal, onde ele é atalho do
// histórico. Por isso as negações aparecem como "=== false".)
// ============================================================

const AV_BANCO = "https://church-chat-dd8ea-default-rtdb.firebaseio.com";
const AV_SDK = "https://www.gstatic.com/firebasejs/10.12.2/"; // mesma versão do chat
const AV_FOLGA = 2 * 60 * 1000; // margem para o relógio deste aparelho

let avNaoLidas = 0;
let avUltima = null;     // { nome, texto } da mais recente
let avReavisar = false;  // chegou mensagem com o app fora da tela
let avParar = null;      // desliga a escuta que estiver ativa
let avLigando = false;
let avAgendado = false;
let avSdk = null;
let avTimer = null;
let avPintado = 0;
const avTitulo = document.title;

const avAdmin = () => typeof isAdmin === "function" && isAdmin() === true;
const avVisivel = () => document.visibilityState === "visible";

// ── estilo ──────────────────────────────────────────────────
(function avEstilo() {
  const st = document.createElement("style");
  st.textContent = `
    /* o número de não lidas, preso ao canto dos botões do chat */
    #chatCabecalho,#lyraChat{position:relative}
    .av-num{
      position:absolute;top:-7px;right:-7px;z-index:2;
      min-width:18px;height:18px;padding:0 5px;
      display:flex;align-items:center;justify-content:center;
      background:var(--gold);color:#0A0A0A;
      border:2px solid var(--black);border-radius:9px;
      font:800 10px/1 var(--font-ui);font-variant-numeric:tabular-nums;
      pointer-events:none;
      animation:av-pula .35s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes av-pula{from{transform:scale(.3)}to{transform:none}}
    #mnChat.av-tem .mn-sub{color:var(--gold);font-weight:600}

    /* balão: mesmo molde das linhas do MENU — ícone amarelo em
       quadrado, nome em maiúsculas, frase em cinza */
    .av-balao{
      position:fixed;z-index:9600;
      top:calc(12px + env(safe-area-inset-top));left:50%;
      width:min(calc(100vw - 24px), 400px);
      display:flex;align-items:stretch;
      background:var(--black2);
      border:1px solid var(--black5);border-left:3px solid var(--gold);
      border-radius:var(--r);
      box-shadow:0 18px 40px rgba(0,0,0,.55);
      transform:translate(-50%, calc(-100% - 30px));opacity:0;visibility:hidden;
      transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s,visibility 0s linear .3s;
    }
    .av-balao.on{
      transform:translate(-50%, 0);opacity:1;visibility:visible;
      transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s,visibility 0s;
    }
    /* Um <div> com papel de botão, e flex em vez de grade: no Safari
       do iPad o <button> em grade saía só com o ícone, sem o nome e
       sem o texto (o WebKit embrulha o conteúdo do botão numa caixa
       própria e a grade não chega nos filhos). */
    .av-abrir{
      flex:1;min-width:0;
      display:flex;align-items:center;gap:12px;
      padding:11px 6px 11px 12px;
      cursor:pointer;text-align:left;
      font-family:var(--font-ui,inherit);
      -webkit-tap-highlight-color:transparent;
    }
    .av-ico{
      flex:0 0 38px;width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(var(--gold-rgb,242,193,78),0.08);border:1px solid rgba(var(--gold-rgb,242,193,78),0.2);
      border-radius:var(--r,12px);color:var(--gold,#f2c14e);
    }
    .av-texto{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    .av-nome,.av-txt{
      display:block;min-width:0;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .av-nome{
      font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
      color:var(--white,#fff);line-height:1.2;
    }
    .av-txt{font-size:12.5px;color:var(--gray,#b8b8bc);line-height:1.4}
    .av-x{
      flex:0 0 42px;background:none;border:0;border-left:1px solid var(--black4);
      color:var(--gray);font-size:13px;cursor:pointer;
    }
    .av-x:hover{color:var(--white)}
    /* o sino no cabeçalho do painel do chat */
    #pePainel .pe-acoes .av-sino{color:var(--gold);border-color:rgba(var(--gold-rgb),0.45);background:rgba(var(--gold-rgb),0.08)}
    #pePainel .pe-acoes .av-sino.bloqueado{color:var(--gray);border-color:var(--black5);background:transparent;position:relative}
    #pePainel .pe-acoes .av-sino.bloqueado::after{content:"";position:absolute;left:7px;right:7px;top:50%;height:2px;background:currentColor;transform:rotate(-40deg)}
    /* iPad e telas de toque largas: balão maior, para ler de longe */
    @media (min-width: 740px) and (pointer: coarse){
      .av-balao{width:min(calc(100vw - 32px), 560px);top:calc(16px + env(safe-area-inset-top))}
      .av-abrir{gap:14px;padding:14px 8px 14px 16px}
      .av-ico{flex-basis:46px;width:46px;height:46px}
      .av-ico svg{width:22px;height:22px}
      .av-nome{font-size:15px !important}
      .av-txt{font-size:15px !important;line-height:1.4}
      .av-x{flex-basis:52px;font-size:16px}
    }
    @media (prefers-reduced-motion: reduce){
      .av-balao{transition:opacity .2s,visibility 0s linear .2s}
      .av-balao.on{transition:opacity .2s,visibility 0s}
      .av-num{animation:none}
    }`;
  document.head.appendChild(st);
})();

// ── escuta ──────────────────────────────────────────────────
// As chaves que o push() do Firebase cria começam pela hora da
// mensagem, já acertada pelo relógio do servidor. Por isso a
// escuta vai pela chave, e não pelo campo ts: o ts vem do relógio
// de quem mandou, e um celular atrasado gravaria a mensagem "no
// passado", fora da escuta.
const AV_ALFABETO = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

function avChaveDoInstante(ms) {
  let chave = "";
  for (let i = 0; i < 8; i++) {
    chave = AV_ALFABETO[ms % 64] + chave;
    ms = Math.floor(ms / 64);
  }
  return chave;
}

// O Firebase só desce para admin, e depois que a página assentou:
// não disputa a rede com o repertório e as cifras.
function avCarregarSdk() {
  if (avSdk === null) {
    avSdk = Promise.all([
      import(AV_SDK + "firebase-app.js"),
      import(AV_SDK + "firebase-database.js"),
    ])
      .then(([app, banco]) => ({ ...app, ...banco }))
      .catch(e => { avSdk = null; throw e; }); // sem rede: tenta de novo depois
  }
  return avSdk;
}

async function avLigar() {
  if (avParar || avLigando || avAdmin() === false) return;
  avLigando = true;
  try {
    const fb = await avCarregarSdk();
    if (avAdmin() === false) return; // saiu do login enquanto baixava

    const app = fb.getApps().find(a => a.name === "aviso-chat")
      || fb.initializeApp({ databaseURL: AV_BANCO }, "aviso-chat");
    const banco = fb.getDatabase(app);
    fb.goOnline(banco);

    // Só a última mensagem fica na escuta, a partir de agora. O
    // chat guarda anexo dentro da própria mensagem (foto de vários
    // MB): escutar o dia inteiro pesaria na rede e na memória do
    // celular.
    const q = fb.query(
      fb.ref(banco, "messages"),
      fb.orderByKey(),
      fb.startAt(avChaveDoInstante(Date.now() - AV_FOLGA)),
      fb.limitToLast(1),
    );

    const vistas = new Set();
    let primeira = true;
    const desligar = fb.onValue(q, snap => {
      const novas = [];
      snap.forEach(f => {
        if (vistas.has(f.key)) return;
        vistas.add(f.key);
        if (primeira === false) novas.push(f.val());
      });
      primeira = false; // o que já estava lá ao abrir não é novidade
      novas.forEach(m => avChegou(m));
    }, e => console.warn("Aviso do chat: sem acesso ao banco.", e));

    avParar = () => {
      desligar();
      fb.goOffline(banco);
      avParar = null;
    };
  } catch (e) {
    console.warn("Aviso do chat indisponível:", e);
  } finally {
    avLigando = false;
  }
}

function avDesligar() {
  if (avParar) avParar();
  avNaoLidas = 0;
  avUltima = null;
  avReavisar = false;
  avFecharBalao();
}

function avAgendarLigar() {
  if (avParar || avLigando || avAgendado) return;
  avAgendado = true;
  const ocioso = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
  ocioso(() => { avAgendado = false; avLigar(); }, { timeout: 4000 });
}

// ── chegada ─────────────────────────────────────────────────
function avChegou(m) {
  if (m == null || avAdmin() === false) return;
  if (m.deleted || m.status === "deleted") return; // apagada não é novidade

  const nome = String(m.name || "").trim() || "Alguém";
  let texto = String(m.text || "").replace(/\s+/g, " ").trim();
  if (texto === "" && m.file) {
    texto = String(m.file.type || "").startsWith("image/")
      ? "\u{1F4F7} Foto"
      : "\u{1F4CE} " + (m.file.name || "Arquivo");
  }
  if (texto.length > 140) texto = texto.slice(0, 139) + "\u2026";

  const visivel = avVisivel();
  if (visivel && peAberto()) return; // a conversa já está na tela

  avNaoLidas++;
  avUltima = { nome, texto };
  avPintar();

  if (visivel) {
    avMostrarBalao();
  } else {
    avReavisar = true;
    avNotificar();
  }
}

// ── contador ────────────────────────────────────────────────
// Nos três botões que abrem o chat. O do MENU entra porque, no
// celular, é o único que fica à vista no cabeçalho.
function avPintar() {
  const n = avNaoLidas;
  const rotulo = n > 9 ? "9+" : String(n);

  ["chatCabecalho", "lyraChat", "mnBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el === null) return;
    let num = el.querySelector(".av-num");
    if (n === 0) {
      if (num) num.remove();
      return;
    }
    if (num === null) {
      num = document.createElement("span");
      num.className = "av-num";
      el.appendChild(num);
    }
    num.textContent = rotulo;
  });

  const linha = document.getElementById("mnChat");
  if (linha) {
    linha.classList.toggle("av-tem", n > 0);
    const sub = linha.querySelector(".mn-sub");
    if (sub) {
      sub.textContent = n === 0 ? "Chat interno da igreja"
        : n === 1 ? "1 mensagem nova"
        : `${rotulo} mensagens novas`;
    }
  }

  // título da aba e ícone do app instalado: só quando o número muda
  if (n === avPintado) return;
  avPintado = n;
  document.title = n > 0 ? `(${rotulo}) ${avTitulo}` : avTitulo;
  if (n > 0) navigator.setAppBadge?.(n)?.catch(() => {});
  else navigator.clearAppBadge?.()?.catch(() => {});
}

// ── balão ───────────────────────────────────────────────────
function avMostrarBalao() {
  if (avUltima === null) return;
  let b = document.getElementById("avBalao");
  if (b === null) {
    b = document.createElement("div");
    b.id = "avBalao";
    b.className = "av-balao";
    b.setAttribute("role", "status");
    b.innerHTML = `
      <div class="av-abrir" role="button" tabindex="0" aria-label="Abrir o chat">
        <span class="av-ico">${chatIco(18, 2.2)}</span>
        <span class="av-texto">
          <span class="av-nome"></span>
          <span class="av-txt"></span>
        </span>
      </div>
      <button type="button" class="av-x" aria-label="Fechar aviso">&#10005;</button>`;
    const abrir = b.querySelector(".av-abrir");
    abrir.addEventListener("click", () => chatAbrir());
    abrir.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chatAbrir(); }
    });
    b.querySelector(".av-x").addEventListener("click", avFecharBalao);
    document.body.appendChild(b);
    void b.offsetWidth; // primeira vez: deixa a entrada animar
  }
  const mais = avNaoLidas > 1 ? ` \u00b7 ${avNaoLidas} novas` : "";
  const nomeEl = b.querySelector(".av-nome");
  const txtEl = b.querySelector(".av-txt");
  nomeEl.textContent = avUltima.nome + mais;
  txtEl.textContent = avUltima.texto || "mandou uma mensagem";
  //  O essencial também em linha, para não depender da folha de
  //  estilo: num iPad o balão vinha só com o ícone e o X.
  for (const el of [nomeEl, txtEl]) {
    el.style.display = "block"; el.style.visibility = "visible"; el.style.opacity = "1";
  }
  nomeEl.style.color = "#fff";
  txtEl.style.color = "#b8b8bc";
  b.classList.add("on");
  clearTimeout(avTimer);
  avTimer = setTimeout(avFecharBalao, 6000);
  requestAnimationFrame(() => avConferirBalao(b));
}

//  Confere se o nome e o texto saíram mesmo na tela. Se não, grava
//  o motivo (av_diag), mostra a mensagem no banner comum do site e,
//  uma vez por versão, o diagnóstico, para mandar para quem cuida
//  do site. (Num iPad o balão vinha vazio e daqui não dá para ver.)
function avConferirBalao(b) {
  try {
    const n = b.querySelector(".av-nome");
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    const caixa = b.querySelector(".av-abrir").getBoundingClientRect();
    const prob = [];
    if (!n.textContent) prob.push("texto vazio");
    if (r.width < 2 || r.height < 2) prob.push(`caixa ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (cs.display === "none") prob.push("display none");
    if (cs.visibility !== "visible") prob.push("visibility " + cs.visibility);
    if (parseFloat(cs.opacity) < 0.5) prob.push("opacity " + cs.opacity);
    if (parseFloat(cs.fontSize) < 6) prob.push("fonte " + cs.fontSize);
    if (r.left >= caixa.right - 1 || r.top >= caixa.bottom - 1) prob.push("fora da caixa");
    if (cs.color === getComputedStyle(b).backgroundColor) prob.push("cor do fundo");
    if (prob.length === 0) return;
    const diag = prob.join(", ") + " | " + [cs.display, cs.visibility, cs.opacity, cs.fontSize, cs.color,
      String(cs.fontFamily).slice(0, 24), Math.round(caixa.width) + "x" + Math.round(caixa.height),
      innerWidth + "x" + innerHeight].join(" ");
    try { localStorage.setItem("av_diag", diag); } catch (e) { /* sem armazenamento */ }
    if (typeof toast !== "function") return;
    toast(`${avUltima.nome}: ${avUltima.texto || "mandou uma mensagem"}`);
    let mostrou = "";
    try { mostrou = localStorage.getItem("av_diag_mostrado") || ""; } catch (e) { /* ok */ }
    if (mostrou !== AV_VERSAO) {
      try { localStorage.setItem("av_diag_mostrado", AV_VERSAO); } catch (e) { /* ok */ }
      setTimeout(() => toast("Aviso do chat, diagnóstico: " + diag, true), 3500);
    }
  } catch (e) { /* diagnóstico nunca pode quebrar o aviso */ }
}
const AV_VERSAO = "162";

function avFecharBalao() {
  clearTimeout(avTimer);
  const b = document.getElementById("avBalao");
  if (b) b.classList.remove("on");
}

// ── notificação do sistema ──────────────────────────────────
async function avNotificar() {
  const permitido = "Notification" in window && Notification.permission === "granted";
  if (permitido === false || avUltima === null) return;

  const nome = avUltima.nome.toLocaleUpperCase("pt-BR");
  const varias = avNaoLidas > 1;
  const titulo = varias ? `${avNaoLidas} mensagens novas no chat` : nome;
  const opcoes = {
    body: varias ? `${nome}: ${avUltima.texto}` : (avUltima.texto || "Mensagem nova no chat"),
    icon: "img/icone-192.png",
    tag: "tl-chat",   // uma só na gaveta, atualizada a cada mensagem...
    renotify: true,   // ...mas avisando de novo a cada uma
    lang: "pt-BR",
    data: { abrirChat: true },
  };

  // No Android só funciona pelo service worker; no computador,
  // qualquer um dos dois serve.
  try {
    const reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      await reg.showNotification(titulo, opcoes);
      return;
    }
  } catch (e) { /* tenta o outro jeito */ }
  try { new Notification(titulo, opcoes); } catch (e) { /* sem suporte */ }
}

// Pergunta ao abrir o chat enquanto a resposta for "ainda não"
// (fechou o pedido sem responder), no máximo uma vez por dia.
// Antes era uma vez na vida: quem fechou o primeiro pedido nunca
// mais era perguntado e ficava sem aviso sem saber por quê. Quem
// bloqueou de vez não é incomodado: o sino no painel explica.
const AV_PEDIR_DE_NOVO_MS = 24 * 60 * 60 * 1000;
function avPedirPermissao(forcar = false) {
  const pode = "Notification" in window && Notification.permission === "default";
  if (pode === false) return Promise.resolve(false);
  if (forcar === false) {
    try {
      const em = Number(localStorage.getItem("av_pediu_em") || 0);
      if (Date.now() - em < AV_PEDIR_DE_NOVO_MS) return Promise.resolve(false);
    } catch (e) { /* modo privado: pergunta mesmo assim */ }
  }
  try { localStorage.setItem("av_pediu_em", String(Date.now())); } catch (e) { /* sem armazenamento */ }
  let p;
  try { p = Notification.requestPermission(); } catch (e) { return Promise.resolve(false); }
  return Promise.resolve(p).then(r => { avSinoPintar(); return r === "granted"; }).catch(() => false);
}

// ── o sino no painel do chat ────────────────────────────────
// Enquanto o aparelho não estiver avisando, um sino apagado fica no
// cabeçalho do painel: tocar pede a permissão (é um toque da pessoa,
// como o navegador exige). Bloqueado de vez, explica onde liberar.
// Sem a API (Safari fora da tela de início) o sino não aparece.
const AV_ICO_SINO = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`;

function avSinoPintar() {
  const acoes = document.querySelector("#pePainel .pe-acoes");
  if (acoes === null) return;
  let b = document.getElementById("avSino");
  const tem = "Notification" in window;
  if (tem === false || Notification.permission === "granted") { if (b) b.remove(); return; }
  if (b === null) {
    b = document.createElement("button");
    b.type = "button";
    b.id = "avSino";
    b.className = "av-sino";
    b.innerHTML = AV_ICO_SINO;
    b.addEventListener("click", avSinoToque);
    acoes.insertBefore(b, acoes.firstChild);
  }
  const bloqueado = Notification.permission === "denied";
  b.classList.toggle("bloqueado", bloqueado);
  b.title = bloqueado ? "Avisos bloqueados neste aparelho" : "Ativar avisos de mensagem nova";
  b.setAttribute("aria-label", b.title);
}

async function avSinoToque() {
  if (Notification.permission === "denied") {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const como = ios
      ? "Ajustes do iPhone/iPad → Notificações → Tom Louvores → Permitir."
      : "Toque no cadeado ao lado do endereço → Notificações → Permitir.";
    if (typeof toast === "function") toast("Avisos bloqueados. " + como, true);
    return;
  }
  const ok = await avPedirPermissao(true);
  if (typeof toast === "function") {
    toast(ok ? "Avisos ligados: mensagem nova chega aqui ✓" : "Sem permissão: os avisos ficam só dentro do app.", ok === false);
  }
}

// ── enxerto no chat.js ──────────────────────────────────────
// Abrir o chat zera o contador. É também a hora de pedir a
// permissão de notificar.
const avAbrirOriginal = chatAbrir;
chatAbrir = function (...a) {
  const r = avAbrirOriginal.apply(this, a);
  if (peAberto()) {
    avNaoLidas = 0;
    avReavisar = false;
    avFecharBalao();
    avPintar();
    avSinoPintar();
    avPedirPermissao();
  }
  return r;
};

// Login, logout e botões recriados (o do leitor nasce na primeira
// música aberta) passam todos pelo chatSincronizar.
const avSincOriginal = chatSincronizar;
chatSincronizar = function (...a) {
  const r = avSincOriginal.apply(this, a);
  avSincronizar();
  return r;
};

function avSincronizar() {
  if (avAdmin()) avAgendarLigar();
  else avDesligar();
  avPintar();
}

// ── eventos ─────────────────────────────────────────────────
// Ao voltar para o app: com o chat aberto, o que chegou já está à
// vista; com ele fechado, o balão mostra o que ficou para ler.
document.addEventListener("visibilitychange", () => {
  if (avVisivel() === false) return;
  avSinoPintar();   // pode ter liberado nos ajustes enquanto estava fora
  if (peAberto()) {
    avNaoLidas = 0;
    avPintar();
  } else if (avReavisar && avNaoLidas > 0) {
    avMostrarBalao();
  }
  avReavisar = false;
});

// Toque na notificação: o sw.js traz o app para a frente e pede
// para abrir o chat.
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data && e.data.acao === "abrir-chat") chatAbrir();
  });
}

// Sem rede na hora de baixar o Firebase: tenta quando ela voltar.
window.addEventListener("online", () => {
  if (avAdmin()) avAgendarLigar();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", avSincronizar);
} else {
  avSincronizar();
}
