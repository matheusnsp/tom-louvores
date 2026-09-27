// ============================================================
//  TOM LOUVORES — quebra de linha que respeita os acordes
//  Carregue DEPOIS do lyra.js e do acordes.js.
//
//  O "Quebrar linhas longas" usava a quebra do navegador, que
//  dobra cada linha por conta própria: a dos acordes num ponto,
//  a da letra em outro. O acorde de "exaltar" ia parar sozinho
//  numa linha, e a palavra descia sem ele.
//
//  Aqui a cifra é redistribuída antes de ir para a tela. Cada
//  linha de acordes anda junto com a letra de baixo, e as duas
//  são cortadas no mesmo ponto — entre palavras, sem partir
//  acorde. O pedaço que desce leva os acordes dele em cima, na
//  mesma coluna de antes.
//
//  O ponto de corte sai da largura real da tela e do tamanho da
//  letra. Girar o celular, mudar o zoom ou abrir um painel ao
//  lado refaz a conta, sem perder o lugar da leitura.
// ============================================================

let qbTexto   = null;   // a cifra como veio, antes dos cortes
let qbColunas = 0;      // quantas colunas couberam no último desenho

(function qbEstilo() {
  const st = document.createElement("style");
  //  Quem quebra agora é este arquivo. Deixar o navegador quebrar
  //  também dobraria de novo o que já foi cortado.
  st.textContent = `#lyraCorpo .lyra-pre.quebra{white-space:pre;overflow-wrap:normal}`;
  document.head.appendChild(st);
})();

// ── quantas colunas cabem ───────────────────────────────────
//  A cifra usa fonte monoespaçada: toda letra tem a mesma
//  largura. Uma régua invisível de 60 zeros, no tamanho atual,
//  diz quanto mede uma; a largura livre do leitor diz quantas
//  cabem.
function qbMedirColunas() {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo || !corpo.clientWidth) return 0;
  const cs = getComputedStyle(corpo);
  const livre = corpo.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

  const regua = document.createElement("pre");
  regua.className = "lyra-pre";
  regua.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;white-space:pre;" +
    `font-size:${(LYRA_FONTE_BASE * lyraZoom / 100).toFixed(1)}px`;
  regua.textContent = "0".repeat(60);
  corpo.appendChild(regua);
  const letra = regua.getBoundingClientRect().width / 60;
  regua.remove();

  if (!letra || livre <= 0) return 0;
  //  Um pixel de folga contra arredondamento.
  return Math.max(16, Math.floor((livre - 1) / letra));
}

// ── cortes ──────────────────────────────────────────────────

//  Linha sozinha (letra sem acorde em cima, ou acordes sem letra
//  embaixo): corta entre palavras. Palavra maior que a tela fica
//  inteira — cortar no meio seria pior que rolar um pouco.
function qbCortarSimples(linha, n) {
  if (linha.length <= n) return [linha];
  const saida = [];
  let ini = 0;
  while (linha.length - ini > n) {
    let corte = -1;
    for (let k = ini + n; k > ini; k--) {
      if (linha[k] === " " && linha[k - 1] !== " ") { corte = k; break; }
    }
    if (corte < 0) break;
    saida.push(linha.slice(ini, corte).trimEnd());
    ini = corte;
    while (linha[ini] === " ") ini++;
  }
  if (ini < linha.length || !saida.length) saida.push(linha.slice(ini));
  return saida;
}

//  Acordes + letra: os dois cortados no mesmo ponto, para cada
//  acorde continuar em cima da sílaba dele.
function qbCortarPar(acordes, letra, n) {
  const total = Math.max(acordes.length, letra.length);
  const A = acordes.padEnd(total);
  const L = letra.padEnd(total);

  //  Onde cada acorde começa e termina: o corte nunca cai dentro.
  const blocos = [];
  A.replace(/\S+/g, (tk, i) => { blocos.push([i, i + tk.length]); return tk; });
  const partiria = k => blocos.some(([a, b]) => a < k && k < b);

  const saida = [];
  let ini = 0;
  while (ini < total) {
    let fim = total;
    if (total - ini > n) {
      fim = -1;
      //  primeiro, entre palavras da letra
      for (let k = ini + n; k > ini && fim < 0; k--)
        if (L[k] === " " && L[k - 1] !== " " && !partiria(k)) fim = k;
      //  sem espaço que sirva, onde ao menos não parta acorde
      for (let k = ini + n; k > ini && fim < 0; k--)
        if (!partiria(k)) fim = k;
      if (fim < 0) fim = ini + n;
    }

    const a = A.slice(ini, fim).trimEnd();
    const l = L.slice(ini, fim).trimEnd();
    if (a.trim()) saida.push([a, "lyra-acordes"]);
    if (l.trim()) saida.push([l, "lyra-letra"]);

    //  O pedaço de baixo começa na primeira coluna que tem algo,
    //  em cima ou embaixo.
    ini = fim;
    while (ini < total && A[ini] === " " && L[ini] === " ") ini++;
  }
  return saida;
}

// ── a cifra inteira ─────────────────────────────────────────

//  A mesma classificação do lyra.js, linha a linha.
function qbClasse(l) {
  return lyraEhSecao(l) ? "lyra-secao"
       : lyraEhLinhaDeAcorde(l) ? "lyra-acordes"
       : "lyra-letra";
}

//  Devolve as linhas já cortadas, cada uma com a classe da linha
//  de onde veio. Se tudo couber, devolve null e nada muda.
function qbRedistribuir(texto, n) {
  const linhas = texto.replace(/\r/g, "").split("\n").map(l => l.normalize("NFC"));
  if (!linhas.some(l => l.length > n)) return null;

  const itens = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const cls = qbClasse(l);
    const prox = linhas[i + 1];
    if (cls === "lyra-acordes" && prox !== undefined && prox.trim() &&
        qbClasse(prox) === "lyra-letra") {
      qbCortarPar(l, prox, n).forEach(([txt, c]) => itens.push({ txt, cls: c }));
      i++;
    } else {
      qbCortarSimples(l, n).forEach(txt => itens.push({ txt, cls }));
    }
  }
  return itens;
}

//  Mesmo HTML do lyra.js, com os botões de acorde do acordes.js.
//  A classe vem da linha original: um pedaço curto de acordes
//  continua sendo acorde, mesmo que sozinho não parecesse.
function qbHTML(itens) {
  return itens.map(({ txt, cls }) => {
    const esc = lyraEsc(txt) || " ";
    const dentro = cls === "lyra-acordes" && typeof acMarcarTokens === "function"
      ? acMarcarTokens(esc) : esc;
    return `<span class="${cls}">${dentro}</span>`;
  }).join("\n");
}

// ── enxertos ────────────────────────────────────────────────

const qbCifraOriginal = lyraCifraParaHTML;
lyraCifraParaHTML = function (texto, ...resto) {
  const emCifra = !!(lyraAtual && lyraAtual.modo === "cifra");
  if (emCifra) qbTexto = texto;
  qbColunas = emCifra && lyraQuebra ? qbMedirColunas() : 0;

  const itens = qbColunas ? qbRedistribuir(texto, qbColunas) : null;
  return itens ? qbHTML(itens) : qbCifraOriginal.call(this, texto, ...resto);
};

//  Refaz só o texto, sem buscar a música de novo e sem voltar ao
//  topo: o lugar da leitura é guardado como fração, como o
//  seguir.js faz.
function qbRedesenhar() {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo || !corpo.clientWidth) return;              // leitor fechado
  const pre = corpo.querySelector(".lyra-pre:not(.letra)");
  if (!pre || qbTexto === null || !lyraAtual || lyraAtual.modo !== "cifra") return;

  const quer = lyraQuebra ? qbMedirColunas() : 0;
  if (quer === qbColunas) return;                         // nada mudou

  const max = corpo.scrollHeight - corpo.clientHeight;
  const fracao = max > 0 ? corpo.scrollTop / max : 0;

  pre.innerHTML = lyraCifraParaHTML(qbTexto);

  corpo.scrollTop = Math.round(fracao * Math.max(0, corpo.scrollHeight - corpo.clientHeight));
  if (typeof snMedir === "function") snMedir();
  if (typeof acEsconderBalao === "function") acEsconderBalao();
}

//  O zoom e o botão de quebra passam por aqui.
const qbEstiloOriginal = lyraAplicarEstiloTexto;
lyraAplicarEstiloTexto = function (...a) {
  const r = qbEstiloOriginal.apply(this, a);
  qbRedesenhar();
  return r;
};

//  Girar a tela, arrastar a janela, abrir o menu ao lado ou o
//  painel do chat: tudo muda a largura do leitor.
function qbObservar() {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo || corpo.dataset.qb || typeof ResizeObserver === "undefined") return;
  corpo.dataset.qb = "1";
  let espera = null;
  new ResizeObserver(() => {
    clearTimeout(espera);
    espera = setTimeout(qbRedesenhar, 120);
  }).observe(corpo);
}

const qbMontarOriginal = lyraMontarEstrutura;
lyraMontarEstrutura = function (...a) {
  const r = qbMontarOriginal.apply(this, a);
  qbObservar();
  return r;
};
