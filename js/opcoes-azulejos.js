// ============================================================
//  TOM LOUVORES — o cartão inteiro do menu Opções é o botão
//  Carregue DEPOIS do opcoes.js, do seguir.js, do afinador.js e
//  do metrônomo.js. Só no celular (ver css/leitor.css).
//
//  Nos cartões que têm um único botão (Fundo, Quebrar linhas,
//  Instrumento, Afinador, Metrônomo) ou um par de opções (Notação:
//  Acordes/Graus), tocar em qualquer ponto do cartão é o mesmo que
//  tocar no botão — ou passar para a outra opção. Alvo grande, um
//  toque. O controle some e o estado fica escrito no cartão
//  ("Escuro", "Violão", "Acordes"), que acende quando ligado.
//
//  Quem decide o que cada ajuste faz continua sendo o opcoes.js:
//  aqui só se repassa o toque.
// ============================================================
(() => {
  "use strict";

  const celular = () => window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;

  //  O botão que um toque no cartão aciona: o único do controle,
  //  ou, num par de opções (Acordes/Graus), a opção que NÃO está
  //  marcada. null = cartão com controle próprio (campo, seletor).
  function botaoDoToque(linha) {
    if (linha.id === "snLinha") return null;
    const c = linha.querySelector(".op-controle");
    if (!c || c.querySelector("select, input")) return null;
    //  só os botões à vista: o "Opções" do computador mora dentro de
    //  um destes controles, escondido no celular
    const bs = [...c.querySelectorAll("button")].filter(b => getComputedStyle(b).display !== "none");
    if (bs.length === 1) return bs[0];
    if (bs.length === 2 && bs.some(b => b.classList.contains("on") || b.getAttribute("aria-pressed") === "true")) {
      return bs.find(b => !(b.classList.contains("on") || b.getAttribute("aria-pressed") === "true")) || null;
    }
    return null;
  }
  const botaoUnico = botaoDoToque;

  //  O estado por extenso, para os cartões cuja legenda era só
  //  descrição ("Acordes ou graus", "Evita rolar para o lado")
  function legenda(l) {
    const sub = l.querySelector(".op-sub");
    if (!sub) return;
    let texto = null;
    const bs = [...l.querySelectorAll(".op-controle button")].filter(b => getComputedStyle(b).display !== "none");
    if (bs.length === 2) {
      const on = bs.find(b => b.classList.contains("on") || b.getAttribute("aria-pressed") === "true");
      if (on) texto = on.textContent.trim();
    }
    if (l.querySelector("#lyraQuebraBtn") && typeof lyraQuebra !== "undefined") {
      texto = lyraQuebra ? "Ligado" : "Desligado";
    }
    //  só escreve se mudou: escrever o mesmo texto dispararia o
    //  observador de novo, em laço
    if (texto !== null && sub.textContent !== texto) sub.textContent = texto;
  }

  let marcando = false;
  function marcar() {
    if (!celular() || marcando) return;
    marcando = true;
    try { marcarMesmo(); } finally { marcando = false; }
  }
  function marcarMesmo() {
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
      if (b) legenda(l);
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
