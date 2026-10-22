import { BookA, BookOpen, FileText, Footprints, Image as ImagemIcone, Link2, ListChecks, MessagesSquare, Mic, Quote, Sunrise, Users, type LucideIcon } from 'lucide-react'
import type { Topico } from './tipos'

/*
  Blocos do modo Estudo. Usam a mesma tabela dos tópicos da pregação:
  titulo = texto principal, observacao = corpo, versiculo = referência bíblica,
  frase_chave = detalhe (na definição), notas = só para quem dá a aula,
  extra = minutos (pergunta e atividade), url (imagem e link), autor (citação).
*/

export type TipoBloco = 'explicacao' | 'pergunta' | 'atividade' | 'lista' | 'citacao' | 'definicao' | 'referencia' | 'imagem' | 'link'

export type DefBloco = {
  nome: string
  cor: string // cor do rótulo (contraste bom no claro e no escuro)
  Icone: LucideIcon
  titulo: { rotulo: string; dica: string }
  corpo?: { rotulo: string; dica: string; linhas?: number }
  detalhe?: { rotulo: string; dica: string }
  referencia?: boolean // campo de versículo com prévia
  minutos?: number // tempo sugerido (pergunta e atividade)
  url?: 'imagem' | 'link'
  autor?: boolean
}

export const BLOCOS: Record<TipoBloco, DefBloco> = {
  explicacao: {
    nome: 'Explicação', cor: '#94A3B8', Icone: FileText,
    titulo: { rotulo: 'Título', dica: 'Por que o dinheiro some no fim do mês?' },
    corpo: { rotulo: 'Explicação', dica: 'O que você vai explicar. Use - no começo da linha para fazer itens.', linhas: 5 },
  },
  pergunta: {
    nome: 'Pergunta', cor: '#38BDF8', Icone: MessagesSquare, minutos: 5,
    titulo: { rotulo: 'Pergunta', dica: 'Qual compra você mais se arrependeu de ter feito?' },
    corpo: { rotulo: 'Como conduzir (aparece na aula e no slide, não na folha)', dica: 'Peça para 2 ou 3 pessoas responderem…', linhas: 2 },
  },
  atividade: {
    nome: 'Atividade', cor: '#14B8A6', Icone: Users, minutos: 10,
    titulo: { rotulo: 'Nome da atividade', dica: 'Monte o orçamento do seu mês' },
    corpo: { rotulo: 'Como fazer', dica: 'Passo a passo que a turma vai seguir', linhas: 4 },
  },
  lista: {
    nome: 'Lista', cor: '#EAB308', Icone: ListChecks,
    titulo: { rotulo: 'Título da lista', dica: 'Os 3 potes' },
    corpo: { rotulo: 'Itens (um por linha)', dica: 'Gastar\nGuardar\nDoar', linhas: 4 },
  },
  citacao: {
    nome: 'Citação', cor: '#EC4899', Icone: Quote, autor: true,
    titulo: { rotulo: 'Citação', dica: 'Quem é fiel no pouco também é fiel no muito.' },
  },
  definicao: {
    nome: 'Definição', cor: '#A78BFA', Icone: BookA,
    titulo: { rotulo: 'Termo', dica: 'Mordomia' },
    detalhe: { rotulo: 'Detalhe (origem, classe)', dica: 'do grego oikonomia' },
    corpo: { rotulo: 'Significado', dica: 'Cuidar bem do que foi confiado a você.', linhas: 3 },
  },
  referencia: {
    nome: 'Referência', cor: '#F59E0B', Icone: BookOpen, referencia: true,
    titulo: { rotulo: 'Título (opcional)', dica: 'Texto para ler juntos' },
    corpo: { rotulo: 'Outra fonte (livro, site, artigo)', dica: 'Pai Rico, Pai Pobre, cap. 2', linhas: 2 },
  },
  imagem: {
    nome: 'Imagem', cor: '#22C55E', Icone: ImagemIcone, url: 'imagem',
    titulo: { rotulo: 'Legenda', dica: 'Gráfico dos gastos de uma família' },
  },
  link: {
    nome: 'Link ou vídeo', cor: '#F97316', Icone: Link2, url: 'link',
    titulo: { rotulo: 'Título', dica: 'Vídeo: o efeito dos juros compostos' },
    corpo: { rotulo: 'Por que ver', dica: 'Mostrar antes da atividade', linhas: 2 },
  },
}

export const ORDEM_BLOCOS: TipoBloco[] = ['explicacao', 'pergunta', 'atividade', 'lista', 'citacao', 'definicao', 'referencia', 'imagem', 'link']

export const defBloco = (t: Pick<Topico, 'tipo'>) => BLOCOS[(t.tipo as TipoBloco)] ?? BLOCOS.explicacao
export const ehBloco = (tipo?: string): tipo is TipoBloco => !!tipo && tipo in BLOCOS

/* Linhas de uma lista (aceita "- item" ou "• item") */
export const itensDaLista = (t?: string | null) =>
  (t ?? '').split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean)

/* Formatos do lado Palavra (pregação é o padrão, com tópicos) */
export const FORMATOS_PALAVRA = [
  { id: 'pregacao', nome: 'Pregação', resumo: 'Texto base e tópicos' },
  { id: 'celula', nome: 'Célula', resumo: 'Quebra-gelo, Palavra, conversa e oração' },
  { id: 'ebd', nome: 'Estudo bíblico', resumo: 'EBD: texto, contexto e perguntas' },
  { id: 'devocional', nome: 'Devocional', resumo: 'Versículo, reflexão e oração' },
  { id: 'discipulado', nome: 'Discipulado', resumo: 'Tema, versículos e compromisso' },
] as const
export const ICONE_FORMATO: Record<string, LucideIcon> = { pregacao: Mic, celula: Users, ebd: BookOpen, devocional: Sunrise, discipulado: Footprints }
export const nomeFormato = (id?: string) => FORMATOS_PALAVRA.find((f) => f.id === id)?.nome ?? 'Pregação'

/* Modelos que já vêm com blocos. "lado" diz em qual lado do app o modelo aparece. */
type BlocoModelo = { tipo: TipoBloco; titulo: string; observacao?: string; minutos?: number }
export type ModeloPronto = { id: string; nome: string; lado: 'pregacao' | 'estudo'; minutos: number; objetivo: string; blocos: BlocoModelo[] }
export const MODELOS: ModeloPronto[] = [
  /* Palavra */
  {
    id: 'celula', nome: 'Célula', lado: 'pregacao', minutos: 60, objetivo: 'Comunhão, Palavra e oração',
    blocos: [
      { tipo: 'atividade', titulo: 'Quebra-gelo', observacao: 'Cada um conta algo bom que aconteceu na semana.', minutos: 10 },
      { tipo: 'referencia', titulo: 'Palavra' },
      { tipo: 'pergunta', titulo: 'O que mais falou com você neste texto?', minutos: 10 },
      { tipo: 'pergunta', titulo: 'Como podemos viver isso juntos esta semana?', minutos: 10 },
      { tipo: 'atividade', titulo: 'Oração em duplas', observacao: 'Cada dupla ora pelo pedido do outro.', minutos: 10 },
    ],
  },
  {
    id: 'ebd', nome: 'Estudo bíblico', lado: 'pregacao', minutos: 45, objetivo: 'Entender o texto e aplicar na semana',
    blocos: [
      { tipo: 'referencia', titulo: 'Texto para ler juntos' },
      { tipo: 'explicacao', titulo: 'Contexto', observacao: 'Quem escreveu, para quem e por quê.' },
      { tipo: 'pergunta', titulo: 'O que o texto diz?', minutos: 5 },
      { tipo: 'pergunta', titulo: 'O que isso significa para nós hoje?', minutos: 5 },
      { tipo: 'explicacao', titulo: 'Aplicação' },
      { tipo: 'pergunta', titulo: 'O que você vai praticar esta semana?', minutos: 5 },
    ],
  },
  {
    id: 'devocional', nome: 'Devocional', lado: 'pregacao', minutos: 15, objetivo: 'Um momento curto com Deus',
    blocos: [
      { tipo: 'referencia', titulo: 'Versículo do dia' },
      { tipo: 'explicacao', titulo: 'Reflexão' },
      { tipo: 'pergunta', titulo: 'O que Deus está falando com você hoje?', minutos: 3 },
      { tipo: 'atividade', titulo: 'Oração', observacao: 'Encerrar orando juntos.', minutos: 3 },
    ],
  },
  {
    id: 'discipulado', nome: 'Discipulado', lado: 'pregacao', minutos: 40, objetivo: 'Crescer um passo de cada vez',
    blocos: [
      { tipo: 'explicacao', titulo: 'Tema do encontro' },
      { tipo: 'referencia', titulo: 'Versículos-chave' },
      { tipo: 'pergunta', titulo: 'Como foi a semana com o compromisso anterior?', minutos: 5 },
      { tipo: 'pergunta', titulo: 'O que você entendeu deste tema?', minutos: 5 },
      { tipo: 'atividade', titulo: 'Compromisso da semana', observacao: 'Definir um passo prático até o próximo encontro.', minutos: 5 },
    ],
  },
  /* Estudos (qualquer assunto) */
  {
    id: 'aula', nome: 'Aula de curso', lado: 'estudo', minutos: 50, objetivo: 'Ao final, a turma consegue…',
    blocos: [
      { tipo: 'explicacao', titulo: 'Introdução', observacao: 'Onde paramos e o que vamos ver hoje.' },
      { tipo: 'definicao', titulo: 'Conceito-chave' },
      { tipo: 'lista', titulo: 'Pontos principais', observacao: 'Primeiro ponto\nSegundo ponto\nTerceiro ponto' },
      { tipo: 'atividade', titulo: 'Exercício', observacao: 'Em duplas, resolvam…', minutos: 15 },
      { tipo: 'pergunta', titulo: 'O que ficou mais claro hoje?', minutos: 5 },
    ],
  },
  {
    id: 'palestra', nome: 'Palestra', lado: 'estudo', minutos: 30, objetivo: 'Uma ideia que o público leva para casa',
    blocos: [
      { tipo: 'citacao', titulo: 'Uma frase para abrir' },
      { tipo: 'explicacao', titulo: 'O problema' },
      { tipo: 'lista', titulo: '3 ideias', observacao: 'Ideia 1\nIdeia 2\nIdeia 3' },
      { tipo: 'explicacao', titulo: 'Um exemplo real' },
      { tipo: 'pergunta', titulo: 'O que você vai fazer diferente amanhã?', minutos: 3 },
    ],
  },
  {
    id: 'treinamento', nome: 'Treinamento', lado: 'estudo', minutos: 60, objetivo: 'A equipe sai sabendo fazer…',
    blocos: [
      { tipo: 'explicacao', titulo: 'Por que isso importa' },
      { tipo: 'lista', titulo: 'Passo a passo', observacao: 'Passo 1\nPasso 2\nPasso 3' },
      { tipo: 'atividade', titulo: 'Prática em grupos', observacao: 'Cada grupo simula uma situação.', minutos: 20 },
      { tipo: 'pergunta', titulo: 'O que ficou difícil?', minutos: 10 },
    ],
  },
]
