/*
 * Tom Louvores — cifra integrada ao modal do repertório.
 * Leitura do Supabase e rascunho local.
 * NÃO concede permissão de escrita na tabela cifras.
 */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  const TONS = [
    "C","C#","Db","D","D#","Eb","E","F",
    "F#","Gb","G","G#","Ab","A","A#","Bb","B",
    "Cm","C#m","Dbm","Dm","D#m","Ebm","Em","Fm",
    "F#m","Gbm","Gm","G#m","Abm","Am","A#m","Bbm","Bm"
  ];

  const select = $("cifraTomIntegrado");
  TONS.forEach(t => {
    select.add(new Option(t.replace("b", "♭"), t));
  });

  let chaveAtual = null;
  let alteradoManual = false;
  let carregamento = 0;
  let temporizador;

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function chave(m) {
    return "tl_cifra_modal_v1_" +
      (m?.id || "nova_" + normalizar($("fNome").value));
  }

  function aviso(texto) {
    $("cifraDeteccaoIntegrada").textContent = texto;
  }

  function estado(texto) {
    $("cifraEstado").textContent = texto;
  }

  function detectar() {
    const texto = $("cifraTextoIntegrado").value;

    if (!texto.trim()) {
      aviso("Cole a cifra para detectar o tom automaticamente.");
      return;
    }

    if (typeof CifrasTonalidades === "undefined") {
      aviso("Detector musical não carregado.");
      return;
    }

    const resultado = CifrasTonalidades.detect(texto);

    if (!resultado.tom) {
      aviso("Não foi possível identificar o tom. Escolha manualmente.");
      return;
    }

    if (!alteradoManual && TONS.includes(resultado.tom)) {
      select.value = resultado.tom;
    }

    aviso(
      "Tom sugerido: " + resultado.tom +
      " · Confiança: " + resultado.confianca +
      (alteradoManual ? " · Tom manual preservado" : "")
    );
  }

  function dadosAtuais() {
    return {
      titulo: $("fNome").value.trim(),
      artista: $("cifraArtistaIntegrado").value,
      tom: select.value,
      cifra: $("cifraTextoIntegrado").value
    };
  }

  function guardar() {
    if (!chaveAtual) return;
    try {
      localStorage.setItem(
        chaveAtual,
        JSON.stringify(dadosAtuais())
      );
      estado("Rascunho salvo");
    } catch (erro) {
      estado("Erro no rascunho");
      console.warn(erro);
    }
  }

  function preencher(dados) {
    $("cifraArtistaIntegrado").value = dados.artista || "";
    $("cifraTextoIntegrado").value = dados.cifra || "";
    if (TONS.includes(dados.tom)) select.value = dados.tom;
    detectar();
  }

  window.cifrasModalAbrir = async function (musica) {
    const chamada = ++carregamento;
    chaveAtual = chave(musica);
    alteradoManual = false;

    preencher({ artista: "", cifra: "", tom: "C" });
    estado("Carregando");

    let rascunho = null;
    try {
      rascunho = JSON.parse(
        localStorage.getItem(chaveAtual) || "null"
      );
    } catch (_) {}

    if (rascunho) {
      preencher(rascunho);
      estado("Rascunho local");
      return;
    }

    if (!musica) {
      estado("Nova cifra");
      return;
    }

    try {
      // Tabela pequena: encontra pelo título normalizado,
      // sem usar a API antiga do Lyra.
      const linhas = await req(
        "cifras?select=id,title,artist,base_key,chords"
      );

      if (chamada !== carregamento) return;

      const encontrada = linhas.find(
        x => normalizar(x.title) === normalizar(musica.nome)
      );

      if (encontrada) {
        preencher({
          artista: encontrada.artist,
          tom: encontrada.base_key,
          cifra: encontrada.chords
        });
        estado("Cifra existente carregada");
      } else {
        estado("Sem cifra cadastrada");
      }
    } catch (erro) {
      if (chamada !== carregamento) return;
      estado("Não foi possível consultar a cifra");
      console.warn(erro);
    }
  };

  function programarRascunho() {
    estado("Alterações não publicadas");
    clearTimeout(temporizador);
    temporizador = setTimeout(guardar, 500);
  }

  $("cifraTextoIntegrado").addEventListener("input", () => {
    clearTimeout(temporizador);
    detectar();
    programarRascunho();
  });

  $("cifraTextoIntegrado").addEventListener("paste", () => {
    alteradoManual = false;
    setTimeout(() => {
      detectar();
      programarRascunho();
    }, 0);
  });

  $("cifraArtistaIntegrado").addEventListener(
    "input", programarRascunho
  );

  $("cifraTomIntegrado").addEventListener("change", () => {
    alteradoManual = true;
    detectar();
    programarRascunho();
  });

  // Nome também participa do rascunho de novas músicas.
  $("fNome").addEventListener("input", () => {
    if (!editandoId) programarRascunho();
  });

  // Não intercepta o botão Salvar do repertório:
  // nunca grava cifras no Supabase sem autenticação real.
})();
