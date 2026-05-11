# Calculadora de Investimentos

Aplicacao React + Vite com simulacao de investimentos e comparativo com poupanca, CDB e LCI/LCA.

## Requisitos

- Node.js 20+
- npm 10+

## Ambiente

Crie um arquivo `.env.local` com base em `.env.example`.

Variaveis obrigatorias:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Variavel opcional:

- `VITE_ENABLE_PUBLIC_BCB_FOCUS_FETCH`

### Recomendacao para producao

Nao habilite `VITE_ENABLE_PUBLIC_BCB_FOCUS_FETCH` na publicacao inicial.

Motivo:
- evita chamada direta do navegador do usuario ao Banco Central
- reduz dependencia externa em runtime
- deixa o comportamento do CDI projetado mais previsivel

Sem essa flag, a calculadora usa um valor padrao local editavel e informa isso na interface.

## Desenvolvimento

Instalacao:

```bash
npm install
```

Rodar localmente:

```bash
npm run dev
```

## Qualidade

Rodar testes:

```bash
npm test
```

Gerar build:

```bash
npm run build
```

## Deploy

O projeto ja inclui:

- `Dockerfile` para build e empacotamento
- `nginx.conf` com fallback de SPA via `try_files ... /index.html`
- headers basicos de endurecimento no Nginx

### Build com Docker

```bash
docker build ^
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co ^
  --build-arg VITE_SUPABASE_ANON_KEY=your-supabase-anon-key ^
  -t calculadora-investimentos .
```

Executar:

```bash
docker run -p 8080:80 calculadora-investimentos
```

### Hospedagem sem Docker

Se fizer deploy apenas da pasta `dist`, o host precisa:

- servir `index.html` como fallback para rotas do React Router
- permitir refresh direto em `/investimentos`

Sem isso, a rota pode quebrar fora da home.

## Checklist antes de publicar

1. Preencher `.env.local` ou build args de producao.
2. Rodar `npm test`.
3. Rodar `npm run build`.
4. Validar a rota `/investimentos`.
5. Confirmar se o CDI projetado ficara com valor padrao local ou com integracao server-side futura.

## Observacoes de seguranca

- A chave `VITE_SUPABASE_ANON_KEY` pode existir no frontend; isso e esperado no modelo do Supabase.
- Nao coloque `service_role` no frontend.
- Se quiser usar Focus/BC em producao, prefira backend ou cache server-side em vez de fetch publico no navegador.
