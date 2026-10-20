// ============================================================
//  TOM LOUVORES — lixeira e backup
//  Carregue DEPOIS do app.js e do paginas.js.
//
//  Lixeira: o ✕ não apaga mais a música, só marca "excluida_em"
//  (ver excluir() no app.js). Aqui a equipe vê o que foi
//  excluído, restaura ou, se tiver certeza, apaga de vez.
//
//  Backup: baixa num arquivo tudo o que o site guarda no Supabase
//  (repertório com a lixeira, cultos, sugestões e o texto das
//  cifras). É o arquivo para guardar no Drive de tempos em tempos.
//
//  Os dois botões ficam numa linha logo abaixo dos filtros do
//  repertório, e só aparecem com login.
// ============================================================

const LIX_ICO = {
  lixeira: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>`,
  backup:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/></svg>`,
};

(function lixEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  .lix-barra{
    max-width:1280px;margin:0 auto;padding:12px 36px 0;
    display:flex;gap:8px;flex-wrap:wrap;
  }
  body.read-only .lix-barra{display:none}
  .lix-btn{
    display:inline-flex;align-items:center;gap:7px;
    background:transparent;border:1px solid var(--black5);
    color:var(--gray);font-family:var(--font-ui);
    font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;
    padding:9px 13px;border-radius:var(--r);cursor:pointer;transition:all 0.15s;
  }
  .lix-btn:hover{border-color:var(--gray3);color:var(--white)}
  .lix-btn:disabled{opacity:.5;cursor:default}
  .lix-btn b{color:var(--white);font-weight:800}
  @media(max-width:820px){ .lix-barra{padding:10px 20px 0} }

  .lix-modal{max-width:520px}
  .lix-vazio{color:var(--gray);font-size:14px;padding:8px 0 4px}
  .lix-nota{font-size:12px;color:var(--gray2);margin-bottom:12px;line-height:1.5}
  .lix-item{
    display:flex;align-items:center;gap:10px;
    padding:12px 0;border-top:1px solid var(--black4);
  }
  .lix-item:first-of-type{border-top:none}
  .lix-txt{flex:1;min-width:0}
  .lix-nome{font-size:15px;font-weight:600;color:var(--white);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lix-quando{font-size:12px;color:var(--gray2);margin-top:2px}
  .lix-item button{
    flex-shrink:0;font-family:var(--font-ui);font-size:11px;font-weight:800;
    letter-spacing:0.05em;text-transform:uppercase;
    padding:8px 10px;border-radius:var(--r);cursor:pointer;
  }
  .lix-restaurar{background:var(--gold);color:var(--black);border:none}
  .lix-apagar{background:transparent;color:#F87171;border:1px solid rgba(248,113,113,.35)}
  .lix-item button:disabled{opacity:.5;cursor:default}
  /*  celular: nome inteiro numa linha, botões embaixo */
  @media(max-width:600px){
    .lix-item{flex-wrap:wrap}
    .lix-txt{flex-basis:100%}
    .lix-item button{flex:1;padding:10px}
  }`;
  document.head.appendChild(st);
})();

// ── a linha de botões ───────────────────────────────────────

function lixMontarBarra() {
  if (document.getElementById("lixBarra")) return;
  const filtros = document.querySelector(".filtros-row");
  //  Só no repertório: é lá que a lista está.
  if (!filtros || (typeof PAGINA !== "undefined" && PAGINA !== "repertorio")) return;

  const barra = document.createElement("div");
  barra.id = "lixBarra";
  barra.className = "lix-barra";
  barra.innerHTML = `
    <button type="button" class="lix-btn" id="lixAbrir">${LIX_ICO.lixeira}<span>Lixeira</span> <b id="lixConta">0</b></button>
    <button type="button" class="lix-btn" id="lixBackup">${LIX_ICO.backup}<span>Baixar backup</span></button>`;
  //  logo depois da caixa de busca e filtros, fora dela (ela gruda no topo)
  const caixa = filtros.closest(".toolbar") || filtros.parentNode;
  caixa.parentNode.insertBefore(barra, caixa.nextSibling);

  barra.querySelector("#lixAbrir").addEventListener("click", lixAbrir);
  barra.querySelector("#lixBackup").addEventListener("click", lixBaixarBackup);
  lixAtualizar();
}

//  Chamado pelo app.js sempre que o repertório chega do banco.
function lixAtualizar() {
  const conta = document.getElementById("lixConta");
  if (conta) conta.textContent = musicasLixeira.length;
  const lista = document.getElementById("lixLista");
  if (lista) lixDesenhar();
}

// ── a tela da lixeira ───────────────────────────────────────

function lixAbrir() {
  let ov = document.getElementById("lixOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "lixOverlay";
    ov.className = "overlay-bg";
    ov.innerHTML = `
      <div class="modal lix-modal" role="dialog" aria-modal="true" aria-labelledby="lixTitulo">
        <div class="modal-hd">
          <h2 id="lixTitulo">Lixeira</h2>
          <button class="modal-close" type="button" aria-label="Fechar" id="lixFechar">✕</button>
        </div>
        <div class="modal-bd">
          <p class="lix-nota">Músicas excluídas ficam aqui até alguém apagar de vez. Restaurar devolve a música com tons, cifras e observações.</p>
          <div id="lixLista"></div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov) lixFechar(); });
    ov.querySelector("#lixFechar").addEventListener("click", lixFechar);
    ov.querySelector("#lixLista").addEventListener("click", lixClique);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && ov.classList.contains("open") &&
          !document.querySelector("#excluirOverlay.open")) lixFechar();
    });
  }
  lixDesenhar();
  ov.classList.add("open");
  document.body.style.overflow = "hidden";
  ov.querySelector("#lixFechar").focus();
}

function lixFechar() {
  const ov = document.getElementById("lixOverlay");
  if (ov) ov.classList.remove("open");
  document.body.style.overflow = "";
  const b = document.getElementById("lixAbrir");
  if (b) b.focus();
}

function lixDesenhar() {
  const box = document.getElementById("lixLista");
  if (!box) return;
  const itens = [...musicasLixeira].sort((a, b) =>
    new Date(b.excluida_em) - new Date(a.excluida_em));
  if (!itens.length) {
    box.innerHTML = `<p class="lix-vazio">A lixeira está vazia.</p>`;
    return;
  }
  box.innerHTML = itens.map(m => {
    const d = new Date(m.excluida_em);
    const dias = Math.floor((Date.now() - d) / 86400000);
    const quando = dias <= 0 ? "Excluída hoje"
                 : dias === 1 ? "Excluída ontem"
                 : `Excluída em ${d.toLocaleDateString("pt-BR")} (há ${dias} dias)`;
    return `
      <div class="lix-item" data-id="${esc(String(m.id))}">
        <div class="lix-txt">
          <div class="lix-nome">${esc(m.nome || "")}</div>
          <div class="lix-quando">${quando}</div>
        </div>
        <button type="button" class="lix-restaurar" data-acao="restaurar">Restaurar</button>
        <button type="button" class="lix-apagar" data-acao="apagar">Apagar de vez</button>
      </div>`;
  }).join("");
}

async function lixClique(e) {
  const btn = e.target.closest("button[data-acao]");
  if (!btn || btn.disabled) return;
  if (!isAdmin()) { toast("Faça login para mexer na lixeira.", true); return; }
  const id = btn.closest(".lix-item").dataset.id;
  const m = musicasLixeira.find(x => String(x.id) === id);
  const caminho = `${TABLE}?id=eq.${encodeURIComponent(id)}`;

  if (btn.dataset.acao === "apagar") {
    const ok = await confirmarExclusao(m && m.nome, {
      titulo: "Apagar de vez?",
      texto: "some do banco para sempre. Não dá para desfazer.",
      botao: "Apagar de vez",
    });
    if (!ok) return;
  }

  btn.closest(".lix-item").querySelectorAll("button").forEach(b => { b.disabled = true; });
  try {
    if (btn.dataset.acao === "restaurar") {
      await req(caminho, { method: "PATCH", body: JSON.stringify({ excluida_em: null }) });
      toast("Música restaurada ✓");
    } else {
      await req(caminho, { method: "DELETE" });
      toast("Música apagada de vez.");
    }
    await carregar();
  } catch (err) {
    console.error(err);
    toast("Não deu certo. Tente de novo.", true);
    lixDesenhar();
  }
}

// ── backup ──────────────────────────────────────────────────
//  Lê tudo de novo do banco (não do que está na tela) e salva
//  num .json com a data no nome. Tabela que não existir (ex.: as
//  sugestões antes do SQL) entra vazia, sem travar o backup.

async function lixBaixarBackup() {
  const btn = document.getElementById("lixBackup");
  const rotulo = btn.querySelector("span");
  btn.disabled = true;
  rotulo.textContent = "Preparando…";

  const ler = async caminho => {
    try { return await req(caminho) || []; }
    catch (e) { console.warn("Backup:", caminho, e); return null; }
  };

  try {
    const [musicasBanco, cultosBanco, sugestoes, cifras] = await Promise.all([
      ler(`${TABLE}?order=criado_em.asc`),
      ler(`${CULTOS_TABLE}?order=data.asc`),
      ler("sugestoes?order=criado_em.asc"),
      ler("musicas_lyra"),
    ]);
    if (!musicasBanco) throw new Error("sem o repertório");

    const agora = new Date();
    const dados = {
      site: "Tom Louvores — INVB",
      gerado_em: agora.toISOString(),
      contagem: {
        musicas: musicasBanco.length,
        na_lixeira: musicasBanco.filter(m => m.excluida_em).length,
        cultos: (cultosBanco || []).length,
        sugestoes: (sugestoes || []).length,
        cifras: (cifras || []).length,
      },
      musicas: musicasBanco,
      cultos: cultosBanco || [],
      sugestoes: sugestoes || [],
      cifras: cifras || [],
    };

    const dia = agora.toLocaleDateString("sv-SE");           // 2026-10-11
    const blob = new Blob([JSON.stringify(dados, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tom-louvores-backup-${dia}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Backup baixado: ${dados.contagem.musicas} músicas, ${dados.contagem.cultos} cultos ✓`);
  } catch (e) {
    console.error(e);
    toast("Não consegui gerar o backup. Confira a conexão.", true);
  } finally {
    btn.disabled = false;
    rotulo.textContent = "Baixar backup";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", lixMontarBarra);
} else {
  lixMontarBarra();
}
