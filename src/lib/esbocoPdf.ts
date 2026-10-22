import type { Mensagem, Topico } from './tipos'
import { defBloco, ehBloco, itensDaLista, nomeFormato } from './blocos'
import { dividirReferencias, formatarReferencia, lerReferencia, parseReferencia } from './biblia'
import { lerVersao } from './preferencias'

/*
  Esboço em PDF (A4), para enviar à liderança ou imprimir:
  faixa com título e texto base, cada tópico numerado com versículos por extenso,
  frase-chave em destaque, observação, aplicação e ilustração. Blocos entram resumidos.
  As notas pessoais só entram se pedir.
*/

const nomeArquivo = (t: string) =>
  (t || 'esboco').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'esboco'

type Cor = [number, number, number]
const OURO: Cor = [176, 128, 0]
const TINTA: Cor = [28, 26, 22]
const CINZA: Cor = [110, 106, 98]

export async function gerarEsbocoPdf(m: Mensagem, itens: Topico[], opcoes: { comNotas?: boolean; autor?: string } = {}) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 20, L = 210 - 2 * M, FIM = 297 - 18
  let y = 0
  const versao = lerVersao()

  const novaPagina = () => { pdf.addPage(); y = 22 }
  const quebra = (alt: number) => { if (y + alt > FIM) novaPagina() }
  const texto = (t: string, tam: number, estilo: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', cor: Cor = TINTA, recuo = 0, entre = 0.45) => {
    pdf.setFont('helvetica', estilo); pdf.setFontSize(tam); pdf.setTextColor(...cor)
    const linhas = pdf.splitTextToSize(t, L - recuo) as string[]
    const alt = tam * entre
    for (const l of linhas) { quebra(alt); pdf.text(l, M + recuo, y); y += alt }
  }
  const versiculos = async (valor: string | null, recuo = 0) => {
    for (const ref of dividirReferencias(valor)) {
      const r = parseReferencia(ref)
      if (!r) { texto(ref, 10.5, 'bold', OURO, recuo); continue }
      texto(`${formatarReferencia(r)} (${versao})`, 10.5, 'bold', OURO, recuo)
      try {
        const vs = await lerReferencia(versao, r)
        texto(vs.map((v) => `${v.numero} ${v.texto}`).join(' '), 10.5, 'italic', CINZA, recuo + 3)
      } catch { /* sem internet: fica só a referência */ }
      y += 1.5
    }
  }

  // Faixa do topo
  pdf.setFillColor(20, 18, 14); pdf.rect(0, 0, 210, 46, 'F')
  pdf.setFillColor(234, 179, 8); pdf.rect(0, 46, 210, 1.6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(234, 179, 8)
  const d = m.detalhes ?? {}
  const rotulo = m.tipo === 'estudo' ? 'ESTUDO' : nomeFormato(d.formato).toUpperCase()
  pdf.text([rotulo, d.serie ? `${d.serie.toUpperCase()}${d.serieNumero ? ` · ${d.serieNumero}` : ''}` : ''].filter(Boolean).join('   ·   '), M, 16)
  pdf.setFontSize(22); pdf.setTextColor(255, 255, 255)
  const tit = (pdf.splitTextToSize(m.titulo || 'Sem título', L) as string[]).slice(0, 2)
  pdf.text(tit, M, 27)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(200, 196, 186)
  pdf.text([m.texto_base, `${m.tempo_minutos} min`, opcoes.autor].filter(Boolean).join('   ·   '), M, tit.length > 1 ? 41 : 36)
  y = 58

  if (d.objetivo) { texto('OBJETIVO', 8.5, 'bold', CINZA); y += 1.6; texto(d.objetivo, 11.5); y += 4 }

  // Texto base por extenso
  if (m.texto_base) {
    texto('TEXTO BASE', 8.5, 'bold', CINZA); y += 1.6
    await versiculos(m.texto_base)
    y += 3
  }

  let n = 0
  for (const t of itens) {
    quebra(24)
    if (ehBloco(t.tipo) || m.tipo === 'estudo') {
      const def = defBloco(t)
      texto(`${def.nome.toUpperCase()}${t.extra?.minutos ? `  ·  ${t.extra.minutos} min` : ''}`, 8.5, 'bold', CINZA)
      y += 1.6
      if (t.tipo === 'citacao') texto(`“${t.titulo}”${t.extra?.autor ? ` — ${t.extra.autor}` : ''}`, 12, 'italic')
      else if (t.titulo) texto(t.titulo, 12.5, 'bold')
      if (t.tipo === 'lista') itensDaLista(t.observacao).forEach((it) => texto(`•  ${it}`, 10.5, 'normal', TINTA, 3))
      else if (t.tipo === 'pergunta' && t.extra?.opcoes?.length) t.extra.opcoes.filter((o) => o.trim()).forEach((o, k) => texto(`${'ABCDEF'[k]})  ${o}`, 10.5, 'normal', TINTA, 3))
      else if (t.observacao && t.tipo !== 'pergunta') texto(t.observacao, 10.5)
      if (t.versiculo) await versiculos(t.versiculo, 3)
      if (opcoes.comNotas && t.notas) texto(`Nota: ${t.notas}`, 9.5, 'italic', CINZA, 3)
      y += 6
      continue
    }
    n++
    // Número em círculo + título
    quebra(16)
    pdf.setFillColor(234, 179, 8); pdf.circle(M + 4, y - 1.6, 4, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(20, 18, 14)
    pdf.text(String(n), M + 4, y - 0.2, { align: 'center' })
    texto(t.titulo || 'Sem título', 14, 'bold', TINTA, 11)
    y += 1.5
    if (t.versiculo) await versiculos(t.versiculo, 11)
    const partes: [string, string | null][] = [['Observação', t.observacao], ['Ilustração', t.ilustracao], ['Aplicação', t.aplicacao]]
    for (const [rot, val] of partes) {
      if (!val?.trim()) continue
      texto(rot.toUpperCase(), 8, 'bold', CINZA, 11)
      y += 1.4
      texto(val.trim(), 10.5, 'normal', TINTA, 11)
      y += 1.5
    }
    if (t.frase_chave?.trim()) {
      const ini = y
      texto(`“${t.frase_chave.trim().replace(/^["“]|["”]$/g, '')}”`, 11.5, 'bolditalic', OURO, 15)
      pdf.setDrawColor(234, 179, 8); pdf.setLineWidth(0.8); pdf.line(M + 12, ini - 4, M + 12, y - 3)
      y += 1.5
    }
    if (opcoes.comNotas && t.notas?.trim()) {
      texto('NOTAS', 8, 'bold', CINZA, 11)
      y += 1.4
      texto(t.notas.trim(), 10.5, 'italic', CINZA, 11)
      y += 1.5
    }
    y += 6
  }

  // Rodapé com página
  const total = pdf.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...CINZA)
    pdf.text('Feito com o Pulpito', M, 297 - 9)
    pdf.text(`${p} / ${total}`, 210 - M, 297 - 9, { align: 'right' })
  }
  pdf.save(`${nomeArquivo(m.titulo)}.pdf`)
}
