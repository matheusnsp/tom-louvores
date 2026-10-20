// ============================================================
//  TOM LOUVORES — agrupar o repertório por USO nos cultos
//  Carregue DEPOIS do vista-lista.js e do lista-ministrantes.js.
//
//  Mais um botão no "Agrupar" da lista: Uso. Ele lê os cultos
//  já montados no site e separa o repertório em:
//    · mais tocadas nos últimos 3 meses (2 vezes ou mais)
//    · tocadas 1 vez nos últimos 3 meses
//    · sem tocar há mais de 3 meses (a mais esquecida primeiro)
//    · ainda não tocadas
//  Em cada linha: quantas vezes nos 3 meses e a última data.
//
//  Só conta culto que já aconteceu e não foi cancelado. O
//  histórico vale a partir do primeiro culto montado no site —
//  a lista avisa a data, para ninguém achar que "nunca tocada"
//  quer dizer nunca na história da igreja.
// ============================================================

const USO_DIAS = 90;

let usoMapa  = null;   // id da música → { n, ultima }
let usoDesde = null;   // data do primeiro culto com louvores
let usoBuscando = null;

(function usoEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  .lst-uso-nota{font-size:12px;color:var(--gray2);padding:10px 0 0;line-height:1.5}
  .lst-wrap.uso .lst-data{color:var(--gray);font-weight:600}
  @media(max-width:820px){
    /*  No modo Uso o número vai no lugar do ✕ (que segue nos
        outros modos): é a informação que importa aqui. */
    .lst-wrap.uso .lst-row{grid-template-areas:"tons nome data" "tons mins data"}
    .lst-wrap.uso .lst-row.lst-todos{grid-template-areas:"tons nome data"}
    .lst-wrap.uso .lst-data{display:block;grid-area:data;font-size:11px;text-align:right;line-height:1.35}
    .lst-wrap.uso .lst-del{display:none}
    /*  com o 4º botão, o "Agrupar" aperta um pouco mais */
    .lst-seg button{padding:6px 7px}
  }`;
  document.head.appendChild(st);
})();

// ── os dados ────────────────────────────────────────────────

function usoMontar(rows) {
  const hoje = isoDia(new Date());
  const corte = isoDia(new Date(Date.now() - USO_DIAS * 86400000));
  const porNome = new Map(musicas.map(m => [normTexto(m.nome), m.id]));
  const mapa = new Map();
  let desde = null;

  (rows || []).forEach(r => {
    if (r.cancelado || !r.data || r.data > hoje) return;
    let l = r.louvores;
    if (typeof l === "string") { try { l = JSON.parse(l); } catch { l = []; } }
    const itens = Array.isArray(l) ? l : (l && Array.isArray(l.itens) ? l.itens : []);
    if (!itens.length) return;
    if (!desde || r.data < desde) desde = r.data;

    //  a mesma música duas vezes no mesmo culto conta uma
    const ids = new Set(itens.map(it =>
      it.musica_id || porNome.get(normTexto(it.nome)) || null).filter(Boolean));
    ids.forEach(id => {
      const k = String(id);
      const u = mapa.get(k) || { n: 0, ultima: "" };
      if (r.data >= corte) u.n++;
      if (r.data > u.ultima) u.ultima = r.data;
      mapa.set(k, u);
    });
  });

  usoMapa = mapa;
  usoDesde = desde;
}

function usoCarregar() {
  if (usoBuscando) return usoBuscando;
  const caminho = `${CULTOS_TABLE}?select=data,louvores,cancelado`;

  //  cópia do aparelho primeiro (ver "CÓPIA NO APARELHO" no app.js)
  const copia = typeof copiaLer === "function" ? copiaLer(caminho) : null;
  if (Array.isArray(copia) && !usoMapa) usoMontar(copia);

  usoBuscando = (async () => {
    try {
      const rows = await req(caminho) || [];
      if (typeof copiaGuardar === "function") copiaGuardar(caminho, rows);
      usoMontar(rows);
    } catch (e) {
      console.warn("Uso:", e);
      if (!usoMapa) usoMontar([]);
    } finally {
      usoBuscando = null;
    }
    if (vistaAgrupar === "uso" && typeof filtrar === "function") filtrar();
  })();
  return usoBuscando;
}

const usoData = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "";

// ── os grupos ───────────────────────────────────────────────

const usoAgrupadaOriginal = vistaAgrupada;
vistaAgrupada = function (lista) {
  if (vistaAgrupar !== "uso") return usoAgrupadaOriginal(lista);
  if (!usoMapa) {                       // ainda chegando: A–Z por enquanto
    usoCarregar();
    return [["Carregando os cultos…", lista]];
  }

  const corte = isoDia(new Date(Date.now() - USO_DIAS * 86400000));
  const mais = [], uma = [], antigas = [], nunca = [];
  lista.forEach(m => {
    const u = usoMapa.get(String(m.id));
    if (!u) nunca.push(m);
    else if (u.n >= 2) mais.push(m);
    else if (u.n === 1) uma.push(m);
    else if (u.ultima < corte) antigas.push(m);
    else nunca.push(m);
  });
  const de = m => usoMapa.get(String(m.id));
  mais.sort((a, b) => de(b).n - de(a).n || de(b).ultima.localeCompare(de(a).ultima));
  uma.sort((a, b) => de(b).ultima.localeCompare(de(a).ultima));
  antigas.sort((a, b) => de(a).ultima.localeCompare(de(b).ultima));

  return [
    ["Mais tocadas · 3 meses", mais],
    ["Tocadas 1 vez · 3 meses", uma],
    ["Sem tocar há 3 meses", antigas],
    ["Ainda não tocadas", nunca],
  ].filter(([, itens]) => itens.length);
};

const usoLinhaOriginal = vistaLinhaHTML;
vistaLinhaHTML = function (m) {
  const html = usoLinhaOriginal(m);
  if (vistaAgrupar !== "uso" || !usoMapa) return html;
  const u = usoMapa.get(String(m.id));
  const txt = !u ? "—"
    : u.n ? `${u.n}× · ${usoData(u.ultima)}`
    : `últ. ${usoData(u.ultima)}`;
  return html.replace(/<div class="lst-data">[^<]*<\/div>/,
    `<div class="lst-data" title="Vezes nos últimos 3 meses · último culto">${txt}</div>`);
};

const usoRenderOriginal = vistaRenderLista;
vistaRenderLista = function (...a) {
  const r = usoRenderOriginal.apply(this, a);
  const wrap = document.getElementById("lstWrap");
  if (wrap) {
    const ligado = vistaAgrupar === "uso";
    wrap.classList.toggle("uso", ligado);
    if (ligado) {
      if (!usoMapa) usoCarregar();
      const bar = wrap.querySelector(".lst-bar");
      if (bar && usoMapa) {
        const nota = document.createElement("p");
        nota.className = "lst-uso-nota";
        nota.textContent = usoDesde
          ? `Contando os cultos montados no site desde ${usoDesde.split("-").reverse().join("/")}. Número = vezes nos últimos 3 meses · data = último culto.`
          : "Ainda não há cultos com louvores montados no site.";
        bar.after(nota);
      }
    }
  }
  return r;
};
