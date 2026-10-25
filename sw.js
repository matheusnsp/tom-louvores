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
//    · o banco de dados (Supabase) → sempre da rede, com o
//      cache como rede de segurança quando ela falha
//
//  IMPORTANTE: troque o número do CACHE a cada publicação. É ele
//  que faz o navegador instalar a versão nova. Sem trocar, os js
//  e o css continuam saindo do cache antigo — a página pode ser
//  a nova e o código, o velho.
// ============================================================

const CACHE = "tom-louvores-v127";

const APP = [
  "./js/tons-mobile.js",
  "./css/tons-mobile.css",
  "./css/editor.css",
  "./css/header.css",
  "./js/ferramentas-lista.js",
  "./js/artista.js",
  "./js/aviso.js",
  "./js/lyra-api.js",
  "./js/editor-lyra.js",
  "./js/editor-origem-sugestoes.js",
  "./css/responsivo-global.css",
  "./css/seletores-unificados.css",
  "./js/cifras-publicar.js",
  "./js/remover-atalho-cifras.js",
  "./js/editor-navegacao.js",
  "./js/cifras-vinculo.js",
  "./js/cifras-modal.js",
  "./js/cifras-tonalidades.js",
  "./cifras-editor.html",
  "./",
  "./index.html",
  "./repertorio.html",
  "./sugestoes.html",
  "./escala.html",
  "./css/style.css",
  "./js/config.js",
  "./js/app.js",
  "./js/lyra.js",
  "./js/lista-ministrantes.js",
  "./js/quebra.js",
  "./js/chat.js",
  "./js/chat-aviso.js",
  "./js/chat-rapido.js",
  "./js/login-dia.js",
  "./js/leitor-editar.js",
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
  "./js/sugestoes.js",
  "./js/escala.js",
  "./js/cantores.js",
  "./js/atualizar.js",
  "./js/sons.js",
  "./js/uso.js",
  "./js/busca-letra.js",
  "./js/lixeira.js",
  "./js/revisao.js",
  "./js/leitor-palco.js",
  "./js/arrastar.js",
  "./js/graus.js",
  "./js/ministrante-largura.js",
  "./js/acorde-detalhes.js",

  //  Sem estes, o app abria offline mas sem o fundo do topo e sem
  //  o ícone na tela de início do celular.
  //
  //  logo2 é o do topo; os icone-* são os quadrados de fundo preto
  //  do app instalado, da aba do navegador e dos avisos do chat.
  "./manifest.json",
  "./img/image.jpg",
  "./img/logo2.png",
  "./img/icone-192.png",
  "./img/icone-512.png",
  "./img/icone-maskable-512.png",
  "./img/apple-touch-icon.png",
  "./img/favicon-48.png",
  "./img/logo-novavida.png",
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
  url.hostname === "database.invbotafogo.com.br";

const ehAmostra = url => url.hostname.includes("gleitz.github.io");

//  A fonte do Google: sem isto, cada troca de aba esperava o
//  servidor do Google responder antes de pintar a tela (era o
//  maior atraso no 4G). O pedido do css não é CORS, então a
//  resposta chega "opaca" — dá para guardar, só não dá para ler.
const ehFonte = url =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

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
    const authHeader = req.headers.get("Authorization") || "";
    let usuarioPrivado = false;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const jwt = authHeader.slice(7);
        const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
        usuarioPrivado = payload.role === "authenticated";
      } catch (_) { usuarioPrivado = true; }
    }
    if (usuarioPrivado) {
      e.respondWith(fetch(req));
      return;
    }
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

  //  Fonte: a guardada sai na hora; a rede atualiza por trás.
  if (ehFonte(url)) {
    e.respondWith((async () => {
      const c = await caches.match(req);
      const rede = fetch(req).then(r => {
        if (r && (r.ok || r.type === "opaque")) {
          const copia = r.clone();
          caches.open(CACHE).then(k => k.put(req, copia)).catch(() => {});
        }
        return r;
      }).catch(() => null);
      if (c) { e.waitUntil(rede); return c; }
      return (await rede) || new Response("", { status: 503 });
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
  //  Troca de aba DENTRO do site (veio de outra página nossa): a
  //  página guardada sai na hora e a rede atualiza por trás, como
  //  o css e o js. Esperar a rede aqui custava de 0,1s a 3,5s a
  //  cada toque numa aba. A abertura do app continua indo à rede
  //  primeiro, pelo motivo explicado logo abaixo.
  const interna = (req.mode === "navigate" || url.pathname.endsWith(".html")) &&
    url.origin === location.origin && req.referrer &&
    new URL(req.referrer).origin === location.origin;
  if (interna) {
    e.respondWith((async () => {
      const c = await caches.match(req);
      const rede = fetch(req).then(r => guardar(req, r)).catch(() => null);
      if (c) { e.waitUntil(rede); return c; }
      return (await rede) ||
             (await caches.match("./index.html")) ||
             new Response("sem conexão", { status: 503 });
    })());
    return;
  }

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

//  Toque na notificação do chat: traz de volta o app que estava
//  aberto e pede para ele abrir o painel. Sem nenhum aberto, abre
//  o site.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const dados = e.notification.data || {};
  if (dados.abrirChat === true) {
    e.waitUntil((async () => {
      const abertos = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (abertos.length === 0) return self.clients.openWindow("./");
      await abertos[0].focus().catch(() => {});
      abertos[0].postMessage({ acao: "abrir-chat" });
    })());
  }
});
