const WHATSAPP_NUMBER = '5584996654671'

type Context =
  | 'aguardando'
  | 'liberado'
  | 'email_errado'
  | 'orfao'
  | 'duvida_geral'
  | 'conta_excluida'

const TEMPLATES: Record<Context, (vars: Record<string, string>) => string> = {
  aguardando: ({ nome }) =>
    `Ola Caio, sou ${nome || '<seu nome>'} e quero saber sobre o status do meu cadastro.`,
  liberado: () => 'Ola Caio, fui liberado e quero combinar proximos passos.',
  email_errado: () => 'Ola Caio, errei o email no cadastro e preciso refazer.',
  orfao: ({ email }) =>
    `Ola Caio, deu erro no meu cadastro (sou ${email || '<seu email>'}).`,
  duvida_geral: () => '',
  conta_excluida: () => 'Ola Caio, tenho uma duvida sobre minha conta excluida.',
}

export function whatsappUrl(context: Context, vars: Record<string, string> = {}): string {
  const text = TEMPLATES[context](vars)
  const params = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${WHATSAPP_NUMBER}${params}`
}
