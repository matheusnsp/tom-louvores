// ============================================================
// TOM LOUVORES — cifras por graus (Nashville Number System)
// Carregar DEPOIS de lyra.js, acordes.js, quebra.js e leitor-palco.js.
// Não altera os acordes originais, nem o data-ac dos botões sonoros.
//
// Convenção:
//  - Tom MAIOR: 1 = tônica do tom.
//  - Tom MENOR: 1 = tônica do RELATIVO MAIOR (Am -> C = 1, Am = 6m).
//    Assim os acordes do campo harmônico natural ficam sem bemol.
//  - Maior = número puro (1, 4, 5); menor = "m" colado (6m, 2m, 3m).
//  - Acidentes ANTES do número (b7, #5).
//  - Diminuto: símbolo colado (#5°).
//  - Extensões SEMPRE entre parênteses: 5(7), 4(maj7), 6m(7), 1(add9), 5(sus4).
//  - Inversões: 1/3, 5/7.
// ============================================================
(function () {
  "use strict";

  if (typeof lyraMontarEstrutura !== "function" ||
      typeof lyraCifraParaHTML !== "function" ||
      typeof lyraPc !== "function") return;

  const PREF = "tom-louvores-graus-v2";
  let emGraus = false;
  try { emGraus = localStorage.getItem(PREF) === "1"; }
  catch (_) { /* no modo privado, funciona sem salvar */ }

  const LETRAS = "CDEFGAB";
  const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];

  // ---------- Tom ----------

  function tomEhMenor(tom) {
    if (typeof lyraPartesTom === "function") {
      try {
        const p = lyraPartesTom(tom);
        if (p && typeof p.menor === "boolean") return p.menor;
        if (p && typeof p.minor === "boolean") return p.minor;
      } catch (_) { /* cai no teste simples abaixo */ }
    }
    return /m$/.test(String(tom));
  }

  function raizDoTom(tom) {
    if (typeof lyraPartesTom === "function") {
      try {
        const p = lyraPartesTom(tom);
        if (p && p.raiz) return p.raiz;
      } catch (_) { /* cai no teste simples abaixo */ }
    }
    return String(tom).replace(/m$/, "");
  }

  // Relativo maior de uma tônica menor, com a grafia correta:
  // A -> C, F# -> A, Bb -> Db, C# -> E.
  function relativoMaior(raizMenor) {
    const letra = LETRAS[(LETRAS.indexOf(raizMenor[0]) + 2) % 7];
    const alvoPc = (lyraPc(raizMenor) + 3) % 12;
    let alt = (alvoPc - lyraPc(letra) + 12) % 12;
    if (alt > 6) alt -= 12;
    return letra + (alt < 0 ? "b".repeat(-alt) : "#".repeat(alt));
  }

  // Tônica usada como "1": a do tom (maior) ou a do relativo maior (menor).
  function tonicaDeReferencia(tom) {
    const raiz = raizDoTom(tom);
    if (!/^[A-G][#b]?$/.test(raiz)) return null;
    return tomEhMenor(tom) ? relativoMaior(raiz) : raiz;
  }

  // ---------- Nota -> grau ----------

  // Relaciona a nota à tônica por grau DIATÔNICO, e não só por semitom:
  // em C, C# é #1 e Db é b2; em F, Bb é 4.
  function grauDaNota(nota, tom) {
    const ref = tonicaDeReferencia(tom);
    if (!ref || !/^[A-G][#b]?$/.test(nota)) return null;

    const notaPc = lyraPc(nota), tomPc = lyraPc(ref);
    if (notaPc === null || tomPc === null) return null;

    const posTom = LETRAS.indexOf(ref[0]);
    const posNota = LETRAS.indexOf(nota[0]);
    const indice = (posNota - posTom + 7) % 7;
    const semitons = (notaPc - tomPc + 12) % 12;
    let alteracao = semitons - ESCALA_MAIOR[indice];
    if (alteracao > 6) alteracao -= 12;
    if (alteracao < -6) alteracao += 12;

    return (alteracao < 0 ? "b".repeat(-alteracao) : "#".repeat(alteracao)) + (indice + 1);
  }

  // ---------- Sufixo ----------

  // Normaliza uma extensão: 7M / M7 / Δ7 / M -> maj7 / maj
  function normalizarExtensao(p) {
    if (p === "7M") return "maj7";
    const m = p.match(/^(?:maj|Maj|M|Δ)(\d*)$/);
    return m ? "maj" + m[1] : p;
  }

  // "m7" -> "m(7)"; "7M(9)" -> "(maj7)(9)"; "sus4" -> "(sus4)"; "dim7" -> "°(7)"
  function formatarSufixo(resto) {
    if (!resto) return "";

    let qualidade = "";
    const dim = resto.match(/^(dim|°|º)/i);
    if (dim) {
      qualidade = "°";
      resto = resto.slice(dim[0].length);
    } else {
      const men = resto.match(/^(min|m)(?!aj)/);
      if (men) {
        qualidade = "m";
        resto = resto.slice(men[0].length);
      }
    }

    // "G4" na cifra de louvor significa sus4.
    if (resto === "4") resto = "sus4";

    const partes = [];
    const re = /7M|(?:maj|Maj|M|Δ)\d*|add[b#]?\d+|sus\d*|aug|\+|[b#]\d+|\d+|\(([^)]*)\)/y;
    let pos = 0;
    while (pos < resto.length) {
      re.lastIndex = pos;
      const m = re.exec(resto);
      if (!m) return qualidade + "(" + resto.slice(pos) + ")"; // não reconhecido: isola como veio
      partes.push(m[1] !== undefined ? m[1] : m[0]);
      pos = re.lastIndex;
    }

    return qualidade + partes.map(p => "(" + normalizarExtensao(p) + ")").join("");
  }

  // ---------- Acorde -> grau ----------

  // Exemplos (tom C ou Am): Am7 -> 6m(7), G7 -> 5(7), F7M(9) -> 4(maj7)(9),
  // G4 -> 5(sus4), G/B -> 5/7, G#° -> #5°.
  function grauDoAcorde(acorde, tom) {
    if (!acorde || !tom ||
        (typeof LYRA_RE_ACORDE !== "undefined" && !LYRA_RE_ACORDE.test(acorde))) return null;
    const raiz = acorde.match(/^([A-G][#b]?)/);
    if (!raiz) return null;
    const grau = grauDaNota(raiz[1], tom);
    if (!grau) return null;

    let resto = acorde.slice(raiz[1].length);
    let baixo = "";
    const invertido = resto.match(/\/([A-G][#b]?)$/);
    if (invertido) {
      baixo = grauDaNota(invertido[1], tom);
      if (!baixo) return null;
      resto = resto.slice(0, -invertido[0].length);
    }

    return grau + formatarSufixo(resto) + (baixo ? "/" + baixo : "");
  }

  // ---------- Integração com o leitor ----------

  //  A escolha mora no aparelho, não na página. Antes ela era lida
  //  uma vez só, ao carregar: ligar Graus no Repertório e voltar para
  //  Cultos (o iPhone devolve a página antiga da memória, sem
  //  recarregar) deixava as outras músicas em acordes. Agora cada
  //  desenho relê a escolha.
  function lerPreferencia() {
    try { emGraus = localStorage.getItem(PREF) === "1"; }
    catch (_) { /* modo privado: fica o valor da sessão */ }
    return emGraus;
  }

  function grauAtivoNoLeitor() {
    return lerPreferencia() && typeof lyraAtual !== "undefined" && lyraAtual &&
      lyraAtual.song && lyraAtual.modo === "cifra";
  }

  // Na montagem inicial, preserva data-ac="G/B": o som, diagramas,
  // piano, pedal, atalhos e demais comportamentos recebem o acorde REAL.
  const cifraOriginal = lyraCifraParaHTML;
  lyraCifraParaHTML = function (...args) {
    const html = cifraOriginal.apply(this, args);
    if (!grauAtivoNoLeitor()) return html;
    const tom = lyraAtual.tom;
    return html.replace(
      /(<button type="button" class="ac-tk" data-ac=")([^"]+)(">)([^<]*)(<\/button>)/g,
      (tudo, inicio, acorde, meio, visivel, fim) => {
        const convertido = grauDoAcorde(acorde, tom);
        return convertido === null ? tudo : inicio + acorde + meio + convertido + fim;
      }
    );
  };

  // Alteração instantânea durante o culto: não baixa de novo a cifra,
  // não volta para o topo, não perde a página nem a marca do mapa.
  function atualizarAcordesVisiveis() {
    const tom = typeof lyraAtual !== "undefined" && lyraAtual && lyraAtual.tom;
    document.querySelectorAll("#lyraCorpo button.ac-tk").forEach(botao => {
      const acorde = botao.dataset.ac;
      if (!acorde) return;
      const convertido = grauAtivoNoLeitor() ? grauDoAcorde(acorde, tom) : null;
      botao.textContent = convertido === null ? acorde : convertido;
      if (convertido === null) {
        botao.removeAttribute("aria-label");
        botao.removeAttribute("title");
      } else {
        botao.setAttribute("aria-label", `Grau ${convertido}, acorde ${acorde}`);
        botao.title = acorde;
      }
    });
  }

  function atualizarSeletor() {
    const controle = document.getElementById("lyraGrausGrupo");
    if (!controle) return;
    const disponivel = !!(typeof lyraAtual !== "undefined" && lyraAtual &&
      lyraAtual.modo === "cifra" && lyraAtual.song);
    controle.style.display = disponivel ? "" : "none";
    // No menu lateral, esconda a linha inteira ao trocar para Letra.
    const linha = document.getElementById("opLinhaGraus");
    if (linha) linha.style.display = disponivel ? "" : "none";
    controle.querySelectorAll("button[data-graus]").forEach(botao => {
      const selecionado = (botao.dataset.graus === "sim") === emGraus;
      botao.classList.toggle("on", selecionado);
      botao.setAttribute("aria-pressed", String(selecionado));
    });
  }

  function escolherGraus(ativar) {
    emGraus = !!ativar;
    try { localStorage.setItem(PREF, emGraus ? "1" : "0"); }
    catch (_) { /* mantém a escolha durante esta sessão */ }
    atualizarSeletor();
    atualizarAcordesVisiveis();
  }

  const montarOriginal = lyraMontarEstrutura;
  lyraMontarEstrutura = function (...args) {
    const res = montarOriginal.apply(this, args);
    if (document.getElementById("lyraGrausGrupo")) return res;

    const barra = document.querySelector("#lyraOverlay .lyra-barra");
    if (!barra) return res;

    const grupo = document.createElement("div");
    grupo.className = "lyra-grupo lyra-graus-grupo";
    grupo.id = "lyraGrausGrupo";
    grupo.innerHTML = `<div class="lyra-seg" role="group" aria-label="Notação dos acordes">
      <button type="button" data-graus="nao">Acordes</button>
      <button type="button" data-graus="sim">Graus</button>
    </div>`;
    const estilo = document.createElement("style");
    estilo.textContent = `.lyra-graus-grupo{flex:0 1 auto}
      .lyra-graus-grupo .lyra-seg button{padding:0 14px}
      @media(max-width:600px){.lyra-graus-grupo{flex:1 1 100%}
      .lyra-graus-grupo .lyra-seg{width:100%}}`;
    document.head.appendChild(estilo);
    // Deixe o controle original de tamanho ANTES do de graus.
    // opcoes.js procura o primeiro segmento livre ao montar "Tamanho";
    // inseri-lo antes fazia o menu capturar os graus por engano.
    barra.appendChild(grupo);
    grupo.querySelectorAll("button[data-graus]").forEach(botao => {
      botao.addEventListener("click", () => escolherGraus(botao.dataset.graus === "sim"));
    });
    atualizarSeletor();
    return res;
  };

  // opcoes.js move os controles reais da barra para o menu lateral.
  // Depois dessa montagem, colocamos os graus em sua PRÓPRIA linha,
  // sem roubar os botões de tamanho (A-, porcentagem, A+).
  if (typeof opMontar === "function" && typeof opLinha === "function") {
    const montarOpcoesOriginal = opMontar;
    opMontar = function (...args) {
      const resultado = montarOpcoesOriginal.apply(this, args);
      const painel = document.getElementById("opPainel");
      const grupo = document.getElementById("lyraGrausGrupo");
      if (painel && grupo && !document.getElementById("opLinhaGraus")) {
        const tamanho = [...painel.querySelectorAll(".op-linha")].find(linha =>
          linha.querySelector(".op-nome")?.textContent?.trim() === "Tamanho");
        if (tamanho?.parentElement) {
          const linha = opLinha(
            typeof OP_ICO !== "undefined" ? OP_ICO.texto : "",
            "Notação", grupo, "opLinhaGraus", "Acordes ou graus");
          tamanho.parentElement.insertBefore(linha, tamanho);
        }
      }
      atualizarSeletor();
      return resultado;
    };
  }

  const aplicarModoOriginal = lyraAplicarModo;
  lyraAplicarModo = function (...args) {
    const res = aplicarModoOriginal.apply(this, args);
    atualizarSeletor();
    return res;
  };

  //  Voltou para uma página guardada na memória, ou mudou em outra
  //  aba: o seletor e a cifra aberta acompanham na hora.
  function sincronizar() {
    lerPreferencia();
    atualizarSeletor();
    atualizarAcordesVisiveis();
  }
  window.addEventListener("pageshow", sincronizar);
  window.addEventListener("storage", e => { if (e.key === PREF) sincronizar(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar(); });

  // Útil para testes; não dá acesso a nenhuma informação do banco ou do usuário.
  window.tomLouvoresGraus = Object.freeze({ grauDaNota, grauDoAcorde, formatarSufixo, relativoMaior, tonicaDeReferencia });
})();