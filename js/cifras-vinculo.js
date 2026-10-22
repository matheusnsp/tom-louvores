/*
 * Integração entre repertório e editor de cifras.
 * Apenas navegação e transferência temporária de dados.
 * Não altera o banco.
 */

function abrirEditorCifraRepertorio() {
  if (typeof isAdmin !== "function" || !isAdmin()) {
    if (typeof toast === "function") toast("Entre como administrador para abrir o editor.", true);
    return;
  }

  const nome = document.getElementById("fNome")?.value.trim();

  if (!nome) {
    if (typeof toast === "function") toast("Escreva o nome da música primeiro.", true);
    return;
  }

  const pares = Array.isArray(tomMinList)
    ? tomMinList.map(p => ({
        tom: p.tom,
        mins: Array.isArray(p.mins) ? [...p.mins] : []
      }))
    : [];

  const dados = {
    repertorioId: editandoId || null,
    titulo: nome,
    tonsMinistrantes: pares
  };

  sessionStorage.setItem(
    "tl_editor_vinculo",
    JSON.stringify(dados)
  );

  window.location.href = "cifras-editor.html?origem=repertorio";
}
