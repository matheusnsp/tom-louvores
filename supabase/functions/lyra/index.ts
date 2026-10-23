// ============================================================
//  TOM LOUVORES — ponte para a API do Lyra (Supabase Edge Function)
//
//  O site não fala com o Lyra direto: a chave da API ficaria
//  visível para qualquer um no código da página. Esta função guarda
//  a chave em segredo (LYRA_API_KEY) e só repassa três consultas de
//  leitura. Nada aqui grava no Lyra nem no Supabase.
//
//    ?acao=buscar&q=...   → músicas do Lyra pelo nome (até 10)
//    ?acao=musica&slug=.. → nome, cantor, link do YouTube e letra
//    ?acao=letras         → letras de todas as músicas (busca na
//                           letra e uso offline). Guardada 15 min.
//
//  Publicar (uma vez):
//    supabase secrets set LYRA_API_KEY=<chave nova do Lyra>
//    supabase functions deploy lyra
// ============================================================

const LYRA = "https://database.invbotafogo.com.br/api/v1";

//  Só o site chama. Outro domínio recebe 403.
const ORIGENS = [
  "https://louvores.invbotafogo.com.br",
  "https://matheusnsp.github.io",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
];

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

let cacheLetras: { em: number; corpo: string } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function cabecalhos(origem: string) {
  return {
    "Access-Control-Allow-Origin": ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

function json(dados: unknown, status: number, extra: Record<string, string>) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...extra, "Content-Type": "application/json; charset=utf-8" },
  });
}

const limpo = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

Deno.serve(async (req) => {
  const origem = req.headers.get("origin") || "";
  const cors = cabecalhos(origem);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ erro: "Só leitura." }, 405, cors);
  if (origem && !ORIGENS.includes(origem)) return json({ erro: "Origem não permitida." }, 403, cors);

  const chave = Deno.env.get("LYRA_API_KEY");
  if (!chave) return json({ erro: "LYRA_API_KEY não configurada no Supabase." }, 500, cors);

  const lyra = (caminho: string) =>
    fetch(LYRA + caminho, { headers: { Authorization: `Bearer ${chave}` } });

  const u = new URL(req.url);
  const acao = u.searchParams.get("acao");

  try {
    // ── buscar pelo nome ──
    if (acao === "buscar") {
      const q = (u.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 80) return json({ resultados: [] }, 200, cors);
      const r = await lyra(`/songs?q=${encodeURIComponent(q)}&limit=10`);
      if (!r.ok) return json({ erro: `Lyra respondeu ${r.status}.` }, 502, cors);
      const d = await r.json();
      const resultados = (d.results || []).map((s: Record<string, unknown>) => ({
        slug: s.slug, title: limpo(s.title), artist: limpo(s.artist),
      })).filter((s: { slug: unknown }) => typeof s.slug === "string");
      return json({ resultados }, 200, { ...cors, "Cache-Control": "public, max-age=60" });
    }

    // ── uma música ──
    if (acao === "musica") {
      const slug = u.searchParams.get("slug") || "";
      if (!SLUG.test(slug)) return json({ erro: "Slug inválido." }, 400, cors);
      const r = await lyra(`/songs/${slug}`);
      if (r.status === 404) return json({ erro: "Não encontrada no Lyra." }, 404, cors);
      if (!r.ok) return json({ erro: `Lyra respondeu ${r.status}.` }, 502, cors);
      const s = await r.json();
      return json({
        slug: s.slug,
        title: limpo(s.title),
        artist: limpo(s.artist),
        base_key: limpo(s.base_key),
        youtube_url: limpo(s.youtube_url),
        lyrics: limpo(s.lyrics),
        updated_at: s.updated_at || null,
      }, 200, { ...cors, "Cache-Control": "public, max-age=300" });
    }

    // ── todas as letras ──
    //  A lista geral do Lyra (/sync) não traz a letra, então cada
    //  música é lida uma a uma, 8 de cada vez, e o resultado fica
    //  guardado 15 minutos para não repetir o trabalho a cada visita.
    if (acao === "letras") {
      if (cacheLetras && Date.now() - cacheLetras.em < CACHE_MS) {
        return new Response(cacheLetras.corpo, {
          headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" },
        });
      }
      const r = await lyra("/sync");
      if (!r.ok) return json({ erro: `Lyra respondeu ${r.status}.` }, 502, cors);
      const lista: { slug: string }[] = ((await r.json()).songs || [])
        .filter((s: { slug?: unknown }) => typeof s.slug === "string" && SLUG.test(s.slug as string));

      const saida: Record<string, unknown>[] = [];
      let i = 0;
      const trabalhador = async () => {
        while (i < lista.length) {
          const s = lista[i++];
          try {
            const rm = await lyra(`/songs/${s.slug}`);
            if (!rm.ok) continue;
            const m = await rm.json();
            saida.push({
              slug: m.slug, title: limpo(m.title), artist: limpo(m.artist),
              youtube_url: limpo(m.youtube_url), lyrics: limpo(m.lyrics),
            });
          } catch { /* uma música com erro não derruba as outras */ }
        }
      };
      await Promise.all(Array.from({ length: 8 }, trabalhador));

      const corpo = JSON.stringify({ letras: saida, em: new Date().toISOString() });
      cacheLetras = { em: Date.now(), corpo };
      return new Response(corpo, {
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" },
      });
    }

    return json({ erro: "Ação desconhecida. Use buscar, musica ou letras." }, 400, cors);
  } catch (e) {
    return json({ erro: "Falha ao falar com o Lyra.", detalhe: String(e) }, 502, cors);
  }
});
