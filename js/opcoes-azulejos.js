// ============================================================
//  TOM LOUVORES — o cartão inteiro do menu Opções é o botão
//  Carregue DEPOIS do opcoes.js, do seguir.js, do afinador.js e
//  do metrônomo.js. Só no celular (ver css/leitor.css).
//
//  Nos cartões que têm um único botão (Fundo, Quebrar linhas,
//  Instrumento, Afinador, Metrônomo), tocar em qualquer ponto do
//  cartão é o mesmo que tocar no botão: alvo grande, um toque. O
//  botãozinho some e o estado fica escrito no cartão ("Escuro",
//  "Violão"), que acende quando o ajuste está ligado.
//
//  Quem decide o que cada ajuste faz continua sendo o opcoes.js:
//  aqui só se repassa o toque.
// ============================================================
(() => {
  "use strict";

  const celular = () => window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;

  //  Cartão simples: um botão só no controle, sem campo nem seletor
  function botaoUnico(linha) {
    //  Transmitir minha tela fica como linha: o botão dele é o que
    //  diz "Desligado"/"Transmitindo", não dá para escondê-lo
    if (linha.id === "snLinha") return null;
    const c = linha.querySelector(".op-controle");
    if (!c || c.querySelector("select, input")) return null;
    const bs = c.querySelectorAll("button");
    return bs.length === 1 ? bs[0] : null;
  }

  function marcar() {
    if (!celular()) return;
    document.querySelectorAll("#opPainel .op-linha").forEach(l => {
      const b = botaoUnico(l);
      const abre = l.id === "opLinhaAfinador" || l.id === "opLinhaMetronomo";
      l.classList.toggle("op-azulejo", !!b);
      l.classList.toggle("op-abre", !!b && abre);
      //  ligado: botão marcado (aria-pressed/on) ou fundo claro ativo
      const ligado = !!b && (b.getAttribute("aria-pressed") === "true" || b.classList.contains("on")
        || (l.id === "opLinhaTema" && document.getElementById("lyraBox")?.classList.contains("claro"))
        || (l.querySelector("#lyraQuebraBtn") && typeof lyraQuebra !== "undefined" && lyraQuebra));
      l.classList.toggle("op-ligado", ligado && !abre);
    });
  }

  document.addEventListener("click", e => {
    if (!celular()) return;
    const linha = e.target.closest("#opPainel .op-linha.op-azulejo");
    if (!linha) return;
    if (e.target.closest(".op-controle")) return;   // tocou no próprio botão
    const b = botaoUnico(linha);
    if (b) { b.click(); setTimeout(marcar, 0); }
  });

  //  O painel é montado e remontado pelo opcoes.js; acompanha
  const obs = new MutationObserver(() => marcar());
  function iniciar() {
    marcar();
    const box = document.getElementById("lyraBox") || document.body;
    obs.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-pressed"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
