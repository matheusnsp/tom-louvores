// ============================================================
//  TOM LOUVORES — acompanhar a tela do ministrante
//  Carregue DEPOIS do lyra.js e do opcoes.js.
//
//  Quem está logado transmite a própria tela: música, tom, cifra
//  ou letra e a posição da rolagem. Quem não está pode escolher
//  acompanhar — e a tela dele anda junto.
//
//  Como funciona:
//    · usa o Realtime do Supabase, no modo broadcast: as mensagens
//      passam entre os aparelhos e não gravam nada em tabela
//    · a biblioteca é carregada só quando alguém liga a função,
//      para não pesar em quem abre o app offline
//
//  A posição vai como LINHA DA CIFRA, nunca em pixels nem em
//  fração da altura. Cada aparelho tem seu tamanho de letra, sua
//  quebra de linha e sua tela. Pixel cai em verso diferente, e a
//  fração também: no celular a quebra corta as linhas longas em
//  duas ou três, no computador não, e a metade da altura deixa de
//  ser o mesmo verso — era por isso que as telas não ficavam
//  iguais. "Linha 23 e 40% dela" é o mesmo verso em qualquer tela,
//  em uma coluna ou em páginas.
//
//  ── as três coisas que tiram o atraso ──
//
//  1. VELOCIDADE, não só posição. Mandar só a posição, algumas
//     vezes por segundo, faz a tela de quem segue pular de degrau
//     em degrau. Com a velocidade, ela anda sozinha entre as
//     mensagens e cada mensagem só corrige o rumo.
//
//  2. A velocidade entra na POSIÇÃO de quem segue, não só no alvo.
//     Cada quadro avança "vel × tempo do quadro" e mais um pedaço
//     do erro. Só puxar para o alvo deixava um atraso fixo: uma
//     interpolação nunca alcança um alvo em movimento, ela fica
//     sempre uns pixels atrás. Somando a velocidade, o atraso em
//     regime vai a zero e o puxão fica só para o desvio.
//
//  3. A LATÊNCIA é medida, não adivinhada. A mensagem gastou o
//     caminho de ida antes de chegar aqui, então a posição que
//     chegou já é passado. Um ida-e-volta de tempo em tempo diz
//     quanto somar.
//
//  Quem desenha é o aparelho de quem assiste, quadro a quadro; a
//  rede só diz para onde ir. É o mesmo princípio de jogo em rede.
//
//  Nada disso é ligado por conta própria. Transmitir sem saber, ou
//  ter a tela puxada no meio de um louvor, é pior que não ter a
//  função — as duas pontas escolhem, e a escolha é lembrada.
// ============================================================

const SN_SALA   = "tom-louvores-leitor";
const SN_ENVIOS = 80;       // no mínimo 80ms entre mensagens (~12/s)
const SN_PULSO  = 3000;     // um retrato completo a cada 3s
const SN_MINIMO = 0.02;     // menos que isso de linha não vira mensagem
//  Estes quatro são ajustáveis em tempo real pelo console, com
//  snAjuste() — ver o fim do arquivo. É o jeito de achar o ponto
//  sem recarregar nada.
let SN_COLA   = 0.28;     // quanto do erro é corrigido por quadro
let SN_PULO   = 12;       // erro maior que isso (linhas): vai direto, sem deslizar
const SN_ECO  = 5000;     // mede a latência a cada 5s
const SN_TETO = 400;      // latência acima disso não é compensada

//  ── o atraso de propósito ──
//  Prever o futuro dá certo enquanto a velocidade é constante. No
//  fim de um arrastão o líder desacelera, o seguidor continua na
//  velocidade antiga, passa do ponto, e a mensagem seguinte o traz
//  de volta: é esse vai-e-volta que aparece como tela pulando.
//
//  Render atrasado resolve. Com as mensagens saindo a cada 100ms,
//  260ms de atraso garantem que a posição a desenhar esteja SEMPRE
//  entre duas mensagens já recebidas — a tela interpola entre dois
//  pontos conhecidos e nunca precisa adivinhar. Foi por isso que
//  120ms ainda deixava glitch: bastava uma mensagem atrasar um
//  tico e voltávamos a inventar.
//
//  O preço é ver a tela do ministrante um quarto de segundo atrás.
//  Para acompanhar cifra isso não se nota; o olho está na próxima
//  linha, não no pixel.
let SN_ATRASO  = 260;

//  ── o colchão de amostras (versão nova) ──
//  Cada mensagem agora leva a HORA EM QUE O LÍDER ESTAVA ALI (ts).
//  Quem segue guarda as últimas posições e desenha o que o líder
//  fazia SN_COLCHAO ms atrás, interpolando entre duas amostras que
//  já chegaram. Não importa se a rede entregou as mensagens em
//  rajada, atrasadas ou com intervalos tortos: a hora vem dentro
//  delas, então o desenho sai liso. Era a rede instável (Wi-Fi da
//  igreja) que fazia a tela do tablet engasgar e ir-e-voltar.
//
//  Os relógios dos dois aparelhos não batem, e não precisam: a
//  diferença entre a hora de chegada e a hora de envio, no menor
//  valor dos últimos segundos, já embute o relógio e a rede mais
//  rápida. É o mesmo truque do "jitter buffer" de chamada de voz.
let SN_COLCHAO = 160;
let snColchaoAuto = true;   // snAjuste({ colchao: n }) fixa um valor
let SN_ADIANTE = 200;     // nunca adivinhar mais que isso à frente

//  Quem está logado lidera. É o mesmo portão que solta o "Nova
//  música" e o "Sair": uma regra só, no lugar onde ela já existe.
const snEhLider = () => !document.body.classList.contains("read-only");

//  Identifica este aparelho, só para reconhecer o próprio eco no
//  meio dos ecos dos outros.
const SN_EU = Math.random().toString(36).slice(2, 10);

let snCliente = null;
let snCanal   = null;
let snLigado  = false;      // a pessoa ligou a função
let snPronto  = false;      // o canal está de pé
let snSolto   = false;      // o seguidor rolou com o dedo e se soltou
let snIgnorar = false;      // rolagem que nós mesmos causamos
let snVisto   = 0;          // quando chegou a última mensagem

let snPulso   = null;
let snParada  = null;       // avisa que a rolagem parou
let snRelogio = null;       // mede a latência de tempo em tempo

// líder: últimas medições, para calcular a velocidade
let snUltEnvio = 0;
let snUltPos   = null;
let snUltT     = 0;
let snVel      = 0;         // linhas por milissegundo

// seguidor: para onde ir, desde quando, e quanto a rede atrasa
let snAlvo     = null;      // { pos, vel, em }
let snQuadro   = null;      // requestAnimationFrame em curso
let snUltFrame = 0;         // instante do quadro anterior
let snMax      = 0;         // altura rolável, medida de vez em quando
let snTopos    = null;      // topo (px) de cada linha da cifra original
let snFundo    = 0;         // onde termina a última linha (px)
let snPre      = null;      // o <pre> medido — se trocar, remede
let snLatencia = 0;         // metade do ida-e-volta, em ms
let snEcoEm    = 0;
let snNav      = null;      // fila de louvores que o líder mandou
let snAmostras = [];        // [{ ts, pos, vel }] em ordem, hora do líder
let snDifs     = [];        // [[chegada, chegada - ts]] dos últimos segundos
let snDifMin   = null;      // menor diferença: relógio + rede mais rápida

//  Hora absoluta com fração de milissegundo, comparável entre abas
//  e aparelhos (o relógio de parede, não o da página).
const snAgoraAbs = () => performance.timeOrigin + performance.now();

const SN_CHAVE = "tl_seguir_tela";
try { snLigado = localStorage.getItem(SN_CHAVE) === "1"; } catch (e) {}

// ── estilo ──────────────────────────────────────────────────
(function snEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /*  Pastilha no topo do leitor. Quem transmite precisa saber que
      está transmitindo, e quem segue precisa de um jeito óbvio de
      se soltar — sem isso a função vira tela possuída. */
  .sn-selo{
    position:absolute;left:50%;transform:translateX(-50%);
    top:calc(6px + env(safe-area-inset-top));z-index:80;
    display:none;align-items:center;gap:7px;
    background:rgba(28,28,28,.94);
    border:1px solid var(--gray3);
    border-radius:999px;
    padding:6px 7px 6px 13px;
    box-shadow:0 8px 24px rgba(0,0,0,.45);
    backdrop-filter:blur(8px);
    font-family:var(--font-ui);
    font-size:10px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;
    color:var(--gray);
    white-space:nowrap;
  }
  .sn-selo.on{display:flex}
  .claro .sn-selo{background:rgba(250,247,242,.95);border-color:rgba(0,0,0,.14)}

  .sn-ponto{
    width:7px;height:7px;border-radius:50%;flex-shrink:0;
    background:#4ADE80;
    animation:snPisca 2s ease infinite;
  }
  @keyframes snPisca{0%,100%{opacity:1}50%{opacity:.25}}
  .sn-selo.sn-parado .sn-ponto{background:var(--gray2);animation:none}

  .sn-selo button{
    background:var(--black5);border:1px solid var(--gray3);
    border-radius:999px;color:#e8e8e8;cursor:pointer;
    font-family:var(--font-ui);
    font-size:10px;font-weight:800;
    letter-spacing:.06em;text-transform:uppercase;
    padding:5px 11px;
  }
  .sn-selo button[hidden]{display:none}
  .claro .sn-selo button{background:#E4DFD8;border-color:rgba(0,0,0,.16);color:#242424}

  /*  Com dois botões, um deles tem de ser o principal. O Voltar
      fica sólido e o Desligar só com a borda: quem soltou a tela
      para ver um verso vai querer voltar, não sair. */
  .sn-selo .sn-acao2{background:transparent;color:var(--gray)}
  .claro .sn-selo .sn-acao2{background:transparent;color:#6b6b6b}

  /*  Numa tela estreita a pastilha com dois botões não pode
      estourar as bordas. */
  .sn-selo{max-width:calc(100vw - 20px)}

  /* o selo não briga com a barra flutuante nem com os painéis */
  #lyraBox:has(#opPainel.on) .sn-selo,
  #lyraBox:has(#opRapido.on) .sn-selo{display:none}`;
  document.head.appendChild(st);
})();

// ── conexão ─────────────────────────────────────────────────
//  A biblioteca do Supabase vem de fora e só é buscada aqui, no
//  primeiro uso. Quem nunca ligar a função não baixa nada, e o
//  app continua abrindo offline como antes.
async function snConectar() {
  if (snCanal) return true;
  if (typeof CONFIG === "undefined" || !CONFIG.SUPABASE_URL) return false;

  try {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    snCliente = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    snCanal = snCliente.channel(SN_SALA, {
      // não receber de volta o que eu mesmo mandei
      config: { broadcast: { self: false } },
    });

    snCanal.on("broadcast", { event: "tela" }, ({ payload }) => {
      //  O selo só é repintado quando muda de "aguardando" para
      //  "seguindo". Antes era repintado a cada mensagem, doze vezes
      //  por segundo, mexendo no DOM no meio da rolagem.
      const estava = snVisto && Date.now() - snVisto < 12000;
      snVisto = Date.now();
      if (!snEhLider() && snLigado) snReceber(payload);
      if (!estava) snPintarSelo();
    });

    //  O líder apertou um botão do mapa da música ("Refrão", "Riff 2"):
    //  quem acompanha vê o mesmo botão e o mesmo título marcados.
    snCanal.on("broadcast", { event: "marca" }, ({ payload }) => {
      if (!snEhLider() && snLigado && typeof lpMarcarRemoto === "function") lpMarcarRemoto(payload);
    });

    //  Quem acabou de ligar não espera o próximo movimento: pede o
    //  retrato de quem está transmitindo.
    snCanal.on("broadcast", { event: "pedir" }, () => {
      if (snEhLider() && snLigado) snEnviar(true);
    });

    //  Ida-e-volta para medir o atraso da rede. Quem lidera só
    //  devolve o que recebeu — a conta é feita de volta aqui.
    snCanal.on("broadcast", { event: "eco" }, ({ payload }) => {
      if (snEhLider() && snLigado) {
        snCanal.send({ type: "broadcast", event: "ecoVolta", payload });
      }
    });

    snCanal.on("broadcast", { event: "ecoVolta" }, ({ payload }) => {
      if (!payload || payload.de !== SN_EU) return;   // eco de outro aparelho
      const ida = (performance.now() - payload.t) / 2;
      //  Amaciado: uma medição ruim sozinha não deve deslocar a
      //  tela. E há um teto — compensar 2s de atraso faria a tela
      //  adivinhar demais e errar mais do que acerta.
      snLatencia = snLatencia
        ? Math.min(SN_TETO, snLatencia * 0.6 + ida * 0.4)
        : Math.min(SN_TETO, ida);
    });

    await snCanal.subscribe();
    snPronto = true;
    return true;
  } catch (e) {
    console.warn("Não consegui abrir a sincronização:", e);
    snCanal = null;
    snPronto = false;
    return false;
  }
}

function snDesconectar() {
  clearInterval(snPulso);   snPulso = null;
  clearInterval(snRelogio); snRelogio = null;
  snPararQuadros();
  try { snCanal?.unsubscribe(); } catch (e) {}
  snCanal = null; snPronto = false;
  snLatencia = 0;
}

function snMedirLatencia() {
  if (!snPronto || snEhLider() || !snLigado) return;
  snEcoEm = performance.now();
  snCanal.send({
    type: "broadcast", event: "eco",
    payload: { de: SN_EU, t: snEcoEm },
  });
}

// ── medir as linhas ─────────────────────────────────────────
//  Ler a geometria obriga o navegador a recalcular a página. Num
//  laço de 60 quadros por segundo isso sozinho engasga a rolagem,
//  então a medida é guardada e só refeita quando a cifra muda.
//
//  O que se guarda é o topo de cada linha da cifra ORIGINAL. Uma
//  linha que a quebra cortou em três pedaços ocupa a altura dos
//  três; uma que não foi cortada, a de uma. Com isso a conversão
//  linha ↔ pixel é feita por partes, e cada aparelho acha o mesmo
//  verso pela própria geometria.

//  As linhas da tela, na ordem (soltas ou dentro dos blocos do
//  leitor-palco.js).
function snLinhasDaTela(pre) {
  return pre ? [...pre.querySelectorAll(":scope > span:not(.lp-bloco), :scope > .lp-bloco > span")] : [];
}

//  De que linha original veio cada linha da tela. Sem quebra, é a
//  mesma. Com quebra, o quebra.js anotou.
function snOrigens(qtd, pre) {
  const usaMapa = typeof qbMapa !== "undefined" && qbMapa &&
    !pre.classList.contains("letra") && lyraAtual?.modo === "cifra" &&
    qbMapa.length === qtd;
  return usaMapa ? qbMapa : null;
}

function snMedir() {
  const c = document.getElementById("lyraCorpo");
  snMax = c ? Math.max(0, c.scrollHeight - c.clientHeight) : 0;
  snTopos = null; snFundo = 0; snPre = null;
  if (!c) return;

  const pre = c.querySelector(".lyra-pre");
  const linhas = snLinhasDaTela(pre);
  if (!linhas.length) return;

  const origens = snOrigens(linhas.length, pre);
  const base = c.getBoundingClientRect().top - c.scrollTop;
  const topos = [];
  let fundo = 0;
  linhas.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const o = origens ? origens[i] : i;
    const t = r.top - base;
    if (topos[o] === undefined || t < topos[o]) topos[o] = t;
    fundo = Math.max(fundo, r.bottom - base);
  });

  //  Linha original que não virou nada na tela (raro): herda o topo
  //  da seguinte, para a conversão nunca ter buraco.
  for (let i = topos.length - 1; i >= 0; i--) {
    if (topos[i] === undefined) topos[i] = i + 1 < topos.length ? topos[i + 1] : fundo;
  }
  snTopos = topos; snFundo = fundo; snPre = pre;
}

//  A medida envelheceu? A cifra foi redesenhada (troca de música,
//  tom, quebra) e o <pre> medido saiu da tela.
function snMedidaVelha() {
  return !snTopos || !snPre || !snPre.isConnected;
}

//  linha (com fração) → pixel do topo dela no corpo
function snLinhaParaPx(l) {
  if (!snTopos || !snTopos.length) return 0;
  const n = snTopos.length;
  if (l <= 0) return snTopos[0];
  if (l >= n) return snFundo;
  const i = Math.floor(l);
  const ini = snTopos[i];
  const fim = i + 1 < n ? snTopos[i + 1] : snFundo;
  return ini + (fim - ini) * (l - i);
}

//  pixel → linha (com fração). Busca binária: são centenas de linhas
//  e isto roda a cada quadro.
function snPxParaLinha(y) {
  if (!snTopos || !snTopos.length) return 0;
  const n = snTopos.length;
  if (y <= snTopos[0]) return 0;
  if (y >= snFundo) return n;
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (snTopos[m] <= y) lo = m; else hi = m - 1;
  }
  const ini = snTopos[lo];
  const fim = lo + 1 < n ? snTopos[lo + 1] : snFundo;
  return lo + (fim > ini ? (y - ini) / (fim - ini) : 0);
}

//  Em páginas (2 colunas) nada rola na vertical: a posição é a
//  primeira linha da página aberta, e quem segue vira para a página
//  que contém aquela linha.
function snEmPaginas() {
  return typeof lpPag !== "undefined" && lpPag && lpPag.ligado;
}

function snPaginaDaLinha(l) {
  const pre = document.querySelector("#lyraCorpo .lyra-pre");
  const linhas = snLinhasDaTela(pre);
  if (!linhas.length || typeof lpPaginaDe !== "function") return 0;
  const origens = snOrigens(linhas.length, pre);
  const alvo = Math.floor(l);
  let el = linhas[linhas.length - 1];
  for (let i = 0; i < linhas.length; i++) {
    if ((origens ? origens[i] : i) >= alvo) { el = linhas[i]; break; }
  }
  return lpPaginaDe(el);
}

function snLinhaDaPagina() {
  const pre = document.querySelector("#lyraCorpo .lyra-pre");
  const linhas = snLinhasDaTela(pre);
  if (!linhas.length || typeof lpPaginaDe !== "function") return 0;
  const origens = snOrigens(linhas.length, pre);
  for (let i = 0; i < linhas.length; i++) {
    if (lpPaginaDe(linhas[i]) >= lpPag.atual) return origens ? origens[i] : i;
  }
  return 0;
}

window.addEventListener("resize", () => { snMedir(); });

//  Mudou o tamanho do texto (zoom, fonte terminando de carregar,
//  quebra ligada, colunas): remede na hora, sem esperar o relógio.
let snObs = null;
function snObservar() {
  const c = document.getElementById("lyraCorpo");
  if (!c || snObs || typeof ResizeObserver === "undefined") return;
  let espera = null;
  snObs = new ResizeObserver(() => {
    clearTimeout(espera);
    espera = setTimeout(snMedir, 60);
  });
  snObs.observe(c);
  const vigiar = () => {
    const pre = c.querySelector(".lyra-pre");
    if (pre && !pre.dataset.snObs) { pre.dataset.snObs = "1"; snObs.observe(pre); }
  };
  vigiar();
  //  o <pre> é trocado a cada música; observa o novo quando surgir
  new MutationObserver(vigiar).observe(c, { childList: true });
}

//  E de vez em quando, por garantia. Os observadores acima já
//  remedem quando a cifra muda; medir todas as linhas a cada 2s
//  forçava o navegador a recalcular a página no meio da rolagem
//  (no tablet, um tranco visível). A cada 8s basta.
setInterval(() => {
  if (!snLigado || (!snEhLider() && snSolto)) return;
  if (!document.getElementById("lyraOverlay")?.classList.contains("open")) return;
  snMedir();
}, 8000);

// ── o que é transmitido ─────────────────────────────────────
//  A posição é a linha que está no topo da tela.
function snPosAtual() {
  const c = document.getElementById("lyraCorpo");
  if (!c) return 0;
  if (snMedidaVelha()) snMedir();
  if (snEmPaginas()) return snLinhaDaPagina();
  return snPxParaLinha(c.scrollTop);
}

//  Fração da altura, só para aparelhos com a versão antiga do site
//  que ainda estejam acompanhando.
function snFracaoAtual() {
  const c = document.getElementById("lyraCorpo");
  return c && snMax > 0 ? Math.min(1, Math.max(0, c.scrollTop / snMax)) : 0;
}

function snEnviar(agora = false) {
  if (!snPronto || !snLigado || !snEhLider()) return;
  if (!lyraAtual || !lyraAtual.song) return;

  const t = Date.now();
  if (!agora && t - snUltEnvio < SN_ENVIOS) return;

  const pos = snPosAtual();

  //  Movimento de menos de um pixel e pouco não vale uma mensagem.
  if (!agora && snUltPos !== null && Math.abs(pos - snUltPos) < SN_MINIMO) return;

  //  Velocidade medida entre as duas últimas amostras. O peso é
  //  maior no valor novo (65%) para ela reagir rápido quando o
  //  dedo começa a arrastar; o resto amacia o tranco. Pausa longa
  //  zera: é movimento novo.
  const dt = t - snUltT;
  if (snEmPaginas()) {
    snVel = 0;                 // página vira inteira: não há deslize
  } else if (snUltPos !== null && dt > 0 && dt < 700) {
    const bruta = (pos - snUltPos) / dt;
    snVel = snVel * 0.35 + bruta * 0.65;
  } else {
    snVel = 0;
  }

  snUltEnvio = t; snUltPos = pos; snUltT = t;

  const carga = {
    slug: lyraAtual.song.slug,
    tom:  lyraAtual.tom,
    modo: lyraAtual.modo,
    ts:   +snAgoraAbs().toFixed(1),     // quando o líder estava aqui
    l:    +pos.toFixed(3),
    vel:  +snVel.toFixed(6),
    pos:  +snFracaoAtual().toFixed(4),   // versão antiga do site
  };

  //  A fila do culto vai só nos retratos completos, não nas
  //  mensagens de rolagem: são cinco nomes, mas dez vezes por
  //  segundo isso seria desperdício. Com ela, as setas de próxima
  //  e anterior funcionam no aparelho de quem segue, e na mesma
  //  ordem do culto — sem isso o leitor abria sem fila e as duas
  //  setas ficavam escondidas.
  if (agora && lyraAtual.nav?.itens?.length) {
    carga.nav = { itens: lyraAtual.nav.itens, idx: lyraAtual.nav.idx };
  }

  snCanal.send({ type: "broadcast", event: "tela", payload: carga });

  //  Parou de rolar? Uma última mensagem com velocidade zero, ou
  //  o seguidor continuaria andando sozinho até bater no fim.
  clearTimeout(snParada);
  snParada = setTimeout(() => {
    snVel = 0; snUltPos = null;
    if (snPronto && snLigado && snEhLider() && lyraAtual?.song) {
      snCanal.send({
        type: "broadcast", event: "tela",
        payload: {
          slug: lyraAtual.song.slug, tom: lyraAtual.tom,
          modo: lyraAtual.modo, ts: +snAgoraAbs().toFixed(1),
          l: +snPosAtual().toFixed(3),
          pos: +snFracaoAtual().toFixed(4), vel: 0,
        },
      });
    }
  }, 200);
}

//  chamado pelo leitor-palco.js quando o líder aperta um botão do mapa
function snEnviarMarca(rotulo) {
  if (!snPronto || !snLigado || !snEhLider() || !lyraAtual?.song) return;
  snCanal.send({
    type: "broadcast", event: "marca",
    payload: { slug: lyraAtual.song.slug, rotulo: rotulo || null },
  });
}

// ── o que o seguidor faz com o que chega ────────────────────
function snSongPorSlug(slug) {
  if (typeof lyraIndice === "undefined" || !lyraIndice) return null;
  for (const s of lyraIndice.values()) if (s.slug === slug) return s;
  return null;
}

async function snReceber(p) {
  if (!p || snSolto) return;
  if (p.fim) { snAlvo = null; snPararQuadros(); return; }
  if (!p.slug) return;

  const song = snSongPorSlug(p.slug);
  if (!song) return;                     // música que este aparelho não tem

  //  A fila chega nos retratos completos e vale até a próxima:
  //  é ela que faz as setas de música funcionarem aqui.
  if (p.nav?.itens?.length) snNav = p.nav;

  const aberto = document.getElementById("lyraOverlay")?.classList.contains("open");
  const outra  = !lyraAtual || !lyraAtual.song || lyraAtual.song.slug !== p.slug;

  // música diferente (ou leitor fechado): abre a certa
  if (!aberto || outra) {
    snAlvo = null;
    snAmostras = [];
    lyraAbrirLeitor(song, p.tom, [], snNav ? { ...snNav } : null, p.modo || "cifra");
    //  A cifra é carregada de forma assíncrona; a posição só faz
    //  sentido quando o texto já está na tela.
    setTimeout(() => { snMedir(); snMirar(p); }, 420);
    snPintarSelo();
    return;
  }

  //  Mesma música, mas a fila pode ter chegado agora (ou o líder
  //  andou nela): as setas acompanham.
  if (snNav && lyraAtual) {
    lyraAtual.nav = { ...snNav };
    if (typeof lyraAtualizarSetas === "function") lyraAtualizarSetas();
  }

  // mesma música: acerta tom e modo, se mudaram
  let mudou = false;
  if (p.tom && lyraAtual.tom !== p.tom)   { lyraAtual.tom = p.tom; lyraPreencherTons(); mudou = true; }
  if (p.modo && lyraAtual.modo !== p.modo){ lyraAtual.modo = p.modo; lyraAplicarModo(); mudou = true; }

  if (mudou) {
    await lyraRenderConteudo();
    setTimeout(() => { snMedir(); snMirar(p); }, 120);
    return;
  }
  snMirar(p);
}

//  Guarda para onde ir e desde quando. O instante é o da CHEGADA,
//  não o do envio: assim não preciso acertar o relógio dos dois
//  aparelhos, que nunca batem. O caminho de ida entra pela
//  latência medida, que é a mesma conta sem depender de relógio.
function snMirar(p) {
  if (snMedidaVelha()) snMedir();
  let pos, vel = p.vel || 0;
  if (typeof p.l === "number") {
    pos = p.l;
  } else {
    //  Mensagem da versão antiga: fração da altura. Não é exata,
    //  mas é melhor que nada até o líder atualizar a página.
    pos = snPxParaLinha((p.pos || 0) * snMax);
    vel = 0;
  }
  if (typeof p.ts === "number" && typeof p.l === "number") {
    snGuardarAmostra(p.ts, pos, vel);
    snAlvo = { colchao: true, pos, vel, em: performance.now() };
  } else {
    //  Líder com a versão antiga do site (sem hora): o jeito antigo.
    snAlvo = { pos, vel, em: performance.now() };
  }
  snRodarQuadros();
}

function snGuardarAmostra(ts, pos, vel) {
  const chegada = snAgoraAbs();

  //  Menor diferença chegada − envio nos últimos 8s. Janela móvel
  //  para acompanhar a rede que melhora ou piora no meio do culto.
  snDifs.push([chegada, chegada - ts]);
  while (snDifs.length && chegada - snDifs[0][0] > 8000) snDifs.shift();
  const difs = snDifs.map(d => d[1]);
  snDifMin = Math.min(...difs);

  //  O colchão se ajusta à rede: com Wi-Fi bom fica curto (a tela
  //  anda quase junto); com Wi-Fi oscilando, cresce o suficiente
  //  para quase nunca faltar amostra. Base: o atraso extra que 90%
  //  das mensagens tiveram, com uma folga.
  if (snColchaoAuto && difs.length >= 6) {
    const extras = difs.map(d => d - snDifMin).sort((a, b) => a - b);
    const p90 = extras[Math.floor(extras.length * 0.9)];
    const alvo = Math.min(700, Math.max(110, p90 + SN_ENVIOS + 20));
    //  sobe rápido (rede piorou), desce devagar (pode ser só sorte)
    SN_COLCHAO = alvo > SN_COLCHAO ? alvo : SN_COLCHAO * 0.9 + alvo * 0.1;
  }

  const ult = snAmostras[snAmostras.length - 1];
  if (ult && ts <= ult.ts) return;                 // repetida ou fora de ordem
  //  Depois de uma pausa, a próxima amostra não pode ser ligada à
  //  anterior por uma rampa lenta: a tela ficaria escorregando a
  //  pausa inteira. Um ponto parado logo antes resolve.
  if (ult && ts - ult.ts > 400) snAmostras.push({ ts: ts - SN_ENVIOS, pos: ult.pos, vel: 0 });
  snAmostras.push({ ts, pos, vel });
  while (snAmostras.length > 2 && ts - snAmostras[0].ts > 4000) snAmostras.shift();
}

//  Onde o líder estava na hora t (relógio dele): entre duas amostras,
//  interpola; depois da última, segue a velocidade por no máximo
//  250ms (rede segurou uma mensagem) e então para.
function snPosNaHora(t) {
  const A = snAmostras;
  if (!A.length) return null;
  if (t <= A[0].ts) return A[0].pos;
  const ult = A[A.length - 1];
  if (t >= ult.ts) return ult.pos + ult.vel * Math.min(250, t - ult.ts);
  let lo = 0, hi = A.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (A[m].ts <= t) lo = m; else hi = m;
  }
  const a = A[lo], b = A[hi];
  return a.pos + (b.pos - a.pos) * ((t - a.ts) / (b.ts - a.ts));
}

// ── o laço que desenha a rolagem ────────────────────────────
//  A rede diz para onde ir; quem desenha é este aparelho, quadro
//  a quadro.
function snRodarQuadros() {
  //  snSolto entra na condição de entrada, e não só dentro do
  //  laço: quem soltou não deve nem começar um quadro.
  if (snQuadro || !snAlvo || snSolto) return;
  snUltFrame = performance.now();

  const passo = agora => {
    snQuadro = null;
    if (!snAlvo || snSolto || !snLigado || snEhLider()) return;

    const c = document.getElementById("lyraCorpo");
    const aberto = document.getElementById("lyraOverlay")?.classList.contains("open");
    if (!c || !aberto) return;
    if (snMedidaVelha()) snMedir();
    if (!snTopos) return;
    const nLinhas = snTopos.length;

    const dtQuadro = Math.min(50, agora - snUltFrame);   // aba escondida volta
    snUltFrame = agora;                                  // com um salto enorme

    //  Onde o líder estava há SN_ATRASO milissegundos: a posição
    //  que chegou, mais o tempo decorrido, mais o caminho de ida
    //  da mensagem, menos o atraso de propósito. O resultado é
    //  limitado: passado esse limite estaríamos inventando, e
    //  inventar é o que fazia a tela passar do ponto e voltar.
    let alvo, horaDesenho = 0;
    if (snAlvo.colchao && snDifMin !== null) {
      horaDesenho = snAgoraAbs() - snDifMin - SN_COLCHAO;
      const p = snPosNaHora(horaDesenho);
      alvo = Math.min(nLinhas, Math.max(0, p === null ? snAlvo.pos : p));
    } else {
      const adiante = Math.min(SN_ADIANTE, Math.max(0,
        (agora - snAlvo.em) + snLatencia - SN_ATRASO));
      alvo = Math.min(nLinhas, Math.max(0, snAlvo.pos + snAlvo.vel * adiante));
    }

    //  Em páginas: vira para a página que tem a linha, e pronto.
    if (snEmPaginas()) {
      const pag = snPaginaDaLinha(alvo);
      if (pag !== lpPag.atual && typeof lpIrParaPagina === "function") {
        snIgnorar = true;
        lpIrParaPagina(pag, true);
        if (typeof lpPintarPaginas === "function") lpPintarPaginas();
        setTimeout(() => { snIgnorar = false; }, 600);
      }
      if (snAlvo.vel !== 0 || snAlvo.colchao) snQuadro = requestAnimationFrame(passo);
      return;
    }

    const atual = snPxParaLinha(c.scrollTop);
    const erro  = alvo - atual;

    snIgnorar = true;
    if (Math.abs(erro) > SN_PULO) {
      c.scrollTop = snLinhaParaPx(alvo);         // longe demais: corta caminho
    } else if (snAlvo.colchao) {
      //  O alvo já é uma curva lisa (interpolada): segue-se ele. Só um
      //  desvio grande (a cifra foi remedida, por exemplo) é corrigido
      //  aos poucos, na mesma proporção a 60 ou a 120 quadros/s.
      const novo = Math.abs(erro) < 1 ? alvo
        : atual + erro * Math.min(1, dtQuadro * 0.012);
      if (Math.abs(novo - atual) > 0.0005) c.scrollTop = snLinhaParaPx(novo);
    } else {
      //  Duas parcelas: a velocidade do líder (é ela que elimina o
      //  atraso em regime — sem esta linha a tela ficaria sempre
      //  um tico atrás, porque puxar para um alvo em movimento
      //  nunca o alcança) e um pedaço do erro, que só conserta o
      //  desvio e é o que mantém o movimento macio.
      const avanco = snAlvo.vel * dtQuadro + erro * SN_COLA;
      if (Math.abs(avanco) > 0.001) c.scrollTop = snLinhaParaPx(atual + avanco);
    }
    snIgnorar = false;

    //  Parado e no lugar: encerra o laço. Sem isto ele ficaria
    //  gastando bateria a noite inteira brigando por meio pixel.
    //  Também encerra quando a tela daqui não tem mais para onde
    //  ir (tela maior que a do líder, no fim da música).
    const max = c.scrollHeight - c.clientHeight;
    const travado = (erro > 0 && c.scrollTop >= max - 1) || (erro < 0 && c.scrollTop <= 0);
    const ultAmostra = snAmostras[snAmostras.length - 1];
    const quieto = snAlvo.colchao
      ? (!ultAmostra || horaDesenho > ultAmostra.ts + 260) && (Math.abs(erro) < 0.01 || travado)
      : snAlvo.vel === 0 && (Math.abs(erro) < 0.01 || travado);
    if (!quieto) snQuadro = requestAnimationFrame(passo);
  };

  snQuadro = requestAnimationFrame(passo);
}

function snPararQuadros() {
  if (snQuadro) cancelAnimationFrame(snQuadro);
  snQuadro = null;
}

//  Soltar de verdade: além de parar o laço, o alvo é apagado. Um
//  laço agendado antes (a espera de 420ms de uma troca de música,
//  por exemplo) ainda podia disparar depois do toque, e a tela
//  voltava a ser puxada. Sem alvo, não há para onde puxar.
function snSoltar() {
  if (snEhLider() || !snLigado || snSolto) return;
  snSolto = true;
  snAlvo  = null;
  snAmostras = [];
  snPararQuadros();
  snPintarSelo();
}

function snVoltarASeguir() {
  snSolto = false;
  snMedir();
  snPintarSelo();
  snPedir();                 // pede o retrato de onde a tela está agora
}

// ── o seguidor se solta com um toque ────────────────────────
//  Rolar com o dedo é um pedido claro: quero ver outra coisa. A
//  tela para de ser puxada na hora e aparece como voltar.
function snLigarSoltar() {
  const c = document.getElementById("lyraCorpo");
  if (!c || c.dataset.sn) return;
  c.dataset.sn = "1";

  //  Toque, roda do mouse, arrastar a barra de rolagem e as teclas
  //  de navegação: todos são gesto da pessoa. O evento "scroll"
  //  não serve aqui — o próprio laço acima o dispara.
  c.addEventListener("touchstart", snSoltar, { passive: true });
  c.addEventListener("wheel", snSoltar, { passive: true });
  c.addEventListener("mousedown", snSoltar, { passive: true });

  // o líder transmite a própria rolagem
  c.addEventListener("scroll", () => {
    if (snIgnorar) return;
    snEnviar();
  }, { passive: true });
}

//  Setas, espaço, Page Up/Down, Home e End também rolam a cifra.
const SN_TECLAS = ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," ","Spacebar"];
document.addEventListener("keydown", e => {
  if (!snLigado || snEhLider() || snSolto) return;
  if (!document.getElementById("lyraOverlay")?.classList.contains("open")) return;
  if (SN_TECLAS.includes(e.key)) snSoltar();
});

// ── selo no topo do leitor ──────────────────────────────────
//  O selo é montado UMA vez e depois só tem texto e classe
//  trocados. Refazer o innerHTML a cada mensagem era um bug feio:
//  enquanto o líder rola chegam dez mensagens por segundo, e se o
//  conteúdo é trocado entre o apertar e o soltar do dedo, o
//  navegador cancela o clique — o botão de soltar simplesmente
//  não funcionava, e justo na hora em que ele mais importa.
//
//  O evento fica no botão desde o começo e decide na hora o que
//  fazer, então nada precisa ser religado.
function snSelo() {
  let s = document.getElementById("snSelo");
  if (s) return s;
  const box = document.getElementById("lyraBox");
  if (!box) return null;

  s = document.createElement("div");
  s.className = "sn-selo";
  s.id = "snSelo";
  s.innerHTML = `
    <span class="sn-ponto"></span>
    <span class="sn-txt"></span>
    <button type="button" class="sn-acao"></button>
    <button type="button" class="sn-acao2" hidden></button>`;
  box.appendChild(s);

  //  Cada botão é ligado por DUAS rotas. "click" pode ser engolido
  //  quando algo repinta ou cobre o botão no meio do gesto;
  //  "pointerdown" dispara no instante em que o dedo desce e não
  //  depende do resto do gesto. Uma tranca de 400ms evita que as
  //  duas contem como dois toques.
  const ligar = (btn, nome, fn) => {
    let ultimo = 0;
    const agir = origem => {
      const t = Date.now();
      if (t - ultimo < 400) return;
      ultimo = t;
      console.info("[seguir]", nome, "via", origem,
                   "— lider:", snEhLider(), "solto:", snSolto, "ligado:", snLigado);
      fn();
    };
    btn.addEventListener("click", () => agir("click"));
    btn.addEventListener("pointerdown", () => agir("pointerdown"));
  };

  //  Botão da esquerda: com a tela seguindo, ele desliga de vez —
  //  desfaz a inscrição no canal, e sem canal não chega mensagem.
  //  Com a tela livre, ele volta a seguir.
  ligar(s.querySelector(".sn-acao"), "acao", () => {
    if (snSolto && !snEhLider()) { snVoltarASeguir(); return; }
    snAlternar(false);
  });

  //  Botão da direita: só aparece com a tela livre, e é a saída
  //  definitiva. Soltar a tela é uma paradinha — quem soltou para
  //  ver outro verso costuma querer voltar. Quem já decidiu que
  //  não vai acompanhar este culto precisava abrir o menu para
  //  desligar; agora não precisa mais.
  ligar(s.querySelector(".sn-acao2"), "desligar", () => snAlternar(false));

  return s;
}

function snPintarSelo() {
  const s = snSelo();
  if (!s) return;

  const aberto = document.getElementById("lyraOverlay")?.classList.contains("open");
  if (!snLigado || !aberto) { s.classList.remove("on"); return; }
  s.classList.add("on");

  const txt   = s.querySelector(".sn-txt");
  const acao  = s.querySelector(".sn-acao");
  const acao2 = s.querySelector(".sn-acao2");

  if (snEhLider()) {
    s.classList.remove("sn-parado");
    txt.textContent  = "Transmitindo";
    acao.textContent = "Parar";
    acao2.hidden = true;
    return;
  }

  if (snSolto) {
    s.classList.add("sn-parado");
    txt.textContent   = "Tela livre";
    acao.textContent  = "Voltar";
    acao2.textContent = "Desligar";
    acao2.hidden = false;
    return;
  }

  //  Sem mensagem há mais de 12s, quem transmitia provavelmente
  //  fechou o leitor. Melhor dizer isso do que piscar "seguindo"
  //  para uma tela que não vai andar.
  const vivo = snVisto && Date.now() - snVisto < 12000;
  s.classList.toggle("sn-parado", !vivo);
  txt.textContent  = vivo ? "Seguindo" : "Aguardando";
  acao.textContent = "Parar";
  acao2.hidden = true;
}

setInterval(() => { if (snLigado && !snEhLider()) snPintarSelo(); }, 4000);

function snPedir() {
  if (snPronto && !snEhLider()) {
    snCanal.send({ type: "broadcast", event: "pedir", payload: {} });
  }
}

// ── ligar e desligar ────────────────────────────────────────
async function snAlternar(ligar) {
  console.info("[seguir] snAlternar(", ligar, ") — era lider:", snEhLider());
  snLigado = ligar;
  snSolto  = false;
  try { localStorage.setItem(SN_CHAVE, ligar ? "1" : "0"); } catch (e) {}

  if (!ligar) {
    //  Limpa tudo: sem canal, sem alvo e sem fila. Qualquer laço
    //  ou espera agendada antes morre sem ter para onde ir.
    snDesconectar();
    snAlvo = null;
    snNav  = null;
    snAmostras = []; snDifs = []; snDifMin = null;
    snVel  = 0;
    snUltPos = null;
    snPintarLinha();
    snPintarSelo();
    return;
  }

  snPintarLinha("Conectando...");
  const ok = await snConectar();
  if (!ok) {
    snLigado = false;
    if (typeof toast === "function") toast("Não deu para conectar. Verifique a internet.", true);
    snPintarLinha();
    return;
  }

  snMedir();

  if (snEhLider()) {
    clearInterval(snPulso);
    //  Um retrato de tempo em tempo conserta desvio e entrega a
    //  posição a quem chegou depois.
    snPulso = setInterval(() => snEnviar(true), SN_PULSO);
    snEnviar(true);
  } else {
    snPedir();
    clearInterval(snRelogio);
    snMedirLatencia();
    snRelogio = setInterval(snMedirLatencia, SN_ECO);
  }

  snPintarLinha();
  snPintarSelo();
}

// ── linha no menu de opções do leitor ───────────────────────
//  A função mora onde moram as outras escolhas de leitura, em vez
//  de ganhar um botão próprio na barra.
function snPintarLinha(txt) {
  const btn = document.getElementById("snBtn");
  const sub = document.getElementById("snSub");
  if (!btn) return;

  btn.classList.toggle("on", snLigado);
  btn.textContent = snLigado ? "Ligado" : "Desligado";

  if (!sub) return;
  if (txt) { sub.textContent = txt; return; }
  sub.textContent = snEhLider()
    ? (snLigado ? "Sua tela está sendo transmitida" : "Deixar outros acompanharem")
    : (snLigado ? "Acompanhando quem ministra"      : "Segue a tela de quem ministra");
}

//  Traço 1.7, como os outros ícones do menu do leitor.
const SN_ICO = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5a11 11 0 0 1 15 0"/><path d="M7.8 14a6.5 6.5 0 0 1 8.4 0"/><circle cx="12" cy="18.2" r="1.3" fill="currentColor" stroke="none"/></svg>`;

function snMontarLinha() {
  if (document.getElementById("snLinha")) return;
  const p = document.getElementById("opPainel");
  if (!p || typeof opLinha !== "function" || typeof opGrupo !== "function") return;

  const b = document.createElement("button");
  b.className = "lyra-btn";
  b.id = "snBtn";
  b.type = "button";
  b.textContent = "Desligado";
  b.addEventListener("click", () => snAlternar(!snLigado));

  const l = opLinha(
    SN_ICO,
    snEhLider() ? "Transmitir minha tela" : "Acompanhar a tela",
    b, "snLinha", "", "snSub",
  );

  //  Entra antes do grupo do painel do Lyra, que é sempre o
  //  último: é ajuste de leitura, não saída do site.
  const grupos = p.querySelectorAll(".op-grupo");
  const novo = opGrupo(l);
  const ultimo = grupos[grupos.length - 1];
  ultimo ? ultimo.before(novo) : p.appendChild(novo);

  snPintarLinha();
}

// ── enxerto ─────────────────────────────────────────────────
//  Abrir a música, trocar de tom, alternar cifra e letra: tudo
//  passa por aqui. Um gancho só cobre os três — e é o lugar certo
//  para remedir a altura, porque a cifra acabou de mudar.
const snRenderOriginal = lyraRenderConteudo;
lyraRenderConteudo = async function (...a) {
  const r = await snRenderOriginal.apply(this, a);
  snMontarLinha();
  snLigarSoltar();
  snPintarSelo();
  snObservar();
  //  O texto entra no DOM aqui, mas a altura final só existe
  //  depois que o navegador desenha.
  requestAnimationFrame(() => {
    snMedir();
    if (snAlvo) snRodarQuadros();
  });
  snUltPos = null;             // música nova: velocidade recomeça
  snMedir();
  snEnviar(true);
  return r;
};

//  Trocar de música pela seta é a mesma coisa que rolar com o
//  dedo: quero ver outra coisa. Sem isto, a próxima mensagem do
//  líder trazia a tela de volta na hora — o seguidor tocava a
//  seta e nada acontecia.
if (typeof lyraIrPara === "function") {
  const snIrParaOriginal = lyraIrPara;
  lyraIrPara = function (...a) {
    if (snLigado && !snEhLider()) snSoltar();
    return snIrParaOriginal.apply(this, a);
  };
}

const snFecharOriginal = lyraFecharLeitor;
lyraFecharLeitor = function (...a) {
  //  Fechar o leitor não desliga a função: na próxima música ela
  //  continua valendo. Só o selo sai da tela.
  if (snLigado && snEhLider() && snPronto) {
    snCanal.send({ type: "broadcast", event: "tela", payload: { fim: true } });
  }
  snSolto = false;
  snAlvo = null;
  snNav = null;
  snPararQuadros();
  document.getElementById("snSelo")?.classList.remove("on");
  return snFecharOriginal.apply(this, a);
};

//  Ajuste em tempo real, sem recarregar:
//
//    snAjuste({ atraso: 400 })   → mais atraso, menos adivinhação
//    snAjuste({ cola: 0.18 })    → correção mais macia
//    snAjuste({ colchao: 300 })  → (versão nova) mais folga para
//                                   Wi-Fi ruim, um tico mais atrás
//    snAjuste({ pulo: 0.5 })     → tolera mais desvio antes de
//                                   cortar caminho de uma vez
//    snAjuste()                  → mostra o que está valendo
//
//  Se subir o atraso resolver, me diga o número que ficou bom e
//  ele entra como padrão. Se NÃO resolver nem com 500, o pulo não
//  vem da previsão — vem de outra coisa mexendo no scroll, e o
//  caminho é olhar a rolagem automática do acordes.js.
window.snAjuste = (o = {}) => {
  if (typeof o.atraso  === "number") SN_ATRASO  = o.atraso;
  if (typeof o.adiante === "number") SN_ADIANTE = o.adiante;
  if (typeof o.cola    === "number") SN_COLA    = o.cola;
  if (typeof o.pulo    === "number") SN_PULO    = o.pulo;
  if (typeof o.colchao === "number") { SN_COLCHAO = o.colchao; snColchaoAuto = false; }
  if (o.colchao === "auto") snColchaoAuto = true;
  return { atraso: SN_ATRASO, adiante: SN_ADIANTE, cola: SN_COLA, pulo: SN_PULO, colchao: SN_COLCHAO };
};

//  Saída de emergência pelo console, sem depender de clique
//  nenhum: snParar() desliga na hora. Se ISTO não parar a tela,
//  o que a move não é este arquivo.
window.snParar = () => { snAlternar(false); return snEstado(); };

//  Para conferir no console o que está valendo de verdade:
//  digite snEstado() na aba do aparelho que está estranho.
window.snEstado = () => ({
  lider:    snEhLider(),
  ligado:   snLigado,
  canal:    snPronto,
  solto:    snSolto,
  temAlvo:  !!snAlvo,
  laco:     !!snQuadro,
  latencia: Math.round(snLatencia) + "ms",
  amostras: snAmostras.length,
  colchao:  Math.round(SN_COLCHAO) + "ms" + (snColchaoAuto ? " (auto)" : ""),
  fila:     snNav?.itens?.length || 0,
});

//  Quem já tinha ligado antes reconecta sozinho ao abrir o app —
//  mas só quando houver rede.
if (snLigado) {
  addEventListener("load", () => { if (navigator.onLine) snAlternar(true); });
}