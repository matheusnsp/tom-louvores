// ============================================================
//  TOM LOUVORES — ministrante da escala (Firebase)
//  Depois de carregar os cultos, se o campo Ministrante estiver
//  vazio, busca no Firestore quem está escalado para a data
//  daquele culto e grava no Supabase. Valor já preenchido
//  (manual ou anterior) nunca é sobrescrito.
//  Carregue DEPOIS do app.js e do calendario.js.
//
//  Adaptado ao modelo de ocorrências: a escala é buscada por
//  OCORRÊNCIA (tipo + data), não por tipo. Antes havia um slot
//  único por tipo e a data vinha de dataAlvoCulto(); agora cada
//  dia tem a sua linha.
//
//  QUANDO ELE CONSULTA
//  A janela é o MÊS corrente, estendida ao mês seguinte quando
//  falta pouco para virar. E ele lembra o que já checou:
//    · mês com todos os cultos preenchidos → não consulta mais
//    · mês incompleto → reconsulta no máximo a cada 12 horas
//  Em regime normal isso dá ZERO requisição ao Firestore por
//  abertura de página.
//
//  Por que não "avisar quando o Firestore mudar": escuta em tempo
//  real (onSnapshot) exige o SDK do Firebase. Aqui é REST puro,
//  sem dependência, e REST não escuta. Além disso o listener só
//  viveria enquanto a página estivesse aberta — não é o caso de
//  uso. O lembrete de 12h faz o mesmo trabalho na prática.
// ============================================================

const ESCALA_TURNO_POR_TIPO = {
  quarta: "único",
  domingo_manha: "manhã",
  domingo_noite: "noite",
};

// quantos dias antes de virar o mês já olhar o mês seguinte.
// Se a escala do mês que vem costuma sair com antecedência e você
// quer que a equipe veja antes, aumente este número.
const ESCALA_ANTECEDENCIA_D = 1;

// de quanto em quanto tempo reconsultar um mês ainda incompleto
const ESCALA_REPETIR_H = 12;

const ESCALA_MEMO = "tl_escala:";

function escalaCampoStr(fields, nome) {
  const f = fields && fields[nome];
  return f && f.stringValue != null ? f.stringValue : "";
}

// ============================================================
//  MEMÓRIA DO QUE JÁ FOI CHECADO
// ============================================================

function escalaMemoLer(mes) {
  try { return Number(localStorage.getItem(ESCALA_MEMO + mes)) || 0; }
  catch { return 0; }
}

function escalaMemoGravar(mes) {
  try { localStorage.setItem(ESCALA_MEMO + mes, String(Date.now())); }
  catch { /* modo privativo: só perde o cache, nada quebra */ }
}

function escalaMemoLimpar() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(ESCALA_MEMO))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* idem */ }
}

// ============================================================
//  FIRESTORE
// ============================================================

// Firestore REST: louvor + data; filtramos função/turno no cliente
async function escalaBuscarDocsDoCulto(data) {
  const projectId = CONFIG.FIREBASE && CONFIG.FIREBASE.projectId;
  if (!projectId || !data) return [];

  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: "escalas" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "ministerioId" },
                op: "EQUAL",
                value: { stringValue: "louvor" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "data" },
                op: "EQUAL",
                value: { stringValue: data },
              },
            },
          ],
        },
      },
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Firestore runQuery " + r.status);

  const rows = await r.json();
  if (!Array.isArray(rows)) return [];

  return rows
    .map(row => row.document && row.document.fields)
    .filter(Boolean);
}

// Domingo manhã e domingo noite são a MESMA data: sem este cache
// seriam duas consultas idênticas por domingo. Limpo no início de
// cada sincronização.
const escalaCache = new Map();

async function escalaDocsDaData(data) {
  if (escalaCache.has(data)) return escalaCache.get(data);
  const docs = await escalaBuscarDocsDoCulto(data);
  escalaCache.set(data, docs);
  return docs;
}

function escalaNomeNoTomLouvores(pessoaNome) {
  if (!pessoaNome) return "";
  const lower = String(pessoaNome).trim().toLowerCase();
  return MINISTRANTES.find(m => m.toLowerCase() === lower) || "";
}

// quem ministra nesta ocorrência, dados os documentos da data
function escalaMinistranteNaOcorrencia(docs, oc) {
  const turno = ESCALA_TURNO_POR_TIPO[oc.tipo];
  if (!turno) return "";   // culto eventual não tem turno no Firestore

  const doc = docs.find(
    f =>
      escalaCampoStr(f, "funcao") === "MINISTRANTE" &&
      escalaCampoStr(f, "turno") === turno
  );
  if (!doc) return "";

  const bruto = escalaCampoStr(doc, "pessoaNome");
  const nome  = escalaNomeNoTomLouvores(bruto);

  // Nome fora de MINISTRANTES (convidado, ou erro de digitação na
  // escala) sai vazio. Sem este aviso o culto ficaria sem
  // ministrante no site e ninguém saberia por quê.
  if (bruto && !nome) {
    console.warn(`Escala: "${bruto}" não está na lista MINISTRANTES `
      + `(${oc.data}, ${oc.tipo}) — culto fica sem ministrante.`);
  }
  return nome;
}

// ============================================================
//  GRAVAÇÃO
// ============================================================

// igual à limpeza automática antiga: persiste sem exigir login de admin
async function escalaPreencherSeVazio(chave, nome) {
  if (!nome) return false;
  if (cultos[chave] && cultos[chave].ministrante) return false; // manual vence

  // culto fixo só ganha linha no banco neste momento
  const dados = cultoGarantir(chave);
  dados.ministrante = nome;
  dados.ministrante_data = dataDaChave(chave);

  const ok = await salvarCulto(chave);
  if (!ok) {
    dados.ministrante = "";
    dados.ministrante_data = null;
    return false;
  }
  return true;
}

// ============================================================
//  JANELA: mês corrente, e o seguinte quando está perto de virar
// ============================================================

function escalaFimDoMes(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function escalaJanela(agora = new Date()) {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fimEste = escalaFimDoMes(hoje);
  const faltam  = Math.round((fimEste - hoje) / 86400e3);

  const fim = faltam <= ESCALA_ANTECEDENCIA_D
    ? escalaFimDoMes(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1))
    : fimEste;

  return { de: isoDia(hoje), ate: isoDia(fim) };
}

// ============================================================
//  SINCRONIZAÇÃO
// ============================================================

async function escalaSincronizarMinistrantes(forcar = false) {
  if (!CONFIG.FIREBASE || !CONFIG.FIREBASE.projectId) return;
  if (typeof calOcorrencias !== "function") return;   // calendario.js não carregou

  escalaCache.clear();

  const { de, ate } = escalaJanela();

  // já sem os cultos cancelados: não faz sentido escalar alguém
  // para um culto que não vai acontecer
  const ocorrencias = calOcorrencias(de, ate);

  // agrupa por mês e, dentro dele, por data. Uma consulta por data,
  // não por culto: domingo manhã e noite são a mesma data.
  const meses = [];
  const porMes = {};
  ocorrencias.forEach(oc => {
    if (!ESCALA_TURNO_POR_TIPO[oc.tipo]) return;   // culto eventual
    const mes = oc.data.slice(0, 7);
    if (!porMes[mes]) { porMes[mes] = { datas: [], porData: {} }; meses.push(mes); }
    const m = porMes[mes];
    if (!m.porData[oc.data]) { m.porData[oc.data] = []; m.datas.push(oc.data); }
    m.porData[oc.data].push(oc);
  });

  let mudou = false;
  const limite = ESCALA_REPETIR_H * 3600e3;

  for (const mes of meses) {
    const { datas, porData } = porMes[mes];

    // o que ainda falta neste mês
    const pendentes = datas.filter(data =>
      porData[data].some(oc => !(cultos[oc.key] && cultos[oc.key].ministrante)));

    if (!pendentes.length) {
      escalaMemoGravar(mes);   // mês completo: não volta aqui
      continue;
    }

    // mês incompleto, checado há pouco: a escala provavelmente
    // ainda não foi montada. Não insiste a cada abertura de página.
    const visto = escalaMemoLer(mes);
    if (!forcar && visto && Date.now() - visto < limite) continue;

    escalaMemoGravar(mes);

    for (const data of pendentes) {
      let docs;
      try {
        docs = await escalaDocsDaData(data);
      } catch (e) {
        console.error("Escala Firebase (" + data + "):", e);
        continue;
      }
      if (!docs.length) continue;

      for (const oc of porData[data]) {
        const nome = escalaMinistranteNaOcorrencia(docs, oc);
        if (!nome) continue;
        if (await escalaPreencherSeVazio(oc.key, nome)) mudou = true;
      }
    }
  }

  if (mudou) renderCultos();
}

// força uma sincronização agora, ignorando o que já foi checado.
// Útil quando a escala do Firestore acabou de ser montada e você
// não quer esperar as 12 horas: rode escalaForcar() no console.
async function escalaForcar() {
  escalaMemoLimpar();
  await escalaSincronizarMinistrantes(true);
  if (typeof toast === "function") toast("Escala sincronizada ✓");
}

// ── enxerto: roda após cada carga de cultos ─────────────────
const escalaCarregarCultosOriginal = carregarCultos;
carregarCultos = async function () {
  await escalaCarregarCultosOriginal.apply(this, arguments);
  await escalaSincronizarMinistrantes();
};