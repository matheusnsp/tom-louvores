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
//  A posição vai como FRAÇÃO da cifra (0 a 1), nunca em pixels.
//  Cada aparelho tem seu tamanho de letra, sua quebra de linha e
//  sua tela: o mesmo scrollTop cai em versos diferentes. Fração
//  de 0,5 é o meio da música em qualquer aparelho.
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
const SN_ENVIOS = 100;      // no mínimo 100ms entre mensagens (~10/s)
const SN_PULSO  = 3000;     // um retrato completo a cada 3s
const SN_MINIMO = 0.0012;   // movimento pequeno demais não vira mensagem
const SN_COLA   = 0.28;     // quanto do erro é corrigido por quadro
const SN_PULO   = 0.20;     // erro maior que isso: vai direto, sem deslizar
const SN_ECO    = 5000;     // mede a latência a cada 5s
const SN_TETO   = 400;      // latência acima disso não é compensada

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
let snVel      = 0;         // fração por milissegundo

// seguidor: para onde ir, desde quando, e quanto a rede atrasa
let snAlvo     = null;      // { pos, vel, em }
let snQuadro   = null;      // requestAnimationFrame em curso
let snUltFrame = 0;         // instante do quadro anterior
let snMax      = 0;         // altura rolável, medida de vez em quando
let snLatencia = 0;         // metade do ida-e-volta, em ms
let snEcoEm    = 0;
let snNav      = null;      // fila de louvores que o líder mandou

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
    display:none;align-items:center;gap:8px;
    background:rgba(28,28,28,.94);
    border:1px solid var(--gray3);
    border-radius:999px;
    padding:6px 8px 6px 13px;
    box-shadow:0 8px 24px rgba(0,0,0,.45);
    backdrop-filter:blur(8px);
    font-family:'Inter',sans-serif;
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
    font-family:'Inter',sans-serif;
    font-size:10px;font-weight:800;
    letter-spacing:.06em;text-transform:uppercase;
    padding:5px 11px;
  }
  .claro .sn-selo button{background:#E4DFD8;border-color:rgba(0,0,0,.16);color:#242424}

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
      snVisto = Date.now();
      if (!snEhLider() && snLigado) snReceber(payload);
      snPintarSelo();
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

// ── medir a altura rolável ──────────────────────────────────
//  Ler scrollHeight obriga o navegador a recalcular a página. Num
//  laço de 60 quadros por segundo isso sozinho engasga a rolagem,
//  então a medida é guardada e só refeita quando a cifra muda.
function snMedir() {
  const c = document.getElementById("lyraCorpo");
  snMax = c ? Math.max(0, c.scrollHeight - c.clientHeight) : 0;
}

window.addEventListener("resize", () => { snMedir(); });

// ── o que é transmitido ─────────────────────────────────────
function snPosAtual() {
  const c = document.getElementById("lyraCorpo");
  if (!c || snMax <= 0) return 0;
  return Math.min(1, Math.max(0, c.scrollTop / snMax));
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
  if (snUltPos !== null && dt > 0 && dt < 700) {
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
    pos:  +pos.toFixed(4),
    vel:  +snVel.toFixed(7),
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
          modo: lyraAtual.modo, pos: +snPosAtual().toFixed(4), vel: 0,
        },
      });
    }
  }, 200);
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
  snAlvo = { pos: p.pos || 0, vel: p.vel || 0, em: performance.now() };
  snRodarQuadros();
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
    if (!c || !aberto || snMax <= 0) return;

    const dtQuadro = Math.min(50, agora - snUltFrame);   // aba escondida volta
    snUltFrame = agora;                                  // com um salto enorme

    //  Onde o líder está AGORA: a posição que chegou, mais o que
    //  ele andou desde a chegada, mais o caminho de ida que a
    //  mensagem já havia gasto antes de aparecer aqui.
    const adiante = (agora - snAlvo.em) + snLatencia;
    const alvo = Math.min(1, Math.max(0, snAlvo.pos + snAlvo.vel * adiante));

    const atual = c.scrollTop / snMax;
    const erro  = alvo - atual;

    snIgnorar = true;
    if (Math.abs(erro) > SN_PULO) {
      c.scrollTop = alvo * snMax;            // longe demais: corta caminho
    } else {
      //  Duas parcelas: a velocidade do líder (é ela que elimina o
      //  atraso em regime — sem esta linha a tela ficaria sempre
      //  uns pixels atrás, porque puxar para um alvo em movimento
      //  nunca o alcança) e um pedaço do erro, que só conserta o
      //  desvio e é o que mantém o movimento macio.
      const avanco = snAlvo.vel * dtQuadro + erro * SN_COLA;
      if (Math.abs(avanco) > 0.00003) c.scrollTop = (atual + avanco) * snMax;
    }
    snIgnorar = false;

    //  Parado e no lugar: encerra o laço. Sem isto ele ficaria
    //  gastando bateria a noite inteira brigando por meio pixel.
    const quieto = snAlvo.vel === 0 && Math.abs(erro) < 0.0004;
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
    <button type="button" class="sn-acao"></button>`;
  box.appendChild(s);

  //  O clique é ligado por DUAS rotas. "click" pode ser engolido
  //  quando algo repinta ou cobre o botão no meio do gesto;
  //  "pointerdown" dispara no instante em que o dedo desce e não
  //  depende do resto do gesto. Uma tranca de 400ms evita que as
  //  duas contem como dois toques.
  let ultimoToque = 0;
  const agir = origem => {
    const t = Date.now();
    if (t - ultimoToque < 400) return;
    ultimoToque = t;
    console.info("[seguir] toque no selo via", origem,
                 "— lider:", snEhLider(), "solto:", snSolto, "ligado:", snLigado);

    //  Quem segue e toca aqui quer sair, não dar uma paradinha:
    //  isto DESLIGA a função e desfaz a inscrição no canal. Sem
    //  canal não chega mensagem, e nenhum caminho sobrou que possa
    //  mexer na tela — é a saída garantida.
    //
    //  A paradinha continua existindo, mas por gesto: rolar com o
    //  dedo solta a tela na hora e o selo passa a oferecer o
    //  "Voltar a seguir".
    if (snSolto && !snEhLider()) { snVoltarASeguir(); return; }
    snAlternar(false);
  };

  const b = s.querySelector(".sn-acao");
  b.addEventListener("click", () => agir("click"));
  b.addEventListener("pointerdown", () => agir("pointerdown"));

  return s;
}

function snPintarSelo() {
  const s = snSelo();
  if (!s) return;

  const aberto = document.getElementById("lyraOverlay")?.classList.contains("open");
  if (!snLigado || !aberto) { s.classList.remove("on"); return; }
  s.classList.add("on");

  const txt  = s.querySelector(".sn-txt");
  const acao = s.querySelector(".sn-acao");

  if (snEhLider()) {
    s.classList.remove("sn-parado");
    txt.textContent  = "Transmitindo";
    acao.textContent = "Parar";
    return;
  }

  if (snSolto) {
    s.classList.add("sn-parado");
    txt.textContent  = "Tela livre";
    acao.textContent = "Voltar a seguir";
    return;
  }

  //  Sem mensagem há mais de 12s, quem transmitia provavelmente
  //  fechou o leitor. Melhor dizer isso do que piscar "seguindo"
  //  para uma tela que não vai andar.
  const vivo = snVisto && Date.now() - snVisto < 12000;
  s.classList.toggle("sn-parado", !vivo);
  txt.textContent  = vivo ? "Seguindo" : "Aguardando";
  acao.textContent = "Parar";
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
    : (snLigado ? "Acompanhando quem ministra"      : "Andar junto com quem ministra");
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
  //  O texto entra no DOM aqui, mas a altura final só existe
  //  depois que o navegador desenha.
  requestAnimationFrame(() => {
    snMedir();
    if (snAlvo) snRodarQuadros();
  });
  snUltPos = null;             // música nova: velocidade recomeça
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
  fila:     snNav?.itens?.length || 0,
});

//  Quem já tinha ligado antes reconecta sozinho ao abrir o app —
//  mas só quando houver rede.
if (snLigado) {
  addEventListener("load", () => { if (navigator.onLine) snAlternar(true); });
}