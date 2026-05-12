# Aposentadoria - Patrimonio Atual Livre

## Contexto

A calculadora de aposentadoria possui um campo publico de "Patrimonio atual investido" no formulario principal. O usuario avaliou que forcar multiplos de mil deixa a simulacao menos fidedigna, porque o patrimonio atual real pode ter qualquer valor em reais e centavos.

## Design

O campo continuara usando entrada textual com mascara monetaria em `pt-BR`, para manter o padrao visual atual. O campo de patrimonio atual deve aceitar qualquer valor monetario valido digitado ou colado, preservando reais e centavos no estado `patrimonioAtual`.

Exemplos esperados:

- `1000` vira `1.000,00`;
- `12345,67` vira `12.345,67`;
- `155500` vira `155.500,00`;
- valores com centavos devem ser preservados nesse campo.

O campo de renda mensal desejada permanece inalterado e continua aceitando valores monetarios livres.

## Testes

O teste de `InputForm` deve cobrir a formatacao livre no campo de patrimonio atual e garantir que o valor enviado em `onChange` preserve o valor monetario digitado. A suite focada de aposentadoria deve ser executada antes e depois da implementacao, seguindo TDD.
