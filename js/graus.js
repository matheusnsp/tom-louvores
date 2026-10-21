// ============================================================
// TOM LOUVORES — cifras por graus (numerais relativos ao tom)
// Carregar DEPOIS de lyra.js, acordes.js, quebra.js e leitor-palco.js.
// Não altera os acordes originais, nem o data-ac dos botões sonoros.
// ============================================================
(function () {
  "use strict";

  if (typeof lyraMontarEstrutura !== "function" ||
      typeof lyraCifraParaHTML !== "function" ||
      typeof lyraPc !== "function") return;

  const PREF = "tom-louvores-graus-v1";
  let emGraus = false;
  try { emGraus = localStorage.getItem(PREF) === "1"; }
  catch (_) { /* no modo privado, funciona sem salvar */ }

  const LETRAS = "CDEFGAB";
  const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];

  // Relaciona a nota à tônica por grau DIATÔNICO, e não só por semitom:
  // em C, C# é #1 e Db é b2; em Am, C é b3; em F, Bb é 4.
  function grauDaNota(nota, tom) {
    const raizTom = (typeof lyraPartesTom === "function"
      ? lyraPartesTom(tom).raiz : String(tom).replace(/m$/, ""));
    if (!/^[A-G][#b]?$/.test(nota) || !/^[A-G][#b]?$/.test(raizTom)) return null;

    const notaPc = lyraPc(nota), tomPc = lyraPc(raizTom);
    if (notaPc === null || tomPc === null) return null;

    const posTom = LETRAS.indexOf(raizTom[0]);
    const posNota = LETRAS.indexOf(nota[0]);
    const indice = (posNota - posTom + 7) % 7;
    const semitons = (notaPc - tomPc + 12) % 12;
    let alteracao = semitons - ESCALA_MAIOR[indice];
    if (alteracao > 6) alteracao -= 12;
    if (alteracao < -6) alteracao += 12;

    return (alteracao < 0 ? "b".repeat(-alteracao) : "#".repeat(alteracao)) + (indice + 1);
  }

  // Preserva qualidade e tensões: Am7 -> 6m7, G7 -> 5⁷,
  // G/B -> 5/7, F#m7/C# -> #4m7/#1 (em C).
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

    // "5⁷" evita a leitura ambígua de "57" para o dominante.
    // Os demais sufixos conservam a grafia da cifra original.
    if (resto === "7") resto = "⁷";
    else if (/^(dim|°|º)$/i.test(resto)) resto = "°";

    return grau + resto + (baixo ? "/" + baixo : "");
  }

  function grauAtivoNoLeitor() {
    return emGraus && typeof lyraAtual !== "undefined" && lyraAtual &&
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
    controle.style.display = (typeof lyraAtual !== "undefined" && lyraAtual &&
      lyraAtual.modo === "cifra" && lyraAtual.song) ? "" : "none";
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
    barra.insertBefore(grupo, barra.children[1] || null);
    grupo.querySelectorAll("button[data-graus]").forEach(botao => {
      botao.addEventListener("click", () => escolherGraus(botao.dataset.graus === "sim"));
    });
    atualizarSeletor();
    return res;
  };

  const aplicarModoOriginal = lyraAplicarModo;
  lyraAplicarModo = function (...args) {
    const res = aplicarModoOriginal.apply(this, args);
    atualizarSeletor();
    return res;
  };

  // Pode ser útil para testes e futuras melhorias; não dá acesso
  // a nenhuma informação do banco ou do usuário.
  window.tomLouvoresGraus = Object.freeze({ grauDaNota, grauDoAcorde });
})();
