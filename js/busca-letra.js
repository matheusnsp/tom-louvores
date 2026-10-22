// ============================================================
//  TOM LOUVORES — buscar pela letra
//  Carregue DEPOIS do app.js, do lyra.js e do vista-lista.js.
//
//  A busca do repertório olhava só o nome. Agora, a partir de 3
//  letras digitadas, também procura dentro das letras das músicas
//  que têm cifra no banco (tabela musicas_lyra). Quem aparece só
//  por causa da letra ganha, na lista, o verso que bateu.
//
//  As letras (~90 KB) só são baixadas quando alguém digita na
//  busca pela primeira vez, e ficam guardadas no aparelho.
//  Acento, maiúscula, pontuação e quebra de linha não atrapalham:
//  "tu es santo" acha "Tu és Santo," mesmo com o verso partido.
// ============================================================

const BL_MIN = 3;

let blLetras = null;     // Map: id da música → { linhas, normLinhas, junto, inicios }
let blRows = null;       // as letras como vieram do banco
let blBase = null;       // o array "musicas" usado no último índice
let blBuscando = null;
const blTrechos = new Map();   // id → verso que bateu (da última busca)

//  Procurar também na letra? A pessoa escolhe no botão "Letra" ao
//  lado da busca, e a escolha fica guardada no aparelho. Começa
//  ligado, como sempre foi.
const BL_CHAVE = "tl_busca_letra";
let blIncluir = true;
try { blIncluir = localStorage.getItem(BL_CHAVE) !== "0"; } catch (e) {}

(function blEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  .lst-trecho{
    display:block;margin-top:3px;
    font-size:12px;font-weight:500;font-style:italic;color:var(--gray);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .bl-letra{
    flex-shrink:0;margin-left:8px;align-self:stretch;
    display:inline-flex;align-items:center;gap:7px;
    background:transparent;border:1px solid var(--black5);border-radius:999px;
    color:var(--gray);font-family:var(--font-ui);
    font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    padding:0 14px;cursor:pointer;transition:all .15s;
  }
  .bl-letra:hover{border-color:var(--gray3);color:var(--white)}
  .bl-letra .bl-caixa{
    width:15px;height:15px;border-radius:4px;flex-shrink:0;
    border:1.5px solid var(--gray2);display:grid;place-items:center;
  }
  .bl-letra.on{border-color:rgba(var(--gold-rgb),.5);color:var(--white)}
  .bl-letra.on .bl-caixa{background:var(--gold);border-color:var(--gold)}
  .bl-letra .bl-caixa svg{opacity:0}
  .bl-letra.on .bl-caixa svg{opacity:1}
  @media(max-width:600px){ .bl-letra{padding:0 12px} }
  .lst-trecho mark{background:rgba(var(--gold-rgb),.18);color:var(--white);font-style:normal;border-radius:2px;padding:0 1px}`;
  document.head.appendChild(st);
})();

//  Sem acento, minúscula, só letras e números separados por um espaço.
function blNorm(s = "") {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function blIndexar(rows) {
  blRows = rows;
  blBase = musicas;
  //  Casa o título da cifra com o nome no repertório do mesmo jeito
  //  que o leitor de cifras faz (lyraNorm / lyraChaveCurta).
  const porTitulo = new Map();
  (rows || []).forEach(r => {
    if (!r.lyrics || !r.title) return;
    const chaves = typeof lyraNorm === "function"
      ? [lyraNorm(r.title), lyraChaveCurta(r.title)] : [blNorm(r.title)];
    chaves.forEach(k => { if (k && !porTitulo.has(k)) porTitulo.set(k, r.lyrics); });
  });

  const mapa = new Map();
  musicas.concat(typeof musicasLixeira !== "undefined" ? musicasLixeira : []).forEach(m => {
    const k1 = typeof lyraNorm === "function" ? lyraNorm(m.nome) : blNorm(m.nome);
    const k2 = typeof lyraChaveCurta === "function" ? lyraChaveCurta(m.nome) : k1;
    const letra = porTitulo.get(k1) || porTitulo.get(k2);
    if (!letra) return;

    //  linhas de verdade (sem as marcas "//(2X)" e linhas vazias)
    const linhas = letra.split("\n").map(l => l.trim())
      .filter(l => l && !/^\/\/\s*\(?\d+x\)?$/i.test(l));
    const normLinhas = linhas.map(blNorm);
    //  o texto inteiro numa linha só, e onde começa cada verso nele
    const inicios = [];
    let pos = 0;
    normLinhas.forEach(l => { inicios.push(pos); pos += l.length + 1; });
    mapa.set(String(m.id), { linhas, normLinhas, junto: normLinhas.join(" "), inicios });
  });
  blLetras = mapa;
}

function blCarregar() {
  if (blLetras) return Promise.resolve();
  if (blBuscando) return blBuscando;
  const caminho = "musicas_lyra?select=title,lyrics";

  const copia = typeof copiaLer === "function" ? copiaLer(caminho) : null;
  if (Array.isArray(copia)) { blIndexar(copia); return Promise.resolve(); }

  blBuscando = (async () => {
    try {
      const rows = await req(caminho) || [];
      if (typeof copiaGuardar === "function") copiaGuardar(caminho, rows);
      blIndexar(rows);
    } catch (e) {
      console.warn("Busca na letra:", e);
    } finally {
      blBuscando = null;
    }
  })();
  return blBuscando;
}

//  Atualiza a cópia das letras por trás, uma vez por abertura.
let blAtualizada = false;
function blAtualizarPorTras() {
  if (blAtualizada) return;
  blAtualizada = true;
  req("musicas_lyra?select=title,lyrics").then(rows => {
    if (!rows) return;
    if (typeof copiaGuardar === "function") copiaGuardar("musicas_lyra?select=title,lyrics", rows);
    blIndexar(rows);
  }).catch(() => {});
}

//  Onde o termo aparece na letra: o verso (e o seguinte, se o
//  termo atravessa a quebra de linha), com o pedaço marcado.
function blAchar(id, termo) {
  const L = blLetras && blLetras.get(String(id));
  if (!L) return null;
  const p = L.junto.indexOf(termo);
  if (p < 0) return null;
  let i = 0;
  while (i + 1 < L.inicios.length && L.inicios[i + 1] <= p) i++;
  const fim = p + termo.length;
  let j = i;
  while (j + 1 < L.inicios.length && L.inicios[j + 1] < fim) j++;
  const verso = L.linhas.slice(i, j + 1).join(" / ");

  //  Marca o termo no verso original quando ele está inteiro numa
  //  linha; atravessando linhas, mostra os versos sem marca.
  if (i === j) {
    const orig = L.linhas[i];
    const palavras = termo.split(" ");
    const re = new RegExp(palavras.map(w =>
      w.split("").map(c => `${c}[\\u0300-\\u036f]*`).join("")).join("[^a-z0-9]+"), "i");
    const nfd = orig.normalize("NFD");
    const mm = nfd.match(re);
    if (mm) {
      const a = nfd.slice(0, mm.index), b = mm[0], c = nfd.slice(mm.index + b.length);
      return `${esc(a.normalize("NFC"))}<mark>${esc(b.normalize("NFC"))}</mark>${esc(c.normalize("NFC"))}`;
    }
  }
  return esc(verso);
}

// ── a busca ─────────────────────────────────────────────────
//  Mesmos filtros do app.js (nome, ministrante, tom), com a letra
//  como mais um jeito de bater no texto da busca.

filtrar = function () {
  const b  = normTexto(document.getElementById("busca").value);
  const mF = document.getElementById("filtroMin").value;
  const tF = document.getElementById("filtroTom").value;
  const termo = blNorm(b);

  blTrechos.clear();
  const usarLetra = blIncluir && termo.length >= BL_MIN;
  //  o repertório mudou (música nova, editada): refaz o casamento
  if (blRows && blBase !== musicas) blIndexar(blRows);
  if (usarLetra && !blLetras) {
    //  primeira busca: procura pelo nome já e refaz quando as letras chegarem
    blCarregar().then(() => { if (blLetras) filtrar(); });
  } else if (usarLetra) {
    blAtualizarPorTras();
  }

  render(musicas.filter(x => {
    const pares = paresEfetivos(x);
    const tons  = pares.map(p => p.tom);
    const mins  = pares.map(p => p.min);
    if (mF && !(mins.includes(mF) || x.ministrante === mF)) return false;
    if (tF && !tons.includes(tF)) return false;
    if (!b || normTexto(x.nome).includes(b)) return true;
    //  o nome do cantor também acha a música (artista.js)
    if (typeof tlArtistaDe === "function" && normTexto(tlArtistaDe(x.nome)).includes(b)) return true;
    if (!usarLetra || !blLetras) return false;
    const trecho = blAchar(x.id, termo);
    if (trecho) blTrechos.set(String(x.id), trecho);
    return !!trecho;
  }));
};

//  O verso que bateu, embaixo do nome, na lista.
const blLinhaOriginal = vistaLinhaHTML;
vistaLinhaHTML = function (m) {
  const html = blLinhaOriginal(m);
  const t = blTrechos.get(String(m.id));
  if (!t) return html;
  return html.replace(/(<div class="lst-nome">)([\s\S]*?)(<\/div>)/,
    `$1$2<span class="lst-trecho">“${t}”</span>$3`);
};

//  O texto da busca diz o que está valendo.
function blPlaceholder() {
  const inp = document.getElementById("busca");
  if (inp && typeof PAGINA !== "undefined" && PAGINA === "repertorio")
    inp.placeholder = blIncluir ? "Nome, cantor ou trecho da letra..." : "Nome ou cantor...";
}

//  Botão "Letra" ao lado da busca: liga e desliga a busca na letra.
(function blMontarBotao() {
  const inp = document.getElementById("busca");
  if (!inp || document.getElementById("blLetra")) return;
  if (typeof PAGINA !== "undefined" && PAGINA !== "repertorio") return;
  const wrap = inp.closest(".search-wrap");
  if (!wrap) return;

  const b = document.createElement("button");
  b.type = "button";
  b.id = "blLetra";
  b.className = "bl-letra";
  b.title = "Procurar também dentro das letras";
  b.innerHTML = `<span class="bl-caixa"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><span>Letra</span>`;
  const pintar = () => {
    b.classList.toggle("on", blIncluir);
    b.setAttribute("aria-pressed", blIncluir ? "true" : "false");
    blPlaceholder();
  };
  b.addEventListener("click", () => {
    blIncluir = !blIncluir;
    try { localStorage.setItem(BL_CHAVE, blIncluir ? "1" : "0"); } catch (e) {}
    pintar();
    if (!blIncluir) blTrechos.clear();
    filtrar();
  });
  wrap.after(b);
  pintar();
})();
