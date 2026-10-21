(function () {
  "use strict";

  function organizar() {
    const select = document.getElementById("tom");
    const indicador = document.getElementById("resultado");
    const cifra = document.getElementById("cifra");

    if (!select || !indicador || !cifra) return;

    const corpo = cifra.closest(".ce-panel-body");
    const labelCifra = corpo?.querySelector('label[for="cifra"]');
    const campoTom = select.closest(".ce-field");

    if (!corpo || !labelCifra || !campoTom) return;

    if (corpo.querySelector(".ce-editor-toolbar-final")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "ce-editor-toolbar-final";

    const status = document.createElement("div");
    status.className = "ce-editor-status-final";

    // Move os elementos verdadeiros. Não cria cópias.
    toolbar.appendChild(campoTom);
    status.appendChild(indicador);
    toolbar.appendChild(status);

    corpo.insertBefore(toolbar, labelCifra);

    // Remove apenas contêineres antigos que ficaram vazios.
    corpo.querySelectorAll(".ce-keyline, .ce-cifra-layout").forEach(el => {
      if (!el.contains(select) && !el.contains(indicador) &&
          !el.querySelector("input,select,textarea")) {
        el.remove();
      }
    });

    // Indicadores decorativos restantes não são necessários.
    corpo.querySelectorAll(".ce-keyline").forEach(el => {
      if (!el.contains(indicador)) el.remove();
    });

    const atualizarStatus = () => {
      const texto = indicador.textContent.trim();
      status.hidden = !texto ||
        texto.includes("Aguardando cifra") ||
        texto.includes("Aguardando") ||
        texto.includes("Cole a cifra");
    };

    new MutationObserver(atualizarStatus).observe(indicador, {
      childList: true,
      subtree: true,
      characterData: true
    });

    atualizarStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", organizar);
  } else {
    organizar();
  }
})();
