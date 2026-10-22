// ============================================================
//  TOM LOUVORES — largura do seletor de ministrante (Cultos)
//  O seletor tem a largura do nome escolhido, para a linha ficar
//  compacta. Antes o nome aparecia cortado ("Miriar", "Daniel:"):
//    · a conta usava 43px fixos de folga, mas o CSS dá 13px + 30px
//      de margem interna e mais 2px de borda — faltavam pixels;
//    · a medida podia ser feita antes da fonte Montserrat carregar,
//      com uma fonte mais estreita, e não era refeita depois;
//    · o Safari põe um respiro próprio no texto do <select>.
//  Agora a folga vem do CSS de verdade, há uma margem de segurança
//  e a medida é refeita quando a fonte termina de carregar.
//  Também deixou de observar a página inteira (qualquer mudança em
//  qualquer lugar refazia as medidas): só a grade de cultos.
// ============================================================
(() => {
  const SEGURANCA = 8;   // respiro do Safari e arredondamentos
  let medidor = null;

  function ajustar(select) {
    const texto = select.selectedOptions[0]?.textContent || "— escalar —";
    const estilo = getComputedStyle(select);

    if (!medidor) {
      medidor = document.createElement("span");
      medidor.setAttribute("aria-hidden", "true");
      medidor.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre";
      document.body.appendChild(medidor);
    }
    medidor.style.fontFamily = estilo.fontFamily;
    medidor.style.fontSize = estilo.fontSize;
    medidor.style.fontWeight = estilo.fontWeight;
    medidor.style.letterSpacing = estilo.letterSpacing;
    medidor.textContent = texto;

    const px = v => parseFloat(v) || 0;
    const folga = px(estilo.paddingLeft) + px(estilo.paddingRight) +
                  px(estilo.borderLeftWidth) + px(estilo.borderRightWidth);
    const largura = Math.ceil(medidor.getBoundingClientRect().width + folga + SEGURANCA);
    if (select.style.width !== largura + "px") select.style.width = largura + "px";
  }

  function atualizar() {
    document.querySelectorAll(".culto-escala-sel").forEach(ajustar);
  }

  document.addEventListener("change", e => {
    if (e.target.matches(".culto-escala-sel")) ajustar(e.target);
  });

  let agendado = 0;
  const agendar = () => {
    if (agendado) return;
    agendado = requestAnimationFrame(() => { agendado = 0; atualizar(); });
  };

  function iniciar() {
    atualizar();
    //  Só onde os cards de culto são desenhados.
    const alvo = document.getElementById("cultosGrid") || document.querySelector(".cultos-wrap");
    if (alvo) new MutationObserver(agendar).observe(alvo, { childList: true, subtree: true });
    //  A fonte terminou de carregar: o nome ficou mais largo, remede.
    document.fonts?.ready?.then(atualizar);
    window.addEventListener("resize", agendar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
