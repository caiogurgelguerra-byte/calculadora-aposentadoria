const WHATSAPP_DDD = '85';      // ajustar conforme número real
const WHATSAPP_NUM = '999999999'; // ajustar conforme número real

type Context =
  | 'aguardando'
  | 'liberado'
  | 'email_errado'
  | 'orfao'
  | 'duvida_geral'
  | 'conta_excluida';

const TEMPLATES: Record<Context, (vars: Record<string, string>) => string> = {
  aguardando: ({ nome }) =>
    `Olá Caio, sou ${nome || '<seu nome>'} e quero saber sobre o status do meu cadastro.`,
  liberado: () => 'Olá Caio, fui liberado e quero combinar próximos passos.',
  email_errado: () => 'Olá Caio, errei o email no cadastro e preciso refazer.',
  orfao: ({ email }) =>
    `Olá Caio, deu erro no meu cadastro (sou ${email || '<seu email>'}).`,
  duvida_geral: () => '',
  conta_excluida: () => 'Olá Caio, tenho uma dúvida sobre minha conta excluída.',
};

export function whatsappUrl(context: Context, vars: Record<string, string> = {}): string {
  const text = TEMPLATES[context](vars);
  const params = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/55${WHATSAPP_DDD}${WHATSAPP_NUM}${params}`;
}
