// ============================================================
//  TOM LOUVORES — músicas para revisar
//  Carregue DEPOIS do app.js, do vista-lista.js e do busca-letra.js.
//
//  Quem está logado marca uma música para revisão (cifra errada,
//  tom que mudou, falta a ponte…), com uma nota opcional dizendo
//  o quê. A marca aparece para todo mundo:
//
//    · na leitura da música, uma faixa com a nota e, para a
//      equipe, os botões "Revisado" e "Mudar nota"
//    · no card e na linha da lista, uma bandeirinha
//    · nos filtros do repertório, o botão "Revisar" com a
//      contagem — tocado, mostra só as marcadas
//
//  Precisa das colunas revisar_em e revisar_nota na tabela
//  musicas: rode supabase/revisao.sql uma vez.
// ============================================================

const RV_ICO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>`;

let rvSoMarcadas = false;   // o filtro "Revisar" está ligado?

const rvMarcada = m => !!(m && m.revisar_em);

(function rvEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /* bandeirinha no card e na linha da lista */
  .rv-flag{
    display:inline-flex;align-items:center;gap:4px;vertical-align:middle;
    margin-left:8px;padding:2px 7px;border-radius:999px;
    background:rgba(var(--gold-rgb),.14);color:var(--gold);
    border:1px solid rgba(var(--gold-rgb),.35);
    font-family:var(--font-ui);font-size:10px;font-weight:800;
    letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;
  }
  .lst-nome .rv-flag{margin-left:6px}

  /* botão de filtro, ao lado dos selects */
  .rv-filtro{
    display:inline-flex;align-items:center;gap:6px;
    background:transparent;border:1px solid var(--black5);
    color:var(--gray);font-family:var(--font-ui);
    font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    padding:0 13px;min-height:40px;border-radius:var(--r);cursor:pointer;
    transition:all .15s;
  }
  .rv-filtro[hidden]{display:none}
  .rv-filtro:hover{border-color:var(--gray3);color:var(--white)}
  .rv-filtro.on{background:var(--gold);border-color:var(--gold);color:var(--black)}
  .rv-filtro b{font-weight:800}
  /* celular: só a bandeira e o número, para os selects não apertarem */
  @media(max-width:600px){
    .rv-filtro{padding:0 11px;flex-shrink:0}
    .rv-filtro span{display:none}
  }

  /* faixa na leitura da música */
  .rv-box{margin-bottom:18px}
  .rv-faixa{
    border:1px solid rgba(var(--gold-rgb),.4);
    background:rgba(var(--gold-rgb),.08);
    border-radius:var(--r);padding:12px 14px;
  }
  .rv-faixa-tit{
    display:flex;align-items:center;gap:7px;color:var(--gold);
    font-family:var(--font-ui);font-size:11px;font-weight:800;
    letter-spacing:.1em;text-transform:uppercase;
  }
  .rv-faixa-tit small{color:var(--gray2);font-weight:700;letter-spacing:.04em;text-transform:none;font-size:11px}
  .rv-nota{color:var(--white);font-size:14px;line-height:1.5;margin-top:6px;white-space:pre-wrap}
  .rv-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .rv-acoes button,.rv-marcar{
    font-family:var(--font-ui);font-size:11px;font-weight:800;
    letter-spacing:.05em;text-transform:uppercase;
    padding:8px 12px;border-radius:var(--r);cursor:pointer;
  }
  .rv-ok{background:var(--gold);color:var(--black);border:none}
  .rv-sec,.rv-marcar{background:transparent;color:var(--gray);border:1px solid var(--black5)}
  .rv-sec:hover,.rv-marcar:hover{border-color:var(--gray3);color:var(--white)}
  .rv-marcar{display:inline-flex;align-items:center;gap:7px}
  .rv-acoes button:disabled,.rv-marcar:disabled{opacity:.5;cursor:default}
  .rv-inp{
    width:100%;margin-top:10px;box-sizing:border-box;
    background:var(--black2);border:1px solid var(--black5);border-radius:var(--r);
    color:var(--white);font:inherit;font-size:14px;padding:10px 12px;resize:vertical;min-height:64px;
  }
  .rv-inp:focus{outline:none;border-color:var(--gold)}

  /* visitante só lê */
  body.read-only .rv-so-equipe{display:none}`;
  document.head.appendChild(st);
})();

// ── salvar no banco ─────────────────────────────────────────

async function rvGravar(id, marcar, nota) {
  if (!isAdmin()) { toast("Faça login para marcar.", true); return false; }
  const corpo = marcar
    ? { revisar_em: new Date().toISOString(), revisar_nota: (nota || "").trim() || null }
    : { revisar_em: null, revisar_nota: null };
  try {
    await req(`${TABLE}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(corpo) });
  } catch (e) {
    console.error(e);
    toast(/revisar_/.test(String(e.message))
      ? "Falta ativar a revisão no Supabase (supabase/revisao.sql)."
      : "Não deu para salvar. Verifique a conexão.", true);
    return false;
  }
  //  Atualiza já na tela, sem esperar o repertório voltar do banco.
  const m = musicas.find(x => String(x.id) === String(id));
  if (m) Object.assign(m, corpo);
  toast(marcar ? "Marcada para revisão ✓" : "Revisão concluída ✓");
  rvAtualizarFiltro();
  if (typeof filtrar === "function") filtrar();
  return true;
}

// ── a faixa na leitura da música ────────────────────────────

function rvBox() {
  let box = document.getElementById("rvBox");
  if (box) return box;
  const bd = document.querySelector("#viewModal .view-bd");
  if (!bd) return null;
  box = document.createElement("div");
  box.id = "rvBox";
  box.className = "rv-box";
  bd.prepend(box);
  box.addEventListener("click", rvClique);
  return box;
}

function rvDesenhar(id, editando = false) {
  const box = rvBox();
  if (!box) return;
  const m = id != null ? musicas.find(x => String(x.id) === String(id)) : null;
  box.dataset.id = m ? m.id : "";
  if (!m) { box.innerHTML = ""; box.style.display = "none"; return; }
  box.style.display = "";

  const notaAtual = m.revisar_nota || "";

  if (editando) {
    box.innerHTML = `
      <div class="rv-faixa">
        <div class="rv-faixa-tit">${RV_ICO} ${rvMarcada(m) ? "Mudar nota da revisão" : "Marcar para revisão"}</div>
        <textarea class="rv-inp" id="rvInp" maxlength="300"
          placeholder="O que revisar? (opcional — ex.: tom errado, falta a ponte)">${esc(notaAtual)}</textarea>
        <div class="rv-acoes">
          <button type="button" class="rv-ok" data-rv="salvar">Salvar</button>
          <button type="button" class="rv-sec" data-rv="cancelar">Cancelar</button>
        </div>
      </div>`;
    const inp = box.querySelector("#rvInp");
    inp.focus();
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) box.querySelector('[data-rv="salvar"]').click();
    });
    return;
  }

  if (rvMarcada(m)) {
    const quando = typeof tempoRelativo === "function" ? tempoRelativo(m.revisar_em) : "";
    box.innerHTML = `
      <div class="rv-faixa">
        <div class="rv-faixa-tit">${RV_ICO} Para revisar ${quando ? `<small>· ${esc(quando)}</small>` : ""}</div>
        ${notaAtual ? `<div class="rv-nota">${esc(notaAtual)}</div>` : ""}
        <div class="rv-acoes rv-so-equipe">
          <button type="button" class="rv-ok" data-rv="feito">Revisado</button>
          <button type="button" class="rv-sec" data-rv="editar">Mudar nota</button>
        </div>
      </div>`;
    return;
  }

  //  Sem marca: só a equipe vê o botão de marcar.
  box.innerHTML = `<button type="button" class="rv-marcar rv-so-equipe" data-rv="editar">${RV_ICO} Marcar para revisão</button>`;
}

async function rvClique(e) {
  const b = e.target.closest("[data-rv]");
  if (!b) return;
  const box = rvBox();
  const id = box.dataset.id;
  if (!id) return;
  const acao = b.dataset.rv;

  if (acao === "editar")   { rvDesenhar(id, true); return; }
  if (acao === "cancelar") { rvDesenhar(id); return; }

  b.disabled = true;
  const nota = acao === "salvar" ? (box.querySelector("#rvInp")?.value || "") : "";
  await rvGravar(id, acao === "salvar", nota);
  rvDesenhar(id);
}

// ── botão de filtro do repertório ───────────────────────────

function rvMontarFiltro() {
  if (document.getElementById("rvFiltro")) return;
  const filtros = document.querySelector(".filtros-row");
  if (!filtros || (typeof PAGINA !== "undefined" && PAGINA !== "repertorio")) return;

  const b = document.createElement("button");
  b.type = "button";
  b.id = "rvFiltro";
  b.className = "rv-filtro";
  b.title = "Mostrar só as músicas marcadas para revisão";
  b.addEventListener("click", () => {
    rvSoMarcadas = !rvSoMarcadas;
    rvAtualizarFiltro();
    if (typeof filtrar === "function") filtrar();
  });
  //  antes do botão Lista/Cards, quando ele existe
  const vista = document.getElementById("btnVista");
  vista ? filtros.insertBefore(b, vista) : filtros.appendChild(b);
  rvAtualizarFiltro();
}

function rvAtualizarFiltro() {
  const b = document.getElementById("rvFiltro");
  if (!b) return;
  const n = (typeof musicas !== "undefined" ? musicas : []).filter(rvMarcada).length;
  //  Nada marcado: o botão some, e o filtro desliga sozinho.
  if (!n) rvSoMarcadas = false;
  b.hidden = !n;
  b.classList.toggle("on", rvSoMarcadas);
  b.setAttribute("aria-pressed", rvSoMarcadas ? "true" : "false");
  b.innerHTML = `${RV_ICO}<span>Revisar</span> <b>${n}</b>`;
}

// ── enxertos ────────────────────────────────────────────────

//  O render recebe a lista já filtrada pela busca, ministrante e
//  tom. Aqui entra mais um filtro, e as bandeirinhas depois.
const rvRenderAnterior = render;
render = function (lista, ...resto) {
  let l = lista || [];
  if (rvSoMarcadas) l = l.filter(rvMarcada);
  const r = rvRenderAnterior.call(this, l, ...resto);
  rvMarcarNaTela(l);
  rvMontarFiltro();
  rvAtualizarFiltro();
  return r;
};

function rvMarcarNaTela(lista) {
  //  cards: na mesma ordem da lista
  const cards = document.querySelectorAll("#grid .card");
  if (cards.length === lista.length) {
    cards.forEach((c, i) => {
      if (!rvMarcada(lista[i]) || c.querySelector(".rv-flag")) return;
      c.querySelector(".card-nome")?.insertAdjacentHTML("beforeend",
        `<span class="rv-flag" title="${esc(lista[i].revisar_nota || "Marcada para revisão")}">${RV_ICO}Revisar</span>`);
    });
  }
  //  lista: cada linha diz o id
  const porId = new Map(lista.map(m => [String(m.id), m]));
  document.querySelectorAll(".lst-row[data-id]").forEach(row => {
    const m = porId.get(row.dataset.id);
    if (!rvMarcada(m) || row.querySelector(".rv-flag")) return;
    row.querySelector(".lst-nome")?.insertAdjacentHTML("beforeend",
      `<span class="rv-flag" title="${esc(m.revisar_nota || "Marcada para revisão")}">${RV_ICO}Revisar</span>`);
  });
}

if (typeof abrirView === "function") {
  const rvViewAnterior = abrirView;
  abrirView = function (m, ...resto) {
    const r = rvViewAnterior.call(this, m, ...resto);
    rvDesenhar(m && m.id);
    return r;
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", rvMontarFiltro);
} else {
  rvMontarFiltro();
}
