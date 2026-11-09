// ============================================================
//  TOM LOUVORES — o tom do leitor vira o tom escalado do culto
//  Carregue DEPOIS do app.js, culto-seletor.js e lyra.js.
//
//  Quem está logado abre a cifra a partir de um culto e troca o
//  tom (pela folha Tom, pelas setas de meio tom ou pelo menu).
//  Antes, isso só transpunha a cifra na tela: a escala do culto
//  continuava com o tom antigo e o repertório não ficava sabendo.
//
//  Agora, ao trocar, uma faixa sobe no topo da cifra com o tom
//  novo e a ministrante do culto. Um toque em "Usar":
//    1. o tom vira o tom escalado daquele louvor, naquele culto
//       (é o que aparece na coluna do culto e no WhatsApp);
//    2. se a ministrante ainda não canta a música nesse tom, o
//       par tom + ministrante entra no repertório dela.
//  Como foi a própria equipe que confirmou, a música não vai para
//  a revisão.
//
//  Nada é gravado sem esse toque: quem trocou de tom só para ver
//  como fica fecha a faixa no × (ou simplesmente ignora). Sem
//  login, ou com a cifra aberta pelo repertório (sem culto), a
//  faixa não aparece.
// ============================================================
(() => {
  "use strict";

  const logado = () => typeof isAdmin === "function" && isAdmin() === true;
  let dispensado = null;   // tom cuja faixa a pessoa fechou

  //  "Bbm" e "A#m" são o mesmo tom: compara pela nota
  const norm = t => (typeof lyraGrafar === "function" ? lyraGrafar(t || "", "sharp") : (t || ""));

  //  O louvor do culto de onde a cifra aberta veio (ver lyraMontarNav)
  function contexto() {
    if (!logado() || typeof lyraAtual === "undefined" || !lyraAtual || !lyraAtual.nav) return null;
    const item = (lyraAtual.nav.itens || [])[lyraAtual.nav.idx];
    const c = item && item.culto;
    if (!c || typeof cultos === "undefined" || !cultos[c.chave]) return null;
    const l = (cultos[c.chave].louvores || [])[c.idx];
    if (!l) return null;
    return { chave: c.chave, idx: c.idx, louvor: l, item, culto: cultos[c.chave] };
  }

  function musicaDo(l) {
    if (typeof musicas === "undefined") return null;
    return (l.musica_id && musicas.find(m => m.id == l.musica_id))
      || musicas.find(m => typeof normTexto === "function" && normTexto(m.nome) === normTexto(l.nome))
      || null;
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── a faixa ─────────────────────────────────────────────────
  function avaliar() {
    const corpo = document.getElementById("lyraCorpo");
    if (!corpo) return;
    document.getElementById("teBanner")?.remove();

    const ctx = contexto();
    if (!ctx || !lyraAtual.tom) return;
    const tom = lyraAtual.tom;
    if (norm(tom) === norm(ctx.louvor.tom)) return;   // já é o tom escalado
    if (dispensado === norm(tom)) return;

    const min = ctx.louvor.min || ctx.culto.ministrante || "";
    const m = musicaDo(ctx.louvor);
    const pares = m && typeof paresParaEdicao === "function" ? paresParaEdicao(m.tom) : [];
    const jaCanta = !!(min && pares.find(p => norm(p.tom) === norm(tom) && p.mins.includes(min)));

    const b = document.createElement("div");
    b.id = "teBanner";
    b.className = "te-banner";
    b.innerHTML = `
      <span class="te-tom">${esc(tom)}</span>
      <span class="te-txt">${
        min ? `Usar este tom para <b>${esc(min)}</b> neste culto?`
            : `Usar este tom neste culto?`}${
        min && m && !jaCanta ? `<small>Tom novo para ela: entra no repertório.</small>` : ""}
      </span>
      <button type="button" class="te-salvar">Usar</button>
      <button type="button" class="te-x" aria-label="Agora não">&#10005;</button>`;
    b.querySelector(".te-x").addEventListener("click", () => { dispensado = norm(tom); b.remove(); });
    b.querySelector(".te-salvar").addEventListener("click", () => salvar(ctx, tom, min, m, jaCanta, b));

    const cab = corpo.querySelector(".lyra-cab");
    if (cab) cab.after(b); else corpo.prepend(b);
  }

  async function salvar(ctx, tomLido, min, m, jaCanta, b) {
    //  O leitor pode mostrar "Bbm"; o repertório e os cultos escrevem
    //  os tons com sustenido ("A#m"). Grava do jeito do site.
    const tom = norm(tomLido) || tomLido;
    const botao = b && b.querySelector(".te-salvar");
    if (botao) { botao.disabled = true; botao.textContent = "Salvando…"; }

    // 1. o tom escalado do culto
    ctx.louvor.tom = tom;
    const ok = typeof salvarCulto === "function" ? await salvarCulto(ctx.chave) : false;
    if (!ok) { if (botao) { botao.disabled = false; botao.textContent = "Usar"; } return; }
    ctx.item.tom = tom;
    if (typeof renderCultos === "function") renderCultos();

    // 2. o par tom + ministrante no repertório, se for novo
    let novo = false;
    if (m && min && !jaCanta && typeof cultoAdicionarTomNaMusica === "function") {
      novo = await cultoAdicionarTomNaMusica(m.id, tom, min);
    }

    if (b) b.remove();
    if (typeof toast === "function") {
      toast(novo ? `Tom ${tom} escalado e salvo para ${min} ✓` : `Tom ${tom} escalado neste culto ✓`);
    }
  }

  // ── enxertos ────────────────────────────────────────────────
  //  Toda troca de tom passa pelo redesenho da cifra.
  if (typeof lyraRenderConteudo === "function") {
    const original = lyraRenderConteudo;
    lyraRenderConteudo = async function (...a) {
      const r = await original.apply(this, a);
      avaliar();
      return r;
    };
  }
  //  Música trocada (setas) ou leitor reaberto: a dispensa não vale mais
  if (typeof lyraAbrirLeitor === "function") {
    const abrir = lyraAbrirLeitor;
    lyraAbrirLeitor = function (...a) { dispensado = null; return abrir.apply(this, a); };
  }
})();
