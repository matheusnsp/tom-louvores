/*
 * Publicação de cifras de músicas já existentes.
 * Usa a sessão Supabase do login administrativo.
 * Não modifica public.musicas nem os tons dos ministrantes.
 */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const SESSAO = "tl_supabase_admin_session_v1";

  function normalizar(valor) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugificar(valor) {
    return normalizar(valor)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function requisicao(caminho, token, opcoes = {}) {
    const resposta = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/${caminho}`,
      {
        ...opcoes,
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(opcoes.headers || {})
        }
      }
    );

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(
        `Erro ${resposta.status}: ${detalhe.slice(0, 500)}`
      );
    }

    const texto = await resposta.text();
    return texto ? JSON.parse(texto) : null;
  }

  async function autenticar() {
    let sessao;

    try {
      sessao = JSON.parse(
        sessionStorage.getItem(SESSAO) || "null"
      );
    } catch (_) {
      sessao = null;
    }

    if (!sessao?.access_token) {
      throw new Error(
        "Entre com o usuário admin no repertório " +
        "e abra novamente a edição da música."
      );
    }

    if (sessao.expires_at * 1000 < Date.now() + 60000) {
      if (!sessao.refresh_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const resposta = await fetch(
        `${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            apikey: CONFIG.SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            refresh_token: sessao.refresh_token
          })
        }
      );

      if (!resposta.ok) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const nova = await resposta.json();

      sessao = {
        access_token: nova.access_token,
        refresh_token: nova.refresh_token,
        expires_at: nova.expires_at ||
          Math.floor(Date.now() / 1000) + nova.expires_in
      };

      sessionStorage.setItem(SESSAO, JSON.stringify(sessao));
    }

    const resposta = await fetch(
      `${CONFIG.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${sessao.access_token}`
        }
      }
    );

    if (!resposta.ok) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }

    const usuario = await resposta.json();

    const admin = await requisicao(
      `cifras_admins?select=user_id&user_id=eq.${usuario.id}`,
      sessao.access_token
    );

    if (!Array.isArray(admin) || admin.length !== 1) {
      throw new Error("Sua conta não tem autorização para publicar.");
    }

    return sessao.access_token;
  }

  function paresMinistrantes() {
    const pessoas = typeof window.tlObterTonsMinistrantes === "function"
      ? window.tlObterTonsMinistrantes() : [];
    if (!pessoas.length) throw new Error("Adicione ao menos um ministrante e tom.");
    const grupos = new Map();
    for (const p of pessoas) {
      if (!p.tom || !p.min) continue;
      const nomes = grupos.get(p.tom) || [];
      if (!nomes.includes(p.min)) nomes.push(p.min);
      grupos.set(p.tom, nomes);
    }
    if (!grupos.size) throw new Error("Defina os tons dos ministrantes.");
    const pares = [...grupos].map(([tom, nomes]) => ({tom, min:nomes.join(", ")}));
    if (pares.length === 1) {
      pares[0].min_orig = pares[0].min;
      pares[0].min = "Todos";
    }
    return { pares, ministrante: [...new Set(pessoas.map(p => p.min).filter(Boolean))].join(", ") };
  }

  async function publicar() {
    const titulo = $("titulo")?.value.trim();
    const artista = $("artista")?.value.trim();
    const tom = $("tom")?.value;
    const cifra = $("cifra")?.value;
    if (!titulo || !artista || !tom || !cifra?.trim())
      throw new Error("Preencha nome, artista, tom original e a cifra completa.");
    const link = ($("ceLink")?.value || "").trim();
    if (link && !/^https?:\/\/\S+\.\S+/.test(link))
      throw new Error("Preencha o link completo, começando com https:// (ou deixe em branco).");
    const { pares, ministrante } = paresMinistrantes();
    const token = await autenticar();
    let vinculo = null;
    try { vinculo = JSON.parse(sessionStorage.getItem("tl_editor_vinculo") || "null"); }
    catch (_) {}
    const resultado = await requisicao("rpc/salvar_louvor_com_cifra", token, {
      method: "POST",
      body: JSON.stringify({
        p_repertorio_id: vinculo?.repertorioId || null,
        p_nome: titulo,
        p_artista: artista,
        p_tom_original: tom,
        p_chords: cifra,
        p_slug: slugificar(titulo),
        p_tons: JSON.stringify(pares),
        p_ministrante: ministrante
      })
    });
    if (!resultado?.musica_id || !resultado?.cifra_id)
      throw new Error("O banco não confirmou ambos os registros.");

    //  Link para ouvir: vai nas observações da música no repertório,
    //  de onde saem os botões YouTube/Spotify do modal. Se falhar, a
    //  música já está salva: avisa sem desfazer nada.
    try {
      await salvarLink(resultado.musica_id, link, token);
    } catch (erro) {
      console.warn("Link não salvo:", erro);
      window.tlLinkFalhou = true;
    }
    //  Salvo: o rascunho não tem mais razão de existir. A partir daqui
    //  a página é a edição desta música (rascunho com a chave dela).
    try {
      localStorage.removeItem(window.tlRascunhoChave);
      localStorage.removeItem("tom_louvores_editor_rascunho_v2_nova");
      localStorage.removeItem("tl_cifra_ministrantes_v1");
    } catch (_) {}
    window.tlRascunhoChave = "tom_louvores_editor_rascunho_v2_m" + resultado.musica_id;
    window.tlRascunhoPausado = true;
    try { history.replaceState(null, "", "cifras-editor.html?origem=repertorio&modo=editar"); } catch (_) {}
    sessionStorage.setItem("tl_editor_vinculo", JSON.stringify({
      repertorioId: resultado.musica_id, titulo,
      tonsMinistrantes: pessoasParaEditor(pares), modo: "editar"
    }));
    return titulo;
  }

  //  Troca o link antigo pelo novo nas observações (ou acrescenta,
  //  ou tira, se o campo foi apagado). O resto do texto fica igual.
  async function salvarLink(musicaId, link, token) {
    const antigo = window.tlLinkOriginal || "";
    if (link === antigo) return;
    const linhas = await requisicao(
      `musicas?select=observacoes&id=eq.${encodeURIComponent(musicaId)}`, token);
    let obs = (linhas && linhas[0] && linhas[0].observacoes) || "";
    if (antigo && obs.includes(antigo)) obs = obs.replace(antigo, link);
    else if (link && !obs.includes(link)) obs = (obs.trim() ? obs.trim() + "\n" : "") + link;
    obs = obs.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    await requisicao(`musicas?id=eq.${encodeURIComponent(musicaId)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ observacoes: obs }),
    });
    window.tlLinkOriginal = link;
  }

  //  Erro técnico do banco → frase que dá para entender e resolver.
  function erroAmigavel(erro) {
    const m = String(erro && erro.message || erro || "");
    if (/não tem autorização/i.test(m))
      return { titulo: "Sem permissão", texto: "Esta conta entrou, mas não está autorizada a salvar músicas. Fale com quem administra o site." };
    if (/Sessão expirada|Sessão inválida|Entre com o usuário admin|401|JWT|token/i.test(m))
      return { titulo: "Entre de novo", texto: "Sua sessão de administrador expirou. Volte ao repertório, entre de novo e salve outra vez. O que você escreveu continua guardado aqui." };
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m))
      return { titulo: "Sem conexão", texto: "Não deu para falar com o servidor. Confira a internet e toque em Salvar de novo. O que você escreveu continua guardado aqui." };
    if (/^Preencha|^Defina/.test(m))
      return { titulo: "Falta preencher", texto: m };
    return { titulo: "Não deu para salvar", texto: "Algo deu errado ao salvar a música. Tente de novo; se continuar, mande os detalhes abaixo para quem cuida do site.", detalhe: m };
  }

  function pessoasParaEditor(pares) {
    return pares.map(p => ({tom:p.tom, mins:(p.min_orig || p.min).split(",").map(x=>x.trim()).filter(x=>x !== "Todos")}));
  }

  window.tlPublicarCifra = async function () {
    const botao = $("ceHeaderSalvar");
    if (!botao || botao.disabled) return;

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
      const titulo = await publicar();
      botao.textContent = "Salvo ✓";
      setTimeout(() => { botao.textContent = "Salvar"; }, 2500);

      const voltarPara = (() => {
        const o = sessionStorage.getItem("tl_editor_origem");
        return ["index.html", "repertorio.html", "sugestoes.html"].includes(o) ? o : "repertorio.html";
      })();
      const semLink = window.tlLinkFalhou;
      window.tlLinkFalhou = false;
      tlAviso({
        tipo: "ok",
        titulo: "Música salva",
        texto: `“${titulo}” já está no repertório. Nos outros aparelhos, a versão nova aparece quando o site for aberto ou atualizado.` +
          (semLink ? " Só o link para ouvir não foi salvo: tente salvar de novo." : ""),
        acoes: [
          { rotulo: "Continuar editando" },
          { rotulo: voltarPara === "index.html" ? "Ir para os cultos" : voltarPara === "sugestoes.html" ? "Ir para as sugestões" : "Ir para o repertório",
            primario: true, aoTocar: () => { location.href = voltarPara; } },
        ],
      });
    } catch (erro) {
      console.error("Erro ao salvar a música:", erro);
      botao.textContent = "Salvar";
      tlAviso({ tipo: "erro", ...erroAmigavel(erro) });
    } finally {
      botao.disabled = false;
    }
  };
})();
