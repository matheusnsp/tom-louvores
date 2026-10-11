# 🎵 Tom Louvores — INVB

Repertório do louvor da Igreja Nova Vida de Botafogo: músicas, tons, ministrantes, cifras e a escala dos cultos, num lugar só.

No ar em **https://louvores.invbotafogo.com.br**

---

## Como o site funciona

- **Site estático**: HTML, CSS e JavaScript puro, sem build e sem servidor próprio. O que está na `main` é o que vai para o ar.
- **Hospedagem**: GitHub Pages. O arquivo `CNAME` aponta o domínio. Depois de um `git push`, o site atualiza sozinho em um ou dois minutos.
- **Dados**: Supabase (tabelas `musicas`, `cultos` e `sugestoes`). O site fala com ele pela chave pública (anon), que fica no `js/config.js` — essa chave pode ficar no código. **A chave secreta (service_role) nunca entra aqui.**
- **Escala mensal dos ministrantes**: lida do Firebase (projeto `escala-lideres`), também configurado no `js/config.js`.
- **Funciona offline**: o `sw.js` guarda os arquivos no celular. Toda vez que mudar algum arquivo do site, aumente o número em `const CACHE = "tom-louvores-vNN"` no `sw.js`, senão quem já abriu o site continua vendo a versão antiga.

---

## Páginas

| Página | O que tem |
|---|---|
| `index.html` | Cultos da semana: o que vai ser tocado, em que tom e quem ministra |
| `repertorio.html` | Todas as músicas, em lista ou em cards, com busca e filtros |
| `sugestoes.html` | Qualquer pessoa sugere um louvor; a equipe aprova ou recusa |

---

## Arquivos

```
├── index.html, repertorio.html, sugestoes.html   → as páginas
├── css/style.css          → estilo geral
├── js/
│   ├── config.js          → ⚙️ Supabase, Firebase, cultos fixos e MINISTRANTES
│   ├── app.js             → base: login, repertório, cultos, modais
│   ├── paginas.js         → o que muda de uma página para outra e o menu de abas
│   ├── vista-lista.js     → repertório em lista (A–Z, por tom, recentes)
│   ├── lyra.js            → leitor de cifras
│   ├── sugestoes.js       → aba de sugestões
│   └── …                  → um arquivo por recurso (afinador, metrônomo, chat…)
├── supabase/sugestoes.sql → tabela das sugestões (rodar uma vez)
├── supabase/lixeira.sql   → ativa a lixeira (rodar uma vez)
├── dev/checar.sh          → conferência pelo terminal
├── sw.js, manifest.json   → app instalável e offline
└── CNAME                  → domínio do GitHub Pages
```

---

## Tarefas comuns

### Entrou ou saiu um ministrante

Edite **só** a lista `MINISTRANTES` no `js/config.js`:

```js
const MINISTRANTES = ["Raphaela", "Daniela", "Cris", "Mirian", "Pr. Humberto"];
```

Os filtros, os formulários, a escala e o número de ministrantes no topo do repertório saem dessa lista. Escreva o nome igual ao que está na escala. Depois aumente o `CACHE` no `sw.js`.

### Novo culto fixo na semana

Acrescente uma linha em `CULTOS_FIX`, no `js/config.js` (tem um exemplo comentado lá).

### Publicar uma mudança

```bash
bash dev/checar.sh      # confere sintaxe e arquivos faltando
git add -A && git commit -m "o que mudou" && git push
```

---

## 🗑 Lixeira e backup

Com login, o repertório mostra dois botões logo abaixo dos filtros:

- **Lixeira**: o ✕ de uma música não apaga mais, ele manda para a lixeira. Lá dá para **restaurar** ou **apagar de vez** (só esse apaga do banco, com confirmação).
  **Para ativar:** rode uma vez o `supabase/lixeira.sql` no SQL Editor do Supabase. Ele só acrescenta uma coluna vazia (`excluida_em`) e não mexe em nenhuma música. Antes de rodar, o ✕ avisa que falta ativar e não exclui nada.
- **Baixar backup**: baixa um `.json` com o repertório (inclusive a lixeira), os cultos, as sugestões e o texto das cifras. Guarde no Drive de tempos em tempos.

## 📊 Agrupar por uso e busca na letra

- **Agrupar → Uso**: separa o repertório em mais tocadas, tocadas uma vez, sem tocar há 3 meses e ainda não tocadas, contando os cultos montados no site.
- **Busca**: a partir de 3 letras, procura também dentro das letras das músicas que têm cifra, e mostra o verso que bateu.

## 💡 Sugestões de louvores

A aba **Sugestões** (`sugestoes.html`) deixa qualquer pessoa sugerir um louvor: nome, quem sugeriu e o link (YouTube, Spotify, Deezer…). A sugestão entra **em análise**; com login, a equipe **aprova** ou **recusa**. Quem não está logado vê as aprovadas e quantas estão esperando; com login, a aba mostra o número de sugestões esperando em qualquer página.

**Para ativar:** no Supabase do site, abra **SQL Editor → New query**, cole o arquivo `supabase/sugestoes.sql` e clique em **Run** (uma vez só).

**Se um dia aparecer spam** (sugestões em massa de um robô), apague no mesmo SQL Editor o que não foi aprovado nas últimas 24 horas:

```sql
delete from public.sugestoes where status <> 'aprovada' and criado_em > now() - interval '1 day';
```

---

## 🛠 Como usar

- **Entrar**: "🔒 Entrar", no topo. Sem login, o site é só leitura.
- **Adicionar música**: "+ Nova música", com nome, tom e ministrante.
- **Editar**: abra a música e use o lápis. **Excluir**: o ✕ na linha da lista (com login).
- **Filtrar**: busca, ministrante e tom; no repertório, agrupe por letra, tom ou mais recentes.
- **Montar o culto**: na página inicial, escolha as músicas de cada culto e o tom.

### Sobre o login

Hoje o login acontece só no navegador: ele esconde e mostra os botões de edição, mas o banco não sabe quem é da equipe. Para proteger de verdade, o próximo passo seria passar o login para o Supabase Auth.
