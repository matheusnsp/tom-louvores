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
      background:var(--yellow);color:#0A0A0A;
      border:2px solid var(--black);border-radius:9px;
      font:800 10px/1 'Inter',sans-serif;font-variant-numeric:tabular-nums;
      pointer-events:none;
      animation:av-pula .35s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes av-pula{from{transform:scale(.3)}to{transform:none}}
    #mnChat.av-tem .mn-sub{color:var(--yellow);font-weight:600}

    /* balão: mesmo molde das linhas do MENU — ícone amarelo em
       quadrado, nome em maiúsculas, frase em cinza */
    .av-balao{
      position:fixed;z-index:9600;
      top:calc(12px + env(safe-area-inset-top));left:50%;
      width:min(calc(100vw - 24px), 400px);
      display:flex;align-items:stretch;
      background:var(--black2);
      border:1px solid var(--black5);border-left:3px solid var(--yellow);
      border-radius:var(--r);
      box-shadow:0 18px 40px rgba(0,0,0,.55);
      transform:translate(-50%, calc(-100% - 30px));opacity:0;visibility:hidden;
      transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s,visibility 0s linear .3s;
    }
    .av-balao.on{
      transform:translate(-50%, 0);opacity:1;visibility:visible;
      transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s,visibility 0s;
    }
    .av-abrir{
      flex:1;min-width:0;
      display:grid;grid-template-columns:38px 1fr;align-items:center;
      column-gap:12px;row-gap:2px;
      padding:11px 6px 11px 12px;
      background:none;border:0;cursor:pointer;text-align:left;
      font-family:'Inter',sans-serif;
    }
    .av-ico{
      grid-column:1;grid-row:1 / span 2;
      width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(255,224,0,0.08);border:1px solid rgba(255,224,0,0.2);
      border-radius:var(--r);color:var(--yellow);
    }
    .av-nome,.av-txt{
      grid-column:2;min-width:0;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .av-nome{
      font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
      color:var(--white);line-height:1.2;
    }
    .av-txt{font-size:12.5px;color:var(--gray);line-height:1.4}
    .av-x{
      flex:0 0 42px;background:none;border:0;border-left:1px solid var(--black4);
      color:var(--gray);font-size:13px;cursor:pointer;
    }
    .av-x:hover{color:var(--white)}
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
      <button type="button" class="av-abrir">
        <span class="av-ico">${chatIco(18, 2.2)}</span>
        <span class="av-nome"></span>
        <span class="av-txt"></span>
      </button>
      <button type="button" class="av-x" aria-label="Fechar aviso">&#10005;</button>`;
    b.querySelector(".av-abrir").addEventListener("click", () => chatAbrir());
    b.querySelector(".av-x").addEventListener("click", avFecharBalao);
    document.body.appendChild(b);
    void b.offsetWidth; // primeira vez: deixa a entrada animar
  }
  const mais = avNaoLidas > 1 ? ` \u00b7 ${avNaoLidas} novas` : "";
  b.querySelector(".av-nome").textContent = avUltima.nome + mais;
  b.querySelector(".av-txt").textContent = avUltima.texto || "mandou uma mensagem";
  b.classList.add("on");
  clearTimeout(avTimer);
  avTimer = setTimeout(avFecharBalao, 6000);
}

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
    icon: "img/logo3.png",
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

// Pergunta uma vez só. Quem fechou o pedido sem responder não é
// incomodado de novo; dá para ligar depois no cadeado do navegador.
function avPedirPermissao() {
  const pode = "Notification" in window && Notification.permission === "default";
  if (pode === false) return;
  try {
    if (localStorage.getItem("av_pediu")) return;
    localStorage.setItem("av_pediu", "1");
  } catch (e) { /* modo privado: pergunta mesmo assim */ }
  const p = Notification.requestPermission();
  if (p && p.catch) p.catch(() => {});
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
