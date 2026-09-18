// ============================================================
//  TOM LOUVORES — menu de opções do leitor
//  Carregue DEPOIS do acordes.js.
//
//  A barra do leitor foi ficando cheia: cifra/letra, tom, tema,
//  quebra de linha, tamanho, instrumento, rolagem. Aqui esses
//  controles saem da barra e viram um menu.
//
//    · no computador  → painel que entra pela esquerda, em
//                       caixas, com o controle na mesma linha
//    · no celular     → folha que sobe de baixo, do mesmo canto
//                       onde fica a barra flutuante. Cada linha
//                       vira item de lista: ícone num quadrado,
//                       nome e, logo abaixo, o que aquilo faz ou
//                       em que pé está. Seções separadas por fio,
//                       sem caixa.
//
//  Os controles não são recriados: os próprios elementos do
//  lyra.js são movidos para dentro do menu, então tudo que já
//  funcionava continua ligado nos mesmos eventos.
// ============================================================

//  Celular é decidido por largura OU por toque. Só por toque
//  falhava no modo responsivo do navegador, onde o ponteiro
//  continua fino e a barra flutuante nunca aparecia.
const OP_MQ = window.matchMedia("(max-width: 820px), (pointer: coarse)");
const opEhCelular = () => OP_MQ.matches;

//  Painel de edição das cifras, fora deste site. Fica à mão de
//  todos: ele tem senha própria, e o portão é do lado dele.
const LYRA_ADMIN_URL = "https://lyra-music-database.vercel.app/admin";

(function opEstilo() {
  const st = document.createElement("style");
  st.textContent = `
  /* Em tela larga o menu faz parte do leitor: não fecha, não tem
     X e não precisa do botão que o abre. */
  /* quem decide se é tela larga é o JS, que já leva em conta
     toque e largura; a classe basta, sem media query — ela usava
     pointer:fine e falhava em navegador sem ponteiro declarado */
  .lyra-box.op-fixo #opX,
  .lyra-box.op-fixo #opBtn,
  .lyra-box.op-fixo #opFundo{display:none !important}
  .lyra-box.op-fixo .op-painel{transform:none;box-shadow:none}

  /*  A largura do menu vira uma medida só, em vez de 320px
      repetido em quatro arquivos. Vinte por cento da tela, com
      piso e teto: numa tela larga ele não vira um corredor
      gigante, e numa apertada não some. */
  :root{
    /*  O piso é 320px porque é a largura em que "Rolagem
        automática" cabe na mesma linha do controle — foi a medida
        que funcionou desde o começo. Abaixo disso o texto quebra. */
    --op-menu: clamp(320px, 20vw, 380px);

    /*  Até onde a folha sobe. Começou em 78%, com cinco linhas.
        Com o afinador, o metrônomo e o acompanhar são nove — mas
        passar de 80% deixa de ser folha e vira tela cheia, sem
        mostrar mais nada da cifra por baixo. O resto rola. */
    --op-folha: 78%;
  }

  /* ── barra do leitor ──
     O style.css manda o grupo e o segmento esticarem, porque
     antes eles dividiam a barra com tom, tema e quebra de linha.
     Com tudo isso no menu, o Cifra/Letra sozinho virava um banner
     de 570px. Aqui eles voltam ao tamanho do conteúdo. */
  .lyra-barra{justify-content:space-between}
  .lyra-barra .lyra-grupo{flex:0 0 auto !important;min-width:0}
  .lyra-barra #lyraSeg{flex:0 0 auto !important}
  .lyra-barra #lyraSeg button{flex:0 0 auto !important;padding:0 30px}

  /* ── botão que abre ── */
  .op-abrir{display:inline-flex;align-items:center;gap:7px}
  @media (max-width: 820px), (pointer: coarse){
    #opBtn{display:none}
  }

  /* ── fundo ──
     No computador o painel empurra a cifra para o lado, então o
     fundo é só uma área invisível para fechar ao clicar fora.
     No celular ele escurece o que a folha não cobre. */
  .op-fundo{
    position:absolute;inset:0;z-index:60;
    background:transparent;opacity:0;pointer-events:none;
    transition:opacity .2s;
  }
  .op-fundo.on{opacity:1;pointer-events:auto}
  @media (max-width: 820px), (pointer: coarse){
    .op-fundo{background:rgba(0,0,0,.5)}
    .claro .op-fundo{background:rgba(0,0,0,.28)}
  }

  /* a cifra desliza para o lado enquanto o painel está aberto */
  /*  Duas condições, e as duas importam: tela larga E ponteiro
      fino. Só "pointer: fine" não bastava — numa janela estreita
      com mouse valiam ao mesmo tempo o painel de celular, que
      sobe de baixo, e este empurrão, que é do painel lateral. A
      cifra ia para o lado sem nada tê-la empurrado, e sobrava um
      vão de 320px à esquerda. */
  @media (min-width: 821px){
  @media not all and (pointer: coarse){
    /*  Com o menu aberto o conteúdo vira a segunda coluna: começa
        onde o menu termina e usa toda a largura que sobra. Antes
        eu só empurrava com padding, e a regra de largura máxima
        do style.css recentralizava tudo, abrindo um vão à
        esquerda e jogando os botões para o meio da tela. */
    .lyra-hd,.lyra-barra,.lyra-corpo{transition:margin-left .24s ease,padding-left .24s ease}
    .lyra-box.op-aberto .lyra-hd,
    .lyra-box.op-aberto .lyra-barra,
    .lyra-box.op-aberto .lyra-corpo{
      margin-left:var(--op-menu);margin-right:0;
      max-width:none;width:auto;
      padding-left:26px;padding-right:26px;
    }
  }
  }

  /* ── painel ── */
  .op-painel{
    container:op / inline-size;
    position:absolute;z-index:70;
    background:#131313;
    display:flex;flex-direction:column;
    transition:transform .24s ease;
    overflow:auto;overscroll-behavior:contain;
  }
  .claro .op-painel{background:#F4F0E9}

  /* computador: entra pela esquerda */
  .op-painel{
    left:0;top:0;bottom:0;width:var(--op-menu);
    border-right:1px solid var(--gray3);
    transform:translateX(-101%);
    padding:18px 16px calc(20px + env(safe-area-inset-bottom));
  }
  .op-painel.on{transform:none}
  .claro .op-painel{border-right-color:rgba(0,0,0,.14)}

  /* ── celular: folha que sobe de baixo ──
     Ela sai do mesmo canto onde está a barra flutuante: os botões
     estão lá embaixo, o dedo está lá embaixo, e a folha abre a
     partir dali. Cortina descendo do topo obrigava a mão a
     atravessar a tela para alcançar o que acabou de aparecer. */
  @media (max-width: 820px), (pointer: coarse){
    .op-painel{
      left:0;right:0;bottom:0;top:auto;width:auto;
      height:auto;max-height:var(--op-folha);
      border-right:none;
      border-top:1px solid var(--gray3);
      border-radius:18px 18px 0 0;
      transform:translateY(101%);
      /*  Sobe solta e freia no fim. Um ease comum chega e para
          seco. */
      transition:transform .3s cubic-bezier(.22,1,.36,1);
      box-shadow:0 -18px 36px rgba(0,0,0,.45);
      padding:14px 18px calc(18px + env(safe-area-inset-bottom));
    }
    .claro .op-painel{
      border-top-color:rgba(0,0,0,.14);
      box-shadow:0 -18px 36px rgba(0,0,0,.18);
    }

    /*  Nove linhas não cabem sem rolar, então o cabeçalho fica
        grudado: o X nunca sai de alcance no meio da rolagem. */
    .op-painel .op-hd{
      position:sticky;top:0;z-index:2;
      background:inherit;
      margin-bottom:6px;padding-bottom:12px;
      border-bottom:1px solid var(--gray3);
    }
    .claro .op-painel .op-hd{border-bottom-color:rgba(0,0,0,.12)}
  }

  .op-hd{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:14px;flex:0 0 auto;
  }
  .op-pega{flex:0 0 auto}
  .op-hd h4{
    margin:0;font-family:'Inter',sans-serif;
    font-size:12px;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;color:var(--gray);
  }
  .op-x{
    background:none;border:none;cursor:pointer;
    color:var(--gray);font-size:17px;padding:2px 6px;
  }
  .op-x:hover{color:#e6e6e6}
  .claro .op-x:hover{color:#111}

  /* pega no celular */
  .op-pega{
    width:38px;height:4px;border-radius:2px;background:var(--gray3);
    margin:0 auto 12px;display:none;
  }
  @media (max-width: 820px), (pointer: coarse){.op-pega{display:block}}

  /* ── grupos e linhas ── */
  .op-grupo{
    background:rgba(255,255,255,.03);
    border:1px solid var(--gray3);
    border-radius:12px;overflow:hidden;margin-bottom:12px;
    /*  O painel é uma coluna flex. Sem isto, quando o conteúdo
        passa da altura da tela, cada grupo é espremido pelo flex
        e o overflow:hidden acima corta as linhas pela metade —
        era o Capotraste e o Fundo claro aparecendo cortados. */
    flex:0 0 auto;
  }
  .claro .op-grupo{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.12)}

  .op-linha{
    display:flex;align-items:center;gap:12px;
    padding:12px 14px;min-height:54px;
    flex:0 0 auto;
  }
  .op-linha + .op-linha{border-top:1px solid var(--gray3)}
  .claro .op-linha + .op-linha{border-top-color:rgba(0,0,0,.10)}

  .op-ico{
    width:26px;height:26px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    color:var(--gray);
  }
  .op-nome{
    font-family:'Inter',sans-serif;font-size:14px;font-weight:500;
    color:#e8e8e8;flex:1;min-width:0;line-height:1.3;
  }
  .claro .op-nome{color:#20232b}
  .op-valor{
    font-family:'Inter',sans-serif;font-size:12.5px;
    color:var(--gray);flex-shrink:0;
  }
  .op-controle{display:flex;align-items:center;gap:8px;flex-shrink:0}

  /*  A legenda de cada item. No computador ela não aparece: o
      menu tem 320px e o controle já divide a linha com o nome —
      uma terceira coisa ali não caberia. */
  .op-sub{
    display:none;
    font-family:'Inter',sans-serif;font-size:12.5px;font-weight:400;
    color:var(--gray);line-height:1.35;
  }

  /*  Numa coluna de 250px o rótulo e o controle não cabem lado a
      lado: "Rolagem automática" quebrava em três linhas e ainda
      ficava por baixo do botão. Abaixo de 340px de menu a linha
      empilha — nome em cima, controle embaixo, alinhado à direita. */
  /*  Atenção ao número: a consulta mede a área interna do painel,
      já sem o preenchimento. Um menu de 320px tem 286px por dentro,
      então um limite de 292px pegava o menu inteiro e empilhava
      tudo à toa, deixando cada linha com 88px de altura. */
  @container op (max-width: 250px){
    .op-linha{
      /* duas colunas: ícone estreito e o resto.
         O nome fica ao lado do ícone; o controle desce para a
         segunda faixa, alinhado à direita. Sem isto o ícone caía
         sozinho numa linha e cada item virava um bloco de 130px. */
      display:grid;
      grid-template-columns:26px 1fr;
      column-gap:12px;row-gap:6px;
      padding:11px 14px;
    }
    .op-ico{grid-column:1;grid-row:1;align-self:center}
    .op-nome{grid-column:2;grid-row:1}
    .op-valor{grid-column:2;grid-row:2;justify-self:end;margin:0}
    .op-controle{grid-column:2;grid-row:2;justify-self:end}
    /* quando há valor escrito e controle, os dois dividem a faixa */
    .op-linha:has(.op-valor) .op-controle{grid-row:2}
  }
  .op-controle .lyra-btn{height:34px;min-width:38px}
  .op-controle .lyra-seg button{height:34px;padding:0 12px;font-size:12px}
  .op-controle .lyra-pct{line-height:34px;min-width:46px}
  .op-controle .lyra-tom select{height:34px;font-size:14px}
  .op-controle .ac-vel{width:96px}

  /* ============================================================
     ── celular: cada linha é um item de lista ──
     Ícone num quadrado, nome, legenda embaixo, controle na
     direita. A caixa do grupo sai de cena: em meia tela de
     altura, sete molduras arredondadas só comem espaço. O que
     separa as seções é um fio.
     ============================================================ */
  .op-rodape{display:none}

  @media (max-width: 820px), (pointer: coarse){
    .op-painel .op-grupo{
      background:none;border:none;border-radius:0;
      overflow:visible;margin:0;
    }
    .op-painel .op-grupo + .op-grupo{
      margin-top:8px;padding-top:8px;
      border-top:1px solid var(--gray3);
    }
    .claro .op-painel .op-grupo + .op-grupo{border-top-color:rgba(0,0,0,.12)}
    /* dentro da seção os itens não têm fio entre si */
    .op-painel .op-linha + .op-linha{border-top:none}

    .op-painel .op-linha{
      display:grid;
      grid-template-columns:40px 1fr auto;
      align-items:center;
      column-gap:14px;row-gap:1px;
      padding:11px 2px;min-height:62px;
    }
    .op-painel .op-ico{
      grid-column:1;grid-row:1 / span 2;
      width:40px;height:40px;border-radius:11px;
      background:rgba(238,158,99,.10);
      border:1px solid rgba(238,158,99,.22);
      color:var(--cifra);
    }
    .claro .op-painel .op-ico{
      background:rgba(194,65,12,.08);
      border-color:rgba(194,65,12,.20);
      color:var(--cifra-claro);
    }
    .op-painel .op-nome{
      grid-column:2;grid-row:1;
      font-size:15px;font-weight:600;color:#f0f0f0;
    }
    .claro .op-painel .op-nome{color:#1b1b1b}
    .op-painel .op-sub{
      display:block;grid-column:2;grid-row:2;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .op-painel .op-controle{grid-column:3;grid-row:1 / span 2}
    /* o nome do instrumento agora é a legenda: um lugar só */
    .op-painel .op-controle .op-valor{display:none}

    /*  A rolagem para no começo de uma seção, nunca no meio de uma
        linha. Sem isto a folha ficava com um item cortado ao
        meio na borda de cima — ícone pela metade, nome pela
        metade. "proximity" só ajusta quando o dedo já parou perto,
        então não briga com quem rola rápido. */
    .op-painel{scroll-snap-type:y proximity;scroll-padding-top:6px}
    .op-painel .op-grupo{scroll-snap-align:start}

    /*  Assinatura no pé da folha: diz onde você está sem gastar
        uma linha de lista com isso. Usa o rótulo do site — a
        monoespaçada fica para as cifras. */
    .op-rodape{
      display:block;order:98;flex:0 0 auto;
      margin-top:14px;padding-top:12px;
      border-top:1px solid var(--gray3);
      font-family:'Inter',sans-serif;
      font-size:9px;font-weight:700;color:var(--gray2);
      letter-spacing:.16em;text-transform:uppercase;
      text-align:center;
    }
    .claro .op-rodape{border-top-color:rgba(0,0,0,.12)}
  }

  /* a linha inteira acende quando o atalho traz até ela */
  .op-linha.op-piscar{animation:opPisca 1.1s ease}
  @keyframes opPisca{
    0%,100%{background:transparent}
    30%{background:rgba(238,158,99,.16)}
  }

  #opAdminBtn{gap:6px}

  /* ── barra flutuante do celular ── */
  .op-barra{
    position:absolute;left:50%;transform:translateX(-50%);
    bottom:calc(16px + env(safe-area-inset-bottom));z-index:50;
    display:none;align-items:stretch;
    background:rgba(28,28,28,.94);
    border:1px solid var(--gray3);
    border-radius:16px;
    box-shadow:0 10px 30px rgba(0,0,0,.45);
    backdrop-filter:blur(8px);
    overflow:hidden;
  }
  @media (max-width: 820px), (pointer: coarse){.op-barra{display:flex}}
  .claro .op-barra{background:rgba(250,247,242,.95);border-color:rgba(0,0,0,.14)}

  .op-barra button{
    background:none;border:none;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    /* largura igual para os quatro: o rótulo mais longo manda,
       e os outros não ficam menores por terem nome curto */
    flex:1 1 0;min-width:82px;
    padding:9px 6px 8px;color:#d2d2d2;
    font-family:'Inter',sans-serif;font-size:10px;font-weight:600;
  }
  .op-barra button span{
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;
  }
  .op-barra button + button{border-left:1px solid var(--gray3)}
  .claro .op-barra button{color:#3a3a3a}
  .claro .op-barra button + button{border-left-color:rgba(0,0,0,.12)}
  .op-barra button.on{color:var(--cifra)}
  .claro .op-barra button.on{color:var(--cifra-claro)}

  /* ── topo enxuto no celular ──
     Só o essencial fica na barra: alternar cifra e letra. Tom,
     rolagem, instrumento, tamanho e tema já moram no menu, e o
     que sobra ali é altura tirada da cifra. */
  @media (max-width: 820px), (pointer: coarse){
    .lyra-barra{
      padding:7px 14px;gap:8px;
      justify-content:center;
    }
    .lyra-barra .lyra-grupo{flex:0 0 auto;justify-content:center}
    .lyra-barra #lyraSeg{flex:0 0 auto}
    /* o segundo grupo só guarda o botão Opções, escondido no
       celular. Ele ficava com largura zero mas ainda contava o
       espaçamento, deslocando o Cifra/Letra em meio gap. */
    .lyra-barra .lyra-grupo:last-child{display:none}
    .lyra-barra #lyraSeg button{padding:0 22px;height:36px;font-size:13px}
    /* o cabeçalho também aperta: o artista some e o título encolhe */
    .lyra-hd{padding:10px 14px 8px}
    .lyra-hd p{display:none}
    .lyra-hd h3{font-size:15px}
  }

  /* A barra flutuante sai de cena quando qualquer painel sobe:
     ela ficava por cima do diagrama do acorde e escondia o botão
     de ouvir. */
  #lyraBox:has(#acPainel.on) #opBarra,
  #lyraBox:has(#opRapido.on) #opBarra,
  #lyraBox:has(#opPainel.on) #opBarra{display:none}

  /* e o painel do acorde respeita a área segura do aparelho */
  .ac-painel{padding-bottom:calc(22px + env(safe-area-inset-bottom))}

  /* com a barra flutuante, a cifra ganha um respiro no rodapé */
  @media (max-width: 820px), (pointer: coarse){
    .lyra-corpo{padding-bottom:86px}
  }`;
  document.head.appendChild(st);
})();

// ── ícones ──────────────────────────────────────────────────
const OP_ICO = {
  tom:     `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8.4v7.2"/></svg>`,
  rolagem: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 10.5l4 4 4-4"/></svg>`,
  inst:    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="1.6"/><path d="M8 6v7M13 6v7M18 6v7"/></svg>`,
  opcoes:  `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="7" cy="8" r="2.2"/><path d="M11 8h9"/><circle cx="16" cy="16" r="2.2"/><path d="M3 16h10"/></svg>`,
  texto:   `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h16M9 6v13M15 10h5M17.5 10v9"/></svg>`,
  quebra:  `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h16M4 12h11a3 3 0 1 1 0 6h-3M4 18h4"/><path d="M9 15l-2.5 3L9 21"/></svg>`,
  tema:    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  capo:    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M18 4v16M3 9h18"/></svg>`,
  admin:   `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>`,
};

// ── montagem ────────────────────────────────────────────────

//  sub é a legenda que aparece embaixo do nome no celular. Pode
//  ser texto fixo ("Evita rolar para o lado") ou, com um id, o
//  estado do momento — "Violão", "Escuro", "Na 2ª casa".
function opLinha(ico, nome, controle, id, sub, subId) {
  const d = document.createElement("div");
  d.className = "op-linha";
  if (id) d.id = id;
  d.innerHTML = `<span class="op-ico">${ico}</span><span class="op-nome">${nome}</span>`;
  if (sub || subId) {
    const s = document.createElement("span");
    s.className = "op-sub";
    if (subId) s.id = subId;
    s.textContent = sub || "";
    d.appendChild(s);
  }
  const c = document.createElement("span");
  c.className = "op-controle";
  if (controle) c.appendChild(controle);
  d.appendChild(c);
  return d;
}

function opGrupo(...linhas) {
  const g = document.createElement("div");
  g.className = "op-grupo";
  linhas.forEach(l => l && g.appendChild(l));
  return g;
}

function opMontar() {
  const box = document.getElementById("lyraBox");
  if (!box || document.getElementById("opPainel")) return;

  const fundo = document.createElement("div");
  fundo.className = "op-fundo";
  fundo.id = "opFundo";
  fundo.addEventListener("click", opFechar);
  box.appendChild(fundo);

  const p = document.createElement("div");
  p.className = "op-painel";
  p.id = "opPainel";
  p.innerHTML = `
    <div class="op-pega"></div>
    <div class="op-hd"><h4>Opções</h4><button class="op-x" id="opX" aria-label="Fechar">&#10005;</button></div>`;
  box.appendChild(p);
  p.querySelector("#opX").addEventListener("click", opFechar);

  // ── os controles saem da barra e entram aqui, sem serem recriados ──
  const pega = sel => document.querySelector(sel);

  const rolagem = document.querySelector(".ac-rolar");
  const inst    = document.getElementById("acInstBtn");
  const tom     = document.getElementById("lyraGrupoTom");
  const texto   = pega(".lyra-barra .lyra-seg:not(#lyraSeg)");
  const quebra  = document.getElementById("lyraQuebraBtn");
  const tema    = document.getElementById("lyraTema");

  if (tom) tom.querySelector(".lyra-lbl")?.remove();

  p.appendChild(opGrupo(
    rolagem && opLinha(OP_ICO.rolagem, "Rolagem automática", rolagem,
                       "opLinhaRolagem", "Desce a cifra sozinha"),
    inst    && opLinhaInstrumento(inst),
  ));

  p.appendChild(opGrupo(
    tom && opLinha(OP_ICO.tom, "Tom", tom,
                   "opLinhaTom", "Transpõe a cifra inteira"),
    opLinhaCapo(),
  ));

  p.appendChild(opGrupo(
    texto  && opLinha(OP_ICO.texto,  "Tamanho do texto", texto,
                      null, "Para ler de longe"),
    quebra && opLinha(OP_ICO.quebra, "Quebrar linhas longas", quebra,
                      null, "Evita rolar para o lado"),
    tema   && opLinha(OP_ICO.tema,   "Fundo", tema,
                      "opLinhaTema", "", "opTemaSub"),
  ));

  //  Último grupo: sai do site. Fica no fim porque não muda nada
  //  na tela — é uma saída, não um ajuste de leitura.
  p.appendChild(opGrupo(opLinhaAdmin()));

  const rodape = document.createElement("div");
  rodape.className = "op-rodape";
  rodape.textContent = "tom louvores — leitor";
  p.appendChild(rodape);

  opMontarBarra();
  opMontarBotao();
  opSincronizarInstrumento();
  opSincronizarTema();
  opSincronizarAdmin();
  opAbrirSeCabe();
}

//  Mostra qual instrumento está valendo, por escrito, além do
//  ícone: "Instrumento" sozinho não dizia em qual estava. No
//  computador o nome fica ao lado do botão; no celular ele é a
//  legenda da linha. Os dois saem da mesma função.
function opLinhaInstrumento(botao) {
  const c = document.createElement("span");
  c.style.cssText = "display:flex;align-items:center;gap:10px";
  const nome = document.createElement("span");
  nome.className = "op-valor";
  nome.id = "opInstNome";
  c.appendChild(nome);
  c.appendChild(botao);
  return opLinha(OP_ICO.inst, "Instrumento", c, "opLinhaInst", "", "opInstSub");
}

//  Capotraste é coisa de violão. Com o teclado escolhido, a linha
//  sai da tela em vez de ficar ali sem efeito nenhum.
function opSincronizarInstrumento() {
  const txt  = acAba === "teclado" ? "Teclado" : "Violão";
  const nome = document.getElementById("opInstNome");
  if (nome) nome.textContent = txt;
  const sub = document.getElementById("opInstSub");
  if (sub) sub.textContent = txt;
  const capo = document.getElementById("opLinhaCapo");
  if (capo) capo.style.display = acAba === "teclado" ? "none" : "";
}

//  A legenda do fundo diz em qual dos dois você está, não o que o
//  botão vai fazer: assim ela não mente enquanto ninguém toca.
function opSincronizarTema() {
  const sub = document.getElementById("opTemaSub");
  if (sub) sub.textContent = lyraClaro ? "Claro" : "Escuro";
}

//  O capotraste é do painel de acordes, mas o lugar dele é aqui:
//  quem põe capotraste põe antes de começar, não a cada acorde.
function opLinhaCapo() {
  const c = document.createElement("span");
  c.style.cssText = "display:flex;align-items:center;gap:8px";
  c.innerHTML = `
    <input type="checkbox" id="opCapoUsar" style="width:16px;height:16px;accent-color:var(--cifra);cursor:pointer">
    <select id="opCapoSel" class="op-sel">${
      Array.from({length:9},(_,i)=>`<option value="${i+1}">${i+1}ª casa</option>`).join("")}</select>`;
  const l = opLinha(OP_ICO.capo, "Capotraste", c, "opLinhaCapo", "", "opCapoSub");

  const sel  = c.querySelector("#opCapoSel");
  const usar = c.querySelector("#opCapoUsar");
  sel.style.cssText = "background:var(--black5);border:1px solid var(--gray3);color:#f0f0f0;" +
                      "border-radius:8px;padding:6px 9px;font-family:'Inter',sans-serif;font-size:12.5px;cursor:pointer";

  const sincronizar = () => {
    usar.checked  = acCapoUsar;
    sel.value     = acCapoCasa;
    sel.disabled  = !acCapoUsar;
    sel.style.opacity = acCapoUsar ? "1" : ".45";
    const sub = l.querySelector("#opCapoSub");
    if (sub) sub.textContent = acCapoUsar ? `Na ${acCapoCasa}ª casa` : "Sem capotraste";
  };
  usar.addEventListener("change", e => {
    acCapoUsar = e.target.checked;
    localStorage.setItem("tl_capo_usar", acCapoUsar ? "1" : "0");
    sincronizar(); acPintarBalao();
    if (typeof acPintarTira === "function") acPintarTira();
    if (document.getElementById("acPainel")?.classList.contains("on")) acDesenhar();
  });
  sel.addEventListener("change", e => {
    acCapoCasa = Number(e.target.value);
    localStorage.setItem("tl_capo_casa", acCapoCasa);
    sincronizar();
    acPintarBalao();
    if (typeof acPintarTira === "function") acPintarTira();
    if (document.getElementById("acPainel")?.classList.contains("on")) acDesenhar();
  });
  sincronizar();
  return l;
}

//  Atalho para o painel onde as cifras são cadastradas e
//  corrigidas. Com uma música aberta, vai direto na página dela;
//  sem isso, cai na lista do painel.
//
//  O endereço do painel é por UUID (/admin/musica/<uuid>), e os
//  dois bancos conversam por slug — quem faz a ponte é o lyra.js,
//  que guarda o id de cada slug (ver lyraIdDoSlug).
function opAdminURL() {
  const song = (typeof lyraAtual !== "undefined" && lyraAtual?.song) || null;
  const id = song && typeof lyraIdDoSlug === "function"
    ? lyraIdDoSlug(song.slug) : null;
  return id ? `${LYRA_ADMIN_URL}/musica/${id}` : LYRA_ADMIN_URL;
}

//  Slugs cujo id já foi procurado. Sem isto, música que não tem id
//  no Lyra pediria de novo a cada rolagem de tom.
const opIdsTentados = new Set();

//  O rótulo muda com o que está aberto: prometer "editar esta
//  cifra" e cair na lista geral seria pior que não prometer.
function opSincronizarAdmin() {
  const l = document.getElementById("opLinhaAdmin");
  if (!l) return;

  const song = (typeof lyraAtual !== "undefined" && lyraAtual?.song) || null;
  const id = song && typeof lyraIdDoSlug === "function"
    ? lyraIdDoSlug(song.slug) : null;

  l.querySelector(".op-nome").textContent = id ? "Editar esta cifra" : "Editar cifras";
  const sub = l.querySelector("#opAdminSub");
  if (sub) {
    sub.textContent = id
      ? `Abre "${song.title || lyraAtual.nome || "esta música"}" no Lyra`
      : "Painel do Lyra · exige senha";
  }
  const b = l.querySelector("#opAdminBtn");
  if (b) b.title = id ? "Editar esta cifra no Lyra" : "Abrir o painel de cifras do Lyra";

  //  Cifra guardada no aparelho antes desta mudança não tem o id.
  //  Busca uma vez, em segundo plano, e repinta quando chegar.
  if (song && !id && !opIdsTentados.has(song.slug)
      && typeof lyraGarantirId === "function") {
    opIdsTentados.add(song.slug);
    lyraGarantirId(song.slug).then(novo => { if (novo) opSincronizarAdmin(); });
  }
}

function opLinhaAdmin() {
  const b = document.createElement("button");
  b.className = "lyra-btn";
  b.id = "opAdminBtn";
  b.textContent = "Abrir";
  //  O endereço é montado no clique, não aqui: a música muda com
  //  as setas e o menu não é remontado a cada troca.
  b.addEventListener("click", () => { location.href = opAdminURL(); });
  return opLinha(OP_ICO.admin, "Editar cifras", b,
                 "opLinhaAdmin", "Painel do Lyra · exige senha", "opAdminSub");
}

// ── botão na barra do leitor ────────────────────────────────
const opPintarInstOriginal = acPintarInstrumento;
acPintarInstrumento = function (...a) {
  const r = opPintarInstOriginal.apply(this, a);
  opSincronizarInstrumento();
  return r;
};

//  O botão do fundo é do lyra.js. Em vez de duplicar o evento, o
//  menu se pendura na função que já repinta o leitor.
const opAplicarTemaOriginal = lyraAplicarTema;
lyraAplicarTema = function (...a) {
  const r = opAplicarTemaOriginal.apply(this, a);
  opSincronizarTema();
  return r;
};

function opMontarBotao() {
  if (document.getElementById("opBtn")) return;
  const grupo = document.querySelector(".lyra-barra .lyra-grupo:last-child");
  if (!grupo) return;
  const b = document.createElement("button");
  b.className = "lyra-btn op-abrir";
  b.id = "opBtn";
  b.title = "Opções";
  b.innerHTML = `${OP_ICO.opcoes}<span class="op-abrir-txt">Opções</span>`;
  b.addEventListener("click", () => opAbrir());
  grupo.appendChild(b);

  // no celular a barra flutuante já dá conta deste botão
}

// ── barra flutuante do celular ──────────────────────────────
function opMontarBarra() {
  if (document.getElementById("opBarra")) return;
  const box = document.getElementById("lyraBox");
  const b = document.createElement("div");
  b.className = "op-barra";
  b.id = "opBarra";
  b.innerHTML = `
    <button data-ir="opLinhaTom">${OP_ICO.tom}<span>Tom</span></button>
    <button data-ir="opLinhaRolagem" id="opBarraRolar">${OP_ICO.rolagem}<span>Rolagem</span></button>
    <button data-ir="opLinhaInst">${OP_ICO.inst}<span>Instrumento</span></button>
    <button>${OP_ICO.opcoes}<span>Opções</span></button>`;
  box.appendChild(b);
  b.querySelectorAll("button").forEach(x =>
    x.addEventListener("click", () => opAbrir(x.dataset.ir)));
}

//  Em tela larga o menu cabe ao lado da cifra sem atrapalhar,
//  então já vem aberto. Se a pessoa fechar, a escolha é lembrada
//  e ele para de abrir sozinho.
const OP_LARGO = () => window.innerWidth >= 1100 && !opEhCelular();

//  Em tela larga o menu é parte do leitor, não uma gaveta: abre
//  junto e fica. Fechar ali só tiraria uma coluna que já cabia.
function opAbrirSeCabe() {
  const box = document.getElementById("lyraBox");
  if (box) box.classList.toggle("op-fixo", OP_LARGO());
  if (OP_LARGO()) opAbrir();
}

window.addEventListener("resize", () => {
  const box = document.getElementById("lyraBox");
  if (!box) return;
  box.classList.toggle("op-fixo", OP_LARGO());
  if (OP_LARGO()) opAbrir();
});

// ── abrir e fechar ──────────────────────────────────────────
function opAbrir(irPara) {
  opMontar();
  if (typeof afFechar === "function") afFechar();   // um painel por vez
  document.getElementById("opFundo")?.classList.add("on");
  document.getElementById("lyraBox")?.classList.add("op-aberto");
  const p = document.getElementById("opPainel");
  p?.classList.add("on");
  if (typeof acEsconderBalao === "function") acEsconderBalao();

  if (irPara) {
    const l = document.getElementById(irPara);
    if (l) {
      l.scrollIntoView({ block: "center", behavior: "smooth" });
      l.classList.remove("op-piscar");
      void l.offsetWidth;                 // reinicia a animação
      l.classList.add("op-piscar");
    }
  }
}

function opFechar() {
  if (OP_LARGO()) return;                       // em tela larga ele não fecha
  document.getElementById("opFundo")?.classList.remove("on");
  document.getElementById("opPainel")?.classList.remove("on");
  document.getElementById("lyraBox")?.classList.remove("op-aberto");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.getElementById("opPainel")?.classList.contains("on")) {
    e.stopPropagation(); opFechar();
  }
}, true);

//  Arrastar a folha para baixo também fecha, sem precisar acertar
//  o X. O gesto só conta quando o painel já está no topo da
//  própria rolagem, senão brigaria com a rolagem do conteúdo.
function opLigarArrasteFolha() {
  const p = document.getElementById("opPainel");
  if (!p || p.dataset.arraste) return;
  p.dataset.arraste = "1";

  let y0 = 0, t0 = 0, noTopo = false;

  p.addEventListener("touchstart", e => {
    y0 = e.changedTouches[0].clientY;
    t0 = Date.now();
    noTopo = p.scrollTop <= 2;
  }, { passive: true });

  p.addEventListener("touchend", e => {
    if (!noTopo || OP_LARGO()) return;
    const dy = e.changedTouches[0].clientY - y0;
    //  Para baixo, no sentido em que a folha se recolhe.
    if (dy > 60 && Date.now() - t0 < 700) opFechar();
  }, { passive: true });
}

// ── enxerto ─────────────────────────────────────────────────
const opRenderOriginal = lyraRenderConteudo;
lyraRenderConteudo = async function (...a) {
  const r = await opRenderOriginal.apply(this, a);
  opMontar();
  //  A música mudou: o rótulo do "Editar esta cifra" acompanha.
  opSincronizarAdmin();
  return r;
};

const opFecharLeitorOriginal = lyraFecharLeitor;
lyraFecharLeitor = function (...a) {
  opFechar();
  return opFecharLeitorOriginal.apply(this, a);
};

// ============================================================
//  FOLHAS RÁPIDAS
//  Tocar num atalho da barra flutuante abre só aquele controle,
//  numa folha pequena. Elas continuam subindo de baixo: nascem
//  de um botão que está lá embaixo, perto do dedo. O menu
//  completo continua no "Opções".
// ============================================================

let opTomInicial = null;

(function opEstiloRapido() {
  const st = document.createElement("style");
  st.textContent = `
  .op-rapido{
    position:absolute;left:0;right:0;bottom:0;z-index:75;
    background:#161616;border-top:1px solid var(--gray3);
    border-radius:18px 18px 0 0;
    padding:12px 16px calc(20px + env(safe-area-inset-bottom));
    transform:translateY(101%);transition:transform .22s ease;
    max-height:72%;overflow:auto;overscroll-behavior:contain;
  }
  .op-rapido.on{transform:none}
  .claro .op-rapido{background:#F4F0E9;border-top-color:rgba(0,0,0,.14)}

  .op-rapido .op-pega{display:block}
  .op-rapido h4{
    margin:2px 0 14px;font-family:'Inter',sans-serif;
    font-size:12px;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;color:var(--gray);
  }

  /* linha de ações do tom */
  .op-tom-acoes{display:flex;gap:8px;margin-bottom:12px}
  .op-tom-acoes button{
    flex:1;background:var(--black5);border:1px solid var(--gray3);
    border-radius:11px;color:#eee;cursor:pointer;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    padding:12px 8px;
  }
  .op-tom-acoes .op-restaurar{flex:0 0 52px;font-size:16px;color:var(--gray)}
  .claro .op-tom-acoes button{background:#E4DFD8;border-color:rgba(0,0,0,.16);color:#242424}

  /* grade de tons */
  .op-tons{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
  .op-tons button{
    background:var(--black5);border:1px solid var(--gray3);
    border-radius:11px;color:#ddd;cursor:pointer;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    padding:13px 4px;
  }
  .op-tons button.on{background:#fff;color:#111;border-color:#fff}
  .claro .op-tons button{background:#E4DFD8;border-color:rgba(0,0,0,.16);color:#242424}
  .claro .op-tons button.on{background:#242424;color:#fff;border-color:#242424}

  /* escolha de instrumento */
  .op-escolha{display:flex;flex-direction:column;gap:8px}
  .op-escolha button{
    display:flex;align-items:center;gap:12px;
    background:var(--black5);border:1px solid var(--gray3);
    border-radius:12px;color:#e8e8e8;cursor:pointer;
    font-family:'Inter',sans-serif;font-size:14.5px;font-weight:600;
    padding:14px 16px;text-align:left;
  }
  .op-escolha button.on{border-color:var(--cifra);color:var(--cifra)}
  .claro .op-escolha button{background:#E9E4DC;border-color:rgba(0,0,0,.14);color:#242424}

  /* rolagem */
  .op-rol{display:flex;align-items:center;gap:14px}
  .op-rol button{
    flex:0 0 54px;height:54px;border-radius:50%;
    background:var(--cifra);border:none;color:#1a1a1a;
    font-size:19px;cursor:pointer;
  }
  .claro .op-rol button{background:var(--cifra-claro);color:#fff}
  .op-rol input{flex:1}
  .op-rol-txt{font-family:'Inter',sans-serif;font-size:12.5px;color:var(--gray);margin-top:10px}`;
  document.head.appendChild(st);
})();

function opRapidoEl() {
  let r = document.getElementById("opRapido");
  if (r) return r;
  const box = document.getElementById("lyraBox");
  if (!box) return null;
  r = document.createElement("div");
  r.id = "opRapido";
  r.className = "op-rapido";
  box.appendChild(r);
  return r;
}

function opRapidoFechar() {
  document.getElementById("opRapido")?.classList.remove("on");
  document.getElementById("opFundo")?.classList.remove("on");
}

function opRapido(tipo) {
  const r = opRapidoEl();
  if (!r) return;
  opFechar();                                   // o menu grande sai de cena
  if (typeof afFechar === "function") afFechar();
  document.getElementById("opFundo")?.classList.add("on");
  r.classList.add("on");

  if (tipo === "tom")  opRapidoTom(r);
  if (tipo === "rol")  opRapidoRolagem(r);
  if (tipo === "inst") opRapidoInstrumento(r);
}

// ── Tom ─────────────────────────────────────────────────────
function opRapidoTom(r) {
  const sel = document.getElementById("lyraTomSel");
  if (!sel) return;
  if (opTomInicial === null) opTomInicial = sel.value;

  const tons = [...sel.options].map(o => o.value);
  const atual = sel.value;

  r.innerHTML = `
    <div class="op-pega"></div>
    <h4>Tom</h4>
    <div class="op-tom-acoes">
      <button class="op-restaurar" id="opTomRestaura" title="Voltar ao tom original">&#8634;</button>
      <button id="opTomMenos">&minus;½ tom</button>
      <button id="opTomMais">+½ tom</button>
    </div>
    <div class="op-tons">${
      tons.map(t => `<button data-t="${t}"${t === atual ? ' class="on"' : ""}>${t}</button>`).join("")}</div>`;

  const troca = t => {
    sel.value = t;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(() => opRapidoTom(r), 260);      // repinta com o novo tom marcado
  };
  const anda = passo => {
    const i = tons.indexOf(sel.value);
    troca(tons[(i + passo + tons.length) % tons.length]);
  };

  r.querySelector("#opTomMenos").onclick = () => anda(-1);
  r.querySelector("#opTomMais").onclick  = () => anda(1);
  r.querySelector("#opTomRestaura").onclick = () => troca(opTomInicial);
  r.querySelectorAll(".op-tons button").forEach(b =>
    b.onclick = () => troca(b.dataset.t));
}

// ── Rolagem ─────────────────────────────────────────────────
function opRapidoRolagem(r) {
  r.innerHTML = `
    <div class="op-pega"></div>
    <h4>Rolagem automática</h4>
    <div class="op-rol">
      <button id="opRolBtn">${acRolando ? "❚❚" : "▶"}</button>
      <input type="range" class="ac-vel" id="opRolVel" min="5" max="120" step="5" value="${acVel}"
             aria-label="Velocidade">
    </div>
    <p class="op-rol-txt">Ela para sozinha no fim da cifra, e para se você tocar no texto.</p>`;

  const btn = r.querySelector("#opRolBtn");
  btn.onclick = () => {
    acAlternarRolagem();
    btn.textContent = acRolando ? "❚❚" : "▶";
  };
  r.querySelector("#opRolVel").oninput = e => {
    acVel = Number(e.target.value);
    localStorage.setItem("tl_vel_rolagem", acVel);
    const outro = document.getElementById("acVel");
    if (outro) outro.value = acVel;
  };
}

// ── Instrumento ─────────────────────────────────────────────
function opRapidoInstrumento(r) {
  const opcoes = [["violao", "Violão", AC_ICO_VIOLAO], ["teclado", "Teclado", AC_ICO_TECLADO]];
  r.innerHTML = `
    <div class="op-pega"></div>
    <h4>Instrumento</h4>
    <div class="op-escolha">${
      opcoes.map(([v, t, ico]) =>
        `<button data-v="${v}"${acAba === v ? ' class="on"' : ""}>${ico}${t}</button>`).join("")}</div>`;

  r.querySelectorAll(".op-escolha button").forEach(b =>
    b.onclick = () => {
      acAba = b.dataset.v;
      localStorage.setItem("tl_aba_acorde", acAba);
      acPintarInstrumento();
      if (document.getElementById("acPainel")?.classList.contains("on")) acDesenhar();
      opRapidoInstrumento(r);
    });
}

// ── a barra flutuante passa a abrir as folhas rápidas ───────
function opLigarAtalhos() {
  const barra = document.getElementById("opBarra");
  if (!barra || barra.dataset.rapido) return;
  barra.dataset.rapido = "1";

  const botoes = [...barra.querySelectorAll("button")];
  const tipos = ["tom", "rol", "inst", null];    // o último é o menu completo
  botoes.forEach((b, i) => {
    const novo = b.cloneNode(true);              // limpa os eventos antigos
    b.replaceWith(novo);
    novo.addEventListener("click", () => {
      if (tipos[i]) { opRapido(tipos[i]); }
      else { opRapidoFechar(); opAbrir(); }     // o menu recolhe a folha
    });
  });
}

const opFundoFecharTudo = () => { opFechar(); opRapidoFechar(); };
document.addEventListener("click", e => {
  if (e.target.id === "opFundo") opFundoFecharTudo();
});

const opMontarOriginal = opMontar;
opMontar = function (...a) {
  const r = opMontarOriginal.apply(this, a);
  opLigarAtalhos();
  opLigarArrasteFolha();
  return r;
};

const opFecharLeitorRapido = lyraFecharLeitor;
lyraFecharLeitor = function (...a) {
  opRapidoFechar();
  opTomInicial = null;
  return opFecharLeitorRapido.apply(this, a);
};

// ============================================================
//  ATALHO DO PAINEL NO CABEÇALHO DO SITE
//  O leitor é para tocar; editar a cifra é outra tarefa, e o
//  lugar dela é o cabeçalho, ao lado do "Baixar cifras".
//
//  Vale para todos: o painel tem senha própria. Abaixo de 900px
//  o menu.js recolhe este botão para dentro da gaveta.
// ============================================================

(function opAdminNoHeader() {
  const estilo = document.createElement("style");
  estilo.textContent = `
    #adminLyraBtn{display:inline-flex;align-items:center;gap:7px}
    @media(max-width:600px){#adminLyraBtn .admin-lbl{display:none}}`;
  document.head.appendChild(estilo);

  const montar = () => {
    if (document.getElementById("adminLyraBtn")) return;
    const barra = document.querySelector(".header-right");
    if (!barra) return;
    const b = document.createElement("button");
    b.id = "adminLyraBtn";
    b.className = "btn-logout";
    b.title = "Abrir o painel de cifras do Lyra";
    b.innerHTML = `${OP_ICO.admin}<span class="admin-lbl">Cifras</span>`;
    b.addEventListener("click", () => { location.href = LYRA_ADMIN_URL; });
    barra.insertBefore(b, document.getElementById("btnLogout") || null);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();