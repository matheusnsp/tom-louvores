// ============================================================
//  LEITOR — recursos de palco
//
//    · mapa da música: as partes ([Intro], [Refrão]…), os riffs
//      ("Riff 2" numa linha de acordes) e rótulos como "Solo:" viram
//      botões no topo. Um toque leva até ali e o botão fica marcado;
//      rolando, a marca acompanha a parte que está na tela
//    · linha que começa com "//" é comentário de quem escreveu a
//      cifra: aparece apagada e nunca vira botão
//    · barra de progresso dourada: quanto da música já passou
//    · 1 ou 2 colunas (tablet e computador). Em 2 colunas a cifra é
//      dividida em PÁGINAS do tamanho da tela, como um livro: nada
//      rola, a página vira inteira. Um divisor dourado marca onde a
//      página termina e "1 / 3" mostra onde você está
//    · virar página: tocar no terço direito (ou esquerdo, para
//      voltar), arrastar para o lado, pedal Bluetooth ou teclado
//      (PageDown, espaço, ↓ / PageUp, ↑). Na última página, a próxima
//      pisada abre a próxima música da lista
//    · tela cheia, onde o aparelho deixa
//    · a linha "Tom: X" do Lyra fica apagada: o tom já está no seletor
//
//  Tudo por fora do lyra.js: observa o #lyraCorpo e reage quando o
//  texto muda (troca de música, de tom, de modo, zoom, quebra).
// ============================================================

const LP_ICO_UMA = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="1.5"/></svg>`;
const LP_ICO_COLUNAS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>`;
const LP_ICO_TELA = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const LP_ICO_TELA_SAIR = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;
const LP_ICO_ESQ = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
const LP_ICO_DIR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;

const LP_GAP = 48;          // espaço entre as colunas (e entre as páginas)
const LP_FONTE_MIN = 11;    // menor letra aceitável em 2 colunas

// 1 ou 2 colunas: a escolha fica guardada no aparelho (começa em 1)
let lpColunas = false;
try { lpColunas = localStorage.getItem("tl_colunas") === "2"; } catch (e) {}

let lpSecoes = [];      // [{ el, botao, rotulo }]
let lpEscolhida = null; // o botão que a pessoa apertou por último
let lpEscolhidaEm = 0;
let lpQuadro = 0;
let lpPag = { ligado: false, atual: 0, total: 1, passo: 0 };

// ── montagem (uma vez, quando o leitor existe) ──────────────
function lpMontar() {
  const box = document.getElementById("lyraBox");
  if (!box || document.getElementById("lyraMapa")) return !!box;

  const corpo = document.getElementById("lyraCorpo");

  const mapa = document.createElement("nav");
  mapa.id = "lyraMapa";
  mapa.className = "lyra-mapa";
  mapa.setAttribute("aria-label", "Partes da música");
  corpo.before(mapa);

  const prog = document.createElement("div");
  prog.className = "lyra-prog";
  prog.innerHTML = `<i id="lyraProg"></i>`;
  corpo.before(prog);

  // páginas: o divisor na beirada e o "1 / 3" com as setas
  const vira = document.createElement("div");
  vira.id = "lyraVira";
  vira.className = "lyra-vira";
  vira.hidden = true;
  vira.innerHTML = `<span>continua</span>`;
  box.appendChild(vira);

  const pags = document.createElement("div");
  pags.id = "lyraPags";
  pags.className = "lyra-pags";
  pags.hidden = true;
  pags.innerHTML = `
    <button type="button" id="lyraPagAnt" aria-label="Página anterior">${LP_ICO_ESQ}</button>
    <span id="lyraPagTxt" aria-live="polite">1 / 1</span>
    <button type="button" id="lyraPagProx" aria-label="Próxima página">${LP_ICO_DIR}</button>`;
  box.appendChild(pags);
  document.getElementById("lyraPagAnt").addEventListener("click", () => lpVirar(-1));
  document.getElementById("lyraPagProx").addEventListener("click", () => lpVirar(+1));

  const acoes = box.querySelector(".lyra-hd-acoes");
  const fechar = document.getElementById("lyraFechar");

  // 1 coluna | 2 colunas — só em tela de tablet para cima
  const col = document.createElement("div");
  col.className = "lyra-colsel lyra-so-largo";
  col.id = "lyraColSel";
  col.setAttribute("role", "group");
  col.setAttribute("aria-label", "Colunas da cifra");
  col.innerHTML = `
    <button type="button" data-cols="1" title="Uma coluna, rolando">${LP_ICO_UMA}<span>1</span></button>
    <button type="button" data-cols="2" title="Duas colunas, em páginas">${LP_ICO_COLUNAS}<span>2</span></button>`;
  col.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    lpColunas = b.dataset.cols === "2";
    try { localStorage.setItem("tl_colunas", lpColunas ? "2" : "1"); } catch (e) {}
    lpPag.atual = 0;
    corpo.scrollTop = 0;
    lpAplicarColunas();
    lpAoRolar();
  }));
  acoes.insertBefore(col, document.getElementById("lyraAnt"));

  const ov = document.getElementById("lyraOverlay");
  if (document.fullscreenEnabled && ov.requestFullscreen) {
    const tela = document.createElement("button");
    tela.className = "lyra-btn";
    tela.id = "lyraTelaBtn";
    tela.title = "Tela cheia";
    tela.setAttribute("aria-label", "Tela cheia");
    tela.innerHTML = LP_ICO_TELA;
    tela.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else ov.requestFullscreen().catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => {
      tela.innerHTML = document.fullscreenElement ? LP_ICO_TELA_SAIR : LP_ICO_TELA;
      lpAgendar();
    });
    acoes.insertBefore(tela, fechar);
  }

  corpo.addEventListener("scroll", lpAoRolar, { passive: true });
  corpo.addEventListener("click", lpToqueNaPagina);
  lpLigarArrastePaginas(corpo);
  new MutationObserver(lpAgendar).observe(corpo, { childList: true, subtree: true });
  window.addEventListener("resize", lpAgendar);
  lpAgendar();
  return true;
}

// junta várias mudanças seguidas num redesenho só
function lpAgendar() {
  cancelAnimationFrame(lpQuadro);
  lpQuadro = requestAnimationFrame(lpAtualizar);
}

function lpAtualizar() {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo) return;
  const pre = corpo.querySelector(".lyra-pre");

  // a linha "Tom: A" que vem do Lyra
  if (pre) {
    for (const sp of lpLinhas(pre).filter(x => x.classList.contains("lyra-letra"))) {
      if (/^\s*tom\s*:/i.test(sp.textContent)) { sp.classList.add("lyra-meta"); break; }
      if (sp.textContent.trim()) break;   // só olha o comecinho
    }
  }

  lpAplicarColunas();
  lpMontarMapa(pre);
  lpAoRolar();
}

// todas as linhas, na ordem, estejam ou não dentro de um bloco
function lpLinhas(pre) {
  return pre ? [...pre.querySelectorAll(":scope > span:not(.lp-bloco), :scope > .lp-bloco > span")] : [];
}

//  Junta as linhas em blocos (uma estrofe, ou um título de parte com
//  a estrofe que vem logo depois). Em páginas cada bloco é indivisível:
//  acorde e letra nunca ficam em colunas diferentes, e o título nunca
//  fica sozinho no pé da coluna. Em 1 coluna o bloco é transparente
//  (display: contents) e nada muda na tela.
function lpAgruparBlocos(pre) {
  if (!pre || pre.querySelector(":scope > .lp-bloco")) return;
  const grupos = [];
  let atual = [];
  const vazia = n => n.nodeType === 1 && !n.textContent.trim();
  const fecha = () => { if (atual.length) grupos.push(atual); atual = []; };

  [...pre.childNodes].forEach(n => {
    if (n.nodeType === 1 && n.classList.contains("lyra-secao")) fecha();
    atual.push(n);
    if (vazia(n)) fecha();
  });
  fecha();

  // título de parte sem nada embaixo: vai junto com o bloco seguinte
  const soTitulo = g => g.every(n => n.nodeType !== 1 || vazia(n) || n.classList.contains("lyra-secao"));
  for (let i = grupos.length - 2; i >= 0; i--) {
    if (soTitulo(grupos[i])) grupos.splice(i, 2, grupos[i].concat(grupos[i + 1]));
  }

  const frag = document.createDocumentFragment();
  grupos.forEach(g => {
    const b = document.createElement("span");
    b.className = "lp-bloco";
    g.forEach(n => b.appendChild(n));
    frag.appendChild(b);
  });
  pre.appendChild(frag);
}

// ── 1 ou 2 colunas (em páginas) ─────────────────────────────
function lpLimparPaginas(pre) {
  if (!pre) return;
  ["height", "width", "column-width", "column-count", "column-gap", "column-fill", "--lyra-fs"]
    .forEach(p => pre.style.removeProperty(p));
}

function lpAplicarColunas() {
  const corpo = document.getElementById("lyraCorpo");
  const sel = document.getElementById("lyraColSel");
  if (!corpo) return;
  const pre = corpo.querySelector(".lyra-pre:not(.letra)");
  const antes = lpPag.ligado;
  const fracao = lpPag.total > 1 ? lpPag.atual / (lpPag.total - 1) : 0;

  let liga = false;
  let naoCabe = false;
  if (pre && lpColunas) {
    const cs = getComputedStyle(corpo);
    const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
    const padT = parseFloat(cs.paddingTop),  padB = parseFloat(cs.paddingBottom);
    const util = Math.floor(corpo.clientWidth - padL - padR);
    const alto = Math.floor(corpo.clientHeight - padT - padB);
    const largura = Math.floor((util - LP_GAP) / 2);

    // a linha mais comprida decide se cabe; se não couber no tamanho
    // escolhido, a letra diminui só o necessário (até 11px)
    const fs = parseFloat(pre.style.fontSize) || 15;
    let maior = 0;
    for (const l of (pre.textContent || "").split("\n")) maior = Math.max(maior, l.trimEnd().length);
    const cabe = largura / ((maior + 2) * 0.61);
    const usado = Math.min(fs, Math.floor(cabe * 10) / 10);

    liga = usado >= LP_FONTE_MIN && util >= 560 && alto >= 240;
    naoCabe = !liga;
    if (liga) {
      lpAgruparBlocos(pre);
      pre.style.setProperty("--lyra-fs", usado + "px");
      pre.style.height = alto + "px";
      pre.style.width = util + "px";
      pre.style.columnWidth = largura + "px";
      pre.style.columnCount = "auto";
      pre.style.columnGap = LP_GAP + "px";
      pre.style.columnFill = "auto";

      lpPag.passo = util + LP_GAP;
      // quantas páginas: onde termina a última linha
      const linhas = lpLinhas(pre);
      const ultima = linhas[linhas.length - 1];
      const x0 = pre.getBoundingClientRect().left + corpo.scrollLeft;
      const fim = ultima ? ultima.getBoundingClientRect().left + corpo.scrollLeft - x0 : 0;
      lpPag.total = Math.max(1, Math.floor(fim / lpPag.passo + 0.01) + 1);
    }
  }
  if (!liga) lpLimparPaginas(pre);

  // A última página costuma ter uma coluna só, e sem nada à direita
  // a rolagem parava no meio dela. Um marco invisível no fim garante
  // espaço para a página inteira.
  let marco = document.getElementById("lyraMarcoFim");
  if (liga) {
    if (!marco) {
      marco = document.createElement("i");
      marco.id = "lyraMarcoFim";
      marco.setAttribute("aria-hidden", "true");
    }
    if (marco.parentElement !== corpo) corpo.appendChild(marco);
    marco.style.left = (lpPag.total * lpPag.passo - 1) + "px";
  } else if (marco) {
    marco.remove();
  }

  corpo.classList.toggle("colunas", liga);
  corpo.classList.toggle("paginas", liga);
  lpPag.ligado = liga;
  if (liga) {
    lpPag.atual = antes ? Math.round(fracao * (lpPag.total - 1)) : Math.min(lpPag.atual, lpPag.total - 1);
    lpIrParaPagina(lpPag.atual, false);
  } else {
    lpPag.atual = 0; lpPag.total = 1;
    if (antes) corpo.scrollLeft = 0;
  }
  lpPintarPaginas();

  if (sel) {
    sel.querySelectorAll("button").forEach(b => {
      const on = (b.dataset.cols === "2") === lpColunas;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    sel.classList.toggle("nao-cabe", naoCabe && lpColunas && !!pre);
    sel.title = naoCabe && lpColunas && pre
      ? "Esta cifra tem linhas longas demais para duas colunas nesta tela" : "";
  }
}

function lpIrParaPagina(n, suave = true) {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo || !lpPag.ligado) return;
  lpPag.atual = Math.max(0, Math.min(lpPag.total - 1, n));
  corpo.scrollTo({ left: lpPag.atual * lpPag.passo, top: 0, behavior: suave ? "smooth" : "auto" });
  lpPintarPaginas();
  lpAoRolar();
}

// devolve true se virou; false se já estava na ponta
function lpVirar(dir) {
  if (!lpPag.ligado) return false;
  const alvo = lpPag.atual + dir;
  if (alvo < 0 || alvo >= lpPag.total) return false;
  lpIrParaPagina(alvo);
  return true;
}

function lpPintarPaginas() {
  const pags = document.getElementById("lyraPags");
  const vira = document.getElementById("lyraVira");
  const corpo = document.getElementById("lyraCorpo");
  if (!pags || !vira || !corpo) return;

  const mostra = lpPag.ligado && lpPag.total > 1;
  pags.hidden = !mostra;
  document.getElementById("lyraPagTxt").textContent = `${lpPag.atual + 1} / ${lpPag.total}`;
  document.getElementById("lyraPagAnt").disabled = lpPag.atual <= 0;
  document.getElementById("lyraPagProx").disabled = lpPag.atual >= lpPag.total - 1;

  // o divisor: um fio dourado na beirada direita enquanto há
  // página seguinte; some na última
  const temMais = mostra && lpPag.atual < lpPag.total - 1;
  vira.hidden = !temMais;
  if (temMais) {
    const box = document.getElementById("lyraBox").getBoundingClientRect();
    const r = corpo.getBoundingClientRect();
    vira.style.top = (r.top - box.top) + "px";
    vira.style.height = r.height + "px";
    vira.style.left = (r.right - box.left - 18) + "px";
  }
}

// tocar no terço direito vira para a frente; no esquerdo, volta
function lpToqueNaPagina(e) {
  if (!lpPag.ligado) return;
  if (e.target.closest("button, a, select, input, .ac-tk")) return;   // acorde abre o desenho
  if (window.getSelection && String(window.getSelection())) return;
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  if (x > 0.66) lpVirar(+1);
  else if (x < 0.34) lpVirar(-1);
}

// arrastar para o lado vira a página. Na última página o arrasto
// segue para o lyra.js, que troca de música.
function lpLigarArrastePaginas(corpo) {
  let x0 = 0, y0 = 0, t0 = 0;
  corpo.addEventListener("touchstart", e => {
    const t = e.changedTouches[0];
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  corpo.addEventListener("touchend", e => {
    if (!lpPag.ligado) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Date.now() - t0 > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (lpVirar(dx < 0 ? +1 : -1)) e.stopImmediatePropagation();
  }, { passive: true, capture: true });
}

// ── riffs e rótulos dentro das linhas de acorde ─────────────
//  "Riff 2     C" e "Solo: F  Cm7" são linhas de acorde com uma
//  marca no começo (ou um "Riff 4" no meio). A marca ganha um
//  <span> — mesma fonte, só branca e em negrito, para a cifra não
//  sair do alinhamento — e é por ele que o mapa a encontra.
const LP_RE_RIFF = /\(?\briff\b\s*\d*\)?/gi;
const LP_RE_ROTULO = /^(\s*)((?:solo|intro|introdu[cç][aã]o|ponte|pr[eé][\s-]*refr[aã]o|p[oó]s[\s-]*refr[aã]o|refr[aã]o|interl[uú]dio|instrumental|final|coda|tag|verso|estrofe|base|turnaround|riff)(?:\s+\d+)?\s*:)/i;

function lpMarcarRiffs(html) {
  return html.split("\n").map(linha => {
    const emAcordes = linha.startsWith('<span class="lyra-acordes">');
    const emLetra   = linha.startsWith('<span class="lyra-letra">');
    if (!emAcordes && !emLetra) return linha;

    // só o texto, nunca o que está dentro de uma tag ou de [colchetes]
    const partes = linha.split(/(<[^>]+>)/);
    let colchete = 0;
    let primeira = true;
    return partes.map(parte => {
      if (!parte || parte.startsWith("<")) return parte;
      let saida = "";
      let i = 0;
      // rótulo com dois-pontos no começo da linha ("Solo:")
      if (primeira && emAcordes) {
        const m = parte.match(LP_RE_ROTULO);
        if (m) {
          saida = m[1] + `<span class="lyra-marco">${m[2]}</span>`;
          i = m[0].length;
        }
      }
      primeira = false;
      const resto = parte.slice(i);
      // uma linha de letra só conta se for apenas o riff ("   Riff 3")
      if (emLetra && !/^\s*\(?riff\b\s*\d*\)?\s*$/i.test(resto)) return saida + resto;
      let ultimo = 0;
      for (const m of resto.matchAll(LP_RE_RIFF)) {
        const antes = resto.slice(ultimo, m.index);
        for (const ch of antes) colchete += ch === "[" ? 1 : ch === "]" ? -1 : 0;
        saida += antes;
        saida += colchete > 0 ? m[0] : `<span class="lyra-marco">${m[0]}</span>`;
        ultimo = m.index + m[0].length;
      }
      for (const ch of resto.slice(ultimo)) colchete += ch === "[" ? 1 : ch === "]" ? -1 : 0;
      return saida + resto.slice(ultimo);
    }).join("");
  }).join("\n");
}

if (typeof lyraCifraParaHTML === "function") {
  const lpCifraOriginal = lyraCifraParaHTML;
  lyraCifraParaHTML = function (...a) { return lpMarcarRiffs(lpCifraOriginal.apply(this, a)); };
}

// ── mapa da música ──────────────────────────────────────────

// "[REFRÃO]" → "Refrão", "[Tab - Riff 3]" → "Tab - Riff 3", "Solo:" → "Solo"
function lpRotulo(txt) {
  let t = txt.replace(/^\s*\[|\]\s*$/g, "").replace(/^[\s(]+|[\s):]+$/g, "").replace(/\s+/g, " ");
  if (!t) return "";
  t = t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase()
                            : t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

function lpMontarMapa(pre) {
  const mapa = document.getElementById("lyraMapa");
  if (!mapa) return;

  // na ordem da cifra: cada linha rende no máximo um botão
  const itens = [];
  lpLinhas(pre).forEach(linha => {
    if (linha.classList.contains("lyra-comentario")) return;
    const secao = linha.classList.contains("lyra-secao") ? linha : linha.querySelector(".lyra-secao");
    const marco = secao ? null : linha.querySelector(".lyra-marco");
    const el = secao || (marco ? linha : null);
    if (!el) return;
    const nome = lpRotulo((secao || marco).textContent);
    if (!nome || nome.length > 28) return;
    // "Repete (4x)", "Bis", "2x": é instrução, não parte da música
    if (/^(repete|repetir|repita|bis|\(?\d+\s*x\b|x\s*\d+|obs\b)/i.test(nome)) return;
    // "[Tab - Riff 3]" é um ponto dentro de uma parte, como um riff
    const ponto = !secao || /\b(riff|tab)\b/i.test(nome);
    itens.push({ el, nome, tipo: ponto ? "marco" : "secao" });
  });

  // a mesma parte de novo ("[Refrão]" duas vezes) ganha um ·2, ·3
  const vistos = {};
  lpSecoes = itens.map(it => {
    vistos[it.nome] = (vistos[it.nome] || 0) + 1;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = vistos[it.nome] > 1 ? `${it.nome} ·${vistos[it.nome]}` : it.nome;
    return { el: it.el, botao: b, rotulo: b.textContent, tipo: it.tipo };
  });
  const botoes = lpSecoes.map(s => s.botao);

  // só refaz se as partes mudaram (zoom e quebra redesenham o texto)
  const assinatura = botoes.map(b => b.textContent).join("|");
  if (mapa.dataset.partes !== assinatura) {
    mapa.dataset.partes = assinatura;
    mapa.replaceChildren(...botoes);
    mapa.scrollLeft = 0;
    lpEscolhida = null;
  } else {
    // mesmas partes: mantém os botões (e a rolagem do mapa)
    [...mapa.children].forEach((b, i) => {
      const novo = b.cloneNode(true);
      b.replaceWith(novo);
      lpSecoes[i].botao = novo;
    });
    // o botão apertado continua sendo o mesmo rótulo
    if (lpEscolhida) lpEscolhida = lpSecoes.find(s => s.rotulo === lpEscolhida.rotulo) || null;
  }
  lpSecoes.forEach(s => s.botao.addEventListener("click", () => lpIrParaSecao(s)));
  mapa.hidden = botoes.length < 2;
}

function lpTopoNoCorpo(el, corpo) {
  return el.getBoundingClientRect().top - corpo.getBoundingClientRect().top + corpo.scrollTop;
}

// em que página a linha está (só em páginas)
function lpPaginaDe(el) {
  const corpo = document.getElementById("lyraCorpo");
  const pre = corpo.querySelector(".lyra-pre");
  const x = el.getBoundingClientRect().left - pre.getBoundingClientRect().left;
  return Math.floor((x + 4) / lpPag.passo);
}

// a linha inteira de onde a parte vem ("[Intro] A D/A" fica dentro de um acorde)
function lpLinhaDe(el) {
  return el.parentElement && el.parentElement.classList.contains("lyra-acordes") ? el.parentElement : el;
}

// o título da parte (ou o "Riff 2") na cifra, para marcar junto com o botão
function lpTituloDe(s) {
  return s.tipo === "marco" && !s.el.classList.contains("lyra-secao")
    ? (s.el.querySelector(".lyra-marco") || s.el)
    : s.el;
}
function lpMarcarTitulo(s) {
  document.querySelectorAll("#lyraCorpo .lyra-alvo").forEach(x => x.classList.remove("lyra-alvo"));
  if (s) lpTituloDe(s).classList.add("lyra-alvo");
}

function lpIrParaSecao(s) {
  const corpo = document.getElementById("lyraCorpo");
  const alvo = lpLinhaDe(s.el);
  lpEscolhida = s;
  lpEscolhidaEm = Date.now();
  lpSecoes.forEach(x => x.botao.classList.toggle("on", x === s));
  lpMarcarTitulo(s);
  if (lpPag.ligado) lpIrParaPagina(lpPaginaDe(alvo));
  else corpo.scrollTo({ top: Math.max(0, lpTopoNoCorpo(alvo, corpo) - 14), behavior: "smooth" });
}

// a parte apertada está na tela?
function lpEstaNaTela(s, corpo) {
  const el = lpLinhaDe(s.el);
  if (lpPag.ligado) return lpPaginaDe(el) === lpPag.atual;
  const topo = lpTopoNoCorpo(el, corpo);
  return topo >= corpo.scrollTop - 8 && topo <= corpo.scrollTop + corpo.clientHeight - 24;
}

// ── rolagem: progresso e parte atual ────────────────────────
function lpAoRolar() {
  const corpo = document.getElementById("lyraCorpo");
  const barra = document.getElementById("lyraProg");
  if (!corpo || !barra) return;

  let fracao, tem;
  if (lpPag.ligado) {
    tem = lpPag.total > 1;
    fracao = tem ? (lpPag.atual + 1) / lpPag.total : 1;
  } else {
    const max = corpo.scrollHeight - corpo.clientHeight;
    tem = max > 0;
    fracao = tem ? Math.min(1, corpo.scrollTop / max) : 0;
  }
  barra.style.transform = `scaleX(${fracao})`;
  barra.parentElement.hidden = !tem;

  if (!lpSecoes.length) return;
  // o botão apertado fica marcado enquanto a linha dele estiver na
  // tela (e durante a rolagem suave até ela). Depois, a marca segue
  // a PARTE em que a leitura está — um riff é um ponto, não uma
  // parte: só fica marcado quando foi apertado
  let atual = null;
  if (lpEscolhida && (Date.now() - lpEscolhidaEm < 1200 || lpEstaNaTela(lpEscolhida, corpo))) {
    atual = lpEscolhida;
  } else {
    if (lpEscolhida) lpMarcarTitulo(null);   // a marca na cifra vai junto com o botão
    lpEscolhida = null;
    const partes = lpSecoes.filter(s => s.tipo === "secao");
    if (partes.length) {
      if (lpPag.ligado) {
        // a primeira parte que aparece nesta página
        const nesta = partes.find(s => lpPaginaDe(lpLinhaDe(s.el)) === lpPag.atual);
        const antes = partes.filter(s => lpPaginaDe(lpLinhaDe(s.el)) < lpPag.atual).pop();
        atual = nesta || antes || partes[0];
      } else {
        // a parte cujo título já passou do topo (com uma folga pequena)
        const linha = corpo.scrollTop + 60;
        atual = partes[0];
        for (const s of partes) if (lpTopoNoCorpo(lpLinhaDe(s.el), corpo) <= linha) atual = s;
      }
    }
  }
  if (!atual) { lpSecoes.forEach(s => s.botao.classList.remove("on")); return; }
  lpSecoes.forEach(s => s.botao.classList.toggle("on", s === atual));
  const m = atual.botao.parentElement;
  const b = atual.botao;
  if (m && (b.offsetLeft < m.scrollLeft || b.offsetLeft + b.offsetWidth > m.scrollLeft + m.clientWidth)) {
    m.scrollTo({ left: b.offsetLeft - 16, behavior: "smooth" });
  }
}

// ── pedal e teclado ─────────────────────────────────────────
document.addEventListener("keydown", e => {
  const ov = document.getElementById("lyraOverlay");
  if (!ov || !ov.classList.contains("open")) return;
  const alvo = e.target;
  if (alvo && (alvo.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const desce = e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey);
  const sobe  = e.key === "PageUp"   || e.key === "ArrowUp"   || (e.key === " " && e.shiftKey);
  if (!desce && !sobe) return;

  const corpo = document.getElementById("lyraCorpo");
  if (!corpo) return;
  e.preventDefault();
  e.stopPropagation();

  if (lpPag.ligado) {
    // em páginas: uma pisada, uma página; depois da última, a próxima música
    if (!lpVirar(desce ? +1 : -1) && desce && typeof lyraIrPara === "function") lyraIrPara(+1);
    return;
  }

  const max = corpo.scrollHeight - corpo.clientHeight;
  if (desce && corpo.scrollTop >= max - 4) {
    if (typeof lyraIrPara === "function") lyraIrPara(+1);
    return;
  }
  const passo = corpo.clientHeight * 0.82;
  corpo.scrollBy({ top: desce ? passo : -passo, behavior: "smooth" });
}, true);

// o leitor só é criado na primeira vez que alguém abre uma cifra
if (!lpMontar()) {
  const espera = new MutationObserver(() => { if (lpMontar()) espera.disconnect(); });
  espera.observe(document.body, { childList: true });
}
