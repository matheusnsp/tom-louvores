// ============================================================
//  TOM LOUVORES — sons de verdade
//  Carregue DEPOIS do acordes.js e ANTES do afinador.js.
//
//  Troca a síntese por gravações reais de piano de cauda, violão
//  de aço e baixo acústico. As amostras vêm do banco FluidR3_GM,
//  uma nota por arquivo, e ficam guardadas no aparelho depois da
//  primeira vez — quem já abriu uma vez toca offline.
// ============================================================

const SOM_BASE = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM";

const SOM_INSTRUMENTOS = {
  piano:  { pasta: "acoustic_grand_piano", min: 21, max: 96, ganho: 1.0 },
  violao: { pasta: "acoustic_guitar_steel", min: 38, max: 84, ganho: 1.0 },
  baixo:  { pasta: "acoustic_bass",         min: 26, max: 72, ganho: 1.1 },
};

const SOM_NOMES = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const somNomeNota = m => SOM_NOMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

// ── guarda no aparelho ──────────────────────────────────────
//  O localStorage não serve para áudio, então vai no IndexedDB,
//  que aguenta megabytes e sobrevive a fechar o navegador.

const SOM_BD = "tl_amostras";
let somBDPromessa = null;

function somBD() {
  if (somBDPromessa) return somBDPromessa;
  somBDPromessa = new Promise((ok, erro) => {
    const req = indexedDB.open(SOM_BD, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("mp3");
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  }).catch(() => null);
  return somBDPromessa;
}

async function somDoDisco(chave) {
  const bd = await somBD();
  if (!bd) return null;
  return new Promise(ok => {
    const t = bd.transaction("mp3", "readonly").objectStore("mp3").get(chave);
    t.onsuccess = () => ok(t.result || null);
    t.onerror = () => ok(null);
  });
}

async function somParaDisco(chave, dados) {
  const bd = await somBD();
  if (!bd) return;
  try { bd.transaction("mp3", "readwrite").objectStore("mp3").put(dados, chave); } catch {}
}

// ── carregamento ────────────────────────────────────────────

const somBuffers = new Map();     // "violao:52" → AudioBuffer
const somPendentes = new Map();

async function somCarregar(inst, midi) {
  const cfg = SOM_INSTRUMENTOS[inst];
  if (!cfg) return null;
  const nota = Math.max(cfg.min, Math.min(cfg.max, midi));
  const chave = `${inst}:${nota}`;

  if (somBuffers.has(chave)) return somBuffers.get(chave);
  if (somPendentes.has(chave)) return somPendentes.get(chave);

  const carga = (async () => {
    let bruto = await somDoDisco(chave);
    if (!bruto) {
      const url = `${SOM_BASE}/${cfg.pasta}-mp3/${somNomeNota(nota)}.mp3`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("amostra não encontrada: " + url);
      bruto = await r.arrayBuffer();
      somParaDisco(chave, bruto.slice(0));
    }
    const buf = await acCtx().decodeAudioData(bruto.slice(0));
    somBuffers.set(chave, buf);
    return buf;
  })();

  somPendentes.set(chave, carga);
  try { return await carga; }
  catch { return null; }
  finally { somPendentes.delete(chave); }
}

//  Saída comum de todas as amostras. O limitador segura os picos:
//  sem ele, subir o ganho para a nota solta ficar audível faria o
//  acorde de seis cordas estourar, porque lá os volumes somam.
let somSaida = null;

function somDestino() {
  const ctx = acCtx();
  if (somSaida && somSaida.context === ctx) return somSaida;

  const limite = ctx.createDynamicsCompressor();
  limite.threshold.setValueAtTime(-8, ctx.currentTime);
  limite.knee.setValueAtTime(6, ctx.currentTime);
  limite.ratio.setValueAtTime(12, ctx.currentTime);
  limite.attack.setValueAtTime(0.003, ctx.currentTime);
  limite.release.setValueAtTime(0.25, ctx.currentTime);
  limite.connect(ctx.destination);

  somSaida = limite;
  return somSaida;
}

function somTocar(inst, midi, quando, dur, ganho = 1) {
  const cfg = SOM_INSTRUMENTOS[inst];
  const nota = Math.max(cfg.min, Math.min(cfg.max, midi));
  const chave = `${inst}:${nota}`;
  const buf = somBuffers.get(chave);

  if (!buf) { somCarregar(inst, midi); return false; }

  const ctx = acCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  // fora do alcance da amostra, ajusta a altura pelo que faltou
  const diferenca = midi - nota;
  if (diferenca) src.playbackRate.value = Math.pow(2, diferenca / 12);

  const g = ctx.createGain();
  g.gain.setValueAtTime(ganho * cfg.ganho, quando);
  // solta a tecla: a cauda desce em vez de cortar seco
  g.gain.setValueAtTime(ganho * cfg.ganho, quando + dur * 0.72);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur + 0.45);

  src.connect(g); g.connect(somDestino());
  src.start(quando);
  src.stop(quando + dur + 0.5);
  acTocando.push(src);
  return true;
}

//  Deixa prontas as notas de um acorde antes de alguém apertar
//  Ouvir, para a primeira vez já sair com o som certo.
function somPreparar(inst, midis) {
  midis.forEach(m => somCarregar(inst, m));
}

// ── troca as vozes sintetizadas pelas gravações ─────────────

const somVozViolaoSintetica = acVozViolao;
acVozViolao = function (midi, quando, dur, ganho = 0.5) {
  if (somTocar("violao", midi, quando, dur, ganho * 1.6)) return;
  return somVozViolaoSintetica(midi, quando, dur, ganho);
};

const somVozPianoSintetica = acVozPiano;
acVozPiano = function (midi, quando, dur, ganho = 0.20) {
  if (somTocar("piano", midi, quando, dur, ganho * 3.4)) return;
  return somVozPianoSintetica(midi, quando, dur, ganho);
};

//  Ao abrir o painel de um acorde, já busca as amostras dele.
const somDesenharOriginal = acDesenhar;
acDesenhar = function (...a) {
  const r = somDesenharOriginal.apply(this, a);
  if (acAtual) {
    try {
      somPreparar(acAba === "teclado" ? "piano" : "violao", acNotasParaTocar(acAtual));
    } catch {}
  }
  return r;
};

// ── primeiro toque já com o som certo ───────────────────────
//  Antes: se a amostra ainda não estava na memória, a nota saía pela
//  síntese antiga e o pedido de download só começava ali. Por isso o
//  primeiro "Ouvir" soava como o som velho e o segundo, certo — e
//  num acorde com parte das notas carregadas, saía metade de cada.
//
//  Agora o toque espera as amostras que faltam (do aparelho, quase
//  instantâneo; da rede, na primeira vez) e só então toca, tudo com
//  o som gravado. Se a rede não responder em SOM_ESPERA, toca com a
//  síntese mesmo, para nunca ficar mudo.

const SOM_ESPERA = 2500;
const somChave = (inst, midi) => {
  const cfg = SOM_INSTRUMENTOS[inst];
  return `${inst}:${Math.max(cfg.min, Math.min(cfg.max, midi))}`;
};
const somFaltam = (inst, midis) => midis.filter(m => !somBuffers.has(somChave(inst, m)));

//  Resolve true quando todas chegaram; false se o tempo acabou.
function somGarantir(inst, midis) {
  const faltam = somFaltam(inst, midis);
  if (!faltam.length) return Promise.resolve(true);
  return Promise.race([
    Promise.all(faltam.map(m => somCarregar(inst, m))).then(() => !somFaltam(inst, midis).length),
    new Promise(ok => setTimeout(() => ok(false), SOM_ESPERA)),
  ]);
}

const somInstAtual = () => (typeof acAba !== "undefined" && acAba === "teclado") ? "piano" : "violao";

//  Enquanto espera, o botão mostra que está carregando.
(function somEstilo() {
  const st = document.createElement("style");
  st.textContent = `
    .som-carregando{position:relative;opacity:.75;pointer-events:none}
    .som-carregando::after{content:"";position:absolute;inset:-3px;border-radius:inherit;
      border:2px solid transparent;border-top-color:var(--gold, #F0B93A);
      animation:somGira .7s linear infinite}
    @keyframes somGira{to{transform:rotate(360deg)}}`;
  document.head.appendChild(st);
})();

if (typeof acOuvir === "function") {
  const somOuvirOriginal = acOuvir;
  acOuvir = function (nome, botao, variacao) {
    const inst = somInstAtual();
    let notas = [];
    try { notas = acNotasParaTocar(nome, variacao); } catch {}
    if (!somFaltam(inst, notas).length) return somOuvirOriginal.call(this, nome, botao, variacao);

    //  Destrava o áudio AGORA, dentro do toque (o iPhone só deixa
    //  tocar som que começou num gesto da pessoa), e toca depois.
    acCtx();
    acParar();
    botao?.classList.add("som-carregando");
    somGarantir(inst, notas).then(() => {
      botao?.classList.remove("som-carregando");
      somOuvirOriginal.call(this, nome, botao, variacao);
    });
  };
}

//  Para o afinador (e quem mais tocar uma nota só): espera a amostra
//  e, se não vier a tempo, chama a síntese que foi passada.
function somTocarQuandoPronto(inst, midi, dur, ganho, sintese, botao) {
  const t = () => acCtx().currentTime + 0.05;
  if (somBuffers.has(somChave(inst, midi))) { somTocar(inst, midi, t(), dur, ganho); return; }
  acCtx();
  botao?.classList.add("som-carregando");
  somGarantir(inst, [midi]).then(ok => {
    botao?.classList.remove("som-carregando");
    if (!(ok && somTocar(inst, midi, t(), dur, ganho)) && sintese) sintese(t());
  });
}

// ── adianta as amostras da música aberta ────────────────────
//  Ao abrir uma cifra, busca em segundo plano as notas de todos os
//  acordes dela, no instrumento escolhido. Da segunda vez em diante
//  elas vêm do aparelho e o primeiro toque já sai na hora.
const somOcioso = window.requestIdleCallback || (fn => setTimeout(fn, 400));
let somPreparadoPara = "";

function somPrepararMusica() {
  const corpo = document.getElementById("lyraCorpo");
  if (!corpo || typeof acNotasParaTocar !== "function") return;
  const acordes = [...new Set([...corpo.querySelectorAll("button.ac-tk[data-ac]")].map(b => b.dataset.ac))];
  if (!acordes.length) return;
  const inst = somInstAtual();
  const marca = inst + "|" + acordes.join(",");
  if (marca === somPreparadoPara) return;
  somPreparadoPara = marca;

  const notas = new Set();
  acordes.forEach(a => { try { acNotasParaTocar(a, 0).forEach(m => notas.add(m)); } catch {} });
  const fila = [...notas].filter(m => !somBuffers.has(somChave(inst, m)));
  //  Aos poucos, três por vez, para não disputar a rede com a cifra.
  const proximo = () => {
    const lote = fila.splice(0, 3);
    if (!lote.length) return;
    Promise.all(lote.map(m => somCarregar(inst, m))).finally(() => somOcioso(proximo));
  };
  somOcioso(proximo);
}

if (typeof lyraRenderConteudo === "function") {
  const somRenderOriginal = lyraRenderConteudo;
  lyraRenderConteudo = async function (...a) {
    const r = await somRenderOriginal.apply(this, a);
    setTimeout(somPrepararMusica, 800);
    return r;
  };
}
