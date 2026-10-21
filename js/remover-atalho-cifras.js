(function () {
  "use strict";

  function remover() {
    document.querySelectorAll(".header-right a, .header-right button")
      .forEach(el => {
        const texto = el.textContent.trim().replace(/\s+/g, " ");

        if (texto === "Cifras") {
          el.remove();
        }
      });
  }

  remover();

  const header = document.querySelector(".header-right");

  if (header) {
    new MutationObserver(remover).observe(header, {
      childList: true,
      subtree: true
    });
  }
})();
