// ============================================================
//  TOM LOUVORES — detalhes do acorde (teoria no tom da música)
//  Carregar DEPOIS de acordes.js e graus.js.
//
//  Ao tocar num acorde da cifra, o balão (celular e hover no
//  computador) e o painel (computador) ganham um botão
//  "Detalhes". Ele abre uma folha por cima com:
//    1. contexto harmônico do acorde no tom
//    2. como o acorde é formado
//    3. função harmônica
//    4. caráter sonoro
//    5. substituições possíveis
//    6. dica rápida
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
  // Funções são tendências, não propriedades absolutas do acorde isolado.
  const FUNCAO_GRAU = ["Tônica (provável)", "Predominante (comum)", "Prolongamento de tônica (possível)", "Predominante (comum)", "Dominante (comum)", "Tônica relativa (possível)", "Dominante (possível)"];
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

  function textoContexto(a) {
    const tomTxt = a.menorTom
      ? `${esc(a.tom)} (relativo de ${esc(a.ref)}, que vale como grau 1)`
      : esc(a.tom);
    const romanoTxt = romano(a.grau, a.ac.dim || a.meioDim ? "dim" : a.triade === "menor" ? "menor" : a.triade);
    let linha1 = `<b>${esc(T.grauDoAcorde(a.nome, a.tom) || a.grauTxt)}</b> (${romanoTxt}) no tom de ${tomTxt}.`;

    let linha2;
    switch (a.tipo) {
      case "diatonico":
        linha2 = `Acorde <b>diatônico</b>: está dentro do campo harmônico de ${esc(a.ref)}. Sua fundamental está no ${a.grau.idx + 1}º grau (${NOME_GRAU[a.grau.idx]}).`;
        break;
      case "secundario":
        linha2 = `<b>Dominante secundário</b>: fica fora do campo, e pode produzir a sensação de V apontando ao ${a.alvo.idx + 1}º grau (${esc(a.alvo.nome)}).`;
        break;
      case "passagem":
        linha2 = `<b>Diminuto de passagem</b>: pode subir meio tom até ${esc(a.alvo.nome)} (${a.alvo.idx + 1}º grau), ligando dois acordes do campo.`;
        break;
      case "emprestimo":
        linha2 = `<b>Empréstimo modal</b>: não existe no campo de ${esc(a.ref)} maior, pode vir do ${a.grau.alt < 0 && a.grau.idx === 6
          ? "modo mixolídio ou do tom menor paralelo" : "tom menor paralelo (" + esc(a.ref) + "m)"}.`;
        break;
      default:
        linha2 = `<b>Fora do campo</b>: uma cor cromática. Vale ouvir para onde ele resolve.`;
    }

    // campo harmônico do tom de referência
    const sufCampo = ["", "m", "m", "", "", "m", "°"];
    const campo = sufCampo.map((s, i) => {
      const n = esc(notaDoGrau(a.ref, i) + s);
      return a.tipo === "diatonico" && i === a.grau.idx ? `<b class="acd-hl">${n}</b>` : n;
    }).join(" · ");
    const linha3 = `<span class="acd-mudo">Campo de ${esc(a.ref)}:</span> ${campo}`;

    return `<p>${linha1}</p><p>${linha2}</p><p>${linha3}</p>`;
  }

  function textoFormacao(a) {
    const notas = a.notas.map(n => esc(n.nota)).join(" – ");
    const formula = a.notas.map(n => n.rot === "T" ? "1" : esc(n.rot)).join(" · ");
    let baixo = "";
    if (a.baixoNome) {
      const s = (lyraPc(a.baixoNome) - a.raizPc + 12) % 12;
      const nomeI = { 0: "fundamental", 3: "3ª menor", 4: "3ª maior", 7: "quinta", 10: "7ª menor", 11: "7ª maior", 2: "9ª" }[s];
      const gb = T.grauDaNota(a.baixoNome, a.tom);
      baixo = `<p><b>Baixo:</b> ${esc(a.baixoNome)}${nomeI ? ` (a ${nomeI} do acorde)` : ""}${gb ? `, grau ${esc(gb)} do tom` : ""}. É uma inversão: as notas são as mesmas, só muda quem toca por baixo.</p>`;
    }
    return `<p><b>${notas}</b></p><p>Fórmula: ${formula}</p><p>${esc(qualidadeFrase(a))}.</p>${baixo}`;
  }

  function rotuloFuncao(a) {
    if (a.menorTom) return "Depende da progressão";
    if (a.tipo === "diatonico") return FUNCAO_GRAU[a.grau.idx];
    if (a.tipo === "secundario") return "Dominante secundário possível";
    if (a.tipo === "passagem") return "Passagem cromática possível";
    if (a.tipo === "emprestimo") return "Função a confirmar";
    return "Função a confirmar";
  }

  function textoFuncao(a) {
    const g = a.grau.idx;
    if (a.menorTom) return `<p>A música está em <b>${esc(a.tom)}</b>. Os graus exibidos usam o relativo maior (${esc(a.ref)}) como convenção de numeração, mas <b>isso não muda o centro tonal menor</b>. Para definir tônica, predominante ou dominante com segurança, precisamos examinar a progressão e as alterações da escala menor usadas na música.</p>`;
    if (a.tipo === "diatonico") {
      const exemplos = [
        "O I costuma representar chegada e repouso, especialmente em cadências conclusivas.",
        "O ii frequentemente prepara V ou V7; o papel depende do encadeamento.",
        "O iii pode prolongar a região de tônica ou fazer conexão entre outros acordes.",
        "O IV costuma atuar como predominante e também participa da cadência plagal IV–I.",
        "O V frequentemente encaminha para I; a sétima de dominante reforça essa direção.",
        "O vi pode compartilhar a região de tônica, mas também iniciar progressões ou integrar cadências deceptivas.",
        "O vii°/viiø frequentemente atua como acorde de sensível em direção ao I, dependendo da condução das vozes."
      ];
      return `<p><b>${esc(FUNCAO_GRAU[g])}.</b> ${exemplos[g]} <span class="acd-mudo">Função sugerida: depende dos acordes vizinhos, da melodia e do centro tonal percebido.</span></p>`;
    }
    if (a.tipo === "secundario") return `<p><b>Possível V/${a.alvo.idx + 1}.</b> Este acorde pode atuar como dominante secundário de ${esc(a.alvo.nome)}, <b>se a progressão confirmar essa resolução</b>. Fora desse contexto, pode ter outra função.</p>`;
    if (a.tipo === "passagem") return `<p><b>Possível diminuto de aproximação.</b> Pode conduzir cromaticamente até ${esc(a.alvo.nome)}, mas só é correto chamá-lo de passagem quando a progressão mostrar esse movimento.</p>`;
    if (a.tipo === "emprestimo") return `<p><b>Possível empréstimo modal.</b> O acorde pode ter sido tomado de uma escala ou modo paralelo. A origem exata e sua função dependem da progressão; não são demonstradas apenas pela cifra.</p>`;
    return `<p><b>Função não determinada.</b> O nome do acorde, isoladamente, não permite identificar uma única função harmônica. Confira os acordes anterior e seguinte e a melodia.</p>`;
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

  function textoSubstituicoes(a) {
    const lista = substituicoes(a);
    if (!lista.length) return `<p class="acd-mudo">Sem substituição direta que valha a pena sugerir.</p>`;
    return `<ul class="acd-lista">${lista.map(i =>
      `<li><span class="acd-chip">${esc(i.nome)}${i.grau ? `<i>${esc(i.grau)}</i>` : ""}</span>${esc(i.motivo)}</li>`
    ).join("")}</ul>`;
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

  let nomeAberto = null;

  (function estilo() {
    const st = document.createElement("style");
    st.textContent = `
    .acd-abrir{
      display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
      margin-top:8px;padding:7px 10px;background:none;border:1px solid var(--gray3);
      border-radius:8px;color:#d8d8d8;font-family:var(--font-ui);font-size:11.5px;
      font-weight:700;cursor:pointer;transition:all .15s;
    }
    .acd-abrir:hover{border-color:var(--cifra);color:var(--cifra)}
    .claro .acd-abrir{color:#3a3a3a;border-color:rgba(0,0,0,.2)}
    .claro .acd-abrir:hover{border-color:var(--cifra-claro);color:var(--cifra-claro)}
    .ac-painel .acd-abrir{width:auto;margin-top:0;padding:8px 16px;font-size:12.5px}
    @media (max-width:820px),(pointer:coarse){.ac-balao .acd-abrir{padding:9px 10px;font-size:12.5px}}

    /* Design nativo do Tom Louvores: carvão, dourado e linhas discretas. */
    .acd-folha{
      position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;
      max-height:none;padding:0;overflow:hidden;overscroll-behavior:contain;
      background:#0d0d0e;color:#f4f2ed;font-family:var(--font-ui);
      transform:translateY(103%);transition:transform .24s ease,visibility .24s;
      visibility:hidden;
    }
    .acd-folha.on{transform:none;visibility:visible}
    .acd-hd{
      width:100%;max-width:none!important;flex:none;display:flex;align-items:center;
      gap:13px;padding:18px 20px 14px;border-bottom:1px solid var(--fio);
      background:#0d0d0e;
    }
    .acd-hd-main{flex:1;min-width:0}
    .acd-voltar{display:flex;align-items:center;width:max-content;gap:5px;padding:0;
      margin-bottom:8px;border:0;background:none;color:var(--gold);
      font:600 12px var(--font-ui);cursor:pointer}
    .acd-nome{display:block;color:var(--paper);font-size:clamp(24px,4.5vw,31px);font-weight:800;line-height:1.15}
    .acd-grau{display:block;color:#9e9b95;font-size:12px;line-height:1.5;margin-top:4px}
    .acd-x{width:42px;height:42px;flex:none;border:1px solid var(--fio);
      background:#19191a;border-radius:50%;color:var(--paper);font-size:20px;cursor:pointer}
    .acd-x:hover,.acd-x:focus-visible{border-color:var(--gold);color:var(--gold)}
    .acd-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;padding:20px 20px max(28px,env(safe-area-inset-bottom))}
    .acd-scroll-inner{max-width:710px;margin:0 auto;display:grid;gap:12px}
    .acd-lead{display:flex;justify-content:space-between;align-items:center;gap:12px;
      flex-wrap:wrap;padding:2px 2px 6px}
    .acd-tags{display:flex;gap:7px;flex-wrap:wrap}
    .acd-tag,.acd-degree{display:inline-flex;align-items:center;padding:7px 11px;
      border:1px solid rgba(var(--gold-rgb),.25);background:rgba(var(--gold-rgb),.09);
      border-radius:999px;font-size:11px;font-weight:800;color:var(--gold-hi)}
    .acd-degree{color:#d2c7ad;border-color:var(--fio);background:rgba(255,255,255,.045)}
    .acd-tonalidade{font-size:10px;letter-spacing:.06em;color:#928d84;text-transform:uppercase}
    .acd-tonalidade strong{display:block;margin-top:3px;color:#f4f2ed;font-size:14px;letter-spacing:0;text-transform:none}
    .acd-sec{min-width:0;border:1px solid var(--fio);border-radius:13px;
      background:#181819;padding:16px 17px}
    .acd-sec h4{margin:0 0 13px;font-family:var(--font-ui);font-size:11px;
      font-weight:800;letter-spacing:.065em;text-transform:uppercase;color:var(--gold)}
    .acd-sec p{margin:0 0 9px;font-family:var(--font-ui);font-size:12.5px;
      line-height:1.65;color:#d7d5d1}
    .acd-sec p:last-child{margin-bottom:0}
    .acd-sec b{color:#f5f0e7}
    .acd-mudo{color:#a49f96}
    .acd-hl{color:var(--gold)!important;font-weight:800}
    .acd-notas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:7px 0 13px}
    .acd-nota{min-width:0;border:1px solid rgba(255,255,255,.065);border-radius:9px;
      background:#222122;text-align:center;padding:12px 4px 10px}
    .acd-nota .acd-intervalo{display:block;font-size:14px;font-weight:800;color:#eae5db}
    .acd-nota small{display:block;font-size:10px;color:#918c84;margin-top:4px;line-height:1.3}
    .acd-nota strong{display:block;font-size:19px;color:var(--gold-hi);margin-top:9px;font-weight:800}
    .acd-campo{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:4px 0 11px}
    .acd-campo-item{min-width:0;display:grid;place-content:center;text-align:center;
      border:1px solid var(--fio);border-radius:9px;background:#222122;
      padding:10px 2px;font-size:12px;font-weight:800;overflow-wrap:anywhere;color:#eee9df}
    .acd-campo-item small{display:block;margin-top:5px;font-size:10px;font-weight:600;color:#96918b}
    .acd-campo-item.on{color:#15120b;background:var(--gold);border-color:var(--gold)}
    .acd-campo-item.on small{color:#4c3914}
    .acd-context{padding-top:11px;border-top:1px solid var(--fio)}
    .acd-context p{font-size:12px;color:#b9b5ae}
    .acd-funcao-box{display:flex;align-items:center;gap:9px;margin-bottom:11px;
      color:var(--gold-hi);font-size:13px;font-weight:800}
    .acd-funcao-box::before{content:'◉';font-size:17px}
    .acd-character{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;
      margin-bottom:10px;border-radius:8px;background:rgba(var(--gold-rgb),.08);
      color:var(--gold-hi);font-size:12px;font-weight:800}
    .acd-meters{display:grid;gap:6px;margin-top:14px}
    .acd-meter-row{display:flex;align-items:center;gap:9px;font-size:11px;color:#aca8a0}
    .acd-meter-row>span{min-width:76px}
    .acd-meter{display:flex;gap:4px;flex:1;max-width:145px}
    .acd-meter i{height:6px;flex:1;border-radius:8px;background:#35332f}
    .acd-meter i.on{background:var(--gold)}
    .acd-meter.tensao i.on{background:#ba8b45}
    .acd-lista{list-style:none;margin:0;padding:0}
    .acd-lista li{display:flex;align-items:center;gap:12px;padding:9px 0;
      border-bottom:1px solid var(--fio);font-size:12px;line-height:1.5;color:#d7d3cb}
    .acd-lista li:last-child{border-bottom:0;padding-bottom:0}
    .acd-chip{display:inline-flex;flex:none;flex-direction:column;justify-content:center;
      min-width:75px;max-width:112px;padding:8px 10px;border-radius:9px;
      border:1px solid rgba(var(--gold-rgb),.2);background:rgba(var(--gold-rgb),.06);
      color:var(--gold-hi);text-align:center;font-size:14px;font-weight:800}
    .acd-chip i{display:block;font-style:normal;font-size:10px;font-weight:600;color:#aaa49b}
    .acd-tip{background:rgba(var(--gold-rgb),.055);border-color:rgba(var(--gold-rgb),.2)}
    .acd-tip h4::before{content:'✦';margin-right:8px}
    /* Modo claro continua quente/neutro, sem azul, roxo ou verde. */
    .lyra-box.claro .acd-folha,.lyra-box.claro .acd-hd{background:#faf9f7;color:#171512}
    .lyra-box.claro .acd-hd{border-color:rgba(0,0,0,.12)}
    .lyra-box.claro .acd-nome,.lyra-box.claro .acd-tonalidade strong{color:#171512}
    .lyra-box.claro .acd-grau,.lyra-box.claro .acd-tonalidade{color:#77716a}
    .lyra-box.claro .acd-x{background:#efebe5;color:#302820;border-color:rgba(0,0,0,.13)}
    .lyra-box.claro .acd-sec{background:#fffdf9;border-color:#e4dfd5}
    .lyra-box.claro .acd-sec p,.lyra-box.claro .acd-lista li{color:#4a4640}
    .lyra-box.claro .acd-sec b{color:#25211c}
    .lyra-box.claro .acd-tag{color:#8d6009;background:#fff5da}
    .lyra-box.claro .acd-degree{color:#706558;background:#f4eee4;border-color:#e4dfd5}
    .lyra-box.claro .acd-nota,.lyra-box.claro .acd-campo-item{background:#f5f1eb;border-color:#e6e0d8;color:#332c24}
    .lyra-box.claro .acd-nota .acd-intervalo{color:#302b25}
    .lyra-box.claro .acd-nota small,.lyra-box.claro .acd-campo-item small{color:#797169}
    .lyra-box.claro .acd-nota strong,.lyra-box.claro .acd-chip,.lyra-box.claro .acd-funcao-box,
    .lyra-box.claro .acd-character{color:var(--cifra-claro)}
    .lyra-box.claro .acd-campo-item.on{background:var(--gold);border-color:var(--gold);color:#1c150a}
    .lyra-box.claro .acd-campo-item.on small{color:#493711}
    .lyra-box.claro .acd-context,.lyra-box.claro .acd-lista li{border-color:#ebe4da}
    .lyra-box.claro .acd-chip{background:#fff5e1;border-color:#edddb5}
    .lyra-box.claro .acd-tip,.lyra-box.claro .acd-character{background:#fff8e9}
    .lyra-box.claro .acd-meter i{background:#e4ded6}
    .lyra-box.claro .acd-meter i.on{background:#c68d1d}
    @media(min-width:821px) and (pointer:fine){
      .acd-folha{inset:5% auto 5% 50%;width:min(760px,calc(100% - 48px));height:90%;
        max-height:880px;transform:translate(-50%,105%);border:1px solid var(--fio);
        border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.72)}
      .acd-folha.on{transform:translateX(-50%)}
      .acd-scroll-inner{grid-template-columns:repeat(2,minmax(0,1fr))}
      .acd-wide{grid-column:1/-1}
    }
    @media(max-width:820px),(pointer:coarse){
      .acd-folha{inset:0;width:100%;height:100%;border-radius:0}
      .acd-hd{padding:calc(12px + env(safe-area-inset-top)) 16px 13px}
      .acd-scroll{padding:14px 12px calc(24px + env(safe-area-inset-bottom))}
      .acd-sec{padding:15px}
      .acd-campo{gap:4px}
      .acd-campo-item{font-size:10px;padding:10px 1px}
      .acd-campo-item small{font-size:9px}
      .acd-notas{gap:5px}
      .acd-nota{padding:10px 2px}
      .acd-nota strong{font-size:17px}
    }
    @media(max-width:350px){.acd-notas{grid-template-columns:repeat(2,minmax(0,1fr))}}
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
    f.setAttribute("aria-label", "Detalhes do acorde");
    box.appendChild(f);
    f.addEventListener("click", e => {
      if (e.target.closest(".acd-x, .acd-voltar")) fechar();
    });
    return f;
  }

  function abrir(nome) {
    const f = folha();
    if (!f || !nome) return;
    const tom = typeof lyraAtual !== "undefined" && lyraAtual && lyraAtual.tom;
    const a = tom ? analisar(nome, tom) : null;
    nomeAberto = nome;

    const hd = (detail,subtitle="") => `<div class="acd-hd"><div class="acd-hd-main">
      <button type="button" class="acd-voltar">‹ Voltar</button>
      <span class="acd-nome">${esc(nome)}</span><span class="acd-grau">${subtitle || detail}</span>
      </div><button type="button" class="acd-x" aria-label="Fechar detalhes">&#10005;</button></div>`;
    if (!a) {
      f.innerHTML = hd("") + `<div class="acd-scroll"><div class="acd-scroll-inner">
        <section class="acd-sec"><p>Não consegui analisar este acorde no tom atual.</p></section>
      </div></div>`;
    } else {
      const grauApp = T.grauDoAcorde(nome, tom) || a.grauTxt;
      const familia = a.tipo === "diatonico" ? "Pertence ao campo" : a.tipo === "secundario" ? "Possível dominante secundário"
        : a.tipo === "emprestimo" ? "Possível empréstimo modal" : a.tipo === "passagem" ? "Possível diminuto de passagem" : "Fora do campo";
      
      const sufixos = ["", "m", "m", "", "", "m", "dim"];
      const campo = sufixos.map((s,i) => {
        const nota = notaDoGrau(a.ref,i) + s;
        const ativo = a.tipo === "diatonico" && a.grau.idx === i;
        const roman = NATURAL[i] === "menor" ? ROMANOS[i].toLowerCase() : i === 6 ? "vii°" : ROMANOS[i];
        return `<span class="acd-campo-item${ativo ? " on" : ""}">${esc(nota)}<small>${roman}</small></span>`;
      }).join("");
      const nomesIntervalos = {"T":"Fundamental","3m":"Terça menor","3M":"Terça maior",
        "5J":"Quinta justa","7m":"Sétima menor","7M":"Sétima maior","5ª dim":"Quinta diminuta",
        "5ª aum":"Quinta aumentada","9ª":"Nona","2ª":"Segunda","4ª":"Quarta","6ª":"Sexta"};
      const notas = a.notas.map(n => `<div class="acd-nota"><span class="acd-intervalo">${esc(n.rot === "T" ? "1" : n.rot)}</span>
        <small>${esc(nomesIntervalos[n.rot] || n.rot)}</small><strong>${esc(n.nota)}</strong></div>`).join("");
      const context = textoContexto(a).replace(/<p><span class="acd-mudo">Campo de [\s\S]*?<\/p>/, "");
      const caracter = a.ac.dim ? "Diminuto · cor tensa" : a.ac.sus ? "Suspenso · sem terça" :
        a.triade === "menor" ? "Menor · sonoridade introspectiva" : "Maior · sonoridade aberta";
      f.innerHTML = hd(`Grau ${esc(grauApp)} · ${esc(tom)}`,esc(qualidadeFrase(a))) + `
        <div class="acd-scroll"><div class="acd-scroll-inner">
          <div class="acd-lead acd-wide"><div class="acd-tags"><span class="acd-tag">${esc(familia)}</span>
            <span class="acd-degree">Grau ${esc(grauApp)} · referência ${esc(a.ref)}</span></div>
            <span class="acd-tonalidade">TONALIDADE ATUAL<strong>${esc(tom)}</strong></span></div>
          <section class="acd-sec acd-wide"><h4>Como o acorde é formado</h4>
            <div class="acd-notas">${notas}</div><p>${esc(qualidadeFrase(a))}.</p></section>
          <section class="acd-sec acd-wide"><h4>No campo harmônico de ${esc(a.ref)}</h4>
            <div class="acd-campo">${campo}</div><div class="acd-context">${context}</div></section>
          <section class="acd-sec"><h4>Função harmônica provável</h4>
            <div class="acd-funcao-box">${esc(rotuloFuncao(a))}</div>
            ${textoFuncao(a)}</section>
          <section class="acd-sec"><h4>Caráter sonoro</h4>
            <div class="acd-character">${esc(caracter)}</div>${textoCarater(a)}
            <p class="acd-mudo">O caráter sonoro é descritivo; tensão e estabilidade dependem do contexto musical.</p></section>
          <section class="acd-sec acd-wide"><h4>Alternativas para experimentar</h4><p class="acd-mudo">Não são trocas automáticas: confira a melodia, o baixo e a progressão antes de substituir.</p>${textoSubstituicoes(a)}</section>
          <section class="acd-sec acd-tip acd-wide"><h4>Dica rápida</h4>${textoDica(a)}</section>
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
  }

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
