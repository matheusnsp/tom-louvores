// ============================================================
//  TOM LOUVORES — montar medley no editor de cifras
//  Só na cifras-editor.html. Carregue DEPOIS do config.js e do
//  bloco "Buscar no Lyra" (editor-lyra.js).
//
//  Um medley é uma cifra só, feita de duas ou mais músicas que já
//  estão no site. Aqui a equipe escolhe as músicas, o tom único, e
//  o site:
//    1. busca a cifra de cada uma no banco (tabela cifras);
//    2. transpõe todas para o tom escolhido (a mesma transposição
//       do leitor, copiada aqui porque o lyra.js não carrega no
//       editor);
//    3. junta tudo no campo da cifra, cada música sob o seu
//       [Nome da Música] — é esse rótulo que vira botão no mapa
//       do leitor — e com um "Tom:" só, no topo;
//    4. preenche o nome ("A / B"), o cantor ("Medley") e o tom.
//  Daí em diante é uma cifra como outra qualquer: a pessoa ajeita
//  à mão (tira versos, repete refrão, muda a ordem) e publica.
// ============================================================
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const ancora = $("ceLyra");
  if (!ancora || typeof CONFIG === "undefined") return;

  // ── transposição (a mesma do leitor, lyra.js) ───────────────
  const SUST = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const BEM  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const ALT  = { "Cb":11, "Fb":4, "E#":5, "B#":0 };
  const RE_ACORDE = /^[A-G](#|b)?((m|maj|min|sus|dim|aug|add|M|°|º|ø|Δ|\+|-|#|b)|\d+|\(.*?\)|\/\d+)*(\/[A-G](#|b)?)?$/;
  const ANOTACAO = /^\(?(riff|bis|\d+x|x\d+|\d+)\)?:?$/i;

  const partesTom = (tom = "") => { const t = String(tom).trim(); const menor = /m$/.test(t) && !/^[A-G][#b]?$/.test(t); return { raiz: menor ? t.slice(0, -1) : t, menor }; };
  const pc = n => { if (n in ALT) return ALT[n]; let i = SUST.indexOf(n); if (i < 0) i = BEM.indexOf(n); return i < 0 ? null : i; };
  const usaBemol = tom => { const { raiz, menor } = partesTom(tom); if (raiz.includes("b")) return true; if (raiz.includes("#")) return false; return menor ? ["D","G","C","F"].includes(raiz) : raiz === "F"; };
  const mover = (nota, semis, bemol) => { const p = pc(nota); return p === null ? nota : (bemol ? BEM : SUST)[(p + semis + 120) % 12]; };

  function transporAcorde(ac, semis, bemol) {
    if (!RE_ACORDE.test(ac)) return null;
    const raiz = ac.match(/^[A-G][#b]?/)[0];
    const baixo = ac.match(/\/([A-G][#b]?)$/);
    const meio = ac.slice(raiz.length, baixo ? baixo.index : ac.length);
    return mover(raiz, semis, bemol) + meio + (baixo ? "/" + mover(baixo[1], semis, bemol) : "");
  }
  function transporPedaco(tk, semis, bemol) {
    const [, nucleo, pont] = tk.match(/^(.*?)([.,;:]*)$/);
    const tentar = (miolo, a, d) => { const r = transporAcorde(miolo, semis, bemol); return r === null ? null : a + r + d + pont; };
    let m;
    return tentar(nucleo, "", "")
      ?? ((m = nucleo.match(/^\((.*)\)$/)) && tentar(m[1], "(", ")"))
      ?? ((m = nucleo.match(/^\((.*)$/)) && tentar(m[1], "(", ""))
      ?? ((m = nucleo.match(/^(.*)\)$/)) && tentar(m[1], "", ")"))
      ?? tk;
  }
  function transporLinha(linha, semis, bemol) {
    let saida = ""; const re = /\S+/g; let m;
    while ((m = re.exec(linha))) {
      const novo = transporPedaco(m[0], semis, bemol);
      const col = saida.length && m.index <= saida.length ? saida.length + 1 : m.index;
      saida = saida.padEnd(col, " ") + novo;
    }
    return saida;
  }
  function ehLinhaDeAcorde(linha) {
    const t = linha.trim();
    if (!t || /^\s*\/\//.test(t)) return false;
    if (t.startsWith("[")) return true;
    const tokens = t.split(/\s+/).filter(Boolean).filter(tk => !/^[()\[\]|/\-–—.,:;]+$/.test(tk)).filter(tk => !ANOTACAO.test(tk));
    if (!tokens.length) return false;
    const eh = tk => { const l = tk.replace(/[.,;:]+$/, ""); if (RE_ACORDE.test(l)) return true; const s = l.replace(/^\[|\]$/g, ""); if (RE_ACORDE.test(s)) return true; const m = s.match(/^\((.*)\)$/); return !!m && RE_ACORDE.test(m[1]); };
    return tokens.filter(eh).length / tokens.length >= 0.6;
  }
  function transporTexto(texto, tomDe, tomPara) {
    texto = String(texto || "").replace(/[​-‍⁠﻿]/g, "");
    const de = pc(partesTom(tomDe).raiz), para = pc(partesTom(tomPara).raiz);
    if (de === null || para === null) return texto;
    const semis = (para - de + 12) % 12;
    const bemol = usaBemol(tomPara);
    if (!semis && bemol === usaBemol(tomDe)) return texto;
    return texto.split("\n").map(linha => {
      const et = linha.match(/^(\s*\[[^\]]*\]\s*)(.*)$/);
      if (et) {
        if (!et[2].trim() || !ehLinhaDeAcorde(et[2])) return linha;
        const resto = transporLinha(" ".repeat(et[1].length) + et[2], semis, bemol);
        return et[1] + resto.slice(et[1].length);
      }
      return ehLinhaDeAcorde(linha) ? transporLinha(linha, semis, bemol) : linha;
    }).join("\n");
  }

  // ── estilo ──────────────────────────────────────────────────
  const st = document.createElement("style");
  st.textContent = `
  .ce-page .ce-medley{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--fio)}
  .ce-page .ce-medley-topo{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .ce-page .ce-medley-topo label{margin:0}
  .ce-page .ce-medley-abrir{
    background:none;border:1px solid var(--fio);border-radius:999px;color:var(--paper);cursor:pointer;
    font-family:var(--font-ui);font-size:12px;font-weight:700;letter-spacing:.04em;padding:7px 14px;
  }
  .ce-page .ce-medley-abrir[aria-expanded="true"]{background:var(--gold);border-color:var(--gold);color:var(--on-gold)}
  .ce-page .ce-medley-corpo{margin-top:14px;display:flex;flex-direction:column;gap:12px}
  .ce-page .ce-medley-corpo[hidden]{display:none}
  .ce-page .ce-medley-ajuda{margin:0;font-size:12.5px;color:var(--gray2);line-height:1.5}
  .ce-page .ce-medley-lista{display:flex;flex-direction:column;gap:6px}
  .ce-page .ce-medley-item{
    display:flex;align-items:center;gap:10px;padding:9px 10px 9px 14px;
    background:rgba(255,255,255,.03);border:1px solid var(--fio);border-radius:14px;
  }
  .ce-page .ce-medley-ordem{
    flex:0 0 22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:var(--gold);color:var(--on-gold);font-size:11px;font-weight:800;
  }
  .ce-page .ce-medley-nome{flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--paper);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ce-page .ce-medley-nome small{display:block;font-size:12px;font-weight:500;color:var(--gray2)}
  .ce-page .ce-medley-tom{
    flex:0 0 auto;font-family:var(--font-tom);font-weight:700;font-size:13px;color:var(--gold-hi);
    background:rgba(var(--gold-rgb),.10);border:1px solid var(--line);border-radius:8px;padding:4px 8px;
  }
  .ce-page .ce-medley-item button{
    flex:0 0 32px;height:32px;background:none;border:1px solid var(--fio);border-radius:50%;
    color:var(--gray);cursor:pointer;font-size:13px;
  }
  .ce-page .ce-medley-item button:hover{color:var(--paper);border-color:var(--gray3)}
  .ce-page .ce-medley-pe{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ce-page .ce-medley-pe .ce-field{flex:1 1 180px;margin:0}
  .ce-page .ce-medley-montar{
    flex:0 0 auto;background:var(--gold);border:none;border-radius:999px;color:var(--on-gold);cursor:pointer;
    font-family:var(--font-ui);font-size:14px;font-weight:700;padding:13px 20px;
  }
  .ce-page .ce-medley-montar:disabled{opacity:.45;cursor:default}`;
  document.head.appendChild(st);

  // ── o bloco ─────────────────────────────────────────────────
  const bloco = document.createElement("div");
  bloco.className = "ce-medley";
  bloco.innerHTML = `
    <div class="ce-medley-topo">
      <label>Montar medley <span class="ce-opc">junta cifras do site num tom só</span></label>
      <button type="button" class="ce-medley-abrir" id="mdAbrir" aria-expanded="false" aria-controls="mdCorpo">Montar</button>
    </div>
    <div class="ce-medley-corpo" id="mdCorpo" hidden>
      <p class="ce-medley-ajuda">Escolha as músicas na ordem em que serão cantadas. O site junta as cifras, todas no mesmo tom, e você ajeita o resto à mão.</p>
      <div class="ce-lyra-campo">
        <input id="mdBusca" type="search" placeholder="Buscar música do site…" autocomplete="off" spellcheck="false">
        <div class="ce-lyra-lista" id="mdLista" role="listbox" hidden></div>
      </div>
      <div class="ce-medley-lista" id="mdEscolhidas"></div>
      <div class="ce-medley-pe">
        <div class="ce-field">
          <label for="mdTom">Tom único</label>
          <select id="mdTom"></select>
        </div>
        <button type="button" class="ce-medley-montar" id="mdMontar" disabled>Montar medley</button>
      </div>
      <p class="ce-lyra-msg" id="mdMsg" aria-live="polite"></p>
    </div>`;
  ancora.after(bloco);

  //  os mesmos tons do campo "Tom original"
  const TONS = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B",
                "Cm","C#m","Dbm","Dm","D#m","Ebm","Em","Fm","F#m","Gbm","Gm","G#m","Abm","Am","A#m","Bbm","Bm"];
  const selTom = $("mdTom");
  selTom.innerHTML = `<option value="">Tom</option>` + TONS.map(t => `<option value="${t}">${t.replace("b", "♭")}</option>`).join("");

  $("mdAbrir").addEventListener("click", () => {
    const aberto = $("mdCorpo").hidden;
    $("mdCorpo").hidden = !aberto;
    $("mdAbrir").setAttribute("aria-expanded", String(aberto));
    if (aberto) { carregarIndice(); setTimeout(() => $("mdBusca").focus(), 50); }
  });

  // ── as cifras do site ───────────────────────────────────────
  const cab = { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` };
  let indice = null, carregando = null;
  function carregarIndice() {
    if (indice || carregando) return carregando;
    carregando = fetch(`${CONFIG.SUPABASE_URL}/rest/v1/cifras?select=slug,title,artist,base_key&order=title`, { headers: cab })
      .then(r => r.ok ? r.json() : [])
      .then(d => { indice = d || []; return indice; })
      .catch(() => { indice = []; return indice; })
      .finally(() => { carregando = null; });
    return carregando;
  }
  async function cifraDe(slug) {
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/cifras?select=slug,title,base_key,chords&slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: cab });
    if (!r.ok) throw new Error("cifra " + r.status);
    return (await r.json())[0] || null;
  }
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  // ── busca e escolha ─────────────────────────────────────────
  const busca = $("mdBusca"), lista = $("mdLista"), msg = $("mdMsg");
  let escolhidas = [];   // { slug, title, artist, base_key }
  let espera = null;

  function fecharLista() { lista.hidden = true; lista.innerHTML = ""; }

  async function procurar() {
    const termo = norm(busca.value);
    if (termo.length < 2) { fecharLista(); return; }
    await carregarIndice();
    const achadas = indice
      .filter(s => !escolhidas.some(e => e.slug === s.slug))
      .filter(s => norm(s.title).includes(termo) || norm(s.artist).includes(termo))
      .slice(0, 12);
    lista.innerHTML = "";
    if (!achadas.length) {
      const v = document.createElement("div");
      v.className = "ce-lyra-vazio";
      v.textContent = `Nenhuma cifra do site com "${busca.value.trim()}".`;
      lista.appendChild(v);
    }
    achadas.forEach(s => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ce-lyra-item";
      b.setAttribute("role", "option");
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = s.title || s.slug;
      b.lastChild.textContent = [s.artist, s.base_key && `tom ${s.base_key}`].filter(Boolean).join(" · ");
      b.addEventListener("mousedown", e => e.preventDefault());
      b.addEventListener("click", () => { escolher(s); });
      lista.appendChild(b);
    });
    lista.hidden = false;
  }

  function escolher(s) {
    escolhidas.push(s);
    busca.value = "";
    fecharLista();
    //  o tom único começa no tom da primeira música
    if (escolhidas.length === 1 && s.base_key && TONS.includes(s.base_key)) selTom.value = s.base_key;
    desenharEscolhidas();
    busca.focus();
  }

  function desenharEscolhidas() {
    const box = $("mdEscolhidas");
    box.innerHTML = "";
    escolhidas.forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "ce-medley-item";
      d.innerHTML = `
        <span class="ce-medley-ordem">${i + 1}</span>
        <span class="ce-medley-nome"></span>
        <span class="ce-medley-tom"></span>
        <button type="button" data-acao="subir" aria-label="Subir" title="Subir">↑</button>
        <button type="button" data-acao="descer" aria-label="Descer" title="Descer">↓</button>
        <button type="button" data-acao="tirar" aria-label="Tirar" title="Tirar">✕</button>`;
      d.querySelector(".ce-medley-nome").innerHTML = `${escapar(s.title || s.slug)}<small>${escapar(s.artist || "")}</small>`;
      d.querySelector(".ce-medley-tom").textContent = s.base_key || "?";
      d.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const a = b.dataset.acao;
        if (a === "tirar") escolhidas.splice(i, 1);
        if (a === "subir" && i > 0) [escolhidas[i - 1], escolhidas[i]] = [escolhidas[i], escolhidas[i - 1]];
        if (a === "descer" && i < escolhidas.length - 1) [escolhidas[i + 1], escolhidas[i]] = [escolhidas[i], escolhidas[i + 1]];
        desenharEscolhidas();
      }));
      box.appendChild(d);
    });
    $("mdMontar").disabled = escolhidas.length < 2;
    msg.textContent = escolhidas.length === 1 ? "Escolha pelo menos mais uma música." : "";
  }
  const escapar = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  busca.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(procurar, 200); });
  busca.addEventListener("focus", () => { if (busca.value.trim().length >= 2) procurar(); });
  busca.addEventListener("keydown", e => {
    if (e.key === "Escape") fecharLista();
    if (e.key === "Enter") { e.preventDefault(); lista.querySelector(".ce-lyra-item")?.click(); }
  });
  document.addEventListener("click", e => { if (!bloco.contains(e.target)) fecharLista(); });

  // ── montar ──────────────────────────────────────────────────
  //  Tira o "Tom:" de cada música (fica um só, no topo) e o lixo
  //  das pontas. O resto da cifra vai como está: é a pessoa quem
  //  decide o que cortar, no campo, depois.
  function limpar(texto) {
    return String(texto || "")
      .split("\n")
      .filter(l => !/^\s*Tom:\s*\S/i.test(l))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function montar() {
    const alvo = selTom.value;
    if (!alvo) { msg.textContent = "Escolha o tom único."; selTom.focus(); return; }
    const botao = $("mdMontar");
    botao.disabled = true;
    msg.textContent = "Buscando as cifras…";

    const partes = [];
    const avisos = [];
    for (const s of escolhidas) {
      let c = null;
      try { c = await cifraDe(s.slug); } catch { /* avisa abaixo */ }
      if (!c || !c.chords) { avisos.push(`${s.title}: sem cifra no banco`); continue; }
      const de = c.base_key || s.base_key;
      const texto = de ? transporTexto(c.chords, de, alvo) : c.chords;
      if (!de) avisos.push(`${s.title}: sem tom cadastrado, ficou como estava`);
      partes.push(`[${(c.title || s.title).trim()}]\n${limpar(texto)}`);
    }

    if (partes.length < 2) {
      msg.textContent = "Não deu para montar: " + (avisos.join("; ") || "faltou cifra.");
      botao.disabled = false;
      return;
    }

    const cifra = $("cifra");
    cifra.value = `Tom: ${alvo}\n\n${partes.join("\n\n\n")}\n`;
    cifra.dispatchEvent(new Event("input", { bubbles: true }));

    const titulo = $("titulo");
    if (titulo && !titulo.value.trim()) titulo.value = escolhidas.map(s => (s.title || s.slug).trim()).join(" / ");
    const artista = $("artista");
    if (artista && !artista.value.trim()) artista.value = "Medley";
    ["titulo", "artista"].forEach(id => $(id)?.dispatchEvent(new Event("input", { bubbles: true })));

    const tom = $("tom");
    if (tom) { tom.value = alvo; tom.dispatchEvent(new Event("change", { bubbles: true })); }

    msg.textContent = `Medley montado em ${alvo} com ${partes.length} músicas. Ajeite a cifra abaixo e publique.`
      + (avisos.length ? ` Atenção: ${avisos.join("; ")}.` : "");
    botao.disabled = false;
    cifra.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("mdMontar").addEventListener("click", montar);
})();
