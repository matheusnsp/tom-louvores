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

  async function publicar() {
    const titulo = $("titulo")?.value.trim();
    const artista = $("artista")?.value.trim();
    const tom = $("tom")?.value;
    const cifra = $("cifra")?.value;

    if (!titulo || !artista || !tom || !cifra?.trim()) {
      throw new Error(
        "Preencha nome, artista, tom original e a cifra completa."
      );
    }

    const token = await autenticar();

    // Primeiro confirma que a música existe no repertório.
    const musicas = await requisicao(
      "musicas?select=id,nome",
      token
    );

    const encontradas = musicas.filter(
      m => normalizar(m.nome) === normalizar(titulo)
    );

    if (encontradas.length !== 1) {
      throw new Error(
        encontradas.length === 0
          ? "Essa música ainda não existe no repertório. " +
            "O cadastro de novas músicas será integrado separadamente."
          : "Há mais de uma música com esse nome. " +
            "Não é seguro escolher qual atualizar."
      );
    }

    // Busca por título exato normalizado, independentemente do slug.
    const cifras = await requisicao(
      "cifras?select=id,slug,title,artist",
      token
    );

    const correspondentes = cifras.filter(
      c => normalizar(c.title) === normalizar(titulo)
    );

    if (correspondentes.length > 1) {
      throw new Error(
        "Há várias cifras com esse título. " +
        "A atualização precisa ser resolvida manualmente."
      );
    }

    const existente = correspondentes[0];

    if (
      existente &&
      existente.artist &&
      normalizar(existente.artist) !== normalizar(artista)
    ) {
      const confirmado = confirm(
        `A cifra "${titulo}" está registrada como ` +
        `"${existente.artist}". Atualizar para "${artista}"?`
      );

      if (!confirmado) return false;
    }

    const dados = {
      title: titulo,
      artist: artista,
      base_key: tom,
      chords: cifra
    };

    let resultado;

    if (existente) {
      resultado = await requisicao(
        `cifras?id=eq.${existente.id}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify(dados)
        }
      );
    } else {
      const slug = slugificar(titulo);

      if (cifras.some(c => c.slug === slug)) {
        throw new Error(
          "Já existe uma cifra usando esse identificador."
        );
      }

      resultado = await requisicao(
        "cifras",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            id: crypto.randomUUID(),
            slug,
            ...dados
          })
        }
      );
    }

    if (!Array.isArray(resultado) || resultado.length !== 1) {
      throw new Error(
        "O banco não confirmou a gravação de um registro."
      );
    }

    return true;
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
