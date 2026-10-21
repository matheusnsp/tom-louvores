(() => {
  function ajustar(select) {
    const texto = select.selectedOptions[0]?.textContent || "— escalar —";

    const medidor = document.createElement("span");
    const estilo = getComputedStyle(select);

    medidor.style.cssText = `
      position:absolute;
      visibility:hidden;
      white-space:pre;
      font-family:${estilo.fontFamily};
      font-size:${estilo.fontSize};
      font-weight:${estilo.fontWeight};
      letter-spacing:${estilo.letterSpacing};
    `;

    medidor.textContent = texto;
    document.body.appendChild(medidor);

    // Espaço para texto, margens internas e seta do select.
    select.style.width = `${Math.ceil(medidor.getBoundingClientRect().width) + 43}px`;
    medidor.remove();
  }

  function atualizar() {
    document.querySelectorAll(".culto-escala-sel").forEach(ajustar);
  }

  document.addEventListener("change", e => {
    if (e.target.matches(".culto-escala-sel")) {
      ajustar(e.target);
    }
  });

  // O aplicativo cria os cards dinamicamente.
  const observer = new MutationObserver(() => {
    requestAnimationFrame(atualizar);
  });

  function iniciar() {
    atualizar();
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
