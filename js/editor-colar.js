// ============================================================
//  TOM LOUVORES — colar cifra codificada no editor
//  Carregue nas páginas que têm campo de cifra (editor e modal).
//
//  No iPhone e no iPad, copiar a cifra de alguns apps e colar
//  direto no campo chegava assim:
//      AE%20tudo%20est%C3%A1%20em%20Ti%0A...
//  É o texto com a codificação de endereço da web (o que o app
//  pôs na área de transferência). Passando pelo app de Notas e
//  copiando de novo, vinha certo — porque o Notas decodifica.
//
//  Aqui o campo faz o mesmo: se o que foi colado (ou o que está
//  no campo) tem cara de texto codificado, decodifica na hora.
//  Texto normal passa intacto: a regra só pega quando há vários
//  "%XX" e quase nenhum espaço ou quebra de linha.
// ============================================================
(() => {
  "use strict";

  const CAMPOS = ["cifra", "cifraTextoIntegrado"];

  //  Parece codificado? Vários %XX e quase nada de espaço/quebra.
  function codificado(t) {
    if (!t || t.length < 12) return false;
    const marcas = (t.match(/%[0-9A-Fa-f]{2}/g) || []).length;
    if (marcas < 3) return false;
    const brancos = (t.match(/[ \n\r\t]/g) || []).length;
    return brancos <= Math.max(2, t.length / 60);
  }

  function decodificar(t) {
    let s = String(t).trim();
    //  "data:text/plain;charset=utf-8,AE%20tudo..." ou um endereço
    //  inteiro: fica só o que vem depois da vírgula ou do "?texto="
    s = s.replace(/^data:[^,]*,/i, "");
    try {
      const d = decodeURIComponent(s.replace(/\+/g, "%20"));
      //  decodificou para algo com espaços/quebras: era isso mesmo
      return /[ \n]/.test(d) ? d : t;
    } catch {
      return t;   // % solto no meio da cifra (ex.: "100%"): deixa quieto
    }
  }

  function arrumar(campo) {
    const atual = campo.value;
    if (!codificado(atual)) return false;
    const novo = decodificar(atual);
    if (novo === atual) return false;
    campo.value = novo;
    //  avisa quem escuta o campo (detecção de tom, rascunho…)
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function ligar(campo) {
    if (!campo || campo.dataset.colarOk) return;
    campo.dataset.colarOk = "1";

    //  Colou: pega o texto antes de entrar no campo
    campo.addEventListener("paste", e => {
      const t = e.clipboardData && e.clipboardData.getData("text/plain");
      if (!t || !codificado(t)) return;
      const d = decodificar(t);
      if (d === t) return;
      e.preventDefault();
      const i = campo.selectionStart ?? campo.value.length;
      const f = campo.selectionEnd ?? campo.value.length;
      campo.setRangeText(d, i, f, "end");
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    });

    //  Chegou por outro caminho (ditado, "colar" do teclado que não
    //  dispara paste, autocompletar): confere o campo inteiro
    campo.addEventListener("input", () => arrumar(campo));
    campo.addEventListener("change", () => arrumar(campo));
  }

  function iniciar() {
    CAMPOS.forEach(id => ligar(document.getElementById(id)));
    //  o campo do modal nasce depois: observa até aparecer
    new MutationObserver(() => CAMPOS.forEach(id => ligar(document.getElementById(id))))
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
