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
    sessionStorage.setItem("tl_editor_vinculo", JSON.stringify({
      repertorioId: resultado.musica_id, titulo,
      tonsMinistrantes: pessoasParaEditor(pares), modo: "editar"
    }));
    return true;
  }

  function pessoasParaEditor(pares) {
    return pares.map(p => ({tom:p.tom, mins:(p.min_orig || p.min).split(",").map(x=>x.trim()).filter(x=>x !== "Todos")}));
  }

  window.tlPublicarCifra = async function () {
    const botao = $("ceHeaderSalvar");
    if (!botao || botao.disabled) return;

    botao.disabled = true;
    botao.textContent = "Publicando...";

    try {
      const publicado = await publicar();

      if (publicado) {
        botao.textContent = "Publicado ✓";

        alert(
          "Cifra publicada no Supabase! " +
          "Atualize o repertório para carregar a nova versão."
        );
      } else {
        botao.textContent = "Salvar";
      }
    } catch (erro) {
      console.error("Erro ao publicar cifra:", erro);
      alert("Não foi possível publicar:\n\n" + erro.message);
      botao.textContent = "Salvar";
    } finally {
      botao.disabled = false;
    }
  };
})();
