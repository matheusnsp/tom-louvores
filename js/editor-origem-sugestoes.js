(() => {
  "use strict";

  const params = new URLSearchParams(location.search);

  if (
    params.get("origem") !== "sugestoes" ||
    params.get("modo") !== "criar"
  ) return;

  const chave = "tl_sugestao_para_editor_v1";
  let dados;

  try {
    dados = JSON.parse(sessionStorage.getItem(chave) || "null");
  } catch {
    return;
  }

  if (!dados?.titulo) return;

  const campo = document.getElementById("titulo");

  if (campo) {
    campo.value = dados.titulo;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  }

  sessionStorage.removeItem(chave);
})();
