-- ============================================================
--  TOM LOUVORES — lixeira do repertório
--
--  Rode UMA vez no Supabase do site:
--    SQL Editor → New query → cole este arquivo → Run.
--
--  Só ACRESCENTA uma coluna vazia na tabela musicas. Não apaga,
--  não altera e não move nenhuma música. Pode rodar de novo sem
--  problema ("if not exists").
--
--  Depois disso, o ✕ do site deixa de apagar: a música ganha a
--  data em "excluida_em", some do site e fica na lixeira, de onde
--  dá para restaurar. Apagar de vez só pela própria lixeira.
-- ============================================================

alter table public.musicas
  add column if not exists excluida_em timestamptz;
