// ============================================================
//  TOM LOUVORES — funcionamento sem internet
//
//  As cifras e as amostras de som já ficavam guardadas, mas o app
//  em si dependia da rede para abrir. Numa igreja com sinal ruim
//  isso dava tela branca justo na hora do culto.
//
//  Estratégias, por tipo de coisa:
//    · o próprio app (html, css, js) → do cache primeiro, e a rede
//      atualiza por trás para a próxima abertura
//    · as amostras de som → do cache, e só busca se faltar
//    · o banco de dados (Supabase, Lyra) → sempre da rede, com o
//      cache como rede de segurança quando ela falha
//
//  IMPORTANTE: troque o número do CACHE a cada publicação. É ele
//  que faz o navegador instalar a versão nova. Sem trocar, os js
//  e o css continuam saindo do cache antigo — a página pode ser
//  a nova e o código, o velho.
// ============================================================

const CACHE = "tom-louvores-v20";

const APP = [
  "./",
  "./index.html",
  "./repertorio.html",
  "./css/style.css",
  "./js/config.js",
  "./js/app.js",
  "./js/lyra.js",
  "./js/acordes.js",
  "./js/opcoes.js",
  "./js/seguir.js",
  "./js/afinador.js",
  "./js/metronomo.js",
  "./js/vista-lista.js",
  "./js/culto-seletor.js",
  "./js/escala-ministrante.js",
  "./js/calendario.js",
  "./js/busca-limpar.js",
  "./js/menu.js",
  "./js/paginas.js",
  "./js/atualizar.js",
  "./js/sons.js",

  //  Sem estes, o app abria offline mas sem o fundo do topo e sem
  //  o ícone na tela de início do celular.
  //
  //  São logo2 e logo3 porque são os que as páginas usam de fato:
  //  eu tinha posto "logo.png" no chute, e o resultado era guardar
  //  um arquivo que ninguém exibe e deixar de fora os dois que
  //  aparecem na tela.
  "./manifest.json",
  "./img/image.jpg",
  "./img/logo2.png",
  "./img/logo3.png",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    //  cache:"reload" força ir à rede de verdade. Sem isso, o
    //  navegador entrega do cache HTTP dele e a versão "nova" que
    //  entra no pacote é a antiga — o app trocava de cache e
    //  continuava rodando o mesmo código.
    await Promise.all(APP.map(u =>
      c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    self.skipWaiting();
  })());
});

//  A página pede para a versão nova assumir sem esperar o próximo
//  lançamento. Só então ela recarrega, já com o código novo.
self.addEventListener("message", e => {
  if (e.data && e.data.acao === "assumir") self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

const ehBanco = url =>
  url.hostname.includes("supabase") ||
  url.hostname.includes("lyra-music-database");

const ehAmostra = url => url.hostname.includes("gleitz.github.io");

//  Uma resposta só pode ser lida UMA vez. Quem for guardar precisa
//  da cópia feita antes de qualquer espera — se o clone acontecer
//  depois que a página leu o corpo, estoura
//  "Response body is already used" e nada é guardado.
//
//  Por isso o clone é a primeira linha, e o put corre solto.
function guardar(req, resp) {
  if (!resp || !resp.ok) return resp;
  const copia = resp.clone();
  caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
  return resp;
}

//  Sinal ruim é pior que sinal nenhum: sem rede o fetch falha na
//  hora, mas com rede ruim ele fica pendurado e o app não abre.
//  Passado o limite, vale o que está guardado.
function comLimite(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error("tempo esgotado")), ms);
    promessa.then(
      r => { clearTimeout(t); ok(r); },
      e => { clearTimeout(t); falha(e); },
    );
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  //  Dados: a rede manda. Só se ela falhar é que vale o que estava
  //  guardado — melhor um culto de ontem do que nada.
  if (ehBanco(url)) {
    e.respondWith((async () => {
      try {
        return guardar(req, await fetch(req));
      } catch {
        const c = await caches.match(req);
        if (c) return c;
        throw new Error("sem rede e sem cópia guardada");
      }
    })());
    return;
  }

  //  Amostras de som: uma vez baixadas, nunca mudam.
  if (ehAmostra(url)) {
    e.respondWith((async () => {
      const c = await caches.match(req);
      if (c) return c;
      return guardar(req, await fetch(req));
    })());
    return;
  }

  //  A PÁGINA em si tenta a rede primeiro. Com o cache na frente,
  //  o app instalado abria sempre a versão guardada e só trocava de
  //  código no segundo lançamento — foi por isso que o recarregar
  //  depois de baixar não funcionava no app, mas funcionava no
  //  navegador. A cópia guardada continua valendo quando falta rede
  //  ou quando ela demora demais para responder.
  if (req.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith((async () => {
      try {
        return guardar(req, await comLimite(fetch(req), 3500));
      } catch {
        return (await caches.match(req)) ||
               (await caches.match("./index.html")) ||
               new Response("sem conexão", { status: 503 });
      }
    })());
    return;
  }

  //  Os demais arquivos do app: entrega o guardado na hora e busca
  //  a versão nova por trás, para a próxima abertura já vir nova.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.match(req);
      const rede = fetch(req).then(r => guardar(req, r)).catch(() => null);
      return c || (await rede) || new Response("sem conexão", { status: 503 });
    })());
  }
});