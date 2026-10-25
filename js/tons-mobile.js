// ============================================================
//  TOM LOUVORES — campos de tom e ministrante
//  Todo lugar do site em que se escolhe um tom ou um ministrante
//  usa o mesmo campo e o mesmo painel:
//
//    · o CAMPO: uma pílula com o tom no selo dourado (o mesmo dos
//      louvores do culto) e quem canta ao lado. Antes cada tela
//      tinha o seu <select>, uns com seta, outros sem, e depois de
//      escolher aparecia o texto cru da lista ("A# · Todos").
//    · o PAINEL: no lugar da lista do sistema, que mostra 30 tons
//      numa coluna só, abre um painel com botões: tons maiores e
//      menores em grade, ou os nomes dos ministrantes.
//
//  O <select> de verdade continua na página, escondido: é dele que
//  o resto do código lê e escreve o valor, e o campo só o espelha.
//  Valor trocado por código (select.value = ...) também aparece,
//  porque o value de cada select atendido passa por aqui.
//
//  Os campos do culto são criados depois que a página abre, então
//  a escuta é no documento inteiro, não em cada campo.
// ============================================================
(() => {
  "use strict";

  //  Os campos atendidos. "todos" é o rótulo do valor vazio quando
  //  ele é uma escolha de verdade (filtros, tirar o ministrante);
  //  sem "todos", o vazio é só o texto do campo ainda não escolhido.
  const CAMPOS = {
    // editor de cifras
    "#tom":              { titulo: "Tom original" },
    "#ceTomMin":         { titulo: "Tom do ministrante" },
    "#ceMin":            { titulo: "Ministrante" },
    // culto: louvor aberto
    "#viewTomSel":       { titulo: "Tom neste culto" },
    "#viewTomNovoSel":   { titulo: "Tom" },
    "#viewMinNovoSel":   { titulo: "Ministrante" },
    // culto: adicionar louvor
    "#cTomEscolhido":    { titulo: "Tom" },
    "#cultoNovoTomSel":  { titulo: "Tom" },
    "#cultoNovoMinSel":  { titulo: "Ministrante" },
    "#cNovoTom":         { titulo: "Tom" },
    "#cNovoMin":         { titulo: "Ministrante" },
    // música (formulário antigo) e cifra integrada
    "#fTom":             { titulo: "Tom" },
    "#fMin":             { titulo: "Ministrante" },
    "#cifraTomIntegrado":{ titulo: "Tom original" },
    // filtros do repertório
    "#filtroMin":        { titulo: "Ministrante", todos: "Todos os ministrantes", vazio: "Ministrantes" },
    "#filtroTom":        { titulo: "Tom", todos: "Todos os tons", vazio: "Tons" },
    "#filtroCantor":     { titulo: "Cantor", todos: "Todos os cantores", vazio: "Cantores", busca: "Procurar cantor" },
    // ministrante escalado no culto
    "select.culto-escala-sel": { titulo: "Ministrante do culto", todos: "Ninguém escalado", vazio: "Escalar", compacto: true },
  };
  const SELETOR = Object.keys(CAMPOS).map(s => s.startsWith("#") ? "select" + s : s).join(",");

  function config(select) {
    for (const s in CAMPOS) {
      if (select.matches(s.startsWith("#") ? "select" + s : s)) return CAMPOS[s];
    }
    return { titulo: "Escolher" };
  }

  const simbolo = t => t.replace(/([A-G])b/g, "$1♭");
  const ehTom = v => /^([A-G][#b]?m?|Orig\.)$/.test(v);
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  //  O selo do tom: "m" menor um pouco menor, como no resto do site
  const seloTom = t => `<span class="tl-campo-tom">${esc(simbolo(t)).replace(/m$/, '<span class="tom-m">m</span>')}</span>`;

  const SETA = `<svg class="tl-campo-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

  // ============================================================
  //  O CAMPO
  // ============================================================

  //  O que o campo mostra para a opção escolhida
  function conteudo(select) {
    const cfg = config(select);
    const op = select.selectedOptions && select.selectedOptions[0];
    const valor = op ? op.value : "";
    const texto = op ? op.textContent.trim() : "";

    if (!valor) {
      const rotulo = cfg.vazio || texto || cfg.titulo;
      return `<span class="tl-campo-vazio">${esc(rotulo)}</span>`;
    }
    //  "Gm · Todos": o tom no selo, quem canta ao lado
    const partes = texto.split(" · ");
    if (ehTom(valor) || ehTom(partes[0])) {
      const tom = ehTom(partes[0]) ? partes[0] : valor;
      const quem = partes.length > 1 ? partes.slice(1).join(" · ") : "";
      return seloTom(tom) + (quem ? `<span class="tl-campo-quem">${esc(quem)}</span>` : "");
    }
    //  "Fernandinho · 5 músicas": o nome, e o resto mais apagado
    return `<span class="tl-campo-nome">${esc(partes[0])}</span>` +
      (partes.length > 1 ? `<span class="tl-campo-quem">${esc(partes.slice(1).join(" · "))}</span>` : "");
  }

  function desenhar(select) {
    const campo = select._tlCampo;
    if (!campo) return;
    campo.innerHTML = `<span class="tl-campo-valor">${conteudo(select)}</span>${SETA}`;
    campo.disabled = select.disabled;
    //  código que esconde o select pelo style também esconde o campo
    campo.style.display = select.style.display === "none" ? "none" : "";
    campo.classList.toggle("tl-campo-escolhido", !!select.value);
  }

  //  Valor trocado por código não dispara "change": o value e o
  //  selectedIndex deste select passam por aqui antes de chegar ao
  //  do navegador, e o campo é redesenhado na hora.
  function vigiarValor(select) {
    ["value", "selectedIndex"].forEach(prop => {
      const nativo = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      Object.defineProperty(select, prop, {
        configurable: true,
        get() { return nativo.get.call(this); },
        set(v) { nativo.set.call(this, v); desenhar(this); },
      });
    });
  }

  function melhorar(select) {
    if (select._tlCampo || select.multiple) return;
    const cfg = config(select);

    const campo = document.createElement("button");
    campo.type = "button";
    //  as classes do select vão junto: é com elas que cada tela
    //  encaixa o campo (largura, flex). O visual é do .tl-campo.
    campo.className = (select.className + " tl-campo" + (cfg.compacto ? " tl-campo-compacto" : "")).trim();
    campo.setAttribute("aria-haspopup", "dialog");
    campo.setAttribute("aria-label", cfg.titulo);
    campo.addEventListener("click", () => abrir(select));

    select._tlCampo = campo;
    select.classList.add("tl-campo-original");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");
    select.after(campo);

    //  um <label for> continua levando ao campo
    if (select.id) {
      document.querySelectorAll(`label[for="${CSS.escape(select.id)}"]`).forEach(l => {
        l.addEventListener("click", e => { e.preventDefault(); campo.focus(); });
      });
    }

    vigiarValor(select);
    new MutationObserver(() => desenhar(select)).observe(select, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["disabled", "style", "selected"],
    });
    desenhar(select);
  }

  //  Campo novo na página (os do culto nascem a cada abertura de
  //  modal, o do ministrante a cada desenho dos cultos)
  let agendado = false;
  function procurar() {
    agendado = false;
    document.querySelectorAll(SELETOR).forEach(melhorar);
  }
  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(procurar);
  }

  document.addEventListener("change", e => {
    if (e.target && e.target._tlCampo) desenhar(e.target);
  }, true);

  // ============================================================
  //  O PAINEL
  // ============================================================

  function abrir(select) {
    if (document.getElementById("tlPainelTons") || select.disabled) return;
    const cfg = config(select);
    const campo = select._tlCampo;

    const overlay = document.createElement("div");
    overlay.id = "tlPainelTons";
    overlay.className = "tl-tons-overlay";

    const painel = document.createElement("div");
    painel.className = "tl-tons-painel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "true");
    painel.setAttribute("aria-label", cfg.titulo);

    const topo = document.createElement("div");
    topo.className = "tl-tons-topo";
    const h = document.createElement("strong");
    h.textContent = cfg.titulo;
    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "tl-tons-fechar";
    fechar.textContent = "✕";
    fechar.setAttribute("aria-label", "Fechar");
    topo.append(h, fechar);
    painel.appendChild(topo);

    //  Só opções de verdade: "Ministrante" e "Tom" vazios são rótulo.
    const opcoes = Array.from(select.options)
      .filter(o => o.value && !o.disabled)
      .map(o => ({ valor: o.value, texto: o.textContent.trim() }));

    function botao(item) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tl-tons-opcao";
      btn.dataset.valor = item.valor;
      //  "Gm · Todos" (tom com quem canta): o tom grande, o resto menor
      const partes = item.texto.split(" · ");
      if (partes.length > 1) {
        btn.classList.add("com-quem");
        btn.innerHTML = `<b></b><small></small>`;
        btn.querySelector("b").textContent = ehTom(partes[0]) ? simbolo(partes[0]) : partes[0];
        btn.querySelector("small").textContent = partes.slice(1).join(" · ");
      } else {
        btn.textContent = ehTom(item.valor) ? simbolo(item.texto) : item.texto;
      }
      if (select.value === item.valor) {
        btn.classList.add("selecionado");
        btn.setAttribute("aria-pressed", "true");
      }
      btn.addEventListener("click", () => {
        select.value = item.valor;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        encerrar();
      });
      return btn;
    }

    function grupo(nome, lista, classe) {
      if (!lista.length) return;
      if (nome) {
        const sub = document.createElement("div");
        sub.className = "tl-tons-subtitulo";
        sub.textContent = nome;
        painel.appendChild(sub);
      }
      const grade = document.createElement("div");
      grade.className = "tl-tons-grade" + (classe ? " " + classe : "");
      lista.forEach(item => grade.appendChild(botao(item)));
      painel.appendChild(grade);
    }

    //  Lista comprida (os cantores): uma busca no topo do painel
    let busca = null;
    if (cfg.busca) {
      busca = document.createElement("input");
      busca.type = "search";
      busca.className = "tl-tons-busca";
      busca.placeholder = cfg.busca;
      busca.setAttribute("aria-label", cfg.busca);
      busca.autocomplete = "off";
      painel.appendChild(busca);
      const semAcento = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      busca.addEventListener("input", () => {
        const q = semAcento(busca.value.trim());
        painel.querySelectorAll(".tl-tons-opcao").forEach(b => {
          if (!b.dataset.valor) return;   // "Todos" fica sempre
          b.hidden = !!q && !semAcento(b.dataset.valor).includes(q);
        });
      });
    }

    //  "Todos os tons", "Ninguém escalado": o vazio como escolha
    if (cfg.todos) grupo("", [{ valor: "", texto: cfg.todos }], "tl-tons-largo");

    //  Tons sempre na ordem das notas (C, C#, D…), venha a lista
    //  do jeito que vier: o filtro do repertório vinha em ordem
    //  alfabética (A, A#, B, C…).
    const NOTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const altura = v => {
      const m = /^([A-G])([#b]?)/.exec(v);
      return m ? (NOTA[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12 : -1;
    };
    const porNota = lista => lista.slice().sort((x, y) => altura(x.valor) - altura(y.valor));

    const soTons = opcoes.length > 0 && opcoes.every(o => ehTom(o.valor));
    const comQuem = opcoes.some(o => o.texto.includes(" · "));
    if (soTons && !comQuem && opcoes.length > 8) {
      grupo("", opcoes.filter(o => o.valor === "Orig."), "tl-tons-largo");
      grupo("Tons maiores", porNota(opcoes.filter(o => o.valor !== "Orig." && !/m$/.test(o.valor))));
      grupo("Tons menores", porNota(opcoes.filter(o => /m$/.test(o.valor))));
    } else {
      //  Ministrantes, ou os poucos tons já cadastrados na música.
      grupo("", opcoes, comQuem ? "tl-tons-lista" : "tl-tons-nomes");
    }

    function encerrar() {
      document.removeEventListener("keydown", tecla, true);
      overlay.remove();
      document.body.classList.remove("tl-tons-aberto");
      (campo || select).focus({ preventScroll: true });
    }
    function tecla(e) { if (e.key === "Escape") { e.stopPropagation(); encerrar(); } }

    fechar.addEventListener("click", encerrar);
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) encerrar(); });
    document.addEventListener("keydown", tecla, true);

    overlay.appendChild(painel);
    document.body.appendChild(overlay);
    document.body.classList.add("tl-tons-aberto");
    //  com busca, o foco vai para ela só no computador: no celular o
    //  teclado subiria por cima da lista antes de a pessoa querer
    if (busca && matchMedia("(pointer: fine)").matches) busca.focus();
    else (painel.querySelector(".tl-tons-opcao.selecionado") || fechar).focus();
  }

  //  Rede de segurança: um toque no select escondido (se algum dia
  //  ele aparecer) abre o painel em vez da lista do sistema.
  let abrindo = false;
  function interceptar(e) {
    const select = e.target.closest && e.target.closest(SELETOR);
    if (!select || select.disabled) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    if (abrindo || document.getElementById("tlPainelTons")) return;
    abrindo = true;
    setTimeout(() => { abrindo = false; abrir(select); }, 0);
  }
  document.addEventListener("pointerdown", interceptar, true);
  document.addEventListener("mousedown", interceptar, true);
  document.addEventListener("click", interceptar, true);
  document.addEventListener("keydown", interceptar, true);

  function iniciar() {
    procurar();
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
