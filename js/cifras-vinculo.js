/*
 * Integração entre repertório e editor de cifras.
 * Apenas navegação e transferência temporária de dados.
 * Não altera o banco.
 */

function abrirEditorCifraRepertorio() {
  if (typeof isAdmin !== "function" || !isAdmin()) {
    alert("Entre como administrador para abrir o editor.");
    return;
  }

  const nome = document.getElementById("fNome")?.value.trim();

  if (!nome) {
    alert("Informe o nome da música primeiro.");
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
