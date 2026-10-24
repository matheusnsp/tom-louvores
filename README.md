# 🎵 Tom Louvores — INVB

Repertório do louvor da Igreja Nova Vida de Botafogo: músicas, tons, ministrantes, cifras e a escala dos cultos, num lugar só.

No ar em **https://louvores.invbotafogo.com.br**

---

## Como o site funciona

- **Site estático**: HTML, CSS e JavaScript puro, sem build e sem servidor próprio. O que está na `main` é o que vai para o ar.
- **Hospedagem**: GitHub Pages. O arquivo `CNAME` aponta o domínio. Depois de um `git push`, o site atualiza sozinho em um ou dois minutos.
- **Dados**: Supabase (tabelas `musicas`, `cultos` e `sugestoes`). O site fala com ele pela chave pública (anon), que fica no `js/config.js` — essa chave pode ficar no código. **A chave secreta (service_role) nunca entra aqui.**
- **Escala mensal dos ministrantes**: lida do Firebase (projeto `escala-lideres`), também configurado no `js/config.js`.
- **Login**: Supabase Auth. Só entra quem tem senha **e** está na tabela `cifras_admins`; o login vale o dia inteiro no aparelho (`js/login-dia.js`).
- **Funciona offline**: o `sw.js` guarda os arquivos no celular. Toda vez que mudar algum arquivo do site, aumente o número em `const CACHE = "tom-louvores-vNN"` no `sw.js`, senão quem já abriu o site continua vendo a versão antiga.

---

## 🎸 Leitor de cifras

- **Mapa da música**: as partes entre colchetes (`[Intro]`, `[Refrão]`), os riffs (`Riff 2` numa linha de acordes) e rótulos como `Solo:` viram botões no topo do leitor. Um toque leva até ali e o botão fica marcado.
- **Comentários**: linha que começa com `//` é comentário de quem escreveu a cifra. Aparece apagada e nunca vira botão. Ex.: `// no final sobe meio tom`.
- **1 ou 2 colunas** (tablet e computador): em 2 colunas a cifra vira páginas do tamanho da tela. Vira com toque nas laterais, arrasto, pedal Bluetooth ou teclado (PageDown / espaço / ↓).

---

## 📤 Compartilhar

- **Lista do culto**: o botão **Compartilhar** de cada culto abre a janela de compartilhar do celular (WhatsApp, Telegram…). No computador, ele copia a lista. A mensagem sai assim:

  ```
  *Domingo · Manhã — 26/10*
  Ministrante: Daniela

  1. Nome da música — G
  2. Outra música — D

  Ofertório:
  - Música do ofertório — A

  Cifras e tons: https://louvores.invbotafogo.com.br
  ```

- **Prévia do link**: quem manda o endereço do site no WhatsApp ou no Instagram vê o card com o logo, o nome e a descrição (`img/compartilhar.png`, 1200×630, e as tags `og:` no `<head>` de cada página). O WhatsApp guarda a prévia antiga por um tempo; se não mudar, mande o link com `?v=2` no final.

---

## 📱 Ícone do app

O ícone do app instalado tem fundo preto e fica em arquivos próprios (não use o `logo2.png`, que é transparente: o Android põe fundo branco nele):

| Arquivo | Onde aparece |
|---|---|
| `img/icone-192.png`, `img/icone-512.png` | app instalado e avisos do chat |
| `img/icone-maskable-512.png` | Android (logo menor, para caber no círculo/gota do sistema) |
| `img/apple-touch-icon.png` | iPhone (180×180) |
| `img/favicon-48.png` | aba do navegador |

Quem já tinha instalado o app pode continuar vendo o ícone antigo: no Android, remova o app da tela inicial e instale de novo pelo Chrome (⋮ → Instalar app).

---

## 🎨 Identidade visual

O site segue a identidade da INVB (a mesma do site principal):

| Token (`css/style.css`) | Valor | Uso |
|---|---|---|
| `--gold` | `#E6B23E` | o dourado do V: tom, data, ação principal |
| `--gold-hi` | `#F6D27A` | hover |
| `--black` | `#0B0B0C` | fundo |
| `--font-display` | Fraunces | títulos |
| `--font-ui` | Montserrat | todo o resto |
| `--font-tom` | Montserrat 800 | os tons (G, Bm, F#) |

Para trocar a cor de destaque do site inteiro, mude só `--gold`, `--gold-hi` e `--gold-rgb` (o mesmo dourado em números, para as transparências). Os arquivos em `js/` usam esses mesmos tokens no CSS que injetam.

---

## Páginas

| Página | O que tem |
|---|---|
| `index.html` | Cultos da semana: o que vai ser tocado, em que tom e quem ministra |
| `repertorio.html` | Todas as músicas, em lista ou em cards, com busca e filtros |
| `sugestoes.html` | Qualquer pessoa sugere um louvor; a equipe aprova ou recusa |
| `cifras-editor.html` | Editor de cifras (com login) |

---

## Arquivos

```
├── index.html, repertorio.html, sugestoes.html   → as páginas
├── cifras-editor.html     → editor de cifras
├── css/style.css          → estilo geral
├── js/
│   ├── config.js          → ⚙️ Supabase, Firebase, cultos fixos e MINISTRANTES
│   ├── app.js             → base: login, repertório, cultos, modais
│   ├── paginas.js         → o que muda de uma página para outra e o menu de abas
│   ├── vista-lista.js     → repertório em lista (A–Z, por tom, recentes)
│   ├── lyra.js            → leitor de cifras
│   ├── sugestoes.js       → aba de sugestões
│   ├── login-dia.js       → mantém o login o dia todo no aparelho
│   └── …                  → um arquivo por recurso (afinador, metrônomo, chat…)
├── img/                   → logo do topo, ícones do app e imagem de compartilhar
├── supabase/sugestoes.sql → tabela das sugestões (rodar uma vez)
├── supabase/lixeira.sql   → ativa a lixeira (rodar uma vez)
├── supabase/revisao.sql   → marcar músicas para revisão (rodar uma vez)
├── supabase/functions/lyra → ponte para a API do Lyra (guarda a chave em segredo)
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
bash dev/checar.sh      # confere sintaxe, arquivos faltando e se o CACHE foi trocado
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

O login é do Supabase Auth: a senha é conferida pelo Supabase, e o site só libera a edição se o usuário estiver na tabela `cifras_admins`. As gravações vão com o token de quem entrou.

O que protege o banco de verdade são as **regras (RLS) de cada tabela** no Supabase, e não os botões escondidos. Ao criar uma tabela ou regra nova, deixe a gravação só para quem está em `cifras_admins`:

```sql
using (exists (select 1 from public.cifras_admins a where a.user_id = auth.uid()))
```

**Pendente:** em `supabase/sugestoes.sql`, aprovar/recusar (`update`) ainda está liberado para qualquer visitante pela API. Vale trocar a regra `sugestoes: analisar` para usar a condição acima, com `to authenticated`.
