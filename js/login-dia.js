// ============================================================
//  TOM LOUVORES — o login vale o dia inteiro neste aparelho
//  Carregue PRIMEIRO, no <head>, antes de qualquer outro script.
//
//  O login do admin fica no sessionStorage, que o navegador apaga
//  quando a aba ou o app fecha. Por isso, sair do site e voltar
//  pedia a senha de novo.
//
//  Este arquivo guarda uma cópia da mesma sessão no aparelho
//  (localStorage) junto com a data de hoje. Ao abrir o site de novo
//  no mesmo dia, a cópia volta para o sessionStorage antes de o
//  app.js procurar o login — e tudo segue como se a aba nunca
//  tivesse fechado. Nada muda no login em si (mesmas variáveis,
//  mesmo Supabase).
//
//    · virou o dia (meia-noite de Brasília) → a cópia é apagada
//    · tocar em "Sair" → o login acaba de verdade, cópia junto
//    · a sessão renovada (o Supabase troca o token) → a cópia é
//      atualizada na hora, para não guardar um token já trocado
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

  // ── volta a sessão do dia, se a aba começou sem ela ──
  try {
    const guardada = JSON.parse(ls.getItem(DIA) || "null");
    if (guardada && guardada.dia === hoje() && guardada.sessao) {
      if (!ss.getItem(CHAVE)) setOriginal.call(ss, CHAVE, guardada.sessao);
    } else if (guardada) {
      ls.removeItem(DIA);
    }
  } catch { /* cópia estragada: ignora */ }

  // ── acompanha toda mudança da sessão ──
  //  O app.js e o editor gravam a sessão no sessionStorage em
  //  lugares diferentes; ouvir ali pega todos de uma vez.
  try {
    proto.setItem = function (k, v) {
      setOriginal.call(this, k, v);
      if (this === ss && k === CHAVE) {
        try { setOriginal.call(ls, DIA, JSON.stringify({ dia: hoje(), sessao: String(v) })); } catch { /* cheio */ }
      }
    };
    proto.removeItem = function (k) {
      removeOriginal.call(this, k);
      if (this === ss && k === CHAVE) {
        try { removeOriginal.call(ls, DIA); } catch { /* sem armazenamento */ }
      }
    };
  } catch { /* navegador não deixa: segue sem lembrar */ }
})();
