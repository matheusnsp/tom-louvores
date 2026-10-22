export type Mensagem = {
  id: string
  proprietario_compartilhamento?: string // identidade imutável do dono
  titulo: string
  texto_base: string | null
  tempo_minutos: number
  pasta_id: string | null
  criado_em: string
  atualizado_em: string
  tipo?: TipoProjeto // ausente = pregação (banco sem a coluna nova)
  detalhes?: DetalhesEstudo
  excluida_em?: string | null // na lixeira desde (banco com o SQL da lixeira)
}

export type TipoProjeto = 'pregacao' | 'estudo'
export type DetalhesEstudo = {
  objetivo?: string; publico?: string; material?: string; referencias?: string
  esperaTitulo?: string; esperaTexto?: string // o que a turma vê no celular enquanto não há pergunta
  formato?: string // no lado Palavra: pregacao, celula, ebd, devocional, discipulado
  ehModelo?: boolean // modelo próprio: não aparece nas listas, só em "Criar novo"
  serie?: string; serieNumero?: number // série de mensagens ("Aula 1, 2, 3…")
  dadaEm?: string // quando foi pregada/dada (marca o progresso da série)
}

export type Topico = {
  id: string
  mensagem_id: string
  ordem: number
  titulo: string
  versiculo: string | null
  observacao: string | null
  aplicacao: string | null
  ilustracao: string | null
  frase_chave: string | null
  notas: string | null
  tipo?: string // 'topico' na pregação; nos estudos, o tipo do bloco (ver lib/blocos)
  extra?: { minutos?: number; url?: string; autor?: string; opcoes?: string[]; correta?: number }
}

/* Na mesma ordem em que viram slides (as notas pessoais nunca viram slide) */
export const CAMPOS_TOPICO = [
  { chave: 'observacao', rotulo: 'Observação', dica: 'O que o texto diz' },
  { chave: 'ilustracao', rotulo: 'Ilustração', dica: 'História, exemplo ou comparação' },
  { chave: 'aplicacao', rotulo: 'Aplicação', dica: 'Como isso se aplica à vida' },
  { chave: 'frase_chave', rotulo: 'Frase-chave', dica: 'A frase que resume o ponto' },
  { chave: 'notas', rotulo: 'Notas pessoais', dica: 'Lembretes só para você' },
] as const satisfies readonly { chave: keyof Topico; rotulo: string; dica: string }[]

export type Evento = {
  id: string
  titulo: string
  local: string | null
  inicio: string
  mensagem_id: string | null
  lembretes: number[]
}

export const OPCOES_LEMBRETE = [
  { minutos: 1440, rotulo: '1 dia antes' },
  { minutos: 180, rotulo: '3 horas antes' },
  { minutos: 60, rotulo: '1 hora antes' },
  { minutos: 15, rotulo: '15 min antes' },
]

export type Pasta = {
  id: string
  nome: string
}

export type EstiloSlide = {
  cor: string
  alinhamento: 'left' | 'center'
  tamanho: 'p' | 'm' | 'g'
  fonte: 'sans' | 'serif'
  escurecer: number // 0 a 0.8, usado só com imagem de fundo
  ajuste: 'cobrir' | 'conter' // foto preenche o slide ou aparece inteira
  layout?: LayoutSlide // como o texto é arrumado (capa, tópico, versículo, frase)
  destaque?: string // cor de destaque (referências, faixa, aspas)
  disposicao?: Disposicao // onde fica a foto em relação ao texto
  foto?: string // URL da foto do slide
  fotoPos?: 'top' | 'center' | 'bottom' // parte da foto que aparece
  fotoTam?: number // fração do slide ocupada pela foto (0.33, 0.5, 0.66)
  elementos?: Elemento[] // fotos extras, setas, formas, ícones e textos soltos
  fonteTitulo?: string // fonte dos títulos do modelo (ver lib/fontes)
  fonteTexto?: string // fonte do texto e do versículo
}

/* Elemento solto no slide. Posição e tamanho em % do slide; medidas de texto e traço em cqw */
export type TipoElemento = 'foto' | 'seta' | 'circulo' | 'retangulo' | 'linha' | 'icone' | 'texto'
  | 'triangulo' | 'estrela' | 'balao' | 'losango'
export type Elemento = {
  id: string
  tipo: TipoElemento
  x: number; y: number; w: number; h: number
  rot?: number
  cor?: string
  preenchido?: boolean
  url?: string
  icone?: string
  texto?: string
  // Comuns
  opac?: number // 0 a 1
  sombra?: boolean
  travado?: boolean // não sai do lugar ao tocar
  oculto?: boolean
  // Formas
  cor2?: string // segunda cor: vira degradê
  borda?: number // espessura do contorno (cqw)
  corBorda?: string
  raio?: number // cantos arredondados (cqw)
  // Texto
  fonte?: string
  tam?: number // tamanho da letra (cqw)
  peso?: number // 300 a 900
  italico?: boolean
  sublinhado?: boolean
  alinh?: 'left' | 'center' | 'right'
  alinhV?: 'top' | 'center' | 'bottom'
  entrelinha?: number
  espaco?: number // espaço entre letras (em)
  caixaAlta?: boolean
  destaque?: string // cor das *palavras marcadas*
  contorno?: string // cor do contorno das letras
  faixa?: string // cor da faixa atrás do texto
  // Foto
  forma?: 'ret' | 'circulo'
  ajuste?: 'cobrir' | 'conter'
  focoY?: number // 0 (topo) a 100 (base)
  brilho?: number // 0.4 a 1.6
  contraste?: number
  pb?: boolean // preto e branco
  desfoque?: number // 0 a 10
}

export type Disposicao = 'texto' | 'esquerda' | 'direita' | 'cima' | 'fundo' | 'so-foto'

export type LayoutSlide = 'livre' | 'capa' | 'topico' | 'versiculo' | 'frase' | 'vazio'

export const ESTILO_PADRAO: EstiloSlide = {
  cor: '#ffffff', alinhamento: 'center', tamanho: 'm', fonte: 'sans', escurecer: 0.45, ajuste: 'cobrir',
}

export type Slide = {
  id: string
  mensagem_id: string
  topico_id: string | null
  ordem: number
  titulo: string | null
  subtitulo: string | null
  texto: string | null
  fundo: string | null // cor, degradê CSS ou "img:URL"
  estilo: Partial<EstiloSlide>
}

export const FUNDOS_PRONTOS = [
  { nome: 'Noite dourada', valor: 'radial-gradient(120% 90% at 85% 110%, #3A2800 0%, #120D02 45%, #050505 100%)' },
  { nome: 'Preto', valor: '#000000' },
  { nome: 'Grafite', valor: '#1c1c1e' },
  { nome: 'Azul noite', valor: 'linear-gradient(135deg, #0f172a, #1e3a8a)' },
  { nome: 'Vinho', valor: 'linear-gradient(135deg, #2a0a12, #7f1d1d)' },
  { nome: 'Floresta', valor: 'linear-gradient(135deg, #052e16, #166534)' },
  { nome: 'Aurora', valor: 'linear-gradient(135deg, #1e1b4b, #6d28d9 55%, #db2777)' },
  { nome: 'Areia', valor: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
  { nome: 'Branco', valor: '#ffffff' },
]