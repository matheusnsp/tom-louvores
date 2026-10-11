-- ============================================================
--  TOM LOUVORES — sugestões de louvores
--
--  Rode UMA vez no Supabase do site:
--    SQL Editor → New query → cole este arquivo inteiro → Run.
--  Pode rodar de novo sem estragar nada: tudo aqui é "se não
--  existir" ou "troque pela versão nova".
--
--  O que cada um pode fazer:
--    · qualquer pessoa → sugerir (sempre entra "em análise") e ver
--    · a equipe (login) → aprovar, recusar ou voltar para análise
--
--  ATENÇÃO: hoje o login do site acontece só no navegador, então o
--  banco não sabe quem é da equipe. Por isso aprovar e recusar ficam
--  liberados para a chave pública, igual às tabelas musicas e cultos.
--  O que dá para travar já fica travado: ninguém altera o nome, o
--  link ou quem sugeriu depois de enviado, ninguém apaga sugestão
--  pela internet e ninguém sugere já "aprovado". Quando o login
--  passar para o Supabase Auth, troque "anon, authenticated" por
--  "authenticated" na regra "sugestoes: analisar".
-- ============================================================


-- ── a chave de cada link ───────────────────────────────────────
--  O mesmo louvor chega por links diferentes: youtu.be/ID,
--  youtube.com/watch?v=ID&t=30s, music.youtube.com..., o Spotify
--  com /intl-pt/ no meio. A chave tira essas diferenças, e é ela
--  que impede a mesma música de entrar duas vezes.

create or replace function public.sugestoes_chave(link text)
returns text
language sql
immutable
as $$
  select coalesce(
    'youtube:' || substring(link from '(?:youtu\.be/|[?&]v=|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})'),
    'spotify:' || substring(link from 'open\.spotify\.com/(?:intl-[a-zA-Z-]+/)?((?:track|album|playlist)/[A-Za-z0-9]+)'),
    'deezer:'  || substring(link from 'deezer\.com/(?:[a-z]{2}/)?((?:track|album)/[0-9]+)'),
    lower(regexp_replace(
      regexp_replace(btrim(link), '^https?://(www\.|m\.)?', '', 'i'),
      '([?#].*$)|(/+$)', '', 'g'))
  )
$$;


-- ── a tabela ───────────────────────────────────────────────────

create table if not exists public.sugestoes (
  id            bigint generated always as identity primary key,
  nome          text not null,
  sugerido_por  text not null,
  link          text not null,
  chave         text generated always as (public.sugestoes_chave(link)) stored,
  status        text not null default 'pendente',
  criado_em     timestamptz not null default now(),
  analisado_em  timestamptz,

  constraint sugestoes_nome_tamanho  check (char_length(btrim(nome)) between 2 and 120),
  constraint sugestoes_quem_tamanho  check (char_length(btrim(sugerido_por)) between 2 and 80),
  constraint sugestoes_link_valido   check (link ~* '^https?://[^[:space:]]+$' and char_length(link) <= 500),
  constraint sugestoes_status_valido check (status in ('pendente', 'aprovada', 'recusada'))
);

-- O mesmo louvor não entra de novo enquanto estiver em análise ou
-- aprovado. Recusado pode ser sugerido outra vez mais para frente.
create unique index if not exists sugestoes_chave_unica
  on public.sugestoes (chave) where status <> 'recusada';

create index if not exists sugestoes_status_data
  on public.sugestoes (status, criado_em desc);


-- ── data da análise ────────────────────────────────────────────
--  Preenchida pelo banco quando o status muda, e não pelo celular
--  de quem aprovou (o relógio dele pode estar errado).

create or replace function public.sugestoes_ao_analisar()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.analisado_em := case when new.status = 'pendente' then null else now() end;
  end if;
  return new;
end
$$;

drop trigger if exists sugestoes_ao_analisar on public.sugestoes;
create trigger sugestoes_ao_analisar
  before update on public.sugestoes
  for each row execute function public.sugestoes_ao_analisar();


-- ── trava contra enxurrada ─────────────────────────────────────
--  O formulário é aberto a qualquer pessoa. Se um robô achar a
--  página, ele para em 30 sugestões a cada 10 minutos, em vez de
--  encher a lista da equipe.

create or replace function public.sugestoes_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.sugestoes
      where criado_em > now() - interval '10 minutes') >= 30 then
    raise exception 'muitas sugestoes em pouco tempo'
      using errcode = 'P0001', hint = 'limite';
  end if;
  return new;
end
$$;

drop trigger if exists sugestoes_limite on public.sugestoes;
create trigger sugestoes_limite
  before insert on public.sugestoes
  for each row execute function public.sugestoes_limite();


-- ── quem pode o quê ────────────────────────────────────────────

alter table public.sugestoes enable row level security;

-- Começa do zero e libera só o necessário, coluna por coluna.
revoke all on public.sugestoes from anon, authenticated;
grant select                              on public.sugestoes to anon, authenticated;
grant insert (nome, sugerido_por, link)   on public.sugestoes to anon, authenticated;
grant update (status)                     on public.sugestoes to anon, authenticated;

drop policy if exists "sugestoes: ver" on public.sugestoes;
create policy "sugestoes: ver"
  on public.sugestoes for select
  to anon, authenticated
  using (true);

drop policy if exists "sugestoes: sugerir" on public.sugestoes;
create policy "sugestoes: sugerir"
  on public.sugestoes for insert
  to anon, authenticated
  with check (status = 'pendente' and analisado_em is null);

drop policy if exists "sugestoes: analisar" on public.sugestoes;
create policy "sugestoes: analisar"
  on public.sugestoes for update
  to anon, authenticated
  using (true)
  with check (status in ('pendente', 'aprovada', 'recusada'));
