// ============================================================
//  TOM LOUVORES — editor: "Buscar no Lyra" e link para ouvir
//  Carregue DEPOIS do lyra-api.js e do cifras-publicar.js.
//
//  · Buscar no Lyra: digitando o nome aparecem as músicas do Lyra;
//    escolher uma preenche nome, cantor e link do YouTube. A cifra
//    não vem: ela é feita no editor e salva no banco do site.
//  · Link para ouvir (opcional): fica nas observações da música no
//    repertório, que é de onde saem os botões YouTube/Spotify do
//    modal. Ao editar, o link atual já aparece no campo.
// ============================================================
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const RE_LINK_OUVIR = /https?:\/\/[^\s]*(youtube\.com|youtu\.be|spotify\.com|deezer\.com|music\.apple\.com|soundcloud\.com)[^\s]*/i;

  // ── estilo ──
  const st = document.createElement("style");
  st.textContent = `
  .ce-page .ce-opc{margin-left:6px;font-size:10.5px;letter-spacing:.08em;color:var(--gray2);text-transform:none;font-weight:500}
  .ce-page .ce-field-largo{grid-column:1 / -1}
  .ce-page .ce-lyra{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--fio)}
  .ce-page .ce-lyra-campo{position:relative}
  .ce-page .ce-lyra-campo input{padding-left:42px;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A8A90' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:16px center}
  .ce-page .ce-lyra-lista{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:30;max-height:320px;overflow:auto;
    background:#141416;border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6);padding:6px}
  .ce-page .ce-lyra-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;
    padding:10px 12px;border-radius:10px;border:0;background:none;color:var(--paper);cursor:pointer;font:600 14.5px var(--font-ui)}
  .ce-page .ce-lyra-item small{font-size:12.5px;font-weight:500;color:var(--gray2)}
  .ce-page .ce-lyra-item:hover,.ce-page .ce-lyra-item.on{background:rgba(var(--gold-rgb),.1);color:var(--gold-hi)}
  .ce-page .ce-lyra-vazio{padding:12px;color:var(--gray2);font-size:13.5px}
  .ce-page .ce-lyra-msg{margin:8px 0 0;min-height:0;font-size:12.5px;color:var(--gold-hi)}
  .ce-page .ce-lyra-msg:empty{display:none}`;
  document.head.appendChild(st);

  // ── link: lê das observações ao editar ──
  window.tlLinkOriginal = "";

  async function carregarLinkDaMusica() {
    const ed = window.tlEditorEdicao;
    if (!ed || !ed.id || !$("ceLink")) return;
    try {
      const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/musicas?select=observacoes&id=eq.${encodeURIComponent(ed.id)}`, {
        headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` },
      });
      if (!r.ok) return;
      const obs = ((await r.json())[0] || {}).observacoes || "";
      const achado = (obs.match(RE_LINK_OUVIR) || [""])[0];
      window.tlLinkOriginal = achado;
      //  Rascunho com outro link (mais novo) vence: só preenche se vazio.
      if (achado && !$("ceLink").value) $("ceLink").value = achado;
    } catch { /* sem rede: campo fica vazio, nada é apagado */ }
  }

  // ── Buscar no Lyra ──
  const busca = $("ceLyraBusca"), lista = $("ceLyraLista"), msg = $("ceLyraMsg");
  let pedido = 0, itens = [], marcado = -1, espera = null;

  function fecharLista() { lista.hidden = true; lista.innerHTML = ""; itens = []; marcado = -1; }

  function desenhar(resultados, termo) {
    itens = resultados;
    marcado = -1;
    lista.innerHTML = "";
    if (!resultados.length) {
      const v = document.createElement("div");
      v.className = "ce-lyra-vazio";
      v.textContent = window.tlLyra && !tlLyra.disponivel
        ? "A busca no Lyra ainda não está ligada (função do Supabase não publicada)."
        : `Nada no Lyra com "${termo}". Pode cadastrar à mão.`;
      lista.appendChild(v);
    }
    resultados.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ce-lyra-item";
      b.setAttribute("role", "option");
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = s.title || s.slug;
      b.lastChild.textContent = s.artist || "";
      b.addEventListener("mousedown", e => e.preventDefault());   // não tira o foco antes do clique
      b.addEventListener("click", () => escolher(i));
      lista.appendChild(b);
    });
    lista.hidden = false;
  }

  async function procurar() {
    const termo = busca.value.trim();
    if (termo.length < 2) { fecharLista(); return; }
    const meu = ++pedido;
    const res = window.tlLyra ? await tlLyra.buscar(termo) : [];
    if (meu !== pedido) return;          // chegou depois de outra busca
    desenhar(res, termo);
  }

  async function escolher(i) {
    const s = itens[i];
    if (!s) return;
    fecharLista();
    busca.value = "";
    msg.textContent = "Trazendo do Lyra…";
    const m = await tlLyra.musica(s.slug);
    const titulo = (m && m.title) || s.title || "";
    const cantor = (m && m.artist) || s.artist || "";
    const link = (m && m.youtube_url) || "";

    if (titulo) $("titulo").value = titulo;
    if (cantor) $("artista").value = cantor;
    if (link && $("ceLink") && !$("ceLink").value) $("ceLink").value = link;
    ["titulo", "artista", "ceLink"].forEach(id => $(id)?.dispatchEvent(new Event("input", { bubbles: true })));

    const veio = [titulo && "nome", cantor && "cantor", link && "link"].filter(Boolean);
    msg.textContent = veio.length
      ? `Do Lyra: ${veio.join(", ")}. Agora é só colocar os tons e a cifra.`
      : "Não deu para trazer os dados do Lyra agora. Pode preencher à mão.";
    setTimeout(() => { if (msg.textContent.startsWith("Do Lyra")) msg.textContent = ""; }, 8000);
  }

  if (busca) {
    busca.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(procurar, 280); });
    busca.addEventListener("keydown", e => {
      const botoes = [...lista.querySelectorAll(".ce-lyra-item")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!botoes.length) return;
        e.preventDefault();
        marcado = (marcado + (e.key === "ArrowDown" ? 1 : -1) + botoes.length) % botoes.length;
        botoes.forEach((b, j) => b.classList.toggle("on", j === marcado));
        botoes[marcado].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (marcado >= 0) { e.preventDefault(); escolher(marcado); }
      } else if (e.key === "Escape") {
        fecharLista();
      }
    });
    busca.addEventListener("blur", () => setTimeout(fecharLista, 150));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", carregarLinkDaMusica);
  else carregarLinkDaMusica();
})();
