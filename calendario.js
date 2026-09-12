// ============================================================
//  TOM LOUVORES — calendário de cultos
//
//  Carregue DEPOIS de app.js e de culto-seletor.js.
//
//  Modelo: REGRA + EXCEÇÃO (é como o Google Calendar faz).
//    · Culto fixo vive em CULTOS_FIX (config.js) e é gerado por
//      regra. Não ocupa linha no banco até alguém escalar algo.
//    · Culto eventual (vigília, conferência) é uma linha com
//      tipo="extra" + nome + hora.
//    · Culto que não vai acontecer é uma linha com cancelado=true.
//
//  Ou seja: o banco só guarda o que foge da regra. Nada de gravar
//  os 52 domingos do ano.
//
//  Uma "ocorrência" é um culto num dia específico:
//    { key:"domingo_noite@2026-09-20", tipo, data, quando:Date,
//      titulo, dia, extra, cancelado }
//  A key é a chave de tudo: é ela que indexa o objeto `cultos`,
//  é ela que vai nos onclick e é ela que o salvarCulto persiste.
//
//  O calendário vive atrás de um botão, não na página: fixo na
//  tela ele disputava largura com as colunas de culto, que são o
//  que a equipe realmente vem ver. Só o admin tem o botão.
// ============================================================

// por quantas horas um culto que já começou continua sendo "o culto"
const CAL_JANELA_H = 6;

// até quando procurar o próximo culto
const CAL_HORIZONTE_D = 120;

const CAL_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const CAL_ICONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

function calAdmin() {
  return typeof isAdmin === "function" && isAdmin();
}

// ============================================================
//  DATAS
//  Nunca use new Date("2026-09-13"): isso é lido como UTC e à
//  noite, no horário do Rio, devolve o dia anterior. Aqui tudo
//  passa por calData(), que monta a data no fuso local.
// ============================================================

function calData(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function calAddDias(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function calPrimeiroDoMes(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function calChave(tipo, data) {
  return `${tipo}@${data}`;
}

function calDataDaChave(chave) {
  return String(chave).split("@")[1] || "";
}

function calHoraLegivel(d) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// "setembro 2026", não "Setembro De 2026": o capitalize do CSS
// maiusculiza a preposição também.
function calMaiuscula1(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
//  OCORRÊNCIAS
// ============================================================

function calOcorrenciaFixa(def, dataIso) {
  const quando = calData(dataIso);
  quando.setHours(def.h ?? 0, def.min ?? 0, 0, 0);
  const key = calChave(def.tipo, dataIso);
  return {
    key,
    tipo: def.tipo,
    data: dataIso,
    quando,
    titulo: def.titulo,
    dia: def.dia,
    extra: false,
    cancelado: !!(cultos[key] && cultos[key].cancelado),
  };
}

function calOcorrenciaExtra(row) {
  const quando = calData(row.data);
  const [h, mi] = String(row.hora || "19:00").split(":").map(Number);
  quando.setHours(h || 0, mi || 0, 0, 0);
  const nome = row.nome || "Culto";
  return {
    key: calChave("extra", row.data),
    tipo: "extra",
    data: row.data,
    quando,
    titulo: nome,
    dia: `${nome} · ${calHoraLegivel(quando)}`,
    extra: true,
    cancelado: !!row.cancelado,
  };
}

// todas as ocorrências entre duas datas (ISO, inclusive), ordenadas.
// incluirCancelados=true é usado pelo calendário, para dar como
// desfazer um cancelamento.
function calOcorrencias(deIso, ateIso, incluirCancelados = false) {
  const out = [];
  const fim = calData(ateIso);

  // fixos: expande a regra dia por dia
  for (let d = calData(deIso); d <= fim; d = calAddDias(d, 1)) {
    const iso = isoDia(d);
    CULTOS_FIX
      .filter(f => f.diaSemana === d.getDay())
      .forEach(f => out.push(calOcorrenciaFixa(f, iso)));
  }

  // eventuais: vêm do banco
  Object.values(cultos).forEach(c => {
    if (c.tipo !== "extra" || !c.data) return;
    if (c.data < deIso || c.data > ateIso) return;
    out.push(calOcorrenciaExtra(c));
  });

  return out
    .filter(o => incluirCancelados || !o.cancelado)
    .sort((a, b) => a.quando - b.quando);
}

function calOcorrenciasDoDia(dataIso, incluirCancelados = false) {
  return calOcorrencias(dataIso, dataIso, incluirCancelados);
}

function calOcorrenciaPorChave(chave) {
  return calOcorrenciasDoDia(calDataDaChave(chave), true)
    .find(o => o.key === chave) || null;
}

// o próximo culto a partir de agora. Um culto em andamento continua
// sendo o próximo por CAL_JANELA_H horas — sem isso, às 10h01 de
// domingo quem abrisse o site já via a escala da semana seguinte.
function calProximo(agora = new Date()) {
  const jan = CAL_JANELA_H * 3600e3;
  const lista = calOcorrencias(
    isoDia(calAddDias(agora, -1)),
    isoDia(calAddDias(agora, CAL_HORIZONTE_D))
  );
  return lista.find(o => o.quando.getTime() + jan >= agora.getTime()) || null;
}

function calEmAndamento(o, agora = new Date()) {
  if (!o) return false;
  const t = o.quando.getTime();
  return t <= agora.getTime() && t + CAL_JANELA_H * 3600e3 >= agora.getTime();
}

// ============================================================
//  ESTADO
// ============================================================

let calMes    = null;   // Date no dia 1 do mês exibido
let calDiaSel = null;   // ISO do dia selecionado
let calFormAberto = false;

// os cultos que o app.js deve montar em coluna: os do dia escolhido
function calOcorrenciasVisiveis() {
  if (!calDiaSel) return [];
  return calOcorrenciasDoDia(calDiaSel);
}

function calIrParaProximo() {
  const p = calProximo();
  calDiaSel = p ? p.data : isoDia(new Date());
  calMes = calPrimeiroDoMes(calData(calDiaSel));
}

function calGarantirPadroes() {
  if (!calDiaSel) calIrParaProximo();
  if (!calMes) calMes = calPrimeiroDoMes(calData(calDiaSel));
}

// ============================================================
//  ESTILO
//  Injetado aqui para o calendário não depender de edição no
//  style.css. Usa os tokens do app: amarelo é a cor de data e
//  ação; verde ali é status de conexão.
// ============================================================

(function calEstilo() {
  if (document.getElementById("calEstilo")) return;
  const st = document.createElement("style");
  st.id = "calEstilo";
  st.textContent = `
  /* ---- botão que abre o calendário ---- */
  .cal-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .cal-btn{
    display:inline-flex;align-items:center;gap:9px;
    background:transparent;border:1px solid var(--black5);
    color:var(--gray);font-family:'Inter',sans-serif;
    font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
    padding:9px 15px;border-radius:var(--r);cursor:pointer;transition:all 0.15s;
  }
  .cal-btn:hover{
    border-color:var(--yellow);color:var(--yellow);
    background:rgba(255,224,0,0.04);
  }
  .cal-btn svg{width:15px;height:15px;flex-shrink:0}
  .cal-btn-data{color:var(--yellow);font-weight:800;letter-spacing:0.02em}
  .cal-btn:focus-visible{outline:2px solid var(--yellow);outline-offset:2px}

  /* ---- modal ---- */
  #calModal{max-width:460px}
  #calModal .modal-hd{padding:20px 20px 16px}
  #calModal .modal-hd h2{font-size:24px}
  #calModal .modal-bd{padding:16px 20px 18px;gap:0}
  #calModal .modal-ft{justify-content:space-between}
  .cal-hd-acoes{display:flex;align-items:center;gap:6px}
  .cal-nav{
    width:28px;height:28px;padding:0;
    background:transparent;border:1px solid var(--black5);
    color:var(--gray);font-size:15px;line-height:1;
    border-radius:4px;cursor:pointer;transition:all 0.15s;
  }
  .cal-nav:hover{background:var(--black4);color:var(--white)}
  .cal-nav:focus-visible,.cal-dia:focus-visible,
  .cal-acao:focus-visible{outline:2px solid var(--yellow);outline-offset:2px}

  /* minmax(0,1fr), não 1fr: com 1fr (= minmax(auto,1fr)) qualquer
     min-width herdado por um dia estica a coluna toda. */
  .cal-linha{
    display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;
  }
  .cal-sem span{
    height:20px;display:flex;align-items:center;justify-content:center;
    font-size:9px;font-weight:700;color:var(--gray2);
    letter-spacing:0.12em;text-transform:uppercase;
  }
  .cal-dia{
    height:42px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:4px;padding:0;
    background:transparent;border:1px solid transparent;border-radius:4px;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:600;
    color:#C4C4C4;cursor:pointer;transition:all 0.15s;
  }
  .cal-dia:hover{background:var(--black3);border-color:var(--black5)}
  .cal-dia.fora{opacity:0.22;cursor:default}
  .cal-dia.fora:hover{background:transparent;border-color:transparent}
  .cal-dia.hoje{color:var(--white);font-weight:800;border-color:var(--black5)}
  .cal-dia.cal-sel{
    background:rgba(255,224,0,0.08);
    border-color:rgba(255,224,0,0.35);
    color:var(--yellow);font-weight:800;
  }
  .cal-pontos{display:flex;gap:3px;height:4px;align-items:center}
  .cal-pt{width:4px;height:4px;border-radius:50%;background:var(--gray3)}
  .cal-pt.tem{background:var(--yellow)}
  .cal-pt.ev{background:#F59E0B}
  .cal-pt.cancel{background:transparent;box-shadow:inset 0 0 0 1px var(--gray2)}

  /* ---- o dia escolhido, dentro do modal ---- */
  .cal-dia-box{
    margin-top:16px;padding-top:15px;
    border-top:1px solid var(--black4);
    display:flex;flex-direction:column;gap:8px;
  }
  .cal-dia-ttl{
    font-size:10px;font-weight:700;color:var(--gray2);
    letter-spacing:0.12em;text-transform:uppercase;
  }
  .cal-oc{
    display:flex;align-items:center;gap:8px;
    background:var(--black3);border:1px solid var(--black5);
    border-radius:var(--r);padding:9px 11px;
  }
  .cal-oc-nome{
    flex:1;min-width:0;
    font-size:12px;font-weight:700;color:var(--yellow);
    letter-spacing:0.06em;text-transform:uppercase;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .cal-oc.off{opacity:0.6}
  .cal-oc.off .cal-oc-nome{color:var(--gray2);text-decoration:line-through}
  .cal-vazio{
    font-size:11px;color:var(--gray2);letter-spacing:0.04em;
    text-align:center;padding:14px 8px;
  }
  .cal-tag{
    flex:none;
    font-size:9px;font-weight:800;letter-spacing:0.08em;
    text-transform:uppercase;padding:4px 8px;border-radius:4px;line-height:1;
  }
  .cal-tag.agora{background:var(--yellow);color:var(--black)}
  .cal-tag.prox{
    background:rgba(255,224,0,0.08);
    border:1px solid rgba(255,224,0,0.25);
    color:var(--yellow);padding:3px 7px;
  }
  .cal-tag.ev{
    background:rgba(245,158,11,0.08);
    border:1px solid rgba(245,158,11,0.3);
    color:#F59E0B;padding:3px 7px;
  }
  .cal-acao{
    flex:none;
    background:transparent;border:1px solid var(--black5);
    color:var(--gray2);font-family:'Inter',sans-serif;
    font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
    padding:5px 9px;border-radius:4px;cursor:pointer;
    white-space:nowrap;transition:all 0.15s;
  }
  .cal-acao:hover{background:var(--black4);color:var(--white);border-color:var(--gray3)}
  .cal-acao.perigo:hover{
    background:rgba(248,113,113,0.1);color:#F87171;
    border-color:rgba(248,113,113,0.3);
  }
  .cal-form{display:flex;flex-direction:column;gap:8px}
  .cal-form-row{display:grid;grid-template-columns:104px 1fr auto;gap:8px}
  .cal-form .finput{min-width:0}
  .cal-ok{
    background:var(--yellow);border:none;
    color:var(--black);font-family:'Inter',sans-serif;
    font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;
    border-radius:var(--r);cursor:pointer;padding:0 14px;transition:background 0.15s;
  }
  .cal-ok:hover{background:var(--yellow2)}

  /* as colunas preenchem a faixa: com um ou dois cultos no dia,
     repeat(3,1fr) deixava um buraco do lado */
  .cultos-grid.cal-n1{grid-template-columns:minmax(0,1fr)}
  .cultos-grid.cal-n2{grid-template-columns:repeat(2,minmax(0,1fr))}
  .cultos-grid.cal-n3{grid-template-columns:repeat(3,minmax(0,1fr))}
  @media(max-width:700px){
    .cultos-grid.cal-n2,.cultos-grid.cal-n3{grid-template-columns:minmax(0,1fr)}
    .cal-form .finput{font-size:16px}
    .cal-form-row{grid-template-columns:1fr auto}
    .cal-form-row .cal-acao{grid-column:1/-1}
  }`;
  document.head.appendChild(st);
})();

// ============================================================
//  BOTÃO
// ============================================================

function calRemoverBarra() {
  const b = document.getElementById("calBar");
  if (b) b.remove();
}

function calMontarBarra() {
  if (document.getElementById("calBar")) return;

  const grid = document.getElementById("cultosGrid");
  if (!grid) return;

  const bar = document.createElement("div");
  bar.className = "cal-bar";
  bar.id = "calBar";
  bar.innerHTML = `
    <button type="button" class="cal-btn" id="calBtn">
      ${CAL_ICONE}
      <span>Calendário</span>
      <span class="cal-btn-data" id="calBtnData"></span>
    </button>`;

  grid.parentNode.insertBefore(bar, grid);
  document.getElementById("calBtn").onclick = calAbrir;
}

function calAtualizarBarra() {
  const el = document.getElementById("calBtnData");
  if (el) el.textContent = calData(calDiaSel).toLocaleDateString("pt-BR",
    { day: "2-digit", month: "2-digit" });
}

// ============================================================
//  MODAL
// ============================================================

function calAberto() {
  const o = document.getElementById("calOverlay");
  return !!o && o.classList.contains("open");
}

function calMontarModal() {
  if (document.getElementById("calOverlay")) return;

  const ov = document.createElement("div");
  ov.className = "overlay-bg";
  ov.id = "calOverlay";
  ov.innerHTML = `
    <div class="modal" id="calModal">
      <div class="modal-hd">
        <h2 id="calMesLabel"></h2>
        <div class="cal-hd-acoes">
          <button type="button" class="cal-nav" id="calPrev" aria-label="Mês anterior">‹</button>
          <button type="button" class="cal-nav" id="calNext" aria-label="Mês seguinte">›</button>
          <button type="button" class="modal-close" id="calX" aria-label="Fechar">✕</button>
        </div>
      </div>
      <div class="modal-bd">
        <div class="cal-linha cal-sem">${CAL_SEMANA.map(s => `<span>${s}</span>`).join("")}</div>
        <div class="cal-linha cal-grade" id="calGrade"></div>
        <div class="cal-dia-box" id="calDiaBox"></div>
      </div>
      <div class="modal-ft">
        <button type="button" class="btn-cancel" id="calHoje">Próximo culto</button>
        <button type="button" class="btn-save" id="calFechar">Fechar</button>
      </div>
    </div>`;

  document.body.appendChild(ov);

  document.getElementById("calPrev").onclick   = () => calTrocarMes(-1);
  document.getElementById("calNext").onclick   = () => calTrocarMes(1);
  document.getElementById("calX").onclick      = calFechar;
  document.getElementById("calFechar").onclick = calFechar;
  document.getElementById("calHoje").onclick   = () => {
    calIrParaProximo();
    calFormAberto = false;
    renderCultos();
  };

  // um listener só para os 42 dias
  document.getElementById("calGrade").addEventListener("click", e => {
    const cel = e.target.closest(".cal-dia");
    if (!cel || cel.classList.contains("fora")) return;
    calDiaSel = cel.dataset.dia;
    calFormAberto = false;
    renderCultos();   // as colunas atrás já mudam; o modal fica aberto
  });

  ov.addEventListener("click", e => {
    if (e.target.id === "calOverlay") calFechar();
  });
}

function calAbrir() {
  if (!calAdmin()) { abrirLogin(); return; }
  calGarantirPadroes();
  calMontarModal();
  calFormAberto = false;
  calRender();
  document.getElementById("calOverlay").classList.add("open");
}

function calFechar() {
  const ov = document.getElementById("calOverlay");
  if (ov) ov.classList.remove("open");
  calFormAberto = false;
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && calAberto()) calFechar();
});

function calTrocarMes(n) {
  calMes = new Date(calMes.getFullYear(), calMes.getMonth() + n, 1);
  calFormAberto = false;
  calRender();
}

// ============================================================
//  GRADE DO MÊS
// ============================================================

function calRender() {
  const grade = document.getElementById("calGrade");
  if (!grade) return;

  calGarantirPadroes();

  document.getElementById("calMesLabel").textContent = calMaiuscula1(
    `${calMes.toLocaleDateString("pt-BR", { month: "long" })} ${calMes.getFullYear()}`);

  // a grade começa no domingo da semana do dia 1
  const inicio = calAddDias(calMes, -calMes.getDay());
  const fim    = calAddDias(inicio, 41);

  // um índice por dia, para não varrer as ocorrências 42 vezes
  const porDia = {};
  calOcorrencias(isoDia(inicio), isoDia(fim), true).forEach(o => {
    (porDia[o.data] = porDia[o.data] || []).push(o);
  });

  const hojeIso = isoDia(new Date());
  const prox    = calProximo();

  let html = "";
  for (let i = 0; i < 42; i++) {
    const d    = calAddDias(inicio, i);
    const iso  = isoDia(d);
    const fora = d.getMonth() !== calMes.getMonth();
    const ocs  = porDia[iso] || [];

    const pontos = ocs.map(o => {
      const cls = o.cancelado ? "cancel"
        : o.extra ? "ev"
        : (cultos[o.key] && (cultos[o.key].louvores || []).length) ? "tem" : "";
      return `<span class="cal-pt ${cls}"></span>`;
    }).join("");

    const cls = [
      "cal-dia",
      fora ? "fora" : "",
      iso === hojeIso ? "hoje" : "",
      iso === calDiaSel ? "cal-sel" : "",
    ].filter(Boolean).join(" ");

    const rotulo = ocs.length
      ? `${d.getDate()} — ${ocs.length} culto${ocs.length > 1 ? "s" : ""}`
      : String(d.getDate());

    html += `<button type="button" class="${cls}" data-dia="${iso}" aria-label="${rotulo}">
               <span>${d.getDate()}</span>
               <span class="cal-pontos">${pontos}</span>
             </button>`;
  }
  grade.innerHTML = html;

  calRenderDia(prox);
}

// ============================================================
//  O DIA ESCOLHIDO: cultos, cancelar, apagar, adicionar
// ============================================================

function calRenderDia(prox) {
  const box = document.getElementById("calDiaBox");
  if (!box) return;

  const ocs   = calOcorrenciasDoDia(calDiaSel, true);
  const dLong = calData(calDiaSel).toLocaleDateString("pt-BR",
    { weekday: "long", day: "2-digit", month: "long" });

  let html = `<div class="cal-dia-ttl">${dLong}</div>`;

  if (!ocs.length) {
    html += `<div class="cal-vazio">Nenhum culto neste dia.</div>`;
  }

  ocs.forEach(o => {
    const tag = calEmAndamento(o) ? `<span class="cal-tag agora">Agora</span>`
      : (prox && o.key === prox.key) ? `<span class="cal-tag prox">Próximo</span>`
      : o.extra ? `<span class="cal-tag ev">Eventual</span>`
      : "";

    const acao = o.extra
      ? `<button class="cal-acao perigo" onclick="calApagarExtra('${o.key}')">Apagar</button>`
      : o.cancelado
        ? `<button class="cal-acao" onclick="calRestaurar('${o.key}')">Restaurar</button>`
        : `<button class="cal-acao perigo" onclick="calCancelar('${o.key}')">Não vai ter</button>`;

    html += `
      <div class="cal-oc ${o.cancelado ? "off" : ""}">
        <span class="cal-oc-nome">${esc(o.dia)}</span>
        ${tag}${acao}
      </div>`;
  });

  html += calFormAberto ? `
    <div class="cal-form">
      <input class="finput" id="calExtraNome" placeholder="Nome do culto (ex.: Vigília)" maxlength="60">
      <div class="cal-form-row">
        <input class="finput" id="calExtraHora" type="time" value="19:00">
        <button class="cal-ok" onclick="calSalvarExtra()">Adicionar culto</button>
        <button class="cal-acao" onclick="calFecharForm()">Cancelar</button>
      </div>
    </div>`
    : `<button class="culto-add-btn culto-add-secao" onclick="calAbrirForm()">+ Culto eventual</button>`;

  box.innerHTML = html;

  if (calFormAberto) {
    const inp = document.getElementById("calExtraNome");
    if (inp) setTimeout(() => inp.focus(), 40);
  }
}

function calAbrirForm()  { calFormAberto = true;  calRenderDia(calProximo()); }
function calFecharForm() { calFormAberto = false; calRenderDia(calProximo()); }

// ============================================================
//  AÇÕES
// ============================================================

async function calSalvarExtra() {
  if (!calAdmin()) { toast("Faça login para editar.", true); return; }

  const nome = (document.getElementById("calExtraNome").value || "").trim();
  const hora = document.getElementById("calExtraHora").value || "19:00";
  if (!nome) { toast("Dê um nome ao culto.", true); return; }

  const chave = calChave("extra", calDiaSel);
  if (cultos[chave] && !cultos[chave].cancelado) {
    toast("Já existe um culto eventual neste dia.", true);
    return;
  }

  cultos[chave] = {
    id: (cultos[chave] && cultos[chave].id) || null,
    tipo: "extra",
    data: calDiaSel,
    nome,
    hora,
    cancelado: false,
    louvores: [],
    ministrante: "",
    ministrante_data: null,
    atualizado_em: null,
  };

  const ok = await salvarCulto(chave);
  if (!ok) { delete cultos[chave]; return; }

  calFormAberto = false;
  toast(`${nome} adicionado ✓`);
  renderCultos();
}

// culto fixo que não vai acontecer: vira uma linha com cancelado=true
async function calCancelar(chave) {
  if (!calAdmin()) { toast("Faça login para editar.", true); return; }
  const o = calOcorrenciaPorChave(chave);
  if (!o) return;
  if (!confirm(`Marcar que não vai ter ${o.dia} neste dia?`)) return;

  const d = cultoGarantir(chave);
  d.cancelado = true;
  const ok = await salvarCulto(chave);
  if (!ok) { d.cancelado = false; return; }

  toast("Culto marcado como cancelado.");
  renderCultos();
}

async function calRestaurar(chave) {
  if (!calAdmin()) { toast("Faça login para editar.", true); return; }
  const d = cultoGarantir(chave);
  d.cancelado = false;
  const ok = await salvarCulto(chave);
  if (!ok) { d.cancelado = true; return; }
  toast("Culto restaurado ✓");
  renderCultos();
}

// culto eventual é apagado de verdade: ele só existe como linha
async function calApagarExtra(chave) {
  if (!calAdmin()) { toast("Faça login para editar.", true); return; }
  const d = cultos[chave];
  if (!d) return;
  const nome = d.nome || "este culto";
  const temLouvor = (d.louvores || []).length > 0;
  if (!confirm(temLouvor
    ? `${nome} tem louvores escalados. Apagar mesmo?`
    : `Apagar ${nome}?`)) return;

  try {
    if (d.id) await req(`${CULTOS_TABLE}?id=eq.${d.id}`, { method: "DELETE" });
    delete cultos[chave];
    calFormAberto = false;
    toast("Culto apagado.");
    renderCultos();
  } catch (e) {
    console.error(e);
    toast("Erro ao apagar o culto.", true);
  }
}

// ============================================================
//  ENXERTOS
// ============================================================

// quantas colunas o dia tem, para elas preencherem a largura
function calAjustarGrade() {
  const grid = document.getElementById("cultosGrid");
  if (!grid) return;
  const n = Math.min(calOcorrenciasVisiveis().length || 1, 3);
  grid.classList.remove("cal-n1", "cal-n2", "cal-n3");
  grid.classList.add("cal-n" + n);
}

// o render das colunas passa a ser o render do dia escolhido
const calRenderCultosOriginal = renderCultos;
renderCultos = function () {
  if (!calAdmin()) {
    // deslogado: sempre o próximo culto, sem botão e sem calendário
    calIrParaProximo();
    calFechar();
    calRemoverBarra();
    calRenderCultosOriginal();
    calAjustarGrade();
    return;
  }
  calGarantirPadroes();
  calRenderCultosOriginal();   // colunas dos cultos do dia
  calMontarBarra();
  calAtualizarBarra();
  calAjustarGrade();
  if (calAberto()) calRender();   // mantém o modal em sincronia
};

// entrar/sair põe e tira o botão
if (typeof aplicarEstadoAuth === "function") {
  const calAuthOriginal = aplicarEstadoAuth;
  aplicarEstadoAuth = function () {
    calAuthOriginal();
    if (document.getElementById("cultosGrid")) renderCultos();
  };
}

// quem deixa o site aberto durante o culto vê a escala virar na
// hora certa. Só age se a pessoa não estiver olhando outro dia.
setInterval(() => {
  if (!document.getElementById("cultosGrid")) return;

  const p = calProximo();
  if (!p) return;

  if (!calAdmin()) {
    if (p.data !== calDiaSel) renderCultos();
    return;
  }

  if (calFormAberto) return;

  if (p.data !== calDiaSel) {
    const aindaFaz = calOcorrenciasDoDia(calDiaSel).some(
      o => o.quando.getTime() + CAL_JANELA_H * 3600e3 >= Date.now()
    );
    if (aindaFaz) { if (calAberto()) calRender(); return; }
    calIrParaProximo();
    renderCultos();
  } else if (calAberto()) {
    calRender();   // só atualiza os selos "agora"/"próximo"
  }
}, 60000);