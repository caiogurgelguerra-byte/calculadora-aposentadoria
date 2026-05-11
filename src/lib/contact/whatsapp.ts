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
    `Olá Caio, sou ${nome || '<seu nome>'} e quero saber sobre o status do meu cadastro.`,
  liberado: () => 'Olá Caio, fui liberado e quero combinar próximos passos.',
  email_errado: () => 'Olá Caio, errei o e-mail no cadastro e preciso refazer.',
  orfao: ({ email }) =>
    `Olá Caio, deu erro no meu cadastro (sou ${email || '<seu e-mail>'}).`,
  duvida_geral: () => '',
  conta_excluida: () => 'Olá Caio, tenho uma dúvida sobre minha conta excluída.',
}

export function whatsappUrl(context: Context, vars: Record<string, string> = {}): string {
  const text = TEMPLATES[context](vars)
  const params = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${WHATSAPP_NUMBER}${params}`
}
