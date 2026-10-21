(() => {
  "use strict";

  const IDs = ["tom", "ceTomMin"];
  const breakpoint = 1024;

  const simbolo = t => t.replace(/b/g, "♭");

  function abrir(select) {
    if (document.getElementById("tlPainelTons")) return;

    const overlay = document.createElement("div");
    overlay.id = "tlPainelTons";
    overlay.className = "tl-tons-overlay";

    const painel = document.createElement("div");
    painel.className = "tl-tons-painel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "true");
    painel.setAttribute("aria-label", "Escolher tonalidade");

    const titulo = document.createElement("div");
    titulo.className = "tl-tons-topo";

    const h = document.createElement("strong");
    h.textContent = select.id === "tom"
      ? "Tom original"
      : "Tom do ministrante";

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "tl-tons-fechar";
    fechar.textContent = "✕";
    fechar.setAttribute("aria-label", "Fechar");

    titulo.append(h, fechar);
    painel.appendChild(titulo);

    const opcoes = Array.from(select.options)
      .filter(o => o.value)
      .map(o => ({
        valor: o.value,
        menor: /m$/.test(o.value)
      }));

    function grupo(nome, menores) {
      const lista = opcoes.filter(o => o.menor === menores);
      if (!lista.length) return;

      const subtitulo = document.createElement("div");
      subtitulo.className = "tl-tons-subtitulo";
      subtitulo.textContent = nome;
      painel.appendChild(subtitulo);

      const grade = document.createElement("div");
      grade.className = "tl-tons-grade";

      for (const item of lista) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tl-tons-opcao";
        btn.textContent = simbolo(item.valor);

        if (select.value === item.valor) {
          btn.classList.add("selecionado");
          btn.setAttribute("aria-pressed", "true");
        }

        btn.addEventListener("click", () => {
          select.value = item.valor;
          select.dispatchEvent(
            new Event("change", { bubbles: true })
          );
          encerrar();
          select.focus({ preventScroll: true });
        });

        grade.appendChild(btn);
      }

      painel.appendChild(grade);
    }

    grupo("Tons maiores", false);
    grupo("Tons menores", true);

    function encerrar() {
      document.removeEventListener("keydown", tecla);
      overlay.remove();
      document.body.classList.remove("tl-tons-aberto");
    }

    function tecla(e) {
      if (e.key === "Escape") encerrar();
    }

    fechar.addEventListener("click", encerrar);

    overlay.addEventListener("pointerdown", e => {
      if (e.target === overlay) encerrar();
    });

    document.addEventListener("keydown", tecla);

    overlay.appendChild(painel);
    document.body.appendChild(overlay);
    document.body.classList.add("tl-tons-aberto");
    fechar.focus();
  }

  function iniciar() {
    for (const id of IDs) {
      const select = document.getElementById(id);
      if (!select) continue;

      let aberturaAgendada = false;

      function agendarAbertura(e) {
        if (window.innerWidth > breakpoint) return;

        e.preventDefault();
        e.stopPropagation();

        if (aberturaAgendada ||
            document.getElementById("tlPainelTons")) return;

        aberturaAgendada = true;

        // Cria o painel depois do evento original.
        setTimeout(() => {
          aberturaAgendada = false;
          abrir(select);
        }, 0);
      }

      select.addEventListener("pointerdown", agendarAbertura, true);
      select.addEventListener("click", agendarAbertura, true);

      select.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        agendarAbertura(e);
      });

    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
