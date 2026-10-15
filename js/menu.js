// ============================================================
//  TOM LOUVORES — menu do cabeçalho
//  Carregue DEPOIS do app.js, do lyra.js e do paginas.js.
//
//  Numa tela larga o cabeçalho tem espaço para tudo: status,
//  baixar cifras, nova música, painel do Lyra e sair. Abaixo de
//  900px isso vira uma fileira de botões que não cabem — o
//  "Baixar cifras (2/50)" quebra em duas linhas, as abas passam
//  por baixo e o header vira duas faixas.
//
//  Aqui os botões saem do cabeçalho e viram uma lista. O desenho
//  segue o do site: título em Bebas, nome em maiúsculas com
//  espaçamento (como os botões do cabeçalho), ícone amarelo em
//  quadrado de canto 6px (como os selos de tom) e traço 2.2 nos
//  ícones — o mesmo peso do resto.
//
//  ATENÇÃO: os 900px aqui são os mesmos do paginas.js, onde as
//  abas viram centralizadas e saem do fluxo. Se um dia um mudar,
//  o outro muda junto — com faixas diferentes, sobra um intervalo
//  em que os botões continuam na barra e as abas passam por baixo
//  deles.
//
//  Os botões originais não são movidos nem clonados: cada linha
//  chama a mesma função global que o botão do cabeçalho chamava.
//  Assim a tela larga segue intacta e nada depende de o elemento
//  estar em dois lugares.
// ============================================================

const MN_MQ = window.matchMedia("(max-width: 900px)");
const mnEhCelular = () => MN_MQ.matches;

const MN_ADMIN_URL = "https://database.invbotafogo.com.br/admin";

// ── ícones ──────────────────────────────────────────────────
//  Traço 2.2 e pontas arredondadas, como o ícone de baixar e o
//  lápis de editar que já existem no site. O de baixar é o mesmo
//  desenho do lyra.js, de propósito: é a mesma ação.
const MN_ICO = {
  menu:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  conexao: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4.5 11a11 11 0 0 1 15 0"/><path d="M8 14.8a6 6 0 0 1 8 0"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  nova:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  baixar:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/></svg>`,
  editar:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  entrar:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="1.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>`,
  sair:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h9"/></svg>`,
};

// ── estilo ──────────────────────────────────────────────────
(function mnEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /* em tela larga o botão do menu não existe */
  #mnBtn{display:none}

  @media (max-width: 900px){
    /*  Tudo que morava na direita do cabeçalho passa a morar no
        menu. O !important é de propósito: o app.js liga e desliga
        esses botões pelo style do elemento, e é esse mesmo style
        que o menu lê para saber que linhas mostrar. */
    .header-right > *:not(#mnBtn){display:none !important}

    #mnBtn{
      display:inline-flex;align-items:center;justify-content:center;
      position:relative;
      width:40px;height:40px;padding:0;
      background:transparent;
      border:1px solid var(--line);
      border-radius:50%;
      color:var(--paper);cursor:pointer;
      transition:all 0.15s;
    }
    #mnBtn:hover{border-color:var(--gold);color:var(--gold)}
    #mnBtn:active{border-color:var(--gold);color:var(--gold)}
    /* um ponto no canto avisa que a conexão caiu, sem abrir o menu */
    #mnBtn.mn-alerta::after{
      content:"";position:absolute;top:-2px;right:-2px;
      width:8px;height:8px;border-radius:50%;
      background:#F87171;border:2px solid var(--black);
    }
  }

  /* ── fundo ── */
  .mn-fundo{
    position:fixed;inset:0;z-index:400;
    background:rgba(0,0,0,.72);
    -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
    opacity:0;pointer-events:none;transition:opacity .22s;
  }
  .mn-fundo.on{opacity:1;pointer-events:auto}

  /* ── gaveta ──
     Entra pela direita, altura inteira: é de onde o botão do menu
     está, e o polegar volta nele para fechar. */
  .mn-gaveta{
    position:fixed;top:0;right:0;bottom:0;z-index:410;
    width:min(86vw, 360px);
    background:#0A0A0B;
    border-left:1px solid var(--line);
    box-shadow:-24px 0 60px rgba(0,0,0,.6);
    display:flex;flex-direction:column;
    padding:calc(18px + env(safe-area-inset-top)) 20px
            calc(18px + env(safe-area-inset-bottom));
    transform:translateX(101%);
    transition:transform .32s cubic-bezier(.22,1,.36,1);
    overflow:auto;overscroll-behavior:contain;
  }
  .mn-gaveta.on{transform:none}
  body.mn-travado{overflow:hidden}

  /* cabeçalho: a marca da igreja e o botão de fechar */
  .mn-hd{
    display:flex;align-items:center;justify-content:space-between;
    flex:0 0 auto;padding:2px 0 18px;margin-bottom:8px;
    border-bottom:1px solid var(--line);
  }
  .mn-marca{display:flex;align-items:center;gap:12px}
  .mn-marca img{height:40px;width:auto;display:block;object-fit:contain}
  .mn-marca-txt{display:flex;flex-direction:column;gap:3px}
  .mn-marca-txt b{
    font-family:var(--font-ui);font-size:16px;font-weight:700;
    color:var(--paper);line-height:1.1;
  }
  .mn-marca-txt span{
    font-family:var(--font-ui);font-size:10px;font-weight:600;
    letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);
  }
  .mn-x{
    width:40px;height:40px;flex-shrink:0;
    background:transparent;border:1px solid var(--line);
    border-radius:50%;color:var(--paper);
    font-size:15px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:all 0.2s;
  }
  .mn-x:hover,.mn-x:active{border-color:var(--gold);color:var(--gold)}

  /* ── grupos ── */
  .mn-grupo{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;padding:10px 0}
  .mn-grupo + .mn-grupo{border-top:1px solid var(--fio)}

  .mn-linha{
    width:100%;
    display:grid;grid-template-columns:44px 1fr;
    align-items:center;column-gap:14px;row-gap:2px;
    padding:10px 12px;min-height:64px;
    background:rgba(255,255,255,0.03);
    border:1px solid var(--fio);border-radius:16px;
    text-align:left;cursor:pointer;
    font-family:var(--font-ui);
    transition:border-color .2s,background .2s;
  }
  .mn-linha:hover,.mn-linha:active{border-color:var(--line);background:rgba(var(--gold-rgb),0.05)}
  /* a linha da conexão é informação, não botão */
  .mn-linha.mn-info{cursor:default;background:transparent;border-color:transparent;min-height:48px;padding:6px 12px}
  .mn-linha.mn-info:hover,.mn-linha.mn-info:active{background:transparent;border-color:transparent}

  .mn-ico{
    grid-column:1;grid-row:1 / span 2;
    width:44px;height:44px;
    display:flex;align-items:center;justify-content:center;
    background:rgba(var(--gold-rgb),0.10);
    border:1px solid var(--line);
    border-radius:50%;
    color:var(--gold);
  }
  .mn-linha.mn-info .mn-ico{width:36px;height:36px}
  .mn-nome{
    grid-column:2;grid-row:1;
    font-size:16px;font-weight:600;letter-spacing:0;
    color:var(--paper);line-height:1.2;
  }
  .mn-sub{
    grid-column:2;grid-row:2;
    font-size:13px;font-weight:400;color:var(--dim);
    line-height:1.4;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }

  /* Entrar é a ação principal: pílula dourada cheia */
  .mn-linha#mnEntrar{background:var(--gold);border-color:var(--gold)}
  .mn-linha#mnEntrar .mn-ico{background:rgba(0,0,0,0.12);border-color:rgba(0,0,0,0.15);color:var(--on-gold)}
  .mn-linha#mnEntrar .mn-nome{color:var(--on-gold)}
  .mn-linha#mnEntrar .mn-sub{color:rgba(11,11,12,0.7)}

  /* Sair é a única linha que desfaz algo */
  .mn-linha.mn-sair .mn-ico{background:rgba(248,113,113,0.1);border-color:rgba(248,113,113,0.35);color:#F87171}
  .mn-linha.mn-sair .mn-nome{color:#F87171}

  /* a conexão se anuncia com as cores da pastilha do cabeçalho */
  .mn-linha.mn-ok .mn-ico{background:rgba(74,222,128,0.1);border-color:rgba(74,222,128,0.35);color:#4ADE80}
  .mn-linha.mn-erro .mn-ico{background:rgba(248,113,113,0.1);border-color:rgba(248,113,113,0.35);color:#F87171}

  /* enquanto baixa, a faixa avança por trás da linha */
  .mn-linha.mn-baixando{position:relative;overflow:hidden}
  .mn-linha.mn-baixando::before{
    content:"";position:absolute;left:0;top:0;bottom:0;
    width:var(--mn-dl,0%);
    background:rgba(var(--gold-rgb),0.16);
    transition:width .25s ease;pointer-events:none;
  }
  .mn-linha.mn-baixando .mn-sub{font-variant-numeric:tabular-nums}
  .mn-linha > *{position:relative;z-index:1}

  .mn-rodape{
    margin-top:auto;padding-top:16px;
    border-top:1px solid var(--fio);
    font-family:var(--font-ui);
    font-size:11px;font-weight:600;color:var(--gray2);
    letter-spacing:0.18em;text-transform:uppercase;
    text-align:center;
  }`;
  document.head.appendChild(st);
})();

// ── montagem ────────────────────────────────────────────────

function mnLinha({ ico, nome, sub, id, classe, aoTocar }) {
  const el = document.createElement(aoTocar ? "button" : "div");
  el.className = "mn-linha" + (classe ? " " + classe : "");
  if (id) el.id = id;
  if (aoTocar) el.type = "button";
  el.innerHTML =
    `<span class="mn-ico">${ico}</span>` +
    `<span class="mn-nome">${nome}</span>` +
    `<span class="mn-sub">${sub || ""}</span>`;
  if (aoTocar) el.addEventListener("click", aoTocar);
  return el;
}

function mnGrupo(...linhas) {
  const g = document.createElement("div");
  g.className = "mn-grupo";
  linhas.forEach(l => l && g.appendChild(l));
  return g;
}

function mnMontar() {
  if (document.getElementById("mnGaveta")) return;

  const fundo = document.createElement("div");
  fundo.className = "mn-fundo";
  fundo.id = "mnFundo";
  fundo.addEventListener("click", mnFechar);
  document.body.appendChild(fundo);

  const g = document.createElement("div");
  g.className = "mn-gaveta";
  g.id = "mnGaveta";
  g.setAttribute("role", "dialog");
  g.setAttribute("aria-modal", "true");
  g.innerHTML = `
    <div class="mn-hd">
      <div class="mn-marca">
        <img src="img/logo2.png" alt="Nova Vida Botafogo" />
        <div class="mn-marca-txt"><b>Tom Louvores</b><span>Nova Vida Botafogo</span></div>
      </div>
      <button class="mn-x" id="mnX" aria-label="Fechar">&#10005;</button>
    </div>`;
  document.body.appendChild(g);
  g.querySelector("#mnX").addEventListener("click", mnFechar);

  g.appendChild(mnGrupo(
    mnLinha({
      ico: MN_ICO.conexao, nome: "Conexão", sub: "—",
      id: "mnConexao", classe: "mn-info",
    }),
  ));

  g.appendChild(mnGrupo(
    mnLinha({
      ico: MN_ICO.nova, nome: "Nova música",
      sub: "Adicionar ao repertório", id: "mnNova",
      aoTocar: () => { mnFechar(); abrirModal(); },
    }),
    mnLinha({
      ico: MN_ICO.baixar, nome: "Baixar cifras", sub: "—", id: "mnBaixar",
      // a gaveta fica aberta: é aqui que a faixa de progresso corre
      aoTocar: () => { if (typeof lyraBaixarTudo === "function") lyraBaixarTudo(); },
    }),
    mnLinha({
      ico: MN_ICO.editar, nome: "Editar cifras",
      //  A senha é avisada aqui porque o portão é do outro lado:
      //  quem não tem acesso cairia na tela de login sem entender
      //  por quê.
      sub: "Painel do Lyra · exige senha", id: "mnAdmin",
      //  Mesma aba: com o app instalado, abrir outra deixa a pessoa
      //  fora do atalho e sem botão de voltar.
      aoTocar: () => { location.href = MN_ADMIN_URL; },
    }),
  ));

  g.appendChild(mnGrupo(
    mnLinha({
      ico: MN_ICO.entrar, nome: "Entrar",
      sub: "Acesso para edição", id: "mnEntrar",
      aoTocar: () => { mnFechar(); abrirLogin(); },
    }),
    mnLinha({
      ico: MN_ICO.sair, nome: "Sair",
      sub: "Encerrar a sessão", id: "mnSair", classe: "mn-sair",
      aoTocar: () => { mnFechar(); logout(); },
    }),
  ));

  const rodape = document.createElement("div");
  rodape.className = "mn-rodape";
  rodape.textContent = "Tom Louvores · INVB";
  g.appendChild(rodape);

  mnObservar();
  mnSincronizar();
}

// ── o que aparece ───────────────────────────────────────────
//  Quem manda nas linhas são os botões do cabeçalho: se o app.js
//  escondeu o "Nova música", a linha também não aparece. Uma
//  regra só de permissão, no arquivo que já tinha essa regra.
function mnVisivel(id) {
  const el = document.getElementById(id);
  return !!el && el.style.display !== "none";
}

function mnMostrar(idLinha, mostrar) {
  const l = document.getElementById(idLinha);
  if (l) l.style.display = mostrar ? "" : "none";
}

function mnSincronizar() {
  if (!document.getElementById("mnGaveta")) return;

  // ── conexão ──
  const txt  = document.getElementById("statusTxt");
  const pill = document.getElementById("statusPill");
  const linhaCon = document.getElementById("mnConexao");
  if (linhaCon) {
    linhaCon.querySelector(".mn-sub").textContent = txt ? txt.textContent : "—";
    const ok  = pill?.classList.contains("ok");
    const err = pill?.classList.contains("err");
    linhaCon.classList.toggle("mn-ok", !!ok);
    linhaCon.classList.toggle("mn-erro", !!err);
    document.getElementById("mnBtn")?.classList.toggle("mn-alerta", !!err);
  }

  // ── baixar cifras ──
  //  O rótulo sai do próprio botão do cabeçalho, que já sabe
  //  contar quantas estão salvas e quanto falta baixar.
  const dl = document.getElementById("lyraBaixar");
  const linhaDl = document.getElementById("mnBaixar");
  if (linhaDl) {
    const rotulo   = dl?.querySelector(".lyra-dl-txt")?.textContent || "";
    const pronto   = dl?.classList.contains("pronto");
    const baixando = dl?.classList.contains("baixando");
    const conta    = rotulo.match(/\((\d+)\s*\/\s*(\d+)\)/);   // "(12/50)"

    linhaDl.querySelector(".mn-nome").textContent =
      pronto ? "Cifras salvas" : "Baixar cifras";

    linhaDl.querySelector(".mn-sub").textContent =
      baixando ? rotulo
      : pronto  ? "Abrem sem internet"
      : conta   ? `${conta[1]} de ${conta[2]} neste aparelho`
                : "Para abrir sem internet";

    linhaDl.classList.toggle("mn-baixando", !!baixando);
    if (baixando) {
      linhaDl.style.setProperty("--mn-dl", dl.style.getPropertyValue("--dl") || "0%");
    } else {
      linhaDl.style.removeProperty("--mn-dl");
    }
    mnMostrar("mnBaixar", !!dl);
  }

  // ── permissões ──
  mnMostrar("mnNova",   mnVisivel("btnNovaMusica"));
  mnMostrar("mnEntrar", mnVisivel("btnLoginShow"));
  mnMostrar("mnSair",   mnVisivel("btnLogout"));
  //  O painel do Lyra fica para todos: ele tem senha própria, e o
  //  portão é do lado dele.
  mnMostrar("mnAdmin",  true);

  //  Seção sem nenhuma linha visível deixaria um fio solto no meio
  //  da gaveta. Ela sai junto.
  document.querySelectorAll("#mnGaveta .mn-grupo").forEach(gr => {
    const algum = [...gr.children].some(c => c.style.display !== "none");
    gr.style.display = algum ? "" : "none";
  });
}

//  O status muda sozinho, o contador de cifras também, e o app.js
//  liga e desliga os botões conforme o login. Em vez de espalhar
//  chamadas por esses arquivos, a gaveta observa o cabeçalho.
function mnObservar() {
  const alvo = document.querySelector(".header-right");
  if (!alvo || alvo.dataset.mnObs) return;
  alvo.dataset.mnObs = "1";

  new MutationObserver(() => mnSincronizar()).observe(alvo, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ["style", "class"],
  });

  // o read-only sai do body, que está fora do cabeçalho
  new MutationObserver(() => mnSincronizar())
    .observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

// ── abrir e fechar ──────────────────────────────────────────
function mnAbrir() {
  mnMontar();
  mnSincronizar();
  document.getElementById("mnFundo")?.classList.add("on");
  document.getElementById("mnGaveta")?.classList.add("on");
  document.body.classList.add("mn-travado");
}

function mnFechar() {
  document.getElementById("mnFundo")?.classList.remove("on");
  document.getElementById("mnGaveta")?.classList.remove("on");
  document.body.classList.remove("mn-travado");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.getElementById("mnGaveta")?.classList.contains("on")) {
    e.stopPropagation(); mnFechar();
  }
}, true);

//  Passar dos 900px — girar o aparelho, arrastar a janela — faz a
//  gaveta sair por CSS, e ela ficaria travando a rolagem da página.
MN_MQ.addEventListener?.("change", e => { if (!e.matches) mnFechar(); });

// ── botão no cabeçalho ──────────────────────────────────────
function mnMontarBotao() {
  if (document.getElementById("mnBtn")) return;
  const barra = document.querySelector(".header-right");
  if (!barra) return;

  const b = document.createElement("button");
  b.id = "mnBtn";
  b.type = "button";
  b.setAttribute("aria-label", "Abrir menu");
  b.innerHTML = MN_ICO.menu;
  b.addEventListener("click", mnAbrir);
  barra.appendChild(b);

  //  A gaveta é montada já, e não no primeiro toque: assim ela
  //  começa a observar o cabeçalho e o ponto de conexão caída
  //  aparece no botão antes de alguém abrir o menu.
  mnMontar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mnMontarBotao);
} else {
  mnMontarBotao();
}