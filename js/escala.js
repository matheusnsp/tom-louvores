// ============================================================
//  TOM LOUVORES — escala do louvor (ministrante e back)
//  Só na escala.html, aberta para todos (com ou sem login).
//  Carregue DEPOIS do app.js e do paginas.js.
//
//  Lê a mesma escala do Firebase (projeto escala-lideres) que o
//  escala-ministrante.js usa para preencher o ministrante dos
//  cultos, mas aqui mostra também o back (BVOCAL 1 a 4). Os
//  músicos e a mesa de som ficam de fora.
//
//  A janela é de hoje até o fim do mês seguinte: a escala do mês
//  que vem costuma sair antes de ele começar. Uma consulta só, por
//  intervalo de datas; as outras equipes (infantil, comunicação)
//  vêm junto e são descartadas aqui, porque filtrar por equipe E
//  por intervalo no Firestore pediria um índice novo lá.
//
//  A última escala vista fica guardada no aparelho: na igreja,
//  sem sinal, a página continua mostrando quem canta.
//
//  A busca acontece pelo carregarCultos(), que nesta página é da
//  escala (ver paginas.js): assim ela atualiza nos mesmos momentos
//  que o resto, pelo atualizar.js.
// ============================================================

const ESC_COPIA = "tl_escala_louvor";

//  Como o turno aparece na tela
const ESC_TURNOS = { "manhã": "Manhã", "noite": "Noite", "único": "" };
const ESC_ORDEM_TURNO = { "manhã": 0, "único": 1, "noite": 2 };

let escCultos = null;      // [{ data, turno, chegada, ministrante, backs: [nome|null] }]
let escEstado = "carregando";   // carregando | ok | erro
let escPedido = 0;

// ============================================================
//  ESTILO
// ============================================================

(function escEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  .esc-wrap{max-width:1280px;margin:36px auto 72px;padding:0 36px}
  .esc-mes{
    font-size:12px;font-weight:400;letter-spacing:3px;
    text-transform:uppercase;color:var(--gold);
    padding-bottom:14px;margin:34px 0 18px;border-bottom:1px solid var(--line);
  }
  .esc-mes:first-child{margin-top:0}
  .esc-grade{
    display:grid;gap:16px;
    grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  }
  .esc-card{
    background:rgba(16,16,18,0.80);border:1px solid rgba(255,255,255,0.14);
    border-radius:var(--r);padding:18px 18px 16px;
    display:flex;flex-direction:column;gap:14px;
  }
  .esc-card.hoje{border-color:var(--gold)}
  .esc-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .esc-dia{font-size:17px;font-weight:700;color:var(--paper);line-height:1.25}
  .esc-dia small{display:block;font-size:13px;font-weight:500;color:var(--gray);margin-top:3px}
  .esc-data{
    font-family:var(--font-tom);font-weight:800;font-size:22px;
    color:var(--gold);letter-spacing:-0.01em;flex-shrink:0;
  }
  .esc-rotulo{
    font-size:11px;font-weight:600;letter-spacing:1.6px;
    text-transform:uppercase;color:var(--gray2);margin-bottom:6px;
  }
  .esc-min{font-size:16px;font-weight:600;color:var(--gold-hi)}
  .esc-backs{display:flex;gap:6px;flex-wrap:wrap}
  .esc-back{
    font-size:13px;font-weight:500;color:var(--paper);
    background:rgba(255,255,255,0.04);
    border:1px solid var(--fio);border-radius:var(--pill);padding:4px 11px;
  }
  .esc-back.vaga{color:var(--gray2);border-style:dashed}
  .esc-nada{font-size:13px;color:var(--gray2)}

  .esc-aviso{
    max-width:520px;margin:20px auto;padding:22px;border-radius:var(--r);
    border:1px solid var(--black5);background:var(--black2);
    font-size:14px;color:var(--gray);line-height:1.6;text-align:center;
  }
  .esc-aviso b{color:var(--white);font-weight:600}
  .esc-aviso .btn-add{margin-top:14px}
  .esc-velha{font-size:12.5px;color:var(--gray2);margin-bottom:18px}
  .esc-carregando{display:flex;justify-content:center;padding:56px 0}

  @media(max-width:700px){
    .esc-wrap{padding-left:20px;padding-right:20px;margin-top:26px}
    .esc-grade{grid-template-columns:minmax(0,1fr)}
  }`;
  document.head.appendChild(st);
})();

// ============================================================
//  DADOS
// ============================================================

//  "pr. humberto" → "Pr. Humberto". Ministrante conhecido sai
//  escrito igual à lista MINISTRANTES; "disponível" é vaga.
function escNome(bruto) {
  const s = String(bruto || "").trim();
  if (!s || s.toLowerCase() === "disponível" || s.toLowerCase() === "disponivel") return null;
  const lista = typeof MINISTRANTES !== "undefined" ? MINISTRANTES : [];
  const conhecido = lista.find(m => m.toLowerCase() === s.toLowerCase());
  if (conhecido) return conhecido;
  return s.toLocaleLowerCase("pt-BR")
    .split(" ")
    .map(p => p ? p[0].toLocaleUpperCase("pt-BR") + p.slice(1) : p)
    .join(" ");
}

function escJanela() {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
  return { de: isoDia(hoje), ate: isoDia(fim) };
}

async function escBuscar() {
  const projectId = CONFIG.FIREBASE && CONFIG.FIREBASE.projectId;
  if (!projectId) throw new Error("Firebase não configurado");
  const { de, ate } = escJanela();

  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents:runQuery`;
  const filtro = (op, valor) => ({
    fieldFilter: { field: { fieldPath: "data" }, op, value: { stringValue: valor } },
  });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "escalas" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [filtro("GREATER_THAN_OR_EQUAL", de), filtro("LESS_THAN_OR_EQUAL", ate)],
          },
        },
      },
    }),
  });
  if (!r.ok) throw new Error("Firestore runQuery " + r.status);
  const rows = await r.json();
  const campo = (f, nome) => (f[nome] && f[nome].stringValue) || "";

  //  um culto = data + turno
  const porCulto = {};
  (Array.isArray(rows) ? rows : [])
    .map(row => row.document && row.document.fields)
    .filter(f => f && campo(f, "ministerioId") === "louvor")
    .forEach(f => {
      const funcao = campo(f, "funcao").toUpperCase();
      const ehBack = /^BVOCAL\b/.test(funcao);
      if (funcao !== "MINISTRANTE" && !ehBack) return;   // músicos e som ficam de fora

      const chave = campo(f, "data") + "|" + campo(f, "turno");
      const c = porCulto[chave] || (porCulto[chave] = {
        data: campo(f, "data"),
        turno: campo(f, "turno"),
        chegada: campo(f, "horaInicio"),
        ministrante: null,
        backs: [],
      });
      if (ehBack) c.backs.push({ ordem: parseInt(funcao.replace(/\D/g, ""), 10) || 9, nome: escNome(campo(f, "pessoaNome")) });
      else c.ministrante = escNome(campo(f, "pessoaNome"));
    });

  return Object.values(porCulto)
    .map(c => ({ ...c, backs: c.backs.sort((a, b) => a.ordem - b.ordem).map(b => b.nome) }))
    .sort((a, b) => a.data.localeCompare(b.data)
      || (ESC_ORDEM_TURNO[a.turno] ?? 9) - (ESC_ORDEM_TURNO[b.turno] ?? 9));
}

function escCopiaLer() {
  try { return JSON.parse(localStorage.getItem(ESC_COPIA) || "null"); }
  catch { return null; }
}

function escCopiaGravar(lista) {
  try { localStorage.setItem(ESC_COPIA, JSON.stringify({ em: Date.now(), lista })); }
  catch { /* modo privativo: só perde a cópia */ }
}

async function escCarregar() {
  const pedido = ++escPedido;
  if (!escCultos) {
    const copia = escCopiaLer();
    if (copia && Array.isArray(copia.lista)) {
      // a cópia pode ter cultos que já passaram
      const hoje = isoDia(new Date());
      escCultos = copia.lista.filter(c => c.data >= hoje);
      escEstado = "ok";
    }
    escRender();
  }

  try {
    const lista = await escBuscar();
    if (pedido !== escPedido) return;
    escCultos = lista;
    escEstado = "ok";
    escCopiaGravar(lista);
  } catch (e) {
    console.error("Escala (Firebase):", e);
    if (pedido !== escPedido) return;
    if (!escCultos) escEstado = "erro";
  }
  escRender();
}

// ============================================================
//  TELA
// ============================================================

const ESC_DIAS  = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ESC_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho",
                   "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function escDataObj(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function escCardHTML(c, hoje) {
  const d = escDataObj(c.data);
  const turno = ESC_TURNOS[c.turno] ?? c.turno;
  const titulo = ESC_DIAS[d.getDay()] + (turno ? " · " + turno : "");
  const dataStr = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");

  const backs = c.backs.length
    ? c.backs.map(n => n
        ? `<span class="esc-back">${esc(n)}</span>`
        : `<span class="esc-back vaga">Vaga</span>`).join("")
    : `<span class="esc-nada">Ninguém escalado ainda.</span>`;

  return `
    <article class="esc-card${c.data === hoje ? " hoje" : ""}">
      <div class="esc-hd">
        <div class="esc-dia">${esc(titulo)}${c.chegada ? `<small>Chegada às ${esc(c.chegada)}</small>` : ""}</div>
        <div class="esc-data">${dataStr}</div>
      </div>
      <div>
        <div class="esc-rotulo">Ministrante</div>
        ${c.ministrante
          ? `<div class="esc-min">${esc(c.ministrante)}</div>`
          : `<div class="esc-nada">A definir</div>`}
      </div>
      <div>
        <div class="esc-rotulo">Back</div>
        <div class="esc-backs">${backs}</div>
      </div>
    </article>`;
}

function escRender() {
  const caixa = document.getElementById("escLista");
  if (!caixa) return;

  if (escEstado === "carregando" && !escCultos) {
    caixa.innerHTML = `<div class="esc-carregando"><div class="spinner"></div></div>`;
    return;
  }
  if (escEstado === "erro") {
    caixa.innerHTML = `<div class="esc-aviso">Não deu para carregar a escala. Confira a internet e recarregue a página.</div>`;
    return;
  }
  if (!escCultos.length) {
    caixa.innerHTML = `<div class="esc-aviso">A escala dos próximos cultos ainda não foi montada.</div>`;
    return;
  }

  const hoje = isoDia(new Date());
  const meses = [];
  escCultos.forEach(c => {
    const mes = c.data.slice(0, 7);
    let m = meses[meses.length - 1];
    if (!m || m.mes !== mes) meses.push(m = { mes, cultos: [] });
    m.cultos.push(c);
  });

  caixa.innerHTML = meses.map(m => {
    const [a, mm] = m.mes.split("-").map(Number);
    return `<h2 class="esc-mes">${ESC_MESES[mm - 1]} ${a}</h2>
      <div class="esc-grade">${m.cultos.map(c => escCardHTML(c, hoje)).join("")}</div>`;
  }).join("");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", escRender);
} else {
  escRender();
}
