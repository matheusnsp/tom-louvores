// ============================================================
//  TOM LOUVORES — Lyra pela função do Supabase
//  Carregue DEPOIS do config.js.
//
//  O Lyra serve só de fonte para: nome, cantor, link do YouTube e
//  letra. A cifra continua sendo a do banco do site (tabela cifras).
//  A chave da API do Lyra fica na função "lyra" do Supabase, nunca
//  aqui (ver supabase/functions/lyra/index.ts).
//
//  Tudo aqui falha em silêncio: sem a função publicada, sem rede ou
//  com o Lyra fora do ar, o site segue como antes (letra tirada da
//  cifra, cadastro manual).
// ============================================================
window.tlLyra = (() => {
  "use strict";

  const LETRAS_CHAVE = "tl_lyra_letras_v1";
  const LETRAS_VALIDADE = 6 * 3600e3;   // 6 horas no aparelho
  const MUSICA_PREFIXO = "tl_lyra_m_";

  let indisponivel = false;             // função não publicada: não insiste
  const memoria = new Map();            // slug → música
  let letrasMapa = null;                // slug → letra
  let letrasPendente = null;

  const url = params =>
    `${CONFIG.SUPABASE_URL}/functions/v1/lyra?${new URLSearchParams(params)}`;

  async function chamar(params, ms = 8000) {
    if (indisponivel) throw new Error("Lyra indisponível");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url(params), {
        signal: ctl.signal,
        headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` },
      });
      //  404 da própria função (não publicada) ≠ 404 de música.
      if (r.status === 404 && params.acao !== "musica") indisponivel = true;
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.erro || `Lyra ${r.status}`), { status: r.status });
      return d;
    } finally {
      clearTimeout(t);
    }
  }

  const ler = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* cheio */ } };

  //  Músicas do Lyra pelo nome. [] em qualquer falha.
  async function buscar(q) {
    try { return (await chamar({ acao: "buscar", q }, 6000)).resultados || []; }
    catch { return []; }
  }

  //  Uma música: nome, cantor, youtube_url, letra. null se não houver.
  async function musica(slug) {
    if (!slug) return null;
    if (memoria.has(slug)) return memoria.get(slug);
    try {
      const m = await chamar({ acao: "musica", slug });
      memoria.set(slug, m);
      gravar(MUSICA_PREFIXO + slug, { ...m, em: Date.now() });
      return m;
    } catch (e) {
      if (e.status === 404) { memoria.set(slug, null); return null; }
      const guardada = ler(MUSICA_PREFIXO + slug);     // sem rede: o que já veio antes
      return guardada || null;
    }
  }

  //  Todas as letras, guardadas no aparelho por 6 horas. Devolve um
  //  Map slug → { title, artist, youtube_url, lyrics }.
  function letras(forcar = false) {
    if (letrasMapa && !forcar) return Promise.resolve(letrasMapa);
    if (letrasPendente) return letrasPendente;
    const guardadas = ler(LETRAS_CHAVE);
    const montar = lista => new Map((lista || []).filter(x => x && x.slug).map(x => [x.slug, x]));
    if (!forcar && guardadas && Date.now() - guardadas.em < LETRAS_VALIDADE) {
      letrasMapa = montar(guardadas.letras);
      return Promise.resolve(letrasMapa);
    }
    letrasPendente = (async () => {
      try {
        const d = await chamar({ acao: "letras" }, 30000);
        gravar(LETRAS_CHAVE, { em: Date.now(), letras: d.letras || [] });
        letrasMapa = montar(d.letras);
      } catch {
        //  sem rede ou sem função: fica com a cópia antiga, se houver
        letrasMapa = guardadas ? montar(guardadas.letras) : new Map();
      } finally {
        letrasPendente = null;
      }
      return letrasMapa;
    })();
    return letrasPendente;
  }

  //  Só a letra de uma música (mapa geral primeiro, depois a consulta).
  async function letraDe(slug) {
    if (letrasMapa && letrasMapa.get(slug)?.lyrics) return letrasMapa.get(slug).lyrics;
    const m = await musica(slug);
    return (m && m.lyrics) || "";
  }

  return { buscar, musica, letras, letraDe, get disponivel() { return !indisponivel; } };
})();
