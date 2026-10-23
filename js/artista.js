// ============================================================
//  TOM LOUVORES — nome do cantor em todo o site
//  Carregue DEPOIS do app.js, lyra.js, vista-lista.js e
//  busca-letra.js.
//
//  O cantor vem da tabela "cifras" (coluna artist), a mesma que o
//  editor preenche no campo "Cantor / artista". A tabela do
//  repertório (musicas) não tem essa coluna, então a ligação é pelo
//  nome da música, como o leitor já faz. Música sem cifra cadastrada
//  continua sem cantor.
//
//  Onde aparece:
//    · lista do repertório e cards, embaixo do nome
//    · louvores dos cultos (home), embaixo do nome
//    · modal da música, embaixo do título
//    · busca do repertório e busca de "Adicionar louvor" no culto:
//      digitar o cantor acha as músicas dele
// ============================================================
(() => {
  "use strict";

  if (typeof lyraNoIndice !== "function") return;

  //  Cantor de uma música do repertório, pelo nome. "" se não houver.
  function artistaDe(nome) {
    try { return (lyraNoIndice(nome)?.artist || "").trim(); } catch { return ""; }
  }
  window.tlArtistaDe = artistaDe;

  const st = document.createElement("style");
  st.textContent = `
  .tl-artista{display:block;margin-top:2px;font-size:12.5px;font-weight:500;letter-spacing:0;
    color:var(--gray2,#8A8A90);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lst-nome .tl-artista{font-size:12.5px}
  .card-nome + .tl-artista{margin-top:3px;font-size:13px}
  .culto-louvor-txt .tl-artista{font-size:12px;margin-top:1px}
  .view-artista{margin:6px 0 0;font-size:14.5px;font-weight:500;color:var(--dim,rgba(255,255,255,.78))}
  .view-artista:empty{display:none}
  .culto-musica-opt .tl-artista{display:inline;margin-left:8px}
  .claro .tl-artista{color:#77716a}`;
  document.head.appendChild(st);

  const span = a => a ? `<span class="tl-artista">${esc(a)}</span>` : "";

  // ── lista do repertório ──
  if (typeof vistaLinhaHTML === "function") {
    const linhaAnterior = vistaLinhaHTML;
    vistaLinhaHTML = function (m) {
      const html = linhaAnterior(m);
      const a = artistaDe(m.nome);
      if (!a) return html;
      //  logo depois do nome, antes do verso que bateu na busca
      return html.replace(/(<div class="lst-nome">)([^<]*)/, `$1$2${span(a)}`);
    };
  }

  // ── cards e lista: cards não têm função de HTML, então decora depois ──
  function decorarCards() {
    document.querySelectorAll("#grid .card-nome").forEach(p => {
      const prox = p.nextElementSibling;
      if (prox && prox.classList.contains("tl-artista")) return;
      const a = artistaDe(p.textContent);
      if (a) p.insertAdjacentHTML("afterend", span(a));
    });
  }
  if (typeof render === "function") {
    const renderAnterior = render;
    render = function (...args) {
      const r = renderAnterior.apply(this, args);
      decorarCards();
      return r;
    };
  }

  // ── louvores dos cultos ──
  if (typeof louvorRowHTML === "function") {
    const louvorAnterior = louvorRowHTML;
    louvorRowHTML = function (chave, l, i) {
      const html = louvorAnterior(chave, l, i);
      const a = artistaDe(l && l.nome);
      if (!a) return html;
      return html.replace(/(<div class="culto-louvor-nome">[^<]*<\/div>)/, `$1${span(a)}`);
    };
  }

  // ── modal da música ──
  if (typeof abrirView === "function") {
    const viewAnterior = abrirView;
    abrirView = function (m, ...resto) {
      const r = viewAnterior.call(this, m, ...resto);
      const titulo = document.getElementById("viewTitulo");
      if (titulo) {
        //  Título e cantor num bloco só, empilhados à esquerda. Antes o
        //  cantor era vizinho do título no cabeçalho e ficava colado nele.
        let sub = document.getElementById("viewArtista");
        if (!sub) {
          const caixa = document.createElement("div");
          caixa.className = "view-hd-txt";
          titulo.before(caixa);
          caixa.appendChild(titulo);
          sub = document.createElement("p");
          sub.id = "viewArtista";
          sub.className = "view-artista";
          caixa.appendChild(sub);
        }
        sub.textContent = artistaDe(m && m.nome);
      }
      return r;
    };
  }

  // ── busca de "Adicionar louvor" no culto: nome ou cantor ──
  if (typeof filtrarMusicasCulto === "function") {
    filtrarMusicasCulto = function () {
      const termo = normTexto(document.getElementById("cBuscaMusica").value);
      const list  = document.getElementById("cultoMusicaList");
      if (!termo) {
        list.innerHTML = `<div class="culto-empty">Digite para buscar uma música.</div>`;
        return;
      }
      const filtradas = musicas
        .filter(m => normTexto(m.nome).includes(termo) || normTexto(artistaDe(m.nome)).includes(termo))
        .slice(0, 40);
      list.innerHTML = filtradas.length
        ? filtradas.map(m =>
            `<div class="culto-musica-opt" data-id="${m.id}" onclick="selecionarMusicaCulto('${m.id}')">${esc(m.nome)}${span(artistaDe(m.nome))}</div>`
          ).join("")
        : `<div class="culto-empty">Nenhuma música encontrada.</div>`;
    };
  }

  // ── o índice de cifras chega depois da primeira pintura: repinta ──
  function repintar() {
    if (typeof PAGINA !== "undefined" && PAGINA === "repertorio" && typeof filtrar === "function") filtrar();
    else if (typeof renderCultos === "function" && document.getElementById("cultosGrid")) renderCultos();
  }
  const quandoPronto = () => {
    if (typeof lyraCarregarIndice !== "function") return;
    lyraCarregarIndice().then(idx => { if (idx) repintar(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", quandoPronto);
  else quandoPronto();
})();
