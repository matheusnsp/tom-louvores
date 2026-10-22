import { lerVersao } from '../lib/preferencias'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, CircleAlert, CircleCheck, Copy, Download, FileText, ImagePlus, ListChecks,
  Circle, Diamond, Eye, EyeOff, Heading, Layers, LayoutTemplate, ListPlus, LoaderCircle, Lock, MessageSquare, Minus,
  MoveRight, Play, Plus, Presentation, Redo2, Shapes, Square, Star, Trash2, Triangle, Type as TypeIcon, Undo2, Upload, Wand2, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { usePapelAtual } from '../lib/papel'
import { useSalvamento } from '../lib/salvamento'
import { useHistorico } from '../lib/historico'
import { lerArquivos } from '../lib/importar'
import SlideVisual from '../components/SlideVisual'
import CamadaElementos from '../components/CamadaElementos'
import PainelElemento from '../components/PainelElemento'
import { CAMPOS_ESTILO, type AcaoElemento, type AlinharNoSlide } from '../lib/elementos'
import { MODELOS, MODELO_DO_LAYOUT, coresDoEstilo } from '../lib/modelosSlide'
import { FONTES } from '../lib/fontes'
import { ehBloco } from '../lib/blocos'
import {
  ESTILO_PADRAO, FUNDOS_PRONTOS, type Disposicao, type Elemento, type EstiloSlide, type LayoutSlide, type TipoElemento, type Mensagem, type Slide, type Topico,
} from '../lib/tipos'
import { formatarReferencia, lerReferencia, parseReferencia, dividirReferencias } from '../lib/biblia'

const CORES_TEXTO = ['#ffffff', '#000000', '#fde68a', '#7dd3fc', '#fca5a5']
const CAMPOS_SLIDE = ['topico_id', 'ordem', 'titulo', 'subtitulo', 'texto', 'fundo', 'estilo'] as const
const versaoAtual = () => lerVersao()
const botaoPequeno = 'botao-secundario px-3 py-1.5 text-sm'
/* Ferramentas em linha (rolam para o lado no celular) */
const ferramenta = 'botao-secundario shrink-0 px-3 py-2 text-sm sm:py-1.5'
/* Ações empilhadas no celular: ícone em cima, nome embaixo */
const acaoSlide = 'botao-secundario flex-col gap-0.5 px-1 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm'
const iconeBotao = 'flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto disabled:opacity-25'
const NOMES_ELEMENTO: Record<TipoElemento, string> = {
  texto: 'Texto', foto: 'Foto', seta: 'Seta', circulo: 'Círculo', retangulo: 'Retângulo', linha: 'Linha', icone: 'Ícone',
  triangulo: 'Triângulo', losango: 'Losango', estrela: 'Estrela', balao: 'Balão',
}
const diferente = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)

function referenciaBonita(ref: string | null) {
  const r = ref ? parseReferencia(ref) : null
  return r ? formatarReferencia(r) : ref?.trim() || null
}

const SOBRESCRITO = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sobrescrito = (n: number) => String(n).split('').map((d) => SOBRESCRITO[Number(d)]).join('')

/* Versículos de uma referência divididos em blocos que cabem bem num slide */
async function blocosDoVersiculo(ref: string | null, limite = 280) {
  const r = ref ? parseReferencia(ref) : null
  if (!r?.inicio) return [] as { referencia: string; texto: string }[]
  try {
    const vs = await lerReferencia(versaoAtual(), r)
    const varios = vs.length > 1
    const blocos: { de: number; ate: number; texto: string }[] = []
    for (const v of vs) {
      const pedaco = `${varios ? sobrescrito(v.numero) + ' ' : ''}${v.texto}`
      const ultimo = blocos[blocos.length - 1]
      if (ultimo && ultimo.texto.length + pedaco.length + 1 <= limite) {
        ultimo.texto += ' ' + pedaco
        ultimo.ate = v.numero
      } else blocos.push({ de: v.numero, ate: v.numero, texto: pedaco })
    }
    return blocos.map((b) => ({
      referencia: formatarReferencia({ ...r, inicio: b.de, fim: b.ate }),
      texto: b.texto,
    }))
  } catch {
    return []
  }
}


function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-texto-2">{rotulo}</span>
      {children}
    </label>
  )
}

const DISPOSICOES: { valor: Disposicao; rotulo: string }[] = [
  { valor: 'texto', rotulo: 'Só texto' },
  { valor: 'esquerda', rotulo: 'Foto à esquerda' },
  { valor: 'direita', rotulo: 'Foto à direita' },
  { valor: 'cima', rotulo: 'Foto em cima' },
  { valor: 'fundo', rotulo: 'Foto de fundo' },
  { valor: 'so-foto', rotulo: 'Só foto' },
]

/* Desenho pequeno de cada disposição */
function MiniDisposicao({ d }: { d: Disposicao }) {
  const foto = <span className="block bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" />
  const linhas = (
    <span className="flex flex-1 flex-col justify-center gap-1 px-1.5">
      <span className="h-1 rounded bg-white/70" /><span className="h-1 w-2/3 rounded bg-white/70" />
      <span className="h-0.5 w-1/3 rounded bg-[#FFC107]" />
    </span>
  )
  return (
    <span className="flex aspect-video overflow-hidden rounded-md bg-black" style={d === 'fundo' || d === 'so-foto' ? { background: 'linear-gradient(170deg,#2B4A6F,#C27A3A 60%,#2a1a0c)' } : undefined}>
      {d === 'texto' && linhas}
      {d === 'esquerda' && <>{<span className="w-1/2 bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" />}{linhas}</>}
      {d === 'direita' && <>{linhas}{<span className="w-1/2 bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" />}</>}
      {d === 'cima' && <span className="flex flex-1 flex-col"><span className="h-1/2 bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" />{linhas}</span>}
      {d === 'fundo' && linhas}
      {d === 'so-foto' && foto}
    </span>
  )
}

function Segmentos<T extends string>({ valor, opcoes, onChange }: {
  valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-borda bg-superficie p-1">
      {opcoes.map((o) => (
        <button key={o.valor} onClick={() => onChange(o.valor)} aria-pressed={valor === o.valor}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${valor === o.valor
            ? 'bg-acao text-acao-texto' : 'text-texto-2 hover:text-texto'}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export default function EditorSlides() {
  const { id } = useParams()
  const papelAtual = usePapelAtual()
  const { sessao } = useAuth()
  const { status, agendar, cancelar } = useSalvamento()
  const historico = useHistorico<Slide[]>()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [selecao, setSelecao] = useState<Set<string> | null>(null)
  const [ancora, setAncora] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const disposicaoPendente = useRef<Disposicao | null>(null)
  const arquivoElemento = useRef<HTMLInputElement>(null)
  const [elSel, setElSel] = useState<string | null>(null)
  const [rascunhoEl, setRascunhoEl] = useState<Elemento | null>(null)
  const [estiloCopiado, setEstiloCopiado] = useState<Partial<Elemento> | null>(null)
  const [verCamadas, setVerCamadas] = useState(false)
  const [degrade, setDegrade] = useState<{ a: string; b: string; ang: number; tipo: 'linear' | 'radial' } | null>(null)
  const elementoCopiado = useRef<Elemento | null>(null)
  const campoTexto = useRef<HTMLTextAreaElement>(null)
  const arquivoTroca = useRef<HTMLInputElement>(null)
  const [painelImportar, setPainelImportar] = useState(false)
  const [menuExportar, setMenuExportar] = useState(false)
  const [exportando, setExportando] = useState('')
  const [destinoImport, setDestinoImport] = useState('')
  const [importando, setImportando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const arquivo = useRef<HTMLInputElement>(null)
  const arquivoImport = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('slides').select('*').eq('mensagem_id', id!).order('ordem'),
    ]).then(([m, t, s]) => {
      if (!ativo) return
      const lista = (s.data as Slide[]) ?? []
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setSlides(lista)
      setSelId(lista[0]?.id ?? null)
    })
    return () => { ativo = false }
  }, [id])

  // Teclado: Cmd/Ctrl + Z desfaz; com Shift (ou Ctrl + Y) refaz; Esc sai da seleção
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && selecao) { setSelecao(null); return }
      const digitando = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')
      // Atalhos do elemento selecionado (fora dos campos de texto)
      if (!digitando && elAtual) {
        const passo = e.shiftKey ? 5 : 0.5
        const setas: Record<string, Partial<Elemento>> = {
          ArrowLeft: { x: elAtual.x - passo }, ArrowRight: { x: elAtual.x + passo },
          ArrowUp: { y: elAtual.y - passo }, ArrowDown: { y: elAtual.y + passo },
        }
        if (setas[e.key] && !elAtual.travado) { e.preventDefault(); mudarElemento(setas[e.key]); return }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); acaoElemento('excluir'); return }
        if (e.key === 'Escape') { setElSel(null); return }
        if (e.key === 'Enter' && elAtual.tipo === 'texto') { e.preventDefault(); focarTexto(); return }
      }
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (!digitando && elAtual && k === 'd') { e.preventDefault(); acaoElemento('duplicar'); return }
      if (!digitando && elAtual && k === 'c') { elementoCopiado.current = elAtual; return }
      if (!digitando && k === 'v' && elementoCopiado.current && sel) {
        e.preventDefault()
        const c = { ...elementoCopiado.current, id: crypto.randomUUID(), x: elementoCopiado.current.x + 2, y: elementoCopiado.current.y + 2 }
        salvarElementos([...elementos, c]); setElSel(c.id); return
      }
      if (k === 'z' && !e.shiftKey && !digitando) { e.preventDefault(); desfazerAgora() }
      else if (((k === 'z' && e.shiftKey) || k === 'y') && !digitando) { e.preventDefault(); refazerAgora() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const sel = slides.find((s) => s.id === selId) ?? slides[0] ?? null
  const iSel = sel ? slides.findIndex((s) => s.id === sel.id) : -1
  const estilo = { ...ESTILO_PADRAO, ...(sel?.estilo ?? {}) }
  const imagemAtual = sel?.fundo?.startsWith('img:') ? sel.fundo.slice(4) : null
  const fotoAtual = sel?.estilo?.foto || imagemAtual
  const disposicaoAtual: Disposicao = !fotoAtual ? 'texto'
    : sel?.estilo?.disposicao && sel.estilo.disposicao !== 'texto' ? sel.estilo.disposicao : imagemAtual ? 'fundo' : 'esquerda'

  function rotuloTopico(topicoId: string | null) {
    if (!topicoId) return 'Capa'
    const i = topicos.findIndex((t) => t.id === topicoId)
    const nome = mensagem?.tipo === 'estudo' || ehBloco(topicos[i]?.tipo) ? 'Bloco' : 'Tópico'
    return i < 0 ? `${nome} removido` : `${nome} ${i + 1}`
  }

  function alterar(sid: string, campos: Partial<Slide>) {
    const chave = `s:${sid}:${Object.keys(campos).join(',')}`
    historico.registrar(slides, chave)
    setSlides((lista) => lista.map((s) => (s.id === sid ? { ...s, ...campos } : s)))
    agendar(chave, () => supabase.from('slides').update(campos).eq('id', sid))
  }

  function alterarEstilo(campos: Partial<EstiloSlide>) {
    if (!sel) return
    alterar(sel.id, { estilo: { ...sel.estilo, ...campos } })
  }

  function salvarOrdem(nova: Slide[]) {
    const renumerada = nova.map((s, k) => ({ ...s, ordem: k }))
    renumerada.forEach((s) => {
      const antigo = slides.find((o) => o.id === s.id)
      if (antigo && antigo.ordem !== s.ordem)
        agendar(`s:${s.id}:ordem`, () => supabase.from('slides').update({ ordem: s.ordem }).eq('id', s.id))
    })
    return renumerada
  }

  /* ── Seleção de vários slides ── */
  function clicarMiniatura(s: Slide, e: MouseEvent) {
    if (!selecao) { setSelId(s.id); return }
    const nova = new Set(selecao)
    if (e.shiftKey && ancora) {
      const a = slides.findIndex((x) => x.id === ancora)
      const b = slides.findIndex((x) => x.id === s.id)
      const [ini, fim] = a < b ? [a, b] : [b, a]
      slides.slice(ini, fim + 1).forEach((x) => nova.add(x.id))
    } else if (nova.has(s.id)) {
      nova.delete(s.id)
    } else {
      nova.add(s.id)
    }
    setAncora(s.id)
    setSelecao(nova)
  }

  async function moverSelecionados(valor: string) {
    if (!selecao?.size) return
    const topico_id = valor === 'capa' ? null : valor
    const ids = [...selecao]
    historico.registrar(slides)
    ids.forEach((sid) => cancelar(`s:${sid}:topico_id`))
    setSlides((lista) => lista.map((s) => (selecao.has(s.id) ? { ...s, topico_id } : s)))
    setSelecao(null)
    const { error } = await supabase.from('slides').update({ topico_id }).in('id', ids)
    if (error) setErro('Não foi possível mover os slides. Verifique a internet.')
  }

  async function excluirSelecionados() {
    if (!selecao?.size) return
    const ids = [...selecao]
    historico.registrar(slides)
    ids.forEach((sid) => cancelar(`s:${sid}:`))
    const restantes = slides.filter((s) => !selecao.has(s.id))
    setSlides(salvarOrdem(restantes))
    if (sel && selecao.has(sel.id)) setSelId(restantes[0]?.id ?? null)
    setSelecao(null)
    const { error } = await supabase.from('slides').delete().in('id', ids)
    if (error) setErro('Não foi possível excluir os slides. Verifique a internet.')
  }

  async function inserirDepois(base: Partial<Slide>) {
    const antes = slides
    const pos = iSel >= 0 ? iSel + 1 : slides.length
    setErro('')
    const { data, error } = await supabase.from('slides').insert({
      mensagem_id: id,
      topico_id: base.topico_id !== undefined ? base.topico_id : sel?.topico_id ?? null,
      ordem: pos,
      titulo: base.titulo ?? 'Novo slide',
      subtitulo: base.subtitulo ?? null,
      texto: base.texto ?? null,
      fundo: base.fundo ?? sel?.fundo ?? '#000000',
      estilo: base.estilo ?? sel?.estilo ?? {},
    }).select().single()
    if (error || !data) { setErro('Não foi possível criar o slide.'); return }
    historico.registrar(antes)
    const lista = [...slides]
    lista.splice(pos, 0, data as Slide)
    setSlides(salvarOrdem(lista))
    setSelId(data.id)
  }

  async function excluir() {
    if (!sel) return
    historico.registrar(slides)
    cancelar(`s:${sel.id}:`)
    const restantes = slides.filter((s) => s.id !== sel.id)
    setSlides(salvarOrdem(restantes))
    setSelId(restantes[Math.min(iSel, restantes.length - 1)]?.id ?? null)
    const { error } = await supabase.from('slides').delete().eq('id', sel.id)
    if (error) setErro('Não foi possível excluir.')
  }

  function mover(dir: -1 | 1) {
    const j = iSel + dir
    if (iSel < 0 || j < 0 || j >= slides.length) return
    historico.registrar(slides)
    const lista = [...slides]
    ;[lista[iSel], lista[j]] = [lista[j], lista[iSel]]
    setSlides(salvarOrdem(lista))
  }

  async function exportar(formato: 'pptx' | 'pdf') {
    if (!mensagem || !slides.length) return
    setMenuExportar(false)
    setErro('')
    const progresso = (feito: number, total: number) => setExportando(`${feito} de ${total}`)
    setExportando('Preparando…')
    try {
      const { exportarPdf, exportarPowerPoint } = await import('../lib/exportar')
      if (formato === 'pptx') await exportarPowerPoint(mensagem.titulo, slides, topicos, progresso)
      else await exportarPdf(mensagem.titulo, slides, progresso)
    } catch {
      setErro('Não foi possível exportar. Se algum slide usa foto, confira a internet e tente de novo.')
    } finally {
      setExportando('')
    }
  }

  async function gerar() {
    if (!mensagem) return
    const antes = slides
    setGerando(true)
    setErro('')
    // Fundo e cores do slide selecionado; se estiver no preto padrão, usa o "Noite dourada"
    const fundo = !sel?.fundo || sel.fundo === '#000000' ? FUNDOS_PRONTOS[0].valor : sel.fundo
    const { layout: _l, ...estiloSel } = sel?.estilo ?? {}
    void _l
    const estilo = (layout: LayoutSlide) => ({ ...estiloSel, layout })
    const linhas: Omit<Slide, 'id'>[] = []
    const novo = (topico_id: string | null, layout: LayoutSlide, c: { titulo?: string | null; subtitulo?: string | null; texto?: string | null }) =>
      linhas.push({
        mensagem_id: mensagem.id, topico_id, ordem: linhas.length,
        titulo: c.titulo ?? null, subtitulo: c.subtitulo ?? null, texto: c.texto ?? null,
        fundo, estilo: estilo(layout),
      })

    // O mesmo versículo não é repetido em vários tópicos
    const usados = new Set<string>()
    const versiculos = async (topicoId: string | null, valor: string | null) => {
      // Um tópico pode ter vários versículos (separados por ;): cada um gera os próprios slides
      for (const ref of dividirReferencias(valor)) {
        const chave = referenciaBonita(ref)
        if (!chave || usados.has(chave)) continue
        usados.add(chave)
        for (const b of await blocosDoVersiculo(ref)) novo(topicoId, 'versiculo', { titulo: b.referencia, texto: b.texto })
      }
    }

    // Slide em modo livre, montado por um modelo editável (usado nos estudos)
    const livre = (topico_id: string | null, modeloId: string, c: { titulo?: string | null; subtitulo?: string | null; texto?: string | null }, extra: Elemento[] = []) => {
      const m = MODELOS.find((x) => x.id === modeloId)!
      linhas.push({
        mensagem_id: mensagem.id, topico_id, ordem: linhas.length,
        titulo: c.titulo ?? null, subtitulo: c.subtitulo ?? null, texto: c.texto ?? null,
        fundo, estilo: { ...estiloSel, layout: 'vazio', elementos: [...m.fabrica(c, coresDoEstilo(estiloSel)), ...extra] },
      })
    }

    // Capa
    const estudo = mensagem.tipo === 'estudo'
    novo(null, 'capa', { titulo: mensagem.titulo, subtitulo: estudo ? mensagem.detalhes?.publico || referenciaBonita(mensagem.texto_base) : referenciaBonita(mensagem.texto_base) })
    await versiculos(null, mensagem.texto_base)

    // Na ordem do roteiro. Tópico: título → versículo(s) → observação → ilustração → aplicação → frase-chave.
    // Bloco: o modelo editável que combina com ele. Só as notas pessoais ficam de fora.
    for (const [i, t] of topicos.entries()) {
      if (!estudo && !ehBloco(t.tipo)) {
        novo(t.id, 'topico', {
          subtitulo: `Tópico ${i + 1}`, titulo: t.titulo || 'Sem título', texto: dividirReferencias(t.versiculo).map((v) => referenciaBonita(v)).join(' · ') || null,
        })
        await versiculos(t.id, t.versiculo)
        if (t.observacao?.trim()) livre(t.id, 'tituloTexto', { titulo: t.titulo || 'Observação', texto: t.observacao.trim() })
        if (t.ilustracao?.trim()) livre(t.id, 'tituloTexto', { titulo: 'Ilustração', texto: t.ilustracao.trim() })
        if (t.aplicacao?.trim()) livre(t.id, 'tituloTexto', { titulo: 'Aplicação', texto: t.aplicacao.trim() })
        if (t.frase_chave?.trim())
          novo(t.id, 'frase', { texto: t.frase_chave.trim().replace(/^["“]|["”]$/g, '') })
        continue
      }
      // Blocos com versículo (fora o bloco Referência, que já é só isso) ganham os slides do texto bíblico antes
      if (t.tipo !== 'referencia' && t.versiculo?.trim()) await versiculos(t.id, t.versiculo)
      const min = t.extra?.minutos ? `${t.extra.minutos} min` : ''
      switch (t.tipo) {
        case 'pergunta': {
          const ops = (t.extra?.opcoes ?? []).filter((o) => o.trim())
          if (ops.length >= 2) livre(t.id, 'lista', { titulo: t.titulo, texto: ops.map((o, k) => `${'ABCDEF'[k]}) ${o}`).join('\n') })
          else livre(t.id, 'pergunta', { titulo: t.titulo, subtitulo: [t.observacao?.trim() || (min ? 'Converse em grupo' : 'Converse com quem está ao seu lado'), min].filter(Boolean).join(' · ') })
          break
        }
        case 'lista': livre(t.id, 'lista', { titulo: t.titulo, texto: t.observacao }); break
        case 'citacao': livre(t.id, 'citacao', { texto: t.titulo, subtitulo: t.extra?.autor ? `— ${t.extra.autor}` : ' ' }); break
        case 'definicao': livre(t.id, 'definicao', { titulo: t.titulo, subtitulo: t.frase_chave || ' ', texto: t.observacao }); break
        case 'atividade': livre(t.id, 'tituloTexto', { titulo: `${t.titulo || 'Atividade'}${min ? ` · ${min}` : ''}`, texto: t.observacao || ' ' }); break
        case 'referencia':
          await versiculos(t.id, t.versiculo)
          if (t.observacao?.trim()) livre(t.id, 'tituloTexto', { titulo: t.titulo?.trim() || ' ', texto: t.observacao })
          break
        case 'imagem':
          livre(t.id, 'branco', { titulo: t.titulo }, [
            ...(t.extra?.url ? [{ id: crypto.randomUUID(), tipo: 'foto' as const, x: 15, y: 8, w: 70, h: t.titulo ? 70 : 84, url: t.extra.url, ajuste: 'conter' as const, sombra: false }] : []),
            ...(t.titulo ? [{ id: crypto.randomUUID(), tipo: 'texto' as const, x: 10, y: 80, w: 80, h: 12, texto: t.titulo, tam: 2.6, cor: estiloSel.cor || '#FFFFFF', peso: 700 }] : []),
          ])
          break
        case 'link': livre(t.id, 'tituloTexto', { titulo: t.titulo || 'Assista', texto: [t.observacao, t.extra?.url].filter(Boolean).join('\n\n') || ' ' }); break
        default: livre(t.id, 'tituloTexto', { titulo: t.titulo, texto: t.observacao || ' ' })
      }
    }

    slides.forEach((s) => cancelar(`s:${s.id}:`))
    const apagar = await supabase.from('slides').delete().eq('mensagem_id', mensagem.id)
    if (apagar.error) { setErro('Não foi possível gerar os slides.'); setGerando(false); return }
    const { data, error } = await supabase.from('slides').insert(linhas).select()
    setGerando(false)
    if (error || !data) { setErro('Não foi possível gerar os slides.'); return }
    historico.registrar(antes)
    const lista = (data as Slide[]).sort((a, b) => a.ordem - b.ordem)
    setSlides(lista)
    setSelId(lista[0]?.id ?? null)
  }

  async function aplicarATodos() {
    if (!sel || !mensagem) return
    historico.registrar(slides)
    const { fundo, estilo: est } = sel
    slides.forEach((s) => { cancelar(`s:${s.id}:fundo`); cancelar(`s:${s.id}:estilo`) })
    // Copia fundo e cores, mas cada slide mantém o próprio layout (capa, tópico, versículo…)
    const novos = slides.map((s) => ({ ...s, fundo, estilo: { ...est, layout: s.estilo?.layout } }))
    setSlides(novos)
    const res = await Promise.all(novos.map((s) =>
      supabase.from('slides').update({ fundo: s.fundo, estilo: s.estilo }).eq('id', s.id)))
    if (res.some((r) => r.error)) setErro('Não foi possível aplicar a todos.')
  }

  async function subirImagem(file: File) {
    if (!sessao) return null
    if (!file.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem.'); return null }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem muito grande. O máximo é 5 MB.'); return null }
    setEnviando(true)
    setErro('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const caminho = `${sessao.user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('fundos')
      .upload(caminho, file, { cacheControl: '31536000', contentType: file.type })
    setEnviando(false)
    if (error) { setErro('Não foi possível enviar a imagem.'); return null }
    return supabase.storage.from('fundos').getPublicUrl(caminho).data.publicUrl
  }

  /* ── Elementos soltos ── */
  const elementos = sel?.estilo?.elementos ?? []
  const elAtual = elementos.find((x) => x.id === elSel) ?? null

  function salvarElementos(lista: Elemento[]) {
    if (!sel) return
    alterar(sel.id, { estilo: { ...sel.estilo, elementos: lista } })
  }

  function adicionarElemento(tipo: TipoElemento, extra: Partial<Elemento> = {}) {
    const base: Record<TipoElemento, Partial<Elemento>> = {
      foto: { w: 30, h: 40 }, seta: { w: 22, h: 9 }, circulo: { w: 14, h: 25, preenchido: true }, retangulo: { w: 26, h: 22, preenchido: true },
      linha: { w: 30, h: 4 }, icone: { w: 9, h: 16, icone: 'cruz' },
      texto: { w: 50, h: 14, texto: 'Seu texto aqui', cor: '#FFFFFF', tam: 3.6, fonte: estilo.fonteTitulo ?? 'moderna', peso: 800 },
      triangulo: { w: 16, h: 26, preenchido: true }, losango: { w: 16, h: 28, preenchido: true },
      estrela: { w: 16, h: 28, preenchido: true }, balao: { w: 30, h: 30, preenchido: true, cor: '#FFFFFF' },
    }
    const b = { ...base[tipo], ...extra }
    const el: Elemento = {
      // Cada novo elemento entra um pouco deslocado para não cair em cima do anterior
      id: crypto.randomUUID(), tipo,
      x: 50 - (b.w ?? 20) / 2 + (elementos.length % 5) * 3, y: 50 - (b.h ?? 20) / 2 + (elementos.length % 5) * 3,
      w: b.w ?? 20, h: b.h ?? 20,
      cor: '#FFC107', ...b,
    }
    salvarElementos([...elementos, el])
    setElSel(el.id)
  }

  function mudarElemento(campos: Partial<Elemento>) {
    if (!elAtual) return
    salvarElementos(elementos.map((x) => (x.id === elAtual.id ? { ...x, ...campos } : x)))
  }

  function acaoElemento(a: AcaoElemento) {
    if (!elAtual) return
    const resto = elementos.filter((x) => x.id !== elAtual.id)
    const i = elementos.findIndex((x) => x.id === elAtual.id)
    if (a === 'topo') salvarElementos([...resto, elAtual])
    else if (a === 'fundo') salvarElementos([elAtual, ...resto])
    else if (a === 'frente' || a === 'tras') {
      const j = Math.max(0, Math.min(resto.length, a === 'frente' ? i + 1 : i - 1))
      salvarElementos([...resto.slice(0, j), elAtual, ...resto.slice(j)])
    } else if (a === 'duplicar') {
      const c = { ...elAtual, id: crypto.randomUUID(), x: elAtual.x + 3, y: elAtual.y + 3, travado: false }
      salvarElementos([...elementos, c]); setElSel(c.id)
    } else if (a === 'excluir') { salvarElementos(resto); setElSel(null) }
    else if (a === 'copiarEstilo') setEstiloCopiado(Object.fromEntries(CAMPOS_ESTILO.filter((k) => elAtual[k] !== undefined).map((k) => [k, elAtual[k]])))
    else if (a === 'colarEstilo' && estiloCopiado) mudarElemento(estiloCopiado)
    else if (a === 'trocarFoto') arquivoTroca.current?.click()
  }

  function alinharElemento(a: AlinharNoSlide) {
    if (!elAtual) return
    const { w, h } = elAtual
    const pos: Record<AlinharNoSlide, Partial<Elemento>> = {
      esq: { x: 0 }, centroH: { x: 50 - w / 2 }, dir: { x: 100 - w },
      topo: { y: 0 }, meio: { y: 50 - h / 2 }, base: { y: 100 - h },
      inteiro: { x: 0, y: 0, w: 100, h: 100, rot: 0 },
    }
    mudarElemento(pos[a])
  }

  /* Modelos editáveis: trocam o slide por elementos soltos montados com o conteúdo dele */
  function aplicarModelo(modeloId: string) {
    if (!sel) return
    const m = MODELOS.find((x) => x.id === modeloId)
    if (!m) return
    const novos = m.fabrica(sel, coresDoEstilo(estilo))
    alterar(sel.id, { estilo: { ...sel.estilo, layout: 'vazio', elementos: novos } })
    setElSel(null)
  }

  function editarLivremente() {
    aplicarModelo(MODELO_DO_LAYOUT[estilo.layout ?? 'livre'] ?? 'tituloTexto')
  }

  function aplicarDegrade(d: NonNullable<typeof degrade>) {
    setDegrade(d)
    if (!sel) return
    alterar(sel.id, { fundo: d.tipo === 'radial'
      ? `radial-gradient(120% 120% at 50% 100%, ${d.b}, ${d.a})`
      : `linear-gradient(${d.ang}deg, ${d.a}, ${d.b})` })
  }

  function focarTexto() {
    // Espera o painel aparecer e coloca o cursor no campo do texto
    setTimeout(() => { campoTexto.current?.focus(); campoTexto.current?.select() }, 50)
  }

  async function adicionarFotoElemento(file: File) {
    const url = await subirImagem(file)
    if (url) adicionarElemento('foto', { url })
  }

  async function trocarFotoElemento(file: File) {
    const url = await subirImagem(file)
    if (url) mudarElemento({ url })
  }

  async function enviarImagem(file: File) {
    if (!sel) return
    const url = await subirImagem(file)
    if (!url) return
    const data = { publicUrl: url }
    const disposicao = disposicaoPendente.current ?? (disposicaoAtual === 'texto' ? 'esquerda' : disposicaoAtual)
    disposicaoPendente.current = null
    alterar(sel.id, {
      fundo: imagemAtual ? '#000000' : sel.fundo,
      estilo: { ...sel.estilo, foto: data.publicUrl, disposicao },
    })
  }

  function escolherDisposicao(d: Disposicao) {
    if (!sel) return
    if (d !== 'texto' && !fotoAtual) {
      // Precisa de foto: abre o seletor e aplica a disposição quando a foto chegar
      disposicaoPendente.current = d
      arquivo.current?.click()
      return
    }
    if (d === 'texto') { removerFoto(); return }
    alterar(sel.id, {
      fundo: imagemAtual ? '#000000' : sel.fundo,
      estilo: { ...sel.estilo, foto: fotoAtual ?? undefined, disposicao: d },
    })
  }

  function removerFoto() {
    if (!sel) return
    const { foto: _f, disposicao: _d, ...resto } = sel.estilo ?? {}
    void _f; void _d
    alterar(sel.id, { fundo: imagemAtual ? '#000000' : sel.fundo, estilo: resto })
  }

  async function importar(lista: FileList | null) {
    if (!lista?.length || !mensagem || !sessao) return
    const antes = slides
    setErro('')
    try {
      setImportando('Lendo arquivos…')
      const lidos = await lerArquivos(Array.from(lista), setImportando)
      if (!lidos.length) { setErro('Nenhum slide encontrado no arquivo.'); return }

      const linhas: Omit<Slide, 'id'>[] = []
      for (const [i, s] of lidos.entries()) {
        let fundo = sel?.fundo ?? '#000000'
        let est: Partial<EstiloSlide> = sel?.estilo ?? {}
        if (s.imagem) {
          setImportando(`Enviando ${i + 1} de ${lidos.length}…`)
          const caminho = `${sessao.user.id}/${crypto.randomUUID()}.jpg`
          const { error } = await supabase.storage.from('fundos')
            .upload(caminho, s.imagem, { contentType: 'image/jpeg', cacheControl: '31536000' })
          if (error) throw new Error('Falha ao enviar uma das páginas. Verifique a internet.')
          fundo = `img:${supabase.storage.from('fundos').getPublicUrl(caminho).data.publicUrl}`
          est = { escurecer: 0, ajuste: 'conter' }
        }
        linhas.push({
          mensagem_id: mensagem.id, topico_id: destinoImport || null, ordem: slides.length + i,
          titulo: s.titulo ?? null, subtitulo: s.subtitulo ?? null, texto: s.texto ?? null,
          fundo, estilo: est,
        })
      }

      setImportando('Salvando slides…')
      const { data, error } = await supabase.from('slides').insert(linhas).select()
      if (error || !data) throw new Error('Não foi possível salvar os slides.')
      historico.registrar(antes)
      const novos = (data as Slide[]).sort((a, b) => a.ordem - b.ordem)
      setSlides((atual) => [...atual, ...novos])
      setSelId(novos[0].id)
      setPainelImportar(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar.')
    } finally {
      setImportando(null)
    }
  }

  /* Leva a tela e o banco para uma foto anterior (ou posterior) */
  async function aplicar(destino: Slide[]) {
    const atual = slides
    setSlides(destino)
    setSelecao(null)
    if (!destino.some((s) => s.id === selId)) setSelId(destino[0]?.id ?? null)

    const antes = new Map(atual.map((s) => [s.id, s]))
    const depois = new Set(destino.map((s) => s.id))

    for (const s of destino) {
      const a = antes.get(s.id)
      if (!a) continue
      for (const k of CAMPOS_SLIDE) {
        if (diferente(s[k], a[k])) {
          const valor = s[k]
          agendar(`s:${s.id}:${k}`, () => supabase.from('slides').update({ [k]: valor }).eq('id', s.id))
        }
      }
    }

    const recriar = destino.filter((s) => !antes.has(s.id))
    const remover = atual.filter((s) => !depois.has(s.id)).map((s) => s.id)
    remover.forEach((sid) => cancelar(`s:${sid}:`))

    if (recriar.length) {
      const { error } = await supabase.from('slides').upsert(recriar)
      if (error) setErro('Não foi possível restaurar os slides. Verifique a internet.')
    }
    if (remover.length) {
      const { error } = await supabase.from('slides').delete().in('id', remover)
      if (error) setErro('Não foi possível desfazer. Verifique a internet.')
    }
  }

  function desfazerAgora() {
    const f = historico.desfazer(slides)
    if (f) aplicar(f)
  }

  function refazerAgora() {
    const f = historico.refazer(slides)
    if (f) aplicar(f)
  }

  if (mensagem === undefined) return <p className="p-6 text-texto-2">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const indicador = {
    salvo: <><Check size={16} /> Salvo</>,
    salvando: <><LoaderCircle size={16} className="animate-spin" /> Salvando</>,
    erro: <><CircleAlert size={16} /> Não salvou</>,
  }[status]

  const opcoesTopico = (
    <>
      <option value="">Capa</option>
      {topicos.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.titulo || 'Sem título'}</option>)}
    </>
  )

  const blocoGerar = (
    <div className="space-y-3">
      <p className="text-sm text-texto-2">Tudo o que você escreveu vira slide, menos as <b className="text-texto">notas pessoais</b>.</p>
      <button onClick={gerar} disabled={gerando} className={slides.length ? 'botao-secundario' : 'botao-primario'}>
        <ListPlus size={18} />
        {gerando ? 'Gerando…' : `${slides.length ? 'Gerar de novo' : 'Gerar'} a partir ${mensagem?.tipo === 'estudo' ? 'dos blocos' : topicos.some((t) => ehBloco(t.tipo)) ? 'do roteiro' : 'dos tópicos'}`}
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pt-8">
      {/* Barra do topo */}
      <div className="flex items-center gap-1">
        <Link to={`/mensagem/${mensagem.id}`} className="botao-fantasma -ml-2 px-2">
          <ChevronLeft size={20} /> Mensagem
        </Link>
        {papelAtual === 'dono' && <Link to={`/mensagem/${mensagem.id}/compartilhar`} className="botao-secundario px-2 py-1.5 text-xs sm:text-sm">
          Convidar
        </Link>}
        <span className={`ml-auto mr-2 flex items-center gap-1.5 text-sm ${status === 'erro' ? 'text-perigo' : 'text-texto-2'}`}>
          {indicador}
        </span>
        <button onClick={desfazerAgora} disabled={!historico.podeDesfazer}
          aria-label="Desfazer" title="Desfazer (Cmd + Z)" className={iconeBotao}>
          <Undo2 size={18} />
        </button>
        <button onClick={refazerAgora} disabled={!historico.podeRefazer}
          aria-label="Refazer" title="Refazer (Cmd + Shift + Z)" className={iconeBotao}>
          <Redo2 size={18} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Slides</h1>
          <p className="truncate text-sm text-texto-2 sm:text-base">{mensagem.titulo}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <button onClick={() => setPainelImportar((v) => !v)} className="botao-secundario px-2 sm:px-4">
            <Upload size={18} /> Importar
          </button>
          <div className="relative">
            <button onClick={() => setMenuExportar((v) => !v)} disabled={!slides.length || !!exportando}
              aria-expanded={menuExportar} className="botao-secundario w-full px-2 sm:px-4">
              {exportando
                ? <><LoaderCircle size={18} className="animate-spin" /> {exportando}</>
                : <><Download size={18} /> Exportar</>}
            </button>
            {menuExportar && (
              <>
                <div className="fixed inset-0 z-30 bg-black/40 sm:bg-transparent" onClick={() => setMenuExportar(false)} />
                {/* Celular: folha embaixo, ao alcance do polegar. Computador: menu suspenso */}
                <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 animate-subir rounded-3xl border border-borda bg-superficie p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:animate-entrar sm:rounded-2xl sm:p-1.5">
                  <p className="rotulo px-3 pb-1 pt-2 sm:hidden">Exportar slides</p>
                  <button onClick={() => exportar('pptx')} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-superficie-2">
                    <Presentation size={18} className="mt-0.5 shrink-0 text-tinta" />
                    <span><b className="block text-sm">PowerPoint (.pptx)</b><span className="text-xs text-texto-2">Com suas anotações nas notas do apresentador</span></span>
                  </button>
                  <button onClick={() => exportar('pdf')} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-superficie-2">
                    <FileText size={18} className="mt-0.5 shrink-0 text-tinta" />
                    <span><b className="block text-sm">PDF</b><span className="text-xs text-texto-2">Bom para mandar no WhatsApp</span></span>
                  </button>
                </div>
              </>
            )}
          </div>
          <Link to={`/pregar/${mensagem.id}`} className="botao-primario px-2 sm:px-4">
            <Play size={18} /> Pregar
          </Link>
        </div>
      </div>

      {erro && <p role="alert" className="mt-4 text-sm text-perigo">{erro}</p>}

      {painelImportar && (
        <section className="mt-6 space-y-4 rounded-3xl border border-borda bg-superficie p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Importar apresentação</h2>
            <button onClick={() => setPainelImportar(false)} aria-label="Fechar" className={iconeBotao}>
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-superficie-2 p-4">
              <p className="font-semibold">PDF ou imagens</p>
              <p className="mt-1 text-texto-2">
                Cada página vira um slide idêntico ao original. No PowerPoint, Keynote ou Google Slides,
                use Arquivo e depois Salvar como PDF.
              </p>
            </div>
            <div className="rounded-2xl bg-superficie-2 p-4">
              <p className="font-semibold">PowerPoint (.pptx)</p>
              <p className="mt-1 text-texto-2">Traz só os textos, para você aplicar o visual do Pulpito.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <Campo rotulo="Os slides vão aparecer em">
              <select value={destinoImport} onChange={(e) => setDestinoImport(e.target.value)} className="campo sm:w-auto">
                {opcoesTopico}
              </select>
            </Campo>
            <input ref={arquivoImport} type="file" multiple accept=".pdf,.pptx,image/*" className="hidden"
              onChange={(e) => { importar(e.target.files); e.target.value = '' }} />
            <button onClick={() => arquivoImport.current?.click()} disabled={!!importando} className="botao-primario w-full sm:w-auto">
              {importando ? <LoaderCircle size={18} className="animate-spin" /> : <Upload size={18} />}
              {importando ?? 'Escolher arquivos'}
            </button>
          </div>
        </section>
      )}

      {slides.length === 0 ? (
        <section className="mt-6 space-y-5 rounded-3xl border border-borda bg-superficie p-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Monte os slides desta mensagem</h2>
            <p className="mt-1 max-w-xl text-texto-2">
              Gere uma capa e um slide por tópico, com título e versículo, e depois personalize.
              Ou importe uma apresentação pronta. Enquanto não houver slides, o telão usa o visual automático.
            </p>
          </div>
          {blocoGerar}
          <button onClick={() => inserirDepois({ topico_id: null, titulo: mensagem.titulo })}
            className="botao-fantasma -ml-2 px-2 text-sm">
            <Plus size={16} /> Começar com um slide em branco
          </button>
        </section>
      ) : (
        <>
          {/* Seleção de vários */}
          {selecao ? (
            <div className="sticky top-0 z-10 -mx-4 mt-6 border-b border-borda bg-fundo/95 px-4 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {selecao.size} {selecao.size === 1 ? 'selecionado' : 'selecionados'}
                </span>
                <button onClick={() => setSelecao(new Set(slides.map((s) => s.id)))}
                  className="botao-fantasma px-2 py-1 text-sm">Todos</button>
                <select value="" disabled={!selecao.size} aria-label="Mover selecionados para"
                  onChange={(e) => moverSelecionados(e.target.value)} className="campo w-auto py-1.5 text-sm">
                  <option value="" disabled>Mover para…</option>
                  <option value="capa">Capa</option>
                  {topicos.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.titulo || 'Sem título'}</option>)}
                </select>
                <button onClick={excluirSelecionados} disabled={!selecao.size} className={`${botaoPequeno} hover:text-perigo`}>
                  <Trash2 size={16} /> Excluir
                </button>
                <button onClick={() => setSelecao(null)} className="botao-primario ml-auto px-3 py-1.5 text-sm">
                  <Check size={16} /> Concluir
                </button>
              </div>
              <p className="mt-1.5 text-xs text-texto-2">
                Toque nos slides para marcar. No computador, Shift + clique marca um intervalo.
              </p>
            </div>
          ) : (
            <button onClick={() => { setSelecao(new Set()); setAncora(null) }}
              className="botao-fantasma -ml-2 mt-6 px-2 text-sm">
              <ListChecks size={18} /> Selecionar vários
            </button>
          )}

          <div className="mt-3 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Miniaturas */}
            <aside className="sem-barra -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 sm:gap-3 lg:mx-0 lg:max-h-[80dvh] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:px-0">
              {slides.map((s, i) => {
                const marcado = !!selecao?.has(s.id)
                const destaque = selecao ? marcado : s.id === sel?.id
                return (
                  <button key={s.id} onClick={(e) => clicarMiniatura(s, e)} aria-pressed={selecao ? marcado : undefined}
                    className={`relative w-32 shrink-0 select-none sm:w-40 rounded-xl p-1 text-left transition lg:w-full ${destaque
                      ? 'bg-superficie ring-2 ring-acao' : 'ring-1 ring-borda hover:ring-texto-2'}`}>
                    <SlideVisual slide={s} className={`rounded-lg ${selecao && !marcado ? 'opacity-60' : ''}`} />
                    {selecao && (
                      <span className={`absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full ${marcado
                        ? 'bg-acao text-acao-texto' : 'border-2 border-white/80 bg-black/30'}`}>
                        {marcado && <CircleCheck size={18} />}
                      </span>
                    )}
                    <p className="mt-1.5 truncate px-1 pb-0.5 text-xs text-texto-2">
                      <b className="text-texto">{i + 1}</b> {rotuloTopico(s.topico_id)}
                    </p>
                  </button>
                )
              })}
              {!selecao && (
                <button onClick={() => inserirDepois({})}
                  className="flex w-24 shrink-0 flex-col items-center sm:w-40 sm:flex-row justify-center gap-1.5 rounded-xl border border-dashed border-borda py-4 text-sm font-semibold text-texto-2 hover:border-acao hover:text-tinta lg:w-full">
                  <Plus size={16} /> Slide
                </button>
              )}
            </aside>

            {sel && (
              <section className="min-w-0 space-y-5">
                {/* Prévia: fica presa no topo enquanto um elemento é editado */}
                <div className={elAtual ? 'sticky top-0 z-20 -mx-4 bg-fundo/95 px-4 pb-3 pt-2 backdrop-blur md:mx-0 md:px-0' : ''}>
                  {/* Enquanto edita, a prévia fica visível ao rolar o painel (e não ocupa mais que ~40% da altura) */}
                  <div className="relative mx-auto" style={elAtual ? { maxWidth: 'min(100%, calc(42dvh * 16 / 9))' } : undefined}>
                    <SlideVisual className="rounded-2xl ring-1 ring-borda"
                      slide={rascunhoEl ? { ...sel, estilo: { ...sel.estilo, elementos: elementos.map((x) => (x.id === rascunhoEl.id ? rascunhoEl : x)) } } : sel} />
                    <CamadaElementos elementos={rascunhoEl ? elementos.map((x) => (x.id === rascunhoEl.id ? rascunhoEl : x)) : elementos}
                      selecionado={elSel} onSelecionar={setElSel} onPreview={setRascunhoEl}
                      onConfirmar={(el) => salvarElementos(elementos.map((x) => (x.id === el.id ? el : x)))}
                      onEditarTexto={(el) => { setElSel(el.id); focarTexto() }} />
                  </div>
                </div>

                {/* Ações do slide: no celular, quatro botões iguais logo abaixo da prévia */}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2">
                    <button onClick={() => mover(-1)} disabled={iSel === 0} className={acaoSlide}>
                      <ArrowUp size={16} /> Antes
                    </button>
                    <button onClick={() => mover(1)} disabled={iSel === slides.length - 1} className={acaoSlide}>
                      <ArrowDown size={16} /> Depois
                    </button>
                    <button onClick={() => inserirDepois({ ...sel })} className={acaoSlide}>
                      <Copy size={16} /> Duplicar
                    </button>
                    <button onClick={excluir} className={`${acaoSlide} hover:text-perigo`}>
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-texto-2 sm:ml-auto">
                    <span className="shrink-0">Aparece em</span>
                    <select value={sel.topico_id ?? ''} className="campo min-w-0 flex-1 py-1.5 sm:w-auto sm:flex-none"
                      onChange={(e) => alterar(sel.id, { topico_id: e.target.value || null })}>
                      {opcoesTopico}
                    </select>
                  </label>
                </div>

                {/* Adicionar elementos */}
                <div className="rounded-2xl border border-borda bg-superficie p-3">
                  <span className="rotulo mb-2 block sm:hidden">Adicionar ao slide</span>
                  <div className="sem-barra -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                    <span className="rotulo mr-1 hidden sm:inline">Adicionar</span>
                    <input ref={arquivoElemento} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) adicionarFotoElemento(f); e.target.value = '' }} />
                    <input ref={arquivoTroca} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) trocarFotoElemento(f); e.target.value = '' }} />
                    <button onClick={() => { adicionarElemento('texto', { texto: 'Título', tam: 6, w: 70, h: 18, caixaAlta: true }); focarTexto() }} className={ferramenta}><Heading size={15} /> Título</button>
                    <button onClick={() => { adicionarElemento('texto'); focarTexto() }} className={ferramenta}><TypeIcon size={15} /> Texto</button>
                    <button onClick={() => arquivoElemento.current?.click()} disabled={enviando} className={ferramenta}><ImagePlus size={15} /> Foto</button>
                    <button onClick={() => adicionarElemento('retangulo')} className={ferramenta}><Square size={15} /> Retângulo</button>
                    <button onClick={() => adicionarElemento('circulo')} className={ferramenta}><Circle size={15} /> Círculo</button>
                    <button onClick={() => adicionarElemento('triangulo')} className={ferramenta}><Triangle size={15} /> Triângulo</button>
                    <button onClick={() => adicionarElemento('losango')} className={ferramenta}><Diamond size={15} /> Losango</button>
                    <button onClick={() => adicionarElemento('estrela')} className={ferramenta}><Star size={15} /> Estrela</button>
                    <button onClick={() => adicionarElemento('balao')} className={ferramenta}><MessageSquare size={15} /> Balão</button>
                    <button onClick={() => adicionarElemento('seta')} className={ferramenta}><MoveRight size={15} /> Seta</button>
                    <button onClick={() => adicionarElemento('linha')} className={ferramenta}><Minus size={15} /> Linha</button>
                    <button onClick={() => adicionarElemento('icone')} className={ferramenta}><Shapes size={15} /> Ícone</button>
                  </div>

                  {elAtual ? (
                    <div className="mt-3 border-t border-borda pt-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-texto-2">
                          Arraste para mover; puxe as bolinhas para o tamanho e a de cima para girar.
                          <span className="hidden sm:inline"> Setas do teclado ajustam; Ctrl+D duplica.</span>
                        </p>
                        <button onClick={() => setElSel(null)} className="botao-fantasma shrink-0 px-2 py-1 text-sm">Pronto</button>
                      </div>
                      <PainelElemento key={elAtual.id} el={elAtual} onMudar={mudarElemento} onAcao={acaoElemento}
                        onAlinhar={alinharElemento} temEstiloCopiado={!!estiloCopiado} campoTexto={campoTexto} />
                    </div>
                  ) : elementos.length > 0 && (
                    <p className="mt-2 text-xs text-texto-2">Toque num elemento do slide para editar. Dois toques num texto abrem a edição.</p>
                  )}

                  {/* Camadas: todos os elementos do slide, de cima para baixo */}
                  {elementos.length > 0 && (
                    <div className="mt-3 border-t border-borda pt-3">
                      <button onClick={() => setVerCamadas((v) => !v)} className="flex w-full items-center gap-2 text-sm font-bold text-texto-2">
                        <Layers size={16} /> Camadas ({elementos.length})
                        <span className="ml-auto text-xs font-semibold">{verCamadas ? 'Esconder' : 'Ver'}</span>
                      </button>
                      {verCamadas && (
                        <ul className="mt-2 space-y-1">
                          {[...elementos].reverse().map((el) => (
                            <li key={el.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${el.id === elSel ? 'bg-acao/15' : 'hover:bg-superficie-2'}`}>
                              <button onClick={() => setElSel(el.id)} className={`min-w-0 flex-1 truncate text-left text-sm ${el.oculto ? 'text-texto-2 line-through' : ''}`}>
                                <span className="mr-1.5 text-xs font-bold uppercase text-texto-2">{NOMES_ELEMENTO[el.tipo]}</span>
                                {el.tipo === 'texto' ? (el.texto || 'Texto').split('\n')[0] : ''}
                              </button>
                              <button onClick={() => salvarElementos(elementos.map((x) => (x.id === el.id ? { ...x, oculto: !x.oculto } : x)))}
                                aria-label={el.oculto ? 'Mostrar' : 'Ocultar'} className={iconeBotao}>{el.oculto ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                              <button onClick={() => salvarElementos(elementos.map((x) => (x.id === el.id ? { ...x, travado: !x.travado } : x)))}
                                aria-label={el.travado ? 'Destravar' : 'Travar'} className={`${iconeBotao} ${el.travado ? 'text-tinta' : ''}`}><Lock size={15} /></button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Modelos editáveis, com prévia usando o conteúdo deste slide */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rotulo flex items-center gap-1.5"><LayoutTemplate size={14} /> Modelos editáveis</span>
                    <span className="text-xs text-texto-2">tudo vira caixa livre</span>
                  </div>
                  <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                    {MODELOS.map((m) => (
                      <button key={m.id} onClick={() => aplicarModelo(m.id)}
                        className="w-36 shrink-0 rounded-xl border-2 border-borda bg-superficie p-1.5 text-left transition-colors hover:border-acao">
                        <SlideVisual className="pointer-events-none rounded-md"
                          slide={{ ...sel, estilo: { ...sel.estilo, layout: 'vazio', elementos: m.fabrica(sel, coresDoEstilo(estilo)) } }} />
                        <span className="mt-1 block truncate px-0.5 text-xs font-bold">{m.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disposição: onde fica a foto em relação ao texto */}
                <div>
                  <span className="rotulo mb-2 block">Disposição do slide</span>
                  <div className="sem-barra flex gap-2 overflow-x-auto pb-1">
                    {DISPOSICOES.map((d) => (
                      <button key={d.valor} onClick={() => escolherDisposicao(d.valor)} aria-pressed={disposicaoAtual === d.valor}
                        className={`w-28 shrink-0 rounded-xl border-2 bg-superficie p-1.5 text-left transition-colors ${disposicaoAtual === d.valor ? 'border-acao' : 'border-borda hover:border-texto-2'}`}>
                        <MiniDisposicao d={d.valor} />
                        <span className="mt-1 block truncate px-0.5 text-xs font-bold">{d.rotulo}</span>
                      </button>
                    ))}
                  </div>
                </div>


                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
                  {/* Textos */}
                  {estilo.layout === 'vazio' ? (
                    <div className="space-y-3 rounded-2xl border border-dashed border-borda p-4">
                      <p className="font-semibold">Este slide está no modo livre</p>
                      <p className="text-sm text-texto-2">
                        Cada texto é uma caixa: toque nele no slide para mudar o conteúdo, a fonte, a cor e o tamanho.
                        Use “Adicionar” para colocar mais textos, fotos e formas.
                      </p>
                      <button onClick={() => {
                        alterar(sel.id, { estilo: { ...sel.estilo, layout: 'livre', elementos: elementos.filter((x) => x.tipo !== 'texto') } })
                        setElSel(null)
                      }} className={botaoPequeno}>
                        Voltar ao modelo automático
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    <Campo rotulo="Título">
                      <input value={sel.titulo ?? ''} className="campo"
                        onChange={(e) => alterar(sel.id, { titulo: e.target.value })} />
                    </Campo>
                    <Campo rotulo="Subtítulo">
                      <input value={sel.subtitulo ?? ''} className="campo"
                        onChange={(e) => alterar(sel.id, { subtitulo: e.target.value })} />
                    </Campo>
                    <Campo rotulo="Texto">
                      <textarea rows={6} value={sel.texto ?? ''} className="campo resize-y leading-relaxed"
                        onChange={(e) => alterar(sel.id, { texto: e.target.value })} />
                    </Campo>
                    <p className="text-xs text-texto-2">Dica: *palavra* entre asteriscos aparece na cor de destaque.</p>
                    <button onClick={editarLivremente} className="botao-secundario w-full">
                      <Wand2 size={17} /> Editar livremente (mover e estilizar cada texto)
                    </button>
                  </div>
                  )}

                  {/* Visual */}
                  <div className="space-y-5 rounded-2xl border border-borda bg-superficie p-4">
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-texto-2">Fundo</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {FUNDOS_PRONTOS.map((f) => (
                          <button key={f.nome} title={f.nome} aria-label={f.nome}
                            onClick={() => alterar(sel.id, { fundo: f.valor })} style={{ background: f.valor }}
                            className={`h-9 w-9 rounded-xl ${sel.fundo === f.valor ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
                        ))}
                        <label title="Cor personalizada"
                          className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-xl ring-1 ring-borda"
                          style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                          <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
                            value={sel.fundo?.startsWith('#') ? sel.fundo : '#000000'}
                            onChange={(e) => alterar(sel.id, { fundo: e.target.value })} />
                        </label>
                        <button onClick={() => (degrade ? setDegrade(null) : aplicarDegrade({ a: '#1e1b4b', b: '#db2777', ang: 135, tipo: 'linear' }))}
                          className={`h-9 rounded-xl border px-3 text-sm font-semibold ${degrade ? 'border-acao bg-acao/15' : 'border-borda'}`}>
                          Degradê
                        </button>
                      </div>
                      {degrade && (
                        <div className="mt-3 space-y-3 rounded-xl bg-superficie-2 p-3">
                          <div className="flex items-center gap-3">
                            {(['a', 'b'] as const).map((k) => (
                              <label key={k} className="flex items-center gap-2 text-sm text-texto-2">
                                {k === 'a' ? 'Cor 1' : 'Cor 2'}
                                <input type="color" value={degrade[k]} onChange={(e) => aplicarDegrade({ ...degrade, [k]: e.target.value })}
                                  className="h-9 w-11 cursor-pointer rounded-lg border border-borda bg-transparent" />
                              </label>
                            ))}
                            <button onClick={() => aplicarDegrade({ ...degrade, a: degrade.b, b: degrade.a })} className="botao-fantasma ml-auto px-2 py-1 text-sm">Inverter</button>
                          </div>
                          <Segmentos valor={degrade.tipo}
                            opcoes={[{ valor: 'linear', rotulo: 'Reto' }, { valor: 'radial', rotulo: 'Luz de baixo' }]}
                            onChange={(v) => aplicarDegrade({ ...degrade, tipo: v })} />
                          {degrade.tipo === 'linear' && (
                            <label className="block text-sm text-texto-2">
                              Direção ({degrade.ang}°)
                              <input type="range" min={0} max={360} step={15} value={degrade.ang}
                                onChange={(e) => aplicarDegrade({ ...degrade, ang: Number(e.target.value) })} className="w-full accent-[var(--acao)]" />
                            </label>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input ref={arquivo} type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarImagem(f); e.target.value = '' }} />
                        <button onClick={() => arquivo.current?.click()} disabled={enviando} className={botaoPequeno}>
                          <ImagePlus size={16} /> {enviando ? 'Enviando…' : fotoAtual ? 'Trocar foto' : 'Adicionar foto'}
                        </button>
                        {fotoAtual && (
                          <button onClick={removerFoto} className="botao-fantasma px-3 py-1.5 text-sm">
                            Remover foto
                          </button>
                        )}
                      </div>
                    </div>

                    {fotoAtual && (
                      <div className="space-y-4">
                        <div>
                          <span className="mb-2 block text-sm font-semibold text-texto-2">Posição da foto</span>
                          <Segmentos valor={estilo.fotoPos ?? 'center'}
                            opcoes={[{ valor: 'top', rotulo: 'Cima' }, { valor: 'center', rotulo: 'Centro' }, { valor: 'bottom', rotulo: 'Baixo' }]}
                            onChange={(v) => alterarEstilo({ fotoPos: v })} />
                        </div>
                        {['esquerda', 'direita', 'cima'].includes(disposicaoAtual) && (
                          <div>
                            <span className="mb-2 block text-sm font-semibold text-texto-2">Tamanho da foto</span>
                            <Segmentos valor={String(estilo.fotoTam ?? 0.5)}
                              opcoes={[{ valor: '0.33', rotulo: '1/3' }, { valor: '0.5', rotulo: 'Metade' }, { valor: '0.66', rotulo: '2/3' }]}
                              onChange={(v) => alterarEstilo({ fotoTam: Number(v) })} />
                          </div>
                        )}
                        <div>
                          <span className="mb-2 block text-sm font-semibold text-texto-2">Enquadramento</span>
                          <Segmentos valor={estilo.ajuste}
                            opcoes={[{ valor: 'cobrir', rotulo: 'Preencher' }, { valor: 'conter', rotulo: 'Mostrar inteira' }]}
                            onChange={(v) => alterarEstilo({ ajuste: v })} />
                        </div>
                        {disposicaoAtual === 'fundo' && <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-texto-2">Escurecer a foto</span>
                          <input type="range" min={0} max={0.8} step={0.05} value={estilo.escurecer}
                            onChange={(e) => alterarEstilo({ escurecer: Number(e.target.value) })}
                            className="w-full accent-[var(--acao)]" />
                        </label>}
                      </div>
                    )}

                    <div>
                      <span className="mb-2 block text-sm font-semibold text-texto-2">Cor do texto</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {CORES_TEXTO.map((c) => (
                          <button key={c} onClick={() => alterarEstilo({ cor: c })} style={{ background: c }}
                            aria-label={`Texto na cor ${c}`}
                            className={`h-8 w-8 rounded-full ${estilo.cor === c ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
                        ))}
                        <input type="color" value={estilo.cor} onChange={(e) => alterarEstilo({ cor: e.target.value })}
                          aria-label="Cor personalizada do texto" className="h-8 w-10 cursor-pointer rounded bg-transparent" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-4">
                      <div className="w-full">
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Modelo automático</span>
                        <Segmentos valor={estilo.layout ?? 'livre'}
                          opcoes={[
                            { valor: 'livre', rotulo: 'Livre' }, { valor: 'capa', rotulo: 'Capa' },
                            { valor: 'topico', rotulo: 'Tópico' }, { valor: 'versiculo', rotulo: 'Versículo' },
                            { valor: 'frase', rotulo: 'Frase' },
                          ]}
                          onChange={(v) => alterarEstilo({ layout: v })} />
                      </div>
                      <div>
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Destaque</span>
                        <div className="flex items-center gap-1.5">
                          {['#FFC107', '#E8B44A', '#2DD4BF', '#7dd3fc', '#ffffff'].map((c) => (
                            <button key={c} onClick={() => alterarEstilo({ destaque: c })} aria-label={`Destaque ${c}`}
                              style={{ background: c }}
                              className={`h-8 w-8 rounded-full ${(estilo.destaque ?? '#FFC107') === c ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Alinhamento</span>
                        <Segmentos valor={estilo.alinhamento}
                          opcoes={[{ valor: 'center', rotulo: 'Centro' }, { valor: 'left', rotulo: 'Esquerda' }]}
                          onChange={(v) => alterarEstilo({ alinhamento: v })} />
                      </div>
                      <div>
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Tamanho</span>
                        <Segmentos valor={estilo.tamanho}
                          opcoes={[{ valor: 'p', rotulo: 'P' }, { valor: 'm', rotulo: 'M' }, { valor: 'g', rotulo: 'G' }]}
                          onChange={(v) => alterarEstilo({ tamanho: v })} />
                      </div>
                      <div className="grid w-full gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-texto-2">Fonte dos títulos</span>
                          <select value={estilo.fonteTitulo ?? (estilo.fonte === 'serif' ? 'classica' : 'moderna')} className="campo"
                            onChange={(e) => alterarEstilo({ fonteTitulo: e.target.value })}
                            style={{ fontFamily: FONTES.find((f) => f.id === (estilo.fonteTitulo ?? 'moderna'))?.css }}>
                            {FONTES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-texto-2">Fonte do texto</span>
                          <select value={estilo.fonteTexto ?? 'classica'} className="campo"
                            onChange={(e) => alterarEstilo({ fonteTexto: e.target.value })}
                            style={{ fontFamily: FONTES.find((f) => f.id === (estilo.fonteTexto ?? 'classica'))?.css }}>
                            {FONTES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>

                    <button onClick={aplicarATodos} className={`${botaoPequeno} w-full`}>
                      Aplicar este fundo e estilo a todos os slides
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-borda bg-superficie p-4">{blocoGerar}</div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}