// ============================================================
//  TOM LOUVORES — o tom do leitor vira o tom escalado do culto
//  Carregue DEPOIS do app.js, culto-seletor.js, revisao.js e lyra.js.
//
//  Quem está logado abre a cifra a partir de um culto e troca o
//  tom (pela folha Tom, pelas setas de meio tom ou pelo menu).
//  Antes, isso só transpunha a cifra na tela: a escala do culto
//  continuava com o tom antigo e o repertório não ficava sabendo.
//
//  Agora, ao trocar, uma faixa sobe no topo da cifra com o tom
//  novo, a ministrante do culto e uma contagem. Se a cifra ficar
//  2 minutos nesse tom (ou alguém tocar em "Usar"), ele gruda:
//    1. o tom vira o tom escalado daquele louvor, naquele culto
//       (é o que aparece na coluna do culto e no WhatsApp);
//    2. se a ministrante ainda não canta a música nesse tom, o
//       par tom + ministrante entra no repertório dela;
//    3. nesse caso a música é marcada para revisão, com a nota
//       dizendo o que mudou — é na aba Repertório → Revisar que
//       alguém depois confere se o tom novo está certo.
//
//  Por que 2 minutos: quem só está olhando como fica em outro tom
//  troca de novo ou fecha antes disso; quem canta o louvor inteiro
//  nesse tom está, de fato, usando-o. O × da faixa cancela a
//  contagem. Sem login, ou com a cifra aberta pelo repertório (sem
//  culto), nada aparece.
// ============================================================
(() => {
  "use strict";

  const logado = () => typeof isAdmin === "function" && isAdmin() === true;
  const ESPERA = () => window.TE_ESPERA_MS || 2 * 60 * 1000;
  let dispensado = null;   // tom cuja faixa a pessoa fechou
  let pendente = null;     // { tom, chave, idx, vence, timer, tic }

  function cancelar() {
    if (!pendente) return;
    clearTimeout(pendente.timer);
    clearInterval(pendente.tic);
    pendente = null;
  }
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

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
    if (!ctx || !lyraAtual.tom) { cancelar(); return; }
    const tom = lyraAtual.tom;
    if (norm(tom) === norm(ctx.louvor.tom)) { cancelar(); return; }   // já é o tom escalado
    if (dispensado === norm(tom)) return;

    const min = ctx.louvor.min || ctx.culto.ministrante || "";
    const m = musicaDo(ctx.louvor);
    const pares = m && typeof paresParaEdicao === "function" ? paresParaEdicao(m.tom) : [];
    const jaCanta = !!(min && pares.find(p => norm(p.tom) === norm(tom) && p.mins.includes(min)));

    const b = document.createElement("div");
    b.id = "teBanner";
    b.className = "te-banner";
    //  A contagem continua de onde estava se a cifra só foi redesenhada
    //  no mesmo tom; tom diferente (ou outro louvor) recomeça do zero.
    const mesma = pendente && pendente.tom === norm(tom) && pendente.chave === ctx.chave && pendente.idx === ctx.idx;
    if (!mesma) {
      cancelar();
      pendente = { tom: norm(tom), chave: ctx.chave, idx: ctx.idx, vence: Date.now() + ESPERA(), timer: null, tic: null };
      pendente.timer = setTimeout(() => {
        const atual = contexto();
        const faixa = document.getElementById("teBanner");
        if (!atual || atual.chave !== ctx.chave || atual.idx !== ctx.idx || norm(lyraAtual.tom) !== norm(tom)) { cancelar(); return; }
        cancelar();
        salvar(atual, tom, min, m, jaCanta, faixa, true);
      }, ESPERA());
    }

    b.innerHTML = `
      <span class="te-tom">${esc(tom)}</span>
      <span class="te-txt">${
        min ? `Vira o tom de <b>${esc(min)}</b> neste culto em <span class="te-conta"></span>`
            : `Vira o tom deste culto em <span class="te-conta"></span>`}${
        min && m && !jaCanta ? `<small>Tom novo para ela: a música vai para a revisão.</small>` : ""}
      </span>
      <button type="button" class="te-salvar">Usar</button>
      <button type="button" class="te-x" aria-label="Cancelar">&#10005;</button>`;
    const conta = b.querySelector(".te-conta");
    const pintar = () => { if (pendente) conta.textContent = mmss(pendente.vence - Date.now()); };
    pintar();
    clearInterval(pendente.tic);
    pendente.tic = setInterval(pintar, 1000);

    b.querySelector(".te-x").addEventListener("click", () => { dispensado = norm(tom); cancelar(); b.remove(); });
    b.querySelector(".te-salvar").addEventListener("click", () => { cancelar(); salvar(ctx, tom, min, m, jaCanta, b, false); });

    const cab = corpo.querySelector(".lyra-cab");
    if (cab) cab.after(b); else corpo.prepend(b);
  }

  async function salvar(ctx, tomLido, min, m, jaCanta, b, sozinho) {
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

    // 3. para revisão, com a nota do que mudou
    if (novo && typeof rvGravar === "function") {
      const oc = typeof calOcorrenciaPorChave === "function" ? calOcorrenciaPorChave(ctx.chave) : null;
      const quando = oc && typeof formatarDataCulto === "function" && typeof calData === "function"
        ? `${oc.dia}, ${formatarDataCulto(calData(oc.data))}` : "";
      await rvGravar(m.id, true, `Tom ${tom} novo para ${min}${quando ? ` (${quando})` : ""}: conferir a cifra nesse tom.`);
    }

    if (b) b.remove();
    if (typeof toast === "function") {
      const como = sozinho ? " (2 min neste tom)" : "";
      toast(novo ? `Tom ${tom} escalado e salvo para ${min}${como} ✓` : `Tom ${tom} escalado neste culto${como} ✓`);
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
    lyraAbrirLeitor = function (...a) { dispensado = null; cancelar(); return abrir.apply(this, a); };
  }
  //  Fechou o leitor antes dos 2 minutos: não era para valer
  if (typeof lyraFecharLeitor === "function") {
    const fechar = lyraFecharLeitor;
    lyraFecharLeitor = function (...a) { cancelar(); document.getElementById("teBanner")?.remove(); return fechar.apply(this, a); };
  }
})();
