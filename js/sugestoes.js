// ============================================================
//  TOM LOUVORES — sugestões de louvores
//  Só na sugestoes.html. Carregue DEPOIS do app.js e do
//  paginas.js.
//
//  Qualquer pessoa sugere um louvor: o nome, quem sugeriu e o
//  link. A sugestão entra "em análise", e quem está logado aprova
//  ou recusa. Quem só visualiza vê as aprovadas e quantas estão
//  esperando; a equipe vê as três listas e decide.
//
//  O banco é a tabela "sugestoes", criada pelo
//  supabase/sugestoes.sql. É o banco que garante o que importa:
//  sugestão nova sempre entra em análise, o mesmo louvor não
//  entra duas vezes (youtu.be e youtube.com contam como o mesmo
//  link) e ninguém apaga nem reescreve sugestão pela internet.
//
//  A busca no banco acontece pelo carregarCultos(), que nesta
//  página é das sugestões (ver paginas.js): assim elas atualizam
//  junto com o resto, nos mesmos momentos do atualizar.js.
// ============================================================

const SUG_TABELA = "sugestoes";
const SUG_CAMPOS = "id,nome,sugerido_por,link,status,criado_em,analisado_em";

//  As três listas da equipe, na ordem das abas.
const SUG_ABAS = [
  { status: "pendente", nome: "Em análise", vazio: "Nada esperando análise." },
  { status: "aprovada", nome: "Aprovadas",  vazio: "Nenhuma sugestão aprovada ainda." },
  { status: "recusada", nome: "Recusadas",  vazio: "Nenhuma sugestão recusada." },
];

let sugLista   = [];             // todas as sugestões, como vieram do banco
let sugAba     = "pendente";     // a aba aberta pela equipe
let sugEstado  = "carregando";   // carregando | ok | sem-tabela | erro
let sugOkTimer = null;

//  O mesmo desenho do "abrir fora" do chat e do Lyra.
const SUG_ICO_FORA = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>`;

// ============================================================
//  ESTILO
// ============================================================

(function sugEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /* Formulário à esquerda, lista à direita, na largura das
     outras páginas. O formulário acompanha a rolagem: numa lista
     comprida ele continua à mão. */
  .sug-wrap{
    max-width:1280px;margin:36px auto 72px;padding:0 36px;
    display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);
    gap:28px;align-items:start;
  }

  /* ── formulário ─────────────────────────────────────────── */
  .sug-form{
    background:var(--black2);border:1px solid var(--black4);
    border-radius:var(--r);padding:24px 22px;
    display:flex;flex-direction:column;gap:16px;
    position:sticky;top:calc(var(--header-alt, 64px) + 20px);
  }
  .sug-titulo{
    font-family:'Bebas Neue',sans-serif;font-weight:400;
    font-size:30px;letter-spacing:0.04em;line-height:1;color:var(--white);
  }
  .sug-ajuda{font-size:13px;font-weight:300;color:var(--gray);line-height:1.55;margin-top:-8px}
  .sug-campo .finput.sug-invalido{border-color:rgba(248,113,113,0.6)}
  .sug-dica{font-size:12px;color:var(--gray);line-height:1.45;margin-top:8px}
  .sug-dica:empty{display:none}
  .sug-dica b{color:var(--white);font-weight:600}
  .sug-erro{font-size:12.5px;line-height:1.45;color:#F87171}
  .sug-erro:empty{display:none}
  .sug-ok{
    font-size:13px;line-height:1.5;color:#4ADE80;
    background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.25);
    border-radius:var(--r);padding:10px 12px;
  }
  .sug-ok[hidden]{display:none}
  .sug-enviar{width:100%;padding:14px 22px}

  /* a isca dos robôs: fora da tela, sem ocupar lugar */
  .sug-isca{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}

  /* ── lista ──────────────────────────────────────────────── */
  .sug-lista{min-width:0}
  .sug-topo{
    display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap;
    padding-bottom:14px;border-bottom:1px solid var(--black4);
  }
  .sug-rotulo{
    font-size:11px;font-weight:700;letter-spacing:0.1em;
    text-transform:uppercase;color:var(--gray);
  }
  .sug-rotulo b{color:var(--white);font-weight:700}
  .sug-nota{font-size:12px;color:var(--gray2);margin-left:auto}

  /* abas da equipe: o mesmo controle do "Agrupar" do repertório */
  .sug-abas{
    display:inline-flex;border:1px solid var(--black5);
    border-radius:var(--r);overflow:hidden;
  }
  .sug-abas button{
    font-family:'Inter',sans-serif;font-size:10.5px;font-weight:700;
    letter-spacing:0.08em;text-transform:uppercase;
    color:var(--gray);background:transparent;border:none;
    padding:9px 13px;cursor:pointer;
    transition:background 0.15s,color 0.15s;
  }
  .sug-abas button + button{border-left:1px solid var(--black5)}
  .sug-abas button:hover{color:var(--white)}
  .sug-abas button[aria-pressed="true"]{background:var(--yellow);color:var(--black)}
  .sug-abas .n{margin-left:6px;font-weight:800;opacity:0.7}

  .sug-itens{list-style:none}
  .sug-item{
    display:flex;align-items:center;gap:16px;
    padding:15px 2px;border-bottom:1px solid var(--black4);
  }
  .sug-info{flex:1;min-width:0}
  .sug-nome{
    font-size:15px;font-weight:600;color:var(--white);
    letter-spacing:-0.01em;line-height:1.3;overflow-wrap:anywhere;
  }
  .sug-meta{font-size:12px;color:var(--gray);margin-top:4px;line-height:1.4}
  .sug-meta b{color:#B4B4B4;font-weight:600}
  .sug-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .sug-chip{
    font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
    color:#B4B4B4;background:rgba(255,255,255,0.05);
    border:1px solid var(--black5);border-radius:4px;padding:3px 7px;
  }
  .sug-chip.no-rep{color:#4ADE80;border-color:rgba(74,222,128,0.3);background:rgba(74,222,128,0.06)}

  .sug-acoes{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
  .sug-btn{
    display:inline-flex;align-items:center;gap:6px;
    font-family:'Inter',sans-serif;font-size:11px;font-weight:700;
    letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;
    color:var(--white);background:transparent;text-decoration:none;
    border:1px solid var(--black5);border-radius:var(--r);
    padding:8px 12px;cursor:pointer;
    transition:background 0.15s,border-color 0.15s,color 0.15s;
  }
  .sug-btn:hover{background:var(--black3);border-color:var(--gray3)}
  .sug-btn.sim{background:var(--yellow);border-color:var(--yellow);color:var(--black)}
  .sug-btn.sim:hover{background:var(--yellow2);border-color:var(--yellow2)}
  .sug-btn.fraco{color:var(--gray)}
  .sug-btn.fraco:hover{color:var(--white)}
  .sug-btn:disabled{opacity:0.4;cursor:default}
  .sug-btn:focus-visible,.sug-abas button:focus-visible{outline:2px solid var(--yellow);outline-offset:2px}

  .sug-vazio{padding:44px 8px;text-align:center;font-size:13px;color:var(--gray2);line-height:1.6}
  .sug-aviso{
    margin-top:4px;padding:16px 18px;border-radius:var(--r);
    border:1px solid var(--black5);background:var(--black2);
    font-size:13px;color:var(--gray);line-height:1.6;
  }
  .sug-aviso b{color:var(--white);font-weight:600}
  .sug-aviso code{font-size:12px;color:var(--white);background:var(--black3);padding:1px 6px;border-radius:4px}
  .sug-carregando{display:flex;justify-content:center;padding:56px 0}

  @media(max-width:900px){
    .sug-wrap{grid-template-columns:minmax(0,1fr);gap:32px}
    .sug-form{position:static}
    /* Com login, a lista vem antes do formulário: é ela que a
       equipe abre a página para ver. */
    body:not(.read-only) .sug-lista{order:-1}
  }
  @media(max-width:700px){
    .sug-wrap{padding-left:20px;padding-right:20px;margin-top:26px}
    /* para quem visualiza, o "Ouvir" cabe ao lado do nome; os três
       botões da equipe descem para uma linha própria */
    .sug-item{gap:12px}
    .sug-item--equipe{flex-direction:column;align-items:stretch}
    .sug-item--equipe .sug-acoes{justify-content:flex-start}
    .sug-nota{margin-left:0;flex-basis:100%}
    .sug-abas{width:100%}
    .sug-abas button{flex:1;padding:10px 6px;letter-spacing:0.04em}
  }`;
  document.head.appendChild(st);
})();

// ============================================================
//  PEQUENOS AJUDANTES
// ============================================================

const sugEl = id => document.getElementById(id);

//  O esc() do app.js não troca aspas: serve para texto, não para
//  atributo. O link vai dentro de href="", então precisa deste.
function sugAttr(s = "") {
  return esc(String(s)).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

//  Só http e https viram link clicável. O banco já recusa o
//  resto, mas a tela não confia nisso sozinha.
function sugLinkValido(link) {
  try {
    const u = new URL(link);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname.includes(".");
  } catch { return false; }
}

//  Quem cola "youtu.be/abc" sem o https também está certo.
function sugCompletarLink(link) {
  const l = link.trim();
  if (!l) return "";
  return /^https?:\/\//i.test(l) ? l : "https://" + l.replace(/^\/+/, "");
}

function sugPlataforma(link) {
  let h = "";
  try { h = new URL(link).hostname.toLowerCase().replace(/^(www|m)\./, ""); } catch { return "Link"; }
  if (h === "music.youtube.com") return "YouTube Music";
  if (h === "youtu.be" || h.endsWith("youtube.com")) return "YouTube";
  if (h.endsWith("spotify.com") || h === "spotify.link" || h === "spoti.fi") return "Spotify";
  if (h.endsWith("deezer.com") || h.endsWith("deezer.page.link")) return "Deezer";
  if (h === "music.apple.com") return "Apple Music";
  if (h.endsWith("soundcloud.com")) return "SoundCloud";
  if (h.endsWith("instagram.com")) return "Instagram";
  if (h.endsWith("tiktok.com")) return "TikTok";
  if (h.endsWith("cifraclub.com.br")) return "Cifra Club";
  return h;
}

//  dd/mm — e o ano junto só quando não é este ano.
function sugData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mesmoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("pt-BR", mesmoAno
    ? { day: "2-digit", month: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "2-digit" });
}

//  A mesma regra que o app.js usa para barrar música repetida:
//  sem acento, sem caixa, espaços contados como um.
function sugNoRepertorio(nome) {
  const n = normTexto(nome);
  if (!n || typeof musicas === "undefined" || !Array.isArray(musicas)) return null;
  return musicas.find(m => normTexto(m.nome) === n) || null;
}

//  O req() do app.js joga o corpo da resposta como mensagem. O
//  Supabase responde com um JSON que traz o código do Postgres.
function sugCodigo(e) {
  try { return JSON.parse(e.message).code || ""; } catch { return ""; }
}

function sugTabelaFalta(e) {
  const c = sugCodigo(e);
  return c === "42P01" || c === "PGRST205" || c === "PGRST200" ||
    /could not find the table|relation .* does not exist/i.test(e?.message || "");
}

function sugMensagemErro(e) {
  const c = sugCodigo(e);
  if (c === "23505") return "Esse louvor já foi sugerido e está na lista da equipe.";
  if (c === "P0001") return "Muitas sugestões em pouco tempo. Tente de novo daqui a alguns minutos.";
  if (c === "23514") return "Confira o nome do louvor, o seu nome e o link.";
  if (sugTabelaFalta(e)) return "As sugestões ainda não foram ativadas. Avise a equipe de louvor.";
  if (e instanceof TypeError) return "Sem conexão com a internet. Confira e tente de novo.";
  return "Não deu para enviar agora. Tente de novo.";
}

// ============================================================
//  BANCO
// ============================================================

//  Nunca joga erro para fora: quem chama é o ciclo de atualização
//  do site, e uma falha aqui não pode travar o resto.
async function sugCarregar() {
  const admin = isAdmin();
  const antes = sugEstado === "ok" ? sugLista.filter(s => s.status === "pendente").length : null;

  try {
    sugLista = await req(`${SUG_TABELA}?select=${SUG_CAMPOS}&order=criado_em.desc`) || [];
    sugEstado = "ok";
  } catch (e) {
    console.error(e);
    //  Sem rede numa atualização de fundo: fica o que já estava.
    if (sugEstado !== "ok" || sugTabelaFalta(e)) sugEstado = sugTabelaFalta(e) ? "sem-tabela" : "erro";
  }

  //  Chegou sugestão enquanto a equipe estava com a página aberta.
  if (admin && antes !== null && sugEstado === "ok") {
    const depois = sugLista.filter(s => s.status === "pendente").length;
    if (depois > antes) toast(depois - antes === 1 ? "1 sugestão nova" : `${depois - antes} sugestões novas`);
  }

  sugRender();
  sugDica();
}

async function sugEnviar(ev) {
  ev.preventDefault();

  const nome = sugEl("sugNome").value.trim().replace(/\s+/g, " ");
  const quem = sugEl("sugQuem").value.trim().replace(/\s+/g, " ");
  const link = sugCompletarLink(sugEl("sugLink").value);

  sugLimparErros();
  sugEl("sugOk").hidden = true;

  if (nome.length < 2)       return sugErroCampo("sugNome", "Escreva o nome do louvor.");
  if (quem.length < 2)       return sugErroCampo("sugQuem", "Escreva o seu nome.");
  if (!sugLinkValido(link))  return sugErroCampo("sugLink", "Cole o link do louvor (YouTube, Spotify, Deezer…).");

  //  Robô preenche tudo, inclusive o campo que ninguém vê. Ele
  //  recebe a mesma resposta de sempre e nada vai para o banco.
  if (sugEl("sugSite").value) { sugSucesso(); return; }

  const btn = sugEl("sugEnviar");
  btn.disabled = true;
  btn.textContent = "Enviando…";

  try {
    const criadas = await req(SUG_TABELA, {
      method: "POST",
      body: JSON.stringify({ nome, sugerido_por: quem, link }),
    });
    if (Array.isArray(criadas) && criadas[0]) sugLista.unshift(criadas[0]);
    if (sugEstado !== "ok") sugEstado = "ok";

    try { localStorage.setItem("tl_sug_quem", quem); } catch { /* sem armazenamento: só não lembra */ }
    sugEl("sugNome").value = "";
    sugEl("sugLink").value = "";
    sugDica();
    sugSucesso();
    sugRender();
  } catch (e) {
    if (!["23505", "P0001"].includes(sugCodigo(e))) console.error(e);
    if (sugCodigo(e) === "23505") sugErroCampo("sugLink", sugMensagemErro(e));
    else sugEl("sugErro").textContent = sugMensagemErro(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar sugestão";
  }
}

//  Aprovar, recusar ou voltar para análise. A tela muda na hora;
//  se o banco recusar, volta como estava.
async function sugAnalisar(id, status) {
  if (!isAdmin()) { abrirLogin(); return; }
  const s = sugLista.find(x => String(x.id) === String(id));
  if (!s || s.status === status) return;

  const antes = { status: s.status, analisado_em: s.analisado_em };
  s.status = status;
  s.analisado_em = status === "pendente" ? null : new Date().toISOString();
  sugRender();

  try {
    const r = await req(`${SUG_TABELA}?id=eq.${encodeURIComponent(s.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (Array.isArray(r) && r[0]) Object.assign(s, r[0]);   // a data certa vem do banco
    toast(status === "aprovada" ? "Sugestão aprovada ✓"
        : status === "recusada" ? "Sugestão recusada"
        : "Voltou para análise");
  } catch (e) {
    console.error(e);
    Object.assign(s, antes);
    toast(sugCodigo(e) === "23505"
      ? "Esse louvor já está em outra sugestão."
      : "Não deu para salvar. Tente de novo.", true);
  }
  sugRender();
}

//  Aprovada e ainda fora do repertório: abre o "Nova música" já
//  com o nome e o link. O resto (tom, ministrante) é com a equipe.
function sugParaRepertorio(id) {
  const s = sugLista.find(x => String(x.id) === String(id));
  if (!s) return;
  abrirModal();                       // pede login se precisar
  if (!isAdmin()) return;
  sugEl("fNome").value = s.nome;
  if (ehYoutube(s.link))      sugEl("fYoutube").value = s.link;
  else if (ehSpotify(s.link)) sugEl("fSpotify").value = s.link;
  else                        sugEl("fObs").value = s.link;
}

// ============================================================
//  TELA
// ============================================================

function sugItem(s, admin) {
  const rep = sugNoRepertorio(s.nome);
  const chips = [`<span class="sug-chip">${esc(sugPlataforma(s.link))}</span>`];
  if (rep) chips.push(`<span class="sug-chip no-rep">No repertório</span>`);

  const ouvir = sugLinkValido(s.link)
    ? `<a class="sug-btn" href="${sugAttr(s.link)}" target="_blank" rel="noopener noreferrer">Ouvir ${SUG_ICO_FORA}</a>`
    : "";

  let acoes = "";
  if (admin && s.status === "pendente") {
    acoes = `
      <button type="button" class="sug-btn sim" data-acao="aprovada" data-id="${sugAttr(s.id)}">Aprovar</button>
      <button type="button" class="sug-btn" data-acao="recusada" data-id="${sugAttr(s.id)}">Recusar</button>`;
  } else if (admin) {
    if (s.status === "aprovada" && !rep)
      acoes += `<button type="button" class="sug-btn" data-acao="repertorio" data-id="${sugAttr(s.id)}">+ Repertório</button>`;
    acoes += `<button type="button" class="sug-btn fraco" data-acao="pendente" data-id="${sugAttr(s.id)}">Voltar para análise</button>`;
  }

  return `
    <li class="sug-item${admin ? " sug-item--equipe" : ""}">
      <div class="sug-info">
        <div class="sug-nome">${esc(s.nome)}</div>
        <div class="sug-meta">Sugerido por <b>${esc(s.sugerido_por)}</b> · ${sugData(s.criado_em)}</div>
        <div class="sug-chips">${chips.join("")}</div>
      </div>
      <div class="sug-acoes">${ouvir}${acoes}</div>
    </li>`;
}

function sugRender() {
  const caixa = sugEl("sugLista");
  if (!caixa) return;
  const admin = isAdmin();

  const por = { pendente: [], aprovada: [], recusada: [] };
  for (const s of sugLista) (por[s.status] || por.pendente).push(s);

  //  O número na aba "Sugestões" do topo, para a equipe.
  if (typeof navMostrarContagem === "function")
    navMostrarContagem(admin && sugEstado === "ok" ? por.pendente.length : 0);

  if (sugEstado === "carregando") {
    caixa.innerHTML = `<div class="sug-carregando"><div class="spinner"></div></div>`;
    return;
  }
  if (sugEstado === "sem-tabela") {
    caixa.innerHTML = admin
      ? `<div class="sug-aviso"><b>Falta um passo no Supabase.</b> Rode o arquivo <code>supabase/sugestoes.sql</code> no SQL Editor do projeto, uma vez só, e recarregue esta página.</div>`
      : `<div class="sug-aviso">As sugestões ainda não foram ativadas.</div>`;
    return;
  }
  if (sugEstado === "erro") {
    caixa.innerHTML = `<div class="sug-aviso">Não deu para carregar as sugestões. Confira a internet e recarregue a página.</div>`;
    return;
  }

  //  Aprovadas: as aprovadas por último primeiro. As outras: as
  //  mais novas primeiro, como vieram do banco.
  por.aprovada.sort((a, b) => new Date(b.analisado_em || b.criado_em) - new Date(a.analisado_em || a.criado_em));

  let topo, itens, vazio;
  if (admin) {
    topo = `
      <div class="sug-abas" role="group" aria-label="Sugestões por situação">
        ${SUG_ABAS.map(a => `
          <button type="button" data-aba="${a.status}" aria-pressed="${sugAba === a.status}">${a.nome}<span class="n">${por[a.status].length}</span></button>`).join("")}
      </div>`;
    itens = por[sugAba];
    vazio = SUG_ABAS.find(a => a.status === sugAba).vazio;
  } else {
    const n = por.aprovada.length;
    const esperando = por.pendente.length;
    topo = `
      <span class="sug-rotulo"><b>${n}</b> ${n === 1 ? "aprovada" : "aprovadas"}</span>
      ${esperando ? `<span class="sug-nota">${esperando} ${esperando === 1 ? "sugestão" : "sugestões"} em análise pela equipe</span>` : ""}`;
    itens = por.aprovada;
    vazio = "Nenhuma sugestão aprovada ainda.<br>Mande a primeira pelo formulário.";
  }

  caixa.innerHTML = `
    <div class="sug-topo">${topo}</div>
    ${itens.length
      ? `<ul class="sug-itens">${itens.map(s => sugItem(s, admin)).join("")}</ul>`
      : `<p class="sug-vazio">${vazio}</p>`}`;
}

//  Enquanto a pessoa digita o nome: já está no repertório? Já foi
//  sugerido? É só um aviso — músicas diferentes podem ter o mesmo
//  nome, então o envio continua liberado.
function sugDica() {
  const campo = sugEl("sugNome"), dica = sugEl("sugDica");
  if (!campo || !dica) return;
  const n = normTexto(campo.value);
  if (n.length < 3) { dica.textContent = ""; return; }

  const rep = sugNoRepertorio(campo.value);
  if (rep) { dica.innerHTML = `<b>${esc(rep.nome)}</b> já está no repertório.`; return; }

  const ja = sugLista.find(s => s.status !== "recusada" && normTexto(s.nome) === n);
  if (ja) {
    dica.innerHTML = `<b>${esc(ja.nome)}</b> já foi sugerida e ${ja.status === "aprovada" ? "aprovada" : "está em análise"}.`;
    return;
  }
  dica.textContent = "";
}

function sugErroCampo(id, msg) {
  const campo = sugEl(id);
  campo.classList.add("sug-invalido");
  campo.setAttribute("aria-invalid", "true");
  sugEl("sugErro").textContent = msg;
  campo.focus();
}

function sugLimparErros() {
  ["sugNome", "sugQuem", "sugLink"].forEach(id => {
    const c = sugEl(id);
    c.classList.remove("sug-invalido");
    c.removeAttribute("aria-invalid");
  });
  sugEl("sugErro").textContent = "";
}

function sugSucesso() {
  const ok = sugEl("sugOk");
  ok.hidden = false;
  toast("Sugestão enviada ✓");
  clearTimeout(sugOkTimer);
  sugOkTimer = setTimeout(() => { ok.hidden = true; }, 8000);
}

// ============================================================
//  LIGAÇÕES
// ============================================================

function sugClique(e) {
  const aba = e.target.closest("[data-aba]");
  if (aba) { sugAba = aba.dataset.aba; sugRender(); return; }

  const b = e.target.closest("[data-acao]");
  if (!b) return;
  if (b.dataset.acao === "repertorio") sugParaRepertorio(b.dataset.id);
  else sugAnalisar(b.dataset.id, b.dataset.acao);
}

//  Chamada pelo render() desta página (paginas.js) sempre que o
//  repertório chega ou muda: o selo "No repertório" e o aviso do
//  formulário dependem dele.
function sugRepertorioMudou() {
  if (sugEstado !== "carregando") sugRender();
  sugDica();
}

function sugIniciar() {
  const form = sugEl("sugForm");
  if (!form) return;

  form.addEventListener("submit", sugEnviar);
  sugEl("sugNome").addEventListener("input", sugDica);
  ["sugNome", "sugQuem", "sugLink"].forEach(id =>
    sugEl(id).addEventListener("input", () => {
      sugEl(id).classList.remove("sug-invalido");
      sugEl(id).removeAttribute("aria-invalid");
      sugEl("sugErro").textContent = "";
    }));
  sugEl("sugLista").addEventListener("click", sugClique);

  //  Quem já sugeriu antes não precisa escrever o nome de novo.
  try { sugEl("sugQuem").value = localStorage.getItem("tl_sug_quem") || ""; } catch { /* sem armazenamento */ }
}

//  Entrou ou saiu: a lista troca entre a visão da equipe e a de
//  quem só visualiza.
if (typeof aplicarEstadoAuth === "function") {
  const sugAuthOriginal = aplicarEstadoAuth;
  aplicarEstadoAuth = function (...a) {
    const r = sugAuthOriginal.apply(this, a);
    sugRender();
    return r;
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", sugIniciar);
} else {
  sugIniciar();
}
