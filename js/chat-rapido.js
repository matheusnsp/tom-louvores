// ============================================================
//  TOM LOUVORES — "de onde vamos cantar", direto no chat
//  Carregue DEPOIS do chat.js, do chat-aviso.js e do
//  leitor-palco.js.
//
//  No leitor de cifra, só para quem entrou (admin), há um botão de
//  raio que abre um painel:
//    1. a música: já vem a que está aberta; "Trocar" deixa escolher
//       outra (as do culto primeiro, ou buscando pelo nome).
//       "Enviar" manda só o nome e o tom.
//    2. a letra dela, linha por linha, com as partes ([Refrão],
//       [Ponte]...) como títulos. Com a música aberta no leitor, a
//       letra acompanha a cifra: a linha que está no topo da tela
//       fica marcada e o painel rola junto.
//    3. tocar numa linha envia na hora para o chat, em duas linhas:
//         Agora: REFRÃO · 2ª vez
//         “Eu quero nascer do Teu espírito”
//       tocar num título envia só a parte.
//
//  O chat guarda as mensagens num Firebase aberto (o mesmo que o
//  chat-aviso.js lê); daqui a mensagem entra direto lá, pela API
//  REST, com o nome que a pessoa escreveu uma vez neste aparelho.
//  A mensagem vai em duas linhas (parte em cima, trecho embaixo).
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
  const rotulo = t => (typeof lpRotulo === "function" ? lpRotulo(t) : String(t).replace(/^\[|\]$/g, "").trim());
  const logado = () => typeof isAdmin === "function" && isAdmin() === true;

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
  //  O cartão da música é grade, não flex: no Safari do iPad o
  //  texto do flex com reticências chegava a sumir.
  const st = document.createElement("style");
  st.textContent = `
  #lyraMsgs{display:flex;align-items:center;justify-content:center}
  .cr-painel{position:fixed;z-index:9700;top:calc(64px + env(safe-area-inset-top));right:16px;
    width:min(400px, calc(100vw - 32px));max-height:calc(100vh - 84px);
    display:flex;flex-direction:column;
    background:var(--black2,#141416);border:1px solid var(--black5,#2a2a2e);border-radius:14px;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
    opacity:0;visibility:hidden;transform:translateY(-6px);
    transition:opacity .18s,transform .18s,visibility 0s linear .18s}
  .cr-painel.on{opacity:1;visibility:visible;transform:none;transition:opacity .18s,transform .18s,visibility 0s}
  @media (max-width:600px){
    .cr-painel{top:auto;bottom:0;right:0;left:0;width:auto;max-height:82vh;
      border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(12px)}
  }
  .cr-fixo{flex:0 0 auto;padding:14px 14px 12px;border-bottom:1px solid var(--black4,#222)}
  .cr-topo{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .cr-titulo{flex:1;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#f2c14e)}
  .cr-x{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:none;
    border:1px solid var(--black5,#2a2a2e);border-radius:6px;color:var(--gray,#aaa);cursor:pointer;font-size:13px}
  .cr-x:hover{color:var(--white,#fff);background:var(--black4,#222)}
  .cr-quem{display:flex;align-items:center;gap:6px;margin-bottom:10px;font-size:12.5px;color:var(--gray,#aaa)}
  .cr-quem b{color:var(--white,#fff);font-weight:700}
  .cr-link{background:none;border:0;padding:0;color:var(--gold,#f2c14e);font:600 12.5px var(--font-ui,inherit);cursor:pointer;text-decoration:underline}
  .cr-nome{display:flex;gap:8px;margin-bottom:10px}
  .cr-nome input,.cr-busca{flex:1;min-width:0;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;
    border:1px solid var(--black5,#2a2a2e);background:var(--black,#0a0a0a);color:var(--white,#fff);font:500 16px var(--font-ui,inherit)}
  .cr-nome input:focus,.cr-busca:focus{outline:none;border-color:var(--gold,#f2c14e)}
  .cr-nome button{padding:0 16px;border-radius:10px;border:0;background:var(--gold,#f2c14e);color:#111;font:700 13.5px var(--font-ui,inherit);cursor:pointer}
  .cr-musica{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:10px;
    padding:10px 10px 10px 12px;border-radius:10px;border:1px solid rgba(var(--gold-rgb,242,193,78),.4);
    background:rgba(var(--gold-rgb,242,193,78),.08)}
  .cr-musica-nome{display:block;font-weight:700;font-size:15px;line-height:1.3;color:var(--gold,#f2c14e);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cr-musica-sub{display:block;margin-top:1px;font-size:12px;line-height:1.3;color:var(--gray,#aaa);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cr-musica-acoes{display:flex;align-items:center;gap:10px}
  .cr-enviar-mus{display:inline-flex;align-items:center;gap:5px;padding:7px 11px;border-radius:999px;border:0;
    background:var(--gold,#f2c14e);color:#111;font:700 12.5px var(--font-ui,inherit);cursor:pointer;white-space:nowrap}
  .cr-rolar{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:6px 8px 12px;position:relative}
  .cr-dica{padding:10px 8px;font-size:12.5px;color:var(--gray,#aaa)}
  .cr-sec{display:flex;align-items:baseline;gap:6px;width:100%;text-align:left;margin:12px 0 2px;padding:6px 8px;border:0;border-radius:8px;background:none;
    font:700 11px var(--font-ui,inherit);letter-spacing:.12em;text-transform:uppercase;color:var(--gold,#f2c14e);cursor:pointer}
  .cr-sec small{font-size:10px;letter-spacing:.06em;color:var(--gray2,#8a8a90);font-weight:600;text-transform:none}
  .cr-sec:first-child{margin-top:0}
  .cr-lin{position:relative;display:block;width:100%;text-align:left;padding:9px 10px 9px 14px;border:0;border-radius:8px;background:none;
    color:var(--white,#fff);font:500 15px/1.35 var(--font-ui,inherit);cursor:pointer;transition:background .15s,color .15s}
  .cr-sec:hover,.cr-lin:hover{background:rgba(var(--gold-rgb,242,193,78),.08)}
  .cr-lin:active,.cr-sec:active{background:rgba(var(--gold-rgb,242,193,78),.16)}
  .cr-lin.aqui{background:rgba(var(--gold-rgb,242,193,78),.12);color:var(--gold-hi,var(--gold,#f2c14e))}
  .cr-lin.aqui::before{content:"";position:absolute;left:4px;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--gold,#f2c14e)}
  .cr-lin.enviada,.cr-sec.enviada{background:rgba(95,211,138,.14);color:#5fd38a}
  .cr-lin.enviada::after,.cr-sec.enviada::after{content:" ✓";font-weight:700}
  .cr-opt{display:block;width:100%;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:none;color:var(--white,#fff);
    font:600 14.5px var(--font-ui,inherit);cursor:pointer}
  .cr-opt small{display:block;font-weight:500;font-size:12px;color:var(--gray,#aaa)}
  .cr-opt:hover{background:rgba(var(--gold-rgb,242,193,78),.08)}
  .cr-grupo{margin:8px 8px 2px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gray2,#8a8a90)}
  .cr-status{display:none;margin:-2px 0 10px;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.35;
    color:var(--gray,#aaa);background:var(--black,#0a0a0a);border:1px solid var(--black5,#2a2a2e);white-space:pre-line}
  .cr-status:not(:empty){display:block}
  .cr-status.ok{color:#5fd38a;background:rgba(95,211,138,.1);border-color:rgba(95,211,138,.35)}
  .cr-status.erro{color:#ff8a7a;background:rgba(255,138,122,.08);border-color:rgba(255,138,122,.35)}
  .cr-bloqueado .cr-rolar,.cr-bloqueado .cr-musica{opacity:.4;pointer-events:none}`;
  document.head.appendChild(st);

  const leitorAberto = () =>
    typeof lyraAtual !== "undefined" && lyraAtual &&
    document.getElementById("lyraOverlay")?.classList.contains("open");

  const artistaDe = nome => (typeof tlArtistaDe === "function" ? tlArtistaDe(nome) : "");

  // ── as mensagens ──
  //  Duas linhas: em cima ONDE (a parte), embaixo o trecho entre
  //  aspas. A música e o tom não se repetem a cada verso: vão uma
  //  vez, no "Enviar" do cartão. Sem emojis.
  //  O chat da igreja hoje mostra a quebra de linha como espaço;
  //  aí a mensagem fica "Agora: REFRÃO · 2ª vez “…”", que também lê
  //  bem.
  const ORDINAL = n => `${n}ª vez`;
  function parteTxt(b) {
    if (!b || !b.parte) return "";
    return b.parte.toLocaleUpperCase("pt-BR") + (b.total > 1 ? ` · ${ORDINAL(b.vez)}` : "");
  }
  function trecho(l) {
    const t = l.replace(/[\s,;.:!?-]+$/, "");
    return t.length > 110 ? t.slice(0, 108).trimEnd() + "…" : t;
  }
  const msgLinha = (b, l) => {
    const p = parteTxt(b);
    return `${p ? `Agora: ${p}` : "A partir de:"}\n“${trecho(l)}”`;
  };
  const msgParte = b => `Agora: ${parteTxt(b)}`;
  function msgMusica() {
    const sub = [escolhida.tom && `Tom ${escolhida.tom}`, artistaDe(escolhida.nome)].filter(Boolean).join(" · ");
    return `Vamos tocar: ${escolhida.nome}` + (sub ? `\n${sub}` : "");
  }

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

  // ── a letra, em blocos ──
  //  bloco = { parte, vez, total, linhas: [{ texto, el? }] }
  const IGNORAR_PARTE = /^(repete|repetir|repita|bis|obs|\(?\d+\s*x\b|x\s*\d+)|\b(riff|tab)\b/i;
  //  Parte só de instrumento: a letra que vem depois é do verso, não
  //  "da intro". Abre um bloco sem nome.
  const INSTRUMENTAL = /^(intro|introdu[cç][aã]o|solo|instrumental|interl[uú]dio)\b/i;
  const nomeDaParte = nome => (INSTRUMENTAL.test(nome) ? "" : nome);

  function numerar(blocos) {
    const total = {}, vez = {};
    blocos.forEach(b => { if (b.parte) total[norm(b.parte)] = (total[norm(b.parte)] || 0) + 1; });
    blocos.forEach(b => {
      if (!b.parte) return;
      const k = norm(b.parte);
      vez[k] = (vez[k] || 0) + 1;
      b.vez = vez[k];
      b.total = total[k];
    });
    return blocos;
  }

  //  Da música aberta: as próprias linhas da tela. Assim cada linha
  //  do painel sabe onde está na cifra e o painel pode acompanhar.
  function blocosDoLeitor() {
    const pre = document.querySelector("#lyraCorpo .lyra-pre");
    if (!pre || typeof lpLinhas !== "function") return [];
    const blocos = [];
    let atual = { parte: "", linhas: [] };
    const fechar = () => { if (atual.linhas.length) blocos.push(atual); };
    lpLinhas(pre).forEach(sp => {
      if (sp.classList.contains("lyra-comentario")) return;
      const secao = sp.classList.contains("lyra-secao") ? sp : sp.querySelector(".lyra-secao");
      if (secao) {
        const nome = rotulo(secao.textContent);
        if (nome && nome.length <= 28 && !IGNORAR_PARTE.test(nome)) {
          fechar();
          atual = { parte: nomeDaParte(nome), linhas: [] };
        }
        return;
      }
      if (!sp.classList.contains("lyra-letra")) return;
      const t = sp.textContent.replace(/_+/g, "").replace(/\s+/g, " ").trim();
      if (!t || /^(?:Tom|Capo|Afina[çc][ãa]o)\s*:/i.test(t)) return;
      atual.linhas.push({ texto: t, el: sp });
    });
    fechar();
    return numerar(blocos);
  }

  //  De outra música: a letra tirada da cifra (com os títulos da
  //  equipe) ou, sem cifra, a do Lyra.
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
    const fechar = () => { if (atual.linhas.length) blocos.push(atual); };
    String(texto).split(/\r?\n/).forEach(l => {
      const t = l.replace(/\s+/g, " ").trim();
      if (!t) return;
      const m = t.match(/^\[([^\]]+)\]$/);
      if (m) {
        const nome = rotulo(m[1]);
        if (nome && !IGNORAR_PARTE.test(nome)) { fechar(); atual = { parte: nomeDaParte(nome), linhas: [] }; }
        return;
      }
      if (/^(?:Tom|Capo|Afina[çc][ãa]o)\s*:/i.test(t)) return;
      atual.linhas.push({ texto: t.replace(/_+/g, "") });
    });
    fechar();
    return numerar(blocos);
  }

  // ── estado ──
  let painel = null;
  let escolhida = null;        // { nome, slug, tom, doLeitor }
  let trocando = false;
  let editandoNome = false;
  let ocupado = false;
  let statusTimer = null;
  let pedido = 0;
  let vivas = [];              // [{ el, botao }] linhas ligadas à cifra aberta
  let marcada = null;
  let maoNoPainel = 0;         // quando a pessoa rolou o painel com a mão

  function daLeitura() {
    if (!leitorAberto()) return null;
    const titulo = document.getElementById("lyraTitulo")?.textContent.trim() || "";
    const nome = lyraAtual.nome || (lyraAtual.song && lyraAtual.song.title) || titulo;
    const slug = (lyraAtual.song && lyraAtual.song.slug) || (nome && lyraNoIndice(nome)?.slug) || "";
    return { nome, slug, tom: lyraAtual.tom || "", doLeitor: true };
  }

  const ehDoLeitor = () => {
    if (!escolhida || !leitorAberto()) return false;
    const agora = daLeitura();
    return !!agora && !!agora.slug && agora.slug === escolhida.slug;
  };

  function status(txt, tipo) {
    const s = painel && painel.querySelector(".cr-status");
    if (!s) return;
    clearTimeout(statusTimer);
    s.textContent = txt;
    s.className = "cr-status" + (tipo ? " " + tipo : "");
    if (tipo === "ok") statusTimer = setTimeout(() => { s.textContent = ""; s.className = "cr-status"; }, 4000);
  }

  const novo = (tag, classe, txt) => {
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
      const q = novo("div", "cr-quem");
      q.append("Enviando como ", novo("b", "", nome), " ·");
      const trocar = novo("button", "cr-link", "trocar");
      trocar.type = "button";
      trocar.addEventListener("click", () => { editandoNome = true; pintar(); });
      q.append(trocar);
      fixo.append(q);
    } else {
      const f = novo("form", "cr-nome");
      const i = novo("input");
      i.type = "text"; i.maxLength = 30; i.placeholder = "Seu nome no chat"; i.value = nome;
      const ok = novo("button", "", "Salvar");
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
      const b = novo("input", "cr-busca");
      b.type = "search"; b.placeholder = "Buscar música ou cantor…";
      b.addEventListener("input", () => pintarOpcoes(b.value));
      fixo.append(b);
      if (nome && !editandoNome) setTimeout(() => b.focus(), 60);
    } else if (escolhida) {
      const c = novo("div", "cr-musica");
      const txt = novo("div", "cr-musica-txt");
      txt.append(novo("span", "cr-musica-nome", escolhida.nome || "Música sem nome"));
      const sub = [artistaDe(escolhida.nome), escolhida.tom && `Tom ${escolhida.tom}`].filter(Boolean).join(" · ");
      if (sub) txt.append(novo("span", "cr-musica-sub", sub));
      const acoes = novo("div", "cr-musica-acoes");
      const env = novo("button", "cr-enviar-mus", "Enviar ➤");
      env.type = "button";
      env.title = "Mandar no chat o nome e o tom da música";
      env.addEventListener("click", () => enviar(msgMusica(), env));
      const trocar = novo("button", "cr-link", "Trocar");
      trocar.type = "button";
      trocar.addEventListener("click", () => { trocando = true; pintar(); });
      acoes.append(env, trocar);
      c.append(txt, acoes);
      fixo.append(c);
    }
    painel.classList.toggle("cr-bloqueado", !nome || editandoNome);
  }

  // ── escolher a música ──
  function opcao(m, rotuloTom) {
    const b = novo("button", "cr-opt");
    b.type = "button";
    b.append(m.nome);
    const sub = [artistaDe(m.nome), rotuloTom && `Tom ${rotuloTom}`].filter(Boolean).join(" · ");
    if (sub) b.append(novo("small", "", sub));
    b.addEventListener("click", () => {
      const daTela = daLeitura();
      const slug = lyraNoIndice(m.nome)?.slug || "";
      //  escolher a mesma que está aberta volta a acompanhar a cifra
      escolhida = daTela && daTela.slug && daTela.slug === slug
        ? daTela
        : { nome: m.nome, slug, tom: rotuloTom || "", doLeitor: false };
      trocando = false;
      pintar();
    });
    return b;
  }

  function pintarOpcoes(termo = "") {
    vivas = [];
    const rolar = painel.querySelector(".cr-rolar");
    rolar.replaceChildren();
    const q = norm(termo).trim();
    const nav = leitorAberto() && lyraAtual.nav;
    const doCulto = typeof lyraCtxCulto !== "undefined" && lyraCtxCulto && nav && nav.itens ? nav.itens : [];

    if (!q && doCulto.length) {
      rolar.append(novo("div", "cr-grupo", "Neste culto"));
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
      else rolar.append(novo("div", "cr-dica", "Nenhuma música com esse nome."));
    } else if (!doCulto.length) {
      rolar.append(novo("div", "cr-dica", "Digite o nome da música."));
    }
  }

  // ── as linhas ──
  function desenharBlocos(blocos, acompanhando) {
    const rolar = painel.querySelector(".cr-rolar");
    rolar.replaceChildren();
    vivas = [];
    marcada = null;
    rolar.append(novo("div", "cr-dica", acompanhando
      ? "Toque na linha de onde vão cantar. A marcada acompanha a cifra."
      : "Toque na linha de onde vão cantar."));
    blocos.forEach(b => {
      if (b.parte) {
        const s = novo("button", "cr-sec");
        s.type = "button";
        s.append(b.parte);
        if (b.total > 1) s.append(novo("small", "", ORDINAL(b.vez)));
        s.addEventListener("click", () => enviar(msgParte(b), s));
        rolar.append(s);
      }
      b.linhas.forEach(l => {
        const botao = novo("button", "cr-lin", l.texto);
        botao.type = "button";
        botao.addEventListener("click", () => enviar(msgLinha(b, l.texto), botao));
        rolar.append(botao);
        if (l.el) vivas.push({ el: l.el, botao });
      });
    });
    if (acompanhando) acompanhar(true);
  }

  async function pintarLetra() {
    const rolar = painel.querySelector(".cr-rolar");
    vivas = [];
    if (!escolhida) {
      rolar.replaceChildren(novo("div", "cr-dica", "Escolha a música."));
      return;
    }
    if (ehDoLeitor()) {
      const blocos = blocosDoLeitor();
      if (blocos.length) { desenharBlocos(blocos, true); return; }
    }
    if (!escolhida.slug) {
      rolar.replaceChildren(novo("div", "cr-dica", "Essa música ainda não tem cifra nem letra no site. Dá para mandar só o nome, no botão Enviar."));
      return;
    }
    rolar.replaceChildren(novo("div", "cr-dica", "Carregando a letra…"));
    const meu = ++pedido;
    const blocos = partirLetra(await letraDe(escolhida.slug));
    if (meu !== pedido || !painel || trocando) return;
    if (!blocos.length) {
      rolar.replaceChildren(novo("div", "cr-dica", "Não achei a letra dessa música. Dá para mandar só o nome, no botão Enviar."));
      return;
    }
    desenharBlocos(blocos, false);
  }

  function pintar() {
    if (!painel) return;
    pintarFixo();
    if (trocando) pintarOpcoes(painel.querySelector(".cr-busca")?.value || "");
    else pintarLetra();
  }

  // ── acompanhar a cifra ──
  //  A linha "de agora" é a primeira linha de letra inteira na tela
  //  do leitor (em páginas, a do alto da primeira coluna visível).
  function linhaDaTela() {
    const corpo = document.getElementById("lyraCorpo");
    if (!corpo || !vivas.length) return null;
    const c = corpo.getBoundingClientRect();
    for (const v of vivas) {
      if (!v.el.isConnected) return null;
      const r = v.el.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.top >= c.top + 4 && r.bottom <= c.bottom && r.left >= c.left - 2 && r.right <= c.right + 40) return v;
    }
    return null;
  }

  function acompanhar(semAnimar) {
    if (!aberto() || !vivas.length) return;
    const v = linhaDaTela();
    if (!v || v === marcada) return;
    if (marcada) marcada.botao.classList.remove("aqui");
    marcada = v;
    v.botao.classList.add("aqui");
    //  se a pessoa está mexendo no painel, não puxa ele de volta
    if (Date.now() - maoNoPainel < 4000) return;
    const rolar = painel.querySelector(".cr-rolar");
    const alvo = Math.max(0, v.botao.offsetTop - rolar.clientHeight * 0.3);
    //  salto grande (troca de colunas, outra parte) vai direto
    const longe = Math.abs(alvo - rolar.scrollTop) > 500;
    rolar.scrollTo({ top: alvo, behavior: semAnimar || longe ? "auto" : "smooth" });
  }

  let quadro = 0;
  const agendarAcompanhar = () => {
    if (quadro) return;
    quadro = requestAnimationFrame(() => { quadro = 0; acompanhar(false); });
  };
  document.addEventListener("scroll", e => {
    if (e.target && e.target.id === "lyraCorpo") agendarAcompanhar();
  }, true);
  window.addEventListener("resize", agendarAcompanhar);

  async function enviar(texto, botao) {
    if (ocupado || !logado()) return;
    ocupado = true;
    status("Enviando…");
    const r = await enviarAoChat(texto);
    if (r === "ok") {
      status(`Enviado ✓\n${texto}`, "ok");
      painel.querySelectorAll(".enviada").forEach(x => x.classList.remove("enviada"));
      if (botao && botao.classList.contains("cr-lin") || botao && botao.classList.contains("cr-sec")) {
        botao.classList.add("enviada");
        setTimeout(() => botao.classList.remove("enviada"), 6000);
      }
    } else if (r === "nome") { editandoNome = true; pintar(); status("Escreva seu nome primeiro.", "erro"); }
    else if (r === "negado") status("O chat recusou a mensagem.", "erro");
    else status("Não foi. Confira a internet e tente de novo.", "erro");
    //  um respiro para um toque duplo não mandar duas vezes
    setTimeout(() => { ocupado = false; }, 700);
  }

  // ── abrir e fechar ──
  function montar() {
    if (painel) return painel;
    painel = novo("div", "cr-painel");
    painel.id = "crPainel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", "Mandar no chat de onde vamos cantar");
    painel.innerHTML = `
      <div class="cr-fixo">
        <div class="cr-topo">
          <span class="cr-titulo">De onde vamos cantar</span>
          <button type="button" class="cr-x" aria-label="Fechar">&#10005;</button>
        </div>
        <div class="cr-status" aria-live="polite"></div>
        <div class="cr-dados"></div>
      </div>
      <div class="cr-rolar"></div>`;
    painel.querySelector(".cr-x").addEventListener("click", fechar);
    const rolar = painel.querySelector(".cr-rolar");
    ["touchstart", "wheel", "pointerdown"].forEach(ev =>
      rolar.addEventListener(ev, () => { maoNoPainel = Date.now(); }, { passive: true }));
    document.body.appendChild(painel);
    return painel;
  }

  const aberto = () => !!painel && painel.classList.contains("on");

  function abrir() {
    if (!logado()) return;
    montar();
    escolhida = daLeitura() || escolhida;
    trocando = !escolhida;
    editandoNome = false;
    maoNoPainel = 0;
    status("");
    painel.classList.add("on");
    document.getElementById("lyraMsgs")?.classList.add("on");
    pintar();
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
    //  mexer na cifra (rolar, trocar de parte) não fecha: o painel
    //  acompanha. Fecha ao tocar fora do leitor.
    if (e.target.closest?.("#lyraOverlay")) return;
    fechar();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && aberto()) fechar(); });

  // ── botão no leitor ──
  const ICO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z"/></svg>`;

  //  Só para quem entrou (admin), igual ao chat. Sem login o botão
  //  sai e o painel fecha.
  function botaoNoLeitor() {
    const atual = document.getElementById("lyraMsgs");
    if (!logado()) { fechar(); if (atual) atual.remove(); return; }
    const acoes = document.querySelector("#lyraOverlay .lyra-hd-acoes");
    if (!acoes || atual) return;
    const b = novo("button", "lyra-btn");
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
      botaoNoLeitor();
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

  //  Trocou de música no leitor (setas) ou a cifra foi redesenhada
  //  (tom, zoom, colunas, cifra/letra): o painel segue a tela, a
  //  menos que a pessoa tenha escolhido outra música nele.
  function seguirLeitor() {
    if (!aberto() || trocando) return;
    const agora = daLeitura();
    if (!agora) return;
    if (!escolhida || escolhida.doLeitor || escolhida.slug === agora.slug) {
      const mudou = !escolhida || escolhida.slug !== agora.slug || escolhida.tom !== agora.tom;
      escolhida = agora;
      if (mudou) pintarFixo();
      //  mesmas linhas na tela (só redesenho de colunas): não refaz,
      //  para não perder a rolagem do painel nem a marca de enviada
      const intactas = !mudou && vivas.length &&
        vivas[0].el.isConnected && vivas[vivas.length - 1].el.isConnected;
      if (intactas) acompanhar(false);
      else pintarLetra();
    }
  }
  let refazer = 0;
  const agendarSeguir = () => { clearTimeout(refazer); refazer = setTimeout(seguirLeitor, 60); };

  if (typeof lyraAtualizarCabecalho === "function") {
    const anterior = lyraAtualizarCabecalho;
    lyraAtualizarCabecalho = function (...a) { const r = anterior.apply(this, a); botaoNoLeitor(); agendarSeguir(); return r; };
  }
  if (typeof lpMontarMapa === "function") {
    const anterior = lpMontarMapa;
    lpMontarMapa = function (...a) { const r = anterior.apply(this, a); agendarSeguir(); return r; };
  }
  if (typeof lyraFecharLeitor === "function") {
    const anterior = lyraFecharLeitor;
    lyraFecharLeitor = function (...a) { const r = anterior.apply(this, a); fechar(); return r; };
  }

  const iniciar = () => botaoNoLeitor();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
