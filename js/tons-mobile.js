// ============================================================
//  TOM LOUVORES — painel de escolha (tons e ministrantes)
//  No lugar da lista do sistema, que mostra 30 tons numa coluna
//  só, abre um painel com botões: tons maiores e menores em grade,
//  ou os nomes dos ministrantes. Vale em qualquer tela.
//
//  Campos atendidos:
//    · editor: Tom original, Ministrante, Tom do ministrante
//    · culto (modal da música): Tom neste culto, Cadastrar outro
//      tom (tom + ministrante)
//    · culto (adicionar louvor): Tom, Cadastrar outro tom
//
//  Os campos do culto são criados depois que a página abre, então
//  a escuta é no documento inteiro, não em cada campo.
// ============================================================
(() => {
  "use strict";

  const TITULOS = {
    tom: "Tom original",
    ceTomMin: "Tom do ministrante",
    ceMin: "Ministrante",
    viewTomSel: "Tom neste culto",
    viewTomNovoSel: "Tom",
    viewMinNovoSel: "Ministrante",
    cultoNovoTomSel: "Tom",
    cultoNovoMinSel: "Ministrante",
    cTomEscolhido: "Tom",
  };
  const SELETOR = Object.keys(TITULOS).map(id => "select#" + id).join(",");

  const simbolo = t => t.replace(/([A-G])b/g, "$1♭");
  const ehTom = v => /^([A-G][#b]?m?|Orig\.)$/.test(v);

  function abrir(select) {
    if (document.getElementById("tlPainelTons")) return;

    const overlay = document.createElement("div");
    overlay.id = "tlPainelTons";
    overlay.className = "tl-tons-overlay";

    const painel = document.createElement("div");
    painel.className = "tl-tons-painel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "true");
    painel.setAttribute("aria-label", TITULOS[select.id] || "Escolher");

    const topo = document.createElement("div");
    topo.className = "tl-tons-topo";
    const h = document.createElement("strong");
    h.textContent = TITULOS[select.id] || "Escolher";
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
      //  "Gm · Todos" (tom com quem canta): o tom grande, o resto menor
      const partes = item.texto.split(" · ");
      if (partes.length > 1) {
        btn.classList.add("com-quem");
        btn.innerHTML = `<b></b><small></small>`;
        btn.querySelector("b").textContent = simbolo(partes[0]);
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
        select.focus({ preventScroll: true });
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

    const soTons = opcoes.length > 0 && opcoes.every(o => ehTom(o.valor));
    const comQuem = opcoes.some(o => o.texto.includes(" · "));
    if (soTons && !comQuem && opcoes.length > 8) {
      grupo("", opcoes.filter(o => o.valor === "Orig."), "tl-tons-largo");
      grupo("Tons maiores", opcoes.filter(o => o.valor !== "Orig." && !/m$/.test(o.valor)));
      grupo("Tons menores", opcoes.filter(o => /m$/.test(o.valor)));
    } else {
      //  Ministrantes, ou os poucos tons já cadastrados na música.
      grupo("", opcoes, comQuem ? "tl-tons-lista" : "tl-tons-nomes");
    }

    function encerrar() {
      document.removeEventListener("keydown", tecla, true);
      overlay.remove();
      document.body.classList.remove("tl-tons-aberto");
    }
    function tecla(e) { if (e.key === "Escape") { e.stopPropagation(); encerrar(); } }

    fechar.addEventListener("click", encerrar);
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) encerrar(); });
    document.addEventListener("keydown", tecla, true);

    overlay.appendChild(painel);
    document.body.appendChild(overlay);
    document.body.classList.add("tl-tons-aberto");
    (painel.querySelector(".tl-tons-opcao.selecionado") || fechar).focus();
  }

  //  Um toque no campo abre o painel em vez da lista do sistema.
  let agendado = false;
  function interceptar(e) {
    const select = e.target.closest && e.target.closest(SELETOR);
    if (!select || select.disabled) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    if (agendado || document.getElementById("tlPainelTons")) return;
    agendado = true;
    setTimeout(() => { agendado = false; abrir(select); }, 0);
  }
  document.addEventListener("pointerdown", interceptar, true);
  document.addEventListener("mousedown", interceptar, true);
  document.addEventListener("click", interceptar, true);
  document.addEventListener("keydown", interceptar, true);
})();
