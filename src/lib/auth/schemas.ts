import { z } from 'zod';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
  'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

const TELEFONE_E164_BR = /^\+55[1-9][1-9]\d{8,9}$/;
const ESTADOS_CIVIS = ['solteiro','casado','uniao_estavel','divorciado','viuvo'] as const;
const REGIMES = ['clt','pj','autonomo','servidor_publico','empresario','aposentado','outro'] as const;

const dezoitoAnosAtras = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export const camposPessoaisSchema = z.object({
  nome_completo: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  data_nascimento: z.coerce.date().refine(
    (d) => d <= dezoitoAnosAtras(),
    'Cadastro disponível apenas para maiores de 18 anos',
  ).refine(
    (d) => d >= new Date('1900-01-02'),
    'Data muito antiga',
  ),
  estado_civil: z.enum(ESTADOS_CIVIS),
  dependentes: z.array(z.number().int().min(0).max(120)).max(10, 'Máximo 10 dependentes'),
  profissao: z.string().min(2).max(100),
  regime_trabalho: z.enum(REGIMES),
  cidade: z.string().min(2).max(100),
  uf: z.enum(UFS),
  telefone: z.string().regex(TELEFONE_E164_BR, 'Formato inválido (esperado +55DDXXXXXXXXX)'),
});

export const cadastroSchema = camposPessoaisSchema.extend({
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar_senha: z.string(),
  aceito_privacidade: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade' }),
  }),
  aceito_transferencia_internacional: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a transferência internacional dos dados' }),
  }),
  website: z.string().max(0).optional(), // honeypot
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não conferem',
  path: ['confirmar_senha'],
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1, 'Informe a senha'),
});

export const recuperarSenhaSchema = z.object({
  email: z.string().email(),
});

export const redefinirSenhaSchema = z.object({
  senha: z.string().min(8),
  confirmar_senha: z.string(),
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não conferem',
  path: ['confirmar_senha'],
});

export const meusDadosSchema = camposPessoaisSchema;

export type CadastroForm = z.infer<typeof cadastroSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RecuperarSenhaForm = z.infer<typeof recuperarSenhaSchema>;
export type RedefinirSenhaForm = z.infer<typeof redefinirSenhaSchema>;
export type MeusDadosForm = z.infer<typeof meusDadosSchema>;
