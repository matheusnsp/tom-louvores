/*
 * Organiza o campo de tom e o indicador no editor.
 * Não altera o detector, os acordes ou o salvamento.
 */
(function () {
  "use strict";

  function organizar() {
    const campoCifra = document.getElementById("cifra");
    const selectTom = document.getElementById("tom");
    const labelTom = document.querySelector('label[for="tom"]');
    const labelCifra = document.querySelector('label[for="cifra"]');

    if (!campoCifra || !selectTom || !labelTom || !labelCifra) return;

    const corpo = campoCifra.closest(".ce-panel-body");
    if (!corpo) return;

    // Aproveita os campos já existentes, sem recriar os controles.
    const campoTom = labelTom.closest(".ce-field");
    if (!campoTom) return;

    // Mantém o primeiro indicador conectado ao detector.
    const indicadores = [...document.querySelectorAll("#resultado")];
    const indicador = indicadores[0];

    const barra = document.createElement("div");
    barra.className = "ce-tom-toolbar";

    barra.appendChild(campoTom);

    if (indicador) {
      const status = document.createElement("div");
      status.className = "ce-tom-status";

      status.appendChild(indicador);
      barra.appendChild(status);
    }

    // Remove estruturas visuais antigas e duplicadas.
    document.querySelectorAll(".ce-keyline").forEach(el => {
      el.remove();
    });

    indicadores.slice(1).forEach(el => el.remove());

    // Posiciona tudo imediatamente acima dos acordes.
    corpo.insertBefore(barra, labelCifra);

    // Limpa avisos antigos fora da barra.
    document.querySelectorAll(".ce-cifra-layout").forEach(el => {
      if (!el.children.length || !el.textContent.trim()) {
        el.remove();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", organizar);
  } else {
    organizar();
  }
})();
