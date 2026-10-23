// ============================================================
//  TOM LOUVORES — o login vale o dia inteiro neste aparelho
//  Carregue PRIMEIRO, no <head>, antes de qualquer outro script.
//
//  O login do admin fica no sessionStorage, que o navegador apaga
//  quando a aba ou o app fecha. Este arquivo guarda uma cópia da
//  mesma sessão no aparelho (localStorage), com a data de hoje:
//
//    · fechou o site/app e voltou no mesmo dia → já entra logado
//    · tocou em "Sair" no mesmo dia → sai; "Entrar" depois entra
//      direto, sem pedir usuário e senha
//    · virou o dia (meia-noite de Brasília) → a cópia é apagada e
//      o "Entrar" volta a pedir a senha
//
//  Para o "Entrar" de volta funcionar, o "Sair" não derruba mais a
//  sessão no Supabase (só neste aparelho); ela vence sozinha.
//  Nada muda no login em si: mesmas variáveis, mesmo Supabase.
// ============================================================
(() => {
  "use strict";

  const CHAVE = "tl_supabase_admin_session_v1";
  const DIA = "tl_login_dia_v1";

  let ls, ss;
  try { ls = window.localStorage; ss = window.sessionStorage; } catch { return; }
  if (!ls || !ss) return;

  const hoje = () => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const proto = Object.getPrototypeOf(ss);
  const setOriginal = proto.setItem;
  const removeOriginal = proto.removeItem;

  //  { dia, sessao, saiu } de hoje, ou null (e apaga a de outro dia)
  function copiaDeHoje() {
    try {
      const c = JSON.parse(ls.getItem(DIA) || "null");
      if (c && c.dia === hoje() && c.sessao) return c;
      if (c) removeOriginal.call(ls, DIA);
    } catch { /* cópia estragada */ }
    return null;
  }
  function gravarCopia(c) {
    try { setOriginal.call(ls, DIA, JSON.stringify(c)); } catch { /* cheio */ }
  }

  // ── ao abrir: volta a sessão do dia (se não tocou em Sair) ──
  const inicial = copiaDeHoje();
  if (inicial && !inicial.saiu && !ss.getItem(CHAVE)) {
    try { setOriginal.call(ss, CHAVE, inicial.sessao); } catch { /* sem armazenamento */ }
  }

  // ── acompanha toda mudança da sessão ──
  //  O app.js e o editor gravam a sessão no sessionStorage em
  //  lugares diferentes; ouvir ali pega todos de uma vez (inclusive
  //  quando o Supabase troca o token).
  try {
    proto.setItem = function (k, v) {
      setOriginal.call(this, k, v);
      if (this === ss && k === CHAVE) gravarCopia({ dia: hoje(), sessao: String(v), saiu: false });
    };
    proto.removeItem = function (k) {
      removeOriginal.call(this, k);
      if (this === ss && k === CHAVE) {
        //  saiu: guarda a sessão para o "Entrar" de hoje
        const c = copiaDeHoje();
        if (c) gravarCopia({ ...c, saiu: true });
      }
    };
  } catch { /* navegador não deixa: segue sem lembrar */ }

  // ── o "Sair" não derruba a sessão no Supabase ──
  //  Sem isso o token seria cancelado e o "Entrar" de volta falharia.
  try {
    const fetchOriginal = window.fetch;
    window.fetch = function (url, ...resto) {
      const u = typeof url === "string" ? url : (url && url.url) || "";
      if (/\/auth\/v1\/logout(\?|$)/.test(u) && copiaDeHoje()) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return fetchOriginal.call(this, url, ...resto);
    };
  } catch { /* sem fetch */ }

  // ── "Entrar" no mesmo dia: entra direto ──
  let entrando = false;
  async function entrarDeVolta() {
    const c = copiaDeHoje();
    if (!c || typeof restaurarLoginAdmin !== "function") return false;
    entrando = true;
    try {
      setOriginal.call(ss, CHAVE, c.sessao);
      gravarCopia({ ...c, saiu: false });
      await restaurarLoginAdmin();          // confere e renova o token se precisar
      return typeof isAdmin === "function" && isAdmin();
    } catch {
      return false;
    } finally {
      entrando = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof abrirLogin !== "function") return;
    const abrirOriginal = abrirLogin;
    abrirLogin = function (...a) {
      if (entrando) return;
      if (!copiaDeHoje()) return abrirOriginal.apply(this, a);
      entrarDeVolta().then(ok => {
        if (ok) {
          if (typeof toast === "function") toast("Bem-vindo de volta ✓");
        } else {
          //  não deu (sessão vencida no Supabase): pede a senha e
          //  esquece a cópia, para não tentar de novo à toa
          try { removeOriginal.call(ls, DIA); } catch { /* sem armazenamento */ }
          abrirOriginal.apply(this, a);
        }
      });
    };
  });
})();
