// ============================================================
//  TOM LOUVORES — detalhes do acorde (teoria no tom da música)
//  Carregar DEPOIS de acordes.js e graus.js.
//
//  Ao tocar num acorde da cifra, o balão (celular e hover no
//  computador) e o painel (computador) ganham um botão
//  "Detalhes". Ele abre uma folha por cima com:
//    1. resumo: grau, função e se o acorde é do tom
//    2. notas no teclado, com o nome de cada intervalo
//    3. lugar no campo harmônico (e o alvo, quando aponta para outro)
//    4. função, com medidores de tensão e repouso
//    5. como soa
//    6. alternativas: tocar para ouvir, tocar no nome para ver detalhes
//    7. dica
//
//  Tudo é calculado na hora a partir do nome do acorde e do tom
//  do leitor: não há tabela por música. Em tom menor a referência
//  é o relativo maior (Am → C = 1), a mesma do modo "Graus".
//  Não altera os acordes da cifra nem o som/diagramas.
// ============================================================
(function () {
  "use strict";

  if (typeof acLer !== "function" ||
      typeof acPintarBalao !== "function" ||
      typeof acDesenhar !== "function" ||
      typeof lyraPc !== "function" ||
      !window.tomLouvoresGraus ||
      typeof window.tomLouvoresGraus.tonicaDeReferencia !== "function") return;

  const T = window.tomLouvoresGraus;
  const LETRAS = "CDEFGAB";
  const ESCALA = [0, 2, 4, 5, 7, 9, 11];
  const PC_LETRA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];

  // Qualidade natural de cada grau da escala maior.
  const NATURAL = ["maior", "menor", "menor", "maior", "maior", "menor", "dim"];
  const NOME_GRAU = ["tônica", "supertônica", "mediante", "subdominante", "dominante", "superdominante", "sensível"];

  const esc = s => String(s).replace(/[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Nomes de notas com a grafia certa ----------

  function nomeNota(indiceLetra, pc) {
    const base = PC_LETRA[LETRAS[indiceLetra % 7]];
    const alt = ((pc - base + 18) % 12) - 6;
    return LETRAS[indiceLetra % 7] + (alt < 0 ? "b".repeat(-alt) : "#".repeat(alt));
  }

  // Nota do grau `idx` (0 a 6) da escala maior de `ref`, com alteração opcional.
  function notaDoGrau(ref, idx, alt = 0) {
    const pc = (lyraPc(ref) + ESCALA[idx] + alt + 24) % 12;
    return nomeNota(LETRAS.indexOf(ref[0]) + idx, pc);
  }

  function parseGrau(g) {
    const m = String(g).match(/^([#b]*)([1-7])$/);
    if (!m) return null;
    return { alt: m[1].includes("#") ? m[1].length : -m[1].length, idx: Number(m[2]) - 1, texto: g };
  }

  // Nome de um grau em algarismos romanos: maior = maiúsculo, menor = minúsculo.
  function romano(g, tipo) {
    const base = ROMANOS[g.idx];
    const pref = g.alt < 0 ? "b".repeat(-g.alt) : "#".repeat(g.alt);
    if (tipo === "menor") return pref + base.toLowerCase();
    if (tipo === "dim") return pref + base.toLowerCase() + "°";
    if (tipo === "aum") return pref + base + "+";
    return pref + base;
  }

  // ---------- Análise do acorde ----------

  const SEMITOM_INTERVALO = (ctx, s) => {
    switch (s) {
      case 0:  return { rot: "T", off: 0, nome: "fundamental" };
      case 1:  return { rot: "b9", off: 1, alta: true };
      case 2:  return ctx.terca ? { rot: "9ª", off: 1, alta: true } : { rot: "2ª", off: 1 };
      case 3:  return { rot: "3m", off: 2 };
      case 4:  return { rot: "3M", off: 2 };
      case 5:  return ctx.terca ? { rot: "11ª", off: 3, alta: true } : { rot: "4ª", off: 3 };
      case 6:  return ctx.quinta ? { rot: "#11", off: 3, alta: true }
                    : { rot: ctx.dim ? "5ª dim" : "b5", off: 4 };
      case 7:  return { rot: "5J", off: 4 };
      case 8:  return ctx.quinta ? { rot: "b13", off: 5, alta: true } : { rot: "5ª aum", off: 4 };
      case 9:  return ctx.dim ? { rot: "7ª dim", off: 6 }
                    : ctx.setima ? { rot: "13ª", off: 5, alta: true } : { rot: "6ª", off: 5 };
      case 10: return { rot: "7m", off: 6 };
      default: return { rot: "7M", off: 6 };
    }
  };

  function analisar(nome, tom) {
    const ac = acLer(nome);
    const ref = T.tonicaDeReferencia(tom);
    if (!ac || !ref) return null;

    const raizM = String(nome).match(/^([A-G][#b]?)/);
    if (!raizM) return null;
    const raizNome = raizM[1];
    let sufixo = String(nome).slice(raizNome.length);
    let baixoNome = null;
    const inv = sufixo.match(/\/([A-G][#b]?)$/);
    if (inv) { baixoNome = inv[1]; sufixo = sufixo.slice(0, inv.index); }

    const poder = /^5$/.test(sufixo);
    const pcs = poder ? [0, 7] : ac.pcs.slice();
    const tem = n => pcs.includes(n);

    const ctx = {
      dim: ac.dim,
      terca: tem(3) || tem(4),
      quinta: tem(7),
      setima: tem(10) || tem(11),
    };

    const maj7 = tem(11);
    const m7 = tem(10);
    const meioDim = ac.menor && tem(6) && m7 && !ac.dim;
    const dom = !ac.menor && !ac.dim && !ac.sus && tem(4) && m7;
    const triade = ac.dim ? "dim" : ac.aum ? "aum" : ac.menor ? "menor" : "maior";

    const grauTxt = T.grauDaNota(raizNome, tom);
    const grau = parseGrau(grauTxt);
    if (!grau) return null;

    // Notas com a grafia correta: cada intervalo cai na letra certa.
    const letraRaiz = LETRAS.indexOf(raizNome[0]);
    const raizPc = lyraPc(raizNome);
    //  Na ordem de empilhamento (1, 3, 5, 7, 9...), não na do semitom.
    const notas = pcs.map(s => {
      const i = SEMITOM_INTERVALO(ctx, s);
      return { nota: nomeNota(letraRaiz + i.off, (raizPc + s) % 12), rot: i.rot,
               semitons: s, ordem: i.off + (i.alta ? 7 : 0) };
    }).sort((x, y) => x.ordem - y.ordem);

    // Nome diatônico de um acorde do tom (grau, alteração, sufixo).
    const nomeDoGrau = (idx, alt, suf = "") => notaDoGrau(ref, idx, alt) + suf;

    // ----- classificação -----
    const natural = grau.alt === 0;
    let tipo = "cromatico";
    let alvo = null;           // para secundário e passagem

    // Pertencimento: TODAS as notas reais precisam pertencer à escala,
    // inclusive 7ª e extensões. Um F7 em C, por exemplo, contém Eb: NÃO é diatônico.
    const escalaPcs = new Set(ESCALA.map(v => (lyraPc(ref) + v) % 12));
    const notasNoCampo = pcs.every(v => escalaPcs.has((raizPc + v) % 12));
    const qualidadeBate = natural && (
      NATURAL[grau.idx] === triade ||
      (NATURAL[grau.idx] === "dim" && (ac.dim || meioDim)) ||
      ((ac.sus || poder) && NATURAL[grau.idx] !== "dim")
    );

    if (qualidadeBate && notasNoCampo) {
      tipo = "diatonico";
    } else {
      // Uma dominante secundária exige alvo tonal plausível. Sem progressão
      // não se pode afirmar que ela realmente toniciza o acorde indicado.
      const alvoIdx = ESCALA.indexOf((((raizPc + 5) % 12) - lyraPc(ref) + 12) % 12);
      if (triade === "maior" && !ac.sus && !poder && !maj7 &&
          (tem(4) && (tem(7) || m7)) && alvoIdx >= 1 && alvoIdx <= 5) {
        tipo = "secundario";
        alvo = { idx: alvoIdx, nome: nomeDoGrau(alvoIdx, 0, NATURAL[alvoIdx] === "menor" ? "m" : "") };
      } else if (ac.dim && grau.alt === 1 && [0, 1, 3, 4].includes(grau.idx)) {
        const subIdx = grau.idx + 1;
        tipo = "passagem"; // possível: só confirmável ao ver a resolução
        alvo = { idx: subIdx, nome: nomeDoGrau(subIdx, 0, NATURAL[subIdx] === "menor" ? "m" : "") };
      } else if (
        (triade === "maior" && grau.alt === -1 && [1, 2, 5, 6].includes(grau.idx)) ||
        (triade === "menor" && natural && [0, 3, 4].includes(grau.idx)) ||
        ((ac.dim || meioDim) && natural && grau.idx === 1)
      ) {
        tipo = "emprestimo"; // hipótese de origem modal
      }
    }

    return {
      ac, ref, tom, nome, raizNome, baixoNome, sufixo, poder,
      pcs, tem, ctx, maj7, m7, meioDim, dom, triade,
      grau, grauTxt, notas, nomeDoGrau, tipo, alvo, natural, raizPc,
      menorTom: /m$/.test(String(tom)) && !/^[A-G][#b]?$/.test(String(tom)),
    };
  }

  // ---------- Textos ----------

  function qualidadeFrase(a) {
    const partes = [];
    if (a.poder) return "Power chord: só a fundamental e a quinta (sem terça, não é maior nem menor)";
    if (a.ac.sus) partes.push(a.tem(2) ? "Sus2 (a terça dá lugar à 2ª)" : "Sus4 (a terça dá lugar à 4ª)");
    else if (a.meioDim) partes.push("Tríade menor com quinta diminuta (meio-diminuto)");
    else partes.push({ maior: "Tríade maior", menor: "Tríade menor",
                       dim: "Tríade diminuta", aum: "Tríade aumentada" }[a.triade]);
    const extras = [];
    if (a.maj7) extras.push("sétima maior");
    else if (a.ac.dim && a.tem(9)) extras.push("sétima diminuta");
    else if (a.m7) extras.push("sétima menor");
    if (a.tem(9) && !a.ctx.setima && !a.ac.dim) extras.push("sexta");
    if (a.tem(2) && a.ctx.terca) extras.push("nona");
    if (a.tem(5) && a.ctx.terca) extras.push("décima primeira");
    if (a.tem(9) && a.ctx.setima && !a.ac.dim) extras.push("décima terceira");
    return partes[0] + (extras.length ? " + " + extras.join(" + ") : "");
  }





  function textoCarater(a) {
    let q;
    if (a.poder) q = "Neutro e firme: sem terça, não soa nem alegre nem triste, só forte. Combina bem com guitarra distorcida e deixa o teclado definir a cor.";
    else if (a.ac.dim) q = "Tenso e instável, soa como passagem. Pede para seguir adiante e nunca “senta”.";
    else if (a.meioDim) q = "Sombrio e suspenso: menor com quinta diminuta, quase um dominante sem raiz.";
    else if (a.ac.aum) q = "Misterioso e flutuante, a quinta aumentada empurra para frente.";
    else if (a.ac.sus) q = a.tem(2)
      ? "Aberto e arejado: sem terça, não é maior nem menor, e a 2ª dá um brilho de espera."
      : "Suspenso, como uma pergunta no ar. A 4ª no lugar da terça pede para resolver.";
    else if (a.maj7) q = a.triade === "menor"
      ? "Cinematográfico e inquieto: menor com sétima maior, um clima de suspense."
      : "Doce, luminoso e flutuante. A sétima maior dá brilho sonhador sem a tensão do dominante.";
    else if (a.dom) q = "Tenso e com sabor de blues: a terça maior e a sétima menor formam um trítono, que quer resolver.";
    else if (a.m7 && a.triade === "menor") q = "Suave e aveludado: o menor ganha uma sétima que arredonda a emoção.";
    else if (a.tem(2) && a.ctx.terca) q = "Espaçoso e moderno: a 9ª abre o acorde sem a tensão da sétima. Muito usado em ambiente de oração.";
    else if (a.tem(9) && !a.ctx.setima) q = "Calmo e um pouco antigo: a sexta dá um ar de repouso, de final de canção.";
    else if (a.triade === "menor") q = "Introspectivo e emotivo: o acorde menor soa mais sério e interior.";
    else q = "Aberto, estável e brilhante: o acorde maior soa afirmativo e cheio.";

    const colorido = {
      emprestimo: " Se funcionar como empréstimo modal, pode trazer um toque de emoção ou de grandeza.",
      secundario: " Quando atua como dominante secundário, pode criar expectativa.",
      passagem: " Soa como um suspiro entre dois acordes.",
      cromatico: " Por usar notas fora do campo, pode chamar atenção na harmonia.",
      diatonico: "",
    }[a.tipo];
    return `<p>${q}${colorido}</p>`;
  }

  // Sufixo "base" sem tensões, para a versão simples.
  function versaoSimples(a) {
    const sem = a.raizNome + (a.triade === "menor" ? "m" : a.triade === "dim" ? "dim" : a.triade === "aum" ? "aug" : "");
    const novo = sem + (a.baixoNome ? "/" + a.baixoNome : "");
    return novo !== a.nome ? novo : null;
  }

  function substituicoes(a) {
    const itens = [];
    const add = (nome, motivo) => {
      if (!nome || nome === a.nome || itens.some(i => i.nome === nome)) return;
      itens.push({ nome, motivo });
    };
    const g = a.grau.idx;
    const N = (idx, alt, suf) => a.nomeDoGrau(idx, alt, suf);
    const sufNat = idx => NATURAL[idx] === "menor" ? "m" : NATURAL[idx] === "dim" ? "dim" : "";

    const simples = versaoSimples(a);
    const temExtensao = a.sufixo && !/^(m|dim|°|º)$/.test(a.sufixo);
    if (simples && temExtensao && !a.ac.dim && !a.meioDim) {
      add(simples, "Versão simples, sem as tensões. Boa para ensaio ou para tocar mais leve.");
    }

    const grauApp = n => T.grauDoAcorde(n, a.tom);

    if (a.tipo === "diatonico") {
      switch (g) {
        case 0:
          add(N(5, 0, "m"), "Outra tônica: a relativa menor, mais melancólica.");
          add(N(2, 0, "m"), "Outra tônica, mais suave e sem fundamental.");
          add(N(0, 0) + "/" + N(2, 0), "Mesmo acorde com baixo na terça: o baixo caminha melhor para o 4.");
          if (!a.maj7) add(N(0, 0, "7M"), "Mais aberto e flutuante, bom em finais.");
          break;
        case 1:
          add(N(3, 0), "Mesma função de subdominante, mais clara e sem o menor.");
          add(N(3, 0) + "/" + N(1, 0), "O 4 com baixo no 2: soa quase igual a " + N(1, 0, "m7") + ".");
          if (!a.m7) add(N(1, 0, "m7"), "Mais suave que a tríade.");
          break;
        case 2:
          add(N(0, 0, "7M"), "Contém as mesmas notas do " + N(2, 0, "m") + " e soa mais aberto.");
          add(N(0, 0) + "/" + N(2, 0), "Tônica com baixo na terça, quase a mesma cor.");
          add(N(5, 0, "m"), "Outra tônica, mais grave e escura.");
          break;
        case 3:
          add(N(1, 0, "m"), "Mesma função de subdominante, em versão menor.");
          if (!a.maj7) add(N(3, 0, "7M"), "Soa mais suave e aberto, comum em louvor.");
          add(N(3, 0) + "/" + N(0, 0), "Baixo na tônica (nota pedal): mantém o chão firme enquanto o acorde muda.");
          if (!a.tem(2)) add(N(3, 0, "add9"), "Deixa o acorde arejado, bom em ambiente.");
          break;
        case 4:
          if (!a.ac.sus) add(N(4, 0, "sus4"), "Prepara a resolução: toque o sus4 e depois o acorde normal.");
          if (!a.dom) add(N(4, 0, "7"), "Mais tensão, pede o 1 com mais força.");
          add(N(6, 0, "dim"), "Sem a fundamental, soa como " + N(4, 0, "7") + " e resolve no 1.");
          add(N(4, 0) + "/" + N(6, 0), "Baixo na sensível: sobe para a tônica com fluidez.");
          break;
        case 5:
          add(N(3, 0, "7M"), "Contém as notas do " + N(5, 0, "m") + " e soa mais luminoso.");
          add(N(0, 0), "A relativa maior, mais clara e brilhante.");
          add(N(0, 0) + "/" + N(5, 0), "Soa como " + N(5, 0, "m7") + ": menor com sétima, mais suave.");
          break;
        default:
          add(N(4, 0, "7"), "O dominante completo, com a fundamental.");
          add(N(4, 0) + "/" + N(6, 0), "O 5 com baixo na sensível.");
          add(N(4, 0), "O dominante simples.");
      }
    } else if (a.tipo === "secundario") {
      add(a.raizNome + "sus4", "Retarda a resolução: toque o sus4 e depois o acorde.");
      const iiNome = nomeNota(LETRAS.indexOf(a.raizNome[0]) + 4, (a.raizPc + 7) % 12) + "m7";
      add(iiNome, "Antecipa com um ii–V: toque " + iiNome + " antes de " + a.raizNome + "7.");
      const tri = nomeNota(LETRAS.indexOf(a.raizNome[0]) + 4, (a.raizPc + 6) % 12) + "7";
      add(tri, "Troca de trítono, cor de jazz (avançado).");
      add(a.alvo.nome, "Simplifique: vá direto ao acorde de destino, sem a tensão.");
    } else if (a.tipo === "passagem") {
      const alvoNome = a.alvo.nome;
      const dom7 = nomeNota(LETRAS.indexOf(a.raizNome[0]) + 5, (a.raizPc + 8) % 12) + "7/" + a.raizNome;
      add(dom7, "Mesmas notas, com o dominante por inteiro: também resolve em " + alvoNome + ".");
      add(alvoNome, "Simplifique: pule o diminuto e vá direto a " + alvoNome + ".");
    } else if (a.tipo === "emprestimo") {
      const natIdx = a.grau.idx;
      const bemol = a.grau.alt < 0;
      if (bemol && natIdx === 1) add(N(3, 0), "Mesma função de subdominante, dentro do campo.");
      if (bemol && natIdx === 2) add(N(0, 0), "A tônica do campo, mais estável.");
      if (bemol && natIdx === 5) add(N(3, 0), "O 4 do campo: mesma função de subdominante.");
      if (bemol && natIdx === 6) add(N(3, 0), "Mesma função de subdominante, dentro do campo.");
      if (a.triade === "menor" && natIdx === 3) add(N(3, 0), "O 4 maior, mais claro. Mesma função de subdominante.");
      if (a.triade === "menor" && natIdx === 0) add(N(0, 0), "A tônica maior do tom.");
      if (a.triade === "menor" && natIdx === 4) add(N(4, 0), "O 5 maior, dominante de verdade.");
      if (!bemol && natIdx === 1) add(N(1, 0, "m"), "A versão diatônica: ii menor, sem o empréstimo.");
    } else {
      // fora do campo: só sugere o grau natural se o acorde estiver sobre ele
      if (a.natural) add(N(g, 0, sufNat(g)), "O acorde natural do mesmo grau, dentro do campo.");
      if (a.meioDim) {
        const dom7 = nomeNota(LETRAS.indexOf(a.raizNome[0]) + 3, (a.raizPc + 5) % 12) + "7";
        add(dom7, "Costuma vir antes dele: " + a.nome + " → " + dom7 + " forma um ii–V.");
      }
    }

    return itens.slice(0, 5).map(i => ({ ...i, grau: grauApp(i.nome) }));
  }


  function textoDica(a) {
    if (a.baixoNome) return `<p>Com baixista, deixe o baixo na nota ${esc(a.baixoNome)}. Sozinho no violão, comece a corda mais grave por ela e o resto do acorde já soa certo.</p>`;
    if (a.poder) return `<p>Evite carregar demais na distorção: sem terça o acorde fica vazio. Deixe o teclado ou a segunda guitarra definirem se é maior ou menor.</p>`;
    if (a.ac.dim) return `<p>Ouça a condução das vozes: diminutos frequentemente aproximam outro acorde, mas podem também sustentar passagens mais longas.</p>`;
    if (a.ac.sus) return `<p>Uma resolução comum é trocar a suspensão pela terça; mas acordes sus também podem permanecer sem resolução.</p>`;
    if (a.maj7) return `<p>No violão, não aperte demais as cordas de cima e deixe a sétima soar leve. No teclado, a sétima fica acima da fundamental. Combina com músicas em ambiente de oração.</p>`;
    if (a.dom) return `<p>Se estiver apertado, toque só a tríade e deixe a sétima para o teclado ou o baixo. Cresça a dinâmica nele e solte na resolução.</p>`;
    if (a.tem(2) && a.ctx.terca) return `<p>Toque mais leve que na tríade: a 9ª é para dar espaço, não para ser destacada. No violão, soltar uma corda aberta ajuda.</p>`;
    if (a.tipo === "emprestimo") return `<p>Capriche na dinâmica: esse acorde é o momento “diferente” da harmonia. Vale uma respirada antes e voltar ao tom com calma.</p>`;
    if (a.tipo === "secundario") return `<p>Confira o próximo acorde: ${esc(a.alvo.nome)} é uma resolução possível, não obrigatória. A melodia ajuda a confirmar a análise.</p>`;
    if (a.tipo === "diatonico" && a.grau.idx === 4) return `<p>Faça um pequeno crescendo e solte na resolução. É nele que a música pede o final da frase.</p>`;
    if (a.tipo === "diatonico" && a.grau.idx === 0) return `<p>É o lugar de respirar. Se a banda estiver ensaiando um final ou uma pausa, é aqui que ela cai.</p>`;
    return `<p>Escute o acorde antes de tocar: ouvir como ele soa no tom ajuda a decorar a música sem depender da cifra.</p>`;
  }

  // ---------- Folha de detalhes ----------
  //  Ordem pensada para quem está tocando: primeiro o resumo em três
  //  números (grau, função, se é do tom), depois as notas no teclado,
  //  o lugar no campo harmônico, como soa, o que dá para trocar e a
  //  dica. Cada termo técnico tem a explicação logo abaixo.

  let nomeAberto = null;
  const historico = [];   // acordes abertos a partir das alternativas

  //  Nome da função no vocabulário da harmonia funcional ensinada no
  //  Brasil (T, S, D) e o que ela faz, em poucas palavras.
  const FUNCAO = [
    { nome: "Tônica",          sigla: "T",  faz: "repouso, chegada" },
    { nome: "Subdominante",    sigla: "S",  faz: "prepara o dominante" },
    { nome: "Tônica",          sigla: "Ta", faz: "prolonga o repouso" },
    { nome: "Subdominante",    sigla: "S",  faz: "sai do repouso" },
    { nome: "Dominante",       sigla: "D",  faz: "tensão que pede a tônica" },
    { nome: "Tônica relativa", sigla: "Tr", faz: "repouso mais emotivo" },
    { nome: "Dominante",       sigla: "D",  faz: "sensível, quer subir ao I" },
  ];

  const TIPO = {
    diatonico: {
      rotulo: "Do campo", curto: "dentro do tom",
      def: "Diatônico: usa só notas da escala do tom. É o “material da casa” da música, e por isso soa natural.",
    },
    secundario: {
      rotulo: "Secundário", curto: "dominante emprestado",
      def: "Dominante secundário: um acorde maior com sétima menor que se comporta como o V de outro acorde do campo, e não da tônica. Ele cria um pequeno “caminho” até esse acorde.",
    },
    passagem: {
      rotulo: "Passagem", curto: "liga dois acordes",
      def: "Diminuto de passagem: sobe meio tom até o acorde seguinte. A tensão é curta e resolve logo; serve de ponte.",
    },
    emprestimo: {
      rotulo: "Emprestado", curto: "do tom menor",
      def: "Empréstimo modal: acorde tomado do tom menor (ou de outro modo) com a mesma tônica. Dá uma cor diferente sem trocar de tom.",
    },
    cromatico: {
      rotulo: "Fora do tom", curto: "cor cromática",
      def: "Cromático: tem notas fora da escala e não se encaixa nos casos comuns. Vale ouvir de onde ele vem e para onde vai.",
    },
  };

  const NOME_INTERVALO = {
    "T": "funda\u00ADmental", "3m": "terça menor", "3M": "terça maior",
    "5J": "quinta justa", "b5": "quinta diminuta", "5ª dim": "quinta diminuta", "5ª aum": "quinta aumentada",
    "7m": "sétima menor", "7M": "sétima maior", "7ª dim": "sétima diminuta",
    "9ª": "nona", "b9": "nona menor", "#9": "nona aumentada",
    "2ª": "segunda", "4ª": "quarta", "6ª": "sexta",
    "11ª": "décima primeira", "#11": "décima primeira aumentada",
    "13ª": "décima terceira", "b13": "décima terceira menor",
  };

  function funcaoDe(a) {
    if (a.menorTom) return { nome: "Depende", sigla: "?", faz: "tom menor: veja a progressão" };
    if (a.tipo === "diatonico") return FUNCAO[a.grau.idx];
    if (a.tipo === "secundario") return { nome: "Dominante", sigla: `V/${a.alvo.idx + 1}`, faz: `prepara ${a.alvo.nome}` };
    if (a.tipo === "passagem") return { nome: "Passagem", sigla: "°", faz: `leva a ${a.alvo.nome}` };
    if (a.tipo === "emprestimo") return { nome: "Cor", sigla: "MI", faz: "empréstimo do menor" };
    return { nome: "Cor", sigla: "—", faz: "depende do contexto" };
  }

  //  Explicação da função em uma ou duas frases, sem repetir o título.
  function funcaoTexto(a) {
    if (a.menorTom) return `A música está em <b>${esc(a.tom)}</b>. Os números usam o relativo maior (${esc(a.ref)}) só como régua; a função de cada acorde depende de como a progressão anda.`;
    if (a.tipo === "diatonico") return [
      "É o centro do tom: onde as frases terminam e a música “chega em casa”.",
      "Costuma vir antes do V (o famoso ii–V–I). Afasta da tônica e prepara a tensão.",
      "Divide notas com o I e pode ficar no lugar dele, com uma cor mais suave.",
      "Afasta do repouso sem criar tensão forte. O IV–I é o “amém” das cadências.",
      "Cria a tensão que pede resolução no I. Com a sétima, o pedido fica ainda mais forte.",
      "Divide notas com o I, mas é menor: um repouso mais emotivo. Também aparece no lugar do I em finais “enganosos”.",
      "Funciona como um V sem a fundamental: tensão que sobe meio tom até o I.",
    ][a.grau.idx];
    if (a.tipo === "secundario") return `Funciona como o V de <b>${esc(a.alvo.nome)}</b>: quando vem logo antes dele, a resolução soa natural. Se vier antes de outro acorde, a leitura muda.`;
    if (a.tipo === "passagem") return `Sobe meio tom até <b>${esc(a.alvo.nome)}</b>, ligando dois acordes do campo.`;
    if (a.tipo === "emprestimo") return `Traz uma nota do tom menor de ${esc(a.ref)}. Costuma cair onde a música quer um momento de emoção ou grandeza.`;
    return "Sozinho, o nome do acorde não diz a função. Os acordes de antes e de depois e a melodia é que decidem.";
  }

  //  1 a 5. Aproximação para orientar, não medida acústica.
  function tensaoDe(a) {
    let t;
    if (a.ac.dim) t = 5;
    else if (a.ac.aum) t = 4;
    else if (a.tipo === "secundario" || a.tipo === "passagem") t = 4;
    else if (a.tipo === "diatonico") t = [1, 2, 2, 2, 4, 1, 5][a.grau.idx];
    else t = 3;
    if (a.dom && t < 5) t++;
    if (a.ac.sus && t < 3) t = 3;
    if (a.meioDim) t = Math.max(t, 4);
    return Math.min(5, Math.max(1, t));
  }

  function medidor(rotulo, n, classe = "") {
    return `<div class="acd-med"><span>${rotulo}</span>
      <span class="acd-med-barra ${classe}" role="img" aria-label="${rotulo}: ${n} de 5">${
        [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span></div>`;
  }

  function nomeEmPalavras(a) {
    const NOTA = { C: "Dó", D: "Ré", E: "Mi", F: "Fá", G: "Sol", A: "Lá", B: "Si" };
    const nota = n => NOTA[n[0]] + (n.slice(1) === "#" ? " sustenido" : n.slice(1) === "b" ? " bemol" : n.slice(1));
    let s = nota(a.raizNome);
    if (a.poder) s += " (só quinta)";
    else if (a.ac.dim) s += " diminuto";
    else if (a.meioDim) s += " meio-diminuto";
    else if (a.ac.aum) s += " aumentado";
    else if (a.triade === "menor") s += " menor";
    else s += " maior";
    const ext = [];
    if (a.ac.sus) ext.push(a.tem(2) ? "2ª no lugar da terça" : "4ª no lugar da terça");
    if (a.maj7) ext.push("sétima maior");
    else if (a.m7 && !a.meioDim) ext.push("sétima");
    if (a.tem(2) && a.ctx.terca) ext.push("nona");
    if (a.tem(9) && !a.ctx.setima && !a.ac.dim) ext.push("sexta");
    if (ext.length) s += " com " + ext.join(" e ");
    if (a.baixoNome) s += `, baixo em ${nota(a.baixoNome)}`;
    return s;
  }

  const ICO_SOM = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6.5 9H3v6h3.5L11 19V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
  const ICO_VOLTAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
  const ICO_SETA = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`;

  (function estilo() {
    const st = document.createElement("style");
    st.textContent = `
    /* botão "Detalhes do acorde" no balão e no painel */
    .acd-abrir{
      display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
      margin-top:8px;padding:8px 12px;background:none;border:1px solid var(--fio);
      border-radius:999px;color:var(--gold-hi);font-family:var(--font-ui);font-size:11.5px;
      font-weight:700;letter-spacing:.02em;cursor:pointer;transition:all .15s;
    }
    .acd-abrir:hover{border-color:var(--gold);background:rgba(var(--gold-rgb),.08)}
    .claro .acd-abrir{color:var(--cifra-claro);border-color:rgba(0,0,0,.18)}
    .ac-painel .acd-abrir{width:auto;margin-top:0;padding:8px 16px;font-size:12.5px}
    @media (max-width:820px),(pointer:coarse){.ac-balao .acd-abrir{padding:10px 12px;font-size:12.5px}}

    /* ── folha ── */
    .acd-folha{
      position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;
      overflow:hidden;overscroll-behavior:contain;
      background:#0B0B0C;color:var(--paper);font-family:var(--font-ui);
      transform:translateY(103%);transition:transform .26s cubic-bezier(.22,1,.36,1),visibility .26s;
      visibility:hidden;
    }
    .acd-folha.on{transform:none;visibility:visible}

    .acd-hd{
      flex:none;display:flex;align-items:center;gap:12px;
      padding:16px 18px 14px;border-bottom:1px solid var(--fio);
      background:linear-gradient(180deg,rgba(var(--gold-rgb),.07),transparent);
    }
    .acd-hd-txt{flex:1;min-width:0}
    .acd-nome{display:block;font-family:var(--font-display);font-size:clamp(30px,7vw,40px);
      font-weight:800;line-height:1;letter-spacing:-.02em;color:var(--gold-hi);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acd-sub{display:block;margin-top:7px;font-size:13px;color:var(--dim);line-height:1.35}
    .acd-ctl{width:42px;height:42px;flex:none;display:grid;place-items:center;
      border:1px solid var(--fio);background:rgba(255,255,255,.04);border-radius:50%;
      color:var(--paper);font-size:18px;cursor:pointer;transition:all .15s}
    .acd-ctl:hover,.acd-ctl:focus-visible{border-color:var(--gold);color:var(--gold);outline:none}
    .acd-ouvir{display:inline-flex;align-items:center;gap:7px;height:42px;padding:0 16px;
      border:1px solid rgba(var(--gold-rgb),.5);border-radius:999px;background:rgba(var(--gold-rgb),.1);
      color:var(--gold-hi);font:700 13px var(--font-ui);cursor:pointer;flex:none;transition:all .15s}
    .acd-ouvir:hover,.acd-ouvir.on{background:var(--gold);color:var(--on-gold);border-color:var(--gold)}

    .acd-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;padding:18px 18px max(28px,env(safe-area-inset-bottom))}
    .acd-grid{max-width:720px;margin:0 auto;display:grid;gap:12px}

    /* resumo em três números, como os números do repertório */
    .acd-resumo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
      border:1px solid var(--line, rgba(var(--gold-rgb),.35));border-radius:14px;overflow:hidden;
      background:rgba(var(--gold-rgb),.07)}
    .acd-res{padding:14px 10px 13px;text-align:center;min-width:0;
      border-right:1px solid rgba(255,255,255,.08)}
    .acd-res:last-child{border-right:0}
    .acd-res small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.14em;
      text-transform:uppercase;color:var(--gold)}
    .acd-res strong{display:block;margin:7px 0 5px;font-family:var(--font-display);
      font-size:clamp(14px,4.3vw,22px);font-weight:800;line-height:1.1;color:var(--paper);
      word-break:normal;overflow-wrap:normal;hyphens:manual}
    .acd-res span{display:block;font-size:11px;line-height:1.35;color:var(--gray2)}

    .acd-sec{min-width:0;border:1px solid var(--fio);border-radius:14px;
      background:rgba(255,255,255,.025);padding:16px}
    .acd-sec h4{margin:0 0 12px;font:700 11px var(--font-ui);letter-spacing:.16em;
      text-transform:uppercase;color:var(--gold)}
    .acd-sec p{margin:0 0 10px;font-size:13.5px;line-height:1.65;color:var(--dim)}
    .acd-sec p:last-child{margin-bottom:0}
    .acd-sec b{color:var(--paper);font-weight:700}
    .acd-mudo{color:var(--gray2)!important;font-size:12px!important}

    /* o que significa: definição recolhida */
    .acd-def{margin-top:10px;border-top:1px solid var(--fio);padding-top:10px}
    .acd-def summary{cursor:pointer;list-style:none;font-size:12.5px;font-weight:700;color:var(--gold-hi);
      display:flex;align-items:center;gap:6px}
    .acd-def summary::-webkit-details-marker{display:none}
    .acd-def summary::before{content:"?";display:grid;place-items:center;width:18px;height:18px;
      border-radius:50%;border:1px solid rgba(var(--gold-rgb),.5);font-size:11px}
    .acd-def p{margin:9px 0 0;font-size:13px}

    /* notas: teclado + pastilhas */
    .acd-teclado{margin:2px 0 14px;padding:10px;border-radius:10px;background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.06)}
    .acd-teclado svg{display:block;width:100%;max-width:440px;height:auto;margin:0 auto}
    .acd-notas{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    .acd-nota{flex:1 1 64px;min-width:64px;max-width:120px;text-align:center;
      border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(255,255,255,.04);padding:10px 6px 9px}
    .acd-nota strong{display:block;font-family:var(--font-display);font-size:21px;font-weight:800;color:var(--gold-hi);line-height:1}
    .acd-nota b{display:block;margin-top:7px;font-size:12px;color:var(--paper)}
    /* "fundamental" tem hífen opcional (funda-mental): em pastilha
       estreita quebra no meio certo em vez de vazar para fora */
    .acd-nota small{display:block;margin-top:2px;font-size:10.5px;color:var(--gray2);line-height:1.25;
      hyphens:manual;-webkit-hyphens:manual;overflow-wrap:normal}
    .acd-nota{overflow:hidden}
    .acd-nota.raiz{border-color:rgba(var(--gold-rgb),.55);background:rgba(var(--gold-rgb),.1)}

    /* campo harmônico */
    .acd-campo{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:14px}
    .acd-campo-item{position:relative;min-width:0;text-align:center;padding:10px 2px 8px;border-radius:10px;
      border:1px solid var(--fio);background:rgba(255,255,255,.03);
      font-size:13px;font-weight:800;color:var(--paper);overflow-wrap:anywhere}
    .acd-campo-item small{display:block;margin-top:4px;font-size:10px;font-weight:600;color:var(--gray2)}
    .acd-campo-item.on{background:var(--gold);border-color:var(--gold);color:var(--on-gold)}
    .acd-campo-item.on small{color:rgba(0,0,0,.6)}
    .acd-campo-item.alvo{border-color:var(--gold);color:var(--gold-hi)}
    .acd-campo-item.alvo::after{content:"alvo";position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);
      white-space:nowrap;line-height:1.4;padding:0 5px;border-radius:999px;background:var(--gold);color:var(--on-gold);
      font-size:8.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}

    /* função + medidores */
    .acd-funcao{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;flex-wrap:wrap}
    .acd-funcao strong{font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--paper)}
    .acd-sigla{padding:3px 9px;border-radius:999px;border:1px solid rgba(var(--gold-rgb),.45);
      color:var(--gold-hi);font-size:11px;font-weight:800}
    .acd-meds{display:grid;gap:8px;margin:12px 0 4px}
    .acd-med{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--gray2)}
    .acd-med>span:first-child{width:86px;flex:none}
    .acd-med-barra{display:flex;gap:4px;flex:1;max-width:190px}
    .acd-med-barra i{height:7px;flex:1;border-radius:6px;background:rgba(255,255,255,.1)}
    .acd-med-barra i.on{background:var(--gold)}
    .acd-med-barra.tensao i.on{background:#E39B4B}

    /* alternativas: cartões tocáveis */
    .acd-alts{display:grid;gap:8px}
    .acd-alt{display:flex;align-items:center;gap:12px;padding:10px;border-radius:12px;
      border:1px solid var(--fio);background:rgba(255,255,255,.03);text-align:left;width:100%;
      color:inherit;font:inherit;cursor:pointer;transition:border-color .15s,background .15s}
    .acd-alt:hover,.acd-alt:focus-visible{border-color:rgba(var(--gold-rgb),.55);background:rgba(var(--gold-rgb),.06);outline:none}
    .acd-alt-nome{flex:none;min-width:74px;max-width:118px;padding:8px 6px;border-radius:9px;text-align:center;
      background:rgba(var(--gold-rgb),.1);border:1px solid rgba(var(--gold-rgb),.25)}
    .acd-alt-nome strong{display:block;font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--gold-hi);overflow-wrap:anywhere}
    .acd-alt-nome small{display:block;margin-top:2px;font-size:10px;color:var(--gray2)}
    .acd-alt-txt{flex:1;min-width:0;font-size:12.5px;line-height:1.5;color:var(--dim)}
    .acd-alt-acoes{display:flex;align-items:center;gap:6px;flex:none;color:var(--gray2)}
    .acd-alt-som{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;
      border:1px solid var(--fio);background:none;color:var(--gold-hi);cursor:pointer}
    .acd-alt-som:hover,.acd-alt-som.on{background:var(--gold);color:var(--on-gold);border-color:var(--gold)}

    .acd-dica{background:rgba(var(--gold-rgb),.07);border-color:rgba(var(--gold-rgb),.3)}
    .acd-dica h4::before{content:"✦ "}
    .acd-rodape{text-align:center;font-size:11.5px;color:var(--gray2);line-height:1.5;padding:4px 10px 0}

    /* ── fundo claro ── */
    .lyra-box.claro .acd-folha{background:#FAF8F4;color:#171512}
    .lyra-box.claro .acd-hd{border-color:rgba(0,0,0,.1);background:linear-gradient(180deg,rgba(var(--gold-rgb),.12),transparent)}
    .lyra-box.claro .acd-nome{color:var(--cifra-claro)}
    .lyra-box.claro .acd-sub,.lyra-box.claro .acd-sec p,.lyra-box.claro .acd-alt-txt{color:#4a4640}
    .lyra-box.claro .acd-sec b,.lyra-box.claro .acd-res strong,.lyra-box.claro .acd-funcao strong,
    .lyra-box.claro .acd-nota b,.lyra-box.claro .acd-campo-item{color:#1d1a16}
    .lyra-box.claro .acd-ctl{background:#fff;color:#302820;border-color:rgba(0,0,0,.14)}
    .lyra-box.claro .acd-sec,.lyra-box.claro .acd-alt,.lyra-box.claro .acd-campo-item,
    .lyra-box.claro .acd-nota,.lyra-box.claro .acd-teclado{background:#fff;border-color:#E6E0D6}
    .lyra-box.claro .acd-res{border-color:rgba(0,0,0,.08)}
    .lyra-box.claro .acd-nota strong,.lyra-box.claro .acd-alt-nome strong,.lyra-box.claro .acd-ouvir,
    .lyra-box.claro .acd-sigla,.lyra-box.claro .acd-def summary{color:var(--cifra-claro)}
    .lyra-box.claro .acd-campo-item.on{color:#1c150a}
    .lyra-box.claro .acd-med-barra i{background:#E6E0D6}
    .lyra-box.claro .acd-mudo,.lyra-box.claro .acd-res span,.lyra-box.claro .acd-rodape{color:#77716a!important}

    /* computador: janela central em duas colunas */
    @media(min-width:821px) and (pointer:fine){
      .acd-folha{inset:4% auto 4% 50%;width:min(820px,calc(100% - 48px));height:92%;
        max-height:920px;transform:translate(-50%,105%);border:1px solid var(--fio);
        border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.75)}
      .acd-folha.on{transform:translateX(-50%)}
      .acd-grid{max-width:none;grid-template-columns:repeat(2,minmax(0,1fr))}
      .acd-largo{grid-column:1/-1}
      .acd-hd{padding:20px 24px 16px}
      .acd-scroll{padding:20px 24px 28px}
    }
    @media(max-width:820px),(pointer:coarse){
      .acd-hd{padding:calc(12px + env(safe-area-inset-top)) 14px 12px}
      .acd-scroll{padding:14px 12px calc(24px + env(safe-area-inset-bottom))}
      .acd-sec{padding:14px}
      .acd-campo{gap:4px}
      .acd-campo-item{font-size:11px;padding:9px 1px 7px}
    }
    /* celular estreito: o resumo vira três linhas (rótulo · valor · nota),
       senão "Subdominante" e "Secundário" não cabem lado a lado */
    @media(max-width:430px){
      .acd-resumo{grid-template-columns:1fr}
      .acd-res{display:grid;grid-template-columns:62px auto 1fr;align-items:baseline;
        column-gap:10px;text-align:left;padding:11px 14px;border-right:0;
        border-bottom:1px solid rgba(255,255,255,.08)}
      .acd-res:last-child{border-bottom:0}
      .acd-res strong{margin:0;font-size:17px;white-space:nowrap}
      .acd-res span{text-align:right;font-size:11px}
      .lyra-box.claro .acd-res{border-color:rgba(0,0,0,.08)}
    }
    @media(max-width:400px){
      .acd-ouvir span{display:none}
      .acd-ouvir{padding:0;width:42px;justify-content:center}
      .acd-res strong{font-size:18px}
      .acd-alt-acoes .acd-alt-seta{display:none}
    }
    @media(prefers-reduced-motion:reduce){.acd-folha{transition:none}}
    `;
    document.head.appendChild(st);
  })();

  function folha() {
    let f = document.getElementById("acdFolha");
    if (f) return f;
    const box = document.getElementById("lyraBox");
    if (!box) return null;
    f = document.createElement("div");
    f.id = "acdFolha";
    f.className = "acd-folha";
    f.setAttribute("role", "dialog");
    f.setAttribute("aria-modal", "true");
    f.setAttribute("aria-label", "Detalhes do acorde");
    box.appendChild(f);
    f.addEventListener("click", e => {
      //  O clique não sai da folha: ao trocar de acorde o conteúdo é
      //  redesenhado, e o "clicou fora" do documento fecharia a folha.
      e.stopPropagation();
      const som = e.target.closest("[data-acd-som]");
      if (som) {
        e.stopPropagation();
        if (typeof acOuvir === "function") acOuvir(som.dataset.acdSom, som);
        return;
      }
      const alt = e.target.closest("[data-acd-abrir]");
      if (alt) { historico.push(nomeAberto); abrir(alt.dataset.acdAbrir, true); return; }
      if (e.target.closest(".acd-voltar")) {
        const anterior = historico.pop();
        anterior ? abrir(anterior, true) : fechar();
        return;
      }
      if (e.target.closest(".acd-x")) fechar();
    });
    return f;
  }

  function cabecalho(nome, sub) {
    const voltar = historico.length
      ? `<button type="button" class="acd-ctl acd-voltar" aria-label="Voltar ao acorde anterior">${ICO_VOLTAR}</button>`
      : "";
    return `<div class="acd-hd">${voltar}
      <div class="acd-hd-txt"><span class="acd-nome">${esc(nome)}</span><span class="acd-sub">${sub}</span></div>
      <button type="button" class="acd-ouvir" data-acd-som="${esc(nome)}" aria-label="Ouvir ${esc(nome)}">${ICO_SOM}<span>Ouvir</span></button>
      <button type="button" class="acd-ctl acd-x" aria-label="Fechar detalhes">&#10005;</button></div>`;
  }

  function abrir(nome, navegando = false) {
    const f = folha();
    if (!f || !nome) return;
    if (!navegando) historico.length = 0;
    const tom = typeof lyraAtual !== "undefined" && lyraAtual && lyraAtual.tom;
    const a = tom ? analisar(nome, tom) : null;
    nomeAberto = nome;

    if (!a) {
      f.innerHTML = cabecalho(nome, "Acorde") + `<div class="acd-scroll"><div class="acd-grid">
        <section class="acd-sec acd-largo"><p>Não consegui analisar este acorde no tom atual.</p></section>
      </div></div>`;
    } else {
      const grauApp = T.grauDoAcorde(nome, tom) || a.grauTxt;
      const romanoTxt = romano(a.grau, a.ac.dim || a.meioDim ? "dim" : a.triade === "menor" ? "menor" : a.triade);
      const fun = funcaoDe(a);
      const tipo = TIPO[a.tipo] || TIPO.cromatico;
      const tensao = tensaoDe(a);

      // notas: teclado + pastilhas
      const ac = acLer(nome);
      const teclado = ac && typeof acSvgTeclado === "function" ? acSvgTeclado(ac) : "";
      const notas = a.notas.map(n => {
        const rot = n.rot === "T" ? "1" : n.rot;
        return `<div class="acd-nota${n.rot === "T" ? " raiz" : ""}"><strong>${esc(n.nota)}</strong>
          <b>${esc(rot)}</b><small>${esc(NOME_INTERVALO[n.rot] || n.rot)}</small></div>`;
      }).join("");
      let baixo = "";
      if (a.baixoNome) {
        const s = (lyraPc(a.baixoNome) - a.raizPc + 12) % 12;
        const nomeI = { 0: "a fundamental", 3: "a terça", 4: "a terça", 7: "a quinta", 10: "a sétima", 11: "a sétima", 2: "a nona" }[s];
        baixo = `<p><b>Baixo em ${esc(a.baixoNome)}</b>${nomeI ? ` (${nomeI} do acorde)` : ""}: é uma inversão. As notas são as mesmas; só muda quem fica embaixo, e o baixo anda mais suave.</p>`;
      }

      // campo harmônico
      const sufixos = ["", "m", "m", "", "", "m", "°"];
      const campo = sufixos.map((s, i) => {
        const nota = notaDoGrau(a.ref, i) + s;
        const cls = a.tipo === "diatonico" && a.grau.idx === i ? " on"
          : a.alvo && a.alvo.idx === i ? " alvo" : "";
        const rom = NATURAL[i] === "menor" ? ROMANOS[i].toLowerCase() : i === 6 ? "vii°" : ROMANOS[i];
        return `<span class="acd-campo-item${cls}">${esc(nota)}<small>${rom}</small></span>`;
      }).join("");
      const campoTxt = a.tipo === "diatonico"
        ? `<b>${esc(nome)}</b> é o ${a.grau.idx + 1}º grau (${NOME_GRAU[a.grau.idx]}) do campo de ${esc(a.ref)}.`
        : a.alvo
          ? `<b>${esc(nome)}</b> não está no campo de ${esc(a.ref)}; ele aponta para <b>${esc(a.alvo.nome)}</b>, marcado como alvo.`
          : `<b>${esc(nome)}</b> não está no campo de ${esc(a.ref)}.`;
      const menorTxt = a.menorTom
        ? `<p class="acd-mudo">Tom menor: a régua de números usa o relativo maior, ${esc(a.ref)}.</p>` : "";

      // como soa
      const carater = textoCarater(a).replace(/<\/?p>/g, "");

      // alternativas
      const alts = substituicoes(a);
      const altsHTML = alts.length
        ? `<div class="acd-alts">${alts.map(i => `
            <div class="acd-alt" role="button" tabindex="0" data-acd-abrir="${esc(i.nome)}" aria-label="Ver detalhes de ${esc(i.nome)}">
              <span class="acd-alt-nome"><strong>${esc(i.nome)}</strong>${i.grau ? `<small>${esc(i.grau)}</small>` : ""}</span>
              <span class="acd-alt-txt">${esc(i.motivo)}</span>
              <span class="acd-alt-acoes">
                <button type="button" class="acd-alt-som" data-acd-som="${esc(i.nome)}" aria-label="Ouvir ${esc(i.nome)}">${ICO_SOM}</button>
                <span class="acd-alt-seta">${ICO_SETA}</span>
              </span>
            </div>`).join("")}</div>`
        : `<p class="acd-mudo">Sem troca direta que valha a pena sugerir.</p>`;

      f.innerHTML = cabecalho(nome, `${esc(nomeEmPalavras(a))}`) + `
        <div class="acd-scroll"><div class="acd-grid">

          <div class="acd-resumo acd-largo">
            <div class="acd-res"><small>Grau</small><strong>${esc(romanoTxt)}</strong><span>${esc(grauApp)} no tom de ${esc(tom)}</span></div>
            <div class="acd-res"><small>Função</small><strong>${esc(fun.nome)}</strong><span>${esc(fun.faz)}</span></div>
            <div class="acd-res"><small>No tom</small><strong>${esc(tipo.rotulo)}</strong><span>${esc(tipo.curto)}</span></div>
          </div>

          <section class="acd-sec acd-largo"><h4>Notas do acorde</h4>
            ${teclado ? `<div class="acd-teclado">${teclado}</div>` : ""}
            <div class="acd-notas">${notas}</div>
            <p>${esc(qualidadeFrase(a))}.</p>${baixo}
          </section>

          <section class="acd-sec acd-largo"><h4>No campo harmônico de ${esc(a.ref)}</h4>
            <div class="acd-campo">${campo}</div>
            <p>${campoTxt}</p>${menorTxt}
            <details class="acd-def"><summary>O que é “${esc(tipo.rotulo.toLowerCase())}”?</summary><p>${esc(tipo.def)}</p></details>
          </section>

          <section class="acd-sec"><h4>Função</h4>
            <div class="acd-funcao"><strong>${esc(fun.nome)}</strong><span class="acd-sigla">${esc(fun.sigla)}</span></div>
            <p>${funcaoTexto(a)}</p>
            <div class="acd-meds">${medidor("Tensão", tensao, "tensao")}${medidor("Repouso", 6 - tensao)}</div>
          </section>

          <section class="acd-sec"><h4>Como soa</h4><p>${carater}</p></section>

          <section class="acd-sec acd-largo"><h4>Para experimentar</h4>${altsHTML}</section>

          <section class="acd-sec acd-dica acd-largo"><h4>Dica</h4>${textoDica(a)}</section>

          <p class="acd-rodape acd-largo">A análise olha só o acorde e o tom. A melodia e os acordes vizinhos podem mudar a leitura.</p>
        </div></div>`;
    }
    const scroller = f.querySelector(".acd-scroll");
    if (scroller) scroller.scrollTop = 0;
    //  um painel por vez: o balão recolhe e o painel de diagrama fica por baixo
    if (typeof acEsconderBalao === "function") acEsconderBalao();
    f.classList.add("on");
    f.querySelector(".acd-x")?.focus({ preventScroll: true });
  }

  function fechar() {
    const f = document.getElementById("acdFolha");
    if (f) f.classList.remove("on");
    nomeAberto = null;
    historico.length = 0;
  }

  //  Alternativas também abrem pelo teclado (Enter / espaço).
  document.addEventListener("keydown", e => {
    const alt = e.target.closest && e.target.closest(".acd-alt");
    if (!alt || (e.key !== "Enter" && e.key !== " ")) return;
    if (e.target.closest(".acd-alt-som")) return;
    e.preventDefault();
    historico.push(nomeAberto);
    abrir(alt.dataset.acdAbrir, true);
  });

  // ---------- Botões no balão e no painel ----------

  function botao(nome) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "acd-abrir";
    b.textContent = "Detalhes do acorde";
    b.setAttribute("aria-label", "Ver detalhes de teoria do acorde " + nome);
    b.addEventListener("click", e => { e.stopPropagation(); abrir(nome); });
    return b;
  }

  const pintarBalaoOriginal = acPintarBalao;
  acPintarBalao = function (...args) {
    const r = pintarBalaoOriginal.apply(this, args);
    const b = document.getElementById("acBalao");
    if (b && typeof acBalaoAc !== "undefined" && acBalaoAc && !b.querySelector(".acd-abrir")) {
      b.appendChild(botao(acBalaoAc));
    }
    return r;
  };

  const desenharOriginal = acDesenhar;
  acDesenhar = function (...args) {
    const r = desenharOriginal.apply(this, args);
    const alvo = document.getElementById("acConteudo");
    if (alvo && typeof acAtual !== "undefined" && acAtual && !alvo.querySelector(".acd-abrir")) {
      (alvo.querySelector(".ac-acoes") || alvo).appendChild(botao(acAtual));
    }
    return r;
  };

  // Tocar fora da folha (ou em outro acorde) fecha a folha.
  document.addEventListener("click", e => {
    if (!nomeAberto) return;
    if (e.target.closest(".acd-folha, .acd-abrir")) return;
    fechar();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nomeAberto) fechar();
  });

  // Troca de música, de tom ou saída do leitor: a folha fecha junto.
  if (typeof lyraRenderConteudo === "function") {
    const renderOriginal = lyraRenderConteudo;
    lyraRenderConteudo = async function (...a) {
      const r = await renderOriginal.apply(this, a);
      fechar();
      return r;
    };
  }
  if (typeof lyraFecharLeitor === "function") {
    const fecharLeitorOriginal = lyraFecharLeitor;
    lyraFecharLeitor = function (...a) {
      fechar();
      return fecharLeitorOriginal.apply(this, a);
    };
  }

  // Útil para testes; não dá acesso a nenhum dado do banco ou do usuário.
  window.tomLouvoresDetalhes = Object.freeze({ analisar, substituicoes, abrir, fechar });
})();
