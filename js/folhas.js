// ============================================================
//  TOM LOUVORES — arrastar para baixo fecha as folhas
//  Carregue depois do app.js, metronomo.js, afinador.js e acordes.js.
//
//  O menu lateral e as folhas de Opções do leitor já fechavam com o
//  dedo. As outras folhas que sobem de baixo não: o modal da música
//  (no celular), o metrônomo, o afinador e o painel do acorde. Aqui
//  todas ganham o mesmo gesto, com as mesmas regras:
//    · a folha acompanha o dedo para baixo;
//    · soltou depois de um quarto da altura, ou com um puxão rápido,
//      fecha — a partir de onde o dedo largou, sem pular de volta;
//    · antes disso, volta ao lugar;
//    · começou pela pega ou pelo cabeçalho, arrasta sempre; começou
//      pelo meio, só se o conteúdo estiver no topo (senão é rolagem);
//    · para cima ou de lado não é fechar;
//    · um controle de arrastar (a régua do BPM) é do controle.
// ============================================================
(() => {
  "use strict";

  const celular = () => matchMedia("(max-width: 600px)").matches;

  //  As folhas. "fechar" é a função da própria tela; "fundo" é o que
  //  escurece atrás e vai clareando conforme a folha desce.
  const FOLHAS = [
    { sel: "#mtPainel.on", fechar: () => window.mtFechar?.(), fundo: () => document.getElementById("opFundo") },
    { sel: "#afPainel.on", fechar: () => window.afFechar?.(), fundo: () => document.getElementById("opFundo") },
    { sel: "#acPainel.on", fechar: () => window.acFechar?.(), fundo: () => null },
    {
      sel: "#viewOverlay.open > .modal", so: celular,
      fechar: () => window.fecharView?.(),
      fundo: () => document.getElementById("viewOverlay"), fundoCor: true,
    },
  ];

  let folha = null, def = null, y0 = 0, x0 = 0, t0 = 0, dy = 0, decidido = false;

  const folhaDe = alvo => {
    for (const d of FOLHAS) {
      if (d.so && !d.so()) continue;
      const f = alvo.closest?.(d.sel);
      if (f) return { f, d };
    }
    return null;
  };

  //  Algum trecho entre o dedo e a folha já rolou? Então o gesto é
  //  rolagem, e só vale como arrasto se partiu da pega/cabeçalho.
  const rolado = (alvo, f) => {
    for (let el = alvo; el && el !== f.parentElement; el = el.parentElement) {
      if (el.scrollTop > 10) return true;
    }
    return false;
  };

  const pintarFundo = (d, p) => {
    const fd = d.fundo();
    if (!fd) return;
    fd.style.transition = "none";
    if (d.fundoCor) fd.style.backgroundColor = `rgba(6,5,4,${(0.78 * (1 - p)).toFixed(3)})`;
    else fd.style.opacity = String(Math.max(0, 1 - p));
  };
  const limparFundo = d => {
    const fd = d.fundo();
    if (!fd) return;
    fd.style.transition = "";
    fd.style.opacity = "";
    fd.style.backgroundColor = "";
  };

  document.addEventListener("touchstart", e => {
    const r = folhaDe(e.target);
    if (!r) return;
    if (e.target.closest('input[type="range"], textarea, select')) return;
    const peloTopo = !!e.target.closest(".op-pega, .mt-hd, .af-hd, .ac-hd, .modal-hd");
    if (!peloTopo && rolado(e.target, r.f)) return;
    folha = r.f; def = r.d;
    const t = e.touches[0];
    y0 = t.clientY; x0 = t.clientX; t0 = Date.now(); dy = 0; decidido = false;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!folha) return;
    const t = e.touches[0];
    const my = t.clientY - y0, mx = t.clientX - x0;
    if (!decidido) {
      if (Math.abs(my) < 8 && Math.abs(mx) < 8) return;
      if (my <= 0 || Math.abs(mx) > Math.abs(my)) { folha = null; return; }
      decidido = true;
    }
    dy = Math.max(0, my);
    folha.style.transition = "none";
    folha.style.animation = "none";
    folha.style.transform = `translateY(${dy}px)`;
    pintarFundo(def, dy / folha.offsetHeight);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  const soltar = () => {
    if (!folha) return;
    const f = folha, d = def;
    folha = null;
    if (!decidido) return;
    const rapido = dy > 50 && Date.now() - t0 < 300;
    const fecha = dy > f.offsetHeight / 4 || rapido;
    limparFundo(d);
    f.style.transition = "transform .22s ease";
    if (!fecha) {
      f.style.transform = "";
      setTimeout(() => { f.style.transition = ""; f.style.animation = ""; }, 260);
      return;
    }
    //  desce a partir de onde está, e só então some
    f.style.transform = "translateY(101%)";
    setTimeout(() => {
      d.fechar();
      f.style.transition = ""; f.style.transform = ""; f.style.animation = "";
    }, 200);
  };
  document.addEventListener("touchend", soltar, { passive: true });
  document.addEventListener("touchcancel", soltar, { passive: true });
})();
