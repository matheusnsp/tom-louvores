// ============================================================
//  TOM LOUVORES — mensagens prontas para o chat
//  Carregue DEPOIS do chat.js, do chat-aviso.js e do
//  leitor-palco.js.
//
//  No leitor de cifra, para TODO MUNDO (não só admin), há um botão
//  de raio que abre um painelzinho com mensagens de um toque:
//    · a música aberta ("🎵 Agora: Todas As Coisas (G)") e, se ela
//      veio de um culto, a próxima da lista
//    · as partes da música, na ordem da cifra (Início, Refrão,
//      Ponte...); sem partes marcadas, as de sempre
//    · "Mais uma vez" e "Vamos encerrar"
//
//  Tocar envia na hora para o chat da igreja. O chat guarda as
//  mensagens num Firebase aberto (o mesmo que o chat-aviso.js lê);
//  daqui a mensagem entra direto lá, pela API REST, com o nome que
//  a pessoa escreveu uma vez neste aparelho. Não precisa abrir o
//  chat nem estar logado nele.
// ============================================================
(() => {
  "use strict";

  const BANCO = "https://church-chat-dd8ea-default-rtdb.firebaseio.com";
  const CHAVE_NOME = "tl_chat_nome";
  const CHAVE_UID = "tl_chat_uid";

  const ler = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

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
    width:min(380px, calc(100vw - 32px));max-height:calc(100vh - 90px);overflow:auto;
    background:var(--black2,#141416);border:1px solid var(--black5);border-radius:14px;
    box-shadow:0 24px 60px rgba(0,0,0,.6);padding:14px 14px 16px;
    opacity:0;visibility:hidden;transform:translateY(-6px);
    transition:opacity .18s,transform .18s,visibility 0s linear .18s}
  .cr-painel.on{opacity:1;visibility:visible;transform:none;transition:opacity .18s,transform .18s,visibility 0s}
  @media (max-width:600px){
    .cr-painel{top:auto;bottom:0;right:0;left:0;width:auto;max-height:70vh;
      border-radius:16px 16px 0 0;padding-bottom:calc(16px + env(safe-area-inset-bottom));transform:translateY(12px)}
  }
  .cr-topo{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .cr-titulo{flex:1;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
  .cr-x{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:none;
    border:1px solid var(--black5);border-radius:6px;color:var(--gray);cursor:pointer;font-size:13px}
  .cr-x:hover{color:var(--white);background:var(--black4)}
  .cr-quem{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12.5px;color:var(--gray)}
  .cr-quem b{color:var(--white);font-weight:700}
  .cr-quem button{background:none;border:0;padding:0;color:var(--gold);font:600 12.5px var(--font-ui,inherit);cursor:pointer;text-decoration:underline}
  .cr-nome{display:flex;gap:8px;margin-bottom:12px}
  .cr-nome input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid var(--black5);
    background:var(--black,#0a0a0a);color:var(--white);font:500 15px var(--font-ui,inherit)}
  .cr-nome input:focus{outline:none;border-color:var(--gold)}
  .cr-nome button{padding:0 16px;border-radius:10px;border:0;background:var(--gold);color:#111;font:700 13.5px var(--font-ui,inherit);cursor:pointer}
  .cr-sub{margin:12px 0 6px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gray2,#8a8a90)}
  .cr-sub:first-of-type{margin-top:0}
  .cr-linha{display:flex;flex-wrap:wrap;gap:6px}
  .cr-chip{max-width:100%;display:inline-flex;align-items:center;padding:9px 13px;border-radius:999px;
    border:1px solid var(--black5);background:var(--black,#0a0a0a);color:var(--white);
    font:600 13.5px var(--font-ui,inherit);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    transition:background .15s,border-color .15s,color .15s,opacity .15s}
  .cr-chip:hover{border-color:rgba(var(--gold-rgb),.5);color:var(--gold-hi,var(--gold))}
  .cr-chip:active{transform:scale(.97)}
  .cr-chip.musica{border-color:rgba(var(--gold-rgb),.45);background:rgba(var(--gold-rgb),.1);color:var(--gold-hi,var(--gold))}
  .cr-chip[disabled]{opacity:.45;cursor:default}
  .cr-status{min-height:18px;margin-top:12px;font-size:12.5px;font-weight:600;color:var(--gray)}
  .cr-status.ok{color:#5fd38a}
  .cr-status.erro{color:#ff8a7a}
  .cr-bloqueado .cr-sub,.cr-bloqueado .cr-linha{opacity:.4;pointer-events:none}`;
  document.head.appendChild(st);

  // ── frases ──
  const FEMININO = /^(ponte|parte|intro(du[cç][aã]o)?|estrofe|virada|sa[ií]da|coda|tag|ministra[cç][aã]o|primeira|segunda|terceira|quarta)\b/i;
  const PADRAO = ["Início", "Verso", "Pré-refrão", "Refrão", "Ponte", "Final"];

  function frasePara(parte) {
    const p = parte.trim();
    if (/^in[ií]cio$/i.test(p)) return "⏮️ Vamos voltar pro início";
    if (/^refr[aã]o$/i.test(p)) return "🔁 Vamos pro refrão";
    if (/^final$/i.test(p)) return "🏁 Vamos pro final";
    return `➡️ Vamos ${FEMININO.test(p) ? "pra" : "pro"} ${p.toLocaleLowerCase("pt-BR")}`;
  }

  const leitorAberto = () =>
    typeof lyraAtual !== "undefined" && lyraAtual &&
    document.getElementById("lyraOverlay")?.classList.contains("open");

  function partesDaMusica() {
    if (!leitorAberto() || typeof lpSecoes === "undefined" || !Array.isArray(lpSecoes)) return [];
    const vistas = new Set();
    const lista = [];
    lpSecoes.forEach(s => {
      if (s.tipo !== "secao") return;
      const nome = String(s.rotulo || "").replace(/\s*·\d+$/, "").trim();
      const chave = nome.toLowerCase();
      if (!nome || vistas.has(chave)) return;
      vistas.add(chave);
      lista.push(nome);
    });
    return lista;
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

  // ── painel ──
  let painel = null;
  let statusTimer = null;
  let ocupado = false;

  function status(txt, tipo) {
    const el = painel && painel.querySelector(".cr-status");
    if (!el) return;
    clearTimeout(statusTimer);
    el.textContent = txt;
    el.className = "cr-status" + (tipo ? " " + tipo : "");
    if (tipo === "ok") statusTimer = setTimeout(() => { el.textContent = ""; el.className = "cr-status"; }, 3000);
  }

  function chip(rotulo, texto, classe) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cr-chip" + (classe ? " " + classe : "");
    b.textContent = rotulo;
    b.title = texto;
    b.addEventListener("click", () => enviar(texto));
    return b;
  }

  function sub(txt) {
    const d = document.createElement("div");
    d.className = "cr-sub";
    d.textContent = txt;
    return d;
  }
  function linha(...filhos) {
    const d = document.createElement("div");
    d.className = "cr-linha";
    d.append(...filhos);
    return d;
  }

  function blocoNome(editando) {
    const nome = ler(CHAVE_NOME).trim();
    if (nome && !editando) {
      const q = document.createElement("div");
      q.className = "cr-quem";
      q.append("Enviando como ");
      const b = document.createElement("b");
      b.textContent = nome;
      const trocar = document.createElement("button");
      trocar.type = "button";
      trocar.textContent = "trocar";
      trocar.addEventListener("click", () => pintar(true));
      q.append(b, " ·", trocar);
      return q;
    }
    const f = document.createElement("form");
    f.className = "cr-nome";
    const i = document.createElement("input");
    i.type = "text";
    i.maxLength = 30;
    i.placeholder = "Seu nome no chat";
    i.value = nome;
    i.autocomplete = "given-name";
    const ok = document.createElement("button");
    ok.type = "submit";
    ok.textContent = "Salvar";
    f.append(i, ok);
    f.addEventListener("submit", e => {
      e.preventDefault();
      const v = i.value.replace(/\s+/g, " ").trim();
      if (!v) { i.focus(); return; }
      gravar(CHAVE_NOME, v);
      pintar(false);
    });
    setTimeout(() => i.focus(), 50);
    return f;
  }

  function pintar(editandoNome = false) {
    if (!painel) return;
    const corpo = painel.querySelector(".cr-corpo");
    corpo.replaceChildren();
    const semNome = !ler(CHAVE_NOME).trim();
    corpo.appendChild(blocoNome(editandoNome || semNome));
    painel.classList.toggle("cr-bloqueado", editandoNome || semNome);

    if (leitorAberto()) {
      const titulo = (lyraAtual.song && lyraAtual.song.title) || lyraAtual.nome || "";
      const tom = lyraAtual.tom || "";
      const itens = [];
      if (titulo) {
        itens.push(chip(`🎵 ${titulo}${tom ? " · " + tom : ""}`,
          `🎵 Agora: ${titulo}${tom ? ` (${tom})` : ""}`, "musica"));
      }
      //  "Próxima" só faz sentido na ordem de um culto
      const nav = lyraAtual.nav;
      const prox = typeof lyraCtxCulto !== "undefined" && lyraCtxCulto && nav && nav.itens
        ? nav.itens[nav.idx + 1] : null;
      if (prox && prox.nome) {
        itens.push(chip(`⏭️ Próxima: ${prox.nome}`,
          `⏭️ Próxima: ${prox.nome}${prox.tom ? ` (${prox.tom})` : ""}`));
      }
      if (itens.length) corpo.append(sub("Música"), linha(...itens));
    }

    const daMusica = partesDaMusica();
    const partes = daMusica.length ? daMusica : PADRAO.slice();
    if (!partes.some(p => /^in[ií]cio$/i.test(p))) partes.unshift("Início");
    corpo.append(sub("Parte"), linha(...partes.map(p => chip(p, frasePara(p)))));
    corpo.append(sub("Outras"), linha(chip("Mais uma vez", "🔁 Mais uma vez"), chip("Encerrar", "✋ Vamos encerrar")));
  }

  function montar() {
    if (painel) return painel;
    painel = document.createElement("div");
    painel.id = "crPainel";
    painel.className = "cr-painel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", "Mensagens prontas para o chat");
    painel.innerHTML = `
      <div class="cr-topo">
        <span class="cr-titulo">Mensagens para o chat</span>
        <button type="button" class="cr-x" aria-label="Fechar">&#10005;</button>
      </div>
      <div class="cr-corpo"></div>
      <div class="cr-status" aria-live="polite"></div>`;
    painel.querySelector(".cr-x").addEventListener("click", fechar);
    document.body.appendChild(painel);
    return painel;
  }

  const aberto = () => !!painel && painel.classList.contains("on");

  function abrir() {
    montar();
    pintar(false);
    status("");
    painel.classList.add("on");
    document.getElementById("lyraMsgs")?.classList.add("on");
  }
  function fechar() {
    if (!painel) return;
    painel.classList.remove("on");
    document.getElementById("lyraMsgs")?.classList.remove("on");
  }
  const alternar = () => (aberto() ? fechar() : abrir());

  //  Toque fora ou Esc fecha.
  document.addEventListener("pointerdown", e => {
    if (!aberto()) return;
    if (painel.contains(e.target) || e.target.closest?.("#lyraMsgs")) return;
    fechar();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && aberto()) fechar(); });

  async function enviar(texto) {
    if (ocupado) return;
    ocupado = true;
    const chips = [...painel.querySelectorAll(".cr-chip")];
    chips.forEach(c => { c.disabled = true; });
    status("Enviando…");
    const r = await enviarAoChat(texto);
    if (r === "ok") status(`Enviado: ${texto}`, "ok");
    else if (r === "nome") { status("Escreva seu nome primeiro.", "erro"); pintar(true); }
    else if (r === "negado") status("O chat recusou a mensagem.", "erro");
    else status("Não foi. Confira a internet e tente de novo.", "erro");
    //  um respiro para um toque duplo não mandar duas vezes
    setTimeout(() => {
      painel.querySelectorAll(".cr-chip").forEach(c => { c.disabled = false; });
      ocupado = false;
    }, 1200);
  }

  // ── botão no leitor ──
  const ICO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z"/></svg>`;

  function botaoNoLeitor() {
    const acoes = document.querySelector("#lyraOverlay .lyra-hd-acoes");
    if (!acoes || document.getElementById("lyraMsgs")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.id = "lyraMsgs";
    b.className = "lyra-btn";
    b.title = "Mensagens prontas para o chat";
    b.setAttribute("aria-label", "Mensagens prontas para o chat");
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

  // ── manter o painel em dia ──
  const repintar = () => { if (aberto()) pintar(false); };
  if (typeof lyraAtualizarCabecalho === "function") {
    const anterior = lyraAtualizarCabecalho;
    lyraAtualizarCabecalho = function (...a) { const r = anterior.apply(this, a); botaoNoLeitor(); repintar(); return r; };
  }
  if (typeof lpMontarMapa === "function") {
    const anterior = lpMontarMapa;
    lpMontarMapa = function (...a) { const r = anterior.apply(this, a); repintar(); return r; };
  }
  if (typeof lyraFecharLeitor === "function") {
    const anterior = lyraFecharLeitor;
    lyraFecharLeitor = function (...a) { const r = anterior.apply(this, a); fechar(); return r; };
  }
  document.addEventListener("change", e => {
    if (e.target && e.target.closest && e.target.closest("#lyraOverlay")) setTimeout(repintar, 0);
  });

  const iniciar = () => botaoNoLeitor();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
