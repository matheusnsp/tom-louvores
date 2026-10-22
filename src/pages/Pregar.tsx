import { lerVersao } from '../lib/preferencias'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { defBloco, ehBloco, itensDaLista } from '../lib/blocos'
import { alternarTelaCheia as trocarTelaCheia } from '../lib/telaCheia'
import AjudaTelaCheia from '../components/AjudaTelaCheia'
import { FaixaAoVivo, PainelAoVivo, RespostasAoVivo, type AoVivo } from '../components/AulaAoVivo'
import { aceitaResposta, ehMultipla, linkResponder, useAulaAoVivo } from '../lib/aoVivo'
import { Link, useParams } from 'react-router-dom'
import {
  Check, BookOpen, Cast, ChartNoAxesColumn, ChevronDown, Radio, Clock, ExternalLink, Target, Timer, ChevronLeft, Maximize, Minus, MonitorPlay, Pause, Play, Plus, RotateCcw, Settings, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Mensagem, Slide, Topico } from '../lib/tipos'
import {
  parseReferencia, formatarReferencia, lerCapitulo, lerReferencia, nomeDoLivro, dividirReferencias,
} from '../lib/biblia'
import { CHAVE_TELAO, codigoValido, useEmissorTelao, type SlideTelao } from '../lib/telao'
import { usePinca } from '../lib/pinca'

type SlideVersiculo = Extract<SlideTelao, { tipo: 'versiculo' }>

/* Tamanho da letra: escala contínua (pinça ou botões) aplicada por variáveis CSS */
const tam = { titulo: 'text-[length:var(--fs-titulo)]', corpo: 'text-[length:var(--fs-corpo)]' }
const CHAVE_ESCALA = 'pulpito-escala-pregacao-v2'
const ESCALA_MIN = 0.6
const ESCALA_MAX = 2

function fmt(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const versaoAtual = () => lerVersao()

const iconeBotao = 'flex h-10 w-10 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto'

/* ── Bíblia por cima da tela ── */
function BibliaSobreposta({ inicial, podeProjetar, projetado, onProjetar, onFechar }: {
  inicial: string
  podeProjetar: boolean
  projetado: string | null
  onProjetar: (referencia: string, texto: string, versos: { n: number; t: string }[]) => void
  onFechar: () => void
}) {
  const versao = versaoAtual()
  const [consulta, setConsulta] = useState(inicial)
  const [atual, setAtual] = useState(inicial)
  const [erro, setErro] = useState('')
  const [res, setRes] = useState<{ chave: string; versos: string[] } | null>(null)

  const ref = parseReferencia(atual)
  const chave = ref ? `${versao}:${ref.livro}.${ref.capitulo}` : ''
  const inicio = ref?.inicio
  const fim = ref?.fim ?? ref?.inicio
  const carregado = !!ref && res?.chave === chave
  const versos = carregado ? res?.versos ?? [] : []
  const nomeCap = ref ? `${nomeDoLivro(ref.livro)} ${ref.capitulo}` : ''

  useEffect(() => {
    const r = parseReferencia(atual)
    if (!r) return
    let ativo = true
    const k = `${versao}:${r.livro}.${r.capitulo}`
    lerCapitulo(versao, r.livro, r.capitulo)
      .then((v) => { if (ativo) setRes({ chave: k, versos: v }) })
      .catch(() => { if (ativo) setRes({ chave: k, versos: [] }) })
    return () => { ativo = false }
  }, [atual, versao])

  useEffect(() => {
    if (carregado && inicio)
      document.getElementById(`sv-${inicio}`)?.scrollIntoView({ block: 'center' })
  }, [carregado, inicio])

  function buscar(e: FormEvent) {
    e.preventDefault()
    if (!parseReferencia(consulta)) { setErro('Referência não reconhecida. Tente Sl 23 ou Jo 3:16.'); return }
    setErro('')
    setAtual(consulta)
  }

  const trecho = podeProjetar && carregado && inicio && fim && fim > inicio
    ? {
        referencia: `${nomeCap}:${inicio}-${fim}`,
        texto: versos.slice(inicio - 1, fim).join(' '),
        versos: versos.slice(inicio - 1, fim).map((t, i) => ({ n: inicio + i, t })),
      }
    : null

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-borda bg-superficie">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-borda" aria-hidden />
        <form onSubmit={buscar} className="flex gap-2 p-4 pb-3">
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Sl 23"
            className="campo min-w-0 flex-1" />
          <button className="botao-secundario">Ir</button>
          <button type="button" onClick={onFechar} aria-label="Fechar Bíblia" className={iconeBotao}>
            <X size={22} />
          </button>
        </form>

        <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {erro && <p className="mb-3 text-sm text-perigo">{erro}</p>}
          {!ref && <p className="py-6 text-center text-texto-2">Digite uma referência para abrir.</p>}
          {ref && !carregado && <p className="py-6 text-center text-texto-2">Carregando…</p>}
          {ref && carregado && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-bold">{nomeCap}</h3>
                <span className="text-sm text-texto-2">{versao}</span>
                {trecho && (
                  <button onClick={() => onProjetar(trecho.referencia, trecho.texto, trecho.versos)}
                    className="botao ml-auto bg-acao/15 px-3 py-1.5 text-sm text-tinta">
                    <MonitorPlay size={16} /> Projetar {inicio}-{fim}
                  </button>
                )}
              </div>
              {podeProjetar && (
                <p className="mb-3 text-sm text-texto-2">
                  Toque num versículo para mostrar no telão. Ao fechar, o slide volta.
                </p>
              )}
              {versos.length === 0 && <p className="text-texto-2">Capítulo não encontrado.</p>}
              <div className="space-y-1 font-escritura">
                {versos.map((texto, i) => {
                  const n = i + 1
                  const destaque = !!inicio && n >= inicio && n <= (fim ?? inicio)
                  const rotulo = `${nomeCap}:${n}`
                  const noTelao = projetado === rotulo
                  return (
                    <p key={n} id={`sv-${n}`}
                      onClick={() => podeProjetar && onProjetar(rotulo, texto, [{ n, t: texto }])}
                      className={`rounded-xl px-3 py-1.5 text-lg leading-relaxed
                        ${podeProjetar ? 'cursor-pointer hover:bg-superficie-2' : ''}
                        ${destaque ? 'bg-acao/15 text-texto' : 'text-texto-2'}
                        ${noTelao ? 'ring-2 ring-sucesso' : ''}`}>
                      <sup className="mr-1.5 font-sans text-xs text-texto-2">{n}</sup>{texto}
                    </p>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Painel de conexão com o telão ── */
function PainelTelao({ codigo, online, apagado, onConectar, onDesconectar, onAlternarApagado, onFechar }: {
  codigo: string | null
  online: boolean
  apagado: boolean
  onConectar: (codigo: string) => void
  onDesconectar: () => void
  onAlternarApagado: () => void
  onFechar: () => void
}) {
  const [digitado, setDigitado] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-t-3xl border border-borda bg-superficie p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Telão</h2>
          <button onClick={onFechar} aria-label="Fechar" className={iconeBotao}><X size={20} /></button>
        </div>

        {!codigo ? (
          <form className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (codigoValido(digitado)) onConectar(digitado) }}>
            <p className="text-texto-2">
              No computador do projetor, abra{' '}
              <b className="text-texto">{window.location.host}/projetar</b> e digite o código que aparecer.
            </p>
            <input inputMode="numeric" maxLength={6} autoFocus value={digitado} placeholder="000000"
              onChange={(e) => setDigitado(e.target.value.replace(/\D/g, ''))}
              className="campo py-4 text-center text-3xl font-bold tracking-[0.35em] tabular-nums" />
            <button disabled={!codigoValido(digitado)} className="botao-primario w-full">Conectar</button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-superficie-2 px-4 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-sucesso' : 'bg-aviso'}`} />
              <span className="font-semibold">{online ? 'Telão conectado' : 'Procurando o telão…'}</span>
              <span className="ml-auto tabular-nums text-texto-2">{codigo}</span>
            </div>
            {!online && (
              <p className="text-sm text-texto-2">
                Confira se a página /projetar está aberta com esse código. Se ele mudou, desconecte e digite o novo.
              </p>
            )}
            <button onClick={onAlternarApagado} className="botao-secundario w-full">
              {apagado ? 'Voltar a mostrar os slides' : 'Apagar o telão'}
            </button>
            <button onClick={onDesconectar} className="botao-fantasma w-full text-perigo hover:text-perigo">
              Desconectar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* Texto com marcadores: linhas que começam com "-", "•" ou "*" viram lista; com aspas viram citação */
function TextoRico({ texto, className }: { texto: string; className: string }) {
  const blocos: ({ tipo: 'lista'; itens: string[] } | { tipo: 'citacao' | 'paragrafo'; t: string })[] = []
  for (const linha of texto.split('\n')) {
    const l = linha.trim()
    const item = l.match(/^[-•*]\s+(.*)$/)
    const ultimo = blocos[blocos.length - 1]
    if (item) {
      if (ultimo?.tipo === 'lista') ultimo.itens.push(item[1])
      else blocos.push({ tipo: 'lista', itens: [item[1]] })
    } else if (/^["“]/.test(l)) blocos.push({ tipo: 'citacao', t: l })
    else if (ultimo?.tipo === 'paragrafo' && l) ultimo.t += '\n' + l
    else if (l) blocos.push({ tipo: 'paragrafo', t: l })
  }
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocos.map((b, i) => b.tipo === 'lista' ? (
        <ul key={i} className="space-y-1.5">
          {b.itens.map((it, k) => (
            <li key={k} className="flex gap-3"><span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-acao" />{it}</li>
          ))}
        </ul>
      ) : b.tipo === 'citacao' ? (
        <p key={i} className="border-l-2 border-acao/60 pl-4 font-escritura italic text-tinta">{b.t}</p>
      ) : (
        <p key={i} className="whitespace-pre-wrap">{b.t}</p>
      ))}
    </div>
  )
}

/* ── Cronômetro de um bloco (pergunta ou atividade): conta para trás e avisa no fim ── */
function CronometroBloco({ minutos, cor, rotulo }: { minutos: number; cor: string; rotulo: string }) {
  const [total, setTotal] = useState(minutos * 60_000)
  const [rodando, setRodando] = useState(false)
  const [base, setBase] = useState({ acumulado: 0, desde: 0 })
  const [agora, setAgora] = useState(0)
  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(t)
  }, [rodando])
  const passado = base.acumulado + (rodando ? Math.max(0, agora - base.desde) : 0)
  const resta = total - passado
  const acabou = resta <= 0
  function alternar(e: { stopPropagation: () => void }) {
    e.stopPropagation()
    const t = Date.now()
    if (rodando) setBase({ acumulado: base.acumulado + (t - base.desde), desde: 0 })
    else setBase({ acumulado: base.acumulado, desde: t })
    setAgora(t)
    setRodando(!rodando)
  }
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${acabou ? 'border-perigo bg-perigo/15' : 'bg-superficie'}`}
      style={acabou ? undefined : { borderColor: `${cor}66` }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: acabou ? undefined : cor }}>
          <Timer size={13} /> {acabou ? 'Tempo esgotado' : rotulo}
        </span>
        <button onClick={(e) => { e.stopPropagation(); setTotal((x) => x + 60_000) }} className="rounded-lg px-2 py-1 text-sm font-bold text-texto-2 hover:bg-superficie-2">+1 min</button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className={`font-mono text-5xl font-bold tabular-nums ${acabou ? 'text-perigo' : ''}`}>{acabou ? `+${fmt(-resta)}` : fmt(resta)}</span>
        <button onClick={alternar} aria-label={rodando ? 'Pausar' : 'Começar'}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[#0A0A0A]" style={{ background: acabou ? 'var(--perigo)' : cor }}>
          {rodando ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-superficie-2">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(1, passado / total) * 100}%`, background: acabou ? 'var(--perigo)' : cor }} />
      </div>
    </div>
  )
}

/* ── Um bloco do estudo no modo aula ── */
function BlocoAula({ bloco, n, ao }: { bloco: Topico; n: number; ao: AoVivo }) {
  const def = defBloco(bloco)
  const tipo = bloco.tipo ?? 'explicacao'
  const corpo = bloco.observacao?.trim()
  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em]" style={{ color: def.cor }}>
        <def.Icone size={20} /> {n}. {def.nome}
      </p>

      {tipo === 'citacao' ? (
        <blockquote className="space-y-3">
          <p className="font-escritura text-[length:var(--fs-titulo)] italic leading-tight">“{(bloco.titulo || '').replace(/^["“]|["”]$/g, '')}”</p>
          {bloco.extra?.autor && <p className="text-[length:var(--fs-corpo)] font-bold" style={{ color: def.cor }}>— {bloco.extra.autor}</p>}
        </blockquote>
      ) : tipo === 'definicao' ? (
        <div className="space-y-2">
          <h1 className="font-display text-[length:var(--fs-titulo)] font-extrabold leading-tight">{bloco.titulo || 'Termo'}</h1>
          {bloco.frase_chave && <p className="text-[length:var(--fs-corpo)] italic" style={{ color: def.cor }}>{bloco.frase_chave}</p>}
        </div>
      ) : (
        <h1 className={`empty:hidden font-display font-extrabold leading-[1.12] tracking-tight ${tipo === 'pergunta' ? 'text-[length:var(--fs-titulo)]' : 'text-[length:var(--fs-topico)]'}`}>
          {bloco.titulo || (tipo === 'referencia' ? '' : def.nome)}
        </h1>
      )}

      {tipo === 'lista' ? (
        <ul className="space-y-3">
          {itensDaLista(bloco.observacao).map((it, k) => (
            <li key={k} className={`flex items-start gap-4 ${tam.corpo} font-semibold`}>
              <span className="mt-[0.1em] flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-full text-[0.8em] font-extrabold text-[#0A0A0A]" style={{ background: def.cor }}>{k + 1}</span>
              {it}
            </li>
          ))}
        </ul>
      ) : tipo === 'pergunta' ? (
        corpo && <TextoRico texto={corpo} className={`${tam.corpo} text-texto-2`} />
      ) : tipo !== 'citacao' && corpo ? (
        <TextoRico texto={corpo} className={`${tam.corpo} text-texto`} />
      ) : null}

      {tipo === 'imagem' && bloco.extra?.url && (
        <img src={bloco.extra.url} alt={bloco.titulo || ''} className="max-h-[50vh] rounded-2xl border border-borda object-contain" />
      )}
      {tipo === 'link' && bloco.extra?.url && (
        <a href={bloco.extra.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 font-bold" style={{ color: def.cor }}>
          <ExternalLink size={18} className="shrink-0" /> <span className="truncate">{bloco.extra.url.replace(/^https?:\/\//, '')}</span>
        </a>
      )}

      {ao.aula && aceitaResposta(bloco) ? (
        <RespostasAoVivo ao={ao} bloco={bloco} />
      ) : null}

      {bloco.extra?.minutos ? (
        <CronometroBloco key={bloco.id} minutos={bloco.extra.minutos} cor={def.cor}
          rotulo={tipo === 'pergunta' ? 'Tempo de discussão' : 'Tempo da atividade'} />
      ) : null}

      {bloco.notas?.trim() && (
        <div className="rounded-2xl bg-superficie-2 px-4 py-3">
          <p className="rotulo">Só você vê</p>
          <TextoRico texto={bloco.notas} className="mt-1 text-base text-texto-2" />
        </div>
      )}
    </div>
  )
}

/* ── Versículo base fixo embaixo, com o texto (recolhível) ── */
const CHAVE_VERSICULO_ABERTO = 'pulpito-pregar-versiculo-aberto'

function VersiculoBase({ referencia, onAbrir, contagem }: { referencia: string; onAbrir: () => void; contagem?: string }) {
  const ref = parseReferencia(referencia)
  const chave = ref ? `${versaoAtual()}:${formatarReferencia(ref)}` : ''
  const [res, setRes] = useState<{ chave: string; texto: string } | null>(null)
  const [aberto, setAberto] = useState(() => localStorage.getItem(CHAVE_VERSICULO_ABERTO) === 'sim')

  useEffect(() => {
    const r = parseReferencia(referencia)
    if (!r) return
    let ativo = true
    const k = `${versaoAtual()}:${formatarReferencia(r)}`
    lerReferencia(versaoAtual(), r.inicio ? r : { ...r, inicio: 1, fim: 3 })
      .then((vs) => { if (ativo) setRes({ chave: k, texto: vs.map((v) => `${vs.length > 1 ? `${v.numero} ` : ''}${v.texto}`).join(' ') }) })
      .catch(() => { if (ativo) setRes({ chave: k, texto: '' }) })
    return () => { ativo = false }
  }, [referencia])

  if (!ref) return (
    <p className="truncate rounded-2xl border border-borda bg-superficie px-4 py-2.5 text-texto-2">
      <BookOpen size={16} className="mr-2 inline text-tinta" />{referencia}
    </p>
  )
  const texto = res?.chave === chave ? res.texto : ''

  function alternar() {
    setAberto((a) => {
      localStorage.setItem(CHAVE_VERSICULO_ABERTO, a ? 'nao' : 'sim')
      return !a
    })
  }

  return (
    <div className="rounded-2xl border border-borda bg-superficie">
      <div className="flex items-center gap-2 px-4 pt-2">
        <button onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <BookOpen size={16} className="shrink-0 text-tinta" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-texto-2">Versículo base{contagem ? ` · ${contagem}` : ''}</span>
            <span className="block truncate font-bold text-tinta">{formatarReferencia(ref)}</span>
          </span>
        </button>
        <button onClick={alternar} aria-label={aberto ? 'Recolher versículo' : 'Mostrar versículo'} aria-expanded={aberto}
          className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2 hover:text-texto">
          <ChevronDown size={18} className={`transition-transform ${aberto ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <p className={`px-4 pb-2.5 text-sm leading-relaxed text-texto/80 ${aberto ? 'max-h-[20vh] overflow-y-auto' : 'truncate'}`}>
        {texto || '…'}
      </p>
    </div>
  )
}

/* ── Modo ensaio: tempo gasto em cada tópico ── */
type Ensaio = { quando: string; tempos: number[] }
const chaveEnsaio = (id: string) => `pulpito-ensaio-${id}`

function ResumoEnsaio({ titulos, tempoTotalMin, tempos, anterior, onFechar, onZerar }: {
  titulos: string[]
  tempoTotalMin: number
  tempos: number[]
  anterior: Ensaio | null
  onFechar: () => void
  onZerar: () => void
}) {
  const total = tempos.reduce((a, b) => a + b, 0)
  const ideal = (tempoTotalMin * 60_000) / Math.max(1, titulos.length - 1) // a capa não conta
  const maior = Math.max(...tempos, ideal, 1)
  const totalAnterior = anterior?.tempos.reduce((a, b) => a + b, 0) ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg animate-subir flex-col rounded-t-3xl border border-borda bg-superficie sm:animate-entrar sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-borda p-5">
          <div className="min-w-0 flex-1">
            <p className="rotulo">Modo ensaio</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Tempo por tópico</h2>
            <p className="mt-1 text-sm text-texto-2">
              Total <b className="font-mono text-texto">{fmt(total)}</b> de {tempoTotalMin} min
              {anterior && <> · ensaio anterior <b className="font-mono text-texto">{fmt(totalAnterior)}</b></>}
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className={iconeBotao}><X size={20} /></button>
        </div>

        <ol className="space-y-3 overflow-y-auto p-5">
          {titulos.map((titulo, i) => {
            const t = tempos[i] ?? 0
            const capa = i === 0
            const passou = !capa && t > ideal * 1.2
            const folga = !capa && t > 0 && t < ideal * 0.6
            const antes = anterior?.tempos[i]
            return (
              <li key={i}>
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="w-5 shrink-0 font-bold text-texto-2">{capa ? '•' : i}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{titulo}</span>
                  {antes !== undefined && antes !== t && (
                    <span className={`font-mono text-xs ${t > antes ? 'text-perigo' : 'text-sucesso'}`}>
                      {t > antes ? '+' : '−'}{fmt(Math.abs(t - antes))}
                    </span>
                  )}
                  <span className={`font-mono font-bold tabular-nums ${passou ? 'text-perigo' : folga ? 'text-aviso' : ''}`}>{fmt(t)}</span>
                </div>
                <div className="relative mt-1.5 ml-7 h-2 overflow-hidden rounded-full bg-superficie-2">
                  <div className={`h-full rounded-full ${passou ? 'bg-perigo' : capa ? 'bg-texto-2' : 'bg-acao'}`}
                    style={{ width: `${(t / maior) * 100}%` }} />
                  {!capa && <span aria-hidden className="absolute top-0 h-full w-0.5 bg-texto/60" style={{ left: `${(ideal / maior) * 100}%` }} />}
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-3 border-t border-borda p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="min-w-0 flex-1 text-xs text-texto-2">
            O traço marca o tempo ideal por tópico ({fmt(ideal)}). Tempo em vermelho passou 20% do ideal; em amarelo, ficou bem abaixo.
          </p>
          <button onClick={onZerar} className="botao-secundario shrink-0 px-3 py-2 text-sm">
            <RotateCcw size={16} /> Novo ensaio
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Tela principal ── */
export default function Pregar() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [indice, setIndice] = useState(0)
  // Tempo no item atual: guarda quanto o cronômetro marcava ao entrar no item
  const [marco, setMarco] = useState({ indice: 0, base: 0 })
  const [concluida, setConcluida] = useState(false)
  const [subEstado, setSubEstado] = useState({ pagina: 0, sub: 0 })
  const [biblia, setBiblia] = useState<string | null>(null)
  const [painelTexto, setPainelTexto] = useState(false)
  const [listaTopicos, setListaTopicos] = useState(false)
  // Modo ensaio
  const [tempos, setTempos] = useState<number[]>([])
  const [resumo, setResumo] = useState<{ anterior: Ensaio | null } | null>(null)
  const indiceAtual = useRef(0)
  const temposRef = useRef<number[]>([])
  const abrirResumoRef = useRef<() => void>(() => {})
  const ultimoTique = useRef<number | null>(null)
  const [escala, setEscala] = useState(() => {
    const salvo = Number(localStorage.getItem(CHAVE_ESCALA))
    return salvo >= ESCALA_MIN && salvo <= ESCALA_MAX ? salvo : 1
  })

  // Telão
  const [codigoTelao, setCodigoTelao] = useState<string | null>(() => {
    const salvo = localStorage.getItem(CHAVE_TELAO)
    return salvo && codigoValido(salvo) ? salvo : null
  })
  const [painelTelao, setPainelTelao] = useState(false)
  const [ajudaTelaCheia, setAjudaTelaCheia] = useState(false)
  const [telaoApagado, setTelaoApagado] = useState(false)
  const [versiculoProjetado, setVersiculoProjetado] = useState<SlideVersiculo | null>(null)
  const { online: telaoOnline, enviar, despedir } = useEmissorTelao(codigoTelao)

  // Cronômetro
  const [rodando, setRodando] = useState(false)
  const [acumulado, setAcumulado] = useState(0)
  const [iniciadoEm, setIniciadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const toqueX = useRef<number | null>(null)
  const toqueY = useRef(0)
  const multitoque = useRef(false)
  const areaTexto = useRef<HTMLElement>(null)
  const [indicador, setIndicador] = useState(false)
  const timerIndicador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function mudarEscala(n: number) {
    setEscala(Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n)) * 100) / 100)
    setIndicador(true)
    clearTimeout(timerIndicador.current)
    timerIndicador.current = setTimeout(() => setIndicador(false), 900)
  }
  usePinca(areaTexto, escala, mudarEscala, { min: ESCALA_MIN, max: ESCALA_MAX, pronto: !!mensagem })

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('slides').select('*').eq('mensagem_id', id!).order('ordem'),
    ]).then(([m, t, s]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setSlides((s.data as Slide[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

  // Respostas ao vivo: nos estudos e em qualquer mensagem que tenha pergunta ou atividade
  const usaAoVivo = mensagem?.tipo === 'estudo' || topicos.some(aceitaResposta)
  const ao = useAulaAoVivo(usaAoVivo ? mensagem : null, topicos, usaAoVivo && indice > 0 ? topicos[indice - 1] ?? null : null)

  // Slides personalizados da página atual (capa ou tópico)
  const slidesDaPagina = useMemo(() => {
    const topicoId = indice > 0 ? topicos[indice - 1]?.id ?? null : null
    return slides.filter((s) => s.topico_id === topicoId).sort((a, b) => a.ordem - b.ordem)
  }, [slides, topicos, indice])

  // Pergunta aberta ou atividade com as respostas ao vivo abertas ganha um passo a mais: o mural no telão.
  // Primeiro vem a pergunta (ou os slides dela) e, ao avançar, o telão vira o mural com o QR Code.
  const blocoAtual = indice > 0 ? topicos[indice - 1] ?? null : null
  const temMural = !!(ao.aula && ao.muralNoTelao && blocoAtual && aceitaResposta(blocoAtual) && !ehMultipla(blocoAtual))
  // Sem slides personalizados, o mural É o slide da pergunta (não vira um passo a mais).
  // Com slides personalizados, continua como último passo do tópico.
  const muralNoLugar = temMural && slidesDaPagina.length === 0
  // Vários versículos no mesmo tópico: cada um ganha um slide inteiro, depois do slide do tópico
  const versiculos = indice > 0 ? dividirReferencias(topicos[indice - 1]?.versiculo) : []
  const variosVersiculos = versiculos.length > 1 && slidesDaPagina.length === 0
  // Bloco Referência sem título: não sobra um slide em branco antes dos versículos
  const semTituloReferencia = variosVersiculos && !temMural && blocoAtual?.tipo === 'referencia' && !blocoAtual.titulo?.trim()
  const passosBase = slidesDaPagina.length > 0 ? slidesDaPagina.length : semTituloReferencia ? 0 : 1
  const passos = passosBase + (variosVersiculos ? versiculos.length : 0) + (temMural && !muralNoLugar ? 1 : 0)

  const sub = subEstado.pagina === indice
    ? Math.max(0, Math.min(subEstado.sub, passos - 1))
    : 0
  const noMural = temMural && (muralNoLugar ? sub === 0 : sub === passos - 1)
  const versiculoDoPasso = variosVersiculos && !noMural && sub >= passosBase && sub < passosBase + versiculos.length
    ? versiculos[sub - passosBase]
    : null

  // Próximo/anterior: passa pelos slides do tópico antes de mudar de tópico
  const ir = useCallback((dir: -1 | 1) => {
    const qtd = passos
    if (dir === 1 && sub < qtd - 1) { setSubEstado({ pagina: indice, sub: sub + 1 }); return }
    if (dir === -1 && sub > 0) { setSubEstado({ pagina: indice, sub: sub - 1 }); return }
    const novo = Math.min(Math.max(indice + dir, 0), topicos.length)
    if (novo === indice) {
      if (dir === 1 && temposRef.current.some((t) => t > 0)) abrirResumoRef.current()
      return
    }
    setIndice(novo)
    setSubEstado({ pagina: novo, sub: dir === -1 ? 999 : 0 })
  }, [passos, sub, indice, topicos.length])

  useEffect(() => { localStorage.setItem(CHAVE_ESCALA, String(escala)) }, [escala])
  useEffect(() => { indiceAtual.current = indice }, [indice])
  useEffect(() => { temposRef.current = tempos; abrirResumoRef.current = abrirResumo })

  useEffect(() => {
    if (codigoTelao) localStorage.setItem(CHAVE_TELAO, codigoTelao)
    else localStorage.removeItem(CHAVE_TELAO)
  }, [codigoTelao])

  // Envia para o telão o que deve aparecer agora
  useEffect(() => {
    if (!mensagem || !codigoTelao) return
    if (telaoApagado) { enviar({ tipo: 'vazio' }); return }
    if (versiculoProjetado) { enviar(versiculoProjetado); return }

    const personalizado = slidesDaPagina[sub]
    if (personalizado) {
      enviar({
        tipo: 'personalizado', titulo: personalizado.titulo, subtitulo: personalizado.subtitulo,
        texto: personalizado.texto, fundo: personalizado.fundo, estilo: personalizado.estilo,
      })
      return
    }

    const topico = indice > 0 ? topicos[indice - 1] : null

    // Passo do mural: o telão mostra a pergunta, o QR Code e as respostas chegando
    if (noMural && ao.aula && topico) {
      const visiveis = ao.respostasDoBloco.filter((r) => !r.oculta && r.texto?.trim())
      const exibidas = [...visiveis].reverse().sort((a, b) => Number(b.destaque) - Number(a.destaque)).slice(0, 9)
      enviar({
        tipo: 'mural', titulo: topico.titulo || 'Pergunta', codigo: ao.aula.codigo, link: linkResponder(ao.aula.codigo),
        total: visiveis.length,
        respostas: exibidas.map((r) => ({ texto: r.texto!.trim().slice(0, 240), destaque: r.destaque || undefined, nome: ao.anonimo ? undefined : r.nome })),
      })
      return
    }

    // Vários versículos: cada um vira um slide inteiro, só com a referência e o texto
    if (versiculoDoPasso) {
      const rv = parseReferencia(versiculoDoPasso)
      const rotulo = rv ? formatarReferencia(rv) : versiculoDoPasso.trim()
      enviar({ tipo: 'versiculo', referencia: rotulo, texto: '' })
      if (!rv?.inicio) return
      let ativo = true
      lerReferencia(versaoAtual(), rv)
        .then((vs) => {
          if (ativo && vs.length) {
            enviar({ tipo: 'versiculo', referencia: rotulo, texto: vs.map((v) => v.texto).join(' '), versos: vs.map((v) => ({ n: v.numero, t: v.texto })) })
          }
        })
        .catch(() => {})
      return () => { ativo = false }
    }

    const refTexto = topico ? (variosVersiculos ? null : topico.versiculo) : mensagem.texto_base
    const r = refTexto ? parseReferencia(refTexto) : null
    const referencia = r ? formatarReferencia(r) : refTexto?.trim() || undefined

    const montar = (textoVersiculo?: string): SlideTelao => topico
      ? {
          tipo: 'topico', titulo: topico.titulo?.trim() || (topico.tipo === 'referencia' ? '' : 'Sem título'), numero: indice, total: topicos.length,
          referencia, textoVersiculo, frase: topico.frase_chave?.trim() || undefined,
        }
      : { tipo: 'capa', titulo: mensagem.titulo, referencia, textoVersiculo }

    enviar(montar())
    if (!r?.inicio) return

    let ativo = true
    lerReferencia(versaoAtual(), r)
      .then((vs) => {
        let t = vs.map((v) => v.texto).join(' ')
        if (t.length > 400) t = t.slice(0, 400).trimEnd() + '…'
        if (ativo && t) enviar(montar(t))
      })
      .catch(() => {})
    return () => { ativo = false }
  }, [mensagem, topicos, indice, sub, slidesDaPagina, codigoTelao, telaoApagado, versiculoProjetado, enviar, noMural, versiculoDoPasso, variosVersiculos, ao.aula, ao.respostasDoBloco, ao.anonimo])

  // Relógio: a cada segundo parado, a cada 250ms com o cronômetro rodando
  useEffect(() => {
    ultimoTique.current = rodando ? Date.now() : null
    const intervalo = setInterval(() => {
      const t = Date.now()
      setAgora(t)
      if (rodando && ultimoTique.current !== null) {
        const delta = t - ultimoTique.current
        const i = indiceAtual.current
        setTempos((lista) => { const n = [...lista]; n[i] = (n[i] ?? 0) + delta; return n })
      }
      ultimoTique.current = rodando ? t : null
    }, rodando ? 250 : 1000)
    return () => clearInterval(intervalo)
  }, [rodando])

  // Mantém a tela acesa
  useEffect(() => {
    let trava: WakeLockSentinel | null = null
    let cancelado = false
    async function pedir() {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const t = await navigator.wakeLock.request('screen')
        if (cancelado) t.release()
        else trava = t
      } catch { /* navegador sem suporte ou sem HTTPS */ }
    }
    pedir()
    const aoVoltar = () => { if (document.visibilityState === 'visible') pedir() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      trava?.release()
    }
  }, [])

  // Teclado e passador de slides
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (painelTelao) { if (e.key === 'Escape') setPainelTelao(false); return }
      if (biblia !== null) {
        if (e.key === 'Escape') { setBiblia(null); setVersiculoProjetado(null) }
        return
      }
      if (['ArrowRight', 'PageDown'].includes(e.key)) ir(1)
      if (['ArrowLeft', 'PageUp'].includes(e.key)) ir(-1)
      if (e.key === ' ' && !(e.target as HTMLElement).closest('button, input')) { e.preventDefault(); alternarCronometro() }
      if ((e.target as HTMLElement).closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'f') alternarTelaCheia()
      if (k === 'b') setBiblia(versiculoDoPasso ?? versiculos[0] ?? mensagem?.texto_base ?? '')
      if (k === 't') setPainelTelao(true)
      if (e.key === '+' || e.key === '=') mudarEscala(escala + 0.1)
      if (e.key === '-') mudarEscala(escala - 0.1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  function fecharBiblia() {
    setBiblia(null)
    setVersiculoProjetado(null)
  }

  function desconectarTelao() {
    despedir()
    setTelaoApagado(false)
    setTimeout(() => setCodigoTelao(null), 300)
  }

  function alternarCronometro() {
    const t = Date.now()
    if (rodando) {
      setAcumulado((a) => a + t - (iniciadoEm ?? t))
      setRodando(false)
    } else {
      setIniciadoEm(t)
      setAgora(t)
      setRodando(true)
    }
  }

  function alternarTelaCheia() {
    // No iPhone o Safari não permite: mostra como conseguir a tela toda
    if (!trocarTelaCheia()) setAjudaTelaCheia(true)
  }

  function zerar() {
    setRodando(false)
    setAcumulado(0)
    setIniciadoEm(null)
    setTempos([])
  }

  /* Abre o resumo e guarda este ensaio para comparar com o próximo */
  function abrirResumo() {
    if (!mensagem) return
    let anterior: Ensaio | null = null
    try { anterior = JSON.parse(localStorage.getItem(chaveEnsaio(mensagem.id)) || 'null') } catch { /* sem ensaio */ }
    if (tempos.some((t) => t > 0)) {
      try { localStorage.setItem(chaveEnsaio(mensagem.id), JSON.stringify({ quando: new Date().toISOString(), tempos })) } catch { /* cheio */ }
    }
    setPainelTexto(false)
    setResumo({ anterior })
  }

  const [painelAoVivo, setPainelAoVivo] = useState(false)

  if (mensagem === undefined) return <div className="escuro h-dvh bg-fundo p-6 text-texto-2">Carregando…</div>
  if (mensagem === null) return (
    <div className="escuro h-dvh bg-fundo p-6 text-texto">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const total = mensagem.tempo_minutos * 60_000
  const decorrido = acumulado + (rodando && iniciadoEm !== null ? agora - iniciadoEm : 0)
  const restante = total - decorrido
  const fracao = decorrido / total
  const corBarra = fracao >= 0.8 ? 'bg-perigo' : fracao >= 0.5 ? 'bg-aviso' : 'bg-sucesso'
  const fase = decorrido === 0 ? 'parado' : fracao >= 1 ? 'estourou' : fracao >= 0.8 ? 'final' : fracao >= 0.5 ? 'metade' : 'normal'
  // Pílula do tempo: escura (verde parado em 00:00), amarela na metade, vermelha em 80% e ao estourar
  const pilulaTempo = {
    parado: { caixa: 'bg-superficie-2 border-borda', valor: 'text-sucesso', rotulo: 'text-texto-2', bolinha: 'bg-acao text-acao-texto' },
    normal: { caixa: 'bg-superficie-2 border-borda', valor: 'text-texto', rotulo: 'text-texto-2', bolinha: 'bg-texto/15 text-texto' },
    metade: { caixa: 'bg-aviso border-aviso', valor: 'text-[#1A1200]', rotulo: 'text-[#1A1200]/70', bolinha: 'bg-black/20 text-[#1A1200]' },
    final: { caixa: 'bg-perigo border-perigo', valor: 'text-white', rotulo: 'text-white/80', bolinha: 'bg-black/25 text-white' },
    estourou: { caixa: 'bg-perigo border-perigo', valor: 'text-white', rotulo: 'text-white/80', bolinha: 'bg-black/25 text-white' },
  }[fase]
  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const topico = indice > 0 ? topicos[indice - 1] : null
  if (marco.indice !== indice) setMarco({ indice, base: decorrido })
  const noItem = marco.indice === indice ? Math.max(0, decorrido - marco.base) : 0
  const metaItem = topico ? (topico.extra?.minutos ? topico.extra.minutos * 60_000 : total / Math.max(1, topicos.length)) : 0
  const mmss = (ms: number) => { const sgs = Math.round(ms / 1000); return `${String(Math.floor(sgs / 60)).padStart(2, '0')}:${String(sgs % 60).padStart(2, '0')}` }
  const jaDada = concluida || !!mensagem.detalhes?.dadaEm
  async function concluir() {
    if (!mensagem) return
    setConcluida(true)
    await supabase.from('mensagens').update({ detalhes: { ...(mensagem.detalhes ?? {}), dadaEm: new Date().toISOString() } }).eq('id', mensagem.id)
  }
  const estudo = mensagem.tipo === 'estudo'
  const ehDeBloco = (t: Topico) => estudo || ehBloco(t.tipo)
  const temBlocos = estudo || topicos.some((t) => ehBloco(t.tipo))
  const comDetalhes = temBlocos || (!!mensagem.detalhes?.formato && mensagem.detalhes.formato !== 'pregacao')
  const nomeParte = estudo ? 'Bloco' : temBlocos ? 'Parte' : 'Tópico'

  function irParaTopico(n: number) {
    setIndice(n)
    setSubEstado({ pagina: n, sub: 0 })
  }


  const corTelao = !telaoOnline ? 'bg-aviso' : telaoApagado ? 'bg-texto-2' : 'bg-sucesso'

  return (
    <div className="escuro flex h-dvh flex-col bg-fundo text-texto">
      {/* Perto do fim (80%): bordas com brilho vermelho. Estourou: tela toda vermelha, bordas pulsando */}
      {fase === 'final' && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-700"
          style={{ boxShadow: 'inset 0 0 90px 10px rgb(244 67 54 / 0.45)' }} />
      )}
      {fase === 'estourou' && (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0"
            style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgb(120 10 10 / 0.55), rgb(200 30 30 / 0.85))' }} />
          <div aria-hidden className="pointer-events-none fixed inset-0 z-30 animate-estouro"
            style={{ boxShadow: 'inset 0 0 0 4px rgb(255 70 60), inset 0 0 120px 30px rgb(255 50 40 / 0.85)' }} />
        </>
      )}

      {/* Topo: sair, hora + cronômetro, transmitir e ferramentas */}
      <header className="relative z-10 flex items-center gap-1.5 px-2 pt-[max(0.6rem,env(safe-area-inset-top))] md:px-4">
        <Link to={`/mensagem/${mensagem.id}`} aria-label={estudo ? 'Sair do modo aula' : 'Sair do modo pregação'} className={iconeBotao}>
          <ChevronLeft size={24} />
        </Link>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          <div className="flex min-w-[5.5rem] flex-col items-center rounded-xl border border-borda bg-superficie-2 px-3 py-1.5">
            <span className="flex items-center gap-1 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-texto-2">
              <Clock size={9} /> Hora atual
            </span>
            <span className="font-mono text-lg font-bold leading-tight tabular-nums">{hora}</span>
          </div>
          <button onClick={alternarCronometro} aria-label={rodando ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            title="Iniciar ou pausar (espaço)"
            className={`flex min-w-[6.5rem] flex-col items-center rounded-xl border px-3 py-1.5 transition-colors duration-500 ${pilulaTempo.caixa}`}>
            <span className={`flex max-w-[7.5rem] items-center gap-1 overflow-hidden whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] ${pilulaTempo.rotulo}`}>
              <Timer size={9} className="shrink-0" /> <span className="truncate">{fase === 'estourou' ? 'Passou do tempo' : 'Tempo restante'}</span>
            </span>
            <span className={`flex items-center gap-1.5 font-mono text-lg font-bold leading-tight tabular-nums ${pilulaTempo.valor}`}>
              {restante >= 0 ? fmt(restante) : `+${fmt(-restante)}`}
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${pilulaTempo.bolinha}`}>
                {rodando ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" className="ml-px" />}
              </span>
            </span>
          </button>
          {!rodando && decorrido > 0 && (
            <button onClick={zerar} aria-label="Zerar cronômetro" title="Zerar"
              className="flex h-11 w-9 items-center justify-center rounded-xl border border-borda bg-superficie-2 text-texto-2 hover:text-texto">
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {usaAoVivo && (
          <button onClick={() => setPainelAoVivo(true)} aria-label="Respostas ao vivo" title="Respostas ao vivo"
            className={`relative ${iconeBotao} border border-borda ${ao.aula ? 'text-perigo' : ''}`}>
            <Radio size={20} />
            {ao.aula && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-perigo ring-2 ring-fundo" />}
          </button>
        )}
        <button onClick={() => setPainelTelao(true)} aria-label="Transmitir para o telão" title="Telão (T)"
          className={`relative ${iconeBotao} border border-borda ${codigoTelao && telaoOnline ? 'text-tinta' : ''}`}>
          <Cast size={21} />
          {codigoTelao && <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-fundo ${corTelao}`} />}
        </button>
        <button onClick={() => setPainelTexto((v) => !v)} aria-label="Ajustes da tela" title="Tamanho do texto (+ e −, ou pinça)" className={iconeBotao}>
          <Settings size={20} />
        </button>
        <button onClick={() => setBiblia(versiculoDoPasso ?? versiculos[0] ?? mensagem.texto_base ?? '')}
          aria-label="Abrir Bíblia" title="Bíblia (B)" className={`${iconeBotao} max-sm:hidden`}>
          <BookOpen size={20} />
        </button>
        <button onClick={alternarTelaCheia} aria-label="Tela cheia" title="Tela cheia (F)" className={iconeBotao}>
          <Maximize size={20} />
        </button>

        {painelTexto && (
          <div className="absolute right-3 top-full z-20 mt-2 flex items-center gap-1 rounded-2xl border border-borda bg-superficie p-1.5 shadow-xl">
            <button onClick={() => mudarEscala(escala - 0.1)} disabled={escala <= ESCALA_MIN}
              aria-label="Diminuir texto" className={`${iconeBotao} disabled:opacity-30`}><Minus size={20} /></button>
            <span className="w-14 text-center text-sm font-bold tabular-nums text-texto-2">{Math.round(escala * 100)}%</span>
            <button onClick={() => mudarEscala(escala + 0.1)}
              disabled={escala >= ESCALA_MAX}
              aria-label="Aumentar texto" className={`${iconeBotao} disabled:opacity-30`}><Plus size={20} /></button>
            <span aria-hidden className="mx-1 h-6 w-px bg-borda" />
            <button onClick={abrirResumo} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-texto-2 hover:bg-superficie-2 hover:text-texto">
              <ChartNoAxesColumn size={18} /> Ensaio
            </button>
          </div>
        )}
      </header>

      <div className="relative px-3 md:px-6">
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-superficie-2">
          <div className={`h-full rounded-full ${corBarra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
        </div>

        {usaAoVivo && <FaixaAoVivo ao={ao} onAbrir={() => setPainelAoVivo(true)} />}

        {/* Celular e tablet: no último item, concluir marca a mensagem como feita (progresso da série) */}
        {topicos.length > 0 && indice === topicos.length && (
          <div className="mx-auto mt-2 flex max-w-3xl justify-end px-3 xl:hidden">
            <button onClick={(e) => { e.stopPropagation(); void concluir() }} disabled={jaDada}
              className="flex items-center gap-1.5 rounded-full border border-borda px-3 py-1 text-xs font-bold text-texto-2 disabled:opacity-100">
              <Check size={14} className={jaDada ? 'text-sucesso' : ''} /> {jaDada ? (estudo ? 'Dada' : 'Feita') : `Concluir e marcar como ${estudo ? 'dada' : 'feita'}`}
            </button>
          </div>
        )}

        {/* Próximo tópico, com lista para pular para qualquer um */}
        {topicos.length > 0 && (
          <div className="relative mx-auto mt-2 flex max-w-3xl items-center justify-between gap-3 px-3">
            <span className="rotulo shrink-0">
              {indice === 0 ? 'Capa' : `${nomeParte} ${indice} de ${topicos.length}`}
              {passos > 1 && ` · ${noMural ? 'mural no telão' : 'slide'} ${sub + 1}/${passos}`}
              {topico && decorrido > 0 && (
                <span className={`ml-2 rounded-md px-1.5 py-0.5 font-mono normal-case tracking-normal ${noItem > metaItem ? 'bg-perigo/15 text-perigo' : 'bg-superficie-2 text-texto'}`}
                  title="Tempo neste item / tempo previsto">
                  {mmss(noItem)} / {mmss(metaItem)}
                </span>
              )}
            </span>
            <button onClick={() => setListaTopicos((v) => !v)} aria-expanded={listaTopicos}
              className="flex min-w-0 max-w-[65%] items-center gap-1.5 rounded-lg px-1 py-1 text-left text-xs hover:bg-superficie-2">
              <span className="shrink-0 text-texto-2">{indice < topicos.length ? 'Próximo:' : `Último ${nomeParte.toLowerCase()}`}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{indice < topicos.length ? topicos[indice].titulo || 'Sem título' : ''}</span>
              <ChevronDown size={16} className={`shrink-0 text-texto-2 transition-transform ${listaTopicos ? 'rotate-180' : ''}`} />
            </button>
            {listaTopicos && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setListaTopicos(false)} />
                <ol className="absolute inset-x-3 top-full z-40 mt-2 max-h-[50vh] animate-entrar overflow-y-auto rounded-2xl border border-borda bg-superficie p-1.5 shadow-2xl">
                  {[null, ...topicos].map((t, n) => (
                    <li key={t?.id ?? 'capa'}>
                      <button onClick={() => { irParaTopico(n); setListaTopicos(false) }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${indice === n ? 'bg-ouro-suave' : 'hover:bg-superficie-2'}`}>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${indice === n ? 'bg-acao text-acao-texto' : 'bg-superficie-2 text-texto-2'}`}>
                          {n === 0 ? '•' : n}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{t ? t.titulo || 'Sem título' : `Capa · ${mensagem.titulo}`}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}

      </div>

      {/* Conteúdo */}
      <main ref={areaTexto} className="flex-1 touch-pan-y overflow-y-auto" onClick={() => setPainelTexto(false)}
        style={{ '--fs-titulo': `${2.4 * escala}rem`, '--fs-sub': `${2.4 * escala}rem`, '--fs-topico': `${1.55 * escala}rem`, '--fs-corpo': `${1.2 * escala}rem` } as CSSProperties}
        onTouchStart={(e) => {
          if (e.touches.length > 1) multitoque.current = true
          else { multitoque.current = false; toqueX.current = e.touches[0].clientX; toqueY.current = e.touches[0].clientY }
        }}
        onTouchEnd={(e) => {
          if (toqueX.current === null || multitoque.current || e.touches.length > 0) { if (!e.touches.length) toqueX.current = null; return }
          const dx = e.changedTouches[0].clientX - toqueX.current
          const dy = e.changedTouches[0].clientY - toqueY.current
          toqueX.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(dx < 0 ? 1 : -1)
        }}>
        <div className="mx-auto flex max-w-6xl justify-center gap-10 xl:px-6">
        <div key={`${indice}-${sub}`} className="min-w-0 max-w-3xl flex-1 animate-entrar px-6 pb-8 pt-5 xl:px-0">
          {!topico && (
            <div className="space-y-4">
              <p className="text-texto-2">
                {topicos.length} {estudo ? (topicos.length === 1 ? 'bloco' : 'blocos') : temBlocos ? (topicos.length === 1 ? 'parte' : 'partes') : (topicos.length === 1 ? 'tópico' : 'tópicos')} · {mensagem.tempo_minutos} min
                {comDetalhes && mensagem.detalhes?.publico ? ` · ${mensagem.detalhes.publico}` : ''}
              </p>
              <h1 className={`${tam.titulo} font-display font-extrabold uppercase leading-[1.05] tracking-tight text-tinta`}>{mensagem.titulo}</h1>
              {comDetalhes && mensagem.detalhes?.objetivo && (
                <p className={`${tam.corpo} flex items-start gap-3 text-texto/85`}><Target size={22} className="mt-1 shrink-0 text-texto-2" /> {mensagem.detalhes.objetivo}</p>
              )}
              {comDetalhes && mensagem.detalhes?.material && (
                <p className="text-texto-2">Material: {mensagem.detalhes.material}</p>
              )}
            </div>
          )}

          {topico && ehDeBloco(topico) && <BlocoAula bloco={topico} n={indice} ao={ao} />}

          {topico && !ehDeBloco(topico) && (
            <div className="space-y-7">
              <div className="space-y-2">
                <p className="font-display text-[length:var(--fs-sub)] font-extrabold uppercase leading-[1.05] tracking-tight text-tinta">
                  {mensagem.titulo}
                </p>
                <h1 className="font-display text-[length:var(--fs-topico)] font-extrabold uppercase leading-[1.1] tracking-tight">
                  {indice}. {topico.titulo || 'Sem título'}
                </h1>
              </div>

              {topico.observacao?.trim() && (
                <TextoRico texto={topico.observacao} className={`${tam.corpo} text-texto`} />
              )}

              {([['Ilustração', topico.ilustracao], ['Aplicação', topico.aplicacao]] as const)
                .filter(([, v]) => v?.trim()).map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-2xl border border-borda bg-superficie px-4 py-3">
                    <TextoRico texto={`${rotulo}: ${valor}`} className={`${tam.corpo} italic text-texto/85`} />
                  </div>
                ))}

              {topico.frase_chave?.trim() && (
                <blockquote className={`${tam.corpo} whitespace-pre-wrap border-l-2 border-acao py-1 pl-4 font-escritura italic leading-relaxed text-tinta`}>
                  “{topico.frase_chave.replace(/^["“]|["”]$/g, '')}”
                </blockquote>
              )}

              {topico.notas?.trim() && (
                <TextoRico texto={topico.notas} className="text-base text-texto-2" />
              )}
            </div>
          )}
        </div>

        {/* Computador: roteiro ao lado, para ver onde está e pular para qualquer parte */}
        {topicos.length > 0 && (
          <aside className="sticky top-5 hidden w-72 shrink-0 self-start pt-5 xl:block">
            <p className="rotulo">Roteiro</p>
            <ol className="mt-2 space-y-1">
              {[null, ...topicos].map((t, n) => {
                const def = t && ehDeBloco(t) ? defBloco(t) : null
                const atual = indice === n
                return (
                  <li key={t?.id ?? 'capa'}>
                    <button onClick={(e) => { e.stopPropagation(); irParaTopico(n) }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${atual ? 'bg-ouro-suave' : n < indice ? 'opacity-55 hover:bg-superficie' : 'hover:bg-superficie'}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${atual ? 'bg-acao text-acao-texto' : 'bg-superficie-2 text-texto-2'}`}
                        style={def && !atual ? { color: def.cor } : undefined}>
                        {n === 0 ? '•' : def ? <def.Icone size={14} /> : n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t ? t.titulo || 'Sem título' : mensagem.titulo}</span>
                        {t?.extra?.minutos ? <span className="text-xs text-texto-2">{t.extra.minutos} min</span> : t?.versiculo ? <span className="text-xs text-tinta">{t.versiculo}</span> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="mt-4 text-xs text-texto-2">Setas do teclado mudam de {nomeParte.toLowerCase()} · espaço liga o cronômetro</p>
            {indice === topicos.length && (
              <button onClick={(e) => { e.stopPropagation(); void concluir() }} disabled={jaDada}
                className="botao-secundario mt-4 w-full text-sm disabled:opacity-100">
                {jaDada ? <><Check size={16} className="text-sucesso" /> {estudo ? 'Dada' : 'Feita'}</> : <><Check size={16} /> Concluir e marcar como {estudo ? 'dada' : 'feita'}</>}
              </button>
            )}
          </aside>
        )}
        </div>
      </main>

      {/* Navegação */}
      {/* Rodapé: versículo base. Para trocar de tópico, deslize a tela para o lado (ou use as setas do teclado) */}
      <footer className="relative z-40 mx-auto w-full max-w-5xl px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
        <div>

        {(versiculos.length > 0 || (!topico && mensagem.texto_base)) && (
          <VersiculoBase key={`${topico?.id ?? 'capa'}-${versiculoDoPasso ?? ''}`}
            referencia={(topico ? (versiculoDoPasso ?? versiculos[0]) : mensagem.texto_base) ?? ''}
            contagem={variosVersiculos ? `${Math.max(0, versiculos.indexOf(versiculoDoPasso ?? versiculos[0])) + 1} de ${versiculos.length}` : undefined}
            onAbrir={() => setBiblia((topico ? (versiculoDoPasso ?? versiculos[0]) : mensagem.texto_base) || '')} />
        )}
        </div>
      </footer>

      {indicador && (
        <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-superficie/90 px-5 py-3 font-display text-2xl font-extrabold tabular-nums text-texto shadow-xl">
          {Math.round(escala * 100)}%
        </div>
      )}

      {biblia !== null && (
        <BibliaSobreposta inicial={biblia} onFechar={fecharBiblia}
          podeProjetar={!!codigoTelao}
          projetado={versiculoProjetado?.referencia ?? null}
          onProjetar={(referencia, texto, versos) => {
            setTelaoApagado(false)
            setVersiculoProjetado({ tipo: 'versiculo', referencia, texto, versos })
          }} />
      )}

      {painelAoVivo && <PainelAoVivo ao={ao} onFechar={() => setPainelAoVivo(false)} />}

      {ajudaTelaCheia && <AjudaTelaCheia onFechar={() => setAjudaTelaCheia(false)} />}

      {resumo && (
        <ResumoEnsaio
          titulos={[`Capa · ${mensagem.titulo}`, ...topicos.map((t) => t.titulo || 'Sem título')]}
          tempoTotalMin={mensagem.tempo_minutos} tempos={tempos} anterior={resumo.anterior}
          onFechar={() => setResumo(null)}
          onZerar={() => { zerar(); setResumo(null) }} />
      )}

      {painelTelao && (
        <PainelTelao codigo={codigoTelao} online={telaoOnline} apagado={telaoApagado}
          onConectar={(c) => setCodigoTelao(c)}
          onDesconectar={desconectarTelao}
          onAlternarApagado={() => setTelaoApagado((a) => !a)}
          onFechar={() => setPainelTelao(false)} />
      )}
    </div>
  )
}