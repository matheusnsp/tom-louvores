// ============================================================
//  ARRASTAR LOUVORES (só com login)
//
//  Segure um louvor e arraste:
//    · para cima ou para baixo, para mudar a ordem
//    · para outro bloco (louvores, pós-palavra, ceia, ofertório)
//    · para outro culto (outra coluna, ou mais abaixo no celular)
//
//  Não mexe no app.js: lê a coluna (data-culto-key) e o índice do
//  louvor pelo onclick que o app.js já escreve na linha. Ao soltar,
//  altera cultos[...] e chama salvarCulto() e renderCultos().
// ============================================================
(function () {
  const SEGURAR_MS = 220;       // tempo do toque até "pegar" (dedo)
  const MOVER_PX   = 6;         // mouse: anda isso e já pega

  let seg = null;   // { timer, x0, y0, row, pointerId }
  let drag = null;  // { row, ghost, origem, dx, dy, ultimoAlvo }
  let autoScroll = 0;

  const admin = () => typeof isAdmin === "function" && isAdmin();

  // ── leitura da tela ───────────────────────────────────────
  function infoDaLinha(row) {
    const col = row.closest(".culto-col");
    const click = row.querySelector(".culto-louvor-click");
    const m = click && (click.getAttribute("onclick") || "").match(/abrirViewCulto\('([^']+)',(\d+)\)/);
    if (!col || !m) return null;
    return { chave: m[1], idx: Number(m[2]), col };
  }

  // a que bloco pertence um container de linhas
  function secaoDoContainer(c) {
    if (c.classList.contains("culto-col-bd")) return "principal";
    const sec = c.closest(".culto-secao");
    if (!sec) return "principal";
    if (sec.classList.contains("culto-secao-pos"))  return "pos";
    if (sec.classList.contains("culto-secao-ceia")) return "ceia";
    return "ofertorio";
  }

  function containers() {
    return [...document.querySelectorAll("#cultosGrid .culto-col-bd, #cultosGrid .culto-secao-bd")];
  }

  // ── início: segurar ───────────────────────────────────────
  document.addEventListener("pointerdown", e => {
    if (!admin() || drag) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (e.target.closest("button, select, input, a")) return;
    const row = e.target.closest("#cultosGrid .culto-louvor");
    if (!row || !infoDaLinha(row)) return;

    seg = { row, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId, tipo: e.pointerType };
    if (e.pointerType !== "mouse") {
      row.classList.add("seg-espera");
      seg.timer = setTimeout(() => iniciar(e.clientX, e.clientY), SEGURAR_MS);
    }
  }, { passive: true });

  function cancelarEspera() {
    if (!seg) return;
    clearTimeout(seg.timer);
    seg.row.classList.remove("seg-espera");
    seg = null;
  }

  function iniciar(x, y) {
    if (!seg) return;
    const row = seg.row;
    const info = infoDaLinha(row);
    cancelarEspera();
    if (!info) return;

    const r = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.className = "culto-louvor arr-ghost";
    ghost.style.width = r.width + "px";
    ghost.style.left = r.left + "px";
    ghost.style.top = r.top + "px";
    document.body.appendChild(ghost);

    row.classList.add("arr-vazio");
    row.style.height = r.height + "px";     // a vaga tem o tamanho do louvor
    document.body.classList.add("arrastando");
    drag = { row, ghost, origem: info, dx: x - r.left, dy: y - r.top, ultimoAlvo: null };
    if (navigator.vibrate) navigator.vibrate(12);
    mover(x, y);
  }

  // ── movimento ─────────────────────────────────────────────
  document.addEventListener("pointermove", e => {
    if (seg && !drag) {
      const longe = Math.hypot(e.clientX - seg.x0, e.clientY - seg.y0) > MOVER_PX;
      if (seg.tipo === "mouse" && longe) iniciar(e.clientX, e.clientY);
      else if (seg.tipo !== "mouse" && longe) cancelarEspera();   // era rolagem
      return;
    }
    if (!drag) return;
    e.preventDefault();
    mover(e.clientX, e.clientY);
  }, { passive: false });

  // o dedo arrastando não pode rolar a página por conta própria
  document.addEventListener("touchmove", e => { if (drag) e.preventDefault(); }, { passive: false });

  function mover(x, y) {
    const { ghost, row } = drag;
    ghost.style.left = (x - drag.dx) + "px";
    ghost.style.top  = (y - drag.dy) + "px";

    // rola sozinho perto das bordas da tela
    const h = window.innerHeight;
    autoScroll = y < 90 ? -(90 - y) / 6 : y > h - 90 ? (y - (h - 90)) / 6 : 0;

    // onde o dedo está: um container de linhas, ou uma linha dele
    ghost.style.pointerEvents = "none";
    const sob = document.elementFromPoint(x, y);
    let alvo = sob && sob.closest("#cultosGrid .culto-col-bd, #cultosGrid .culto-secao-bd");
    if (!alvo && sob) {
      // sobre o rótulo ou o botão "+ Adicionar" de um bloco: vale o bloco
      const sec = sob.closest(".culto-secao");
      if (sec) alvo = sec.querySelector(".culto-secao-bd");
      else {
        const col = sob.closest(".culto-col");
        if (col && !sob.closest(".culto-col-hd, .culto-escala, .culto-col-meta")) alvo = col.querySelector(".culto-col-bd");
      }
    }
    containers().forEach(c => c.classList.toggle("arr-alvo", c === alvo));
    if (!alvo) return;

    // posição dentro do alvo: antes da primeira linha cujo meio está abaixo do dedo
    const linhas = [...alvo.querySelectorAll(":scope > .culto-louvor")].filter(l => l !== row);
    let antesDe = null;
    for (const l of linhas) {
      const r = l.getBoundingClientRect();
      if (y < r.top + r.height / 2) { antesDe = l; break; }
    }
    const vazio = alvo.querySelector(":scope > .culto-empty");
    if (vazio) vazio.style.display = "none";
    if (antesDe) { if (row.nextSibling !== antesDe || row.parentNode !== alvo) alvo.insertBefore(row, antesDe); }
    else if (row.parentNode !== alvo || row !== alvo.lastElementChild) alvo.appendChild(row);
  }

  (function tick() {
    if (drag && autoScroll) window.scrollBy(0, autoScroll);
    requestAnimationFrame(tick);
  })();

  // ── soltar ────────────────────────────────────────────────
  document.addEventListener("pointerup", soltar);
  document.addEventListener("pointercancel", soltar);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && drag) desfazer(); });

  async function soltar() {
    if (seg && !drag) { cancelarEspera(); return; }
    if (!drag) return;

    const { row, ghost, origem } = drag;
    const alvo = row.parentNode;
    const destino = {
      chave: row.closest(".culto-col").dataset.cultoKey,
      secao: secaoDoContainer(alvo),
    };
    // em que posição: antes de qual louvor real do bloco de destino
    const proximo = row.nextElementSibling && row.nextElementSibling.classList.contains("culto-louvor")
      ? infoDaLinha(row.nextElementSibling) : null;

    limpar();
    await aplicar(origem, destino, proximo ? proximo.idx : null);
  }

  function desfazer() { limpar(); if (typeof renderCultos === "function") renderCultos(); }

  function limpar() {
    if (!drag) return;
    drag.ghost.remove();
    drag.row.classList.remove("arr-vazio");
    drag.row.style.height = "";
    containers().forEach(c => c.classList.remove("arr-alvo"));
    document.body.classList.remove("arrastando");
    autoScroll = 0;
    drag = null;
  }

  // ── gravar ────────────────────────────────────────────────
  //  Tira o louvor do culto de origem, ajusta o bloco e põe no
  //  destino antes do louvor "proximoIdx" (ou no fim do bloco).
  async function aplicar(origem, destino, proximoIdx) {
    const de = cultos[origem.chave];
    if (!de || !de.louvores[origem.idx]) { renderCultos(); return; }
    const mesmoCulto = origem.chave === destino.chave;
    const para = mesmoCulto ? de : cultoGarantir(destino.chave);

    // cópia para voltar atrás se o banco recusar
    const copiaDe = JSON.stringify(de.louvores);
    const copiaPara = JSON.stringify(para.louvores);

    const [louvor] = de.louvores.splice(origem.idx, 1);
    delete louvor.ofertorio; delete louvor.pos; delete louvor.ceia;
    if (destino.secao !== "principal") louvor[destino.secao] = true;

    // o índice do "próximo" pode ter andado depois do splice
    let pos = para.louvores.length;
    if (proximoIdx != null) {
      const ajustado = mesmoCulto && proximoIdx > origem.idx ? proximoIdx - 1 : proximoIdx;
      if (ajustado >= 0 && ajustado <= para.louvores.length) pos = ajustado;
    }
    para.louvores.splice(pos, 0, louvor);
    renderCultos();

    const ok1 = await salvarCulto(origem.chave);
    const ok2 = mesmoCulto ? true : await salvarCulto(destino.chave);
    if (ok1 && ok2) {
      if (!mesmoCulto) toast(`"${louvor.nome}" movido de culto ✓`);
      return;
    }
    de.louvores = JSON.parse(copiaDe);
    if (!mesmoCulto) para.louvores = JSON.parse(copiaPara);
    renderCultos();
    toast("Não deu para mover. Tente de novo.", true);
  }
})();
