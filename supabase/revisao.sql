-- ============================================================
--  TOM LOUVORES — músicas marcadas para revisão
--
--  Rode UMA vez no Supabase do site:
--    SQL Editor → New query → cole este arquivo → Run.
--
--  Só ACRESCENTA duas colunas vazias na tabela musicas. Não apaga,
--  não altera e não move nenhuma música. Pode rodar de novo sem
--  problema ("if not exists").
--
--    revisar_em    → quando foi marcada (vazio = não precisa revisar)
--    revisar_nota  → o que revisar ("tom errado", "falta a ponte"…)
--
--  As regras de acesso são as mesmas da tabela: quem já edita a
--  música pelo site consegue marcar e desmarcar.
-- ============================================================

alter table public.musicas
  add column if not exists revisar_em   timestamptz,
  add column if not exists revisar_nota text;
