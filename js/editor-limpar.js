// ============================================================
//  TOM LOUVORES — "Limpar" na página de nova música
//  Só na cifras-editor.html, em "Nova música" (ao editar uma música
//  existente o botão não aparece: apagar os campos dela não faz
//  sentido).
//
//  Limpa tudo o que foi preenchido — nome, cantor, link, tom, cifra,
//  ministrantes e o que estava no bloco de medley — e apaga o
//  rascunho guardado neste navegador. Pede confirmação quando há
//  algo escrito, na caixa do próprio site (a mesma da exclusão de
//  música), não no alerta do navegador. Por baixo, recarrega a
//  página zerada: é o jeito mais simples de ter certeza de que nada
//  ficou para trás.
// ============================================================
(() => {
  "use strict";
  if (window.tlEditorEdicao) return;   // editando: sem botão
  const direita = document.querySelector(".header-right");
  const voltar = document.getElementById("ceVoltar");
  if (!direita) return;

  const b = document.createElement("button");
  b.type = "button";
  b.id = "ceLimpar";
  b.className = "btn-logout";
  b.title = "Limpar tudo o que foi preenchido";
  b.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg><span>Limpar</span>`;
  direita.insertBefore(b, voltar || direita.firstChild);

  const temConteudo = () =>
    ["titulo", "artista", "ceLink", "cifra"].some(id => (document.getElementById(id)?.value || "").trim())
    || document.querySelectorAll("#ceListaMin > *").length > 0
    || document.querySelectorAll("#mdEscolhidas > *").length > 0;

  //  A caixa de confirmação do site (mesmo molde da exclusão no
  //  repertório, com o botão principal dourado). Foco no Cancelar.
  function confirmar() {
    return new Promise(resolve => {
      let ov = document.getElementById("limparOverlay");
      if (!ov) {
        ov = document.createElement("div");
        ov.id = "limparOverlay";
        ov.className = "confirma-overlay";
        ov.innerHTML = `
          <div class="login-box confirma-box" role="alertdialog" aria-modal="true"
               aria-labelledby="limparTitulo" aria-describedby="limparTexto">
            <div>
              <h2 id="limparTitulo">Limpar tudo?</h2>
              <p class="login-sub" id="limparTexto">Nome, cantor, cifra e ministrantes preenchidos vão embora, e o rascunho desta música nova é apagado.</p>
            </div>
            <div class="login-actions">
              <button type="button" class="btn-login-cancel" data-r="nao">Cancelar</button>
              <button type="button" class="btn-login-submit" data-r="sim">Limpar</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
      }
      const antes = document.activeElement;
      const fechar = r => {
        ov.classList.remove("open");
        ov.removeEventListener("click", clique);
        document.removeEventListener("keydown", tecla, true);
        if (antes && antes.focus) antes.focus();
        resolve(r);
      };
      const clique = e => {
        const x = e.target.closest("[data-r]");
        if (x) fechar(x.dataset.r === "sim");
        else if (e.target === ov) fechar(false);
      };
      const tecla = e => { if (e.key === "Escape") { e.stopPropagation(); fechar(false); } };
      ov.addEventListener("click", clique);
      document.addEventListener("keydown", tecla, true);
      ov.classList.add("open");
      setTimeout(() => ov.querySelector("[data-r='nao']")?.focus(), 30);
    });
  }

  function limpar() {
    window.tlRascunhoPausado = true;   // nada volta a ser gravado antes de recarregar
    try {
      localStorage.removeItem("tom_louvores_editor_rascunho_v2_nova");
      localStorage.removeItem("tl_cifra_ministrantes_v1");
      sessionStorage.removeItem("tl_editor_vinculo");
    } catch (_) {}
    //  mantém só a origem (para o Voltar continuar certo)
    const origem = new URLSearchParams(location.search).get("origem");
    location.replace(location.pathname + (origem ? "?origem=" + encodeURIComponent(origem) : ""));
  }

  b.addEventListener("click", async () => {
    if (temConteudo() && !(await confirmar())) return;
    limpar();
  });
})();
