// ============================================================
//  TOM LOUVORES — "de onde vamos cantar", direto no chat
//  Carregue DEPOIS do chat.js, do chat-aviso.js e do
//  leitor-palco.js.
//
//  No leitor de cifra, para TODO MUNDO (não só admin), há um botão
//  de raio que abre um painel:
//    1. a música: já vem a que está aberta; "Trocar" deixa escolher
//       outra (as do culto primeiro, ou buscando pelo nome)
//    2. a letra dela, linha por linha, com as partes ([Refrão],
//       [Ponte]...) como títulos
//    3. tocar numa linha envia na hora para o chat:
//         🎵 Todas As Coisas (G) — Refrão: “Tu és o centro de tudo”
//       tocar num título envia só a parte.
//
//  O chat guarda as mensagens num Firebase aberto (o mesmo que o
//  chat-aviso.js lê); daqui a mensagem entra direto lá, pela API
//  REST, com o nome que a pessoa escreveu uma vez neste aparelho.
//  Não precisa abrir o chat nem estar logado nele.
// ============================================================
(() => {
  "use strict";

  const BANCO = "https://church-chat-dd8ea-default-rtdb.firebaseio.com";
  const CHAVE_NOME = "tl_chat_nome";
  const CHAVE_UID = "tl_chat_uid";

  const ler = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
  const norm = s => (typeof normTexto === "function" ? normTexto(s || "")
    : String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));

  //  Um id fixo por aparelho: o chat agrupa as mensagens por ele.
  let uid = ler(CHAVE_UID);
  if (!uid) {
    uid = "tl-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    gravar(CHAVE_UID, uid);
  }

  //  O aviso de mensagem nova não precisa avisar a própria pessoa.
  if (typeof avChegou === "function") {
    const anterior = avChegou;
    avChegou = function (m, ...resto) {
      if (m && m.uid === uid) return;
      return anterior.call(this, m, ...resto);
    };
  }

  // ── estilo ──
  const st = document.createElement("style");
  st.textContent = `
  #lyraMsgs{display:flex;align-items:center;justify-content:center}
  .cr-painel{position:fixed;z-index:9700;top:calc(64px + env(safe-area-inset-top));right:16px;
    width:min(400px, calc(100vw - 32px));max-height:calc(100vh - 84px);
    display:flex;flex-direction:column;
    background:var(--black2,#141416);border:1px solid var(--black5);border-radius:14px;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
    opacity:0;visibility:hidden;transform:translateY(-6px);
    transition:opacity .18s,transform .18s,visibility 0s linear .18s}
  .cr-painel.on{opacity:1;visibility:visible;transform:none;transition:opacity .18s,transform .18s,visibility 0s}
  @media (max-width:600px){
    .cr-painel{top:auto;bottom:0;right:0;left:0;width:auto;max-height:82vh;
      border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(12px)}
  }
  .cr-fixo{flex:0 0 auto;padding:14px 14px 10px;border-bottom:1px solid var(--black4)}
  .cr-topo{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .cr-titulo{flex:1;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
  .cr-x{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:none;
    border:1px solid var(--black5);border-radius:6px;color:var(--gray);cursor:pointer;font-size:13px}
  .cr-x:hover{color:var(--white);background:var(--black4)}
  .cr-quem{display:flex;align-items:center;gap:6px;margin-bottom:10px;font-size:12.5px;color:var(--gray)}
  .cr-quem b{color:var(--white);font-weight:700}
  .cr-link{background:none;border:0;padding:0;color:var(--gold);font:600 12.5px var(--font-ui,inherit);cursor:pointer;text-decoration:underline}
  .cr-nome{display:flex;gap:8px;margin-bottom:10px}
  .cr-nome input,.cr-busca{flex:1;min-width:0;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;
    border:1px solid var(--black5);background:var(--black,#0a0a0a);color:var(--white);font:500 15px var(--font-ui,inherit)}
  .cr-nome input:focus,.cr-busca:focus{outline:none;border-color:var(--gold)}
  .cr-nome button{padding:0 16px;border-radius:10px;border:0;background:var(--gold);color:#111;font:700 13.5px var(--font-ui,inherit);cursor:pointer}
  .cr-musica{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
    border:1px solid rgba(var(--gold-rgb),.4);background:rgba(var(--gold-rgb),.08)}
  .cr-musica-txt{flex:1;min-width:0}
  .cr-musica-nome{font-weight:700;font-size:15px;color:var(--gold-hi,var(--gold));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cr-musica-sub{font-size:12px;color:var(--gray);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cr-rolar{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:6px 8px 12px}
  .cr-dica{padding:10px 8px;font-size:12.5px;color:var(--gray)}
  .cr-sec{display:block;width:100%;text-align:left;margin:10px 0 2px;padding:6px 8px;border:0;border-radius:8px;background:none;
    font:700 11px var(--font-ui,inherit);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);cursor:pointer}
  .cr-sec:first-child{margin-top:0}
  .cr-lin{display:block;width:100%;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:none;
    color:var(--white);font:500 15px/1.35 var(--font-ui,inherit);cursor:pointer;transition:background .12s,color .12s}
  .cr-sec:hover,.cr-lin:hover{background:rgba(var(--gold-rgb),.08)}
  .cr-lin:active,.cr-sec:active{background:rgba(var(--gold-rgb),.16)}
  .cr-lin.enviada,.cr-sec.enviada{background:rgba(95,211,138,.14);color:#5fd38a}
  .cr-opt{display:block;width:100%;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:none;color:var(--white);
    font:600 14.5px var(--font-ui,inherit);cursor:pointer}
  .cr-opt small{display:block;font-weight:500;font-size:12px;color:var(--gray)}
  .cr-opt:hover{background:rgba(var(--gold-rgb),.08)}
  .cr-grupo{margin:8px 8px 2px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gray2,#8a8a90)}
  .cr-status{flex:0 0 auto;min-height:0;padding:0 14px;font-size:12.5px;font-weight:600;color:var(--gray)}
  .cr-status:not(:empty){padding:10px 14px;border-top:1px solid var(--black4)}
  .cr-status.ok{color:#5fd38a}
  .cr-status.erro{color:#ff8a7a}
  .cr-bloqueado .cr-rolar,.cr-bloqueado .cr-musica{opacity:.4;pointer-events:none}`;
  document.head.appendChild(st);

  const leitorAberto = () =>
    typeof lyraAtual !== "undefined" && lyraAtual &&
    document.getElementById("lyraOverlay")?.classList.contains("open");

  const artistaDe = nome => (typeof tlArtistaDe === "function" ? tlArtistaDe(nome) : "");

  // ── envio ──
  async function enviarAoChat(texto) {
    const nome = ler(CHAVE_NOME).trim();
    if (!nome) return "nome";
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(`${BANCO}/messages.json`, {
        method: "POST",
        body: JSON.stringify({
          uid,
          name: nome,
          text: texto.slice(0, 300),
          ts: { ".sv": "timestamp" },
          file: null,
        }),
        signal: ctl.signal,
      });
      return r.ok ? "ok" : (r.status === 401 || r.status === 403 ? "negado" : "erro");
    } catch {
      return "erro";
    } finally {
      clearTimeout(t);
    }
  }

  // ── a letra, com as partes ──
  //  A da cifra vem com os títulos da equipe ([Refrão], [Ponte]);
  //  sem cifra, a do Lyra.
  const cacheLetra = new Map();
  async function letraDe(slug) {
    if (cacheLetra.has(slug)) return cacheLetra.get(slug);
    let texto = "";
    try {
      const m = await lyraCarregarMusica(slug);
      const chave = m.base_key && lyraKeySlug(m.base_key);
      const original = (chave && m.porTom.get(chave)) || [...m.porTom.values()][0] || "";
      texto = lyraExtrairLetraDosAcordes(original);
    } catch { /* sem cifra */ }
    if (!texto.replace(/\[[^\]]*\]/g, "").trim()) {
      try { texto = await lyraCarregarLetra(slug); } catch { texto = ""; }
    }
    cacheLetra.set(slug, texto || "");
    return texto || "";
  }

  function partirLetra(texto) {
    const blocos = [];
    let atual = { parte: "", linhas: [] };
    const fechar = () => { if (atual.parte || atual.linhas.length) blocos.push(atual); };
    String(texto).split(/\r?\n/).forEach(l => {
      const t = l.replace(/\s+/g, " ").trim();
      if (!t) return;
      const m = t.match(/^\[([^\]]+)\]$/);
      if (m) {
        fechar();
        atual = { parte: typeof lpRotulo === "function" ? lpRotulo(m[1]) : m[1].trim(), linhas: [] };
        return;
      }
      if (/^(?:Tom|Capo|Afina[çc][ãa]o)\s*:/i.test(t)) return;
      atual.linhas.push(t.replace(/_+/g, ""));
    });
    fechar();
    //  títulos soltos ("[Intro]" sem letra) não ajudam a achar o ponto
    return blocos.filter(b => b.linhas.length);
  }

  // ── estado ──
  let painel = null;
  let escolhida = null;        // { nome, slug, tom }
  let trocando = false;
  let editandoNome = false;
  let ocupado = false;
  let statusTimer = null;
  let pedido = 0;

  function daLeitura() {
    if (!leitorAberto()) return null;
    const nome = lyraAtual.nome || (lyraAtual.song && lyraAtual.song.title) || "";
    const slug = (lyraAtual.song && lyraAtual.song.slug) || lyraNoIndice(nome)?.slug || "";
    return { nome, slug, tom: lyraAtual.tom || "" };
  }

  function status(txt, tipo) {
    const el = painel && painel.querySelector(".cr-status");
    if (!el) return;
    clearTimeout(statusTimer);
    el.textContent = txt;
    el.className = "cr-status" + (tipo ? " " + tipo : "");
    if (tipo === "ok") statusTimer = setTimeout(() => { el.textContent = ""; el.className = "cr-status"; }, 3000);
  }

  const el = (tag, classe, txt) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (txt != null) e.textContent = txt;
    return e;
  };

  // ── parte fixa: nome e música ──
  function pintarFixo() {
    const fixo = painel.querySelector(".cr-dados");
    fixo.replaceChildren();
    const nome = ler(CHAVE_NOME).trim();

    if (nome && !editandoNome) {
      const q = el("div", "cr-quem");
      q.append("Enviando como ", el("b", "", nome), " ·");
      const trocar = el("button", "cr-link", "trocar");
      trocar.type = "button";
      trocar.addEventListener("click", () => { editandoNome = true; pintar(); });
      q.append(trocar);
      fixo.append(q);
    } else {
      const f = el("form", "cr-nome");
      const i = el("input");
      i.type = "text"; i.maxLength = 30; i.placeholder = "Seu nome no chat"; i.value = nome;
      const ok = el("button", "", "Salvar");
      ok.type = "submit";
      f.append(i, ok);
      f.addEventListener("submit", e => {
        e.preventDefault();
        const v = i.value.replace(/\s+/g, " ").trim();
        if (!v) { i.focus(); return; }
        gravar(CHAVE_NOME, v);
        editandoNome = false;
        pintar();
      });
      fixo.append(f);
      setTimeout(() => i.focus(), 60);
    }

    if (trocando) {
      const b = el("input", "cr-busca");
      b.type = "search"; b.placeholder = "Buscar música ou cantor…";
      b.addEventListener("input", () => pintarOpcoes(b.value));
      fixo.append(b);
      if (nome && !editandoNome) setTimeout(() => b.focus(), 60);
    } else if (escolhida) {
      const c = el("div", "cr-musica");
      const txt = el("div", "cr-musica-txt");
      txt.append(el("div", "cr-musica-nome", escolhida.nome));
      const sub = [artistaDe(escolhida.nome), escolhida.tom && `Tom ${escolhida.tom}`].filter(Boolean).join(" · ");
      if (sub) txt.append(el("div", "cr-musica-sub", sub));
      const trocar = el("button", "cr-link", "Trocar");
      trocar.type = "button";
      trocar.addEventListener("click", () => { trocando = true; pintar(); });
      c.append(txt, trocar);
      fixo.append(c);
    }
    painel.classList.toggle("cr-bloqueado", !nome || editandoNome);
  }

  // ── escolher a música ──
  function opcao(m, rotuloTom) {
    const b = el("button", "cr-opt");
    b.type = "button";
    b.append(m.nome);
    const sub = [artistaDe(m.nome), rotuloTom && `Tom ${rotuloTom}`].filter(Boolean).join(" · ");
    if (sub) b.append(el("small", "", sub));
    b.addEventListener("click", () => {
      escolhida = { nome: m.nome, slug: lyraNoIndice(m.nome)?.slug || "", tom: rotuloTom || "" };
      trocando = false;
      pintar();
    });
    return b;
  }

  function pintarOpcoes(termo = "") {
    const rolar = painel.querySelector(".cr-rolar");
    rolar.replaceChildren();
    const q = norm(termo).trim();
    const nav = leitorAberto() && lyraAtual.nav;
    const doCulto = typeof lyraCtxCulto !== "undefined" && lyraCtxCulto && nav && nav.itens ? nav.itens : [];

    if (!q && doCulto.length) {
      rolar.append(el("div", "cr-grupo", "Neste culto"));
      doCulto.forEach(it => rolar.append(opcao({ nome: it.nome }, it.tom)));
    }
    //  repertório + músicas com cifra que ainda não estão nele
    const todas = (typeof musicas !== "undefined" ? musicas : []).filter(m => m && m.nome).map(m => ({ nome: m.nome }));
    const slugs = new Set(todas.map(m => lyraNoIndice(m.nome)?.slug).filter(Boolean));
    if (typeof lyraIndice !== "undefined" && lyraIndice) {
      lyraIndice.forEach(s => {
        if (s && s.slug && s.title && !slugs.has(s.slug)) { slugs.add(s.slug); todas.push({ nome: s.title }); }
      });
    }
    const lista = todas
      .filter(m => !q || norm(m.nome).includes(q) || norm(artistaDe(m.nome)).includes(q))
      .slice(0, q ? 40 : 0);
    if (q) {
      if (lista.length) lista.forEach(m => rolar.append(opcao(m, "")));
      else rolar.append(el("div", "cr-dica", "Nenhuma música com esse nome."));
    } else if (!doCulto.length) {
      rolar.append(el("div", "cr-dica", "Digite o nome da música."));
    }
  }

  // ── as linhas ──
  function prefixo() {
    return `🎵 ${escolhida.nome}${escolhida.tom ? ` (${escolhida.tom})` : ""}`;
  }

  async function pintarLetra() {
    const rolar = painel.querySelector(".cr-rolar");
    rolar.replaceChildren();
    if (!escolhida) {
      rolar.append(el("div", "cr-dica", "Escolha a música."));
      return;
    }
    if (!escolhida.slug) {
      rolar.append(el("div", "cr-dica", "Essa música ainda não tem cifra nem letra no site."));
      rolar.append(botaoLinha("Enviar só o nome da música", `${prefixo()}`, "cr-sec"));
      return;
    }
    rolar.append(el("div", "cr-dica", "Carregando a letra…"));
    const meu = ++pedido;
    const blocos = partirLetra(await letraDe(escolhida.slug));
    if (meu !== pedido || !painel) return;
    rolar.replaceChildren();
    if (!blocos.length) {
      rolar.append(el("div", "cr-dica", "Não achei a letra dessa música."));
      rolar.append(botaoLinha("Enviar só o nome da música", `${prefixo()}`, "cr-sec"));
      return;
    }
    rolar.append(el("div", "cr-dica", "Toque na linha de onde vão cantar."));
    blocos.forEach(b => {
      if (b.parte) rolar.append(botaoLinha(b.parte, `${prefixo()} — ${b.parte}`, "cr-sec"));
      b.linhas.forEach(l => {
        const texto = b.parte ? `${prefixo()} — ${b.parte}: “${l}”` : `${prefixo()}: “${l}”`;
        rolar.append(botaoLinha(l, texto, "cr-lin"));
      });
    });
  }

  function botaoLinha(rotulo, texto, classe) {
    const b = el("button", classe, rotulo);
    b.type = "button";
    b.addEventListener("click", () => enviar(texto, b));
    return b;
  }

  function pintar() {
    if (!painel) return;
    pintarFixo();
    if (trocando) pintarOpcoes(painel.querySelector(".cr-busca")?.value || "");
    else pintarLetra();
  }

  async function enviar(texto, botao) {
    if (ocupado) return;
    ocupado = true;
    status("Enviando…");
    const r = await enviarAoChat(texto);
    if (r === "ok") {
      status("Enviado ✓", "ok");
      painel.querySelectorAll(".enviada").forEach(x => x.classList.remove("enviada"));
      botao.classList.add("enviada");
    } else if (r === "nome") { editandoNome = true; pintar(); status("Escreva seu nome primeiro.", "erro"); }
    else if (r === "negado") status("O chat recusou a mensagem.", "erro");
    else status("Não foi. Confira a internet e tente de novo.", "erro");
    //  um respiro para um toque duplo não mandar duas vezes
    setTimeout(() => { ocupado = false; }, 1200);
  }

  // ── abrir e fechar ──
  function montar() {
    if (painel) return painel;
    painel = el("div", "cr-painel");
    painel.id = "crPainel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", "Mandar no chat de onde vamos cantar");
    painel.innerHTML = `
      <div class="cr-fixo">
        <div class="cr-topo">
          <span class="cr-titulo">De onde vamos cantar</span>
          <button type="button" class="cr-x" aria-label="Fechar">&#10005;</button>
        </div>
        <div class="cr-dados"></div>
      </div>
      <div class="cr-rolar"></div>
      <div class="cr-status" aria-live="polite"></div>`;
    painel.querySelector(".cr-x").addEventListener("click", fechar);
    document.body.appendChild(painel);
    return painel;
  }

  const aberto = () => !!painel && painel.classList.contains("on");

  function abrir() {
    montar();
    escolhida = daLeitura() || escolhida;
    trocando = !escolhida;
    editandoNome = false;
    status("");
    pintar();
    painel.classList.add("on");
    document.getElementById("lyraMsgs")?.classList.add("on");
  }
  function fechar() {
    if (!painel) return;
    painel.classList.remove("on");
    document.getElementById("lyraMsgs")?.classList.remove("on");
  }
  const alternar = () => (aberto() ? fechar() : abrir());

  document.addEventListener("pointerdown", e => {
    if (!aberto()) return;
    if (painel.contains(e.target) || e.target.closest?.("#lyraMsgs")) return;
    fechar();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && aberto()) fechar(); });

  // ── botão no leitor ──
  const ICO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z"/></svg>`;

  function botaoNoLeitor() {
    const acoes = document.querySelector("#lyraOverlay .lyra-hd-acoes");
    if (!acoes || document.getElementById("lyraMsgs")) return;
    const b = el("button", "lyra-btn");
    b.type = "button";
    b.id = "lyraMsgs";
    b.title = "Mandar no chat de onde vamos cantar";
    b.setAttribute("aria-label", "Mandar no chat de onde vamos cantar");
    b.innerHTML = ICO;
    b.addEventListener("click", alternar);
    acoes.insertBefore(b, document.getElementById("lyraChat") || document.getElementById("lyraFechar"));
  }

  //  O chat.js põe o botão dele antes do X a cada sincronização;
  //  o nosso fica antes do dele.
  if (typeof chatSincronizar === "function") {
    const anterior = chatSincronizar;
    chatSincronizar = function (...a) {
      const r = anterior.apply(this, a);
      const nosso = document.getElementById("lyraMsgs");
      const chat = document.getElementById("lyraChat");
      if (nosso && chat && nosso.nextElementSibling !== chat) chat.before(nosso);
      return r;
    };
  }
  if (typeof lyraMontarEstrutura === "function") {
    const anterior = lyraMontarEstrutura;
    lyraMontarEstrutura = function (...a) { const r = anterior.apply(this, a); botaoNoLeitor(); return r; };
  }
  if (typeof lyraAtualizarCabecalho === "function") {
    const anterior = lyraAtualizarCabecalho;
    lyraAtualizarCabecalho = function (...a) { const r = anterior.apply(this, a); botaoNoLeitor(); return r; };
  }
  if (typeof lyraFecharLeitor === "function") {
    const anterior = lyraFecharLeitor;
    lyraFecharLeitor = function (...a) { const r = anterior.apply(this, a); fechar(); return r; };
  }

  const iniciar = () => botaoNoLeitor();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
