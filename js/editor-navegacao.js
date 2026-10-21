/*
 * Tom Louvores — navegação para o editor completo.
 * Preserva a página de origem e os dados do repertório.
 */
(function () {
  "use strict";

  function abrirEditor(m = null) {
    if (typeof isAdmin === "function" && !isAdmin()) {
      if (typeof abrirLogin === "function") abrirLogin();
      return;
    }

    const origem =
      location.pathname.split("/").pop() || "index.html";

    sessionStorage.setItem("tl_editor_origem", origem);

    const pares = m && typeof paresParaEdicao === "function"
      ? paresParaEdicao(m.tom)
      : [];

    sessionStorage.setItem(
      "tl_editor_vinculo",
      JSON.stringify({
        repertorioId: m?.id || null,
        titulo: m?.nome || "",
        tonsMinistrantes: pares,
        modo: m ? "editar" : "criar"
      })
    );

    location.assign(
      "cifras-editor.html?origem=repertorio&modo=" +
      (m ? "editar" : "criar")
    );
  }

  window.tlAbrirEditor = abrirEditor;

  // Compatibilidade com todos os atalhos antigos:
  // botão Nova música, lápis de edição e leitura do culto.
  window.abrirModal = abrirEditor;
})();
